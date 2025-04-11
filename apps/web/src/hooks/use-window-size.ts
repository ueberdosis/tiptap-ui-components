import * as React from "react"

export function useWindowSize() {
  const [windowSize, setWindowSize] = React.useState({
    width: 0,
    height: 0,
    offsetTop: 0,
  })

  const handleResize = React.useCallback(() => {
    if (typeof window !== "undefined") {
      const width = window.visualViewport?.width || window.innerWidth
      const height = window.visualViewport?.height || window.innerHeight
      const offsetTop = window.visualViewport?.offsetTop || 0

      setWindowSize((state) => {
        if (
          width === state.width &&
          height === state.height &&
          offsetTop === state.offsetTop
        ) {
          return state
        }

        return { width, height, offsetTop }
      })
    }
  }, [])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      handleResize()

      window.addEventListener("resize", handleResize)
      window.visualViewport?.addEventListener("resize", handleResize)
      window.visualViewport?.addEventListener("scroll", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        window.visualViewport?.removeEventListener("resize", handleResize)
        window.visualViewport?.removeEventListener("scroll", handleResize)
      }
    }

    return () => {}
  }, [handleResize])

  return windowSize
}
