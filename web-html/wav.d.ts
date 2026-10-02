// esbuild's "binary" loader inlines .wav files as bytes (see scripts/build-html.mjs).
declare module '*.wav' {
  const bytes: Uint8Array;
  export default bytes;
}
