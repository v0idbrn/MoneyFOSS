# T-002 Evidence — Expo/React Native Android spike (INTERNET permission origin & removal)

**Spike dir:** `C:\Users\WinterOS\AppData\Local\Temp\opencode\spike-t002` (throwaway)
**Evidence dir:** `C:\Users\WinterOS\AppData\Local\Temp\opencode\t002`
**Date:** 2026-10-04 (all timestamps local, Windows)
**Environment:** Windows PowerShell 5.1, Node v24.15.0, npm 12.0.2, network available, no pre-existing Java/Android SDK.
**Constraints honored:** no writes/edits/git in `F:\Gigs\MoneyFOSS`; no new npm dependencies; only files touched in the spike: `android/app/src/main/AndroidManifest.xml` (INTERNET line variants) and `android/local.properties`.

Supporting raw files in this directory: `scan-internet-RESULTS.txt`, `inventory-RESULTS.txt`, `dex-packages.txt` (21.8 MB, full `apkanalyzer dex packages` dump), `gradle-build.log` (failed run), `gradle-build2.log` (first successful run), `gradle-build3-control.log` (control run), `build-environment.txt` (`gradlew buildEnvironment`), `blame-FINAL-no-INTERNET.txt` (final merger blame), `app-manifest-ORIGINAL-prebuild.xml`, `app-manifest-FINAL.xml`, `adb-devices.txt`, three APKs (see §6).

---

## 1) Versions

| Component | Version | Source |
|---|---|---|
| expo | ~57.0.26 (resolved 57.0.26) | spike `package.json`, autolinking output |
| expo-status-bar | ~57.0.1 | `package.json` |
| react | 19.2.3 | `package.json` |
| react-native | 0.86.3 | `package.json` |
| Node / npm | v24.15.0 / 12.0.2 | `node --version`, `npm --version` |
| JDK | Temurin OpenJDK 17.0.20.1 (Adoptium API `latest/17`, ZIP) | `java -version` |
| Android cmdline-tools | `commandlinetools-win-11076708` → `sdkmanager --version` = 12.0 | download URL + `sdkmanager --version` |
| SDK packages installed | platform-tools 37.0.1, platforms;android-36 (v2), build-tools;36.0.0 (35.0.0 also present), NDK 27.1.12297006, cmake 3.22.1 | `sdkmanager --list_installed` (NDK/cmake auto-installed by AGP during build) |
| Gradle (wrapper) | 9.3.1 | `android/gradle/wrapper/gradle-wrapper.properties`, build log |
| Android Gradle Plugin | 8.12.0 | `gradlew buildEnvironment` (`com.android.tools.build:gradle:8.12.0`) |
| Kotlin Gradle plugin | 2.1.20 | `gradlew buildEnvironment` |
| applicationId / package | `com.anonymous.spiket002` | prebuild output, `android/app/build.gradle` |
| versionCode / versionName | 1 / 1.0.0 | `build.gradle`, final APK |
| minSdk / targetSdk / compileSdk | 24 / 36 / 36 | final APK (`apkanalyzer manifest print`) |

## 2) Prebuild result

Command (workdir spike-t002):

```
npx expo prebuild --platform android --no-install
```

Output (relevant lines):

```
› Android package name: com.anonymous.spiket002
- Creating native directory (./android)
√ Created native directory
» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
√ Finished prebuild
```

Result: **SUCCESS**, `android/` project generated non-interactively, no prompts. Warning about `expo-system-ui` is non-fatal (no dependency added).

## 3) App manifest content (source, immediately after prebuild)

Full original file: `app-manifest-ORIGINAL-prebuild.xml`. Key facts:

