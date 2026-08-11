/**
 * Tipos de ficheiro aceites para fotografias/imagens de planeamento:
 * JPEG, PNG e PDF. Alguns browsers/sistemas não preenchem `file.type`,
 * por isso deduzimos o content-type a partir da extensão como fallback.
 */
export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/*,application/pdf,.pdf";

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
};

export function resolveContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TYPES[ext] || "application/octet-stream";
}

export function isPdfName(name?: string | null): boolean {
  return !!name && name.toLowerCase().endsWith(".pdf");
}
