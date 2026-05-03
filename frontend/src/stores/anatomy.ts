import { create } from 'zustand'
import { Structure, SystemEnum, Interaction, ChatRequest } from '../types'
import { handleChat } from '../lib/streaming/handlers/chatHandler'
import { InteractionDefaults, createChatRequest, isAbortError } from '../lib/interaction'
import { fetchWithRetry } from '../lib/fetch'
import { config } from '../lib/config'

// DISABLED: LoadingState type - system caching removed for performance
// type LoadingState = 'IDLE' | 'LOADING' | 'ERROR'

/** Chat message stored in history */
export interface ChatMessage {
  id: string
  question: string
  response: string
  svgPathIds: string[]
  timestamp: number
  duration: number
}

// ===== PERSISTENCE HELPERS =====
const STORAGE_KEY = 'anatomy-app-chat-history'

/**
 * Load chat history from localStorage
 * Returns empty array if no history found or JSON is invalid
 */
function loadChatHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to load chat history from localStorage:', error)
    return []
  }
}

/**
 * Save chat history to localStorage
 */
function saveChatHistory(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch (error) {
    console.warn('Failed to save chat history to localStorage:', error)
  }
}

/**
 * Clear chat history from localStorage
 */
function clearChatHistoryStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear chat history from localStorage:', error)
  }
}

interface AnatomyStore {
  // Existing UI state
  selectedStructure: Structure | null
  setSelectedStructure: (structure: Structure | null) => void
  hoveredStructure: Structure | null
  setHoveredStructure: (structure: Structure | null) => void
  isRightPanelOpen: boolean
  toggleRightPanel: () => void
  isPanelMinimized: boolean
  togglePanelMinimize: () => void
  isLayerControlsMinimized: boolean
  toggleLayerControlsMinimize: () => void
  visibleSystems: Set<SystemEnum>
  toggleSystem: (system: SystemEnum) => void
  showAllSystems: () => void
  hideAllSystems: () => void
  highlightedIds: Set<string>
  setHighlightedIds: (ids: Set<string>) => void
  clearHighlight: () => void

  // Data caching fields
  // DISABLED: System-based structure caching removed for simplicity
  // structures: Record<string, Structure[]>
  // setStructures: (system: SystemEnum, structures: Structure[]) => void

  // loadingState: Record<string, LoadingState>
  // setLoadingState: (system: SystemEnum, state: LoadingState) => void

  // svgPathToStructure: Record<string, Record<string, Structure>>
  // setSvgPathToStructure: (system: SystemEnum, map: Record<string, Structure>) => void

  // error: Record<string, string>
  // setError: (system: SystemEnum, error: string) => void

  // ===== CHAT STATE (Phase 3B) =====
  chatResponses: ChatMessage[]
  currentResponse: string
  isStreamingChat: boolean
  streamError: string | null
  chatAbortController: AbortController | null
  chatSourceStructures: Structure[] // Track which structures came from chat sources

  // ===== NEW: UNIFIED INTERACTION MODEL (Phase 1) =====
  interaction: Interaction
  activeChat: ChatRequest | null
  setInteraction: (patch: Partial<Interaction>) => void
  clearInteraction: () => void
  setHighlighting: (pulseIds?: Set<string>, glowId?: string) => void

  // ===== CUMULATIVE PULSE HELPER =====
  addToPulse: (structures: Structure[], primaryGlowId?: string) => void

  // ===== CHAT ACTIONS (Basic Setters) =====
  setCurrentResponse: (response: string) => void
  setIsStreamingChat: (loading: boolean) => void
  setStreamError: (error: string | null) => void
  addChatMessage: (message: ChatMessage) => void
  clearChatHistory: () => void
  cancelChat: () => void
  setChatSourceStructures: (structures: Structure[]) => void

  // ===== CHAT MIDDLEWARE ACTION (Orchestrates streaming) =====
  startChat: (question: string) => Promise<void>
}

