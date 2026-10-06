import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const appJson = JSON.parse(readFileSync('app/app.json', 'utf8')) as {
  expo: { icon: string; android: { package: string; blockedPermissions?: string[] } };
};
const appPackage = JSON.parse(readFileSync('app/package.json', 'utf8')) as {
  dependencies: Record<string, string>;
};

test('release-relevant android config is pinned', () => {
  assert.equal(appJson.expo.android.package, 'com.moneyfoss.app');
  const blocked = appJson.expo.android.blockedPermissions ?? [];
  for (const permission of [
    'android.permission.INTERNET',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.VIBRATE',
  ]) {
    assert.ok(blocked.includes(permission), `permission must stay blocked: ${permission}`);
  }
  assert.equal(appJson.expo.icon, './assets/icon.png');
  for (const asset of ['app/assets/icon.png', 'app/assets/adaptive-foreground.png', 'app/assets/adaptive-monochrome.png']) {
    assert.ok(existsSync(asset), `missing asset ${asset}`);
  }
  assert.ok(existsSync('app/plugins/withAllowBackupFalse.cjs'), 'missing allowBackup plugin');
});

test('release-hardening dependencies stay declared', () => {
  for (const dep of ['expo-sqlite', 'expo-system-ui', 'expo-build-properties']) {
    assert.ok(typeof appPackage.dependencies[dep] === 'string', `missing dependency ${dep}`);
  }
  assert.ok(!('expo-file-system' in appPackage.dependencies), 'expo-file-system must stay a transitive-only dependency');
});
