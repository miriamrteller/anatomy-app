import { SystemEnum } from '../types'

/**
 * Mapping of body systems to their SVG file paths.
 * Add new systems here as they become available.
 */
export const SYSTEM_SVG_PATHS: Record<SystemEnum, string> = {
  [SystemEnum.SKELETAL]: '/svgs/skeleton.svg',
  [SystemEnum.MUSCULAR]: '/svgs/muscles.svg',
  [SystemEnum.VASCULAR]: '/svgs/vascular.svg',
  [SystemEnum.NERVOUS]: '/svgs/nervous.svg',
  [SystemEnum.ENDOCRINE]: '/svgs/endocrine.svg',
}
