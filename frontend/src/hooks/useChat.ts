/**
 * useChat Hook
 * 
 * Convenience layer for components to interact with the chat system.
 * Hides Zustand internals - components just call send() and clear().
 * 
 * Returned interface:
 * - response: currently streaming response text
 * - isLoading: whether a stream is in progress
 * - error: error message if stream failed
 * - history: last 5 chat messages
 * - send: trigger a new chat question
 * - clear: reset history and clear current response
 */

import { useCallback } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import type { ChatMessage } from '../stores/anatomy'

export interface UseChatReturn {
  /** Currently accumulated response text */
  response: string
  /** True while stream is in progress */
  isLoading: boolean
  /** Error message if stream failed */
  error: string | null
  /** Last 5 chat messages */
  history: ChatMessage[]
  /** Send a question (triggers startChat) */
  send: (question: string) => Promise<void>
  /** Cancel active chat request */
  cancel: () => void
  /** Clear history and current response */
  clear: () => void
}

/**
 * Hook for accessing chat functionality
 * 
 * @example
 * ```tsx
 * const { response, isLoading, send, clear } = useChat()
 * 
 * <button onClick={() => send('What is the femur?')}>
 *   Send
 * </button>
 * <div>{response}</div>
 * ```
 */
export function useChat(): UseChatReturn {
  const {
    currentResponse,
    isStreamingChat,
    streamError,
    chatResponses,
    clearChatHistory,
    cancelChat,
    setStreamError
  } = useAnatomyStore()

  // Memoize send to prevent unnecessary re-renders
  const send = useCallback(
    async (question: string) => {
      setStreamError(null)
      await useAnatomyStore.getState().startChat(question)
    },
    [setStreamError]
  )

  // Memoize cancel to prevent unnecessary re-renders
  const cancel = useCallback(() => {
    cancelChat()
  }, [cancelChat])

  // Memoize clear to prevent unnecessary re-renders
  const clear = useCallback(() => {
    clearChatHistory()
    setStreamError(null)
  }, [clearChatHistory, setStreamError])

  return {
    response: currentResponse,
    isLoading: isStreamingChat,
    error: streamError,
    history: chatResponses,
    send,
    cancel,
    clear
  }
}
