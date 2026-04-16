import { create } from 'zustand'
import { Structure, SystemEnum, Interaction, ChatRequest } from '../types'
import { handleChat } from '../lib/streaming/handlers/chatHandler'
import { InteractionDefaults, createChatRequest, isAbortError } from '../lib/interaction'
import { fetchWithRetry } from '../lib/fetch'

type LoadingState = 'IDLE' | 'LOADING' | 'ERROR'

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
  structures: Record<string, Structure[]>
  setStructures: (system: SystemEnum, structures: Structure[]) => void

  loadingState: Record<string, LoadingState>
  setLoadingState: (system: SystemEnum, state: LoadingState) => void

  svgPathToStructure: Record<string, Record<string, Structure>>
  setSvgPathToStructure: (system: SystemEnum, map: Record<string, Structure>) => void

  error: Record<string, string>
  setError: (system: SystemEnum, error: string) => void

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

  // NEW: Data caching implementations
  structures: {},
  setStructures: (system: SystemEnum, structures: Structure[]) =>
    set((state) => ({
      structures: {
        ...state.structures,
        [system]: structures,
      },
    })),

  loadingState: {},
  setLoadingState: (system: SystemEnum, newLoadingState: LoadingState) =>
    set((state) => ({
      loadingState: {
        ...state.loadingState,
        [system]: newLoadingState,
      },
    })),

  svgPathToStructure: {},
  setSvgPathToStructure: (system: SystemEnum, map: Record<string, Structure>) =>
    set((state) => ({
      svgPathToStructure: {
        ...state.svgPathToStructure,
        [system]: map,
      },
    })),

  error: {},
  setError: (system: SystemEnum, errorMsg: string) =>
    set((state) => ({
      error: {
        ...state.error,
        [system]: errorMsg,
      },
    })),

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
    sourceIds: [],
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
        sourceIds: [],
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
              store.setHighlightedIds(new Set(sourceIds))

              // Fetch structure data for the first source to display in info panel
              const fetchFirstSourceStructure = async () => {
                try {
                  const fetchPromise = fetchWithRetry(
                    `/api/structures/by-svg-path/lookup?pathIds=${sourceIds[0]}&system=SKELETAL`,
                    { signal: chatRequest.abortController.signal },
                    3  // max 3 retries
                  )
                    .then((response) => {
                      if (!response.ok) throw new Error(`HTTP ${response.status}`)
                      return response.json()
                    })
                    .then((result) => {
                      const structures = result.data || []
                      if (structures.length > 0) {
                        store.setChatSourceStructures([structures[0]])
                        // Update interaction with first source structure
                        // Pulse for 20 seconds
                        store.setInteraction({
                          type: 'chat-result',
                          structure: structures[0],
                          sourceId: `chat-${chatRequest.id}`,
                          sourceIds,
                        })
                        
                        // Set timeout to convert pulse to click glow after 20s
                        setTimeout(() => {
                          const currentState = useAnatomyStore.getState()
                          // Only convert if still showing the same chat result
                          if (currentState.interaction.type === 'chat-result' && 
                              currentState.interaction.sourceId === `chat-${chatRequest.id}`) {
                            // Clear highlights to remove pulse, then switch to click-locked glow
                            currentState.clearHighlight()
                            currentState.setInteraction({
                              type: 'click-locked',
                              structure: structures[0],
                              sourceId: `chat-${chatRequest.id}`,
                              sourceIds: [],
                            })
                          }
                        }, InteractionDefaults.CHAT_RESULT_TIMEOUT_MS)
                      }
                    })

                  // Track this fetch in activeChat
                  if (store.activeChat) {
                    store.activeChat.fetchTasks.push(fetchPromise)
                  }
                } catch (err) {
                  if (!isAbortError(err)) {
                    console.error('Error fetching first source structure:', err)
                  }
                }
              }

              fetchFirstSourceStructure()
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

              // Route tool calls to appropriate UI actions
              if (toolCall.tool_name === 'highlight_structures') {
                // highlight_structures: { ids: string[] }
                // Action: Highlight these structure IDs on the SVG
                const ids = toolCall.arguments.ids as string[]
                if (Array.isArray(ids)) {
                  store.setHighlightedIds(new Set(ids))
                  console.log(`✓ Highlighted ${ids.length} structure(s)`)
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
