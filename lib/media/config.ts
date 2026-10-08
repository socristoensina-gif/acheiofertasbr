export const MEDIA_BUCKET = "produto-midias";
export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_OFFER_IMAGES = 5;
export const MAX_OFFER_VIDEOS = 2;

export const MEDIA_FILE_TYPES = {
  image: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  },
  video: {
    "video/mp4": "mp4",
    "video/webm": "webm",
  },
} as const;

export type MediaKind = keyof typeof MEDIA_FILE_TYPES;

export function mediaFileExtension(kind: MediaKind, contentType: string): string | null {
  if (!Object.hasOwn(MEDIA_FILE_TYPES[kind], contentType)) return null;
  return MEDIA_FILE_TYPES[kind][contentType as keyof typeof MEDIA_FILE_TYPES[MediaKind]];
}

export function validMediaStoragePath(path: string, kind?: MediaKind): boolean {
  const match = /^(image|video)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif|gif|mp4|webm)$/i.exec(path);
  if (!match) return false;
  const pathKind = match[1] as MediaKind;
  const extension = match[2].toLowerCase();
  if (kind && kind !== pathKind) return false;
  return pathKind === "image"
    ? ["jpg", "png", "webp", "avif", "gif"].includes(extension)
    : ["mp4", "webm"].includes(extension);
}

export type OfferMedia = {
  kind: MediaKind;
  storagePath: string | null;
  externalUrl: string | null;
  previewUrl: string;
  approved: boolean;
};
