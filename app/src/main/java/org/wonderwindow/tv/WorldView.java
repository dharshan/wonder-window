package org.wonderwindow.tv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

/**
 * The 3D world layer (home, PLAY games) rendered by three.js from APK assets in a WebView.
 * Offline only: every request outside https://appassets.androidplatform.net/ is refused, and only
 * files under assets/ are served. The page talks to the host through the {@code WWN} interface;
 * the host (MainActivity) keeps navigation to native screens, screen time, voice and child data.
 */
@SuppressLint("ViewConstructor")
public final class WorldView extends WebView {
    static final String HOST = "https://appassets.androidplatform.net/";
    static final String TAG = "WWWorld";

    /** What the world may ask of the host. Implemented by MainActivity; called on the UI thread. */
    public interface Host {
        void worldSay(String text);
        void worldSfx(String name);
        String worldGet(String key);
        void worldSet(String key, String json);
        void worldEvent(String name, String json);
        void worldBack();
        void worldOpen(String where);
        String worldResolve(String roundJson);
        boolean worldCanResolve(String dynamic);
        String worldBuddy();
    }

    private final Host host;
    private final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    public WorldView(Context c, Host host) {
        super(c);
        this.host = host;
        WebSettings s = getSettings();
        s.setJavaScriptEnabled(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);          // only the bundled, silent intro film plays (no network)
        s.setDomStorageEnabled(false);                 // all state goes through the host (SharedPreferences)
        setBackgroundColor(0xFF05041A);
        setFocusable(true);
        setFocusableInTouchMode(true);
        setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) { Log.i(TAG, m.message()); return true; }
        });
        setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!u.toString().startsWith(HOST)) return new WebResourceResponse("text/plain", "utf-8", 403, "offline", null, null);
                String path = u.getPath() == null ? "" : u.getPath().substring(1);
                if (path.contains("..") || path.startsWith("voice/")) return new WebResourceResponse("text/plain", "utf-8", 404, "nf", null, null);
                try {
                    InputStream in = getContext().getAssets().open(path);
                    return new WebResourceResponse(mime(path), "utf-8", in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "nf", null, null);
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !r.getUrl().toString().startsWith(HOST); }
        });
        addJavascriptInterface(new Bridge(), "WWN");
    }

    static String mime(String p) {
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".mp4")) return "video/mp4";
        if (p.endsWith(".glb")) return "model/gltf-binary";
        return "application/octet-stream";
    }

    /** Loads the world. {@code extra} is an optional test query (e.g. "perf&secs=24" or "screen=game&id=ww004&perf") passed by adb only. */
    public void open(String screen, String extra) {
        String q = extra != null && extra.matches("[A-Za-z0-9_=&.-]{1,120}") ? extra : null;
        loadUrl(HOST + "world/index.html?" + (q != null && q.contains("screen=") ? q : "screen=" + Uri.encode(screen) + (q == null ? "" : "&" + q)));
    }

    /** Runs a call on the page (key delivery, pause/resume). */
    public void js(String code) { evaluateJavascript("window.WWWorld && (" + code + ")", null); }

    /** JS → host. Methods are called on a WebView binder thread: post UI work, answer reads directly. */
    final class Bridge {
        @JavascriptInterface public void say(String t) { ui.post(() -> host.worldSay(t)); }
        @JavascriptInterface public void sfx(String n) { ui.post(() -> host.worldSfx(n)); }
        @JavascriptInterface public String get(String k) { return host.worldGet(k); }
        @JavascriptInterface public void set(String k, String v) { host.worldSet(k, v); }
        @JavascriptInterface public void event(String n, String d) { ui.post(() -> host.worldEvent(n, d)); }
        @JavascriptInterface public void back() { ui.post(host::worldBack); }
        @JavascriptInterface public void open(String w) { ui.post(() -> host.worldOpen(w)); }
        @JavascriptInterface public String resolve(String r) { return host.worldResolve(r); }
        @JavascriptInterface public boolean canResolve(String d) { return host.worldCanResolve(d); }
        @JavascriptInterface public String buddy() { return host.worldBuddy(); }
    }
}
