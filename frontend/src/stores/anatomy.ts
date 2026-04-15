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

  // ===== CHAT ACTIONS (Basic Setters) =====
  setCurrentResponse: (response: string) => void
  setIsStreamingChat: (loading: boolean) => void
  setStreamError: (error: string | null) => void
  addChatMessage: (message: ChatMessage) => void
  clearChatHistory: () => void

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
  chatResponses: [],
  currentResponse: '',
  isStreamingChat: false,
  streamError: null,

  // ===== CHAT BASIC ACTIONS =====
  setCurrentResponse: (response: string) =>
    set({ currentResponse: response }),

  setIsStreamingChat: (loading: boolean) =>
    set({ isStreamingChat: loading }),

  setStreamError: (error: string | null) =>
    set({ streamError: error }),

  addChatMessage: (message: ChatMessage) =>
    set((state) => ({
      chatResponses: [message, ...state.chatResponses].slice(0, 5)
    })),

  clearChatHistory: () =>
    set({ chatResponses: [] }),

  // ===== CHAT MIDDLEWARE ACTION: Orchestrates the streaming flow =====
  startChat: async (question: string) => {
    const messageId = Date.now().toString()
    const startTime = Date.now()

    // Reset state
    set({
      isStreamingChat: true,
      currentResponse: '',
      streamError: null
    })

    try {
      // Call handler with callbacks
      const result = await handleChat(
        question,
        {
          onStart: () => {
            // Stream started - loading spinner already shown via isStreamingChat
          },
          onData: (data, type) => {
            if (type === 'sources') {
              // Highlight SVG paths
              const store = useAnatomyStore.getState()
              store.setHighlightedIds(new Set(data as string[]))
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
          },
          onError: (error) => {
            // Stream failed
            set({
              isStreamingChat: false,
              streamError: error
            })
          }
        }
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