- **`<uses-permission android:name="android.permission.INTERNET"/>` IS declared by the app's own source manifest (line 2)** — it comes from the Expo prebuild template, not from a library.
- Other declared permissions: `READ_EXTERNAL_STORAGE` (maxSdkVersion 32, `tools:replace`), `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `WRITE_EXTERNAL_STORAGE` (maxSdkVersion 32, `tools:replace`).
- `android:allowBackup="true"` (explicit, default is also true).
- No `android:usesCleartextTraffic`, no `android:networkSecurityConfig` in main manifest.
- `android:exported="true"` on `.MainActivity` (required, it has the LAUNCHER intent-filter). No other components in main manifest.
- Deep links: **none** — the only intent-filter is `MAIN`/`LAUNCHER`. The `<queries>` block (VIEW + BROWSABLE + `https`) is a *package-visibility query*, not a deep link and not a permission.
- `xmlns:tools` namespace is already declared by the template (line 1).
- Build variants: `src/debug/AndroidManifest.xml` and `src/debugOptimized/AndroidManifest.xml` each add `SYSTEM_ALERT_WINDOW` and `android:usesCleartextTraffic="true"` (`tools:replace`) — **debug-only**, not part of release merge.

## 4) INTERNET declaration map (which artifact declares `android.permission.INTERNET`)

Scan method A — all `AndroidManifest.xml` under `node_modules` (13 files) and all `.aar` under `node_modules` (6 files, opened via `[System.IO.Compression.ZipFile]::OpenRead`, entry `AndroidManifest.xml` read as text). Script: `scan-internet.ps1`, output: `scan-internet-RESULTS.txt` (stats: manifests=13, aars=6, aarFail=0, aarNoManifest=0, hits=2).

| Artifact (path relative to `node_modules/`) | Declares INTERNET? |
|---|---|
| `expo\node_modules\expo-file-system\android\src\main\AndroidManifest.xml` | **YES** — `<uses-permission android:name="android.permission.INTERNET"/>` |
| `expo\node_modules\expo-file-system\local-maven-repo\host\exp\exponent\expo.modules.filesystem\57.0.7\expo.modules.filesystem-57.0.7.aar` (pkg `expo.modules.filesystem`) | **YES** (AAR-embedded manifest, line 8) |
| `expo\android\src\main\AndroidManifest.xml` (the `expo` package) | no `uses-permission` at all |
| `expo-modules-core\android\src\main\AndroidManifest.xml` | no |
| `react-native\ReactAndroid\src\main\AndroidManifest.xml` | no permissions at all |
| `react-native\ReactAndroid\src\debug\AndroidManifest.xml` | only `SYSTEM_ALERT_WINDOW` |
| `expo-status-bar`, `expo-asset`, `expo-constants`, `expo-font`, `expo-keep-awake`, `@expo/dom-webview`, `@expo/log-box` manifests | no |
| other 5 AARs (webview, asset, font, keep-awake, status-bar) | no |
| **App source manifest** `android/app/src/main/AndroidManifest.xml` | **YES** (prebuild template, line 2) |

Scan method B — prebuilt React Native/Meta AARs found in the Gradle cache actually used by the build (6 files under `~/.gradle/caches/modules-2/files-2.1`, filtered to `com.facebook.react`/`hermes`): `react-android-0.86.3-release.aar`, `react-android-0.83.10-{release,debug}.aar`, `hermes-android-250829098.0.17-release.aar`, `hermes-android-0.14.1-{release,debug}.aar` → **all `INTERNET=no`**.

Scan method C — build-time attribution (manifest merger blame, definitive for *what actually merged*). With the app's own INTERNET line **deleted**, the surviving merged element is attributed to:

```
34    <uses-permission android:name="android.permission.INTERNET" />
34-->[host.exp.exponent:expo.modules.filesystem:57.0.7] C:\Users\WinterOS\.gradle\caches\9.3.1\transforms\b00741ba960b4ccfef7a6fddb4195d79\workspace\transformed\expo.modules.filesystem-57.0.7\AndroidManifest.xml:8:5-67
```

(That transformed AAR manifest's line 8 is `<uses-permission android:name="android.permission.INTERNET" />`; content verified by reading the file. This blame file was later overwritten by subsequent builds; the quoted output is from the isolation build run — the isolation APK is preserved as `T002-app-release-LIB-SOURCE-internet.apk`.)

**Answer to the core question:** two artifacts in this project declare INTERNET:
1. **The app's own source manifest** (Expo prebuild template) — `android/app/src/main/AndroidManifest.xml:2`.
2. **`expo-file-system`**, published as `host.exp.exponent:expo.modules.filesystem:57.0.7` (source manifest + prebuilt AAR in `local-maven-repo`, consumed from Gradle transform cache) — confirmed by merger blame attribution.

`react-native` (ReactAndroid source manifest and `react-android-0.86.3-release.aar`) and `hermes-android` **do not** declare it (for the artifacts scanned). The bare `expo`, `expo-modules-core`, `expo-status-bar` packages do not declare it.

Scope limit: the raw scan covered all of `node_modules` plus the `com.facebook.react`/`hermes` AARs; it did not open every AndroidX/Maven AAR in the Gradle cache. The merger blame (method C) is the authoritative evidence for which artifact fed the merged manifest in this project.

## 5) `tools:node="remove"` approach

Edit applied to `android/app/src/main/AndroidManifest.xml` (source-level proof):

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.INTERNET" tools:node="remove"/>
  ...
```

