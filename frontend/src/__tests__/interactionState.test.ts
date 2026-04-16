/**
 * Interaction State Tests
 * 
 * Tests state transitions for the unified Interaction model.
 * Verifies all interaction types and their auto-expiry behavior.
 */

import { describe, it, expect } from 'vitest'
import {
  createExpiringInteraction,
  isInteractionValid,
  millisecondsUntilExpiry,
  InteractionDefaults,
} from '../lib/interaction'
import type { Interaction, Structure } from '../types'
import { SystemEnum, StructureCategory } from '../types'

// Mock structure for testing
const mockStructure: Structure = {
  id: 'test-1',
  name: 'Test Bone',
  latinName: 'Os Testis',
  system: SystemEnum.SKELETAL,
  category: StructureCategory.BONE,
  svgPathIds: ['test-path-1'],
  description: 'A test bone',
}

describe('Interaction State Management', () => {
  describe('createExpiringInteraction', () => {
    it('creates interaction without expiry when timeoutMs is undefined', () => {
      const interaction = createExpiringInteraction({
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
      })

      expect(interaction.expiresAt).toBeUndefined()
      expect(isInteractionValid(interaction)).toBe(true)
    })

    it('creates interaction with expiry when timeoutMs is provided', () => {
      const before = Date.now()
      const interaction = createExpiringInteraction(
        {
          type: 'click-locked',
          structure: mockStructure,
          pulseIds: new Set(),
          glowId: undefined,
        },
        3000
      )
      const after = Date.now()

      expect(interaction.expiresAt).toBeDefined()
      expect(interaction.expiresAt!).toBeGreaterThanOrEqual(
        before + 3000
      )
      expect(interaction.expiresAt!).toBeLessThanOrEqual(after + 3000)
    })

    it('includes provided sourceId', () => {
      const interaction = createExpiringInteraction({
        type: 'click-locked',
        structure: mockStructure,
        sourceId: 'my-source',
        pulseIds: new Set(),
        glowId: undefined,
      })

      expect(interaction.sourceId).toBe('my-source')
    })
  })

  describe('isInteractionValid', () => {
    it('returns true for interactions without expiry', () => {
      const interaction: Interaction = {
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
      }

      expect(isInteractionValid(interaction)).toBe(true)
    })

    it('returns true for interactions not yet expired', () => {
      const interaction: Interaction = {
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
        expiresAt: Date.now() + 1000, // 1 second in future
      }

      expect(isInteractionValid(interaction)).toBe(true)
    })

    it('returns false for expired interactions', () => {
      const interaction: Interaction = {
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
        expiresAt: Date.now() - 1, // Already expired
      }

      expect(isInteractionValid(interaction)).toBe(false)
    })
  })

  describe('millisecondsUntilExpiry', () => {
    it('returns Infinity for interactions without expiry', () => {
      const interaction: Interaction = {
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
      }

      expect(millisecondsUntilExpiry(interaction)).toBe(Infinity)
    })

    it('returns positive ms for interactions in future', () => {
      const futureTime = Date.now() + 5000
      const interaction: Interaction = {
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
        expiresAt: futureTime,
      }

      const ms = millisecondsUntilExpiry(interaction)
      expect(ms).toBeGreaterThan(0)
      expect(ms).toBeLessThanOrEqual(5000)
    })

    it('returns 0 for expired interactions', () => {
      const interaction: Interaction = {
        type: 'hover',
        structure: mockStructure,
        pulseIds: new Set(),
        glowId: undefined,
        expiresAt: Date.now() - 1000, // Already expired
      }

      expect(millisecondsUntilExpiry(interaction)).toBe(0)
    })
  })

  describe('InteractionDefaults', () => {
    it('provides NONE state', () => {
      expect(InteractionDefaults.NONE.type).toBe('none')
      expect(InteractionDefaults.NONE.structure).toBeNull()
      expect(InteractionDefaults.NONE.pulseIds?.size ?? 0).toBe(0)
      expect(InteractionDefaults.NONE.glowId).toBeUndefined()
    })

    it('provides reasonable timeout durations', () => {
      expect(InteractionDefaults.CLICK_LOCK_TIMEOUT_MS).toBe(3000)
      expect(InteractionDefaults.CHAT_RESULT_TIMEOUT_MS).toBe(5000)
      expect(InteractionDefaults.EXPIRY_CHECK_INTERVAL_MS).toBe(100)
    })
  })
})
