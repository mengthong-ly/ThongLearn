import { useEffect, useRef } from "react"
import Editor, { loader, type OnMount } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import EditorWorker from "monaco-editor/editor/editor.worker?worker"

import { useTheme } from "@/components/theme-provider"

// Bundle Monaco locally (no CDN). Python needs only the core editor worker.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

const common = { "editorLineNumber.activeForeground": "#9b9a97" }
monaco.editor.defineTheme("notion-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "a4a097", fontStyle: "italic" },
    { token: "keyword", foreground: "5645d4" },
    { token: "string", foreground: "1a8a3a" },
    { token: "number", foreground: "dd5b00" },
  ],
  colors: {
    ...common,
    "editor.background": "#ffffff",
    "editor.foreground": "#37352f",
    "editorLineNumber.foreground": "#c8c4be",
    "editor.lineHighlightBackground": "#f6f5f4",
    "editor.selectionBackground": "#dcecfa",
    "editorCursor.foreground": "#37352f",
    "editorIndentGuide.background1": "#ede9e4",
  },
})
monaco.editor.defineTheme("notion-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "7f7e7b", fontStyle: "italic" },
    { token: "keyword", foreground: "a99cf5" },
    { token: "string", foreground: "7cc68d" },
    { token: "number", foreground: "ffa066" },
  ],
  colors: {
    ...common,
    "editor.background": "#191919",
    "editor.foreground": "#e3e2e0",
    "editorLineNumber.foreground": "#5a5a58",
    "editor.lineHighlightBackground": "#202020",
    "editor.selectionBackground": "#264f78",
    "editorIndentGuide.background1": "#2f2f2f",
  },
})

function useResolvedDark() {
  const { theme } = useTheme()
  return (
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  )
}

export function CodeEditor({
  value,
  onChange,
  onRun,
  errorLine,
}: {
  value: string
  onChange: (v: string) => void
  onRun: () => void
  errorLine?: number
}) {
  const dark = useResolvedDark()
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null)
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection>(null)
  const runRef = useRef(onRun)
  useEffect(() => {
    runRef.current = onRun
  })

  const onMount: OnMount = (editor) => {
    editorRef.current = editor
    decorations.current = editor.createDecorationsCollection()
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      runRef.current()
    )
    editor.focus()
  }

  useEffect(() => {
    decorations.current?.set(
      errorLine
        ? [
            {
              range: new monaco.Range(errorLine, 1, errorLine, 1),
              options: {
                isWholeLine: true,
                className: "error-line",
                linesDecorationsClassName: "error-glyph",
              },
            },
          ]
        : []
    )
    if (errorLine)
      editorRef.current?.revealLineInCenterIfOutsideViewport(errorLine)
  }, [errorLine])

  return (
    <Editor
      language="python"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={onMount}
      theme={dark ? "notion-dark" : "notion-light"}
      loading={
        <div className="p-4 text-sm text-muted-foreground">Loading editor…</div>
      }
      options={{
        fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
        fontSize: 14,
        lineHeight: 22,
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "line",
        tabSize: 4,
        automaticLayout: true,
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        overviewRulerLanes: 0,
      }}
    />
  )
}
