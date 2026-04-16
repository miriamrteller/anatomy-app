import { SystemEnum } from '../types'

// Import SVGs directly as raw strings (using ?raw query param)
// This eliminates the need for runtime fetch calls
import skeletalSvg from '../assets/skeleton.svg?raw'
// DISABLED: Other systems not loaded (performance optimization)
// import muscularSvg from '../assets/muscles.svg?raw'
// import vascularSvg from '../assets/vascular.svg?raw'
// import nervousSvg from '../assets/nervous.svg?raw'
// import endocrineSvg from '../assets/endocrine.svg?raw'

/**
 * Mapping of body systems to their SVG content (now imported as static assets).
 * This replaces the old fetch-based loading approach.
 */
export const SYSTEM_SVG_CONTENT: Record<SystemEnum, string> = {
  [SystemEnum.SKELETAL]: skeletalSvg,
  // DISABLED: Other systems (import and add here if needed)
  [SystemEnum.MUSCULAR]: '',
  [SystemEnum.VASCULAR]: '',
  [SystemEnum.NERVOUS]: '',
  [SystemEnum.ENDOCRINE]: '',
}

// Legacy mapping (for backwards compatibility with imports)
export const SYSTEM_SVG_PATHS: Record<SystemEnum, string> = {
  [SystemEnum.SKELETAL]: 'skeletal',
  [SystemEnum.MUSCULAR]: 'muscular',
  [SystemEnum.VASCULAR]: 'vascular',
  [SystemEnum.NERVOUS]: 'nervous',
  [SystemEnum.ENDOCRINE]: 'endocrine',
}
