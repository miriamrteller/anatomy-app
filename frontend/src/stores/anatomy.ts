import { create } from 'zustand'
import { Structure, SystemEnum } from '../types'
import { handleChat } from '../lib/streaming/handlers/chatHandler'

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

    // Create new AbortController for this request
    const abortController = new AbortController()

    // Reset state
    set({
      isStreamingChat: true,
      currentResponse: '',
      streamError: null,
      chatAbortController: abortController,
      highlightedIds: new Set<string>(),
      chatSourceStructures: []
    })

    try {
      // Call handler with callbacks and abort signal
      const result = await handleChat(
        question,
        {
          onStart: () => {
            // Stream started - loading spinner already shown via isStreamingChat
          },
          onData: (data, type) => {
            if (type === 'sources') {
              // Highlight SVG paths and fetch structure data
              const store = useAnatomyStore.getState()
              const sourceIds = data as string[]
              store.setHighlightedIds(new Set(sourceIds))
              
              // Fetch structure data for the first source to display after highlight
              const fetchFirstSourceStructure = async () => {
                try {
                  const response = await fetch(
                    `/api/structures/by-svg-path/lookup?pathIds=${sourceIds[0]}&system=SKELETAL`
                  )
                  if (response.ok) {
                    const result = await response.json()
                    const structures = result.data || []
                    if (structures.length > 0) {
                      store.setChatSourceStructures([structures[0]])
                    }
                  }
                } catch (err) {
                  console.error('Error fetching first source structure:', err)
                }
              }
              fetchFirstSourceStructure()
            } else if (type === 'token') {
              // Accumulate response tokens
              const store = useAnatomyStore.getState()
              const current = store.currentResponse
              store.setCurrentResponse(current + data)
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
              duration: Date.now() - startTime
            }
            store.addChatMessage(newMessage)
            set({ isStreamingChat: false })
            
            // Clear highlights after 5 seconds and set first source as selected
            setTimeout(() => {
              const currentStore = useAnatomyStore.getState()
              currentStore.setHighlightedIds(new Set<string>())
              
              // Switch to selected behavior for the first source structure
              if (currentStore.chatSourceStructures?.length > 0) {
                const firstSource = currentStore.chatSourceStructures[0] as any
                currentStore.setSelectedStructure(firstSource)
              }
            }, 5000)
          },
          onError: (error) => {
            // Stream failed
            set({
              isStreamingChat: false,
              streamError: error
            })
          }
        },
        { signal: abortController.signal }  // Pass abort signal for cancellation support
      )

      // Optional: Log metrics
      console.debug(`Chat completed in ${result.duration}ms with ${result.sources.length} sources`)
    } catch (error) {
      // Catch any uncaught errors
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({
        isStreamingChat: false,
        streamError: message
      })
    }
  }
}))
