/**
 * Tipos de ficheiro aceites para fotografias/imagens de planeamento:
 * JPEG, PNG, HEIC/HEIF e PDF. Alguns browsers/sistemas não preenchem
 * `file.type`, por isso deduzimos o content-type a partir da extensão como
 * fallback. Ficheiros HEIC/HEIF são convertidos para JPEG no browser antes
 * do upload (ver `prepareUploadFile`).
 */
export const IMAGE_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/*,application/pdf,.pdf,.heic,.heif,image/heic,image/heif";

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
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

export function isHeicFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ext === "heic" || ext === "heif";
}

/**
 * Resultado normalizado de um ficheiro pronto para upload: o corpo (Blob),
 * o nome final e o content-type — já com a conversão HEIC→JPEG aplicada
 * quando aplicável.
 */
export interface PreparedUpload {
  body: Blob;
  name: string;
  contentType: string;
  size: number;
}

/**
 * Prepara um ficheiro para upload. Se for HEIC/HEIF, converte-o para JPEG no
 * browser (import dinâmico de heic2any), renomeando a extensão para .jpg. Para
 * os restantes formatos devolve o ficheiro tal como está — de forma transparente
 * para o utilizador.
 */
export async function prepareUploadFile(file: File): Promise<PreparedUpload> {
  if (isHeicFile(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = (await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      })) as Blob | Blob[];
      const blob = Array.isArray(converted) ? converted[0] : converted;
      const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
      const finalName = name === file.name ? `${file.name}.jpg` : name;
      return { body: blob, name: finalName, contentType: "image/jpeg", size: blob.size };
    } catch (e) {
      console.error("Falha na conversão HEIC→JPEG", e);
      // Se a conversão falhar, tenta enviar o original.
    }
  }
  return { body: file, name: file.name, contentType: resolveContentType(file), size: file.size };
}
