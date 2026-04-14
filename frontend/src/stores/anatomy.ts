import { create } from 'zustand'
import { Structure, SystemEnum } from '../types'

interface AnatomyStore {
  selectedStructure: Structure | null
  setSelectedStructure: (structure: Structure | null) => void
  hoveredStructure: Structure | null
  setHoveredStructure: (structure: Structure | null) => void
  isRightPanelOpen: boolean
  toggleRightPanel: () => void
  isPanelMinimized: boolean
  togglePanelMinimize: () => void
  visibleSystems: Set<SystemEnum>
  toggleSystem: (system: SystemEnum) => void
  showAllSystems: () => void
  hideAllSystems: () => void
  highlightedIds: Set<string>
  setHighlightedIds: (ids: Set<string>) => void
  clearHighlight: () => void
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

  visibleSystems: new Set<SystemEnum>(Object.values(SystemEnum)),
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
}))
