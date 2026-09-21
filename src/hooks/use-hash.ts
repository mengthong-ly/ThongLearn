import { useSyncExternalStore } from "react"

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}

/** Current route as path segments, e.g. `#/lesson/lists` → ["lesson", "lists"]. */
export function useHash() {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean)
}

export const go = (path: string) => (location.hash = path)
