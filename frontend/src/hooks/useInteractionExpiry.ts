/**
 * useInteractionExpiry Hook
 * 
 * Auto-clears pulse when expiresAt timestamp is reached.
 * Handles timeout across multiple sources (sources + tool calls) via single unified expiration.
 */

import { useEffect } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import { InteractionDefaults } from '../lib/interaction'

export function useInteractionExpiry(
  timeoutMs: number = InteractionDefaults.CHAT_RESULT_TIMEOUT_MS
): void {
  const { interaction, clearInteraction } = useAnatomyStore()

  useEffect(() => {
    if (!interaction.expiresAt || interaction.type !== 'chat-result') {
      return
    }

    const now = Date.now()
    const remaining = Math.max(0, interaction.expiresAt - now)

    if (remaining === 0) {
      clearInteraction()
      return
    }

    const timer = setTimeout(() => {
      clearInteraction()
      console.log('[Expiry] Chat result pulse cleared')
    }, remaining)

    return () => clearTimeout(timer)
  }, [interaction.expiresAt, interaction.type, clearInteraction])
}
