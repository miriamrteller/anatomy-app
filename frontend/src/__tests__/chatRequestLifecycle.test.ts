/**
 * Chat Request Lifecycle Tests
 * 
 * Tests that chat requests are properly created, tracked, and cancelled.
 * Ensures no race conditions where Chat A's fetch corrupts Chat B's state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createChatRequest, isAbortError, abortChatRequest } from '../lib/interaction'

describe('Chat Request Lifecycle', () => {
  describe('createChatRequest', () => {
    it('creates a unique ChatRequest with all required fields', () => {
      const question = 'What is the femur?'
      const request = createChatRequest(question)

      expect(request.id).toMatch(/^chat-/)
      expect(request.question).toBe(question)
      expect(request.abortController).toBeInstanceOf(AbortController)
      expect(request.startedAt).toBeGreaterThan(0)
      expect(request.fetchTasks).toEqual([])
    })

    it('creates different IDs for each request', () => {
      const request1 = createChatRequest('Question 1')
      const request2 = createChatRequest('Question 2')

      expect(request1.id).not.toBe(request2.id)
    })
  })

  describe('isAbortError', () => {
    it('detects DOMException abort errors', () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      expect(isAbortError(abortError)).toBe(true)
    })

    it('returns false for non-abort errors', () => {
      const normalError = new Error('Something else')
      expect(isAbortError(normalError)).toBe(false)
    })

    it('returns false for non-Error values', () => {
      expect(isAbortError('string error')).toBe(false)
      expect(isAbortError(null)).toBe(false)
      expect(isAbortError(undefined)).toBe(false)
    })
  })

  describe('abortChatRequest', () => {
    it('aborts the request signal', async () => {
      const request = createChatRequest('Test')
      expect(request.abortController.signal.aborted).toBe(false)

      await abortChatRequest(request)

      expect(request.abortController.signal.aborted).toBe(true)
    })

    it('waits for all fetch tasks to settle', async () => {
      const request = createChatRequest('Test')
      
      // Add some pending promises
      const task1 = new Promise((resolve) => setTimeout(resolve, 10))
      const task2 = new Promise((resolve) => setTimeout(resolve, 20))
      
      request.fetchTasks.push(task1, task2)

      let allSettled = false
      const settledPromise = abortChatRequest(request).then(() => {
        allSettled = true
      })

      // Give promises time to settle
      await new Promise((r) => setTimeout(r, 50))
      
      expect(allSettled).toBe(true)
    })

    it('handles null request gracefully', async () => {
      // Should not throw
      await expect(abortChatRequest(null)).resolves.toBeUndefined()
    })
  })
})