Reasoning recorded: the plain declaration on line 2 was **replaced**, not duplicated — the template already declares `xmlns:tools`; a plain `<uses-permission>` plus a `tools:node="remove"` entry for the *same* element key in the same file risks a duplicate-element merge conflict, whereas a single node marked `tools:node="remove"` at the highest priority (app) level instructs the manifest merger to drop that permission key from the merged manifest, covering both the app's own template declaration and the lower-priority `expo-file-system` contribution.

**Verification on a real APK: YES** — see §6/§7 A-B-C matrix: with the marker, `apkanalyzer manifest permissions` on the built release APK shows no INTERNET; the final merger blame (`blame-FINAL-no-INTERNET.txt`) contains no INTERNET line; without it, INTERNET is present.

## 6) Build result

| Run | Manifest state | Result | Duration | Log |
|---|---|---|---|---|
| 1 | remove-marker applied | **BUILD FAILED** | 27m 45s | `gradle-build.log` |
| 2 | remove-marker | **BUILD SUCCESSFUL** (268 tasks, 192 executed, 76 up-to-date) | 18m 29s | `gradle-build2.log` |
| 3 (control) | plain declaration | **BUILD SUCCESSFUL** | 1m 35s | `gradle-build3-control.log` |
| 4 (isolation) | app declaration deleted | **BUILD SUCCESSFUL** (twice) | 1m 46s / 8s | (console) |
| 5 (final) | remove-marker restored | **BUILD SUCCESSFUL** | 30s | (console) |

Run 1 failure — exact error:

```
* What went wrong:
Execution failed for task ':app:configureCMakeRelWithDebInfo[armeabi-v7a]'.
> [CXX1429] error when building with cmake using ...ReactAndroid\cmake-utils\default-app-setup\CMakeLists.txt:
   C++ build system [prefab] failed while executing: ... prefab_command.bat ... exited 1
  Exception in thread "main" java.lang.InternalError: Error loading java.security file
```

Root cause (diagnosed, not guessed): the JDK ZIP was extracted with `Expand-Archive`, which produced an **incomplete JDK** (`bin/`, `lib/` only; `conf/` missing — `Test-Path ...\conf\security\java.security` = False while the ZIP contains 20 `conf/` entries). Gradle's own JVM tasks tolerated it until `prefab_command.bat` spawned a fresh `java` process. Fix (environment only, no app code): killed the two leftover Gradle daemon `java.exe` processes (they locked `jvm.dll`), re-extracted with `[System.IO.Compression.ZipFile]::ExtractToDirectory`, verified `conf` present → rebuild succeeded. Notably AGP **auto-installed NDK 27.1.12297006 + cmake 3.22.1** after accepting the pre-written license hashes (`licenses/android-sdk-license` with the standard hashes 24333f8a…, d56f5187…, 84831b94…).

Build commands used (identical env each time):

