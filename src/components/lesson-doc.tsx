import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CheckCircle2Icon, PlayIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Lesson } from "@/lib/lessons"
import { cn } from "@/lib/utils"

type HastNode = { type: string; value?: string; children?: HastNode[] }
const toText = (n?: HastNode): string =>
  (n?.value ?? "") + (n?.children ?? []).map(toText).join("")

const CALLOUT_TINT: [string, string][] = [
  ["💡", "bg-tint-sky"],
  ["⚠️", "bg-tint-peach"],
  ["🎯", "bg-tint-lavender"],
  ["✅", "bg-tint-mint"],
  ["📝", "bg-tint-yellow"],
]

export function LessonDoc({
  lesson,
  done,
  onTry,
}: {
  lesson: Lesson
  done: boolean
  onTry: (code: string) => void
}) {
  const components: Components = {
    h2: (p) => (
      <h2
        className="mt-10 mb-3 text-[22px] leading-[1.3] font-semibold text-foreground"
        {...p}
      />
    ),
    h3: (p) => (
      <h3 className="mt-6 mb-2 text-lg font-semibold text-foreground" {...p} />
    ),
    p: (p) => <p className="my-3" {...p} />,
    ul: (p) => (
      <ul className="my-3 flex list-disc flex-col gap-1 pl-6" {...p} />
    ),
    ol: (p) => (
      <ol className="my-3 flex list-decimal flex-col gap-1 pl-6" {...p} />
    ),
    a: (p) => (
      <a
        className="text-link underline-offset-2 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...p}
      />
    ),
    strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
    table: (p) => (
      <div className="my-4 overflow-x-auto rounded-md border">
        <table className="w-full text-sm" {...p} />
      </div>
    ),
    th: (p) => (
      <th
        className="border-b bg-muted px-3 py-2 text-left font-medium"
        {...p}
      />
    ),
    td: (p) => (
      <td
        className="border-b px-3 py-2 align-top [tr:last-child_&]:border-0"
        {...p}
      />
    ),
    code: ({ className, ...p }) => (
      <code
        className={cn(
          className ??
            "rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-[#eb5757] dark:text-[#ff7369]"
        )}
        {...p}
      />
    ),
    blockquote: ({ node, children }) => {
      const text = toText(node as HastNode).trim()
      const tint = CALLOUT_TINT.find(([e]) => text.startsWith(e))?.[1]
      return tint ? (
        <div
          className={cn(
            "my-4 rounded-lg px-4 py-1 text-foreground [&_p]:my-2",
            tint
          )}
        >
          {children}
        </div>
      ) : (
        <blockquote className="my-4 border-l-[3px] border-foreground pl-4">
          {children}
        </blockquote>
      )
    },
    pre: ({ node }) => {
      const code = toText(node as HastNode).replace(/\n$/, "")
      return (
        <div className="my-4 overflow-hidden rounded-lg bg-muted">
          <div className="flex h-8 items-center justify-between pr-1 pl-4 text-xs text-muted-foreground">
            <span>python</span>
            <Button
              size="xs"
              variant="ghost"
              className="text-link"
              onClick={() => onTry(code + "\n")}
            >
              <PlayIcon data-icon="inline-start" />
              Try it
            </Button>
          </div>
          <pre className="overflow-x-auto px-4 pb-4 font-mono text-[13px] leading-relaxed text-foreground">
            {code}
          </pre>
        </div>
      )
    },
  }

  return (
    <article className="mx-auto max-w-[720px] px-5 pt-8 pb-16 text-base leading-[1.55] text-slate md:px-8 md:pt-10">
      <div className="mb-3 flex items-center gap-2">
        <Badge
          variant="secondary"
          className="rounded-sm bg-tint-lavender text-[#391c57] dark:text-[#d6b6f6]"
        >
          {lesson.section}
        </Badge>
        {done && (
          <Badge
            variant="secondary"
            className="rounded-sm bg-tint-mint text-success"
          >
            <CheckCircle2Icon data-icon="inline-start" />
            Completed
          </Badge>
        )}
      </div>
      <h1 className="text-[28px] leading-[1.2] font-semibold tracking-[-0.5px] text-foreground md:text-[36px]">
        {lesson.title}
      </h1>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {lesson.body}
      </Markdown>
    </article>
  )
}
