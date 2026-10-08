export type VideoPlayback =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string }
  | { kind: "link"; src: string };

const DIRECT_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "ogg"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function getVideoPlayback(value: string): VideoPlayback | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  const extension = url.pathname.split(".").pop()?.toLowerCase();
  if (extension && DIRECT_VIDEO_EXTENSIONS.has(extension)) {
    return { kind: "file", src: url.toString() };
  }

  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
    const id = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.split("/").filter(Boolean).at(-1);
    if (id && YOUTUBE_ID.test(id)) {
      return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
  }

  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = url.pathname.split("/").filter(Boolean).at(-1);
    if (id && /^\d+$/.test(id)) {
      return { kind: "embed", src: `https://player.vimeo.com/video/${id}` };
    }
  }

  return { kind: "link", src: url.toString() };
}
