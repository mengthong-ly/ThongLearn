import { parseLesson, type Lesson } from "./lesson-parser"

export type { Lesson }

const files = import.meta.glob("../lessons/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

export const lessons: Lesson[] = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, raw]) =>
    parseLesson(
      path
        .split("/")
        .pop()!
        .replace(/^\d+-|\.md$/g, ""),
      raw
    )
  )

export const playground: Lesson = {
  id: "playground",
  title: "Playground",
  section: "Free practice",
  body: "A blank scratchpad. Write any Python you like and press **Run**. Every run is saved to your history.",
  starter: 'print("Hello, Python!")\n',
}

export const lessonById = (id: string) =>
  id === "playground" ? playground : lessons.find((l) => l.id === id)

export const sections = [...new Set(lessons.map((l) => l.section))].map(
  (name) => ({
    name,
    lessons: lessons.filter((l) => l.section === name),
  })
)