```powershell
$env:JAVA_HOME='C:\Users\WinterOS\AppData\Local\Temp\opencode\android-toolchain\jdk\jdk-17.0.20.1+1'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; $env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
# android/local.properties: sdk.dir=C\:\\Users\\WinterOS\\AppData\\Local\\Android\\Sdk
.\gradlew.bat assembleRelease --console=plain
```

**APK artifacts preserved here:**

| File | Manifest state | Bytes | SHA256 |
|---|---|---|---|
| `T002-app-release-NO-internet.apk` (= final APK) | `tools:node="remove"` | 68,626,516 | `84B6A3E138D1C089F9F8FAD896F53CF749B583FD59E14EBF5BC6DCABD89EBF59` |
| `T002-app-release-CONTROL-internet.apk` | plain declaration | 68,626,548 | (not hashed, +32 bytes) |
| `T002-app-release-LIB-SOURCE-internet.apk` | app declaration deleted | 68,626,548 | (not hashed) |

Reproducibility note: run 2 and run 5 (same inputs, same machine, separate executions) produced **byte-identical** APKs (same SHA256). Build ran only once as a "second full build" for reproducibility; cross-machine/bit-for-bit reproducibility was NOT tested. Adding the INTERNET permission costs exactly +32 bytes in the APK.

Total wall time for steps 5–7 exceeded the ~50 min budget (~75 min) because run 1 failed and had to be diagnosed; no step was abandoned.

## 7) Final APK manifest findings (read from the built APK via `apkanalyzer`, not from source)

APK: `spike-t002\android\app\build\outputs\apk\release\app-release.apk` (= `T002-app-release-NO-internet.apk`).

`apkanalyzer manifest permissions <apk>`:

```
android.permission.READ_EXTERNAL_STORAGE' maxSdkVersion='32
android.permission.WRITE_EXTERNAL_STORAGE' maxSdkVersion='32
android.permission.VIBRATE
android.permission.SYSTEM_ALERT_WINDOW
com.anonymous.spiket002.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION
```

- **INTERNET: ABSENT** after `tools:node="remove"` (5 permissions total; the 5th is the androidx-injected signature permission).
- Package: `com.anonymous.spiket002`; versionCode 1; versionName 1.0.0; platformBuildVersion 36/16.
- `android:allowBackup="true"`; no `tools:node` override of backup rules, no fullBackupContent/dataExtractionRules element in APK manifest.
- Cleartext: **no** `android:usesCleartextTraffic`, **no** `android:networkSecurityConfig` in the release APK (debug/debugOptimized `usesCleartextTraffic="true"` did not merge into release).
- Exported components: `.MainActivity` `exported=true` (LAUNCHER, MAIN/LAUNCHER filter only); `androidx.profileinstaller.ProfileInstallReceiver` `exported=true` (androidx, DUMP-protected); `expo.modules.filesystem.FileSystemFileProvider` `exported=false` (grantUriPermissions); `androidx.startup.InitializationProvider` `exported=false`.
- Deep links: **none** (no VIEW/BROWSABLE `data` intent-filter under `<application>`). `<queries>` contains VIEW/`https` and OPEN_DOCUMENT_TREE — visibility queries only.
- `expo.modules.updates.ENABLED=false` meta-data present (Expo Updates disabled in this spike).

## 8) Native libs inside the APK

