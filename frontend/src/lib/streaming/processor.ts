/**
 * Generic SSE Stream Processor
 * 
 * Parses Server-Sent Events (SSE) and routes them through a handler map.
 * Handles: parsing, batching, error recovery, backpressure (incomplete lines).
 * 
 * Works with ANY endpoint that returns SSE format: {event: "type", data: {...}}\n\n
 * Used by all handlers (chat, voice, image, etc.) - NO duplication.
 * 
 * Features:
 * - Token batching (configurable interval) to prevent UI thrashing
 * - Handler map (switch alternative) for readability and testability
 * - Proper backpressure handling (buffers incomplete lines)
 * - Clean completion signaling via CompletionSignal
 */

import {
  StreamEvent,
  StreamEventType,
  StreamHandlerCallbacks,
  StreamResponse,
  ProcessorConfig,
  CompletionSignal
} from './types'

const DEFAULT_CONFIG: ProcessorConfig = {
  batchIntervalMs: 50,
  timeoutMs: 30000
}

/**
 * Main SSE processor entry point
 * 
 * @param response - Response object from fetch (must have body stream)
 * @param callbacks - Event handlers (onData, onComplete, onError, onStart)
 * @param config - Optional config (batchIntervalMs, timeoutMs, signal)
 * @returns StreamResponse with sources, accumulated response, and duration
 */
export async function processStream(
  response: Response,
  callbacks: StreamHandlerCallbacks,
  config: ProcessorConfig = {}
): Promise<StreamResponse> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Validate response
  if (!response.ok) {
    const error = `Stream failed: HTTP ${response.status}`
    callbacks.onError(error)
    throw new Error(error)
  }

  // Check if stream was aborted before starting
  if (config.signal?.aborted) {
    const error = 'Stream cancelled'
    callbacks.onError(error)
    throw new Error(error)
  }

  // Get readable stream
  const reader = response.body?.getReader()
  if (!reader) {
    const error = 'No response stream available'
    callbacks.onError(error)
    throw new Error(error)
  }

  // Listen for abort signal
  let isAborted = false
  const abortListener = () => {
    isAborted = true
    reader.cancel().catch(() => {}) // Ignore cancellation errors
  }
  config.signal?.addEventListener('abort', abortListener)

  // Signal stream start
  callbacks.onStart?.()

  // State management
  const decoder = new TextDecoder()
  let buffer = '' // Incomplete line storage for backpressure handling
  let lastBatchTime = Date.now()
  let pendingTokens = '' // Accumulated tokens waiting for batch flush
  let sources: string[] = []
  let fullResponse = ''
  const startTime = Date.now()

  try {
    // Process stream chunks
    while (true) {
      // Check if aborted
      if (isAborted) {
        throw new Error('Stream cancelled by user')
      }

      const { done, value } = await reader.read()
      if (done) break

      // Decode chunk and append to buffer
      buffer += decoder.decode(value, { stream: true })

      // Split by SSE delimiter (double newline)
      const lines = buffer.split('\n\n')
      // Keep incomplete line in buffer for next iteration
      buffer = lines.pop() || ''

      // Process each complete SSE event
      for (const line of lines) {
        // Skip empty lines and non-data lines
        if (!line.trim() || !line.startsWith('data: ')) continue

        try {
          // Parse JSON payload
          const event = JSON.parse(line.slice(6)) as StreamEvent

          // ===== HANDLER MAP: Route event to appropriate handler =====
          const eventHandlers: Record<StreamEventType, (event: StreamEvent) => void> = {
            /**
             * SOURCES: Structure IDs for highlighting
             * Response: {event: "sources", data: ["id-1", "id-2", ...]}
             */
            sources: (event) => {
              sources = event.data || []
              callbacks.onData(sources, 'sources')
            },

            /**
             * TOKEN: Accumulate response text, batch for UI performance
             * Response: {event: "token", data: "The femur..."}
             */
            token: (event) => {
              const token = event.data as string
              fullResponse += token
              pendingTokens += token

              // Batch tokens: only update UI every N ms
              const now = Date.now()
              if (now - lastBatchTime >= finalConfig.batchIntervalMs!) {
                callbacks.onData(pendingTokens, 'token')
                pendingTokens = ''
                lastBatchTime = now
              }
            },

            /**
             * METADATA: Optional metadata events (token count, etc.)
             * Response: {event: "metadata", data: {...}}
             */
            metadata: (event) => {
              callbacks.onData(event.data, 'metadata')
            },

            /**
             * TOOL_CALL: Agent is calling a tool during function calling loop
             * Response: {event: "tool_call", data: {tool_name: string, arguments: {...}, iteration: number}}
             * Frontend uses this to act immediately on tool calls (highlight, show layer, etc.)
             */
            tool_call: (event) => {
              callbacks.onData(event.data, 'tool_call')
            },

            /**
             * DONE: Stream complete, return accumulated result
             * Response: {event: "done"}
             */
            done: (_event) => {
              // Flush any remaining batched tokens
              if (pendingTokens) {
                callbacks.onData(pendingTokens, 'token')
              }
              callbacks.onComplete()

              // Signal completion and exit loop with result
              throw new CompletionSignal({
                sources,
                response: fullResponse,
                duration: Date.now() - startTime
              })
            },

            /**
             * ERROR: Server-side error
             * Response: {event: "error", data: "error message"}
             */
            error: (event) => {
              throw new Error(event.data as string)
            }
          }

          // Look up and execute handler for this event type
          const handler = eventHandlers[event.event]
          if (handler) {
            handler(event)
          } else {
            console.warn(`Unknown event type: ${(event as any).event}`)
          }
        } catch (parseError) {
          // If it's our completion signal, re-throw to exit
          if (parseError instanceof CompletionSignal) {
            throw parseError
          }
          // Otherwise log and continue (malformed event, don't break stream)
          console.error('Failed to parse stream event:', parseError)
        }
      }
    }

    // Stream ended without done event - treat as error
    throw new Error('Stream ended without done event')
  } catch (error) {
    // Handle completion signal (success path)
    if (error instanceof CompletionSignal) {
      return error.data
    }

    // Handle any other error
    const message = error instanceof Error ? error.message : 'Unknown error'
    callbacks.onError(message)
    throw error
  } finally {
    // Clean up abort listener
    config.signal?.removeEventListener('abort', abortListener)
  }
}
