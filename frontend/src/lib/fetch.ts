/**
 * Fetch with retry logic
 * 
 * Automatically retries failed requests with exponential backoff.
 * Treats 304 (Not Modified) responses as success.
 * Respects abort signals for proper cleanup.
 */

/**
 * Fetch with retry logic - max 3 attempts by default
 * Handles errors gracefully and respects abort signals
 */
export async function fetchWithRetry(
  url: string,
  options: { signal?: AbortSignal } = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // 304 is success (not modified), return it
      if (response.status === 304) {
        return response
      }
      
      // Any other response (including errors) return immediately
      return response
    } catch (err) {
      lastError = err as Error
      
      // Don't retry if aborted
      if (options.signal?.aborted) {
        throw err
      }

      // On last attempt, throw
      if (attempt === maxRetries) {
        throw err
      }

      // Exponential backoff: 100ms, 300ms, 900ms
      const delayMs = 100 * Math.pow(3, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error('Fetch failed after max retries')
}
