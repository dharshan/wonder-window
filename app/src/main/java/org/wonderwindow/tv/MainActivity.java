package org.wonderwindow.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.content.res.AssetFileDescriptor;
import android.media.MediaPlayer;
import android.view.animation.OvershootInterpolator;
import java.util.HashSet;
import java.util.Set;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.graphics.fonts.FontVariationAxis;
import android.animation.ValueAnimator;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.LinearInterpolator;
import android.os.Bundle;
import android.text.TextUtils;
import java.util.Arrays;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import android.util.LruCache;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.TimeZone;

/**
 * Wonder Window test build 0.1: warm-up -> time -> curated rows -> framed YouTube player -> resting.
 * Spec: docs/spec (design.md S1w/S2/S3/S5/S11, tech.md §2, educator.md §5A). Plain Java, API-29-safe.
 */
public class MainActivity extends Activity {
    static final String TAG = "WW";
    static final int COOLDOWN_MIN = 90, HEADS_UP_SEC = 120, FINISH_IF_LEFT_SEC = 90;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Random rng = new Random();
    private float s;                       // px per 1080p design pixel
    private FrameLayout root, outer;
    // design system "Sky Garden" (spec/kids_design_system.md)
    static final int INK = 0xFF1F2547, INK_SOFT = 0xFF4A5275, AMBER = 0xFF9A5B00, SUN = 0xFFFFC94A, GLOW = 0xFFFFE07A;
    private Typeface fredB, fredSB, andika;
    private boolean night;
    private ImageView hills;
    private final List<View> clouds = new ArrayList<>();
    private SharedPreferences prefs;
    private JSONArray rows;

