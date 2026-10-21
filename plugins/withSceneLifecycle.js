// Adopts the iOS scene life cycle. Apps built with the iOS 27 SDK (Xcode 27) stop at launch
// unless they use a scene delegate. Expo SDK 57 ships one (ExpoAppSceneDelegate) but its
// prebuild template doesn't use it yet, so this plugin:
//   - registers the delegate in Info.plist (UIApplicationSceneManifest), and
//   - has AppDelegate hand the window over to it: it still creates the React Native factory,
//     but the scene delegate creates the window and starts React Native in it.
// Scenes work on every iOS version the app supports, so builds from older Xcode are fine too.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE = 'EXExpoAppSceneDelegate';

function withSceneManifest(config) {
  return withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: SCENE_DELEGATE },
        ],
      },
    };
    return c;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    let src = c.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return c;

    const decl = 'class AppDelegate: ExpoAppDelegate {';
    if (!src.includes(decl)) throw new Error('withSceneLifecycle: AppDelegate declaration not found');
    src = src.replace(decl, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');

    // The scene delegate creates the window and starts React Native, so AppDelegate no longer does.
    const start = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
    if (!start.test(src)) throw new Error('withSceneLifecycle: window setup in AppDelegate not found');
    src = src.replace(start, '\n');

    c.modResults.contents = src;
    return c;
  });
}

module.exports = (config) => withSceneAppDelegate(withSceneManifest(config));
