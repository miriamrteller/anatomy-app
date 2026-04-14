import { useEffect, useState, useCallback } from 'react'

interface UseLoadSVGResult {
  content: string
  loading: boolean
  error: string | null
}

/**
 * Custom hook to load SVG content from a URL.
 * Handles loading state, errors, and retries.
 */
export const useLoadSVG = (svgPath: string | null): UseLoadSVGResult => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!svgPath) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch(svgPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load SVG: ${res.statusText}`)
        }
        return res.text()
      })
      .then((svg) => {
        setContent(svg)
        setLoading(false)
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setLoading(false)
      })
  }, [svgPath])

  return { content, loading, error }
}
