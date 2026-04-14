import { SystemEnum } from '../types'
import { SYSTEM_SVG_PATHS } from '../config/systems'
import { useLoadSVG } from './useLoadSVG'

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
 * Custom hook to load all registered body system SVGs in parallel.
 * Returns an object with loading state and content for each system.
 */
export const useSystemSVGs = (): UseSystemSVGsResult => {
  // Load each system's SVG
  const skeletalSVG = useLoadSVG(SYSTEM_SVG_PATHS[SystemEnum.SKELETAL])
  const muscularSVG = useLoadSVG(SYSTEM_SVG_PATHS[SystemEnum.MUSCULAR])
  const vascularSVG = useLoadSVG(SYSTEM_SVG_PATHS[SystemEnum.VASCULAR])
  const nervousSVG = useLoadSVG(SYSTEM_SVG_PATHS[SystemEnum.NERVOUS])
  const endocrineSVG = useLoadSVG(SYSTEM_SVG_PATHS[SystemEnum.ENDOCRINE])

  // Aggregate loading states without useState to avoid infinite loop
  const systems: Record<SystemEnum, SystemSVGData> = {
    [SystemEnum.SKELETAL]: skeletalSVG,
    [SystemEnum.MUSCULAR]: muscularSVG,
    [SystemEnum.VASCULAR]: vascularSVG,
    [SystemEnum.NERVOUS]: nervousSVG,
    [SystemEnum.ENDOCRINE]: endocrineSVG,
  }

  // Check if any system is still loading
  const allLoading = Object.values(systems).some((sys) => sys.loading)

  // Check if any system has an error
  const anyError = Object.values(systems).some((sys) => sys.error !== null)

  return { systems, allLoading, anyError }
}
