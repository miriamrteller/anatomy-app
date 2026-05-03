/**
 * INTEGRATION TEST FOR AnatomySVG Component
 *
 * Tests user interactions (hover, click) with real SVG data.
 * Uses real bone IDs and passes with both fetch and cache implementations.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import { AnatomySVG } from '../components/AnatomySVG'
import { useAnatomyStore } from '../stores/anatomy'
import {
  getFirstVerifiedBoneId,
  createMockSystems,
  setupFetchMock
} from './setup'

describe('AnatomySVG Component - User Interactions', () => {

  beforeEach(() => {
    // Reset store between tests
    const store = useAnatomyStore.getState()
    store.clearInteraction()

    // Mock fetch for API calls
    setupFetchMock()
  })

  it('should display structure info when user hovers over a bone', async () => {
    // Setup: Get real bone ID and SVG content
    const testBoneId = getFirstVerifiedBoneId()
    const systems = createMockSystems()

    // Render component with real SVG
    render(
      <AnatomySVG
        systems={systems}
      />
    )

    // Wait a bit for SVG to render and listeners to attach
    await waitFor(() => {
      const svg = document.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    // Wait for component to finish attaching listeners (100ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 150))

    // Find a path element inside the bone group (component adds listeners to paths)
    // NOTE: We must query AFTER listeners are attached, so we get the cloned path element
    const boneGroup = document.getElementById(testBoneId)
    if (!boneGroup) {
      throw new Error(`Could not find bone group with id="${testBoneId}"`)
    }

    const pathInGroup = boneGroup.querySelector('path')
    if (!pathInGroup) {
      throw new Error(`Could not find path element inside bone group "${testBoneId}"`)
    }

    console.log('Firing mouseenter on path:', pathInGroup)
    await act(async () => {
      fireEvent.mouseEnter(pathInGroup)
    })

    // Verify store was updated with interaction (hover state)
    await waitFor(() => {
      const store = useAnatomyStore.getState()
      const structure = store.interaction.structure

      expect(structure).toBeTruthy()
      expect(store.interaction.type).toBe('hover')

      if (structure) {
        expect(structure.svgPathIds).toContain(testBoneId)
      }
    })
  })

  it('should clear structure info when user moves mouse away', async () => {
    const testBoneId = getFirstVerifiedBoneId()
    const systems = createMockSystems()

    render(
      <AnatomySVG
        systems={systems}
      />
    )

    await waitFor(() => {
      const svg = document.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    // Wait for component to finish attaching listeners
    await new Promise(resolve => setTimeout(resolve, 150))

    const boneGroup = document.getElementById(testBoneId)
    if (!boneGroup) {
      throw new Error(`Could not find bone group with id="${testBoneId}"`)
    }

    const pathInGroup = boneGroup.querySelector('path')
    if (!pathInGroup) {
      throw new Error(`Could not find path element inside bone group "${testBoneId}"`)
    }

    // Hover then leave
    await act(async () => {
      fireEvent.mouseEnter(pathInGroup)
    })

    await waitFor(() => {
      const interaction = useAnatomyStore.getState().interaction
      expect(interaction.structure).toBeTruthy()
      expect(interaction.type).toBe('hover')
    })

    await act(async () => {
      fireEvent.mouseLeave(pathInGroup)
    })

    // Verify store was cleared
    await waitFor(() => {
      const interaction = useAnatomyStore.getState().interaction
      expect(interaction.type).toBe('none')
      expect(interaction.structure).toBeNull()
    })
  })

  it('should select structure when user clicks on a bone', async () => {
    const testBoneId = getFirstVerifiedBoneId()
    const systems = createMockSystems()

    render(
      <AnatomySVG
        systems={systems}
      />
    )

    await waitFor(() => {
      const svg = document.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    // Wait for component to finish attaching listeners
    await new Promise(resolve => setTimeout(resolve, 150))

    const boneGroup = document.getElementById(testBoneId)
    if (!boneGroup) {
      throw new Error(`Could not find bone group with id="${testBoneId}"`)
    }

    const pathInGroup = boneGroup.querySelector('path')
    if (!pathInGroup) {
      throw new Error(`Could not find path element inside bone group "${testBoneId}"`)
    }

    // Click the path
    await act(async () => {
      fireEvent.click(pathInGroup)
    })

    // Verify store was updated with interaction (click-locked)
    await waitFor(() => {
      const store = useAnatomyStore.getState()
      const structure = store.interaction.structure

      expect(structure).toBeTruthy()

      if (structure) {
        expect(structure.svgPathIds).toContain(testBoneId)
        expect(store.interaction.type).toBe('click-locked')
      }
    })
  })
})
