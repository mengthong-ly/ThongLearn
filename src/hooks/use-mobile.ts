import { useSyncExternalStore } from "react"

const query = "(max-width: 767px)"

export function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mql = matchMedia(query)
      mql.addEventListener("change", cb)
      return () => mql.removeEventListener("change", cb)
    },
    () => matchMedia(query).matches
  )
}
