import assert from "node:assert/strict";
import test from "node:test";

import { getVideoPlayback } from "../lib/media/video-playback.ts";

test("recognizes browser-playable video files", () => {
  assert.deepEqual(
    getVideoPlayback("https://cdn.example.test/product/demo.mp4?token=temporary"),
    { kind: "file", src: "https://cdn.example.test/product/demo.mp4?token=temporary" },
  );
  assert.equal(getVideoPlayback("https://cdn.example.test/demo.webm")?.kind, "file");
});

test("embeds only supported YouTube and Vimeo URLs", () => {
  assert.deepEqual(
    getVideoPlayback("https://youtu.be/abcdefghijk"),
    { kind: "embed", src: "https://www.youtube-nocookie.com/embed/abcdefghijk" },
  );
  assert.deepEqual(
    getVideoPlayback("https://vimeo.com/123456"),
    { kind: "embed", src: "https://player.vimeo.com/video/123456" },
  );
  assert.equal(getVideoPlayback("https://youtube.com.evil.example/watch?v=abcdefghijk")?.kind, "link");
});

test("rejects insecure or malformed video URLs", () => {
  assert.equal(getVideoPlayback("javascript:alert(1)"), null);
  assert.equal(getVideoPlayback("http://cdn.example.test/demo.mp4"), null);
});
