import { Composition } from 'remotion';
import { FPS, Trailer, totalFrames } from './Trailer';
import * as Short from './short/HouseEdge';

export const Root = () => (
  <>
    {(['en', 'es'] as const).map((lang) => (
      <Composition key={lang} id={`trailer-${lang}`} component={Trailer} defaultProps={{ lang }}
        durationInFrames={totalFrames(lang)} fps={FPS} width={1920} height={1080} />
    ))}
    <Composition id="short-house-edge" component={Short.HouseEdge}
      durationInFrames={Short.DURATION} fps={Short.FPS} width={Short.W} height={Short.H} />
  </>
);
