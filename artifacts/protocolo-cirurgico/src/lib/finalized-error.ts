/**
 * Detects and describes the API's "protocol is finalized" lock response.
 *
 * The server returns HTTP 409 with a body of
 * `{ error: "Protocolo finalizado — não pode ser modificado." }` whenever a
 * client tries to mutate a finalized (signed-off) protocol — protocol edits,
 * clinical photos and 3D files all share this contract. Clients should surface
 * it gracefully (and refresh to read-only state) instead of showing a generic
 * failure, e.g. when a stale browser tab tries to save after the report was
 * finalized elsewhere.
 */

const DEFAULT_FINALIZED_MESSAGE =
  "Protocolo finalizado — não pode ser modificado.";

/** True when the error is the API's 409 finalized-lock rejection. */
export function isFinalizedLockError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 409
  );
}

/** The human-friendly (pt-PT) message carried by a finalized-lock error. */
export function finalizedLockMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const msg = (data as { error?: unknown }).error;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
  }
  return DEFAULT_FINALIZED_MESSAGE;
}
