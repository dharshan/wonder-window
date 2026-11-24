package org.wonderwindow.tv.spike;

import android.app.Activity;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.Choreographer;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * THROWAWAY SPIKE: Phase 0 remote input logger. Adult-facing test tool, never shipped to the child.
 * Logs every key event (logcat tag WWKEY + CSV in the app's external files dir), walks an adult through five
 * remote tests, then shows a summary: tap echo, held-key repeat delay/interval, long-press, fast alternation,
 * input dispatch delay, event-to-next-frame latency and the measured frame rate.
 * Exit: hold BACK 2 s at any time, press BACK 3 times on the summary, or HOME.
 */
public class MainActivity extends Activity {
    static final String TAG = "WWKEY";
    static final String[] PROMPTS = {
            "1 of 5:  Tap RIGHT 5 times, slowly, one at a time",
            "2 of 5:  Hold RIGHT down for 3 seconds, then let go",
            "3 of 5:  Hold OK down for 2 seconds, then let go",
            "4 of 5:  Press LEFT and RIGHT back and forth, fast, for 5 seconds",
            "5 of 5:  Press BACK once",
    };
    static final int DONE = PROMPTS.length;

    static class Ev {
        int step, action, code, repeat, flags, source; long eventTime, downTime, handled; String dev;
    }

    private final Handler ui = new Handler(Looper.getMainLooper());
    private float s;
    private TextView prompt, logView, summaryView;
    private Stage stage;
    private PrintWriter csv;
    private File outDir;
    private int run = 0, step = 0, stepCount = 0;
    private long stepFirstT = 0;
    private boolean advancing = false, resumed = false;

    private final ArrayList<Ev> events = new ArrayList<>();
    private final ArrayList<Long> dispatchMs = new ArrayList<>(), frameLatMs = new ArrayList<>(), frameUs = new ArrayList<>();
    private final ArrayList<String> recent = new ArrayList<>();
    private final ArrayList<Long> backUps = new ArrayList<>();
    private long lastFrameNs = 0;

    private final Choreographer.FrameCallback ticker = new Choreographer.FrameCallback() {
        @Override public void doFrame(long ns) {
            if (lastFrameNs != 0 && frameUs.size() < 50000) frameUs.add((ns - lastFrameNs) / 1000);
            lastFrameNs = ns;
            if (resumed) Choreographer.getInstance().postFrameCallback(this);
        }
    };

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        s = getResources().getDisplayMetrics().widthPixels / 1920f;
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF14123A);

        prompt = text(54, Color.WHITE, true);
        root.addView(prompt, rect(80, 70, 1760, 150));
        stage = new Stage(this);
        root.addView(stage, rect(80, 240, 1760, 360));
        logView = text(28, 0xFFB8C0FF, false);
        logView.setTypeface(Typeface.MONOSPACE);
        logView.setGravity(Gravity.START | Gravity.TOP);
        root.addView(logView, rect(120, 630, 1680, 330));
        TextView hint = text(26, 0xFF8890C8, false);
        hint.setText("DOWN = skip a step    ·    hold BACK 2 s = close    ·    files: Android/data/org.wonderwindow.tv.spike/files/");
        root.addView(hint, rect(80, 985, 1760, 60));
        summaryView = text(34, Color.WHITE, false);
        summaryView.setGravity(Gravity.START | Gravity.TOP);
        summaryView.setTypeface(Typeface.MONOSPACE);
        summaryView.setBackgroundColor(0xF214123A);
        summaryView.setPadding(px(80), px(60), px(80), px(60));
        summaryView.setVisibility(View.GONE);
        root.addView(summaryView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        outDir = getExternalFilesDir(null);
        if (outDir == null) outDir = getFilesDir();
        startRun();
    }

    @Override protected void onResume() {
        super.onResume();
        resumed = true; lastFrameNs = 0;
        Choreographer.getInstance().postFrameCallback(ticker);
    }

    @Override protected void onPause() {
        super.onPause();
        resumed = false;
        if (csv != null) csv.flush();
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        if (csv != null) csv.close();
    }

    private void startRun() {
        run++;
        events.clear(); dispatchMs.clear(); frameLatMs.clear(); frameUs.clear(); backUps.clear();
        step = 0; stepCount = 0; stepFirstT = 0; advancing = false;
        summaryView.setVisibility(View.GONE);
        try {
            if (csv != null) csv.close();
            String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
            csv = new PrintWriter(new FileWriter(new File(outDir, "keys-" + stamp + ".csv")));
            csv.println("# model=" + Build.MODEL + " sdk=" + Build.VERSION.SDK_INT + " refresh=" + getWindowManager().getDefaultDisplay().getRefreshRate());
            csv.println("handled_ms,step,action,key,repeat,flags,event_ms,down_ms,dispatch_delay_ms,device,source");
        } catch (Exception e) { Log.w(TAG, "csv " + e); csv = null; }
        Log.i(TAG, "RUN " + run + " start");
        showStep();
    }

    private void showStep() {
        prompt.setText(step < DONE ? PROMPTS[step] : "Done. Summary below.");
        stepCount = 0; stepFirstT = 0; advancing = false;
        if (step >= DONE) showSummary();
    }

    private void advance() { if (step < DONE) { step++; showStep(); } }

    /** Advance once, after a short pause, so trailing events of this step are still counted in it. */
    private void advanceSoon() {
        if (advancing) return;
        advancing = true;
        final int from = step;
        ui.postDelayed(() -> { if (step == from) advance(); }, 700);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode(), a = e.getAction();
        if (k == KeyEvent.KEYCODE_VOLUME_UP || k == KeyEvent.KEYCODE_VOLUME_DOWN || k == KeyEvent.KEYCODE_VOLUME_MUTE
                || k == KeyEvent.KEYCODE_HOME || k == KeyEvent.KEYCODE_POWER) return super.dispatchKeyEvent(e);
        long now = SystemClock.uptimeMillis();
        record(e, now);
        if (a == KeyEvent.ACTION_DOWN) {
            dispatchMs.add(now - e.getEventTime());
            final long et = e.getEventTime();
            Choreographer.getInstance().postFrameCallback(ns -> frameLatMs.add(ns / 1_000_000L - et));
            if (k == KeyEvent.KEYCODE_DPAD_RIGHT) stage.nudge(1);
            else if (k == KeyEvent.KEYCODE_DPAD_LEFT) stage.nudge(-1);
            else stage.pulse();
            // escape hatch: BACK held 2 s (only works if the remote produces held-key repeats)
            if (k == KeyEvent.KEYCODE_BACK && e.getRepeatCount() > 0 && e.getEventTime() - e.getDownTime() >= 2000) { finish(); return true; }
        }
        handleStep(e);
        return true;
    }

    private void handleStep(KeyEvent e) {
        int k = e.getKeyCode(), a = e.getAction();
        long t = e.getEventTime();
        boolean ok = k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER;
        if (step < DONE && k == KeyEvent.KEYCODE_DPAD_DOWN && a == KeyEvent.ACTION_UP) { advance(); return; }
        switch (step) {
            case 0:
                if (k == KeyEvent.KEYCODE_DPAD_RIGHT && a == KeyEvent.ACTION_UP && ++stepCount >= 5) advanceSoon();
                break;
            case 1:
            case 2: {
                boolean target = step == 1 ? k == KeyEvent.KEYCODE_DPAD_RIGHT : ok;
                long need = step == 1 ? 2000 : 1500;
                if (!target) break;
                if (a == KeyEvent.ACTION_DOWN && stepFirstT == 0) stepFirstT = t;
                // a true hold, or an "echo" remote that sends many short presses for one hold
                if (a == KeyEvent.ACTION_UP && (t - e.getDownTime() >= need || (stepFirstT > 0 && t - stepFirstT >= need + 500))) advanceSoon();
                break;
            }
            case 3:
                if ((k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_DPAD_RIGHT) && a == KeyEvent.ACTION_DOWN && stepFirstT == 0) {
                    stepFirstT = t;
                    final int from = step;
                    ui.postDelayed(() -> { if (step == from) advance(); }, 5000);
                }
                break;
            case 4:
                if (k == KeyEvent.KEYCODE_BACK && a == KeyEvent.ACTION_UP) advanceSoon();
                break;
            default: // summary
                if (k == KeyEvent.KEYCODE_BACK && a == KeyEvent.ACTION_UP) {
                    backUps.add(t);
                    while (backUps.size() > 3) backUps.remove(0);
                    if (backUps.size() == 3 && t - backUps.get(0) < 2500) finish();
                }
                if (ok && a == KeyEvent.ACTION_UP) startRun();
        }
    }

    private void record(KeyEvent e, long now) {
        Ev v = new Ev();
        v.step = step; v.action = e.getAction(); v.code = e.getKeyCode(); v.repeat = e.getRepeatCount(); v.flags = e.getFlags();
        v.source = e.getSource(); v.eventTime = e.getEventTime(); v.downTime = e.getDownTime(); v.handled = now;
        InputDevice d = e.getDevice();
        v.dev = d == null ? "id" + e.getDeviceId() : d.getName();
        events.add(v);
        String act = v.action == KeyEvent.ACTION_DOWN ? "DOWN" : v.action == KeyEvent.ACTION_UP ? "UP" : "MULTI";
        String key = KeyEvent.keyCodeToString(v.code).replace("KEYCODE_", "");
        String line = String.format(Locale.US, "%d,%d,%s,%s,%d,0x%x,%d,%d,%d,%s,0x%x",
                now, step, act, key, v.repeat, v.flags, v.eventTime, v.downTime, now - v.eventTime, v.dev.replace(',', ' '), v.source);
        if (csv != null) { csv.println(line); csv.flush(); }
        Log.i(TAG, "EV " + line);
        long sinceDown = v.eventTime - v.downTime;
        recent.add(String.format(Locale.US, "%-5s %-12s rep=%-3d held=%5d ms  delay=%3d ms  %s",
                act, key, v.repeat, sinceDown, now - v.eventTime, v.dev));
        while (recent.size() > 9) recent.remove(0);
        logView.setText(String.join("\n", recent));
    }

    // ------------------------------------------------------------------ summary
    private List<Ev> of(int st, int... codes) {
        ArrayList<Ev> out = new ArrayList<>();
        for (Ev v : events) if (v.step == st) for (int c : codes) if (v.code == c) { out.add(v); break; }
        return out;
    }

    private static long median(List<Long> xs) { if (xs.isEmpty()) return -1; ArrayList<Long> c = new ArrayList<>(xs); Collections.sort(c); return c.get(c.size() / 2); }
    private static long pct(List<Long> xs, double p) { if (xs.isEmpty()) return -1; ArrayList<Long> c = new ArrayList<>(xs); Collections.sort(c); return c.get(Math.min(c.size() - 1, (int) (c.size() * p))); }

    private String holdReport(String name, List<Ev> evs) {
        ArrayList<Long> repGaps = new ArrayList<>(), pressGaps = new ArrayList<>();
        long firstRepeatDelay = -1, longest = 0, prevRep = -1, prevPress = -1;
        int repeats = 0, presses = 0; boolean longPressFlag = false;
        for (Ev v : evs) {
            if ((v.flags & KeyEvent.FLAG_LONG_PRESS) != 0) longPressFlag = true;
            if (v.action == KeyEvent.ACTION_UP) longest = Math.max(longest, v.eventTime - v.downTime);
            if (v.action != KeyEvent.ACTION_DOWN) continue;
            if (v.repeat > 0) {
                repeats++;
                if (firstRepeatDelay < 0) firstRepeatDelay = v.eventTime - v.downTime;
                if (prevRep > 0) repGaps.add(v.eventTime - prevRep);
                prevRep = v.eventTime;
            } else {
                presses++;
                if (prevPress > 0) pressGaps.add(v.eventTime - prevPress);
                prevPress = v.eventTime;
            }
        }
        String style = repeats > 0 ? "TRUE HOLD (system auto-repeat)" : presses > 2 ? "ECHO (many separate presses)" : "NO REPEAT";
        return String.format(Locale.US, "%s hold: %s | presses=%d repeats=%d | first repeat after %d ms, then every %d ms | echo gap %d ms | longest hold %d ms | long-press flag %s",
                name, style, presses, repeats, firstRepeatDelay, median(repGaps), median(pressGaps), longest, longPressFlag ? "yes" : "no");
    }

    private void showSummary() {
        StringBuilder r = new StringBuilder();
        Set<String> devs = new LinkedHashSet<>();
        for (Ev v : events) devs.add(v.dev + " (src 0x" + Integer.toHexString(v.source) + ")");
        r.append("Devices: ").append(String.join("; ", devs)).append('\n');

        List<Ev> s0 = of(0, KeyEvent.KEYCODE_DPAD_RIGHT);
        int d0 = 0, u0 = 0, r0 = 0;
        for (Ev v : s0) { if (v.action == KeyEvent.ACTION_DOWN) { d0++; if (v.repeat > 0) r0++; } else if (v.action == KeyEvent.ACTION_UP) u0++; }
        r.append(String.format(Locale.US, "Taps: 5 taps -> %d DOWN, %d UP, %d repeats  (%s)\n", d0, u0, r0, d0 == 5 && u0 == 5 ? "clean" : "CHECK: echo or missed"));

        r.append(holdReport("RIGHT", of(1, KeyEvent.KEYCODE_DPAD_RIGHT))).append('\n');
        r.append(holdReport("OK", of(2, KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER))).append('\n');

        List<Ev> s3 = of(3, KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT);
        ArrayList<Long> gaps = new ArrayList<>(); long prev = -1; int n3 = 0, rep3 = 0;
        for (Ev v : s3) if (v.action == KeyEvent.ACTION_DOWN) {
            if (v.repeat > 0) { rep3++; continue; }
            n3++; if (prev > 0) gaps.add(v.eventTime - prev); prev = v.eventTime;
        }
        r.append(String.format(Locale.US, "Fast L/R: %d presses in 5 s (%.1f/s) | median gap %d ms, min gap %d ms | stray repeats %d\n",
                n3, n3 / 5f, median(gaps), gaps.isEmpty() ? -1 : Collections.min(gaps), rep3));

        int bd = 0, bu = 0, br = 0;
        for (Ev v : of(4, KeyEvent.KEYCODE_BACK)) { if (v.action == KeyEvent.ACTION_DOWN) { bd++; if (v.repeat > 0) br++; } else if (v.action == KeyEvent.ACTION_UP) bu++; }
        r.append(String.format(Locale.US, "BACK: %d DOWN, %d UP, %d repeats\n", bd, bu, br));

        r.append(String.format(Locale.US, "Dispatch delay (event -> app): median %d ms, p90 %d ms, max %d ms  (n=%d)\n",
                median(dispatchMs), pct(dispatchMs, .9), dispatchMs.isEmpty() ? -1 : Collections.max(dispatchMs), dispatchMs.size()));
        r.append(String.format(Locale.US, "Event -> next frame start: median %d ms, p90 %d ms  (+ panel scan-out, measure photons with slow-mo video)\n",
                median(frameLatMs), pct(frameLatMs, .9)));
        long mf = median(frameUs); int slipped = 0;
        for (long f : frameUs) if (mf > 0 && f > mf * 1.5) slipped++;
        r.append(String.format(Locale.US, "Frames: median %.2f ms = %.1f Hz | slipped %d of %d (%.1f%%)\n",
                mf / 1000f, mf > 0 ? 1e6f / mf : 0, slipped, frameUs.size(), frameUs.isEmpty() ? 0 : 100f * slipped / frameUs.size()));
        r.append("\nOK = run again    ·    BACK x3 = close");

        String text = r.toString();
        summaryView.setText(text);
        summaryView.setVisibility(View.VISIBLE);
        for (String l : text.split("\n")) Log.i(TAG, "SUMMARY " + l);
        try (PrintWriter w = new PrintWriter(new FileWriter(new File(outDir, "summary-run" + run + "-" + System.currentTimeMillis() + ".txt")))) {
            w.println(text);
        } catch (Exception ex) { Log.w(TAG, "summary " + ex); }
    }

    // ------------------------------------------------------------------ view helpers
    private int px(float v) { return Math.round(v * s); }

    private FrameLayout.LayoutParams rect(int x, int y, int w, int h) {
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(px(w), px(h));
        lp.leftMargin = px(x); lp.topMargin = px(y);
        return lp;
    }

    private TextView text(int sizePx, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, px(sizePx));
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.CENTER);
        return t;
    }

    /** A square that moves on LEFT/RIGHT and briefly grows on any other key: the visible change for latency video. */
    static class Stage extends View {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private float x = -1;
        private long growUntil = 0;

        Stage(Context c) { super(c); }

        void nudge(int dir) {
            float w = getWidth(), m = w * 0.08f;
            if (x < 0) x = w / 2f;
            x += dir * w / 24f;
            if (x > w - m) x = m;
            if (x < m) x = w - m;
            invalidate();
        }

        void pulse() { growUntil = SystemClock.uptimeMillis() + 160; invalidate(); postInvalidateDelayed(170); }

        @Override protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight(), cy = h / 2f;
            if (x < 0) x = w / 2f;
            p.setColor(0xFF2A2F5A);
            c.drawRect(0, cy - 4, w, cy + 4, p);
            float r = h * (SystemClock.uptimeMillis() < growUntil ? 0.24f : 0.18f);
            p.setColor(0xFF7CF2B0);
            c.drawRect(x - r, cy - r, x + r, cy + r, p);
        }
    }
}
