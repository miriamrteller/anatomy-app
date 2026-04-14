import { create } from 'zustand'
import { Structure, SystemEnum } from '../types'

type LoadingState = 'IDLE' | 'LOADING' | 'ERROR'

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

  // NEW: Data caching fields
  structures: Record<string, Structure[]>
  setStructures: (system: SystemEnum, structures: Structure[]) => void

  loadingState: Record<string, LoadingState>
  setLoadingState: (system: SystemEnum, state: LoadingState) => void

  svgPathToStructure: Record<string, Record<string, Structure>>
  setSvgPathToStructure: (system: SystemEnum, map: Record<string, Structure>) => void

  error: Record<string, string>
  setError: (system: SystemEnum, error: string) => void
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
}))
