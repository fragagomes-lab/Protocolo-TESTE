/**
 * Report-inclusion rules for clinical photos, shared by the web and mobile
 * photo editors so these two invariants can never drift between platforms:
 *
 *   1. The header (cover) photo is always included in the report.
 *   2. Excluding a photo from the report also clears its header flag.
 *
 * The server only enforces header *exclusivity* (one header per protocol), not
 * these two rules, so they must be applied client-side wherever a save payload
 * is built. Both photo editors call these helpers instead of re-deriving the
 * logic locally — that is what keeps the two clients from diverging.
 */

export interface PhotoReportFlags {
  /** Whether the photo is included in the generated report/PDF. */
  includeInPdf: boolean;
  /** Whether the photo is the protocol's header (cover) photo. */
  isHeaderPhoto: boolean;
}

/**
 * Apply the user's "include in report" choice, enforcing rule #2: excluding a
 * photo from the report also clears its header flag.
 */
export function setPhotoIncludedInReport(
  current: PhotoReportFlags,
  includeInPdf: boolean,
): PhotoReportFlags {
  if (!includeInPdf) {
    return { includeInPdf: false, isHeaderPhoto: false };
  }
  return { includeInPdf: true, isHeaderPhoto: current.isHeaderPhoto };
}

/**
 * Apply the user's "set as header photo" choice, enforcing rule #1: the header
 * photo is always included in the report.
 */
export function setPhotoAsHeader(
  current: PhotoReportFlags,
  isHeaderPhoto: boolean,
): PhotoReportFlags {
  if (isHeaderPhoto) {
    return { includeInPdf: true, isHeaderPhoto: true };
  }
  return { includeInPdf: current.includeInPdf, isHeaderPhoto: false };
}

/** True when the flags satisfy both report invariants. */
export function isPhotoReportFlagsValid(flags: PhotoReportFlags): boolean {
  // The only invalid combination is a header photo excluded from the report.
  return !(flags.isHeaderPhoto && !flags.includeInPdf);
}

/**
 * Final guard for save payloads: coerce flags into a valid state. A photo that
 * is somehow marked as header while excluded loses its header flag (rule #2),
 * which also restores rule #1. Use this when building a payload from
 * accumulated editor state that a shared transition may not have touched.
 */
export function normalizePhotoReportFlags(
  flags: PhotoReportFlags,
): PhotoReportFlags {
  if (flags.isHeaderPhoto && !flags.includeInPdf) {
    return { includeInPdf: false, isHeaderPhoto: false };
  }
  return flags;
}
