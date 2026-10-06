const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAllowBackupFalse(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:allowBackup'] = 'false';
    }
    return config;
  });
};
