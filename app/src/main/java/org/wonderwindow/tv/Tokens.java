package org.wonderwindow.tv;

/**
 * Semantic design tokens (docs/DESIGN_SYSTEM.md, docs/design/2026-ui-ux-blueprint.md §6–7).
 * Sizes are 1920×1080 design pixels; MainActivity.px() scales them to the screen.
 */
final class Tokens {
    private Tokens() { }

    // Colour (ARGB)
    static final int INK = 0xFF1F2547, INK_SOFT = 0xFF3D466A, PAPER = 0xFFFFFFFF;
    static final int SKY = 0xFF7CC6F2, HORIZON = 0xFFFFF3D6, NIGHT_TOP = 0xFF0F1638, NIGHT_BOTTOM = 0xFF28306A;
    static final int PLAY = 0xFFC24708, TRY = 0xFF286B43, WATCH = 0xFF5140B8;
    static final int SUN = 0xFFFFC94A, AMBER = 0xFF9A5B00;

    // Focus ring: 4 px INK outer edge + 8 px SUN inner band (luminance contrast without relying on colour)
    static final int FOCUS_OUTER_PX = 4, FOCUS_INNER_PX = 8;

    // Type scale (px at 1080p)
    static final int TYPE_GREETING = 56, TYPE_TITLE = 52, TYPE_LABEL = 48, TYPE_SUPPORT = 30, TYPE_META = 26;

    // Shape and spacing
    static final int RADIUS_CARD = 40, RADIUS_BUTTON = 32, GAP = 28, SAFE_X = 96, SAFE_Y = 54;

    // Motion (ms) — focus 160, press 80, scene 220 (+8 px rise), Pip reaction 260
    static final long FOCUS_MS = 160, FOCUS_EXIT_MS = 100, PRESS_MS = 80, SCENE_MS = 220, REACT_MS = 260;
    static final float FOCUS_SCALE = 1.05f, PRESS_SCALE = 0.97f;
    static final int SCENE_RISE_PX = 8;
}
