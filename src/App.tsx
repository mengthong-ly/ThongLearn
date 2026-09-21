import { useEffect, useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlaskConicalIcon,
  LightbulbIcon,
  PanelRightIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { CodeEditor } from "@/components/code-editor"
import { CommandMenu } from "@/components/command-menu"
import { HistoryList } from "@/components/history-list"
import { LessonDoc } from "@/components/lesson-doc"
import { OutputPane } from "@/components/output-pane"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import { go, useHash } from "@/hooks/use-hash"
import { db } from "@/lib/db"
import { lessonById, lessons, playground } from "@/lib/lessons"
import { reset, run, show, stop, useRunner } from "@/lib/runner"
import { usePanelRef, type PanelImperativeHandle } from "react-resizable-panels"

function Tip({
  label,
  keys,
  children,
}: {
  label: string
  keys?: string[]
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        {label}
        {keys && (
          <KbdGroup className="ml-1">
            {keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </KbdGroup>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function toggle(p: PanelImperativeHandle | null) {
  if (p?.isCollapsed()) p.expand()
  else p?.collapse()
}

export default function App() {
  const [route, param] = useHash()
  const runId = route === "run" ? Number(param) : undefined
  const savedRun = useLiveQuery(
    () => (runId ? db.runs.get(runId) : undefined),
    [runId]
  )
  const done = useLiveQuery(() => db.progress.toCollection().primaryKeys())

  // "/" → first lesson not yet completed
  useEffect(() => {
    if (!route && done)
      go(
        `/lesson/${(lessons.find((l) => !done.includes(l.id)) ?? lessons[0]).id}`
      )
  }, [route, done])

  const lessonId =
    route === "lesson"
      ? param
      : route === "run"
        ? savedRun?.lessonId
        : "playground"
  const lesson = (lessonId && lessonById(lessonId)) || playground
  const idx = lessons.indexOf(lesson)

  const state = useRunner()
  const [code, setCode] = useState("")
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [tab, setTab] = useState("output")
  const [mobileTab, setMobileTab] = useState("lesson")
  const rightPane = usePanelRef()
  const isMobile = useIsMobile()

  // Load the draft (or starter) when switching lessons.
  useEffect(() => {
    if (runId) return
    let live = true
    reset()
    db.drafts
      .get(lesson.id)
      .then((d) => live && setCode(d?.code ?? lesson.starter))
    return () => {
      live = false
    }
  }, [lesson.id, lesson.starter, runId])

  // Restore a past run from history: editor state during render, output pane via the runner store.
  const [restoredId, setRestoredId] = useState<number>()
  if (savedRun && savedRun.id !== restoredId) {
    setRestoredId(savedRun.id)
    setCode(savedRun.code)
    setTab("output")
  }
  useEffect(() => {
    if (savedRun) show(savedRun)
  }, [savedRun?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const draftTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const edit = (v: string) => {
    setCode(v)
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(
      () => db.drafts.put({ lessonId: lesson.id, code: v }),
      400
    )
  }

  const execute = async (withCheck = false) => {
    if (rightPane.current?.isCollapsed()) rightPane.current.expand()
    setTab("output")
    setMobileTab("output")
    const res = await run(code, withCheck ? lesson.check : undefined)
    await db.runs.add({
      lessonId: lesson.id,
      createdAt: Date.now(),
      code,
      status: res.status,
      lines: res.lines,
      ms: res.ms,
      error: res.error,
      errorLine: res.errorLine,
      check: res.check,
    } as never)
    if (res.check?.pass && !done?.includes(lesson.id)) {
      await db.progress.put({ lessonId: lesson.id, completedAt: Date.now() })
      const next = lessons[idx + 1]
      toast.success(`${lesson.title} complete!`, {
        description: next
          ? `Up next: ${next.title}`
          : "You finished the whole course 🎉",
        action: next
          ? { label: "Next lesson", onClick: () => go(`/lesson/${next.id}`) }
          : undefined,
      })
    }
  }

  const executeRef = useRef(execute)
  useEffect(() => {
    executeRef.current = execute
  })

  // Global shortcuts (Monaco handles ⌘↵ itself while focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const inEditor = (e.target as HTMLElement).closest?.(".monaco-editor")
      const action = {
        Enter: inEditor ? undefined : () => executeRef.current(),
        ".": stop,
        k: () => setPaletteOpen((o) => !o),
        "\\": () => toggle(rightPane.current),
      }[e.key]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [rightPane])

  const toggleRight = () => toggle(rightPane.current)

  const running = state.status === "running"
  const lessonRuns = useLiveQuery(
    () =>
      db.runs.where("lessonId").equals(lesson.id).reverse().sortBy("createdAt"),
    [lesson.id],
    []
  )

  const doc = (
    <LessonDoc
      lesson={lesson}
      done={!!done?.includes(lesson.id)}
      onTry={(c) => {
        edit(c)
        setMobileTab("code")
        toast("Loaded into the editor", { description: "Press ⌘↵ to run it." })
      }}
    />
  )

  const editor = (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b px-3">
        <span className="mr-auto font-mono text-xs text-muted-foreground">
          main.py
        </span>
        <Tip label="Reset to starter code">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Reset code"
            onClick={() => {
              edit(lesson.starter)
              reset()
            }}
          >
            <RotateCcwIcon />
          </Button>
        </Tip>
        {lesson.solution && (
          <Tip label="Show solution">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Show solution"
              onClick={() => edit(lesson.solution!)}
            >
              <LightbulbIcon />
            </Button>
          </Tip>
        )}
        {lesson.check && (
          <Tip label="Run and check the challenge">
            <Button
              size="sm"
              variant="outline"
              disabled={running}
              onClick={() => execute(true)}
            >
              <FlaskConicalIcon data-icon="inline-start" />
              Check
            </Button>
          </Tip>
        )}
        {running ? (
          <Tip label="Stop" keys={["⌘", "."]}>
            <Button size="sm" variant="secondary" onClick={stop}>
              <SquareIcon data-icon="inline-start" />
              Stop
            </Button>
          </Tip>
        ) : (
          <Tip label="Run" keys={["⌘", "↵"]}>
            <Button size="sm" onClick={() => execute()}>
              <PlayIcon data-icon="inline-start" />
              Run
            </Button>
          </Tip>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor
          value={code}
          onChange={edit}
          onRun={() => executeRef.current()}
          errorLine={state.status === "error" ? state.errorLine : undefined}
        />
      </div>
    </div>
  )

  const right = (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex h-full flex-col gap-0 bg-sidebar"
    >
      <div className="flex h-11 shrink-0 items-center border-b px-3">
        <TabsList variant="line">
          <TabsTrigger value="output">
            Output
            {running && <Spinner />}
          </TabsTrigger>
          <TabsTrigger value="history">
            History{lessonRuns.length ? ` (${lessonRuns.length})` : ""}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="output" className="min-h-0">
        <OutputPane state={state} />
      </TabsContent>
      <TabsContent value="history" className="min-h-0 overflow-auto">
        {lessonRuns.length ? (
          <HistoryList runs={lessonRuns} activeId={runId} showLesson={false} />
        ) : (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyTitle>No runs yet</EmptyTitle>
              <EmptyDescription>
                Every run of this lesson is saved here automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </TabsContent>
    </Tabs>
  )

  return (
    <SidebarProvider>
      <AppSidebar
        lessonId={lesson.id}
        runId={runId}
        onSearch={() => setPaletteOpen(true)}
      />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="truncate text-muted-foreground">
              {lesson.section}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="truncate font-medium">{lesson.title}</span>
            {runId && (
              <span className="shrink-0 text-muted-foreground">
                · run #{runId}
              </span>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {idx >= 0 && (
              <>
                <Tip label="Previous lesson">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Previous lesson"
                    disabled={idx === 0}
                    onClick={() => go(`/lesson/${lessons[idx - 1].id}`)}
                  >
                    <ChevronLeftIcon />
                  </Button>
                </Tip>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {idx + 1} / {lessons.length}
                </span>
                <Tip label="Next lesson">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Next lesson"
                    disabled={idx === lessons.length - 1}
                    onClick={() => go(`/lesson/${lessons[idx + 1].id}`)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </Tip>
              </>
            )}
            {!isMobile && (
              <Tip label="Toggle output pane" keys={["⌘", "\\"]}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Toggle output pane"
                  onClick={toggleRight}
                >
                  <PanelRightIcon />
                </Button>
              </Tip>
            )}
          </div>
        </header>

        {isMobile ? (
          <Tabs
            value={mobileTab}
            onValueChange={setMobileTab}
            className="min-h-0 flex-1 gap-0"
          >
            <TabsList variant="line" className="w-full border-b px-3">
              <TabsTrigger value="lesson">Lesson</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
            </TabsList>
            <TabsContent value="lesson" className="min-h-0 overflow-auto">
              {doc}
            </TabsContent>
            <TabsContent value="code" className="min-h-0">
              {editor}
            </TabsContent>
            <TabsContent value="output" className="min-h-0">
              {right}
            </TabsContent>
          </Tabs>
        ) : (
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-0 flex-1"
          >
            <ResizablePanel minSize="35">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize="55" minSize="15">
                  <div className="h-full overflow-auto">{doc}</div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="45" minSize="20">
                  {editor}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              panelRef={rightPane}
              defaultSize="34"
              minSize="22"
              collapsible
            >
              {right}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </SidebarInset>
      <CommandMenu open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  )
}
