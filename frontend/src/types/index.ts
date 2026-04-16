export enum SystemEnum {
  SKELETAL = 'SKELETAL',
  MUSCULAR = 'MUSCULAR',
  VASCULAR = 'VASCULAR',
  NERVOUS = 'NERVOUS',
  ENDOCRINE = 'ENDOCRINE',
}

export enum StructureCategory {
  BONE = 'BONE',
  CARTILAGE = 'CARTILAGE',
  LIGAMENT = 'LIGAMENT',
  MUSCLE = 'MUSCLE',
  TENDON = 'TENDON',
  ORGAN = 'ORGAN',
  VASCULAR_VESSEL = 'VASCULAR_VESSEL',
  NERVE = 'NERVE',
  LYMPH_NODE = 'LYMPH_NODE',
  TISSUE = 'TISSUE',
}

export interface SvgPath {
  id: string
  viewBox?: string
  x?: number
  y?: number
  width?: number
  height?: number
  boundingBox?: Record<string, unknown>
  system?: string
}

export interface Coordinates {
  x: number
  y: number
  width: number
  height: number
}

export interface BoneMetadata extends Record<string, unknown> {
  boneType?: string
  region?: string
  side?: string
  articulations?: string[]
  innervation?: string
  boneCount?: number
  svgPathId?: string
  [key: string]: unknown
}

export interface Structure {
  id: string
  name: string
  latinName: string
  system: SystemEnum
  category: StructureCategory
  svgPathIds: string[]
  coordinates?: Coordinates
  aliases?: string[]
  hierarchyParent?: string
  metadata?: BoneMetadata
  description: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Unified interaction state for all SVG interactions
 * Replaces separate click-lock refs, selectedStructure, and hoveredStructure
 * 
 * Transitions:
 * - none → hover (mouse enter)
 * - hover → none (mouse leave)
 * - none → click-locked (click)
 * - click-locked → none (timeout after 3s)
 * - any → chat-result (chat response arrives)
 * - chat-result → none (timeout after 5s)
 */
export type InteractionType = 'none' | 'hover' | 'click-locked' | 'chat-result'

export interface Interaction {
  /** Current interaction type */
  type: InteractionType
  
  /** Structure being displayed in info panel */
  structure: Structure | null
  
  /** What triggered this interaction (for debugging/tracking) */
  sourceId?: string
  
  /** All IDs to highlight in SVG (from chat sources or single click) */
  sourceIds: string[]
  
  /** Millisecond timestamp: when this interaction expires and auto-clears */
  expiresAt?: number
}

/**
 * Tracks a single chat request through its lifecycle
 * Enables proper cleanup and abort handling
 */
export interface ChatRequest {
  /** Unique ID for this chat session */
  id: string
  
  /** User's question */
  question: string
  
  /** Signal to abort this request and its fetches */
  abortController: AbortController
  
  /** When this request started */
  startedAt: number
  
  /** All in-flight fetch promises for proper cleanup */
  fetchTasks: Promise<any>[]
}
