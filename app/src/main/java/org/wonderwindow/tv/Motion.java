package org.wonderwindow.tv;

import android.content.Context;
import android.provider.Settings;

/** Reduced motion: when the system animator duration scale is 0, everything is static (same meaning, same focus). */
final class Motion {
    private Motion() { }

    /** Pure rule, unit-tested: animation is off when the scale is zero (or negative/unknown). */
    static boolean reduced(float animatorScale) { return !(animatorScale > 0f); }

    static boolean reduced(Context c) {
        float s = Settings.Global.getFloat(c.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
        return reduced(s);
    }

    /** Scale a focused element should rest at. */
    static float focusScale(boolean reduced, boolean focused) { return reduced || !focused ? 1f : Tokens.FOCUS_SCALE; }

    /** Duration to use for a motion token; 0 in reduced mode so the end state applies immediately. */
    static long duration(boolean reduced, long tokenMs) { return reduced ? 0 : tokenMs; }
}
