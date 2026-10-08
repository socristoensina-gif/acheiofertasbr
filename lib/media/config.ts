export const MEDIA_BUCKET = "produto-midias";
export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024;

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
