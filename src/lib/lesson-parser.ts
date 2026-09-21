export type Lesson = {
  id: string
  title: string
  section: string
  body: string
  starter: string
  solution?: string
  check?: string
}

/** Parses a lesson file: `---` frontmatter, markdown prose, and fenced
 *  ```python starter|solution|check blocks that are pulled out of the prose. */
export function parseLesson(id: string, raw: string): Lesson {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)
  const meta = Object.fromEntries(
    (fm?.[1] ?? "").split("\n").map((l) => {
      const i = l.indexOf(":")
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^"(.*)"$/, "$1"),
      ]
    })
  )
  const blocks: Record<string, string> = {}
  const body = raw
    .slice(fm?.[0].length ?? 0)
    .replace(
      /```python (starter|solution|check)\n([\s\S]*?)```\n?/g,
      (_, kind: string, code: string) => {
        blocks[kind] = code.trimEnd() + "\n"
        return ""
      }
    )
    .trim()
  return {
    id,
    title: meta.title ?? id,
    section: meta.section ?? "Other",
    body,
    starter: blocks.starter ?? "",
    solution: blocks.solution,
    check: blocks.check,
  }
}
