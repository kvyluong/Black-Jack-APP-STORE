import { Composition } from 'remotion';
import { FPS, Trailer, totalFrames } from './Trailer';

export const Root = () => (
  <>
    {(['en', 'es'] as const).map((lang) => (
      <Composition key={lang} id={`trailer-${lang}`} component={Trailer} defaultProps={{ lang }}
        durationInFrames={totalFrames(lang)} fps={FPS} width={1920} height={1080} />
    ))}
  </>
);
