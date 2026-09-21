/// <reference lib="webworker" />
import { loadPyodide, version } from "pyodide"

import { cleanTraceback } from "./traceback"

// Pyodide's wasm/stdlib come from its CDN, pinned to the npm package version.
const ready = loadPyodide({
  indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
}).then((py) => {
  py.setStdin({
    stdin: () => {
      throw new Error(
        "input() isn't supported here yet: assign the value in code instead."
      )
    },
  })
  postMessage({ type: "ready" })
  return py
})

type Job = { code: string; check?: string }

self.onmessage = async ({ data }: MessageEvent<Job>) => {
  const py = await ready
  const stdout: string[] = []
  py.setStdout({
    batched: (line) => {
      stdout.push(line)
      postMessage({ type: "line", kind: "out", text: line })
    },
  })
  py.setStderr({
    batched: (line) => postMessage({ type: "line", kind: "err", text: line }),
  })

  // Fresh namespace per run so lessons never leak state into each other.
  const ns = py.globals.get("dict")()
  ns.set("__name__", "__main__")
  ns.set("__src__", data.code)
  const t0 = performance.now()
  try {
    postMessage({ type: "phase", phase: "compiling" })
    py.runPython("__code__ = compile(__src__, '<exec>', 'exec')", {
      globals: ns,
      filename: "<pylearn>",
    })
    postMessage({ type: "phase", phase: "running" })
    py.runPython("exec(__code__, globals())", {
      globals: ns,
      filename: "<pylearn>",
    })
  } catch (e) {
    const { text, line } = cleanTraceback(String((e as Error).message))
    postMessage({
      type: "done",
      ms: performance.now() - t0,
      error: text,
      errorLine: line,
    })
    ns.destroy()
    return
  }
  const ms = performance.now() - t0

  let check: { pass: boolean; message?: string } | undefined
  if (data.check) {
    ns.set("__stdout__", stdout.join("\n"))
    try {
      py.runPython(data.check, { globals: ns, filename: "<pylearn>" })
      check = { pass: true }
    } catch (e) {
      const msg =
        String((e as Error).message)
          .trim()
          .split("\n")
          .at(-1) ?? ""
      check = {
        pass: false,
        message:
          msg.replace(/^AssertionError:?\s*/, "") ||
          "Not quite: your output doesn't match yet.",
      }
    }
  }
  postMessage({ type: "done", ms, check })
  ns.destroy()
}