    // session state
    private int allowedMin, sessionMin;
    private long sessionUsedMs, lastTick;
    private boolean playing, paused, headsUpShown, ending, sessionActive;
    private LinearLayout stopSheet;
    private long backDebounce;
    private int skipsLeft = 2;
    private List<JSONObject> queue = new ArrayList<>();
    private int qIndex;
    private double curT, curDur;
    private WebView web;
    private TextView sandText, nowText, headsUp;
    private LinearLayout pauseSheet;
    private long okDownAt;
    private boolean fullScreen = true;
    private View frameView;
    private final ExecutorService pool = Executors.newFixedThreadPool(3);
    private final LruCache<String, Bitmap> thumbs = new LruCache<>(60);
    private JSONObject voiceIndex = new JSONObject();
    private MediaPlayer voice;
    private JSONArray bank = new JSONArray();
    private JSONArray aboutBank = new JSONArray();
    private JSONArray games = new JSONArray();
    private JSONObject tryData = new JSONObject();
    private String screen = "";     // hub | play | game | trycats | trylist | trysteps
    private final Runnable dwell = () -> {};

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        loadSfx();
        s = getResources().getDisplayMetrics().widthPixels / 1920f;
        prefs = getSharedPreferences("ww", MODE_PRIVATE);
        dropLegacyRanking();
        antiRepeat();                 // D8: purge history older than 14 days at every start, even if WATCH is never opened
        reconcileMeter();
        loadFonts();
        outer = new FrameLayout(this);
        hills = new ImageView(this);
        hills.setImageResource(R.drawable.bg_hills);
        hills.setScaleType(ImageView.ScaleType.FIT_XY);
        outer.addView(hills, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        int[][] cl = {{900, 60, 320, 180}, {1300, 110, 380, 214}, {300, 200, 260, 146}};
        for (int[] c : cl) {
            ImageView cv = new ImageView(this);
            cv.setImageResource(R.drawable.cloud);
            cv.setAlpha(0.9f);
            outer.addView(cv, rect(c[0], c[1], c[2], c[3]));
            clouds.add(cv);
            ValueAnimator drift = ValueAnimator.ofFloat(0, 1);
            drift.setDuration(90_000 + rng.nextInt(30_000));
            drift.setRepeatCount(ValueAnimator.INFINITE);
            drift.setInterpolator(new LinearInterpolator());
            final float startX = px(c[0]);
            drift.addUpdateListener(a -> {
                float w = getResources().getDisplayMetrics().widthPixels + px(c[2]);
                float x = startX - (float) a.getAnimatedValue() * w * 1.5f;
                while (x < -px(c[2])) x += w;
                cv.setX(x);
            });
            drift.start();
        }
        root = new FrameLayout(this);
        outer.addView(root, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setNight(false);
        setContentView(outer);
        outer.getViewTreeObserver().addOnGlobalLayoutListener(() -> unclip(outer));
        try {
            rows = new JSONObject(readAsset("catalog.json")).getJSONArray("rows");
            try { voiceIndex = new JSONObject(readAsset("voice/index.json")); } catch (Exception e) { Log.w(TAG, "no voice index"); }
            try { bank = new JSONArray(readAsset("warmup_bank.json")); } catch (Exception e) { Log.w(TAG, "no warm-up bank, using built-in items"); }
            try { aboutBank = new JSONArray(readAsset("aboutme_bank.json")); } catch (Exception e) { Log.w(TAG, "no about-me bank"); }
            try { games = new JSONObject(readAsset("games.json")).getJSONArray("games"); } catch (Exception e) { Log.w(TAG, "no games"); }
            try {                                                    // catalogue games (WW-xxx), merged after the core set
                JSONArray cg = new JSONObject(readAsset("catalogue_games.json")).getJSONArray("games");
                JSONObject cat = new JSONObject(readAsset("catalogue_games.json"));
                JSONArray modes = cat.optJSONArray("merged_modes");      // e.g. Colour Nest as a Sorting mode: shown next to the core games
                for (int i = 0; modes != null && i < modes.length(); i++) {
                    JSONObject m = modes.optJSONObject(i);
                    if (!m.has("id")) m.put("id", m.has("mode_id") ? m.optString("mode_id") : m.optString("alias_of") + "-" + m.optString("name").toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z]+", "-"));
                    games.put(m);
                }
                for (int i = 0; i < cg.length(); i++) {
                    JSONObject g = cg.optJSONObject(i);
                    if (g.has("merged_into") || (g.has("needs_variant") && !BUILT_VARIANTS.contains(g.optString("needs_variant")))) continue;
                    games.put(g);
                }
            } catch (Exception e) { Log.w(TAG, "no catalogue games"); }
            try { tryData = new JSONObject(readAsset("try.json")); } catch (Exception e) { Log.w(TAG, "no try"); }
            try { try3 = new JSONObject(readAsset("try_activities.json")); } catch (Exception e) { Log.w(TAG, "no try v3 — TRY falls back safely"); }
        } catch (Exception e) {
            rows = new JSONArray();
            Log.e(TAG, "catalog", e);
        }
        start();
    }

    private void start() {
        rollDay();
        long cooldownLeft = prefs.getLong("cooldownUntil", 0) - System.currentTimeMillis();
        showHub();
    }

    // ------------------------------------------------------------------ design system helpers
    private void loadFonts() {
        try {
            fredB = new Typeface.Builder(getAssets(), "fonts/Fredoka.ttf").setFontVariationSettings("'wght' 700").build();
            fredSB = new Typeface.Builder(getAssets(), "fonts/Fredoka.ttf").setFontVariationSettings("'wght' 600").build();
            andika = Typeface.createFromAsset(getAssets(), "fonts/Andika-Bold.ttf");
        } catch (Exception e) {
            Log.w(TAG, "fonts " + e);
        }
        if (fredB == null) fredB = Typeface.create("sans-serif", Typeface.BOLD);
        if (fredSB == null) fredSB = Typeface.create("sans-serif-medium", Typeface.NORMAL);
        if (andika == null) andika = fredB;
    }

    /** Day = sky garden with hills and clouds; night = starry navy for the resting screen. */
    private void setNight(boolean n) {
        night = n;
        outer.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, n
                ? new int[]{0xFF0F1638, 0xFF28306A} : new int[]{0xFF7CC6F2, 0xFFBFE6FA, 0xFFFFF3D6}));
        hills.setColorFilter(n ? 0xAA0F1638 : 0x00000000, android.graphics.PorterDuff.Mode.SRC_ATOP);
        for (View c : clouds) c.setAlpha(n ? 0.15f : 0.9f);
    }

    /** The buddy (round house sparrow): blinks, breathes, hops, waves. Name comes from buddy_name. */
    private class Buddy extends FrameLayout {
        final ImageView img = new ImageView(MainActivity.this);
        int pose = R.drawable.buddy_idle;
        final ValueAnimator breathe = ValueAnimator.ofFloat(0, 1);
        final Runnable blink = new Runnable() {
            @Override public void run() {
                if (!isAttachedToWindow()) return;
                if (pose == R.drawable.buddy_idle) {
                    img.setImageResource(R.drawable.buddy_idle_blink);
                    ui.postDelayed(() -> { if (pose == R.drawable.buddy_idle) img.setImageResource(R.drawable.buddy_idle); }, 120);
                }
                ui.postDelayed(this, 2500 + rng.nextInt(3000));
            }
        };

        Buddy(int sizePx, int poseRes) {
            super(MainActivity.this);
            View shadow = new View(MainActivity.this);
            GradientDrawable sd = new GradientDrawable();
            sd.setShape(GradientDrawable.OVAL);
            sd.setColor(0x2E1F2547);
            shadow.setBackground(sd);
            FrameLayout.LayoutParams slp = new FrameLayout.LayoutParams((int) (sizePx * 0.44f), (int) (sizePx * 0.06f));
            slp.leftMargin = (int) (sizePx * 0.28f); slp.topMargin = (int) (sizePx * 0.90f);
            addView(shadow, slp);
            addView(img, new FrameLayout.LayoutParams(sizePx, sizePx));
            img.setPivotX(sizePx / 2f); img.setPivotY(sizePx * 0.92f);
            pose(poseRes);
            breathe.setDuration(poseRes == R.drawable.buddy_sleepy ? 4000 : 2400);
            breathe.setRepeatMode(ValueAnimator.REVERSE);
            breathe.setRepeatCount(ValueAnimator.INFINITE);
            breathe.setInterpolator(new AccelerateDecelerateInterpolator());
            breathe.addUpdateListener(a -> { float v = (float) a.getAnimatedValue(); img.setScaleY(1 + 0.025f * v); img.setScaleX(1 - 0.012f * v); });
        }

        void pose(int res) { pose = res; img.setImageResource(res); }

        @Override protected void onAttachedToWindow() { super.onAttachedToWindow(); breathe.start(); ui.postDelayed(blink, 2000); }

        @Override protected void onDetachedFromWindow() { breathe.cancel(); ui.removeCallbacks(blink); super.onDetachedFromWindow(); }

        void hop() {
            float h = img.getHeight() * 0.30f;
            img.animate().translationY(-h).setDuration(180).setInterpolator(new android.view.animation.DecelerateInterpolator())
                    .withEndAction(() -> img.animate().translationY(0).setDuration(140).setInterpolator(new android.view.animation.AccelerateInterpolator()).start()).start();
        }

        void happy() { pose(R.drawable.buddy_happy_wave); hop(); ui.postDelayed(() -> pose(R.drawable.buddy_idle), 1600); }
    }

    private Buddy buddy;

    private Buddy addBuddy(int x, int y, int size, int poseRes) {
        buddy = new Buddy(px(size), poseRes);
        root.addView(buddy, rect(x, y, size, size));
        return buddy;
    }

    /** White speech bubble with ink text. */
    private TextView bubble(String t, int sizePx) {
        TextView b = text(t, sizePx, INK, true, Gravity.START | Gravity.CENTER_VERTICAL);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.WHITE); bg.setCornerRadius(px(40));
        b.setBackground(bg);
        b.setPadding(px(44), px(26), px(44), px(26));
        b.setElevation(px(6));
        return b;
    }

    // ------------------------------------------------------------------ voice (pre-recorded on the Mac: tools/make_voice.py)
    private void say(String text) { say(text, null); }

    private void say(String text, Runnable then) {
        stopVoice();
        String file = text == null ? null : voiceIndex.optString(text.trim(), null);
        if (file == null) { if (then != null) ui.postDelayed(then, 900); return; }
        try (AssetFileDescriptor fd = getAssets().openFd("voice/" + file)) {
            voice = new MediaPlayer();
            voice.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            voice.setOnCompletionListener(mp -> { stopVoice(); if (then != null) ui.postDelayed(then, 300); });
            voice.prepare();
            voice.start();
        } catch (Exception e) {
            Log.w(TAG, "voice " + e);
            if (then != null) ui.postDelayed(then, 900);
        }
    }

    private android.media.SoundPool sfxPool;
    private final java.util.Map<String, Integer> sfxIds = new java.util.HashMap<>();

    private void loadSfx() {
        try {
            sfxPool = new android.media.SoundPool.Builder().setMaxStreams(4).setAudioAttributes(new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_GAME).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
            for (String n : getAssets().list("sfx")) {
                try (AssetFileDescriptor fd = getAssets().openFd("sfx/" + n)) { sfxIds.put(n.replace(".wav", ""), sfxPool.load(fd, 1)); }
            }
        } catch (Exception e) { Log.w(TAG, "sfx " + e); }
    }

    /** Short non-speech sounds (chime, pop, boing…). Parent can switch them off with the "sfx" pref. */
    private void sfx(String name) {
        Integer id = sfxIds.get(name);
        if (sfxPool != null && id != null && prefs.getBoolean("sfx", true)) sfxPool.play(id, 0.6f, 0.6f, 1, 0, 1f);
    }

    /** Let focused cards grow + glow without being clipped by their rows. */
    private void unclip(View v) {
        if (v instanceof ViewGroup) {
            ViewGroup g = (ViewGroup) v;
            g.setClipChildren(false); g.setClipToPadding(false);
            for (int i = 0; i < g.getChildCount(); i++) unclip(g.getChildAt(i));
        }
    }

    private void stopVoice() {
        if (voice != null) { try { voice.release(); } catch (Exception ignored) { } voice = null; }
    }

    /** Gentle celebration: the button bounces and a ring of stars floats out and fades (no flashing). */
    private void celebrate(View anchor) {
        anchor.animate().scaleX(1.25f).scaleY(1.25f).setDuration(180).withEndAction(() ->
                anchor.animate().scaleX(1.06f).scaleY(1.06f).setInterpolator(new OvershootInterpolator()).setDuration(260).start()).start();
        int[] loc = new int[2]; anchor.getLocationInWindow(loc);
        float cx = loc[0] + anchor.getWidth() / 2f, cy = loc[1] + anchor.getHeight() / 2f;
        String[] glyphs = {"⭐", "✨", "🌟"};
        for (int i = 0; i < 10; i++) {
            TextView st = text(glyphs[i % 3], 56, Color.WHITE, false);
            root.addView(st, new FrameLayout.LayoutParams(px(80), px(80)));
            st.setX(cx - px(40)); st.setY(cy - px(40));
            double a = Math.PI * 2 * i / 10;
            st.animate().translationXBy((float) (Math.cos(a) * px(260))).translationYBy((float) (Math.sin(a) * px(200)))
                    .alpha(0f).setDuration(900).withEndAction(() -> root.removeView(st)).start();
        }
    }

    // ------------------------------------------------------------------ anti-repeat rotation (docs/DECISIONS.md D8)
    // The only WATCH history kept: IDs and launch times of videos actually started, used to avoid repeating them
    // for 7 days and purged after 14. No progress, completion, feedback, channel scores or inferred interests.

    private AntiRepeat antiRepeat;

    /** Loads the anti-repeat history and persists the 14-day purge immediately. */
    private AntiRepeat antiRepeat() {
        if (antiRepeat == null) {
            long now = System.currentTimeMillis();
            String stored = prefs.getString("launched", "");
            String write = AntiRepeat.valueToPersist(stored, now);
            if (write != null) prefs.edit().putString("launched", write).apply();
            antiRepeat = AntiRepeat.parse(write != null ? write : stored, now);
        } else if (antiRepeat.purge(System.currentTimeMillis())) {
            prefs.edit().putString("launched", antiRepeat.serialize()).apply();
        }
        return antiRepeat;
    }

    private boolean seenRecently(String id) { return antiRepeat().recentlyStarted(id, System.currentTimeMillis()); }

    /** Removes the behavioural ranking state kept by v0.9 and earlier (scores, likes, dislikes). */
    private void dropLegacyRanking() {
        SharedPreferences.Editor ed = prefs.edit().remove("rank").remove("disliked");
        for (String k : prefs.getAll().keySet()) if (k.startsWith("like:")) ed.remove(k);
        ed.apply();
    }

    private double maxFrac;

    private void leaveVideo(boolean finished) {
        maxFrac = 0;                                             // nothing about how the video ended is stored (D8)
    }

    // ------------------------------------------------------------------ daily budget (shared for all kids, D43)
    private String today() {
        SimpleDateFormat f = new SimpleDateFormat("yyyyMMdd", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        return f.format(new Date());
    }

    private void rollDay() {
        if (!today().equals(prefs.getString("day", ""))) prefs.edit().putString("day", today()).putLong("usedMs", 0).apply();
    }

    private int dailyCapMin() { return getResources().getInteger(R.integer.daily_limit_min); }

    private int minutesLeftToday() {
        long running = meterStart > 0 ? SystemClock.elapsedRealtime() - meterStart : 0;
        return (int) Math.max(0, dailyCapMin() - (prefs.getLong("usedMs", 0) + running) / 60000);
    }

    // Shared screen meter for Try (Play uses addPlayTime, Watch its session): adds to the same usedMs.
    // Step-away and resting screens stop it, so time away from the TV is never charged.
    private long meterStart;

    private void startMeter() {
        if (meterStart == 0) { meterStart = SystemClock.elapsedRealtime(); prefs.edit().putLong("meterWall", System.currentTimeMillis()).apply(); }
    }

    private void stopMeter() {
        if (meterStart == 0) return;
        long ms = Math.min(SystemClock.elapsedRealtime() - meterStart, 4 * 3600_000L);
        meterStart = 0;
        prefs.edit().putLong("usedMs", prefs.getLong("usedMs", 0) + ms).remove("meterWall").apply();
    }

    /** After a crash or kill mid-Try, charge the lost stretch (capped at 10 min) instead of dropping it. */
    private void reconcileMeter() {
        long wall = prefs.getLong("meterWall", 0);
        if (wall > 0) {
            long ms = Math.max(0, Math.min(System.currentTimeMillis() - wall, 10 * 60_000L));
            prefs.edit().putLong("usedMs", prefs.getLong("usedMs", 0) + ms).remove("meterWall").apply();
        }
    }

    // ------------------------------------------------------------------ warm-up (educator §5A, simplified for 0.1)
    private static class Item {
        String prompt; String big; String[] choices; int answer; String say; String why = "";
        JSONObject about;          // non-null = About Me item (never counts toward minutes, D47)
        boolean done, correct, skipped;   // review state: Back can revisit an answered item
        String feedback = "";
        Item(String p, String b, String[] c, int a) { prompt = p; big = b; choices = c; answer = a; say = p; }
    }

    private List<Item> warmItems;
    private int wIndex, wCorrect, wTriedAll, wTries;
    private boolean inItem, usedHear;
    private TextView whyText;

    private Item makeItem(int kind) {
        switch (kind) {
            case 0: { // next letter
                int i = rng.nextInt(20);
                char a = (char) ('A' + i);
                String ans = String.valueOf((char) (a + 3));
                return shuffled("Which letter comes next?", a + "  " + (char) (a + 1) + "  " + (char) (a + 2) + "  _",
                        ans, String.valueOf((char) (a + 5)), String.valueOf((char) (a + 1)));
            }
            case 1: { // count dots
                int n = 3 + rng.nextInt(7);
                StringBuilder dots = new StringBuilder();
                for (int i = 0; i < n; i++) dots.append("● ");
                return shuffled("How many dots?", dots.toString().trim(), String.valueOf(n), String.valueOf(n + 1), String.valueOf(n - 1));
            }
            case 2: { // missing number
                int a = 1 + rng.nextInt(15);
                return shuffled("Which number is missing?", a + "  " + (a + 1) + "  _  " + (a + 3),
                        String.valueOf(a + 2), String.valueOf(a + 4), String.valueOf(a));
            }
            case 3: { // skip count by 10s
                int a = 1 + rng.nextInt(6);
                return shuffled("Count by tens!", (a * 10) + "  " + (a * 10 + 10) + "  _", String.valueOf(a * 10 + 20),
                        String.valueOf(a * 10 + 11), String.valueOf(a * 10 + 30));
            }
            default: { // bigger number
                int a = 2 + rng.nextInt(18), b = a + 1 + rng.nextInt(5);
                return shuffled("Which number is bigger?", a + "   or   " + b, String.valueOf(b), String.valueOf(a), null);
            }
        }
    }

    private Item shuffled(String p, String big, String right, String w1, String w2) {
        List<String> c = new ArrayList<>();
        c.add(right); c.add(w1); if (w2 != null) c.add(w2);
        Collections.shuffle(c, rng);
        return new Item(p, big, c.toArray(new String[0]), c.indexOf(right));
    }

    private void showWarmupIntroOnly() {
        screen = "warmintro";
        root.removeAllViews();
        setNight(false);
        addBuddy(220, 330, 320, R.drawable.buddy_happy_wave);
        LinearLayout col = column();
        col.addView(text(getString(R.string.warmup_title) + "!", 80, Color.WHITE, true));
        col.addView(text("5 quick questions, just for fun.", 40, 0xFFB9B2D6, false));
        TextView go = button("Let's go!", 0xFF6553DB, v -> showItem());
        col.addView(spacer(60)); col.addView(go);
        center(col);
        go.requestFocus();
    }

    private void showWarmup() {
        warmItems = new ArrayList<>();
        if (bank.length() >= 5) {
            List<Integer> order = new ArrayList<>();
            for (int i = 0; i < bank.length(); i++) order.add(i);
            Collections.shuffle(order, rng);
            Set<String> domains = new HashSet<>();
            for (int pass = 0; pass < 2 && warmItems.size() < 5; pass++)
                for (int i : order) {
                    if (warmItems.size() >= 5) break;
                    JSONObject o = bank.optJSONObject(i);
                    if (o == null) continue;
                    String d = o.optString("domain");
                    if (pass == 0 && !domains.add(d)) continue;
                    JSONArray ch = o.optJSONArray("choices");
                    if (ch == null || ch.length() < 2) continue;
                    String[] c = new String[ch.length()];
                    for (int j = 0; j < c.length; j++) c[j] = ch.optString(j);
                    Item it = new Item(o.optString("prompt"), o.optString("big"), c, o.optInt("answer", 0));
                    it.say = o.optString("say", it.prompt); it.why = o.optString("why", "");
                    if (warmItems.stream().noneMatch(x -> x.prompt.equals(it.prompt))) warmItems.add(it);
                }
        } else {
            for (int k : new int[]{0, 1, 2, 3, 4}) warmItems.add(makeItem(k));
        }
        Item me = pickAboutMe();
        if (me != null && warmItems.size() >= 3) warmItems.set(2, me);
        wIndex = 0; wCorrect = 0; wTriedAll = 1;
        screen = "warmintro";
        root.removeAllViews();
        setNight(false);
        addBuddy(220, 330, 320, R.drawable.buddy_happy_wave);
        LinearLayout col = column();
        col.addView(text(getString(R.string.warmup_title) + "!", 80, Color.WHITE, true));
        col.addView(text("5 quick questions, just for fun.", 40, 0xFFB9B2D6, false));
        TextView go = button("Let's go!", 0xFF6553DB, v -> showItem());
        col.addView(spacer(60)); col.addView(go);
        center(col);
        go.requestFocus();

    }

    private void showItem() {
        if (wIndex >= warmItems.size()) { inItem = false; warmupDone(); return; }
        inItem = true;
        Item it = warmItems.get(wIndex);
        if (it.about != null && !it.done) { showAboutItem(it); return; }
        stopVoice();
        wTries = 0;
        if (!it.done) usedHear = false;
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        StringBuilder dots = new StringBuilder();
        for (int i = 0; i < warmItems.size(); i++) dots.append(i < wIndex ? "● " : i == wIndex ? "◉ " : "○ ");
        col.addView(text(dots.toString().trim(), 36, 0xFFFFD36B, false));
        col.addView(spacer(16));
        // question line with the 🔊 button beside it (Up from the answers reaches it)
        LinearLayout qRow = new LinearLayout(this);
        qRow.setGravity(Gravity.CENTER);
        TextView hear = button("🔊", 0xFF2A2547, null);
        hear.setTextSize(TypedValue.COMPLEX_UNIT_PX, px(56));
        LinearLayout.LayoutParams hl = new LinearLayout.LayoutParams(px(130), px(130));
        hl.setMargins(0, 0, px(28), 0);
        qRow.addView(hear, hl);
        qRow.addView(text(it.prompt, 60, Color.WHITE, true));
        col.addView(qRow);
        col.addView(spacer(24));
        if (!it.big.isEmpty()) col.addView(text(it.big, 96, Color.WHITE, true));
        col.addView(spacer(40));
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        TextView[] btns = new TextView[it.choices.length];
        for (int i = 0; i < it.choices.length; i++) {
            final int idx = i;
            TextView t = button(it.choices[i], 0xFF3A3460, it.done ? null : v -> answer(idx, btns));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(260), px(180));
            lp.setMargins(px(24), 0, px(24), 0);
            fit(t, 80, 28);
            r.addView(t, lp);
            btns[i] = t;
        }
        col.addView(r);
        whyText = text(it.feedback, 40, 0xFFFFD36B, true);
        col.addView(spacer(24));
        col.addView(whyText);
        col.addView(spacer(24));
        // bottom row: Skip (before answering) or Next (after answering)
        LinearLayout bottom = new LinearLayout(this);
        bottom.setGravity(Gravity.CENTER);
        nextBtn = button("Next  ▶", 0xFF6553DB, v -> { wIndex++; showItem(); });
        TextView skip = button("⏭  Skip", 0xFF2A2547, v -> skipItem());
        skip.setTextSize(TypedValue.COMPLEX_UNIT_PX, px(34));
        bottom.addView(nextBtn);
        bottom.addView(skip);
        col.addView(bottom);
        nextBtn.setVisibility(it.done ? View.VISIBLE : View.GONE);
        skip.setVisibility(it.done ? View.GONE : View.VISIBLE);
        hear.setOnClickListener(v -> { usedHear = true; say(it.done && !it.why.isEmpty() ? it.why : it.say); });
        center(col);
        addBuddy(110, 780, 220, it.done ? R.drawable.buddy_idle : R.drawable.buddy_thinking);
        if (it.done) {
            int right = it.answer < 0 ? -1 : it.answer;
            for (int i = 0; i < btns.length; i++) btns[i].setAlpha(right < 0 || i == right ? 1f : 0.3f);
            nextBtn.requestFocus();
        } else {
            btns[0].requestFocus();
        }
        curSkip = skip;
    }

    private TextView nextBtn, curSkip;

    /** Answer finished (right, or shown after the second try): reveal Next; the child moves on when ready. */
    private void finishItem(Item it, boolean correct, String feedback) {
        it.done = true; it.correct = correct; it.feedback = feedback;
        if (buddy != null) { if (correct) buddy.happy(); else buddy.pose(R.drawable.buddy_idle); }
        whyText.setText(feedback);
        if (curSkip != null) curSkip.setVisibility(View.GONE);
        nextBtn.setVisibility(View.VISIBLE);
        ui.postDelayed(() -> nextBtn.requestFocus(), 450);
    }

    private void answer(int idx, TextView[] btns) {
        Item it = warmItems.get(wIndex);
        wTries++;
        for (TextView b : btns) b.setOnClickListener(null);
        if (it.answer < 0 || idx == it.answer) {
            wCorrect++;
            celebrate(btns[idx]);
            String[] cheers = {"Yay!", "Well done!", "Super!", "You got it!"};
            String cheer = cheers[rng.nextInt(cheers.length)];
            finishItem(it, true, cheer + (it.why.isEmpty() ? "" : "  " + it.why));
            if (usedHear) say(cheer, () -> { if (!it.why.isEmpty()) say(it.why); });
        } else if (wTries == 1) {
            btns[idx].setAlpha(0.3f);
            btns[idx].setFocusable(false);
            for (int i = 0; i < btns.length; i++) {
                final int j = i;
                if (btns[i].isFocusable()) btns[i].setOnClickListener(v -> answer(j, btns));
            }
            for (TextView b : btns) if (b.isFocusable()) { b.requestFocus(); break; }
            whyText.setText("Try again!");
            if (usedHear) say("Try again!");
        } else {
            for (int i = 0; i < btns.length; i++) btns[i].setAlpha(i == it.answer ? 1f : 0.3f);
            btns[it.answer].requestFocus();
            finishItem(it, false, "Now you know!" + (it.why.isEmpty() ? "" : "  " + it.why));
            if (usedHear) say("Now you know!", () -> { if (!it.why.isEmpty()) say(it.why); });
        }
    }

    private void next(long delay) { ui.postDelayed(() -> { wIndex++; showItem(); }, delay); }

    private void skipItem() {
        Item it = warmItems.get(wIndex);
        it.done = true; it.skipped = true; it.feedback = "Skipped. That's OK!";
        wIndex++; showItem();
    }

    /** Back in the warm-up: go to the previous question (to look and listen again); on the first one, the start screen. */
    private void previousItem() {
        stopVoice();
        if (wIndex == 0) { inItem = false; showWarmupIntroOnly(); return; }
        wIndex--;
        showItem();
    }

    private boolean fromPlayWarmup;

    /** Warm-up end: praise only. It never sets, unlocks or changes minutes (issue #1, point 6). */
    private void warmupDone() {
        root.removeAllViews();
        addBuddy(140, 120, 260, R.drawable.buddy_happy_wave);
        LinearLayout col = column();
        col.addView(text("Great warm-up! 🌟", 64, Color.WHITE, true));
        col.addView(spacer(40));
        TextView play = button("🎲  Games", 0xFF6553DB, v -> { fromPlayWarmup = false; showPlayList(); });
        TextView home = button("🏠  Home", 0xFF3A3460, v -> { fromPlayWarmup = false; showHub(); });
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(px(20), 0, px(20), 0);
        r.addView(play, lp); r.addView(home, lp);
        col.addView(r);
        center(col);
        play.requestFocus();
    }

    // ------------------------------------------------------------------ the three doors: Watch · Play · Try
    private long cooldownLeftMs() { return prefs.getLong("cooldownUntil", 0) - System.currentTimeMillis(); }

    private void showHub() {
        stopMeter();
        screen = "hub";
        inItem = false;
        stopVoice();
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        LinearLayout greet = new LinearLayout(this);
        greet.setGravity(Gravity.CENTER_VERTICAL);
        Buddy hb = new Buddy(px(200), R.drawable.buddy_happy_wave);
        greet.addView(hb, new LinearLayout.LayoutParams(px(200), px(200)));
        String nm = childName().isEmpty() ? "friend" : childName();
        LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bl.setMargins(px(24), 0, 0, 0);
        greet.addView(bubble("Hi " + nm + "! What shall we do?", 52), bl);
        col.addView(greet);
        col.addView(spacer(50));
        LinearLayout doors = new LinearLayout(this);
        doors.setGravity(Gravity.CENTER);
        long cd = cooldownLeftMs();
        boolean watchResting = cd > 0 || minutesLeftToday() < 5;
        String watchSub = cd > 0 ? "🌙 Resting " + (int) Math.ceil(cd / 60000.0) + " min" : minutesLeftToday() < 5 ? "🌙 Resting till tomorrow" : "Videos & stories";
        View w = door("🎬", "Watch", watchSub, 0xFF6553DB, v -> {
            if (cooldownLeftMs() > 0 || minutesLeftToday() < 5) { whyHub.setText("Videos are resting. Try Play or Try!"); return; }
            // Session length comes only from the parent's setting, capped by today's shared budget (issue #1, point 6).
            beginSession(Math.max(1, Math.min(getResources().getInteger(R.integer.watch_session_min), minutesLeftToday())));
        });
        if (watchResting) w.setAlpha(0.55f);
        View pl = door("🎲", "Play", "Games to think", 0xFFE8590C, v -> showPlayList());
        View tr = door("🧪", "Try", "Make & discover", 0xFF2F7D4A, v -> {
            if (minutesLeftToday() < 1) { showResting("TV is resting now.", -1); return; }
            if (getResources().getBoolean(R.bool.try_v3)) showTryHome3(); else showTryCats();
        });
        if (!getResources().getBoolean(R.bool.try_enabled)) tr.setVisibility(View.GONE);
        for (View d : new View[]{pl, tr, w}) {                       // home order PLAY → TRY → WATCH (docs/DECISIONS.md D1)
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(460), px(470));
            lp.setMargins(px(30), 0, px(30), 0);
            doors.addView(d, lp);
        }
        col.addView(doors);
        whyHub = text("", 40, AMBER, true);
        col.addView(spacer(30));
        col.addView(whyHub);
        center(col);
        pl.requestFocus();
        ui.postDelayed(() -> hb.pose(R.drawable.buddy_idle), 1800);
    }

    private TextView whyHub;

    /** A big door card: icon, name, small line under it. */
    private View door(String icon, String name, String sub, int color, View.OnClickListener onClick) {
        return door(icon, name, sub, color, onClick, 150, 72, 36);
    }

    private View door(String icon, String name, String sub, int color, View.OnClickListener onClick, int iconPx, int namePx, int subPx) {
        if (sub == null || sub.isEmpty()) sub = " ";
        TextView d = button(icon + "\n" + name + "\n" + sub, color, onClick);
        d.setPadding(px(20), px(14), px(20), px(24));
        android.text.SpannableString sp = new android.text.SpannableString(icon + "\n" + name + "\n" + sub);
        int a = icon.length(), b = a + 1 + name.length();
        sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(iconPx)), 0, a, 0);
        sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(namePx)), a + 1, b, 0);
        sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(subPx)), b + 1, sp.length(), 0);
        d.setText(sp);
        d.setLineSpacing(px(8), 1f);
        return d;
    }

    // ------------------------------------------------------------------ Play: games (games.json, generic round engine)
    private void showPlayList() {
        screen = "play";
        stopVoice();
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        col.addView(bubble("🎲 Pick a game!", 52));
        col.addView(spacer(16));
        TextView warm = button("☀️  " + getString(R.string.warmup_title), 0xFFC9730A, v -> { fromPlayWarmup = true; showWarmup(); });
        col.addView(warm);                                         // optional standalone warm-up: no gate, no effect on time
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        LinearLayout row = null;
        View first = null;
        String lastCat = null;
        for (int i = 0; i < games.length(); i++) {
            JSONObject g = games.optJSONObject(i);
            if (g == null || !"play".equals(g.optString("section", "play"))) continue;
            String cat = g.optString("category", "⭐ " + getString(R.string.buddy_name) + "'s favourites");
            if (!cat.equals(lastCat)) {                          // one shelf per catalogue category
                lastCat = cat;
                TextView h = text(cat.replaceFirst("^[A-J]\\. ", ""), 40, INK, true);
                h.setPadding(px(60), px(26), 0, px(4));
                grid.addView(h, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
                h.setGravity(Gravity.START);
                row = null;
            }
            if (row == null || row.getChildCount() == 3) { row = new LinearLayout(this); row.setGravity(Gravity.CENTER); row.setPadding(0, px(12), 0, px(12)); grid.addView(row); }
            int color = Color.parseColor(g.optString("color", "#6553DB"));
            if (color == 0xFFF2B33D) color = 0xFFC9730A;
            final int gi = i;
            int lvl = prefs.getInt("glevel:" + g.optString("id"), 1);
            View c = door(g.optString("icon", "🎲"), g.optString("name"), stars(lvl) + "  " + g.optString("tagline"), color, v -> { lastGame = gi; startGame(g); }, 110, 52, 30);
            if (i == lastGame) focusMe = c;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(500), px(350));
            lp.setMargins(px(24), px(18), px(24), px(18));
            row.addView(c, lp);
            if (first == null) first = c;
        }
        if (first == null) col.addView(text("Games are coming soon!", 48, INK, true));
        col.addView(grid);
        col.setPadding(0, px(48), 0, px(40));
        ScrollView sv = new ScrollView(this);
        sv.addView(col);
        root.addView(sv);
        if (focusMe != null) focusMe.requestFocus(); else if (first != null) first.requestFocus();
        focusMe = null;
    }

    private int lastGame = -1, lastTry = -1;
    private View focusMe;
    private JSONObject game;
    private List<JSONObject> gRounds = new ArrayList<>();
    private int gIndex, gFirstTry, gLevel, gTries;
    private long gameStart;
    private boolean introSaid, mazeStar, mazeNeedStar;

    private int level(JSONObject g) { return prefs.getInt("glevel:" + g.optString("id"), 1); }

    static final java.util.Set<String> BUILT_VARIANTS = new HashSet<>(Arrays.asList("pick", "sort", "grid_path", "keypad", "recite", "place", "echo", "order", "peek", "mirror", "pairs", "compose", "scene_canvas"));
    private int SET = 5;
    private int gCur, gStreak, gMissRun, gMaxLevel;
    private boolean gLevelUp;
    private final Set<String> gUsed = new HashSet<>();

    private JSONArray roundsAt(int lv) {
        JSONArray levels = game.optJSONArray("levels");
        for (int i = 0; levels != null && i < levels.length(); i++)
            if (levels.optJSONObject(i).optInt("level") == lv) return levels.optJSONObject(i).optJSONArray("rounds");
        return null;
    }

    private JSONObject nextRound() {
        JSONArray rs = roundsAt(gCur);
        if (rs == null) rs = roundsAt(1);
        List<JSONObject> free = new ArrayList<>();
        for (int i = 0; rs != null && i < rs.length(); i++) if (!gUsed.contains(rs.optJSONObject(i).optString("id")) && roundUsable(rs.optJSONObject(i))) free.add(rs.optJSONObject(i));
        if (free.isEmpty()) for (int i = 0; rs != null && i < rs.length(); i++) if (roundUsable(rs.optJSONObject(i))) free.add(rs.optJSONObject(i));
        // prefer rounds he has not seen recently (across sets)
        String seen = prefs.getString("gseen:" + game.optString("id"), "");
        List<JSONObject> fresh = new ArrayList<>();
        for (JSONObject r : free) if (!seen.contains("|" + r.optString("id") + "|")) fresh.add(r);
        List<JSONObject> pool = fresh.isEmpty() ? free : fresh;
        JSONObject r = pool.get(rng.nextInt(pool.size()));
        gUsed.add(r.optString("id"));
        String s2 = seen + "|" + r.optString("id") + "|";
        if (s2.length() > 1500) s2 = s2.substring(s2.length() - 1500);
        prefs.edit().putString("gseen:" + game.optString("id"), s2).apply();
        return r;
    }

    private void startGame(JSONObject g) {
        if (minutesLeftToday() < 1) { whyHub = null; showResting("TV is resting now.", -1); return; }
        game = g;
        JSONArray levels = g.optJSONArray("levels");
        gMaxLevel = 1;
        for (int i = 0; levels != null && i < levels.length(); i++) gMaxLevel = Math.max(gMaxLevel, levels.optJSONObject(i).optInt("level"));
        gLevel = Math.min(level(g), gMaxLevel);
        SET = g.optInt("rounds_per_session", 5);
        gCur = gLevel; gStreak = 0; gMissRun = 0; gLevelUp = false; gUpDone = false; gDownDone = false;
        gUsed.clear();
        gRounds = new ArrayList<>();
        gIndex = 0; gFirstTry = 0; introSaid = false; gVoice = false; gCollected.clear();
        gameStart = SystemClock.elapsedRealtime();
        screen = "game";
        showRound();
    }

    /** Called once per finished round: 3 first-try in a row climbs a level mid-set; 2 hard rounds in a row step down quietly. */
    private boolean gUpDone, gDownDone;

    private void adapt(boolean firstTry) {
        if (!game.optBoolean("adaptive", true)) return;
        if (firstTry) { gStreak++; gMissRun = 0; } else { gMissRun++; gStreak = 0; }
        if (gStreak >= 3 && gCur < gMaxLevel && !gUpDone) { gCur++; gStreak = 0; gLevelUp = true; gUpDone = true; }
        else if (gMissRun >= 2 && gCur > 1 && !gDownDone) { gCur--; gMissRun = 0; gDownDone = true; }
    }

    private String levelTitle(int lv) {
        JSONArray li = game.optJSONArray("levels_info");
        for (int i = 0; li != null && i < li.length(); i++)
            if (li.optJSONObject(i).optInt("level") == lv) return li.optJSONObject(i).optString("emoji") + " " + li.optJSONObject(i).optString("title");
        return "Level " + lv;
    }

    private void addPlayTime() {
        if (gameStart > 0) {
            prefs.edit().putLong("usedMs", prefs.getLong("usedMs", 0) + SystemClock.elapsedRealtime() - gameStart).apply();
            gameStart = 0;
        }
    }

    private void showRound() {
        cancelIdle();
        if (gIndex >= SET) { endGame(); return; }
        if (gIndex >= gRounds.size()) gRounds.add(nextRound());
        JSONObject r = resolveRound(gRounds.get(gIndex));
        if ("grid_path".equals(game.optString("variant")) || r.optJSONArray("grid") != null) { showMaze(r); return; }
        if ("keypad".equals(r.optString("variant"))) { showKeypad(r); return; }
        if ("recite".equals(r.optString("variant"))) { showRecite(r); return; }
        if ("place".equals(r.optString("variant"))) { showPlace(r); return; }
        if ("echo".equals(r.optString("variant"))) { showEcho(r); return; }
        if ("order".equals(r.optString("variant"))) { showOrder(r); return; }
        if ("mirror".equals(r.optString("variant"))) { showMirror(r); return; }
        if ("pairs".equals(r.optString("variant"))) { showPairs(r); return; }
        if ("compose".equals(r.optString("variant")) || "scene_canvas".equals(r.optString("variant"))) { showCompose(r); return; }
        if (r.has("peek_board") && !r.optBoolean("_peeked")) { showPeek(r); return; }
        stopVoice();
        gTries = 0;
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        col.addView(roundHeader(r.optBoolean("silly") ? "🤪 Oops!" : null));
        if (gIndex == 0 && !game.optString("story").isEmpty()) col.addView(text(game.optString("scene") + "  " + story(), 36, AMBER, true));
        col.addView(spacer(20));
        LinearLayout qRow = new LinearLayout(this);
        qRow.setGravity(Gravity.CENTER);
        String sayLine = r.optString("say", r.optString("prompt"));
        hearBtn = button("🔊", 0xFF2A2547, v -> { gVoice = true; sayRound(r); });
        LinearLayout.LayoutParams hl = new LinearLayout.LayoutParams(px(140), px(140));
        hl.setMargins(0, 0, px(28), 0);
        qRow.addView(hearBtn, hl);
        qRow.addView(text(r.optString("prompt"), 58, INK, true));
        col.addView(qRow);
        if (r.has("oops")) {
            TextView ob = bubble("🐦 " + getString(R.string.buddy_name) + " picked  " + r.optString("oops") + "  🙈  Which is right?", 40);
            col.addView(spacer(10));
            col.addView(ob);
        }
        col.addView(spacer(24));
        JSONArray ba = r.optJSONArray("board");
        boardCells = new ArrayList<>();
        if (ba != null && ba.length() > 0) {
            LinearLayout bd = new LinearLayout(this);
            bd.setGravity(Gravity.CENTER);
            GradientDrawable bb = new GradientDrawable(); bb.setColor(0xE6FFFFFF); bb.setCornerRadius(px(40));
            bd.setBackground(bb);
            bd.setPadding(px(30), px(8), px(30), px(8));
            int sz = ba.length() > 6 ? 84 : 104;
            for (int i = 0; i < ba.length(); i++) {
                TextView c = text(ba.optString(i), sz, INK, true);
                if (r.optBoolean("silhouette_board")) showSil(c, ba.optString(i), sz + 20);
                c.setPadding(px(14), 0, px(14), 0);
                bd.addView(c);
                boardCells.add(c);
            }
            col.addView(bd);
            JSONArray bf = r.optJSONArray("board_fade");
            if (bf != null) ui.postDelayed(() -> { for (int i = 0; i < bf.length(); i++) { int k = bf.optInt(i); if (k < boardCells.size()) boardCells.get(k).animate().alpha(0.2f).translationY(px(30)).setDuration(700).start(); } }, 1200);
            if (r.optBoolean("count_with_me")) for (int i = 0; i < boardCells.size(); i++) {      // one-to-one: each item hops in turn
                TextView c = boardCells.get(i);
                ui.postDelayed(() -> { sfx("pop"); c.animate().scaleX(1.3f).scaleY(1.3f).setDuration(160).withEndAction(() -> c.animate().scaleX(1f).scaleY(1f).setDuration(160).start()).start(); }, 900 + i * 650L);
            }
        } else if (ba == null) {
            String board = r.optString("board", "");
            if (!board.isEmpty()) col.addView(text(board, 104, INK, true));
        }
        col.addView(spacer(36));
        JSONArray ch = r.optJSONArray("choices");
        JSONArray labels = r.optJSONArray("labels");
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        int n = ch == null ? 0 : ch.length();
        boolean grid = n > 4 || "grid2x3".equals(r.optString("layout"));
        LinearLayout gridBox = null;
        if (grid) { gridBox = new LinearLayout(this); gridBox.setOrientation(LinearLayout.VERTICAL); gridBox.addView(row); }
        TextView[] btns = new TextView[n];
        int w = n <= 3 ? 280 : 230;
        for (int i = 0; i < n; i++) {
            final int idx = i;
            String face = ch.optString(i);
            TextView t = button(face, 0xFF3A3460, v -> roundAnswer(r, idx, btns));
            if (Character.isLetter(face.isEmpty() ? ' ' : face.charAt(0))) t.setTypeface(andika);
            if (labels != null && i < labels.length()) {
                android.text.SpannableString sp = new android.text.SpannableString(face + "\n" + labels.optString(i));
                sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(100)), 0, face.length(), 0);
                sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(38)), face.length() + 1, sp.length(), 0);
                t.setText(sp);
                t.setPadding(px(16), px(16), px(16), px(30));
            } else fit(t, 96, 30);
            if (r.optBoolean("silhouette") && !r.optBoolean("silhouette_board")) showSil(t, face, 130);
            int rot = r.optInt("choice_rotate", 0);
            if (rot != 0) t.setRotation(rot * (i % 2 == 0 ? 1 : -1));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(w), px(grid ? 160 : labels != null ? 250 : 200));
            lp.setMargins(px(26), px(grid ? 8 : 0), px(26), px(grid ? 8 : 0));
            if (grid && row.getChildCount() == 3) { row = new LinearLayout(this); row.setGravity(Gravity.CENTER); gridBox.addView(row); }
            row.addView(t, lp);
            btns[i] = t;
        }
        col.addView(grid ? gridBox : row);
        whyText = text("", 40, AMBER, true);
        col.addView(spacer(22));
        col.addView(whyText);
        nextBtn = button("Next  ▶", 0xFF6553DB, v -> { gIndex++; showRound(); });
        nextBtn.setVisibility(View.GONE);
        col.addView(spacer(16));
        col.addView(nextBtn);
        center(col);
        addBuddy(80, 800, 210, R.drawable.buddy_thinking);
        if (gLevelUp) levelUpBanner();
        if (gVoice) { if (n > 0) btns[0].requestFocus(); ui.postDelayed(() -> sayRound(r), 400); }
        else { hearBtn.requestFocus(); pulse(hearBtn); }
        scheduleIdle(r);
    }

    private TextView hearBtn, sceneStrip;

    /** The chosen tile flies up into the game's scene strip (garland, basket, train…). */
    private void flyToScene(View from, String face) {
        int[] a = new int[2]; from.getLocationInWindow(a);
        TextView f = text(face, 90, INK, false);
        root.addView(f, new FrameLayout.LayoutParams(px(160), px(160)));
        f.setX(a[0] + from.getWidth() / 2f - px(80)); f.setY(a[1] + from.getHeight() / 2f - px(80));
        f.animate().x(px(1300)).y(px(150)).scaleX(0.35f).scaleY(0.35f).setDuration(700)
                .setInterpolator(new AccelerateDecelerateInterpolator()).withEndAction(() -> { root.removeView(f); sfx("twinkle"); }).start();
    }

    private void cherryReact() {
        if (buddy == null) return;
        switch (rng.nextInt(4)) {
            case 0: buddy.happy(); break;
            case 1: buddy.hop(); buddy.img.animate().rotationBy(360).setDuration(600).start(); break;
            case 2: buddy.pose(R.drawable.buddy_happy_wave); buddy.img.animate().scaleX(1.2f).scaleY(1.2f).setDuration(200).withEndAction(() -> buddy.img.animate().scaleX(1f).scaleY(1f).setDuration(200).start()).start(); break;
            default: buddy.hop(); ui.postDelayed(() -> { if (buddy != null) buddy.hop(); }, 380);
        }
        sfx("chirp");
    }
    private final List<String> gCollected = new ArrayList<>();

    private String story() { return game.optString("story").replace("{buddy}", getString(R.string.buddy_name)); }
    private List<TextView> boardCells = new ArrayList<>();
    private boolean gVoice;
    private final Runnable idleNudge = new Runnable() { @Override public void run() { } };
    private Runnable idleTask;

    private void sayRound(JSONObject r) {
        if (gIndex == 0 && !introSaid && game.has("say_intro")) { introSaid = true; say(game.optString("say_intro"), () -> say(r.optString("say", r.optString("prompt")))); }
        else say(r.optString("say", r.optString("prompt")));
    }

    /** Header pill: game icon + name, then flower progress (🌸 done, 🌱 now, ⚪ to come). */
    private View roundHeader(String extra) {
        LinearLayout h = new LinearLayout(this);
        h.setGravity(Gravity.CENTER_VERTICAL);
        GradientDrawable bg = new GradientDrawable(); bg.setColor(Color.WHITE); bg.setCornerRadius(px(40));
        h.setBackground(bg);
        h.setElevation(px(6));
        h.setPadding(px(36), px(10), px(36), px(10));
        h.addView(text(game.optString("icon") + "  " + game.optString("name"), 40, INK, true));
        StringBuilder dots = new StringBuilder();
        for (int i = 0; i < SET; i++) dots.append(i < gIndex ? "🟢" : i == gIndex ? "🔵" : "⚪").append(" ");
        TextView d = text("   " + dots.toString().trim(), 40, INK, false);
        h.addView(d);
        StringBuilder sc = new StringBuilder();
        for (String c : gCollected) if (c.length() <= 4) sc.append(c);
        if (sc.length() > 0) { sceneStrip = text("   " + game.optString("scene", "") + sc, 40, INK, false); h.addView(sceneStrip); }
        else sceneStrip = null;
        if (extra != null) h.addView(text("   " + extra, 36, 0xFFB23A86, true));

        return h;
    }

    private static String stars(int n) { StringBuilder b = new StringBuilder(); for (int i = 0; i < Math.min(n, 5); i++) b.append("⭐"); return b.toString(); }

    private void levelUpBanner() {
        gLevelUp = false;
        sfx("twinkle");
        TextView b = bubble("⬆️  Level up!  " + levelTitle(gCur), 56);
        root.addView(b, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        b.setScaleX(0.3f); b.setScaleY(0.3f);
        b.animate().scaleX(1f).scaleY(1f).setInterpolator(new OvershootInterpolator()).setDuration(350).start();
        celebrate(b);
        if (buddy != null) buddy.happy();
        ui.postDelayed(() -> b.animate().alpha(0f).setDuration(400).withEndAction(() -> root.removeView(b)).start(), 1800);
    }

    private void pulse(View v) {
        if (v == null) return;
        ValueAnimator a = ValueAnimator.ofFloat(1f, 1.14f);
        a.setDuration(700); a.setRepeatMode(ValueAnimator.REVERSE); a.setRepeatCount(5);
        a.addUpdateListener(x -> { float f = (float) x.getAnimatedValue(); v.setScaleX(f); v.setScaleY(f); });
        a.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override public void onAnimationEnd(android.animation.Animator an) { v.setScaleX(v.hasFocus() ? 1.08f : 1f); v.setScaleY(v.hasFocus() ? 1.08f : 1f); }
        });
        a.start();
    }

    private void scheduleIdle(JSONObject r) {
        cancelIdle();
        idleTask = () -> {                                     // 10 s without an answer: the buddy chirps and points at 🔊
            if (!"game".equals(screen)) return;
            sfx("chirp");
            if (buddy != null) { buddy.hop(); }
            if (!gVoice) pulse(hearBtn);
            else say(r.optString("hint", r.optString("say")));
        };
        ui.postDelayed(idleTask, 10_000);
    }

    private void cancelIdle() { if (idleTask != null) ui.removeCallbacks(idleTask); idleTask = null; }

    private void markGold(TextView t) {
        GradientDrawable g = new GradientDrawable(); g.setColor(0xFFFFD45C); g.setCornerRadius(px(32)); g.setStroke(px(6), 0xFFF59E0B);
        t.setBackground(g);
        t.setAlpha(1f);
    }

    private void roundAnswer(JSONObject r, int idx, TextView[] btns) {
        if (btns[idx].getTag() != null) { sfx("bump"); return; }           // faded tile: stays focusable, does nothing
        cancelIdle();
        int ans = r.optBoolean("any_ok") ? idx : r.optInt("answer", 0);
        JSONArray also = r.optJSONArray("also_ok");
        for (int i = 0; also != null && i < also.length(); i++) if (also.optInt(i) == idx) ans = idx;
        if (r.optBoolean("any_ok") && r.has("save_as")) prefs.edit().putString("fav:" + r.optString("save_as"), btns[idx].getText().toString()).apply();
        boolean revealed = gTries >= 2;
        gTries++;
        if (ans < 0 || idx == ans) {
            if (gTries == 1) gFirstTry++;
            adapt(gTries == 1);
            for (TextView b : btns) { b.setOnClickListener(null); if (b != btns[idx]) b.setAlpha(0.35f); }
            markGold(btns[idx]);
            String face0 = btns[idx].getText().toString().split("\n")[0];
            gCollected.add(face0);
            if (face0.length() <= 4) flyToScene(btns[idx], face0);
            sfx(revealed ? "pop" : "chime");
            celebrate(btns[idx]);
            for (TextView c : boardCells) if (c.getText().toString().contains("❓")) { c.setText(btns[idx].getText().toString().split("\n")[0]); celebrate(c); }
            cherryReact();
            String why = r.optString("why", "");
            String cheer = revealed ? "That's it!" : pick(game.optJSONArray("cheers"), new String[]{"Yay!", "Well done!", "Super!", "You got it!"});
            whyText.setText(cheer + (why.isEmpty() ? "" : "  " + why));
            if (gVoice) say(cheer, () -> { if (!why.isEmpty()) say(why); });
            nextBtn.setVisibility(View.VISIBLE);
            ui.postDelayed(() -> nextBtn.requestFocus(), 450);
            return;
        }
        sfx("boing");
        btns[idx].setAlpha(0.3f);
        btns[idx].setTag("dead");
        btns[idx].animate().translationXBy(px(14)).setDuration(70).withEndAction(() ->
                btns[idx].animate().translationXBy(-px(14)).setDuration(70).start()).start();
        if (buddy != null) { buddy.pose(R.drawable.buddy_thinking); buddy.img.animate().rotation(-8).setDuration(150).withEndAction(() -> buddy.img.animate().rotation(0).setDuration(150).start()).start(); }
        if (gTries == 1) {
            int fade = r.optInt("fade", -1);
            if (fade >= 0 && fade < btns.length && fade != ans) { btns[fade].setAlpha(0.3f); btns[fade].setTag("dead"); }
            String hint = r.optString("hint", "Look again!");
            whyText.setText("🤔 " + hint);
            if (gVoice) say(hint); else pulse(hearBtn);
            scheduleIdle(r);
        } else {                                           // second miss: show the answer kindly; he presses it himself
            for (int i = 0; i < btns.length; i++) if (i != ans) { btns[i].setAlpha(0.3f); btns[i].setTag("dead"); }
            if (ans < btns.length) { btns[ans].requestFocus(); pulse(btns[ans]); }
            whyText.setText("👉 This one! Press it.");
            if (gVoice) say("Here it is!");
        }
    }

    private String pick(JSONArray a, String[] fallback) {
        if (a != null && a.length() > 0) return a.optString(rng.nextInt(a.length()));
        return fallback[rng.nextInt(fallback.length)];
    }

    // ------------------------------------------------------------------ All About Me engine (dynamic / any_ok / keypad / recite)
    private boolean roundUsable(JSONObject r) {
        String dyn = r.optString("dynamic", "");
        if (dyn.startsWith("name") && childName().isEmpty()) return false;
        if (dyn.startsWith("age") && childAge() <= 0) return false;
        // Personal keypad rounds (phone numbers) are not supported: only literal public-number rounds (e.g. 112) are usable.
        if ("keypad".equals(r.optString("variant")) && !"literal".equals(r.optString("check"))) return false;
        return true;
    }

    /** Fills {name}, {age_candles}, {answer}/{other} from the profile on the TV. Spoken lines never contain these values. */
    private JSONObject resolveRound(JSONObject src) {
        String dyn = src.optString("dynamic", "");
        if (dyn.isEmpty() && !src.toString().contains("{name}")) return src;
        try {
            JSONObject r = new JSONObject(src.toString());
            String name = childName().toUpperCase(java.util.Locale.ROOT);
            int age = childAge();
            r.put("prompt", r.optString("prompt").replace("{name}", childName()));
            JSONArray b = r.optJSONArray("board"), nb = new JSONArray();
            for (int i = 0; b != null && i < b.length(); i++) {
                String t = b.optString(i);
                if (t.equals("{age_candles}")) { for (int k = 0; k < age; k++) nb.put("🕯️"); continue; }
                nb.put(t.replace("{name}", name));
            }
            r.put("board", nb);
            if (dyn.isEmpty()) return r;
            String answer;
            List<String> others = new ArrayList<>();
            String abc = "ABCDEFGHIJKLMNOPRSTUVWY";
            switch (dyn) {
                case "name_first_letter": answer = name.substring(0, 1);
                    for (char c : abc.toCharArray()) if (c != answer.charAt(0)) others.add(String.valueOf(c)); break;
                case "name_has_letter": { answer = name.substring(rng.nextInt(name.length())).substring(0, 1);
                    for (char c : abc.toCharArray()) if (name.indexOf(c) < 0) others.add(String.valueOf(c)); break; }
                case "name_length": answer = String.valueOf(name.length()); others = nearNumbers(name.length()); break;
                case "age": answer = String.valueOf(age); others = nearNumbers(age); break;
                case "age_next": answer = String.valueOf(age + 1); others = nearNumbers(age + 1); break;
                default: answer = String.valueOf(Math.max(1, age - 1)); others = nearNumbers(Math.max(1, age - 1)); break;
            }
            Collections.shuffle(others, rng);
            JSONArray ch = r.optJSONArray("choices");
            int n = ch == null ? 3 : ch.length();
            List<String> faces = new ArrayList<>();
            faces.add(answer);
            for (int i = 1; i < n && i - 1 < others.size(); i++) faces.add(others.get(i - 1));
            Collections.shuffle(faces, rng);
            r.put("choices", new JSONArray(faces));
            r.put("answer", faces.indexOf(answer));
            r.remove("fade");
            return r;
        } catch (Exception e) { return src; }
    }

    private List<String> nearNumbers(int x) {
        List<String> l = new ArrayList<>();
        for (int d : new int[]{1, -1, 2, -2, 3}) if (x + d > 0) l.add(String.valueOf(x + d));
        return l;
    }

    private void roundDone(JSONObject r, boolean firstTry, String why) {
        if (firstTry) gFirstTry++;
        adapt(firstTry);
        sfx("chime");
        if (buddy != null) buddy.happy();
        String cheer = pick(game.optJSONArray("cheers"), new String[]{"Yay!", "Well done!"});
        whyText.setText(cheer + (why.isEmpty() ? "" : "  " + why));
        if (gVoice) say(cheer, () -> { if (!why.isEmpty()) say(why); });
        nextBtn.setVisibility(View.VISIBLE);
        ui.postDelayed(() -> nextBtn.requestFocus(), 450);
    }

    /** Shared top part for keypad / recite rounds. */
    private LinearLayout specialRoundTop(JSONObject r) {
        stopVoice();
        gTries = 0;
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        col.addView(roundHeader(null));
        col.addView(spacer(18));
        LinearLayout qRow = new LinearLayout(this);
        qRow.setGravity(Gravity.CENTER);
        hearBtn = button("🔊", 0xFF2A2547, v -> { gVoice = true; sayRound(r); });
        LinearLayout.LayoutParams hl = new LinearLayout.LayoutParams(px(130), px(130));
        hl.setMargins(0, 0, px(28), 0);
        qRow.addView(hearBtn, hl);
        qRow.addView(text(r.optString("prompt"), 54, INK, true));
        col.addView(qRow);
        col.addView(spacer(18));
        return col;
    }

    private void addRoundFooter(LinearLayout col) {
        whyText = text("", 38, AMBER, true);
        col.addView(spacer(12));
        col.addView(whyText);
        nextBtn = button("Next  ▶", 0xFF6553DB, v -> { gIndex++; showRound(); });
        nextBtn.setVisibility(View.GONE);
        col.addView(spacer(10));
        col.addView(nextBtn);
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_idle);
    }

    private final StringBuilder typed = new StringBuilder();
    private TextView keypadDots;

    /** Digits pad. Typed digits show only as dots in groups; a miss never shows the right number. */
    private void showKeypad(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        typed.setLength(0);
        JSONArray chunks = r.optJSONArray("chunks");
        int total = 0;
        for (int i = 0; chunks != null && i < chunks.length(); i++) total += chunks.optInt(i);
        if (total == 0) total = r.optString("target").length();
        final int need = total;
        TextView dots = text(dotLine(r, 0), 72, INK, true);
        keypadDots = dots;
        GradientDrawable db = new GradientDrawable(); db.setColor(Color.WHITE); db.setCornerRadius(px(36));
        dots.setBackground(db);
        dots.setPadding(px(40), px(6), px(40), px(6));
        col.addView(dots);
        col.addView(spacer(16));
        String[] keys = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✅"};
        LinearLayout pad = new LinearLayout(this);
        pad.setOrientation(LinearLayout.VERTICAL);
        View first = null;
        for (int row = 0; row < 4; row++) {
            LinearLayout rr = new LinearLayout(this);
            rr.setGravity(Gravity.CENTER);
            for (int c = 0; c < 3; c++) {
                String k = keys[row * 3 + c];
                TextView b = button(k, k.equals("✅") ? 0xFF2F7D4A : 0xFF3A3460, v -> {
                    if (k.equals("⌫")) { if (typed.length() > 0) typed.setLength(typed.length() - 1); sfx("pop"); }
                    else if (k.equals("✅")) { checkKeypad(r, need); return; }
                    else if (typed.length() < need) { typed.append(k); sfx("pop"); }
                    dots.setText(dotLine(r, typed.length()));
                    if (typed.length() == need) checkKeypad(r, need);
                });
                b.setPadding(0, 0, 0, px(6));
                fit(b, 60, 30);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(150), px(112));
                lp.setMargins(px(10), px(6), px(10), px(6));
                rr.addView(b, lp);
                if (k.equals("1")) first = b;
            }
            pad.addView(rr);
        }
        col.addView(pad);
        addRoundFooter(col);
        if (gVoice) { first.requestFocus(); ui.postDelayed(() -> sayRound(r), 400); } else { first.requestFocus(); pulse(hearBtn); }
    }

    private String dotLine(JSONObject r, int filled) {
        JSONArray chunks = r.optJSONArray("chunks");
        StringBuilder s = new StringBuilder();
        int idx = 0;
        int nCh = chunks == null ? 1 : chunks.length();
        for (int c = 0; c < nCh; c++) {
            int len = chunks == null ? r.optString("target").length() : chunks.optInt(c);
            for (int i = 0; i < len; i++, idx++) s.append(idx < filled ? "●" : "○");
            if (c < nCh - 1) s.append("  ");
        }
        return s.toString();
    }

    private void checkKeypad(JSONObject r, int need) {
        if (typed.length() < need) { sfx("bump"); return; }
        String check = r.optString("check", "none");
        String entry = typed.toString();
        typed.setLength(0);
        keypadResult(r, "literal".equals(check) && entry.equals(r.optString("target")));
    }

    private void keypadResult(JSONObject r, boolean ok) {
        gTries++;
        if (ok) { roundDone(r, gTries == 1, r.optString("why")); return; }
        sfx("boing");
        if (gTries >= r.optInt("max_tries", 2)) {
            whyText.setText("👫 " + r.optString("parent_help", "Practise with a grown-up."));
            if (gVoice) say(r.optString("on_miss_say"));
            adapt(false);
            nextBtn.setVisibility(View.VISIBLE);
            nextBtn.requestFocus();
        } else {
            whyText.setText("🤔 " + r.optString("hint"));
            if (gVoice) say(r.optString("hint")); else pulse(hearBtn);
        }
        if (keypadDots != null) keypadDots.setText(dotLine(r, 0));            // dots reset; the right digits are never shown
    }

    /** He says it aloud; a grown-up presses ✅ or 🔁. Nothing is recorded or stored. */
    private void showRecite(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        TextView pp = bubble("👫 " + r.optString("parent_prompt"), 38);
        col.addView(pp);
        col.addView(spacer(26));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        JSONArray bs = r.optJSONArray("buttons"), ls = r.optJSONArray("labels");
        TextView ok = button((bs == null ? "✅" : bs.optString(0)) + "  " + (ls == null ? "Said it!" : ls.optString(0)), 0xFF2F7D4A, v -> {
            gTries++; celebrate(v); roundDone(r, true, r.optString("why"));
        });
        TextView again = button((bs == null ? "🔁" : bs.optString(1)) + "  " + (ls == null ? "Practise more" : ls.optString(1)), 0xFF3A3460, v -> {
            sfx("pop"); whyText.setText("🔁 " + r.optString("practise_say")); if (gVoice) say(r.optString("practise_say"));
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(px(20), 0, px(20), 0);
        row.addView(ok, lp); row.addView(again, lp);
        col.addView(row);
        addRoundFooter(col);
        if (gVoice) { ok.requestFocus(); ui.postDelayed(() -> sayRound(r), 400); } else { hearBtn.requestFocus(); pulse(hearBtn); }
    }

    // ------------------------------------------------------------------ catalogue variants: place / echo / order / peek / silhouette
    /** Draws an emoji as a solid dark silhouette (Shadow Match). */
    private android.graphics.drawable.Drawable silhouette(String emoji, int sizePx) {
        android.graphics.Bitmap bm = android.graphics.Bitmap.createBitmap(sizePx, sizePx, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas c = new android.graphics.Canvas(bm);
        android.graphics.Paint p = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        p.setTextSize(sizePx * 0.8f);
        p.setTextAlign(android.graphics.Paint.Align.CENTER);
        p.setColorFilter(new android.graphics.PorterDuffColorFilter(0xFF2B2F4A, android.graphics.PorterDuff.Mode.SRC_IN));
        android.graphics.Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(emoji, sizePx / 2f, sizePx / 2f - (fm.ascent + fm.descent) / 2f, p);
        return new android.graphics.drawable.BitmapDrawable(getResources(), bm);
    }

    private void showSil(TextView t, String emoji, int sizePx) {
        android.graphics.drawable.Drawable d = silhouette(emoji, px(sizePx));
        d.setBounds(0, 0, px(sizePx), px(sizePx));
        t.setText("");
        t.setCompoundDrawables(null, d, null, null);
    }

    // place: items arrive one at a time; LEFT/RIGHT over bins, OK places.
    private int plIndex, plMiss;
    private TextView plItem;

    private void showPlace(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        JSONArray items = r.optJSONArray("items"), bins = r.optJSONArray("bins"), answers = r.optJSONArray("answers");
        plIndex = 0; plMiss = 0;
        plItem = text(items.optString(0), 120, INK, false);
        GradientDrawable ib = new GradientDrawable(); ib.setColor(Color.WHITE); ib.setCornerRadius(px(40));
        plItem.setBackground(ib); plItem.setPadding(px(40), px(6), px(40), px(6)); plItem.setElevation(px(8));
        col.addView(plItem);
        TextView left = text(itemsLeft(items.length(), 0), 34, INK_SOFT, true);
        col.addView(left);
        col.addView(spacer(24));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        TextView[] bb = new TextView[bins.length()];
        for (int i = 0; i < bins.length(); i++) {
            final int bi = i;
            JSONObject b = bins.optJSONObject(i);
            String face = b.optString("face"), label = b.optString("label");
            TextView t = button(face + "\n" + label, 0xFF3A3460, v -> {
                if (plIndex >= items.length()) return;
                if (answers.optInt(plIndex) == bi) {
                    sfx("chime"); celebrate(v);
                    gCollected.add(items.optString(plIndex));
                    plIndex++; plMiss = 0;
                    left.setText(itemsLeft(items.length(), plIndex));
                    if (plIndex >= items.length()) { plItem.setText("🎉"); roundDone(r, gTries == 0, r.optString("why")); return; }
                    plItem.setScaleX(0.2f); plItem.setScaleY(0.2f); plItem.setText(items.optString(plIndex));
                    plItem.animate().scaleX(1f).scaleY(1f).setInterpolator(new OvershootInterpolator()).setDuration(260).start();
                } else {
                    gTries++; plMiss++; sfx("boing");
                    plItem.animate().translationXBy(px(16)).setDuration(70).withEndAction(() -> plItem.animate().translationX(0).setDuration(70).start()).start();
                    if (plMiss >= 2) { whyText.setText("🤔 " + r.optString("hint")); if (gVoice) say(r.optString("hint")); else pulse(hearBtn); }
                }
            });
            android.text.SpannableString sp = new android.text.SpannableString(face + "\n" + label);
            sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(96)), 0, face.length(), 0);
            sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(34)), face.length() + 1, sp.length(), 0);
            t.setText(sp);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(bins.length() > 3 ? 260 : 300), px(250));
            lp.setMargins(px(20), 0, px(20), 0);
            row.addView(t, lp);
            bb[i] = t;
        }
        col.addView(row);
        addRoundFooter(col);
        if (gVoice) { bb[0].requestFocus(); ui.postDelayed(() -> sayRound(r), 400); } else { bb[0].requestFocus(); pulse(hearBtn); }
    }

    private String itemsLeft(int n, int done) { StringBuilder s = new StringBuilder(); for (int i = 0; i < n; i++) s.append(i < done ? "● " : "○ "); return s.toString().trim(); }

    // echo: tiles light up in order, then he presses them in the same order; a miss just replays.
    private int ecPos;
    private boolean ecShowing;

    private void showEcho(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        JSONArray pool = r.optJSONArray("pool"), seq = r.optJSONArray("sequence");
        TextView prog = text("👀 Watch!", 44, AMBER, true);
        col.addView(prog);
        col.addView(spacer(20));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        TextView[] tiles = new TextView[pool.length()];
        for (int i = 0; i < pool.length(); i++) {
            final int ti = i;
            TextView t = button(pool.optString(i), 0xFF3A3460, v -> {
                if (ecShowing) return;
                if (seq.optInt(ecPos) == ti) {
                    sfx("pop"); flash(tiles[ti]); ecPos++;
                    prog.setText(itemsLeft(seq.length(), ecPos));
                    if (ecPos >= seq.length()) roundDone(r, gTries == 0, r.optString("why"));
                } else {
                    gTries++; sfx("boing"); prog.setText("👀 Watch again!");
                    ui.postDelayed(() -> playEcho(r, tiles, prog), 900);
                }
            });
            fit(t, 100, 40);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(220), px(200));
            lp.setMargins(px(18), 0, px(18), 0);
            row.addView(t, lp);
            tiles[i] = t;
        }
        col.addView(row);
        addRoundFooter(col);
        tiles[0].requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 300);
        ui.postDelayed(() -> playEcho(r, tiles, prog), gVoice ? 2600 : 900);
    }

    private void playEcho(JSONObject r, TextView[] tiles, TextView prog) {
        JSONArray seq = r.optJSONArray("sequence");
        int ms = r.optInt("show_ms", 900);
        ecShowing = true; ecPos = 0;
        prog.setText("👀 Watch!");
        for (int i = 0; i < seq.length(); i++) {
            int k = seq.optInt(i);
            ui.postDelayed(() -> { sfx("pop"); flash(tiles[k]); }, (long) i * ms);
        }
        ui.postDelayed(() -> { ecShowing = false; prog.setText("👉 Your turn!  " + itemsLeft(seq.length(), 0)); }, (long) seq.length() * ms + 200);
    }

    private void flash(View v) {
        v.animate().scaleX(1.3f).scaleY(1.3f).setDuration(200).withEndAction(() -> v.animate().scaleX(v.hasFocus() ? 1.08f : 1f).scaleY(v.hasFocus() ? 1.08f : 1f).setDuration(200).start()).start();
        GradientDrawable g = new GradientDrawable(); g.setColor(0xFFFFD45C); g.setCornerRadius(px(32));
        android.graphics.drawable.Drawable old = v.getBackground();
        v.setBackground(g);
        ui.postDelayed(() -> v.setBackground(old), 420);
    }

    // order: cards shown shuffled; OK moves the next correct card into the answer strip.
    private int orPos;

    private void showOrder(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        JSONArray items = r.optJSONArray("items"), labels = r.optJSONArray("labels");
        orPos = 0;
        LinearLayout strip = new LinearLayout(this);
        strip.setGravity(Gravity.CENTER);
        GradientDrawable sb = new GradientDrawable(); sb.setColor(0xE6FFFFFF); sb.setCornerRadius(px(36));
        strip.setBackground(sb); strip.setPadding(px(24), px(10), px(24), px(10));
        TextView[] slots = new TextView[items.length()];
        for (int i = 0; i < items.length(); i++) {
            TextView s = text((i + 1) + "", 64, 0xFFB8BED6, true);
            s.setPadding(px(22), 0, px(22), 0);
            strip.addView(s, new LinearLayout.LayoutParams(px(170), px(150)));
            slots[i] = s;
            if (i < items.length() - 1) strip.addView(text("➡", 40, INK_SOFT, false));
        }
        col.addView(strip);
        col.addView(spacer(30));
        List<Integer> idx = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) idx.add(i);
        do Collections.shuffle(idx, rng); while (items.length() > 1 && isSorted(idx));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        View first = null;
        for (int k : idx) {
            String face = items.optString(k) + (labels != null && k < labels.length() ? "\n" + labels.optString(k) : "");
            TextView t = button(face, 0xFF3A3460, null);
            JSONArray sc = r.optJSONArray("scales");
            float scale = sc == null ? 1f : (float) sc.optDouble(k, 1.0);
            t.setOnClickListener(v -> {
                if (k == orPos) {
                    if (sc != null) slots[orPos].setTextSize(TypedValue.COMPLEX_UNIT_PX, px(Math.round(110 * scale)));
                    sfx("pop"); slots[orPos].setText(items.optString(k)); slots[orPos].setTextColor(INK); celebrate(slots[orPos]);
                    v.setAlpha(0.25f); v.setTag("dead"); v.setOnClickListener(x -> sfx("bump"));
                    orPos++;
                    if (orPos >= items.length()) roundDone(r, gTries == 0, r.optString("why"));
                    else for (int j = 0; j < row.getChildCount(); j++) if (row.getChildAt(j).getTag() == null) { row.getChildAt(j).requestFocus(); break; }
                } else {
                    gTries++; sfx("boing");
                    v.animate().translationYBy(-px(14)).setDuration(80).withEndAction(() -> v.animate().translationY(0).setDuration(80).start()).start();
                    if (gTries >= 2) { whyText.setText("🤔 " + r.optString("hint")); if (gVoice) say(r.optString("hint")); }
                }
            });
            if (sc != null) t.setTextSize(TypedValue.COMPLEX_UNIT_PX, px(Math.round(120 * scale))); else fit(t, 90, 30);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(230), px(210));
            lp.setMargins(px(16), 0, px(16), 0);
            row.addView(t, lp);
            if (first == null) first = t;
        }
        col.addView(row);
        addRoundFooter(col);
        first.requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 400); else pulse(hearBtn);
    }

    private void showPeek(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        JSONArray pb = r.optJSONArray("peek_board");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; pb != null && i < pb.length(); i++) sb.append(pb.optString(i)).append("  ");
        TextView board = text(sb.toString().trim(), 110, INK, false);
        GradientDrawable bg = new GradientDrawable(); bg.setColor(0xE6FFFFFF); bg.setCornerRadius(px(40));
        board.setBackground(bg); board.setPadding(px(40), px(10), px(40), px(10));
        col.addView(board);
        col.addView(spacer(20));
        TextView eye = text("👀 Look carefully…", 46, AMBER, true);
        col.addView(eye);
        addRoundFooter(col);
        hearBtn.requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 300);
        int ms = r.optInt("peek_ms", 3000);
        ui.postDelayed(() -> {
            if (!"game".equals(screen)) return;
            board.animate().alpha(0f).setDuration(300).withEndAction(() -> {
                try { JSONObject r2 = new JSONObject(r.toString()); r2.put("_peeked", true); gRounds.set(gIndex, r2); boolean v = gVoice; gVoice = false; showRound(); gVoice = v; } catch (Exception ignored) { }
            }).start();
        }, ms + (gVoice ? 2500 : 0));
    }

    private boolean isSorted(List<Integer> l) { for (int i = 0; i < l.size(); i++) if (l.get(i) != i) return false; return true; }

    // mirror (Symmetry Butterfly): left wing shown; he fills the right wing. OK on a cell cycles the palette; ✅ checks.
    private void showMirror(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        int rows = r.optInt("rows", 2), cols = r.optInt("cols", 1);
        JSONArray left = r.optJSONArray("left"), pal = r.optJSONArray("palette");
        LinearLayout wings = new LinearLayout(this);
        wings.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable wb = new GradientDrawable(); wb.setColor(0xE6FFFFFF); wb.setCornerRadius(px(40));
        wings.setBackground(wb); wings.setPadding(px(30), px(16), px(30), px(16));
        int cell = Math.min(150, 520 / Math.max(rows, 1));
        TextView[][] right = new TextView[rows][cols];
        int[][] pick = new int[rows][cols];
        View first = null;
        for (int i = 0; i < rows; i++) {
            LinearLayout rr = new LinearLayout(this);
            rr.setGravity(Gravity.CENTER);
            JSONArray lrow = left.optJSONArray(i);
            for (int j = 0; j < cols; j++) {
                TextView t = text(lrow.optString(j), (int) (cell * 0.55), INK, false);
                GradientDrawable cd = new GradientDrawable(); cd.setColor(0xFFFFE9F2); cd.setCornerRadius(px(18));
                t.setBackground(cd);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(cell), px(cell)); lp.setMargins(px(5), px(5), px(5), px(5));
                rr.addView(t, lp);
            }
            TextView body = text(i == 0 ? "🐛" : "┃", (int) (cell * 0.5), INK_SOFT, false);
            rr.addView(body, new LinearLayout.LayoutParams(px(90), px(cell)));
            for (int j = 0; j < cols; j++) {
                final int ri = i, cj = j;
                pick[i][j] = -1;
                TextView t = button("❔", 0xFF3A3460, null);
                t.setOnClickListener(v -> {
                    pick[ri][cj] = (pick[ri][cj] + 1) % pal.length();
                    ((TextView) v).setText(pal.optString(pick[ri][cj]));
                    sfx("pop");
                });
                fit(t, (int) (cell * 0.55), 30);
                t.setPadding(0, 0, 0, px(6));
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(cell), px(cell)); lp.setMargins(px(5), px(5), px(5), px(5));
                rr.addView(t, lp);
                right[i][j] = t;
                if (first == null) first = t;
            }
            wings.addView(rr);
        }
        col.addView(wings);
        col.addView(spacer(12));
        col.addView(text("OK = change   ·   then ✅", 32, INK_SOFT, true));
        TextView done = button("✅  Done", 0xFF2F7D4A, v -> {
            boolean ok = true;
            for (int i = 0; i < rows; i++) for (int j = 0; j < cols; j++) {
                String want = left.optJSONArray(i).optString(cols - 1 - j);
                String got = pick[i][j] < 0 ? "" : pal.optString(pick[i][j]);
                if (!want.equals(got)) { ok = false; pulse(right[i][j]); }
            }
            if (ok) { celebrate(wings); roundDone(r, gTries == 0, r.optString("why")); }
            else { gTries++; sfx("boing"); whyText.setText("🤔 " + r.optString("hint")); if (gVoice) say(r.optString("hint")); }
        });
        col.addView(spacer(10));
        col.addView(done);
        addRoundFooter(col);
        first.requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 400); else pulse(hearBtn);
    }

    // pairs: classic memory cards. OK flips; two the same stay open; a miss flips back after a moment (no penalty).
    private void showPairs(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        JSONArray cards = r.optJSONArray("cards");
        List<String> deck = new ArrayList<>();
        for (int i = 0; i < cards.length(); i++) { deck.add(cards.optString(i)); deck.add(cards.optString(i)); }
        Collections.shuffle(deck, rng);
        int cols = r.optInt("cols", 4);
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        LinearLayout row = null;
        final TextView[] open = new TextView[1];
        final int[] found = {0};
        final boolean[] busy = {false};
        View first = null;
        int size = deck.size() > 12 ? 140 : 170;
        for (int i = 0; i < deck.size(); i++) {
            if (i % cols == 0) { row = new LinearLayout(this); row.setGravity(Gravity.CENTER); grid.addView(row); }
            String face = deck.get(i);
            TextView t = button("❔", 0xFF6553DB, null);
            t.setOnClickListener(v -> {
                TextView tv = (TextView) v;
                if (busy[0] || tv.getTag() != null || tv == open[0]) return;
                tv.setText(face); sfx("pop");
                if (open[0] == null) { open[0] = tv; return; }
                TextView a = open[0]; open[0] = null;
                if (face.contentEquals(a.getText())) {
                    a.setTag("done"); tv.setTag("done"); markGold(a); markGold(tv); sfx("chime"); celebrate(tv);
                    if (++found[0] == cards.length()) roundDone(r, gTries <= cards.length(), r.optString("why"));
                } else {
                    gTries++; busy[0] = true;
                    ui.postDelayed(() -> { a.setText("❔"); tv.setText("❔"); busy[0] = false; }, 1100);
                }
            });
            fit(t, size / 2, 30);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(size), px(size));
            lp.setMargins(px(10), px(8), px(10), px(8));
            row.addView(t, lp);
            if (first == null) first = t;
        }
        col.addView(grid);
        addRoundFooter(col);
        first.requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 400); else pulse(hearBtn);
    }

    // compose: tray of parts + grid. mode "build" (copy a target or free build), "canvas" (scene_canvas: free scene on a backdrop),
    // "slots" (who/where/what story). Never wrong; BACK-safe; Done appears when the rule is met.
    private String held, lastCreation;

    private void showCompose(JSONObject r) {
        String mode = r.optString("mode", r.has("backdrop") ? "canvas" : "build");
        if ("slots".equals(mode)) { showSlots(r); return; }
        LinearLayout col = specialRoundTop(r);
        JSONObject gobj = r.optJSONObject("grid");
        int rows = gobj != null ? gobj.optInt("rows", 3) : r.optInt("rows", 3);
        int cols = gobj != null ? gobj.optInt("cols", 3) : r.optInt("cols", 3);
        JSONArray parts = r.has("palette") ? r.optJSONArray("palette") : r.optJSONArray("parts");
        JSONArray target = r.optJSONArray("target");
        JSONArray must = r.optJSONArray("must_include");
        int minParts = r.optInt("min_parts", r.optInt("min_items", 1));
        int maxParts = r.optInt("max_items", rows * cols);
        held = parts.optString(0);
        LinearLayout body = new LinearLayout(this);
        body.setGravity(Gravity.CENTER);
        if (target != null) {                                   // the picture to copy
            LinearLayout tgt = new LinearLayout(this);
            tgt.setOrientation(LinearLayout.VERTICAL);
            GradientDrawable tb = new GradientDrawable(); tb.setColor(0xFFFFF3D6); tb.setCornerRadius(px(30));
            tgt.setBackground(tb); tgt.setPadding(px(16), px(12), px(16), px(12));
            for (int i = 0; i < rows; i++) {
                LinearLayout rr = new LinearLayout(this);
                for (int j = 0; j < cols; j++) {
                    String c = target.optJSONArray(i).isNull(j) ? "" : target.optJSONArray(i).optString(j);
                    rr.addView(text(c, 54, INK, false), new LinearLayout.LayoutParams(px(84), px(84)));
                }
                tgt.addView(rr);
            }
            body.addView(tgt);
            body.addView(text("  👉  ", 60, INK_SOFT, false));
        }
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable gb = new GradientDrawable(); gb.setColor(0xE6FFFFFF); gb.setCornerRadius(px(30));
        grid.setBackground(gb); grid.setPadding(px(14), px(10), px(14), px(10));
        if (r.has("backdrop")) col.addView(text(r.optString("backdrop"), 70, INK, false));
        String[][] cells = new String[rows][cols];
        TextView[][] cv = new TextView[rows][cols];
        int cell = Math.min(130, 470 / Math.max(rows, 1));
        TextView done = button("✅  " + r.optString("finish", "Done"), 0xFF2F7D4A, null);
        Runnable check = () -> {
            int placed = 0; boolean match = target != null;
            Set<String> used = new HashSet<>();
            for (int i = 0; i < rows; i++) for (int j = 0; j < cols; j++) {
                if (cells[i][j] != null) { placed++; used.add(cells[i][j]); }
                if (target != null) {
                    String want = target.optJSONArray(i).isNull(j) ? null : target.optJSONArray(i).optString(j);
                    if (want == null ? cells[i][j] != null : !want.equals(cells[i][j])) match = false;
                }
            }
            boolean ok = target != null ? match : placed >= minParts;
            for (int k = 0; must != null && k < must.length(); k++) if (!used.contains(must.optString(k))) ok = false;
            done.setVisibility(ok ? View.VISIBLE : View.INVISIBLE);
            if (ok && target != null) { celebrate(grid); roundDone(r, gTries == 0, r.optString("why")); }
        };
        for (int i = 0; i < rows; i++) {
            LinearLayout rr = new LinearLayout(this);
            for (int j = 0; j < cols; j++) {
                final int ri = i, cj = j;
                TextView t = button("", 0xFF3A3460, v -> {
                    TextView tv = (TextView) v;
                    if (cells[ri][cj] != null && cells[ri][cj].equals(held)) { cells[ri][cj] = null; tv.setText(""); sfx("pop"); }
                    else {
                        int placed = 0; for (String[] row : cells) for (String c : row) if (c != null) placed++;
                        if (cells[ri][cj] == null && placed >= maxParts) { sfx("bump"); return; }
                        cells[ri][cj] = held; tv.setText(held); sfx("pop");
                        tv.setScaleX(0.4f); tv.setScaleY(0.4f); tv.animate().scaleX(1.08f).scaleY(1.08f).setDuration(200).start();
                    }
                    check.run();
                });
                fit(t, (int) (cell * 0.6), 24);
                t.setPadding(0, 0, 0, px(4));
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(cell), px(cell)); lp.setMargins(px(4), px(4), px(4), px(4));
                rr.addView(t, lp);
                cv[i][j] = t;
            }
            grid.addView(rr);
        }
        body.addView(grid);
        col.addView(body);
        col.addView(spacer(14));
        LinearLayout tray = new LinearLayout(this);
        tray.setGravity(Gravity.CENTER);
        TextView[] tb = new TextView[parts.length()];
        for (int k = 0; k < parts.length(); k++) {
            String p = parts.optString(k);
            TextView t = button(p, 0xFF6553DB, v -> {
                held = p; sfx("pop");
                for (TextView o : tb) o.setAlpha(o == v ? 1f : 0.55f);
                cv[0][0].requestFocus();
            });
            fit(t, 64, 30);
            t.setAlpha(k == 0 ? 1f : 0.55f);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(130), px(120)); lp.setMargins(px(8), 0, px(8), 0);
            tray.addView(t, lp);
            tb[k] = t;
        }
        col.addView(tray);
        col.addView(text("Pick 👆 then place 👇   (OK again removes)", 30, INK_SOFT, true));
        done.setOnClickListener(v -> {
            StringBuilder made = new StringBuilder();
            for (String[] row : cells) { for (String c : row) made.append(c == null ? "▫️" : c); made.append("\n"); }
            lastCreation = made.toString().trim();
            celebrate(grid); sfx("fanfare"); if (gVoice && r.has("story_say")) say(r.optString("story_say")); roundDone(r, true, r.optString("why")); v.setVisibility(View.INVISIBLE); });
        done.setVisibility(View.INVISIBLE);
        col.addView(spacer(8));
        col.addView(done);
        addRoundFooter(col);
        tb[0].requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 400); else pulse(hearBtn);
    }

    /** slots: pick one from each row (who / where / what), then the story card appears. Never wrong. */
    private void showSlots(JSONObject r) {
        LinearLayout col = specialRoundTop(r);
        String[] keys = {"who", "where", "what"};
        String[] chosen = new String[3];
        String[] chosenLabel = new String[3];
        TextView story = text("", 52, INK, true);
        TextView done = button("📖  Tell my story", 0xFF2F7D4A, v -> {
            String t = r.optString("story", "{who} · {where} · {what}");
            for (int i = 0; i < 3; i++) t = t.replace("{" + keys[i] + "}", chosen[i] + " " + chosenLabel[i]);
            story.setText(t);
            celebrate(story); sfx("fanfare");
            roundDone(r, true, r.optString("why"));
            v.setVisibility(View.GONE);
        });
        done.setVisibility(View.INVISIBLE);
        View first = null;
        for (int s = 0; s < 3; s++) {
            JSONArray opts = r.optJSONArray(keys[s]);
            if (opts == null) { chosen[s] = ""; chosenLabel[s] = ""; continue; }
            LinearLayout row = new LinearLayout(this);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.addView(text(s == 0 ? "🧒" : s == 1 ? "📍" : "🎬", 54, INK, false));
            List<TextView> group = new ArrayList<>();
            for (int k = 0; k < opts.length(); k++) {
                JSONObject o = opts.optJSONObject(k);
                String pic = o == null ? opts.optString(k) : o.optString("pic"), label = o == null ? "" : o.optString("label");
                final int si = s;
                TextView b = button(pic, 0xFF3A3460, null);
                b.setOnClickListener(v -> {
                    chosen[si] = pic; chosenLabel[si] = label; sfx("pop");
                    for (TextView g : group) g.setAlpha(g == v ? 1f : 0.45f);
                    boolean all = true; for (String c : chosen) if (c == null) all = false;
                    if (all) { done.setVisibility(View.VISIBLE); done.requestFocus(); }
                });
                fit(b, 70, 30);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(150), px(130)); lp.setMargins(px(10), px(6), px(10), px(6));
                row.addView(b, lp);
                group.add(b);
                if (first == null) first = b;
            }
            col.addView(row);
        }
        col.addView(spacer(10));
        col.addView(story);
        col.addView(done);
        addRoundFooter(col);
        if (first != null) first.requestFocus();
        if (gVoice) ui.postDelayed(() -> sayRound(r), 400); else pulse(hearBtn);
    }

    // grid_path: move the character with arrows to the goal; walls block; no time limit.
    private char[][] maze;
    private int mzR, mzC, mazeBumps;
    private TextView[][] cells;

    private void showMaze(JSONObject r) {
        stopVoice();
        root.removeAllViews();
        setNight(false);
        JSONArray g = r.optJSONArray("grid");
        int rowsN = g == null ? 0 : g.length();
        int colsN = 0;
        for (int i = 0; i < rowsN; i++) colsN = Math.max(colsN, g.optString(i).length());
        maze = new char[rowsN][colsN];
        cells = new TextView[rowsN][colsN];
        JSONObject lg = r.optJSONObject("legend");
        if (lg == null) lg = new JSONObject();
        String hero = lg.optString("S", "🚗"), goal = lg.optString("G", "🏫"), wall = lg.optString("#", "🌳"), star = lg.optString("*", "⭐");
        mazeStar = false; mazeNeedStar = r.optBoolean("need_star"); mazeBumps = 0;
        LinearLayout col = column();
        col.addView(roundHeader(null));
        col.addView(spacer(14));
        col.addView(text(r.optString("prompt", "Find the way!") + (mazeNeedStar ? "   ⭐ first!" : ""), 52, INK, true));
        col.addView(spacer(14));
        LinearLayout board = new LinearLayout(this);
        board.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable bb = new GradientDrawable(); bb.setColor(0xE6FFFFFF); bb.setCornerRadius(px(36));
        board.setBackground(bb);
        board.setPadding(px(20), px(20), px(20), px(20));
        int cell = Math.min(150, 600 / Math.max(1, rowsN));
        for (int i = 0; i < rowsN; i++) {
            LinearLayout rr = new LinearLayout(this);
            String line = g.optString(i);
            for (int j = 0; j < colsN; j++) {
                char c = j < line.length() ? line.charAt(j) : '#';
                maze[i][j] = c;
                TextView t = text(c == '#' ? wall : c == 'G' ? goal : c == '*' ? star : "", (int) (cell * 0.6), INK, false);
                GradientDrawable cd = new GradientDrawable();
                cd.setColor(c == '#' ? 0xFF8ED1A0 : 0xFFFFF3D6); cd.setCornerRadius(px(14));
                t.setBackground(cd);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(cell), px(cell));
                lp.setMargins(px(4), px(4), px(4), px(4));
                rr.addView(t, lp);
                cells[i][j] = t;
                if (c == 'S') { mzR = i; mzC = j; }
            }
            board.addView(rr);
        }
        col.addView(board);
        whyText = text("⬆️⬇️⬅️➡️  move     OK = 🔊", 38, AMBER, true);
        col.addView(spacer(12));
        col.addView(whyText);
        center(col);
        cells[mzR][mzC].setText(hero);
        mazeHero = hero; mazeGoal = goal;
        mazeRound = r;
        addBuddy(80, 800, 210, R.drawable.buddy_idle);
        if (gVoice) ui.postDelayed(() -> say(r.optString("say")), 400);
    }

    private String mazeHero, mazeGoal;
    private JSONObject mazeRound;

    private boolean mazeKey(int k) {
        if (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER) { gVoice = true; say(mazeRound.optString("say")); return true; }
        int dr = k == KeyEvent.KEYCODE_DPAD_UP ? -1 : k == KeyEvent.KEYCODE_DPAD_DOWN ? 1 : 0;
        int dc = k == KeyEvent.KEYCODE_DPAD_LEFT ? -1 : k == KeyEvent.KEYCODE_DPAD_RIGHT ? 1 : 0;
        if (dr == 0 && dc == 0) return false;
        int nr = mzR + dr, nc = mzC + dc;
        if (nr < 0 || nc < 0 || nr >= maze.length || nc >= maze[0].length || maze[nr][nc] == '#') {
            sfx("bump");
            mazeBumps++;
            cells[mzR][mzC].animate().translationX(px(8 * dc)).translationY(px(8 * dr)).setDuration(60).withEndAction(() ->
                    cells[mzR][mzC].animate().translationX(0).translationY(0).setDuration(60).start()).start();
            if (mazeBumps == 3) {
                String hint = mazeRound.optString("hint", "Try another way. Look for the open path.");
                whyText.setText("🤔 " + hint);
                if (gVoice) say(hint);
                if (buddy != null) buddy.hop();
            }
            return true;
        }
        sfx("pop");
        cells[mzR][mzC].setText(maze[mzR][mzC] == 'G' ? mazeGoal : "👣");
        cells[mzR][mzC].setAlpha(maze[mzR][mzC] == 'G' ? 1f : 0.45f);
        mzR = nr; mzC = nc;
        cells[nr][nc].setAlpha(1f);
        if (maze[nr][nc] == '*') { maze[nr][nc] = '.'; mazeStar = true; sfx("twinkle"); celebrate(cells[nr][nc]); }
        boolean won = maze[nr][nc] == 'G' && (!mazeNeedStar || mazeStar);
        if (maze[nr][nc] == 'G' && !won) whyText.setText("⭐ Get the star first!");
        cells[nr][nc].setText(mazeHero);
        if (won) {
            sfx("fanfare");
            celebrate(cells[nr][nc]);
            if (buddy != null) buddy.happy();
            if (mazeBumps <= 2) gFirstTry++;
            adapt(mazeBumps <= 2);
            String why = mazeRound.optString("why", "You made it!");
            whyText.setText("🎉 " + why);
            if (gVoice) say(why);
            maze = null;
            TextView nb = button("Next  ▶", 0xFF6553DB, v -> { gIndex++; showRound(); });
            ((LinearLayout) whyText.getParent()).addView(nb);
            ui.postDelayed(nb::requestFocus, 450);
        }
        return true;
    }

    private void endGame() {
        cancelIdle();
        addPlayTime();
        int n = gRounds.size();
        int next = gCur;                                       // where he ended the set
        if (gFirstTry >= 4 && gCur == gLevel && gCur < gMaxLevel && game.optBoolean("adaptive", true)) next = gCur + 1;
        boolean promoted = next > gLevel;
        prefs.edit().putInt("glevel:" + game.optString("id"), next).apply();
        stopVoice();
        root.removeAllViews();
        setNight(false);
        sfx("fanfare");
        LinearLayout col = column();
        addBuddy(160, 140, 280, R.drawable.buddy_happy_wave);
        if (lastCreation != null) { col.addView(text(lastCreation, 54, INK, false)); lastCreation = null; }
        StringBuilder garden = new StringBuilder(game.optString("scene", "🌸") + "  ");
        if (gCollected.isEmpty()) for (int i = 0; i < n; i++) garden.append("🌸");
        for (String c : gCollected) garden.append(c.length() > 4 ? "🌸" : c);
        TextView g = text(garden.toString(), 96, INK, false);
        col.addView(g);
        String line = pick(game.optJSONArray("end_lines"), new String[]{"You finished " + game.optString("name") + "!"});
        col.addView(text(line, 60, INK, true));
        if (!game.optString("story").isEmpty()) col.addView(text("✔ " + story(), 40, AMBER, true));
        if (promoted) col.addView(text("⬆️ New level next time:  " + levelTitle(next), 44, 0xFFB23A86, true));
        col.addView(spacer(44));
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        TextView hear = button("🔊", 0xFF2A2547, v -> say(line));
        TextView again = button("🔁  Again", 0xFF6553DB, v -> startGame(game));
        TextView back = button("🎲  Games", 0xFF3A3460, v -> showPlayList());
        TextView home = button("🏠", 0xFF3A3460, v -> showHub());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(px(20), 0, px(20), 0);
        for (View v : new View[]{hear, again, back, home}) r.addView(v, lp);
        col.addView(r);
        center(col);
        again.requestFocus();
        if (gVoice) ui.postDelayed(() -> say(line), 600);
        for (int i = 0; i < 3; i++) { final int d = i; ui.postDelayed(() -> celebrate(g), 300 + d * 500); }
        if (buddy != null) buddy.happy();
    }

    // ------------------------------------------------------------------ TRY v3 — Do, Explore & Experience (docs: TRY Stage 1 design)
    // Invite → prepare → 3–5 short picture steps → Step away (quiet, meter stopped) → optional return. No rewards, no reporting.
    private JSONObject try3 = new JSONObject();
    private JSONObject t3Act;
    private int t3Step;
    private String t3Fam;

    private boolean t3Visible(JSONObject a) {
        String st = a.optString("safety_status");
        boolean ok = "approved".equals(st) || ("parent_supervision_required".equals(st) && getResources().getBoolean(R.bool.try_allow_supervised));
        if (!ok || !a.has("child_steps") || a.optJSONArray("child_steps").length() < 3) return false;
        String fams = getString(R.string.try_families).trim();
        if (!fams.isEmpty() && !("," + fams + ",").contains("," + a.optString("category") + ",")) return false;
        JSONArray bands = a.optJSONArray("recommended_age_bands");
        String band = getString(R.string.try_age_band);
        for (int i = 0; bands != null && i < bands.length(); i++) if (band.equals(bands.optString(i))) return true;
        return false;
    }

    private List<JSONObject> t3In(String fam) {
        List<JSONObject> l = new ArrayList<>();
        JSONArray acts = try3.optJSONArray("activities");
        for (int i = 0; acts != null && i < acts.length(); i++) {
            JSONObject a = acts.optJSONObject(i);
            if (a != null && fam.equals(a.optString("category")) && t3Visible(a)) l.add(a);
        }
        String recent = prefs.getString("t3recent", "");                       // recently opened ones go last (rotation only)
        Collections.sort(l, (x, y) -> Boolean.compare(recent.contains(x.optString("activity_id")), recent.contains(y.optString("activity_id"))));
        return l.size() > 6 ? new ArrayList<>(l.subList(0, 6)) : l;
    }

    private String t3Line(String k, String d) { JSONObject l = try3.optJSONObject("lines"); return l == null ? d : l.optString(k, d); }

    private void showTryHome3() {
        if (minutesLeftToday() < 1) { showResting("TV is resting now.", -1); return; }
        startMeter();
        screen = "t3home";
        stopVoice(); root.removeAllViews(); setNight(false);
        LinearLayout col = column();
        col.addView(bubble("🧪  " + t3Line("home", "Let's do something in the real world!"), 48));
        col.addView(spacer(30));
        JSONArray fams = try3.optJSONArray("families");
        LinearLayout row = null;
        View first = null;
        int shown = 0;
        for (int i = 0; fams != null && i < fams.length(); i++) {
            JSONObject f = fams.optJSONObject(i);
            if (t3In(f.optString("id")).isEmpty()) continue;
            if (row == null || row.getChildCount() == 4) { row = new LinearLayout(this); row.setGravity(Gravity.CENTER); row.setPadding(0, px(10), 0, px(10)); col.addView(row); }
            View d = door(f.optString("icon"), f.optString("name"), "", Color.parseColor(f.optString("color", "#2F7D4A")), v -> showTryList3(f.optString("id")), 120, 44, 20);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(400), px(300));
            lp.setMargins(px(18), 0, px(18), 0);
            row.addView(d, lp);
            if (first == null) first = d;
            if (f.optString("id").equals(t3Fam)) focusMe = d;
            shown++;
        }
        if (shown == 0) col.addView(text("No activities switched on yet.", 46, INK, true));
        center(col);
        addBuddy(60, 830, 190, R.drawable.buddy_idle);
        View f = focusMe != null ? focusMe : first;
        focusMe = null;
        if (f != null) f.requestFocus();
    }

    private void showTryList3(String fam) {
        t3Fam = fam;
        screen = "t3list";
        stopVoice(); root.removeAllViews();
        LinearLayout col = column();
        JSONArray fams = try3.optJSONArray("families");
        int color = 0xFF2F7D4A; String name = fam;
        for (int i = 0; fams != null && i < fams.length(); i++) if (fam.equals(fams.optJSONObject(i).optString("id"))) {
            color = Color.parseColor(fams.optJSONObject(i).optString("color")); name = fams.optJSONObject(i).optString("icon") + "  " + fams.optJSONObject(i).optString("name");
        }
        col.addView(bubble(name, 48));
        col.addView(spacer(24));
        LinearLayout row = null;
        View first = null;
        for (JSONObject a : t3In(fam)) {
            if (row == null || row.getChildCount() == 3) { row = new LinearLayout(this); row.setGravity(Gravity.CENTER); row.setPadding(0, px(10), 0, px(10)); col.addView(row); }
            String adult = a.optString("adult_support");
            String badge = "required".equals(adult) || "recommended".equals(adult) ? "👫 with a grown-up" : " ";
            View c = door(a.optString("pic"), a.optString("title"), badge, color, v -> showTryPreview3(a), 100, 44, 30);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(520), px(320));
            lp.setMargins(px(18), 0, px(18), 0);
            row.addView(c, lp);
            if (first == null) first = c;
            if (a == t3Act) focusMe = c;
        }
        center(col);
        View f = focusMe != null ? focusMe : first;
        focusMe = null;
        if (f != null) f.requestFocus();
    }

    private void showTryPreview3(JSONObject a) {
        t3Act = a;
        screen = "t3prev";
        String recent = prefs.getString("t3recent", "");
        String id = a.optString("activity_id");
        recent = (id + "," + recent.replace(id + ",", ""));
        String[] parts = recent.split(",");
        if (parts.length > 10) recent = TextUtils.join(",", Arrays.copyOf(parts, 10)) + ",";
        prefs.edit().putString("t3recent", recent).apply();
        stopVoice(); root.removeAllViews(); setNight(false);
        LinearLayout col = column();
        col.addView(text(a.optString("pic"), 170, INK, false));
        col.addView(text(a.optString("title"), 64, INK, true));
        col.addView(text(a.optString("short_description"), 44, AMBER, true));
        col.addView(spacer(22));
        StringBuilder need = new StringBuilder();
        JSONArray m = a.optJSONArray("materials");
        for (int i = 0; m != null && i < m.length(); i++) need.append(m.optJSONObject(i).optString("pic")).append(" ").append(m.optJSONObject(i).optString("name")).append("     ");
        JSONObject dur = a.optJSONObject("duration_minutes");
        String adult = a.optString("adult_support");
        String adultLine = "required".equals(adult) ? "👫 Do this with a grown-up" : "recommended".equals(adult) ? "👫 Ask a grown-up to help" : "🙂 You can do this yourself";
        TextView info = bubble("🧺  " + (need.length() == 0 ? "Nothing needed" : need.toString().trim())
                + "\n⏳  About " + (dur == null ? 5 : dur.optInt("max", 5)) + " minutes\n" + adultLine, 38);
        col.addView(info);
        col.addView(spacer(28));
        TextView hear = button("🔊", 0xFF2A2547, v -> say(a.optString("say")));
        TextView go = button("Show me how  ▶", 0xFF6553DB, v -> { t3Step = 0; showTryStep3(); });
        TextView other = button("Another one", 0xFF3A3460, v -> showTryList3(a.optString("category")));
        col.addView(btnRow(hear, go, other));
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_idle);
        go.requestFocus();
    }

    private void showTryStep3() {
        if (minutesLeftToday() < 1) { showResting("TV is resting now.", -1); return; }
        screen = "t3step";
        JSONArray steps = t3Act.optJSONArray("child_steps");
        int n = steps.length();
        if (t3Step >= n) { showStepAway3(false); return; }
        JSONObject s = steps.optJSONObject(t3Step);
        stopVoice(); root.removeAllViews(); setNight(false);
        LinearLayout col = column();
        StringBuilder dots = new StringBuilder();
        for (int i = 0; i < n; i++) dots.append(i < t3Step ? "🟢 " : i == t3Step ? "🔵 " : "⚪ ");
        col.addView(bubble(t3Act.optString("pic") + "  " + t3Act.optString("title") + "     " + dots.toString().trim(), 38));
        col.addView(spacer(26));
        TextView pic = text(s.optString("pic"), 200, INK, false);
        GradientDrawable pb = new GradientDrawable(); pb.setColor(Color.WHITE); pb.setCornerRadius(px(48));
        pic.setBackground(pb); pic.setPadding(px(70), px(20), px(70), px(20)); pic.setElevation(px(8));
        col.addView(pic);
        col.addView(spacer(24));
        col.addView(text(s.optString("text"), 66, INK, true));
        col.addView(spacer(30));
        TextView hear = button("🔊", 0xFF2A2547, v -> say(s.optString("say")));
        TextView back = button("◀  Back", 0xFF3A3460, v -> { if (t3Step > 0) { t3Step--; showTryStep3(); } else showTryPreview3(t3Act); });
        TextView next = button(t3Step == n - 1 ? "Let's go!  ▶" : "Next  ▶", 0xFF6553DB, v -> { t3Step++; showTryStep3(); });
        TextView skip = button("⏭", 0xFF3A3460, v -> showStepAway3(false));
        col.addView(btnRow(hear, back, next, skip));
        center(col);
        addBuddy(80, 810, 190, R.drawable.buddy_idle);
        next.requestFocus();
    }

    /** Quiet, dim screen; the meter is stopped so time away from the TV is never charged. Any key → optional return. */
    private void showStepAway3(boolean rest) {
        stopMeter();
        screen = "t3away";
        stopVoice(); root.removeAllViews(); setNight(true);
        LinearLayout col = column();
        col.addView(text(rest ? "🌙" : t3Act.optString("pic"), 120, Color.WHITE, false));
        Buddy sb = new Buddy(px(220), R.drawable.buddy_sleepy);
        col.addView(sb, new LinearLayout.LayoutParams(px(220), px(220)));
        col.addView(text(rest ? t3Line("rest", "Time to rest.") : t3Line("away", "Now go and try it. You don't need to stay here."), 56, Color.WHITE, true));
        center(col);
        root.setAlpha(1f);
        ui.postDelayed(() -> { if ("t3away".equals(screen)) root.animate().alpha(0.35f).setDuration(3000).start(); }, 60_000);
    }

    private void showReturn3() {
        root.animate().cancel(); root.setAlpha(1f);
        if (minutesLeftToday() < 1) { showResting("TV is resting now.", -1); return; }
        startMeter();
        screen = "t3ret";
        stopVoice(); root.removeAllViews(); setNight(false);
        LinearLayout col = column();
        col.addView(text("👀  " + t3Line("notice", "What did you notice?"), 60, INK, true));
        col.addView(text("Tell someone, if you like.", 40, AMBER, true));
        col.addView(spacer(40));
        TextView another = button("🧪  Try another", 0xFF2F7D4A, v -> showTryHome3());
        TextView home = button("🏠  Home", 0xFF6553DB, v -> showHub());
        TextView rest = button("🌙  Rest", 0xFF3A3460, v -> showStepAway3(true));
        col.addView(btnRow(another, home, rest));
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_idle);
        another.requestFocus();
    }

    // ------------------------------------------------------------------ Try: offline activities (try.json)
    private JSONObject tryAct;
    private int tryStep;
    private String tryCat;

    private void showTryCats() {
        startMeter();
        screen = "trycats";
        stopVoice();
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        col.addView(bubble("🧪 What shall we try today?", 50));
        col.addView(spacer(28));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        JSONArray cats = tryData.optJSONArray("categories");
        View first = null;
        for (int i = 0; cats != null && i < cats.length(); i++) {
            JSONObject c = cats.optJSONObject(i);
            int color = Color.parseColor(c.optString("color", "#2F7D4A"));
            View d = door(c.optString("icon"), c.optString("name"), "", color, v -> showTryList(c.optString("id")), 140, 58, 20);
            if (c.optString("id").equals(tryCat)) focusMe = d;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(390), px(330));
            lp.setMargins(px(20), 0, px(20), 0);
            row.addView(d, lp);
            if (first == null) first = d;
        }
        if (first == null) col.addView(text("Activities are coming soon!", 48, INK, true));
        col.addView(row);
        JSONObject idea = todaysIdea();
        col.addView(spacer(36));
        LinearLayout extra = new LinearLayout(this);
        extra.setGravity(Gravity.CENTER);
        if (idea != null) {
            View ic = door("🌟 " + idea.optString("icon"), idea.optString("title"), "Today's idea", 0xFFC9730A, v -> { tryCat = idea.optString("category"); startTry(idea); }, 90, 50, 32);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(1000), px(300)); lp.setMargins(px(20), 0, px(20), 0);
            extra.addView(ic, lp);
        }
        View bk = door("📖", "My book", "", 0xFF6553DB, v -> showStickerBook(), 110, 50, 20);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(px(540), px(300)); blp.setMargins(px(20), 0, px(20), 0);
        extra.addView(bk, blp);
        col.addView(extra);
        center(col);
        addBuddy(60, 820, 200, R.drawable.buddy_idle);
        if (focusMe != null) focusMe.requestFocus(); else if (first != null) first.requestFocus();
        focusMe = null;
    }

    /** A gentle suggestion (same all day; grown-up activities on weekends). Doing it earns nothing extra. */
    private JSONObject todaysIdea() {
        JSONArray acts = tryData.optJSONArray("activities");
        if (acts == null || acts.length() == 0) return null;
        java.util.Calendar cal = java.util.Calendar.getInstance();
        boolean weekend = cal.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.SATURDAY || cal.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.SUNDAY;
        List<JSONObject> pool = new ArrayList<>();
        for (int i = 0; i < acts.length(); i++) if (acts.optJSONObject(i).optBoolean("grownup") == weekend) pool.add(acts.optJSONObject(i));
        if (pool.isEmpty()) for (int i = 0; i < acts.length(); i++) pool.add(acts.optJSONObject(i));
        return pool.get(new Random(cal.get(java.util.Calendar.DAY_OF_YEAR) * 31L + cal.get(java.util.Calendar.YEAR)).nextInt(pool.size()));
    }

    private void showTryList(String cat) {
        screen = "trylist";
        tryCat = cat;
        stopVoice();
        root.removeAllViews();
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(px(96), px(40), px(96), px(40));
        JSONArray acts = tryData.optJSONArray("activities");
        List<JSONObject> list = new ArrayList<>();
        for (int i = 0; acts != null && i < acts.length(); i++) {
            JSONObject a = acts.optJSONObject(i);
            if (cat.equals(a.optString("category"))) list.add(a);
        }
        Collections.shuffle(list, new Random(System.currentTimeMillis() / 86400000L + cat.hashCode()));   // same 6 all day
        if (list.size() > 6) list = new ArrayList<>(list.subList(0, 6));
        String catName = cat;
        JSONArray cats = tryData.optJSONArray("categories");
        int color = 0xFF2F7D4A;
        for (int i = 0; cats != null && i < cats.length(); i++) if (cat.equals(cats.optJSONObject(i).optString("id"))) {
            catName = cats.optJSONObject(i).optString("icon") + "  " + cats.optJSONObject(i).optString("name");
            color = Color.parseColor(cats.optJSONObject(i).optString("color", "#2F7D4A"));
        }
        TextView cb = bubble(catName, 52);
        col.addView(cb, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        ((LinearLayout.LayoutParams) cb.getLayoutParams()).gravity = Gravity.CENTER_HORIZONTAL;
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        LinearLayout row = null;
        View first = null;
        for (JSONObject a : list) {
            if (row == null || row.getChildCount() == 3) { row = new LinearLayout(this); row.setGravity(Gravity.CENTER); row.setPadding(0, px(12), 0, px(12)); grid.addView(row); }
            View c = door(a.optString("icon", "✨"), a.optString("title"), (a.optBoolean("grownup") ? "👫 with a grown-up" : " "), color, v -> startTry(a), 96, 44, 30);
            if (a == tryAct) focusMe = c;
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(510), px(345));
            lp.setMargins(px(20), px(24), px(20), 0);
            row.addView(c, lp);
            if (first == null) first = c;
        }
        col.addView(grid);
        ScrollView sv = new ScrollView(this);
        sv.addView(col);
        root.addView(sv);
        if (focusMe != null) focusMe.requestFocus(); else if (first != null) first.requestFocus();
        focusMe = null;
    }

    // ------------------------------------------------------------------ Try v2: hook → gather → guided steps → challenge → show & tell → sticker
    private boolean tryVoice;
    private String tryGuess;
    private String tryPhase = "";          // hook | gather | step | challenge | tell | best | sticker | book
    private boolean tryGold, tryDemoDone;
    private int gatherTicked;

    private void startTry(JSONObject a) {
        tryAct = a; tryStep = 0; tryVoice = false; tryGuess = null; tryGold = false;
        screen = "trysteps";
        showTryHook();
    }

    private JSONObject tryLine() { JSONObject l = tryData.optJSONObject("lines"); return l == null ? new JSONObject() : l; }

    /** Plays a demo {frames, motion} inside a row: each frame enters with its motion; calls done at the end. */
    private void playDemo(LinearLayout stage, JSONObject demo, int sizePx, Runnable done) {
        stage.removeAllViews();
        JSONArray fr = demo == null ? null : demo.optJSONArray("frames");
        if (fr == null || fr.length() == 0) { if (done != null) done.run(); return; }
        String motion = demo.optString("motion", "show");
        int n = fr.length();
        long step = Math.max(350, Math.min(700, 2200 / n));
        for (int i = 0; i < n; i++) {
            TextView t = text(fr.optString(i), sizePx, INK, false);
            t.setPadding(px(12), 0, px(12), 0);
            t.setAlpha(0f);
            stage.addView(t);
            final int k = i;
            ui.postDelayed(() -> enter(t, motion, k), k * step);
        }
        ui.postDelayed(() -> { if (done != null) done.run(); }, n * step + 700);
    }

    private void enter(TextView t, String motion, int k) {
        t.setAlpha(1f);
        switch (motion) {
            case "pop": case "count": sfx("pop"); t.setScaleX(0.2f); t.setScaleY(0.2f);
                t.animate().scaleX(1f).scaleY(1f).setInterpolator(new OvershootInterpolator()).setDuration(300).start();
                if (motion.equals("count")) { t.setText(t.getText() + "\n" + (k + 1)); } break;
            case "drop": t.setTranslationY(-px(220)); t.animate().translationY(0).setInterpolator(new android.view.animation.BounceInterpolator()).setDuration(600).start(); break;
            case "stack": case "grow": t.setTranslationY(px(160)); t.setScaleY(0.3f); t.animate().translationY(0).scaleY(1f).setDuration(500).start(); break;
            case "slide": case "line": case "domino": case "draw": t.setTranslationX(-px(200)); t.animate().translationX(0).setDuration(450).start(); break;
            case "spin": t.setRotation(-180); t.animate().rotation(0).setDuration(600).start(); break;
            case "shake": t.animate().translationX(px(14)).setDuration(80).withEndAction(() -> t.animate().translationX(-px(14)).setDuration(80)
                    .withEndAction(() -> t.animate().translationX(0).setDuration(80).start()).start()).start(); break;
            case "pulse": case "point": t.animate().scaleX(1.25f).scaleY(1.25f).setDuration(220).withEndAction(() -> t.animate().scaleX(1f).scaleY(1f).setDuration(220).start()).start(); break;
            case "float": t.setTranslationY(px(30)); t.animate().translationY(-px(10)).setDuration(900).start(); break;
            case "pair": case "fold": t.setTranslationX((k % 2 == 0 ? -1 : 1) * px(120)); t.animate().translationX(0).setDuration(500).start(); break;
            default: t.setAlpha(0f); t.animate().alpha(1f).setDuration(350).start();
        }
    }

    private TextView tryHeader(String extra) {
        String t = tryAct.optString("icon") + "  " + tryAct.optString("title") + (tryAct.optBoolean("grownup") ? "   👫" : "") + (extra == null ? "" : "   " + extra);
        TextView h = bubble(t, 40);
        return h;
    }

    private LinearLayout demoStage() {
        LinearLayout st = new LinearLayout(this);
        st.setGravity(Gravity.CENTER);
        GradientDrawable sb = new GradientDrawable(); sb.setColor(Color.WHITE); sb.setCornerRadius(px(48));
        st.setBackground(sb); st.setElevation(px(8));
        st.setPadding(px(40), px(16), px(40), px(16));
        st.setMinimumWidth(px(700)); st.setMinimumHeight(px(260));
        return st;
    }

    private LinearLayout btnRow(View... vs) {
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        for (View v : vs) {
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(px(18), 0, px(18), 0);
            r.addView(v, lp);
        }
        return r;
    }

    private void tSay(String s) { if (tryVoice && s != null && !s.isEmpty()) say(s); }

    // 1. Hook: the buddy's little problem, as an animation + one line.
    private void showTryHook() {
        tryPhase = "hook";
        stopVoice(); root.removeAllViews(); setNight(false);
        JSONObject hook = tryAct.optJSONObject("hook");
        LinearLayout col = column();
        col.addView(tryHeader(null));
        col.addView(spacer(30));
        LinearLayout stage = demoStage();
        col.addView(stage);
        col.addView(spacer(26));
        col.addView(text(hook == null ? tryAct.optString("title") : hook.optString("text"), 60, INK, true));
        col.addView(spacer(30));
        TextView hear = button("🔊", 0xFF2A2547, v -> { tryVoice = true; say(hook == null ? "" : hook.optString("say")); });
        TextView go = button("Let's go!  ▶", 0xFF6553DB, v -> { sfx("pop"); showTryGather(); });
        col.addView(btnRow(hear, go));
        center(col);
        addBuddy(80, 790, 220, R.drawable.buddy_thinking);
        go.requestFocus(); pulse(hear);
        sfx("chirp");
        playDemo(stage, hook == null ? null : hook.optJSONObject("scene"), 150, () -> {
            if (buddy != null) buddy.hop();
            for (int i = 0; i < stage.getChildCount(); i++) {                // keep the scene alive: a slow bob, out of phase
                View c = stage.getChildAt(i);
                ValueAnimator bob = ValueAnimator.ofFloat(0, 1); bob.setDuration(1400 + i * 200L);
                bob.setRepeatMode(ValueAnimator.REVERSE); bob.setRepeatCount(ValueAnimator.INFINITE);
                bob.addUpdateListener(x -> c.setTranslationY(-px(14) * (float) x.getAnimatedValue()));
                bob.start();
            }
        });
    }

    // 2. Gather: one tile per thing; OK ticks it.
    private void showTryGather() {
        JSONArray g = tryAct.optJSONArray("gather");
        if (g == null || g.length() == 0) { tryStep = 0; showTryStep(); return; }
        tryPhase = "gather";
        stopVoice(); root.removeAllViews();
        LinearLayout col = column();
        col.addView(tryHeader(null));
        col.addView(spacer(24));
        col.addView(text("🧺 Get these!", 60, INK, true));
        col.addView(spacer(24));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        gatherTicked = 0;
        List<JSONObject> items = new ArrayList<>();
        if (tryAct.optBoolean("grownup")) { try { items.add(new JSONObject().put("pic", "👫").put("name", "Amma or Appa")); } catch (Exception ignored) { } }
        for (int i = 0; i < g.length(); i++) items.add(g.optJSONObject(i));
        View first = null;
        for (JSONObject it : items) {
            String face = it.optString("pic") + "\n" + it.optString("name");
            TextView t = button(face, 0xFF3A3460, null);
            android.text.SpannableString sp = new android.text.SpannableString(face);
            int a = it.optString("pic").length();
            sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(96)), 0, a, 0);
            sp.setSpan(new android.text.style.AbsoluteSizeSpan(px(32)), a + 1, sp.length(), 0);
            t.setText(sp);
            t.setOnClickListener(v -> {
                if (v.getTag() != null) return;
                v.setTag("ok"); sfx("pop"); celebrate(v); markGold((TextView) v);
                ((TextView) v).append("  ✓");
                gatherTicked++;
                if (gatherTicked >= items.size()) {
                    sfx("chime"); if (buddy != null) buddy.happy();
                    whyText.setText("✅ " + tryLine().optString("gather_done", "All set!"));
                    tSay(tryLine().optString("gather_done"));
                    ui.postDelayed(() -> { tryStep = 0; showTryStep(); }, 1400);
                } else for (int j = 0; j < row.getChildCount(); j++) if (row.getChildAt(j).getTag() == null) { row.getChildAt(j).requestFocus(); break; }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(items.size() > 4 ? 250 : 290), px(260));
            lp.setMargins(px(16), 0, px(16), 0);
            row.addView(t, lp);
            if (first == null) first = t;
        }
        col.addView(row);
        whyText = text("👉 OK  =  ✓  I have it", 40, AMBER, true);
        col.addView(spacer(20));
        col.addView(whyText);
        TextView hear = button("🔊", 0xFF2A2547, v -> { tryVoice = true; say(tryAct.optString("gather_say")); });
        TextView ready = button("Ready  ▶", 0xFF6553DB, v -> { tryStep = 0; showTryStep(); });
        col.addView(spacer(16));
        col.addView(btnRow(hear, ready));
        center(col);
        addBuddy(80, 790, 200, R.drawable.buddy_idle);
        first.requestFocus();
        tSay(tryAct.optString("gather_say"));
    }

    // 3. Guided steps: demo plays, then "✓ I did it" wakes up; 🔁 replay; 🙋 stuck.
    private void showTryStep() {
        stopVoice(); root.removeAllViews();
        List<JSONObject> steps = new ArrayList<>();
        JSONArray sa = tryAct.optJSONArray("steps");
        for (int i = 0; sa != null && i < sa.length(); i++) steps.add(sa.optJSONObject(i));
        int n = steps.size();
        if (tryStep >= n) {
            if ("away".equals(tryAct.optString("mode"))) { showTryGo(steps); return; }
            showTryChallenge(); return;
        }
        tryPhase = "step";
        if (minutesLeftToday() < 1) { showResting("TV is resting now.", -1); return; }
        JSONObject st = steps.get(tryStep);
        LinearLayout col = column();
        StringBuilder dots = new StringBuilder();
        for (int i = 0; i < n; i++) dots.append(i < tryStep ? "🟢" : i == tryStep ? "🔵" : "⚪");
        col.addView(tryHeader(dots.toString()));
        col.addView(spacer(22));
        LinearLayout stage = demoStage();
        col.addView(stage);
        col.addView(spacer(22));
        col.addView(text(st.optString("text"), 64, INK, true));
        col.addView(spacer(26));
        JSONArray gc = tryAct.optJSONArray("guess_choices");
        boolean guessStep = gc != null && gc.length() > 0 && tryStep == tryAct.optInt("guess_step", -1);
        TextView hear = button("🔊", 0xFF2A2547, v -> { tryVoice = true; say(st.optString("say")); });
        TextView replay = button("🔁", 0xFF2A2547, v -> { sfx("pop"); playDemo(stage, st.optJSONObject("demo"), 140, null); });
        TextView stuck = button("🙋  Stuck", 0xFF3A3460, v -> showStuck(st, stage));
        View main;
        LinearLayout row;
        if (guessStep) {
            List<View> vs = new ArrayList<>(Arrays.asList(hear));
            TextView firstG = null;
            for (int i = 0; i < gc.length(); i++) {
                JSONObject go = gc.optJSONObject(i);
                String o = go == null ? gc.optString(i) : go.optString("pic"), os = go == null ? "" : go.optString("say");
                TextView b = button(o, 0xFF3A3460, v -> { tryGuess = o; sfx("pop"); celebrate(v); tSay(os); ui.postDelayed(() -> { tryStep++; showTryStep(); }, tryVoice ? 1600 : 700); });
                fit(b, 90, 40);
                vs.add(b);
                if (firstG == null) firstG = b;
            }
            row = btnRow(vs.toArray(new View[0]));
            main = firstG;
        } else {
            TextView did = button("✓  I did it!", 0xFF2F7D4A, v -> {
                if (!tryDemoDone) { sfx("bump"); return; }
                sfx("chime"); celebrate(v); if (buddy != null) buddy.happy();
                ui.postDelayed(() -> { tryStep++; showTryStep(); }, 700);
            });
            did.setAlpha(0.45f);
            row = btnRow(hear, replay, stuck, did);
            main = did;
        }
        col.addView(row);
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_idle);
        tryDemoDone = false;
        main.requestFocus();
        if (tryStep == 0 && !tryVoice) pulse(hear);
        tSay(st.optString("say"));
        playDemo(stage, st.optJSONObject("demo"), 140, () -> { tryDemoDone = true; main.setAlpha(1f); pulse(main); });
        scheduleTryCheer();
    }

    private Runnable tryCheer;

    private void scheduleTryCheer() {                          // calm company while he works: a chirp + hop every 25 s, no timer
        if (tryCheer != null) ui.removeCallbacks(tryCheer);
        tryCheer = new Runnable() { @Override public void run() {
            if (!"step".equals(tryPhase)) return;
            sfx("chirp"); if (buddy != null) buddy.hop();
            ui.postDelayed(this, 25_000);
        } };
        ui.postDelayed(tryCheer, 25_000);
    }

    private void showStuck(JSONObject st, LinearLayout stage) {
        JSONArray s = st.optJSONArray("stuck");
        if (s == null || s.length() == 0) s = tryData.optJSONArray("stuck_generic");
        if (s == null || s.length() == 0) return;
        JSONObject h = s.optJSONObject(stuckIdx++ % s.length());
        sfx("chirp");
        stage.removeAllViews();
        TextView p = text(h.optString("pic") + "\n" + h.optString("text"), 72, INK, true);
        stage.addView(p);
        p.setScaleX(0.3f); p.setScaleY(0.3f);
        p.animate().scaleX(1f).scaleY(1f).setInterpolator(new OvershootInterpolator()).setDuration(300).start();
        tryDemoDone = true;
        tSay(h.optString("say"));
    }

    private int stuckIdx;

    // 4. Optional challenge.
    private void showTryChallenge() {
        JSONObject ch = tryAct.optJSONObject("challenge");
        boolean again = prefs.getString("stickers", "").contains("|" + tryAct.optString("id") + "|");
        if (again && tryAct.has("twist")) ch = tryAct.optJSONObject("twist");
        if (ch == null) { showTryTell(); return; }
        tryPhase = "challenge";
        final JSONObject c = ch;
        stopVoice(); root.removeAllViews();
        LinearLayout col = column();
        col.addView(tryHeader(null));
        col.addView(spacer(24));
        col.addView(text("🏆 " + tryLine().optString("challenge_q", "Want a challenge?"), 56, INK, true));
        col.addView(spacer(20));
        LinearLayout stage = demoStage();
        col.addView(stage);
        col.addView(spacer(18));
        col.addView(text(c.optString("text"), 52, AMBER, true));
        col.addView(spacer(24));
        TextView hear = button("🔊", 0xFF2A2547, v -> { tryVoice = true; say(c.optString("say")); });
        TextView yes = button("💪  I did it!", 0xFFC9730A, v -> { tryGold = true; sfx("twinkle"); celebrate(v); ui.postDelayed(this::showTryTell, 800); });
        TextView no = button("Not today  ▶", 0xFF3A3460, v -> showTryTell());
        col.addView(btnRow(hear, yes, no));
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_happy_wave);
        yes.requestFocus();
        tSay(tryLine().optString("challenge_q"));
        JSONObject demo = c.optJSONObject("demo");
        if (demo == null) { try { demo = new JSONObject().put("frames", new JSONArray().put(c.optString("pic"))).put("motion", "pop"); } catch (Exception ignored) { } }
        playDemo(stage, demo, 140, null);
    }

    // 5. Show & tell: the buddy listens; parent card with the word in Kannada/Hindi; guess check; best part.
    private void showTryTell() {
        tryPhase = "tell";
        screen = "trydone";
        stopVoice(); root.removeAllViews();
        sfx("fanfare");
        LinearLayout col = column();
        addBuddy(140, 110, 260, R.drawable.buddy_happy_wave);
        String done = tryAct.optString("done", "Wow! Tell me all about it!");
        TextView big = text("👂  " + done, 56, INK, true);
        col.addView(big);
        col.addView(spacer(18));
        JSONObject w = tryAct.optJSONObject("word");
        if (w != null) {
            TextView card = bubble("👫 For Amma/Appa:  " + w.optString("en") + "  ·  ಕನ್ನಡ " + w.optString("kn") + " (" + w.optString("kn_roman") + ")  ·  हिंदी " + w.optString("hi"), 34);
            col.addView(card);
            col.addView(spacer(18));
        }
        TextView hear = button("🔊", 0xFF2A2547, v -> say(done));
        View focus;
        if (tryGuess != null) {
            col.addView(text("You guessed  " + tryGuess + "   Were you right?", 46, INK, true));
            col.addView(spacer(18));
            TextView yes = button("👍  Yes!", 0xFF2F7D4A, v -> { tryGuess = null; sfx("chime"); celebrate(v); tSay(tryLine().optString("guess_reply")); ui.postDelayed(this::showTryBest, 1100); });
            TextView no = button("🤔  Surprise!", 0xFF5B47C9, v -> { tryGuess = null; sfx("twinkle"); celebrate(v); tSay(tryLine().optString("guess_reply")); ui.postDelayed(this::showTryBest, 1100); });
            col.addView(btnRow(hear, yes, no));
            focus = yes;
            tSay(tryAct.optString("guess_back"));
        } else {
            TextView next = button("Next  ▶", 0xFF6553DB, v -> showTryBest());
            col.addView(btnRow(hear, next));
            focus = next;
            tSay(done);
        }
        center(col);
        focus.requestFocus();
        celebrate(big);
    }

    private void showTryBest() {
        tryPhase = "best";
        stopVoice(); root.removeAllViews();
        LinearLayout col = column();
        col.addView(text("⭐ " + tryLine().optString("best_q", "Which part was the best?"), 56, INK, true));
        col.addView(spacer(28));
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        JSONArray sa = tryAct.optJSONArray("steps");
        View first = null;
        for (int i = 0; sa != null && i < sa.length() && i < 5; i++) {
            String pic = sa.optJSONObject(i).optString("pic");
            TextView b = button(pic, 0xFF3A3460, v -> { sfx("chime"); celebrate(v); tSay(tryLine().optString("best_reply")); ui.postDelayed(this::showTrySticker, 1000); });
            fit(b, 90, 36);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(240), px(200));
            lp.setMargins(px(14), 0, px(14), 0);
            row.addView(b, lp);
            if (first == null) first = b;
        }
        col.addView(row);
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_happy_wave);
        if (first != null) first.requestFocus(); else showTrySticker();
        tSay(tryLine().optString("best_q"));
    }

    // 6. Sticker into his book (only what he made; no counts, no empty slots).
    private void showTrySticker() {
        tryPhase = "sticker";
        stopVoice(); root.removeAllViews();
        String id = tryAct.optString("id");
        String book = prefs.getString("stickers", "");
        boolean again = book.contains("|" + id + "|") || book.contains("|" + id + "*|");
        if (!again) book += "|" + id + (tryGold ? "*" : "") + "|";
        else if (tryGold && !book.contains("|" + id + "*|")) book = book.replace("|" + id + "|", "|" + id + "*|");
        prefs.edit().putString("stickers", book).putInt("tryDone", prefs.getInt("tryDone", 0) + 1).apply();
        LinearLayout col = column();
        TextView st = text(tryAct.optString("sticker", tryAct.optString("icon")), 220, INK, false);
        GradientDrawable sb = new GradientDrawable(); sb.setShape(GradientDrawable.OVAL);
        sb.setColor(Color.WHITE); sb.setStroke(px(14), tryGold ? 0xFFF5B800 : 0xFFE0E4F0);
        st.setBackground(sb); st.setPadding(px(50), px(30), px(50), px(30));
        col.addView(st);
        col.addView(spacer(20));
        String line = again ? tryLine().optString("sticker_again") : tryGold ? tryLine().optString("sticker_gold") : tryLine().optString("sticker");
        col.addView(text(line, 50, INK, true));
        col.addView(spacer(28));
        TextView bookB = button("📖  My book", 0xFF6553DB, v -> showStickerBook());
        TextView more = button("🧪  Another one", 0xFF2F7D4A, v -> showTryList(tryAct.optString("category")));
        TextView home = button("🏠", 0xFF3A3460, v -> showHub());
        col.addView(btnRow(bookB, more, home));
        center(col);
        addBuddy(80, 800, 200, R.drawable.buddy_happy_wave);
        st.setScaleX(0.1f); st.setScaleY(0.1f); st.setRotation(-30);
        st.animate().scaleX(1f).scaleY(1f).rotation(0).setInterpolator(new OvershootInterpolator()).setDuration(600).start();
        sfx(tryGold ? "fanfare" : "twinkle");
        celebrate(st);
        bookB.requestFocus();
        tSay(line);
    }

    private void showStickerBook() {
        screen = "trydone"; tryPhase = "book";
        stopVoice(); root.removeAllViews();
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(px(150), px(80), px(150), px(60));
        GradientDrawable paper = new GradientDrawable(); paper.setColor(0xFFFFFBF0); paper.setCornerRadius(px(48)); paper.setStroke(px(6), 0xFFE9DFC6);
        col.setBackground(null);
        TextView title = bubble("📖  " + tryLine().optString("book", "My book"), 46);
        col.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        String book = prefs.getString("stickers", "");
        JSONArray cats = tryData.optJSONArray("categories"), acts = tryData.optJSONArray("activities");
        View first = null;
        for (int c = 0; cats != null && c < cats.length(); c++) {
            JSONObject cat = cats.optJSONObject(c);
            LinearLayout row = new LinearLayout(this);
            row.setGravity(Gravity.CENTER_VERTICAL);
            for (int i = 0; acts != null && i < acts.length(); i++) {
                JSONObject a = acts.optJSONObject(i);
                if (!cat.optString("id").equals(a.optString("category"))) continue;
                String id = a.optString("id");
                boolean has = book.contains("|" + id + "|"), gold = book.contains("|" + id + "*|");
                if (!has && !gold) continue;                     // only stickers he earned
                TextView s = text(a.optString("sticker", a.optString("icon")), 110, INK, false);
                GradientDrawable sb = new GradientDrawable(); sb.setShape(GradientDrawable.OVAL);
                sb.setColor(Color.WHITE); sb.setStroke(px(8), gold ? 0xFFF5B800 : 0xFFE0E4F0);
                s.setBackground(sb); s.setPadding(px(20), px(10), px(20), px(10));
                s.setFocusable(true);
                GradientDrawable ring = new GradientDrawable(); ring.setShape(GradientDrawable.OVAL); ring.setColor(Color.WHITE);
                ring.setStroke(px(12), 0xFFF59E0B);
                s.setOnFocusChangeListener((v, h) -> { v.setBackground(h ? ring : sb); v.animate().scaleX(h ? 1.15f : 1f).scaleY(h ? 1.15f : 1f).setDuration(140).start(); });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.setMargins(px(10), px(8), px(10), px(8));
                row.addView(s, lp);
                if (first == null) first = s;
            }
            if (row.getChildCount() == 0) continue;
            JSONObject page = cat.optJSONObject("page");
            col.addView(text((page == null ? cat.optString("icon") + " " + cat.optString("name") : page.optString("icon") + " " + page.optString("title")), 40, INK, true));
            HorizontalScrollView hs = new HorizontalScrollView(this);
            hs.addView(row);
            col.addView(hs);
        }
        if (first == null) col.addView(text("🌱 Your first sticker is waiting in Try!", 46, INK, true));
        TextView back = button("🧪  Try", 0xFF2F7D4A, v -> showTryCats());
        col.addView(spacer(20));
        col.addView(back, new LinearLayout.LayoutParams(px(440), px(120)));
        ScrollView sv = new ScrollView(this);
        sv.addView(col);
        root.addView(sv);
        (first != null ? first : back).requestFocus();
    }

    /** away-mode: strip of step pictures, the buddy waits, "I'm back!" → show & tell. */
    /** "Go do it!": strip of all step pictures to remember, then the buddy waits calmly in her nest. */
    private void showTryGo(List<JSONObject> steps) {
        stopMeter();
        screen = "trysteps";
        LinearLayout col = column();
        col.addView(text("Go do it! 🚀", 80, INK, true));
        col.addView(spacer(18));
        LinearLayout strip = new LinearLayout(this);
        strip.setGravity(Gravity.CENTER);
        for (int i = 0; i < steps.size(); i++) {
            TextView p = text((i + 1) + "\n" + steps.get(i).optString("pic"), 56, INK, true);
            GradientDrawable pb = new GradientDrawable(); pb.setColor(Color.WHITE); pb.setCornerRadius(px(28));
            p.setBackground(pb);
            p.setPadding(px(18), px(8), px(18), px(12));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(px(10), 0, px(10), 0);
            strip.addView(p, lp);
        }
        col.addView(strip);
        col.addView(spacer(22));
        String show = tryAct.optString("show", "Show Amma or Appa!");
        col.addView(text(show, 46, AMBER, true));
        col.addView(spacer(18));
        JSONArray cats = tryData.optJSONArray("categories");
        String wait = "I'll wait here in my nest!";
        for (int i = 0; cats != null && i < cats.length(); i++) if (tryAct.optString("category").equals(cats.optJSONObject(i).optString("id"))) wait = cats.optJSONObject(i).optString("wait", wait);
        col.addView(text("🪺 " + wait, 40, INK_SOFT, true));
        col.addView(spacer(30));
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        String finalWait = wait;
        TextView hear = button("🔊", 0xFF2A2547, v -> say(show, () -> say(finalWait)));
        TextView back = button("🙋  I'm back!", 0xFF6553DB, v -> showTryTell());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(px(20), 0, px(20), 0);
        r.addView(hear, lp);
        r.addView(back, lp);
        col.addView(r);
        center(col);
        addBuddy(80, 790, 220, R.drawable.buddy_sleepy);
        back.requestFocus();
        sfx("chirp");
        if (tryVoice) ui.postDelayed(() -> say(show, () -> say(finalWait)), 400);
    }


    // ------------------------------------------------------------------ About Me / Explorer Passport (aboutme_design.md)
    private String childName() { return getString(R.string.child_name).trim(); }

    private int childAge() {
        String b = getString(R.string.child_birth).trim();          // YYYY-MM
        if (!b.matches("\\d{4}-\\d{2}")) return -1;
        java.util.Calendar c = java.util.Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int y = Integer.parseInt(b.substring(0, 4)), m = Integer.parseInt(b.substring(5, 7));
        int age = c.get(java.util.Calendar.YEAR) - y - ((c.get(java.util.Calendar.MONTH) + 1) < m ? 1 : 0);
        return age > 0 && age < 12 ? age : -1;
    }

    private int okDays(String id) { return prefs.getStringSet("okdays:" + id, new HashSet<>()).size(); }

    private void markOk(String id) {
        Set<String> d = new HashSet<>(prefs.getStringSet("okdays:" + id, new HashSet<>()));
        d.add(today());
        prefs.edit().putStringSet("okdays:" + id, d).apply();
    }

    private boolean eligible(String id) {
        boolean all = getResources().getBoolean(R.bool.aboutme_unlock_all);
        boolean name = childName().length() >= 2, age = childAge() > 0;
        switch (id) {
            case "me-002": return !prefs.contains("fav:colour") || all;
            case "me-003": return !prefs.contains("fav:animal") || all;
            case "me-001": return name;
            case "me-004": return age;
            case "me-007": return name && (all || okDays("me-001") >= 2);
            case "me-012": return name && childName().length() >= 3 && (all || okDays("me-007") >= 2);
            default: return false;
        }
    }

    /** One About Me item per warm-up: the first eligible one not already done today. */
    private Item pickAboutMe() {
        String[] ladder = {"me-002", "me-003", "me-001", "me-004", "me-007", "me-012"};
        List<String> ids = new ArrayList<>();
        for (String id : ladder) if (eligible(id) && !prefs.getString("doneday:" + id, "").equals(today())) ids.add(id);
        if (ids.isEmpty()) return null;
        if (getResources().getBoolean(R.bool.aboutme_unlock_all)) Collections.shuffle(ids, rng);
        for (int i = 0; i < aboutBank.length(); i++) {
            JSONObject o = aboutBank.optJSONObject(i);
            if (o == null || !o.optString("id").equals(ids.get(0))) continue;
            Item it = new Item(o.optString("prompt"), "", new String[0], -1);
            it.about = o;
            it.say = o.optString("say", it.prompt).replace("{name}", childName()).replace("{age}", String.valueOf(childAge()));
            it.why = "";
            return it;
        }
        return null;
    }

    private static final String CONFUSABLE = "BDPQMNUWIJLCGOE";

    private List<String> letterDistractors(String avoid, int count) {
        List<String> out = new ArrayList<>();
        String name = childName().toUpperCase(Locale.US);
        String pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (int guard = 0; out.size() < count && guard < 200; guard++) {
            String c = String.valueOf(pool.charAt(rng.nextInt(26)));
            boolean confusable = CONFUSABLE.contains(c) && CONFUSABLE.contains(avoid);
            if (name.contains(c) || out.contains(c) || c.equals(avoid) || confusable) continue;
            out.add(c);
        }
        return out;
    }

    private void showAboutItem(Item it) {
        JSONObject o = it.about;
        String id = o.optString("id"), fmt = o.optString("format");
        root.removeAllViews();
        setNight(false);
        LinearLayout col = column();
        col.addView(text("📘 Explorer Passport", 36, 0xFFFFD36B, true));
        col.addView(spacer(16));
        col.addView(text(it.prompt, 58, Color.WHITE, true));
        col.addView(spacer(40));
        TextView hear = button("🔊  Hear it", 0xFF2A2547, v -> { usedHear = true; say(it.say); });
        hear.setTextSize(TypedValue.COMPLEX_UNIT_PX, px(36));
        whyText = text("", 40, 0xFFFFD36B, true);
        usedHear = false;
        if (fmt.equals("colour_wheel") || fmt.equals("picture_grid")) {
            JSONArray ch = o.optJSONArray("choices");
            LinearLayout grid = new LinearLayout(this);
            grid.setOrientation(LinearLayout.VERTICAL);
            LinearLayout rowL = null;
            View first = null;
            for (int i = 0; ch != null && i < ch.length(); i++) {
                if (i % 5 == 0) { rowL = new LinearLayout(this); rowL.setGravity(Gravity.CENTER); grid.addView(rowL); }
                JSONObject c = ch.optJSONObject(i);
                String pic = c.optString("pic"), cid = c.optString("id");
                TextView t = button(pic, 0xFF3A3460, null);
                fit(t, 84, 30);
                t.setOnClickListener(v -> {
                    prefs.edit().putString(fmt.equals("colour_wheel") ? "fav:colour" : "fav:animal", cid).apply();
                    finishAbout(id, t, cid.equals("cant_choose") ? "That's OK! You can choose another day." : "Stamp! A new page in your Explorer Passport!");
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(200), px(170));
                lp.setMargins(px(14), px(14), px(14), px(14));
                rowL.addView(t, lp);
                if (first == null) first = t;
            }
            col.addView(grid);
            col.addView(spacer(20)); col.addView(hear); col.addView(spacer(10)); col.addView(whyText);
            center(col);
            if (first != null) first.requestFocus();
            return;
        }
        String name = childName().toUpperCase(Locale.US);
        if (fmt.equals("order_tiles")) {
            String target = name.substring(0, Math.min(3, name.length()));
            List<String> tiles = new ArrayList<>();
            for (char c : target.toCharArray()) tiles.add(String.valueOf(c));
            tiles.addAll(letterDistractors(target.substring(0, 1), 1));
            Collections.shuffle(tiles, rng);
            TextView train = text("🚂  _  _  _", 96, Color.WHITE, true);
            col.addView(train);
            col.addView(spacer(30));
            LinearLayout r = new LinearLayout(this);
            r.setGravity(Gravity.CENTER);
            final int[] pos = {0};
            final StringBuilder built = new StringBuilder();
            TextView firstBtn = null;
            for (String tl : tiles) {
                TextView t = button(tl, 0xFF3A3460, null);
                fit(t, 90, 30);
                t.setOnClickListener(v -> {
                    if (pos[0] >= target.length()) return;
                    if (tl.equals(String.valueOf(target.charAt(pos[0])))) {
                        built.append(tl);
                        pos[0]++;
                        StringBuilder show = new StringBuilder("🚂 ");
                        for (int k = 0; k < target.length(); k++) show.append("  ").append(k < built.length() ? built.charAt(k) : '_');
                        train.setText(show.toString());
                        t.setAlpha(0.25f); t.setFocusable(false);
                        celebrate(t);
                        for (int k = 0; k < r.getChildCount(); k++) if (r.getChildAt(k).isFocusable()) { r.getChildAt(k).requestFocus(); break; }
                        if (pos[0] == target.length()) { markOk(id); finishAbout(id, train, "Your name train is ready! Stamp!"); }
                    } else {
                        whyText.setText("Try another one!");
                        t.animate().translationXBy(px(20)).setDuration(80).withEndAction(() -> t.animate().translationXBy(-px(20)).setDuration(80).start()).start();
                    }
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(220), px(200));
                lp.setMargins(px(20), 0, px(20), 0);
                r.addView(t, lp);
                if (firstBtn == null) firstBtn = t;
            }
            col.addView(r);
            col.addView(spacer(30)); col.addView(hear); col.addView(spacer(10)); col.addView(whyText);
            center(col);
            if (firstBtn != null) firstBtn.requestFocus();
            return;
        }
        // pick_letter (first/last) and cake: 3 choices, one right answer from the parent's setup
        List<String> choices = new ArrayList<>();
        String answer;
        if (fmt.equals("cake")) {
            int a = childAge();
            answer = cake(a);
            choices.add(answer);
            if (a - 1 >= 1) choices.add(cake(a - 1));
            choices.add(cake(a + 1));
        } else {
            String letter = o.optString("check").equals("last_letter") ? name.substring(name.length() - 1) : name.substring(0, 1);
            answer = letter + " " + letter.toLowerCase(Locale.US);
            choices.add(answer);
            for (String d : letterDistractors(letter, 2)) choices.add(d + " " + d.toLowerCase(Locale.US));
        }
        Collections.shuffle(choices, rng);
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        TextView firstBtn = null;
        final int[] tries = {0};
        for (String c : choices) {
            TextView t = button(c, 0xFF3A3460, null);
            fit(t, fmt.equals("cake") ? 48 : 84, 22);
            t.setOnClickListener(v -> {
                if (c.equals(answer)) { markOk(id); finishAbout(id, t, "Yes! That's you! Stamp!"); }
                else if (++tries[0] == 1) { t.setAlpha(0.3f); t.setFocusable(false); whyText.setText("Hmm, try again!"); }
                else { finishAbout(id, t, "Let's learn it together. Ask Amma or Appa!"); }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(300), px(fmt.equals("cake") ? 260 : 200));
            lp.setMargins(px(24), 0, px(24), 0);
            r.addView(t, lp);
            if (firstBtn == null) firstBtn = t;
        }
        col.addView(r);
        col.addView(spacer(30)); col.addView(hear); col.addView(spacer(10)); col.addView(whyText);
        center(col);
        if (firstBtn != null) firstBtn.requestFocus();
    }

    private String cake(int candles) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < candles; i++) b.append("🕯");
        return b + "\n🎂";
    }

    private void finishAbout(String id, View anchor, String message) {
        prefs.edit().putString("doneday:" + id, today()).apply();
        celebrate(anchor);
        Item it = warmItems.get(wIndex);
        it.done = true; it.feedback = message;
        whyText.setText(message);
        if (usedHear) say(message);
        TextView nb = button("Next  ▶", 0xFF6553DB, v -> { wIndex++; showItem(); });
        ((LinearLayout) whyText.getParent()).addView(nb);
        ui.postDelayed(nb::requestFocus, 450);
    }

    // ------------------------------------------------------------------ home rows
    private void beginSession(int minutes) {
        sessionMin = minutes;
        sessionUsedMs = 0; headsUpShown = false; ending = false; skipsLeft = 2;
        sessionActive = true; paused = false; lastTick = SystemClock.elapsedRealtime();
        ui.removeCallbacks(tick);
        ui.post(tick);
        showHome();
    }

    private void showHome() {
        root.removeAllViews();
        ScrollView sv = new ScrollView(this);
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(px(96), px(54), px(96), px(54));
        sv.addView(col);
        setNight(false);
        LinearLayout greet = new LinearLayout(this);
        greet.setGravity(Gravity.CENTER_VERTICAL);
        Buddy hb = new Buddy(px(180), R.drawable.buddy_happy_wave);
        greet.addView(hb, new LinearLayout.LayoutParams(px(180), px(180)));
        String nm = childName().isEmpty() ? "friend" : childName();
        TextView bub = bubble("Hi " + nm + "! What shall we explore?", 48);
        LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bl.setMargins(px(24), 0, px(40), 0);
        greet.addView(bub, bl);
        homeTitle = bubble("⏳ " + sessionMin + " min", 40);
        greet.addView(homeTitle);
        col.addView(greet);
        ui.postDelayed(() -> hb.pose(R.drawable.buddy_idle), 1800);
        View first = null;
        List<Integer> order = new ArrayList<>();
        for (int r = 0; r < rows.length(); r++) order.add(r);          // parent-curated row order, unchanged
        try {
            for (int r = 0; r < rows.length(); r++) {
                JSONObject row = rows.getJSONObject(r);
                JSONArray vids = row.getJSONArray("videos");
                for (int i = 0; i < vids.length(); i++) { vids.getJSONObject(i).put("row", row.optString("id")); vids.getJSONObject(i).put("rowColor", row.optString("color")); }
            }
            for (int r : order) {
                JSONObject row = rows.getJSONObject(r);
                JSONArray vids = row.getJSONArray("videos");
                List<JSONObject> list = new ArrayList<>();
                for (int i = 0; i < vids.length(); i++) list.add(vids.getJSONObject(i));
                // stable curated order; videos started in the last 7 days move to the back (anti-repeat only)
                List<JSONObject> fresh = new ArrayList<>(), recent = new ArrayList<>();
                for (JSONObject v : list) (seenRecently(v.optString("id")) ? recent : fresh).add(v);
                list = new ArrayList<>(fresh); list.addAll(recent);
                first = addRow(col, row.getString("name"), Color.parseColor(row.getString("color")),
                        list.subList(0, Math.min(10, list.size())), first);
            }
        } catch (Exception e) {
            Log.e(TAG, "rows", e);
        }
        root.addView(sv);
        Buddy peek = addBuddy(0, 0, 96, R.drawable.buddy_idle);
        peek.setTag("peek");
        peek.setX(-500);
        final View f0 = first;
        if (first != null) { first.requestFocus(); ui.postDelayed(() -> { if (f0.hasFocus()) perch(f0); }, 400); }
    }

    private View addRow(LinearLayout col, String name, int color, List<JSONObject> list, View first) {
        if (list.isEmpty()) return first;
        LinearLayout head = new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        TextView disc = text(rowIcon(name), 44, Color.WHITE, true);
        GradientDrawable dd = new GradientDrawable(); dd.setShape(GradientDrawable.OVAL); dd.setColor(color); dd.setStroke(px(4), Color.WHITE);
        disc.setBackground(dd);
        head.addView(disc, new LinearLayout.LayoutParams(px(84), px(84)));
        TextView label = text(name.replace("⭐ ", ""), 48, INK, true, Gravity.START);
        label.setPadding(px(22), 0, px(36), 0);
        head.addView(label);
        GradientDrawable pill = new GradientDrawable(); pill.setColor(0xCCFFFFFF); pill.setCornerRadius(px(50));
        head.setBackground(pill);
        head.setPadding(px(8), px(6), px(8), px(6));
        LinearLayout.LayoutParams hl = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hl.setMargins(0, px(40), 0, px(4));
        col.addView(head, hl);
        HorizontalScrollView hs = new HorizontalScrollView(this);
        hs.setHorizontalScrollBarEnabled(false);
        hs.setClipToPadding(false);
        hs.setPadding(px(24), px(40), px(60), px(30));
        LinearLayout strip = new LinearLayout(this);
        hs.addView(strip);
        final List<JSONObject> rowList = new ArrayList<>(list);
        for (int i = 0; i < rowList.size(); i++) {
            final int ii = i;
            JSONObject v = rowList.get(i);
            int c = color;
            try { c = Color.parseColor(v.optString("rowColor", "#6553DB")); } catch (Exception ignored) { }
            View t = tile(v, name.startsWith("⭐") ? c : color, x -> playList(rowList, ii));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(440), ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, px(36), 0);
            strip.addView(t, lp);
            if (first == null) first = t;
        }
        col.addView(hs);
        return first;
    }

    private static String rowIcon(String name) {
        String n = name.toLowerCase(Locale.US);
        if (n.contains("picked")) return "★";
        if (n.contains("wonder")) return "🔍";
        if (n.contains("move") || n.contains("sport")) return "⚽";
        if (n.contains("number")) return "🔢";
        if (n.contains("story & word") || n.contains("word")) return "📖";
        if (n.contains("kind")) return "💞";
        if (n.contains("india")) return "🪷";
        if (n.contains("make") || n.contains("draw")) return "🖍";
        if (n.contains("giggle")) return "😄";
        if (n.contains("healthy")) return "🪥".equals("") ? "🧼" : "🧼";
        if (n.contains("hindi") || n.contains("kannada")) return "ಅ";
        return "▶";
    }

    private void playList(List<JSONObject> list, int index) {
        queue.clear();
        for (int i = 0; i < list.size(); i++) queue.add(list.get((index + i) % list.size()));
        qIndex = 0;
        maxFrac = 0;
        showPlayer();
    }

    /** Picture tile (design system): white card, coloured frame, rounded thumbnail, ink title; gold glow on focus. */
    private View tile(JSONObject v, int color, View.OnClickListener onClick) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setFocusable(true);
        box.setClickable(true);
        box.setOnClickListener(onClick);
        GradientDrawable card = new GradientDrawable();
        card.setColor(Color.WHITE); card.setCornerRadius(px(32));
        box.setBackground(card);
        box.setPadding(px(14), px(14), px(14), px(10));
        box.setElevation(px(8));
        FrameLayout pic = new FrameLayout(this);
        GradientDrawable frame = new GradientDrawable();
        frame.setColor(color); frame.setCornerRadius(px(24));
        pic.setBackground(frame);
        pic.setPadding(px(6), px(6), px(6), px(6));
        ImageView img = new ImageView(this);
        img.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable clip = new GradientDrawable(); clip.setCornerRadius(px(20)); clip.setColor(0xFFDDE3EE);
        img.setBackground(clip);
        img.setClipToOutline(true);
        pic.addView(img, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        box.addView(pic, new LinearLayout.LayoutParams(px(412), px(232)));
        TextView title = text(v.optString("title"), 32, INK, true, Gravity.START);
        title.setMaxLines(2);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        title.setPadding(px(6), px(10), px(6), 0);
        box.addView(title, new LinearLayout.LayoutParams(px(412), px(92)));
        box.setOnFocusChangeListener((x, has) -> {
            box.animate().scaleX(has ? 1.08f : 1f).scaleY(has ? 1.08f : 1f).setDuration(has ? 160 : 120)
                    .setInterpolator(new OvershootInterpolator(1.5f)).start();
            card.setStroke(has ? px(8) : 0, GLOW);
            box.setElevation(px(has ? 20 : 8));
            if (has && buddy != null && buddy.getTag() == "peek") perch(box);
        });
        loadThumb(v.optString("id"), img);
        return box;
    }

    /** The small buddy hops onto the focused tile's top-right corner. */
    private void perch(View target) {
        int[] loc = new int[2];
        target.getLocationInWindow(loc);
        float x = loc[0] + target.getWidth() * 1.04f - px(110), y = loc[1] - px(70);
        buddy.animate().x(x).y(y).setDuration(220).setInterpolator(new OvershootInterpolator(1.2f)).start();
        buddy.hop();
    }

    private Runnable pendingSpeak;
    private TextView homeTitle;

    /** Pre-readers: say the label after focus rests 1.2 s; a new focus cancels it. */
    private void speakOnFocus(View v, String label) {
        View.OnFocusChangeListener prev = v.getOnFocusChangeListener();
        v.setOnFocusChangeListener((x, has) -> {
            if (prev != null) prev.onFocusChange(x, has);
            if (pendingSpeak != null) ui.removeCallbacks(pendingSpeak);
            if (has) { pendingSpeak = () -> say(label); ui.postDelayed(pendingSpeak, 1200); }
        });
    }

    private void loadThumb(String id, ImageView into) {
        Bitmap cached = thumbs.get(id);
        if (cached != null) { into.setImageBitmap(cached); return; }
        pool.execute(() -> {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL("https://i.ytimg.com/vi/" + id + "/mqdefault.jpg").openConnection();
                c.setConnectTimeout(8000); c.setReadTimeout(8000);
                Bitmap bmp;
                try (InputStream in = c.getInputStream()) { bmp = BitmapFactory.decodeStream(in); }
                if (bmp != null) { thumbs.put(id, bmp); ui.post(() -> into.setImageBitmap(bmp)); }
            } catch (Exception e) {
                Log.w(TAG, "thumb " + id + ": " + e);
            } finally { if (c != null) c.disconnect(); }
        });
    }

    private void playFrom(int row, int index) {
        queue.clear();
        try {
            JSONArray vids = rows.getJSONObject(row).getJSONArray("videos");
            String rowId = rows.getJSONObject(row).optString("id");
            for (int i = 0; i < vids.length(); i++) vids.getJSONObject(i).put("row", rowId);
            Set<String> hidden = new HashSet<>();
            for (int i = 0; i < vids.length(); i++) {
                JSONObject v = vids.getJSONObject((index + i) % vids.length());
                if (!hidden.contains(v.optString("id"))) queue.add(v);
            }
            if (queue.isEmpty()) queue.add(vids.getJSONObject(index));
        } catch (Exception e) { Log.e(TAG, "queue", e); }
        qIndex = 0;
        showPlayer();
    }

    // ------------------------------------------------------------------ framed player (tech §2.3 / design D1)
    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void showPlayer() {
        antiRepeat().newItem();
        stopVoice();
        root.removeAllViews();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        View frame = new View(this);
        GradientDrawable fd = new GradientDrawable();
        fd.setCornerRadius(px(24));
        fd.setStroke(px(8), 0x33FFFFFF);
        frame.setBackground(fd);
        frameView = frame;
        root.addView(frame, rect(304, 38, 1312, 752));

        web = new WebView(this);
        web.setFocusable(false);
        web.setFocusableInTouchMode(false);
        web.setBackgroundColor(Color.BLACK);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setSupportMultipleWindows(false);
        ws.setAllowFileAccess(false);
        ws.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Log.w(TAG, "blocked nav " + req.getUrl());
                return true;     // never navigate away from the embed
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Bridge(), "WW");
        root.addView(web, rect(320, 54, 1280, 720));
        fullScreen = true;

        nowText = text("", 36, Color.WHITE, true, Gravity.START);
        root.addView(nowText, rect(320, 800, 1280, 110));
        sandText = text("", 40, 0xFFFFD36B, true, Gravity.START);
        root.addView(sandText, rect(320, 934, 1280, 80));
        headsUp = text("2 more\nminutes!", 40, 0xFF1A1530, true);
        GradientDrawable hb = new GradientDrawable();
        hb.setColor(Color.WHITE); hb.setCornerRadius(px(32));
        headsUp.setBackground(hb);
        headsUp.setVisibility(View.GONE);
        root.addView(headsUp, rect(1632, 500, 192, 180));

        String first = queue.get(0).optString("id");
        web.loadDataWithBaseURL("https://local.wonderwindow/", playerHtml(first), "text/html", "utf-8", null);
        showNow();
        applyLayout();
        playing = true; paused = false; lastTick = SystemClock.elapsedRealtime();
    }

    /** Full screen = WebView fills the TV and our UI is hidden (nothing ever drawn over the player).
     *  Window = the framed 1280x720 layout with title, sand-timer and heads-up around it. */
    private void applyLayout() {
        if (web == null) return;
        web.setLayoutParams(fullScreen
                ? new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                : rect(320, 54, 1280, 720));
        int vis = fullScreen ? View.GONE : View.VISIBLE;
        frameView.setVisibility(vis); nowText.setVisibility(vis); sandText.setVisibility(vis);
        if (fullScreen) headsUp.setVisibility(View.GONE);
    }

    private void seek(int deltaSec) {
        double target = Math.max(0, Math.min(curDur > 2 ? curDur - 2 : curT + deltaSec, curT + deltaSec));
        js("player.seekTo(" + target + ", true)");
    }

    private String playerHtml(String id) {
        return "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<style>html,body{margin:0;background:#000;height:100%;overflow:hidden}#p{width:100%;height:100%}</style></head>"
                + "<body><div id='p'></div><script>var player;var t=document.createElement('script');"
                + "t.src='https://www.youtube.com/iframe_api';document.head.appendChild(t);"
                + "function onYouTubeIframeAPIReady(){player=new YT.Player('p',{host:'https://www.youtube-nocookie.com',"
                + "width:'100%',height:'100%',videoId:'" + id + "',playerVars:{autoplay:1,controls:0,rel:0,fs:0,disablekb:1,"
                + "iv_load_policy:3,playsinline:1,cc_load_policy:0,origin:'https://local.wonderwindow',"
                + "widget_referrer:'https://local.wonderwindow'},events:{onReady:function(e){e.target.playVideo();WW.onReady();},"
                + "onStateChange:function(e){WW.onState(e.data);},onError:function(e){WW.onError(e.data);}}});"
                + "setInterval(function(){try{if(player&&player.getCurrentTime){WW.onTime(player.getCurrentTime(),player.getDuration());}}catch(x){}},500);}"
                + "function ld(i){player.loadVideoById(i);}function ps(){player.pauseVideo();}function pl(){player.playVideo();}"
                + "</script></body></html>";
    }

    private void js(String code) { if (web != null) web.evaluateJavascript(code, null); }

    private void showNow() {
        JSONObject v = queue.get(qIndex);
        nowText.setText(v.optString("title") + "\n" + v.optString("channel"));
    }

    private void nextVideo() { nextVideo(maxFrac >= 0.9); }

    private void nextVideo(boolean finished) {
        leaveVideo(finished);
        if (ending) { endSession(); return; }
        qIndex = (qIndex + 1) % queue.size();
        showNow();
        antiRepeat().newItem();
        js("ld('" + queue.get(qIndex).optString("id") + "')");
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            long now = SystemClock.elapsedRealtime();
            if (sessionActive && !paused) sessionUsedMs += now - lastTick;
            lastTick = now;
            long leftSec = sessionMin * 60L - sessionUsedMs / 1000;
            int leftMin = (int) Math.max(0, Math.ceil(leftSec / 60.0));
            StringBuilder sand = new StringBuilder("⏳ ");
            for (int i = 0; i < Math.max(0, Math.ceil(leftSec / 300.0)); i++) sand.append("●");
            if (web != null) sandText.setText(sand + "   " + leftMin + " min left   ·   video " + (qIndex + 1));
            if (web == null && homeTitle != null) homeTitle.setText("⏳ " + leftMin + " min");
            if (web != null && !headsUpShown && leftSec <= HEADS_UP_SEC) {
                headsUpShown = true;
                boolean wasFull = fullScreen;
                fullScreen = false; applyLayout();
                headsUp.setVisibility(View.VISIBLE);
                sandText.setTextColor(0xFFFF9F43);
                ui.postDelayed(() -> { headsUp.setVisibility(View.GONE); if (wasFull && web != null) { fullScreen = true; applyLayout(); } }, 6000);
            }
            if (leftSec <= 0 && !ending && web == null) { ending = true; endSession(); return; }
            if (leftSec <= 0 && !ending) {
                ending = true;
                double videoLeft = curDur - curT;
                if (!(videoLeft > 0 && videoLeft <= FINISH_IF_LEFT_SEC)) { js("ps()"); endSession(); return; }
            }
            ui.postDelayed(this, 1000);
        }
    };

    private class Bridge {
        @JavascriptInterface public void onReady() { Log.i(TAG, "player ready"); }
        @JavascriptInterface public void onState(int st) {
            ui.post(() -> {
                Log.i(TAG, "state " + st);
                // D8: record the start only when playback really begins (state 1), once per queue item
                if (!queue.isEmpty() && antiRepeat().onPlayerState(st, queue.get(qIndex).optString("id"), System.currentTimeMillis()))
                    prefs.edit().putString("launched", antiRepeat().serialize()).apply();
                if (st == 0) nextVideo(true);
            });
        }
        @JavascriptInterface public void onError(int code) {
            ui.post(() -> { Log.w(TAG, "player error " + code + " on " + queue.get(qIndex).optString("id")); nextVideo(); });
        }
        @JavascriptInterface public void onTime(double t, double d) {
            ui.post(() -> {
                curT = t; curDur = d;
                if (d > 0) maxFrac = Math.max(maxFrac, t / d);
                if (d > 0 && t >= d - 1.0) { js("ps()"); nextVideo(true); }   // cut before YouTube's end screen
            });
        }
    }

    // ------------------------------------------------------------------ pause sheet (design D2)
    private void showPause() {
        if (pauseSheet != null || web == null) return;
        paused = true;
        js("ps()");
        web.setVisibility(View.INVISIBLE);
        frameView.setVisibility(View.VISIBLE); nowText.setVisibility(View.VISIBLE); sandText.setVisibility(View.VISIBLE);
        pauseSheet = new LinearLayout(this);
        pauseSheet.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.WHITE); bg.setCornerRadius(px(48));
        pauseSheet.setBackground(bg);
        pauseSheet.setElevation(px(24));
        TextView keep = button("▶\nKeep watching", 0xFF6553DB, v -> hidePause());
        TextView not = button("⏭\nNext video", 0xFF3A3460, v -> {
            if (skipsLeft > 0) { skipsLeft--; hidePause(); nextVideo(false); }   // no feedback is stored
        });
        if (skipsLeft == 0) not.setAlpha(0.35f);
        TextView pick = button("▦\nPick another", 0xFF3A3460, v -> backToRows());
        for (TextView t : new TextView[]{keep, not, pick}) {
            t.setPadding(px(10), px(14), px(10), px(14));
            t.setLineSpacing(0, 1.1f);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(330), px(210));
            lp.setMargins(px(18), 0, px(18), 0);
            fit(t, 38, 22);
            pauseSheet.addView(t, lp);
        }
        root.addView(pauseSheet, rect(360, 230, 1200, 320));
        keep.requestFocus();
    }

    private void hidePause() {
        if (pauseSheet == null) return;
        root.removeView(pauseSheet);
        pauseSheet = null;
        paused = false;
        lastTick = SystemClock.elapsedRealtime();
        web.setVisibility(View.VISIBLE);
        applyLayout();
        js("pl()");
    }

    // ------------------------------------------------------------------ end + resting
    /** Designer rule: unused minutes stay in today's allowance; cooldown scales with what was used
     *  (C × U/P, rounded up to 5 min, min 15); a stop under 2 min is an "oops" (no cooldown, twice a day). */
    private void recordSessionEnd() {
        if (web != null) leaveVideo(false);
        undoPrevCooldown = prefs.getLong("cooldownUntil", 0);
        undoPrevUsed = prefs.getLong("usedMs", 0);
        undoUsedMs = sessionUsedMs; undoSessionMin = sessionMin;
        long leftSec = sessionMin * 60L - sessionUsedMs / 1000;
        undoUntil = (!ending && leftSec >= 120) ? SystemClock.elapsedRealtime() + 60_000 : 0;   // only for early stops
        ui.removeCallbacks(tick);
        playing = false; sessionActive = false;
        destroyWeb();
        double usedMin = sessionUsedMs / 60000.0;
        long cooldownMin;
        int oops = prefs.getString("oopsDay", "").equals(today()) ? prefs.getInt("oops", 0) : 0;
        if (usedMin < 2 && oops < 2) {
            cooldownMin = 0;
            prefs.edit().putString("oopsDay", today()).putInt("oops", oops + 1).apply();
        } else {
            double frac = Math.min(1.0, usedMin / Math.max(1, sessionMin));
            cooldownMin = Math.max(15, (long) Math.ceil(COOLDOWN_MIN * frac / 5.0) * 5);
        }
        prefs.edit().putLong("usedMs", prefs.getLong("usedMs", 0) + sessionUsedMs)
                .putLong("cooldownUntil", System.currentTimeMillis() + cooldownMin * 60_000L).apply();
        lastCooldownMin = (int) cooldownMin;
    }

    private int lastCooldownMin;
    // Undo for an accidental stop: snapshot before the stop is recorded (kid-friendly, 60 s window).
    private long undoPrevCooldown, undoPrevUsed, undoUntil, undoUsedMs;
    private int undoSessionMin;

    private boolean canUndo() { return undoUntil > SystemClock.elapsedRealtime(); }

    private void undoStop() {
        if (!canUndo()) return;
        undoUntil = 0;
        prefs.edit().putLong("cooldownUntil", undoPrevCooldown).putLong("usedMs", undoPrevUsed).apply();
        int oops = prefs.getInt("oops", 0);
        if (lastCooldownMin == 0 && oops > 0) prefs.edit().putInt("oops", oops - 1).apply();
        sessionMin = undoSessionMin; sessionUsedMs = undoUsedMs;
        sessionActive = true; paused = false; ending = false; lastTick = SystemClock.elapsedRealtime();
        ui.removeCallbacks(tick); ui.post(tick);
        showHome();
    }

    private void endSession() {
        recordSessionEnd();
        root.removeAllViews();
        LinearLayout col = column();
        setNight(false);
        addBuddy(140, 140, 260, R.drawable.buddy_happy_wave);
        col.addView(text("★ Try it!", 72, 0xFFFFD36B, true));
        col.addView(spacer(20));
        col.addView(text("Tell Amma or Appa one thing you learned.", 52, Color.WHITE, true));
        col.addView(spacer(50));
        TextView go = button("👋 Let's go do it!", 0xFF6553DB, v -> {
            if (lastCooldownMin == 0) start(); else showResting("See you next time!", lastCooldownMin);
        });
        col.addView(go);
        if (canUndo()) {
            col.addView(spacer(30));
            TextView oops = button("↩ Oops! Back to videos", 0xFF3A3460, v -> undoStop());
            oops.setTextSize(TypedValue.COMPLEX_UNIT_PX, px(40));
            col.addView(oops);
        }
        center(col);
        go.requestFocus();

    }

    private void destroyWeb() {
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
            WebStorage.getInstance().deleteAllData();
            CookieManager.getInstance().removeAllCookies(null);
        }
    }

    /** Back to the video rows inside the same session (no dislike, timer keeps running). */
    private void backToRows() {
        leaveVideo(false);
        if (pauseSheet != null) { root.removeView(pauseSheet); pauseSheet = null; }
        paused = false; lastTick = SystemClock.elapsedRealtime();
        destroyWeb();
        playing = false;
        showHome();
    }

    private void showStopSheet() {
        if (stopSheet != null) return;
        stopSheet = new LinearLayout(this);
        stopSheet.setOrientation(LinearLayout.VERTICAL);
        stopSheet.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.WHITE); bg.setCornerRadius(px(48));
        stopSheet.setBackground(bg);
        stopSheet.setElevation(px(24));
        stopSheet.addView(text("Stop for now?", 56, Color.WHITE, true));
        stopSheet.addView(spacer(30));
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER);
        TextView back = button("↩ Back to videos", 0xFF6553DB, v -> hideStopSheet());
        TextView stop = button("🏠 Stop for now", 0xFF3A3460, v -> { hideStopSheet(); endSession(); });
        for (TextView t : new TextView[]{back, stop}) {
            fit(t, 40, 24);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(px(440), px(120));
            lp.setMargins(px(20), 0, px(20), 0);
            r.addView(t, lp);
        }
        stopSheet.addView(r);
        root.addView(stopSheet, rect(360, 300, 1200, 400));
        back.requestFocus();
    }

    private void hideStopSheet() {
        if (stopSheet == null) return;
        root.removeView(stopSheet);
        stopSheet = null;
        View f = root.findFocus();
        if (f == null) showHome();
    }

    private void showResting(String title, int minutes) {
        stopMeter();
        root.removeAllViews();
        setNight(true);
        LinearLayout col = column();
        col.addView(text("🌙", 110, Color.WHITE, false));
        Buddy sb = new Buddy(px(260), R.drawable.buddy_sleepy);
        col.addView(sb, new LinearLayout.LayoutParams(px(260), px(260)));
        col.addView(text(title, 72, Color.WHITE, true));
        col.addView(text("Let's play!", 56, 0xFFB9B2D6, false));
        col.addView(spacer(40));
        col.addView(text(minutes > 0 ? getString(R.string.app_name) + " wakes up in about " + minutes + " minutes." : getString(R.string.app_name) + " wakes up tomorrow.",
                36, 0xFF9C94BF, false));
        if (canUndo()) {
            col.addView(spacer(40));
            TextView oops = button("↩ Oops! I want to keep watching", 0xFF6553DB, v -> undoStop());
            col.addView(oops);
            center(col);
            oops.requestFocus();
            ui.postDelayed(() -> { if (!canUndo() && oops.getParent() != null) { oops.setVisibility(View.GONE); } }, 61_000);
            return;
        }
        TextView doors = button("🏠  Play or Try instead", 0xFF6553DB, v -> showHub());
        col.addView(spacer(30));
        col.addView(doors);
        center(col);
        doors.requestFocus();
    }

    // ------------------------------------------------------------------ keys
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        if (web == null && "game".equals(screen) && maze != null && e.getAction() == KeyEvent.ACTION_DOWN && mazeKey(k)) return true;
        if (web == null && "t3away".equals(screen)) {
            if (e.getAction() == KeyEvent.ACTION_UP) showReturn3();
            return true;
        }
        if (web == null && !sessionActive && !inItem && k == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() != KeyEvent.ACTION_UP) return true;
            switch (screen) {
                case "game": addPlayTime(); maze = null; showPlayList(); return true;
                case "play": case "trycats": showHub(); return true;
                case "trylist": case "trydone": showTryCats(); return true;
                case "trysteps":
                    if ("step".equals(tryPhase) && tryStep > 0) { tryStep--; showTryStep(); }
                    else if ("step".equals(tryPhase)) showTryGather();
                    else if ("gather".equals(tryPhase)) showTryHook();
                    else showTryList(tryCat);
                    return true;
                case "warmintro": if (fromPlayWarmup) { fromPlayWarmup = false; showPlayList(); } else showHub(); return true;
                case "hub": return true;
                case "t3home": showHub(); return true;
                case "t3list": showTryHome3(); return true;
                case "t3prev": showTryList3(t3Fam); return true;
                case "t3step": if (t3Step > 0) { t3Step--; showTryStep3(); } else showTryPreview3(t3Act); return true;
                case "t3ret": showTryHome3(); return true;                       // Back never leaves the app from the doors
                default: showHub(); return true;               // resting, end screens, etc. -> doors
            }
        }
        boolean inPlayer = web != null;
        if (inPlayer && pauseSheet == null) {
            if (e.getAction() == KeyEvent.ACTION_UP && (k == KeyEvent.KEYCODE_BACK || k == KeyEvent.KEYCODE_DPAD_CENTER
                    || k == KeyEvent.KEYCODE_ENTER)) showPause();
            if (e.getAction() == KeyEvent.ACTION_DOWN && (k == KeyEvent.KEYCODE_DPAD_RIGHT || k == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD)) seek(10);
            if (e.getAction() == KeyEvent.ACTION_DOWN && (k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_MEDIA_REWIND)) seek(-10);
            if (e.getAction() == KeyEvent.ACTION_UP && (k == KeyEvent.KEYCODE_DPAD_UP || k == KeyEvent.KEYCODE_DPAD_DOWN)) {
                fullScreen = !fullScreen; applyLayout();
            }
            return k != KeyEvent.KEYCODE_VOLUME_UP && k != KeyEvent.KEYCODE_VOLUME_DOWN && k != KeyEvent.KEYCODE_VOLUME_MUTE
                    && k != KeyEvent.KEYCODE_HOME ? true : super.dispatchKeyEvent(e);
        }
        if (inPlayer && k == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP) hidePause();
            return true;
        }
        // No child-reachable reset of the screen-time budget exists (issue #6). A parent-authenticated reset comes with the parent gate.
        if (sessionActive && web == null && k == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP && SystemClock.elapsedRealtime() - backDebounce > 500) {
                backDebounce = SystemClock.elapsedRealtime();
                if (stopSheet == null) showStopSheet(); else hideStopSheet();
            }
            return true;
        }
        if (inItem && k == KeyEvent.KEYCODE_BACK) { if (e.getAction() == KeyEvent.ACTION_UP) previousItem(); return true; }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onStop() {
        super.onStop();
        stopMeter();
        if (sessionActive) endSessionQuiet();
    }

    private void endSessionQuiet() { recordSessionEnd(); }

    @Override
    protected void onRestart() {
        super.onRestart();
        warmItems = null; inItem = false;
        start();
    }

    // ------------------------------------------------------------------ small UI helpers
    private int px(float v) { return Math.round(v * s); }

    private FrameLayout.LayoutParams rect(int x, int y, int w, int h) {
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(px(w), px(h));
        lp.leftMargin = px(x); lp.topMargin = px(y);
        return lp;
    }

    private LinearLayout column() {
        // children wrap their content (buttons must not stretch across the screen)
        LinearLayout c = new LinearLayout(this) {
            @Override protected LayoutParams generateDefaultLayoutParams() {
                return new LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            }
        };
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER);
        return c;
    }

    private void center(View v) {
        root.addView(v, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private View spacer(int h) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(1, px(h)));
        return v;
    }

    private TextView text(String t, int sizePx, int color, boolean bold) { return text(t, sizePx, color, bold, Gravity.CENTER); }

    private TextView text(String t, int sizePx, int color, boolean bold, int gravity) {
        TextView v = new TextView(this);
        v.setText(t);
        if (!night) {                                   // day sky: dark ink text instead of white
            if (color == Color.WHITE || color == 0xE6FFFFFF) color = INK;
            else if (color == 0xFFB9B2D6 || color == 0xFF9C94BF) color = INK_SOFT;
            else if (color == 0xFFFFD36B) color = AMBER;
        }
        v.setTextColor(color);
        v.setTextSize(TypedValue.COMPLEX_UNIT_PX, px(sizePx));
        v.setTypeface(bold ? fredB : fredSB);
        v.setGravity(gravity);
        return v;
    }

    private TextView button(String label, int color, View.OnClickListener onClick) {
        boolean secondary = color == 0xFF3A3460 || color == 0xFF2A2547;
        int face = secondary ? Color.WHITE : color;
        int lip = secondary ? 0xFFD5DCEB : darker(color);
        boolean darkText = secondary || color == 0xFFF2B33D || color == SUN;
        TextView b = text(label, 48, darkText ? INK : Color.WHITE, true);
        b.setTextColor(darkText ? INK : Color.WHITE);
        GradientDrawable glow = new GradientDrawable();
        glow.setCornerRadius(px(40)); glow.setStroke(px(10), secondary ? 0xFFF59E0B : GLOW); glow.setColor(0x00000000);
        GradientDrawable lipD = new GradientDrawable(); lipD.setColor(lip); lipD.setCornerRadius(px(32));
        GradientDrawable faceD = new GradientDrawable(); faceD.setColor(face); faceD.setCornerRadius(px(32));
        GradientDrawable shine = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0x2EFFFFFF, 0x00FFFFFF});
        shine.setCornerRadius(px(32));
        LayerDrawable ld = new LayerDrawable(new android.graphics.drawable.Drawable[]{glow, lipD, faceD, shine});
        int g = px(8);
        ld.setLayerInset(1, g, g, g, g);
        ld.setLayerInset(2, g, g, g, g + px(8));
        ld.setLayerInset(3, g, g, g, px(60));
        glow.setAlpha(0);
        b.setBackground(ld);
        b.setPadding(px(48), px(26), px(48), px(34));
        b.setFocusable(true);
        b.setClickable(true);
        b.setOnClickListener(onClick == null ? null : v -> {
            v.animate().translationY(px(6)).scaleX(0.97f).scaleY(0.97f).setDuration(60)
                    .withEndAction(() -> v.animate().translationY(0).scaleX(1.08f).scaleY(1.08f).setDuration(160)
                            .setInterpolator(new OvershootInterpolator()).start()).start();
            onClick.onClick(v);
        });
        b.setOnFocusChangeListener((v, has) -> {
            v.animate().scaleX(has ? 1.08f : 1f).scaleY(has ? 1.08f : 1f).setDuration(has ? 160 : 120)
                    .setInterpolator(new OvershootInterpolator(1.5f)).start();
            glow.setAlpha(has ? 255 : 0);
            faceD.setStroke(has ? px(5) : 0, Color.WHITE);
            v.setElevation(px(has ? 20 : 6));
        });
        b.setElevation(px(6));
        return b;
    }

    private static int darker(int c) {
        return Color.rgb((int) (Color.red(c) * 0.72), (int) (Color.green(c) * 0.72), (int) (Color.blue(c) * 0.72));
    }

    /** Never crop: shrink text (down to minPx) so it fits the button's fixed size. API 26+. */
    private void fit(TextView t, int maxPx, int minPx) {
        t.setMaxLines(3);
        t.setAutoSizeTextTypeUniformWithConfiguration(px(minPx), px(maxPx), 1, TypedValue.COMPLEX_UNIT_PX);
    }

    private String readAsset(String name) throws Exception {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            String t = new String(out.toByteArray(), StandardCharsets.UTF_8);
            return name.endsWith(".json") ? t.replace("{buddy}", getString(R.string.buddy_name)) : t;   // shared content uses {buddy}
        }
    }
}
