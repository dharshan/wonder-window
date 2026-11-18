package org.wonderwindow.tv;

import static org.junit.Assert.*;

import org.junit.Test;

public class AntiRepeatTest {
    private static final long DAY = 24L * 3600_000, NOW = 1_000L * DAY;

    @Test public void recordsOnlyOnPlaying() {
        AntiRepeat a = AntiRepeat.parse("", NOW);
        a.newItem();
        assertFalse(a.onPlayerState(-1, "v1", NOW));   // unstarted
        assertFalse(a.onPlayerState(3, "v1", NOW));    // buffering
        assertFalse(a.recentlyStarted("v1", NOW));
        assertTrue(a.onPlayerState(1, "v1", NOW));     // playing
        assertTrue(a.recentlyStarted("v1", NOW));
    }

    @Test public void errorBeforePlayingRecordsNothing() {
        AntiRepeat a = AntiRepeat.parse("", NOW);
        a.newItem();
        // the player reports an error and the app moves on: no PLAYING state ever arrives
        a.newItem();
        assertEquals(0, a.size());
    }

    @Test public void duplicatePlayingCallbacksRecordOnce() {
        AntiRepeat a = AntiRepeat.parse("", NOW);
        a.newItem();
        assertTrue(a.onPlayerState(1, "v1", NOW));
        assertFalse(a.onPlayerState(1, "v1", NOW + 5_000));   // resume after pause / repeated callback
        assertTrue(a.serialize().endsWith(":" + NOW));
    }

    @Test public void sevenDayWindow() {
        AntiRepeat a = AntiRepeat.parse("v1:" + (NOW - 6 * DAY) + ",v2:" + (NOW - 8 * DAY), NOW);
        assertTrue(a.recentlyStarted("v1", NOW));
        assertFalse(a.recentlyStarted("v2", NOW));
    }

    @Test public void purgeAfterFourteenDaysIsReported() {
        AntiRepeat a = AntiRepeat.parse("v1:" + (NOW - 15 * DAY) + ",v2:" + (NOW - DAY), NOW);
        assertEquals(1, a.size());
        assertEquals("v2:" + (NOW - DAY), a.serialize());
        AntiRepeat b = AntiRepeat.parse("v2:" + (NOW - DAY), NOW);
        assertFalse(b.purge(NOW + 14 * DAY - DAY - 1));
        assertTrue(b.purge(NOW + 14 * DAY));
    }

    @Test public void storesOnlyIdsAndTimes() {
        AntiRepeat a = AntiRepeat.parse("garbage,,x:notanumber", NOW);
        assertEquals(0, a.size());
        a.newItem();
        a.onPlayerState(1, "abc", NOW);
        assertEquals("abc:" + NOW, a.serialize());
    }
}
