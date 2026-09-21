// Runs every lesson's solution against its check in real Python (Pyodide in Node).
// Usage: npm run check:lessons
import { readdirSync, readFileSync } from "node:fs"
import { loadPyodide } from "pyodide"

import { parseLesson } from "../src/lib/lesson-parser.ts"
import { cleanTraceback } from "../src/lib/traceback.ts"

const dir = new URL("../src/lessons/", import.meta.url)
const py = await loadPyodide()
let failed = 0

for (const file of readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .sort()) {
  const l = parseLesson(file, readFileSync(new URL(file, dir), "utf8"))
  const problems: string[] = []
  if (!l.starter.trim()) problems.push("missing starter")
  if (!l.solution || !l.check) problems.push("missing solution/check")
  else {
    const out: string[] = []
    py.setStdout({ batched: (s) => out.push(s) })
    const ns = py.globals.get("dict")()
    ns.set("__name__", "__main__")
    ns.set("__src__", l.solution)
    try {
      py.runPython(l.solution, { globals: ns, filename: "<exec>" })
      ns.set("__stdout__", out.join("\n"))
      py.runPython(l.check, { globals: ns })
    } catch (e) {
      problems.push(
        cleanTraceback(String((e as Error).message))
          .text.split("\n")
          .at(-1)!
      )
    }
    // the starter must NOT already pass the check
    const ns2 = py.globals.get("dict")()
    ns2.set("__src__", l.starter)
    const out2: string[] = []
    py.setStdout({ batched: (s) => out2.push(s) })
    try {
      py.runPython(l.starter, { globals: ns2 })
      ns2.set("__stdout__", out2.join("\n"))
      py.runPython(l.check, { globals: ns2 })
      problems.push("starter already passes the check")
    } catch {
      /* expected */
    }
  }
  // every example block in the prose must run cleanly
  for (const [, code] of l.body.matchAll(/```python\n([\s\S]*?)```/g)) {
    py.setStdout({ batched: () => {} })
    py.setStderr({ batched: () => {} })
    try {
      py.runPython(code, { globals: py.globals.get("dict")() })
    } catch (e) {
      if (!code.includes("# error!"))
        problems.push(
          `example fails: ${String((e as Error).message)
            .trim()
            .split("\n")
            .at(-1)}`
        )
    }
  }
  console.log(
    `${problems.length ? "✗" : "✓"} ${file}${problems.length ? "  → " + problems.join("; ") : ""}`
  )
  failed += problems.length ? 1 : 0
}
console.log(failed ? `\n${failed} lesson(s) failed` : "\nAll lessons pass")
process.exit(failed ? 1 : 0)
