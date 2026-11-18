#!/bin/bash
# LOCAL macOS HELPER - not used by CI, not needed to build. Linux/CI: ./gradlew assemblePublicDebug (see README).
# Runs in the background (nohup) so the runner queue is never blocked: waits until the TV is on and idle
# (home screen or our app), then installs the latest built APK (data kept) and optionally runs a tour script.
M="${WW_TOOLCHAIN:-$HOME/Downloads/mitv}"   # folder holding jdk17/, android-sdk/, platform-tools/, python/; TV=${WW_TV_HOST:-$(cat "$HOME/Downloads/optv/tv-ip.txt" 2>/dev/null)}:5555; ADB="$M/platform-tools/adb"; A="$ADB -s $TV"
APK="$(cd "$(dirname "$0")/.." && pwd)/app/build/outputs/apk/family/release/app-family-release.apk"; TOUR="$1"
LOCK=/tmp/ww-install.lock; [ -e $LOCK ] && kill -0 $(cat $LOCK) 2>/dev/null && { echo "already waiting"; exit 0; }; echo $$ > $LOCK
for i in $(seq 1 2880); do
  $ADB connect $TV >/dev/null 2>&1
  FG=$($A shell dumpsys activity activities 2>/dev/null | grep -m1 "ResumedActivity")
  case "$FG" in *tvhome*|*wonderwindow*)
    echo "ready $(date)"; $A install -r "$APK" && echo "installed $(shasum -a 256 "$APK" | cut -c1-12)"
    [ -n "$TOUR" ] && bash "$TOUR"
    rm -f $LOCK; exit 0;;
  esac; sleep 30
done
rm -f $LOCK; echo "TV never ready (24 h)"
