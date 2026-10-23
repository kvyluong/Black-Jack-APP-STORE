import { Composition } from 'remotion';
import { FPS, Trailer, totalFrames } from './Trailer';
import * as Short from './short/HouseEdge';
import * as Screenlife from './screenlife/Test';
import * as Logh from './screenlife/Logh';
import * as Styles from './screenlife/StyleSheet';
import * as Suds from './screenlife/Suds';

export const Root = () => (
  <>
    {(['en', 'es'] as const).map((lang) => (
      <Composition key={lang} id={`trailer-${lang}`} component={Trailer} defaultProps={{ lang }}
        durationInFrames={totalFrames(lang)} fps={FPS} width={1920} height={1080} />
    ))}
    <Composition id="short-house-edge" component={Short.HouseEdge}
      durationInFrames={Short.DURATION} fps={Short.FPS} width={Short.W} height={Short.H} />
    <Composition id="screenlife-test" component={Screenlife.ScreenlifeTest}
      durationInFrames={Screenlife.DURATION} fps={Screenlife.FPS} width={Screenlife.W} height={Screenlife.H} />
    <Composition id="logh-edit" component={Logh.LoghEdit}
      durationInFrames={Logh.DURATION} fps={Logh.FPS} width={Logh.W} height={Logh.H} />
    <Composition id="character-styles" component={Styles.StyleSheet}
      durationInFrames={1} fps={30} width={Styles.W} height={Styles.H} />
    <Composition id="suds-style" component={Suds.SudsSheet}
      durationInFrames={Suds.LOOP} fps={30} width={Suds.W} height={Suds.H} />
  </>
);
