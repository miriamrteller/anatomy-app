/**
 * Streaming Types
 * Single source of truth for all SSE event types and shapes.
 * Used by processor.ts (parser) and all handlers (chat, voice, image, etc.)
 */

/** Event type definitions - kept tight to prevent typos at compile time */
export type StreamEventType = 'sources' | 'token' | 'metadata' | 'tool_call' | 'done' | 'error'

/** Raw SSE event as received from server */
export interface StreamEvent {
  event: StreamEventType
  data: any
}

/** Callbacks invoked as stream events arrive */
export interface StreamHandlerCallbacks {
  /**
   * Called when new data arrives.
   * @param data - The event payload
   * @param type - Event type for routing (sources, token, metadata, etc.)
   */
  onData(data: any, type: StreamEventType): void

  /**
   * Called when stream completes successfully (done event received).
   * Store response and update UI here.
   */
  onComplete(): void

  /**
   * Called if stream fails (error event or network error).
   * @param error - Error message to display
   */
  onError(error: string): void

  /**
   * Optional: Called when stream starts (before first event).
   * Useful for showing loading spinner.
   */
  onStart?(): void
}

/** Successful stream result */
export interface StreamResponse {
  sources: string[]        // Structure IDs for highlighting
  response: string         // Full accumulated response text
  duration: number         // Milliseconds from start to completion
}

/** Configuration options for SSE processor */
export interface ProcessorConfig {
  /** Batch token updates every N ms to reduce re-renders. Default: 50ms */
  batchIntervalMs?: number

  /** Timeout waiting for response. Default: 30000ms */
  timeoutMs?: number

  /** AbortSignal to cancel the stream */
  signal?: AbortSignal
}

/**
 * Error class for signaling successful stream completion.
 * Used internally by processor to cleanly exit loop with result.
 */
export class CompletionSignal extends Error {
  constructor(public data: StreamResponse) {
    super('stream-complete')
    this.name = 'CompletionSignal'
  }
}