4 ABIs: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`. Per ABI (arm64-v8a sizes shown): `libappmodules.so` (50 KB), `libc++_shared.so` (1.29 MB), `libexpo-modules-core.so` (1.46 MB), `libfbjni.so`, `libgifimage.so`, `libhermestooling.so`, `libhermesvm.so` (2.48 MB — **Hermes is the JS engine**), `libimagepipeline.so`, `libjsi.so`, `libnative-filters.so`, `libnative-imagetranscoder.so`, `libreactnative.so` (6.99 MB), `libstatic-webp.so`, `libzstd-kmp.so`. `android:extractNativeLibs="false"`. No `libc++_static`, no `libv8`/JSC.

Dex: `classes.dex` 9.60 MB + `classes2.dex` 10.45 MB. JS bundle: `assets/index.android.bundle` 1.15 MB.

## 9) Network-capable classes in the final APK dex

Source: `dex-packages.txt` (`apkanalyzer dex packages`, 197,133 lines).

- **okhttp3: present** — 4,820 lines mention `okhttp3`; class definitions include `okhttp3.OkHttpClient`, `okhttp3.Request`, `okhttp3.WebSocket`, plus `okhttp3.internal.http2.*` (39 top-level `okhttp3.*` class defs matched).
- **expo fetch: present and OkHttp-backed** — `expo.modules.fetch` package (320 classes/methods) incl. `expo.modules.fetch.NativeResponse createResponseInit(okhttp3.Response)`, `expo.modules.fetch.ExpoFetchModule` registered by the `expo` package autolinking config.
- **React Native dev-support networking: present in release** — `com.facebook.react.devsupport.DevServerHelper`, `BundleDownloader` (`downloadBundleFromURL`), `DevSupportHttpClient`, `InspectorNetworkHelper`, `CxxInspectorPackagerConnection` (okhttp WebSocket) — minification/R8 is off by default (`enableMinifyInReleaseBuilds=false`), so dev-support networking ships in the release APK.
- **java.net usage:** 68 lines reference `java.net.HttpURLConnection` / `java.net.Socket`.
- Absent: `retrofit` = 0, `Firebase` = 0, `Volley` = 0, `cronet`/`Cronet` = 0, `grpc` = 0, `ktor` = 0 (1 case-insensitive match was a false positive inside okhttp's `awaitTaskToRun` method name).

## 10) Runtime offline test

**Not performed — no device.** `adb devices` (platform-tools 37.0.1) output: `List of devices attached` with zero entries (`adb-devices.txt`). No emulator/AVD exists in this environment (no Android SDK was present before this spike; creating an emulator system image + AVD was out of the timebox). Nothing was installed.

## 11) F-Droid / dependency observations

- Direct deps + licenses (`node_modules\<pkg>\package.json` `license` field): `expo` 57.0.26 **MIT**, `react` 19.2.3 **MIT**, `react-native` 0.86.3 **MIT**, `expo-status-bar` 57.0.1 **MIT**. (Only package.json fields were checked; full LICENSE-file/third-party-attribution review NOT performed.)
- Autolinked native Android modules (`npx expo-modules-autolinking search --platform android`): `expo` (registers `expo.modules.fetch.ExpoFetchModule`), `expo-status-bar`, `@expo/dom-webview`, `@expo/log-box` (no android modules), `expo-asset`, `expo-constants`, `expo-file-system`, `expo-font`, `expo-keep-awake`, `expo-modules-core` (also ships gradle plugins).
- Consumed as **prebuilt AAR from each package's `local-maven-repo`** (`repository: local-maven-repo`): expo-status-bar, @expo/dom-webview, expo-asset, expo-file-system, expo-font, expo-keep-awake. Consumed as **source Gradle projects**: expo, expo-constants, expo-modules-core, log-box.
- Gradle plugins applied: `com.android.application` (AGP 8.12.0), `org.jetbrains.kotlin.android` (KGP 2.1.20), `com.facebook.react` + `com.facebook.react.rootproject` + `com.facebook.react.settings` (RN 0.86.3 gradle plugin, included build from `node_modules/@react-native/gradle-plugin`), `expo-root-project`, `expo-autolinking-settings`, `expo-module-gradle-plugin` (from `node_modules/expo-modules-autolinking/android/expo-gradle-plugin`, included build).
- Repositories (`android/build.gradle`): `google()`, `mavenCentral()`, `https://www.jitpack.io` → **network is required at build time** (Maven/Gradle downloads) — no network permission or activity is evidenced at runtime by this spike. First build downloaded Gradle 9.3.1 + all Maven artifacts; NDK/cmake auto-installed.
- No telemetry/analytics/Firebase dependencies found in this dependency set.

## 12) CONCLUSIONS (claim → verdict → artifact)

