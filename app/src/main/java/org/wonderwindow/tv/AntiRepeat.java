package org.wonderwindow.tv;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * WATCH anti-repeat history (docs/DECISIONS.md D8): only video IDs and the time playback actually started.
 * Used to move videos started in the last 7 days to the back of their row; entries older than 14 days are dropped.
 * Pure Java (no Android types) so it is unit-tested on the JVM. Stored as "id:startMillis,id:startMillis".
 */
final class AntiRepeat {
    static final long REPEAT_MS = 7L * 24 * 3600_000, KEEP_MS = 14L * 24 * 3600_000;

    private final Map<String, Long> starts = new LinkedHashMap<>();
    private String markedForCurrent;          // guards duplicate PLAYING callbacks for the same queue item

    static AntiRepeat parse(String stored, long now) {
        AntiRepeat a = new AntiRepeat();
        if (stored != null) for (String part : stored.split(",")) {
            int c = part.lastIndexOf(':');
            if (c <= 0) continue;
            try { a.starts.put(part.substring(0, c), Long.parseLong(part.substring(c + 1))); } catch (NumberFormatException ignored) { }
        }
        a.purge(now);
        return a;
    }

    /** Drops entries older than 14 days. Returns true if anything was removed (caller persists). */
    boolean purge(long now) {
        return starts.values().removeIf(t -> now - t > KEEP_MS || t > now + 60_000);
    }

    /** Call when a new queue item is loaded: nothing is recorded until it really plays. */
    void newItem() { markedForCurrent = null; }

    /**
     * Records the start once, only for the IFrame PLAYING state (1). Errors, buffering and unstarted states never record.
     * Returns true if the history changed (caller persists).
     */
    boolean onPlayerState(int state, String videoId, long now) {
        if (state != 1 || videoId == null || videoId.isEmpty() || videoId.equals(markedForCurrent)) return false;
        markedForCurrent = videoId;
        starts.remove(videoId);
        starts.put(videoId, now);
        return true;
    }

    boolean recentlyStarted(String id, long now) {
        Long t = starts.get(id);
        return t != null && now - t < REPEAT_MS;
    }

    int size() { return starts.size(); }

    String serialize() {
        StringBuilder b = new StringBuilder();
        for (Map.Entry<String, Long> e : starts.entrySet()) {
            if (b.length() > 0) b.append(',');
            b.append(e.getKey()).append(':').append(e.getValue());
        }
        return b.toString();
    }
}
