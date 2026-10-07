const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING_ANCHOR = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const SIGNING_REPLACEMENT = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        // MoneyFOSS production keystore (see withReleaseSigning plugin header).
        moneyfossRelease {
            def keystoreProps = new Properties()
            def keystorePropsFile = rootProject.file('key.properties')
            if (keystorePropsFile.exists()) {
                keystoreProps.load(new FileInputStream(keystorePropsFile))
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }`;

const RELEASE_BLOCK_ANCHOR = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const RELEASE_BLOCK_REPLACEMENT = `        release {
            // MoneyFOSS: production signing from android/key.properties
            // (gitignored, never committed). Without that file, release
            // falls back to debug signing and is NOT distributable.
            signingConfig rootProject.file('key.properties').exists() ? signingConfigs.moneyfossRelease : signingConfigs.debug`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('moneyfossRelease {')) {
      if (!contents.includes(SIGNING_ANCHOR)) {
        throw new Error('withReleaseSigning: signingConfigs anchor not found; review android/app/build.gradle template');
      }
      contents = contents.replace(SIGNING_ANCHOR, SIGNING_REPLACEMENT);
    }
    if (!contents.includes('signingConfigs.moneyfossRelease : signingConfigs.debug')) {
      if (!contents.includes(RELEASE_BLOCK_ANCHOR)) {
        throw new Error('withReleaseSigning: release block anchor not found; review android/app/build.gradle template');
      }
      contents = contents.replace(RELEASE_BLOCK_ANCHOR, RELEASE_BLOCK_REPLACEMENT);
    }
    config.modResults.contents = contents;
    return config;
  });
};
