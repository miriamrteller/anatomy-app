/**
 * useInteractionExpiry Hook
 * 
 * Polls interaction.expiresAt and auto-clears interaction when it expires.
 * This replaces manual setTimeout callbacks with a reactive, centralized approach.
 * 
 * Usage:
 * ```tsx
 * export function App() {
 *   useInteractionExpiry()  // Just call it, no return value needed
 *   // ... rest of component
 * }
 * ```
 */

import { useEffect } from 'react'
import { useAnatomyStore } from '../stores/anatomy'
import {
  InteractionDefaults,
  millisecondsUntilExpiry,
} from '../lib/interaction'

export function useInteractionExpiry(): void {
  const { interaction, setInteraction } = useAnatomyStore()

  useEffect(() => {
    // If no expiry set, nothing to do
    if (!interaction.expiresAt) {
      return
    }

    // Set up polling interval
    const pollInterval = setInterval(() => {
      const msUntilExpiry = millisecondsUntilExpiry(interaction)

      // If expired, clear interaction
      if (msUntilExpiry <= 0) {
        setInteraction({
          type: 'none',
          structure: null,
          sourceIds: [],
        })
        clearInterval(pollInterval)
      }
    }, InteractionDefaults.EXPIRY_CHECK_INTERVAL_MS)

    // Cleanup interval on unmount or when interaction changes
    return () => clearInterval(pollInterval)
  }, [interaction, setInteraction])
}
