export enum SystemEnum {
  SKELETAL = 'SKELETAL',
  MUSCULAR = 'MUSCULAR',
  VASCULAR = 'VASCULAR',
  NERVOUS = 'NERVOUS',
  ENDOCRINE = 'ENDOCRINE',
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
  latin_name: string
  system: SystemEnum
  coordinates: Coordinates
  svg_path_id: string
  description: string
  createdAt?: string
  updatedAt?: string
}
