import { getVideoPlayback } from "@/lib/media/video-playback";

export function VideoPlayer({ src, title }: { src: string; title: string }) {
  const playback = getVideoPlayback(src);
  if (!playback) return null;

  if (playback.kind === "file") {
    return (
      <video
        src={playback.src}
        controls
        playsInline
        preload="none"
        className="aspect-video w-full rounded-xl bg-black"
      >
        Seu navegador não consegue reproduzir este vídeo.
      </video>
    );
  }

  if (playback.kind === "embed") {
    return (
      <iframe
        src={playback.src}
        title={title}
        allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full rounded-xl border-0"
      />
    );
  }

  return (
    <a href={playback.src} target="_blank" rel="noreferrer noopener" className="text-sm font-semibold text-orange-800 underline">
      Abrir vídeo na página de origem
    </a>
  );
}
