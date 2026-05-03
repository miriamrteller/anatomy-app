/**
 * Interaction Model Utilities
 * 
 * Helpers for managing the unified Interaction state.
 * Encapsulates constants, creation functions, and validation logic.
 */

import { Interaction, ChatRequest } from '../types'

/** Default values and constants for interaction management */
export const InteractionDefaults = {
  /** Default "no interaction" state */
  NONE: Object.freeze({
    type: 'none',
    structure: null,
    pulseIds: new Set<string>(),
    glowId: undefined,
  }) as Readonly<
    Pick<Interaction, 'type' | 'structure' | 'pulseIds' | 'glowId'>
  >,

  /** How long click-lock lasts (milliseconds) - now persistent until new interaction */
  CLICK_LOCK_TIMEOUT_MS: 3000,

  /** How long chat result pulse lasts before auto-clearing (milliseconds) */
  CHAT_RESULT_TIMEOUT_MS: 20000,

  /** Poll interval for checking interaction expiry (milliseconds) */
  EXPIRY_CHECK_INTERVAL_MS: 100,
} as const

/**
 * Create a new ChatRequest with generated ID and abort controller
 * @param question - User's question
 * @returns New ChatRequest ready to track fetches
 */
export function createChatRequest(question: string): ChatRequest {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    question,
    abortController: new AbortController(),
    startedAt: Date.now(),
    fetchTasks: [],
  }
}

/**
 * Check if an interaction should still be visible
 * @param interaction - Current interaction state
 * @returns true if interaction hasn't expired
 */
export function isInteractionValid(interaction: Interaction): boolean {
  if (!interaction.expiresAt) {
    // No expiry set, always valid (e.g., hover state)
    return true
  }
  return Date.now() < interaction.expiresAt
}

/**
 * Calculate milliseconds until interaction expires
 * @param interaction - Current interaction state
 * @returns Milliseconds until expiry, or Infinity if no expiry
 */
export function millisecondsUntilExpiry(interaction: Interaction): number {
  if (!interaction.expiresAt) {
    return Infinity
  }
  return Math.max(0, interaction.expiresAt - Date.now())
}

/**
 * Create an interaction with auto-expiry
 * @param baseInteraction - Interaction data
 * @param timeoutMs - How long until expiry (undefined = no expiry)
 * @returns Interaction with expiresAt set
 */
export function createExpiringInteraction(
  baseInteraction: Omit<Interaction, 'expiresAt'>,
  timeoutMs?: number
): Interaction {
  return {
    ...baseInteraction,
    expiresAt: timeoutMs ? Date.now() + timeoutMs : undefined,
  }
}

/**
 * Abort a chat request and clean up all its in-flight fetches
 * @param chatRequest - Request to abort
 */
export async function abortChatRequest(
  chatRequest: ChatRequest | null
): Promise<void> {
  if (!chatRequest) return

  // Signal abort to all in-flight requests
  chatRequest.abortController.abort()

  // Wait for all fetches to settle (ignore rejections)
  if (chatRequest.fetchTasks.length > 0) {
    await Promise.allSettled(chatRequest.fetchTasks)
  }
}

/**
 * Type guard: is this an abort error from a cancelled request?
 * @param error - Error to check
 * @returns true if this is a DOMException abort error
 */
export function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError'
  )
}
