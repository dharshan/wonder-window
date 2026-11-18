package org.wonderwindow.tv;

import static org.junit.Assert.*;

import org.junit.Test;

public class MotionTest {
    @Test public void zeroScaleMeansReduced() {
        assertTrue(Motion.reduced(0f));
        assertTrue(Motion.reduced(-1f));
        assertFalse(Motion.reduced(1f));
        assertFalse(Motion.reduced(0.5f));
    }

    @Test public void reducedMotionIsStatic() {
        assertEquals(1f, Motion.focusScale(true, true), 0f);
        assertEquals(0L, Motion.duration(true, Tokens.FOCUS_MS));
    }

    @Test public void normalMotionUsesTokens() {
        assertEquals(Tokens.FOCUS_SCALE, Motion.focusScale(false, true), 0f);
        assertEquals(1f, Motion.focusScale(false, false), 0f);
        assertEquals(160L, Motion.duration(false, Tokens.FOCUS_MS));
        assertEquals(80L, Tokens.PRESS_MS);
    }

    @Test public void focusRingIsDarkOuterAndGoldInner() {
        assertEquals(0xFF1F2547, Tokens.INK);
        assertEquals(0xFFFFC94A, Tokens.SUN);
        assertEquals(4, Tokens.FOCUS_OUTER_PX);
        assertEquals(8, Tokens.FOCUS_INNER_PX);
    }
}
