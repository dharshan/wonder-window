#!/bin/bash
# LOCAL macOS HELPER - not used by CI, not needed to build. Linux/CI: ./gradlew assemblePublicDebug (see README).
# Build Wonder Window (no install; see install-when-ready.sh).
set -e
R="$(cd "$(dirname "$0")/.." && pwd)"; M="${WW_TOOLCHAIN:-$HOME/Downloads/mitv}"   # folder holding jdk17/, android-sdk/, platform-tools/, python/
export JAVA_HOME="${JAVA_HOME:-$M/jdk17/Contents/Home}" ANDROID_HOME="${ANDROID_HOME:-$M/android-sdk}"
TV_HOST="${TV_HOST:-${WW_TV_HOST:-$(cat "$HOME/Downloads/optv/tv-ip.txt" 2>/dev/null)}}"; ADB="${ADB:-$M/platform-tools/adb}"; S=$TV_HOST:5555
cd "$R"
echo "sdk.dir=$ANDROID_HOME" > local.properties
cp catalog/catalog.json app/src/main/assets/catalog.json
"${WW_PYTHON:-$M/python/bin/python3}" tools/make_voice.py
./gradlew lintFamilyRelease assembleFamilyRelease -q --console=plain
APK=app/build/outputs/apk/family/release/app-family-release.apk; ls -la "$APK"; shasum -a 256 "$APK"
