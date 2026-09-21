import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { HistoryList } from "@/components/history-list"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { db } from "@/lib/db"
import { sections } from "@/lib/lessons"
import { go } from "@/hooks/use-hash"
import { cn } from "@/lib/utils"

export function AppSidebar({
  lessonId,
  runId,
  onSearch,
}: {
  lessonId: string
  runId?: number
  onSearch: () => void
}) {
  const done = useLiveQuery(
    () => db.progress.toCollection().primaryKeys(),
    [],
    [] as string[]
  )
  const recent = useLiveQuery(
    () => db.runs.orderBy("createdAt").reverse().limit(30).toArray(),
    [],
    []
  )
  const { theme, setTheme } = useTheme()
  // Sections open/close freely, but the current lesson's section always opens.
  const current = sections.find((s) =>
    s.lessons.some((l) => l.id === lessonId)
  )?.name
  const [open, setOpen] = useState<string[]>([])
  const [seen, setSeen] = useState<string>()
  if (current !== seen) {
    setSeen(current)
    if (current && !open.includes(current)) setOpen([...open, current])
  }
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
            Py
          </span>
          <span className="font-semibold text-foreground">PyLearn</span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSearch}>
              <SearchIcon />
              <span>Search</span>
              <Kbd className="ml-auto">⌘K</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={lessonId === "playground" && !runId}
              onClick={() => go("/playground")}
            >
              <CodeIcon />
              <span>Playground</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-[1px] uppercase">
            Lessons
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((s) => {
                const count = s.lessons.filter((l) =>
                  done.includes(l.id)
                ).length
                return (
                  <Collapsible
                    key={s.name}
                    asChild
                    open={open.includes(s.name)}
                    onOpenChange={(o) =>
                      setOpen((prev) =>
                        o ? [...prev, s.name] : prev.filter((n) => n !== s.name)
                      )
                    }
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <ChevronRightIcon className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          <span>{s.name}</span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <SidebarMenuBadge
                        className={cn(
                          count === s.lessons.length && "text-success"
                        )}
                      >
                        {count}/{s.lessons.length}
                      </SidebarMenuBadge>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {s.lessons.map((l) => (
                            <SidebarMenuSubItem key={l.id}>
                              <SidebarMenuSubButton
                                isActive={l.id === lessonId && !runId}
                                onClick={() => go(`/lesson/${l.id}`)}
                              >
                                <span className="truncate">{l.title}</span>
                                {done.includes(l.id) && (
                                  <CheckIcon className="ml-auto text-success" />
                                )}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {recent.length > 0 && (
          <>
            <SidebarSeparator />
            <HistoryList runs={recent} activeId={runId} />
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(dark ? "light" : "dark")}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
              <span>{dark ? "Light mode" : "Dark mode"}</span>
              <Kbd className="ml-auto">D</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