export const useAnatomyStore = create<AnatomyStore>((set) => ({
  selectedStructure: null,
  setSelectedStructure: (structure: Structure | null) =>
    set({ selectedStructure: structure }),

  hoveredStructure: null,
  setHoveredStructure: (structure: Structure | null) =>
    set({ hoveredStructure: structure }),

  isRightPanelOpen: true,
  toggleRightPanel: () =>
    set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),

  isPanelMinimized: false,
  togglePanelMinimize: () =>
    set((state) => ({ isPanelMinimized: !state.isPanelMinimized })),

  isLayerControlsMinimized: false,
  toggleLayerControlsMinimize: () =>
    set((state) => ({ isLayerControlsMinimized: !state.isLayerControlsMinimized })),

  visibleSystems: new Set<SystemEnum>([SystemEnum.SKELETAL]),
  toggleSystem: (system: SystemEnum) =>
    set((state) => {
      const newSet = new Set(state.visibleSystems)
      if (newSet.has(system)) {
        newSet.delete(system)
      } else {
        newSet.add(system)
      }
      return { visibleSystems: newSet }
    }),

  showAllSystems: () =>
    set({ visibleSystems: new Set<SystemEnum>(Object.values(SystemEnum)) }),

  hideAllSystems: () => set({ visibleSystems: new Set<SystemEnum>() }),

  highlightedIds: new Set<string>(),
  setHighlightedIds: (ids: Set<string>) =>
    set({ highlightedIds: ids }),

  clearHighlight: () => set({ highlightedIds: new Set<string>() }),

  // DISABLED: System-based structure caching implementations removed for simplicity
  // structures: {},
  // setStructures: (system: SystemEnum, structures: Structure[]) =>
  //   set((state) => ({
  //     structures: {
  //       ...state.structures,
  //       [system]: structures,
  //     },
  //   })),

  // loadingState: {},
  // setLoadingState: (system: SystemEnum, newLoadingState: LoadingState) =>
  //   set((state) => ({
  //     loadingState: {
  //       ...state.loadingState,
  //       [system]: newLoadingState,
  //     },
  //   })),

  // svgPathToStructure: {},
  // setSvgPathToStructure: (system: SystemEnum, map: Record<string, Structure>) =>
  //   set((state) => ({
  //     svgPathToStructure: {
  //       ...state.svgPathToStructure,
  //       [system]: map,
  //     },
  //   })),

  // error: {},
  // setError: (system: SystemEnum, errorMsg: string) =>
  //   set((state) => ({
  //     error: {
  //       ...state.error,
  //       [system]: errorMsg,
  //     },
  //   })),

  // ===== CHAT STATE IMPLEMENTATIONS =====
  chatResponses: loadChatHistory(),  // Load persisted history on initialization
  currentResponse: '',
  isStreamingChat: false,
  streamError: null,
  chatAbortController: null as AbortController | null,
  chatSourceStructures: [],

  // ===== NEW: UNIFIED INTERACTION MODEL IMPLEMENTATIONS (Phase 1) =====
  interaction: {
    type: 'none',
    structure: null,
    pulseIds: new Set(),
    glowId: undefined,
  } as Interaction,
  activeChat: null as ChatRequest | null,

  setInteraction: (patch: Partial<Interaction>) =>
    set((state) => ({
      interaction: { ...state.interaction, ...patch },
    })),

  clearInteraction: () =>
    set({
      interaction: {
        type: 'none',
        structure: null,
        pulseIds: new Set(),
        glowId: undefined,
      },
    }),

  /**
   * Unified method to set highlighting for chat results
   * Replaces dual highlightedIds + sourceIds approach
   * @param pulseIds - Set of IDs to pulse (chat results)
   * @param glowId - Single ID to glow (primary/clicked structure)
   */
  setHighlighting: (pulseIds?: Set<string>, glowId?: string) =>
    set({
      interaction: {
        type: 'chat-result',
        structure: null, // Will be set separately if needed
        pulseIds: pulseIds || new Set(),
        glowId,
      },
    }),

  // ===== CHAT BASIC ACTIONS =====
  setCurrentResponse: (response: string) =>
    set({ currentResponse: response }),

  setIsStreamingChat: (loading: boolean) =>
    set({ isStreamingChat: loading }),

  setStreamError: (error: string | null) =>
    set({ streamError: error }),

  setChatSourceStructures: (structures: Structure[]) =>
    set({ chatSourceStructures: structures }),

  addChatMessage: (message: ChatMessage) =>
    set((state) => {
      const updated = [message, ...state.chatResponses].slice(0, 5)
      saveChatHistory(updated)  // Persist to localStorage
      return { chatResponses: updated }
    }),

  clearChatHistory: () => {
    clearChatHistoryStorage()  // Clear from localStorage
    set({ chatResponses: [] })
  },

  cancelChat: () => {
    const state = useAnatomyStore.getState()
    state.chatAbortController?.abort()
    set({ 
      isStreamingChat: false,
      streamError: 'Chat cancelled by user'
    })
  },

  addToPulse: (structures: Structure[], primaryGlowId?: string) => {
    if (!structures || structures.length === 0) {
      console.warn('[Store:addToPulse] Called with empty structures');
      return;
    }
    
    console.log('[Store:addToPulse] Called with:', {
      count: structures.length,
      names: structures.map(s => s.name)
    });
    
    set((state) => {
      const newSvgPathIds = structures.flatMap(s => s.svgPathIds || []);
      const mergedPulseIds = new Set([
        ...(state.interaction.pulseIds || []),
        ...newSvgPathIds,
      ]);

      console.log('[Store:addToPulse] Before merge:', {
        existing: Array.from(state.interaction.pulseIds || []),
        incoming: newSvgPathIds,
        merged: Array.from(mergedPulseIds),
        structure: structures[0]?.name,
        glowId: primaryGlowId || state.interaction.glowId,
      });
      
      // Store for debugging
      if (!(window as any).__addToPulseCalls) (window as any).__addToPulseCalls = [];
      (window as any).__addToPulseCalls.push({
        timestamp: new Date().toISOString(),
        merged: Array.from(mergedPulseIds),
        structures: structures.map(s => s.name)
      });

      return {
        interaction: {
          ...state.interaction,
          type: 'chat-result',
          structure: structures[0],
          pulseIds: mergedPulseIds,
          glowId: primaryGlowId || state.interaction.glowId || newSvgPathIds[0],
          expiresAt: Date.now() + InteractionDefaults.CHAT_RESULT_TIMEOUT_MS,
        },
      };
    });
  },

  // ===== CHAT MIDDLEWARE ACTION: Orchestrates the streaming flow =====
  startChat: async (question: string) => {
    const messageId = Date.now().toString()
    const startTime = Date.now()

    // ===== STEP 1: Cancel previous chat request =====
    // This prevents Chat A's in-flight fetches from corrupting Chat B's state
    const state = useAnatomyStore.getState()
    if (state.activeChat) {
      state.activeChat.abortController.abort()
      try {
        // Wait for all fetches to settle
        await Promise.allSettled(state.activeChat.fetchTasks)
      } catch {
        // Ignore errors from aborted requests
      }
    }

    // ===== STEP 2: Create new chat request =====
    const chatRequest = createChatRequest(question)

    // ===== STEP 3: Reset interaction state =====
    set({
      activeChat: chatRequest,
      interaction: InteractionDefaults.NONE as any,
      currentResponse: '',
      streamError: null,
      isStreamingChat: true,
      highlightedIds: new Set<string>(),
      chatSourceStructures: [],
    })

    try {
      // ===== STEP 4: Call chat handler with abort signal =====
      const result = await handleChat(
        question,
        {
          onStart: () => {
            // Stream started - loading spinner already shown via isStreamingChat
          },
          onData: (data, type) => {
            const store = useAnatomyStore.getState()

            if (type === 'sources') {
              const sourceIds = data as string[]
              console.log('[Chat:sources] Event received:', { count: sourceIds.length, ids: sourceIds })
              
              const fetchPromise = fetchWithRetry(
                `/api/structures/by-svg-path/lookup?pathIds=${sourceIds.join(',')}`,
                { signal: chatRequest.abortController.signal },
                3
              )
                .then((res) => {
                  console.log('[Chat:sources] Fetch response status:', res.status);
                  return res.ok ? res.json() : null;
                })
                .then((result) => {
                  console.log('[Chat:sources] Fetch result:', {
                    data: result?.data,
                    count: result?.data?.length,
                    firstStructure: result?.data?.[0],
                  });
                  const structures = result?.data || []
                  if (structures.length > 0) {
                    const svgPathIds = structures.flatMap((s: Structure) => s.svgPathIds || []);
                    console.log('[Chat:sources] Extracted SVG paths:', { count: svgPathIds.length, ids: svgPathIds });
                    
                    store.setChatSourceStructures(structures)
                    store.addToPulse(structures, structures[0].svgPathIds?.[0])
                    console.log('[Chat:sources] addToPulse called')
                  } else {
                    console.warn('[Chat:sources] No structures returned from API');
                  }
                })
                .catch((err) => {
                  if (!isAbortError(err)) {
                    console.error('[Chat:sources] Fetch error:', err)
                  }
                })

              if (store.activeChat) {
                store.activeChat.fetchTasks.push(fetchPromise)
              }
            } else if (type === 'token') {
              // Accumulate response tokens
              const current = store.currentResponse
              store.setCurrentResponse(current + data)
            } else if (type === 'tool_call') {
              // ===== STAGE 4: Handle tool calls from agent loop =====
              // Agent is calling a tool - dispatch UI action immediately (frontend acts optimistically)
              const toolCall = data as {
                tool_name: string
                arguments: Record<string, unknown>
                iteration: number
              }

              console.log(
                `[Agent Tool] Iteration ${toolCall.iteration}: ${toolCall.tool_name}(${JSON.stringify(toolCall.arguments)})`
              )
              
              // Store for debugging
              if (!(window as any).__toolCalls) (window as any).__toolCalls = [];
              (window as any).__toolCalls.push({
                tool_name: toolCall.tool_name,
                iteration: toolCall.iteration,
                timestamp: new Date().toISOString()
              });

              // Route tool calls to appropriate UI actions
              if (toolCall.tool_name === 'highlight_structures') {
                const ids = toolCall.arguments.ids as string[]
                if (!Array.isArray(ids) || ids.length === 0) {
                  console.warn('[Tool:highlight] Invalid IDs:', ids);
                  return;
                }

                console.log('[Tool:highlight] START:', {
                  iteration: toolCall.iteration,
                  count: ids.length,
                  ids,
                  storagBefore: Array.from(store.interaction.pulseIds || [])
                })

                const fetchPromise = fetchWithRetry(
                  `${config.apiUrl}/api/structures/by-svg-path/lookup?pathIds=${ids.join(',')}`,
                  { signal: chatRequest.abortController.signal },
                  1
                )
                  .then((res) => {
                    console.log('[Tool:highlight] Fetch response:', res.status);
                    if (!res.ok) {
                      console.error('[Tool:highlight] Response not OK:', res.status, res.statusText);
                      return null;
                    }
                    return res.json();
                  })
                  .then((result) => {
                    console.log('[Tool:highlight] Parse result:', {
                      hasData: !!result?.data,
                      count: result?.data?.length || 0,
                      first: result?.data?.[0]?.name
                    });
                    
                    if (!result) {
                      console.warn('[Tool:highlight] Result is null');
                      return;
                    }
                    
                    const structures = result?.data || []
                    if (structures.length > 0) {
                      console.log('[Tool:highlight] Calling addToPulse with:', {
                        structureCount: structures.length,
                        names: structures.map((s: any) => s.name),
                        svgPathIds: structures.flatMap((s: any) => s.svgPathIds || [])
                      });
                      
                      store.addToPulse(structures, structures[0].svgPathIds?.[0])
                      
                      console.log('[Tool:highlight] After addToPulse:', {
                        found: structures.length,
                        totalPulseNow: store.interaction.pulseIds?.size || 0,
                        pulseIds: Array.from(store.interaction.pulseIds || [])
                      })
                    } else {
                      console.warn('[Tool:highlight] No structures found')
                    }
                  })
                  .catch((err) => {
                    console.error('[Tool:highlight] Promise error:', {
                      message: err?.message,
                      name: err?.name,
                      stack: err?.stack?.split('\n')[0]
                    });
                    if (!isAbortError(err)) {
                      console.error('[Tool:highlight] Non-abort error:', err)
                    }
                  })

                if (store.activeChat) {
                  store.activeChat.fetchTasks.push(fetchPromise)
                }
              } else if (toolCall.tool_name === 'show_layer') {
                // show_layer: { system: string }
                // Action: Make this system visible, hide others
                const system = toolCall.arguments.system as string
                if (system) {
                  // Show only this system
                  store.hideAllSystems()
                  store.toggleSystem(system as SystemEnum)
                  console.log(`✓ Showing layer: ${system}`)
                }
              } else if (toolCall.tool_name === 'get_related_structures') {
                // get_related_structures: { id: string }
                // Action: Just logging - agent uses this internally, frontend doesn't need to act
                const id = toolCall.arguments.id as string
                console.log(`✓ Agent fetching related structures for: ${id}`)
              }
            }
          },
          onComplete: () => {
            // Stream complete - add to history
            const store = useAnatomyStore.getState()
            const newMessage: ChatMessage = {
              id: messageId,
              question,
              response: store.currentResponse,
              svgPathIds: Array.from(store.highlightedIds),
              timestamp: startTime,
              duration: Date.now() - startTime,
            }
            store.addChatMessage(newMessage)
            set({ isStreamingChat: false })
          },
          onError: (error) => {
            // Only set error if not aborted
            if (!isAbortError(error)) {
              set({
                isStreamingChat: false,
                streamError: error,
              })
            } else {
              set({ isStreamingChat: false })
            }
          },
        },
        { signal: chatRequest.abortController.signal }
      )

      // Optional: Log metrics
      console.debug(`Chat completed in ${result.duration}ms with ${result.sources.length} sources`)
    } catch (error) {
      // Only set error if not aborted
      if (!isAbortError(error)) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        set({
          isStreamingChat: false,
          streamError: message,
        })
      } else {
        set({ isStreamingChat: false })
      }
    }
  },
}))
