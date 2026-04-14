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

export interface Structure {
  id: string
  name: string
  latinName: string
  system: SystemEnum
  category: StructureCategory
  svgPaths: SvgPath[]
  coordinates?: Coordinates
  aliases?: string[]
  hierarchyParent?: string
  metadata?: Record<string, unknown>
  description: string
  createdAt?: string
  updatedAt?: string
}