| # | Claim | Verdict | Evidence artifact |
|---|---|---|---|
| 1 | A release APK of this project can exist **without** `android.permission.INTERNET` | **PROVEN** | `T002-app-release-NO-internet.apk` + final `app-release.apk` (`apkanalyzer manifest permissions` lists 5 permissions, no INTERNET); reproduced in 3 separate builds |
| 2 | `tools:node="remove"` on the app-level `<uses-permission>` removes INTERNET from the merged/final manifest | **PROVEN** | A/B/C matrix: plain decl → INTERNET present (`T002-app-release-CONTROL-internet.apk`); decl deleted → INTERNET present (`T002-app-release-LIB-SOURCE-internet.apk`); remove-marker → INTERNET absent (`T002-app-release-NO-internet.apk`); final blame file has no INTERNET |
| 3 | A dependency (not just the app template) declares INTERNET | **PROVEN** | Isolation build (app decl deleted) still has INTERNET; merger blame attributes it to `[host.exp.exponent:expo.modules.filesystem:57.0.7] ...AndroidManifest.xml:8` |
| 4 | That dependency is **expo-file-system** 57.0.7 (source manifest + `local-maven-repo` AAR) | **PROVEN** | `scan-internet-RESULTS.txt` (2 hits, both expo-file-system) + transformed AAR manifest content + blame attribution line above |
| 5 | `react-native` (ReactAndroid source manifest / `react-android-0.86.3-release.aar`) declares INTERNET | **NOT PROVEN (contradicted for the scanned artifacts)** | ReactAndroid manifests have no INTERNET; `react-android-0.86.3-release.aar` and `hermes-android-*.aar` scanned → `INTERNET=no`. Scope: the 6 Meta AARs found in the Gradle cache, not an exhaustive Maven audit |
| 6 | The app's **own** prebuild template manifest declares INTERNET | **PROVEN** | `app-manifest-ORIGINAL-prebuild.xml` line 2 |
| 7 | **No runtime network requirement** (app runs fully offline) | **NOT PROVEN** | No device/emulator (`adb-devices.txt` empty); only static evidence exists (no INTERNET permission in APK ⇒ OS would deny cleartext/internet sockets, but launch behavior was never executed) |
| 8 | The final artifact contains **network-capable code** (OkHttp/fetch/WebSocket) | **PROVEN** | `dex-packages.txt`: okhttp3 classes, `expo.modules.fetch` (OkHttp-backed), RN dev-support WebSocket/HTTP classes |
| 9 | Release APK manifest: `allowBackup=true`, no cleartext/network-security config, no deep links, MainActivity exported | **PROVEN** | `apkanalyzer manifest print` on final APK (§7) |
| 10 | Build is reproducible bit-for-bit on this machine for identical inputs | **PROVEN (same-machine only)** | SHA256 `84B6A3E1…` identical across run 2 and run 5; cross-machine reproducibility NOT tested |
| 11 | Runtime offline launch test | **NOT PERFORMED** | no device/emulator in environment |
| 12 | Exhaustive map of every Maven artifact that *could* declare INTERNET | **NOT PROVEN** | scan scope = all `node_modules` manifests/AARs + the 6 `com.facebook.react`/`hermes` AARs in the Gradle cache; merger blame covers this project's actual merge only |
| 13 | First-attempt toolchain + build success | **FAILED then fixed** | `gradle-build.log` (prefab/java.security failure from incomplete `Expand-Archive` extraction) → re-extract fix → `gradle-build2.log` BUILD SUCCESSFUL |

**Bottom line:** INTERNET enters this project from **two** places — the Expo prebuild template's app manifest and the **expo-file-system** AAR (`host.exp.exponent:expo.modules.filesystem:57.0.7`); neither `react-android` nor `hermes-android` declares it. `<uses-permission android:name="android.permission.INTERNET" tools:node="remove"/>` in `android/app/src/main/AndroidManifest.xml` demonstrably removes it from the assembled release APK, which still ships OkHttp/`expo.modules.fetch`/RN dev-support networking code in its dex. Runtime offline behavior remains untested (no device).
