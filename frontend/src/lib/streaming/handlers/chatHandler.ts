/**
 * Chat-Specific SSE Handler
 * 
 * Handles the chat-to-stream flow:
 * 1. Take a question string
 * 2. POST to /api/chat
 * 3. Get Response with SSE body
 * 4. Delegate parsing to generic processor
 * 
 * The processor handles all SSE parsing - this just does the fetch setup.
 * If adding voice/image handlers later, they follow the same pattern:
 * fetch setup → call processStream(response, callbacks, config)
 */

import { processStream } from '../processor'
import { StreamHandlerCallbacks, StreamResponse, ProcessorConfig } from '../types'
import { config } from '../../config'

/** Configuration specific to chat handler */
export interface ChatHandlerConfig extends ProcessorConfig {
  /** API endpoint for chat. Default: from VITE_API_URL env var */
  endpoint?: string
}

/**
 * Handle chat question with SSE streaming response
 * 
 * @param question - User's question
 * @param callbacks - SSE event handlers
 * @param config - Optional config (endpoint, batchIntervalMs, etc.)
 * @returns Promise resolving to accumulated response + sources + duration
 * 
 * @throws Error if fetch fails, if parsing fails, or if stream errors
 */
export async function handleChat(
  question: string,
  callbacks: StreamHandlerCallbacks,
  chatConfig: ChatHandlerConfig = {}
): Promise<StreamResponse> {
  const endpoint = chatConfig.endpoint || `${config.apiUrl}/api/chat`

  if (!question?.trim()) {
    throw new Error('Question cannot be empty')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })

  return processStream(response, callbacks, chatConfig)
}
