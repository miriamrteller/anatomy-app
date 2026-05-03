import { SystemEnum } from '../types'
import { SYSTEM_SVG_CONTENT } from '../config/systems'

interface SystemSVGData {
  content: string
  loading: boolean
  error: string | null
}

interface UseSystemSVGsResult {
  systems: Record<SystemEnum, SystemSVGData>
  allLoading: boolean
  anyError: boolean
}

/**
 * Custom hook to provide all registered body system SVGs.
 * SVGs are now imported as static assets at build time (no runtime fetching).
 * Returns content immediately with no loading delay.
 */
export const useSystemSVGs = (): UseSystemSVGsResult => {
  // SVGs are imported directly as assets, so they're available immediately
  // No loading state needed - just return the content
  const systems: Record<SystemEnum, SystemSVGData> = {
    [SystemEnum.SKELETAL]: {
      content: SYSTEM_SVG_CONTENT[SystemEnum.SKELETAL],
      loading: false,
      error: null,
    },
    // DISABLED: Other systems not loaded for performance
    [SystemEnum.MUSCULAR]: { content: '', loading: false, error: null },
    [SystemEnum.VASCULAR]: { content: '', loading: false, error: null },
    [SystemEnum.NERVOUS]: { content: '', loading: false, error: null },
    [SystemEnum.ENDOCRINE]: { content: '', loading: false, error: null },
  }

  return {
    systems,
    allLoading: false,  // Never loading - assets imported at build time
    anyError: false,    // No errors - static content
  }
}
