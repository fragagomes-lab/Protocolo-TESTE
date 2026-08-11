import type { Response } from "express";
import { eq } from "drizzle-orm";
import { db, protocolsTable } from "@workspace/db";

/**
 * A protocol whose status is "finalized" is a signed-off surgical record and
 * must not be mutated through the API — the browser UI hides its edit controls,
 * but a stale tab, a mobile client, or a direct request could otherwise still
 * alter it. These helpers enforce that invariant on the server.
 */

/** Fetch a protocol's status, or null when the protocol does not exist. */
export async function getProtocolStatus(id: number): Promise<string | null> {
  const [row] = await db
    .select({ status: protocolsTable.status })
    .from(protocolsTable)
    .where(eq(protocolsTable.id, id));
  return row?.status ?? null;
}

/**
 * Guard for child-resource write routes (planning images, 3D files) that mutate
 * the clinical content of a specific protocol. Loads the parent protocol and,
 * when it is missing, responds 404; when it is finalized, responds 409.
 *
 * Returns true when a response has already been sent and the caller must stop.
 */
export async function blockIfProtocolMissingOrFinalized(
  protocolId: number,
  res: Response,
): Promise<boolean> {
  const status = await getProtocolStatus(protocolId);
  if (status === null) {
    res.status(404).json({ error: "Protocol not found" });
    return true;
  }
  if (status === "finalized") {
    res
      .status(409)
      .json({ error: "Protocolo finalizado — não pode ser modificado." });
    return true;
  }
  return false;
}
