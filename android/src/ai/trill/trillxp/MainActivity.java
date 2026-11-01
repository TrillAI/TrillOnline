package ai.trill.trillxp;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * TrillXP Native Android Host Activity (ai.trill.trillxp)
 * Launches the full bundled TrillXP Windows XP SP3 OS from APK assets
 * via a virtual HTTPS origin (https://trillxp.local/) so ES modules,
 * WebAssembly (Space Cadet Pinball), Web Audio / WAVs (XP + AOL + Slingo Devil Laugh),
 * IndexedDB, and touch card dragging run 100% natively & offline without CORS issues.
 */
@SuppressWarnings("deprecation")
public class MainActivity extends Activity {

    private static final String VIRTUAL_HOST = "trillxp.local";
    private static final String ENTRY_URL = "https://trillxp.local/index.html";

    private WebView webView;
    private long lastBackPressMs = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Window window = getWindow();
            if (window != null) {
                window.getDecorView().setBackgroundColor(Color.BLACK);
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                if (Build.VERSION.SDK_INT >= 28) {
                    WindowManager.LayoutParams lp = window.getAttributes();
                    lp.layoutInDisplayCutoutMode =
                            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    window.setAttributes(lp);
                }
            }
            applyImmersiveMode();
        } catch (Throwable ignored) {
            // Never crash on custom OEM window managers
        }

        try {
            webView = new WebView(this);
            webView.setBackgroundColor(Color.BLACK);
            webView.setLayoutParams(new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            ));
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            if (Build.VERSION.SDK_INT >= 17) {
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
            if (Build.VERSION.SDK_INT >= 21) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }

            webView.setWebChromeClient(new WebChromeClient());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    if (request == null || request.getUrl() == null) {
                        return null;
                    }
                    return interceptBundledAsset(request.getUrl());
                }

                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                    if (url == null) {
                        return null;
                    }
                    try {
                        return interceptBundledAsset(Uri.parse(url));
                    } catch (Throwable ignored) {
                        return null;
                    }
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (request == null || request.getUrl() == null) {
                        return false;
                    }
                    return handleExternalScheme(request.getUrl());
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url == null) {
                        return false;
                    }
                    try {
                        return handleExternalScheme(Uri.parse(url));
                    } catch (Throwable ignored) {
                        return false;
                    }
                }
            });

            setContentView(webView);

            if (savedInstanceState != null) {
                webView.restoreState(savedInstanceState);
            } else {
                webView.loadUrl(ENTRY_URL);
            }
        } catch (Throwable t) {
            showFallbackScreen(t);
        }
    }

    private boolean handleExternalScheme(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null) {
            return false;
        }
        String lower = scheme.toLowerCase(Locale.US);
        if ("http".equals(lower) || "https".equals(lower) || "blob".equals(lower) || "data".equals(lower) || "about".equals(lower)) {
            return false;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (Throwable ignored) {
        }
        return true;
    }

    private WebResourceResponse interceptBundledAsset(Uri uri) {
        String host = uri.getHost();
        if (host == null || !VIRTUAL_HOST.equalsIgnoreCase(host)) {
            return null;
        }

        String path = uri.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) {
            path = "index.html";
        } else {
            while (path.startsWith("/")) {
                path = path.substring(1);
            }
        }

        InputStream stream = null;
        String resolvedPath = path;
        try {
            stream = getAssets().open("www/" + resolvedPath);
        } catch (IOException firstErr) {
            // SPA fallback for client-side routes without file extension
            if (!resolvedPath.contains(".")) {
                try {
                    resolvedPath = "index.html";
                    stream = getAssets().open("www/index.html");
                } catch (IOException ignored) {
                    stream = null;
                }
            }
        }

        Map<String, String> headers = new HashMap<String, String>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

        if (stream == null) {
            byte[] empty = new byte[0];
            if (Build.VERSION.SDK_INT >= 21) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", headers, new ByteArrayInputStream(empty));
            }
            return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(empty));
        }

        String mime = guessMimeType(resolvedPath);
        String encoding = isUtf8Mime(mime) ? "UTF-8" : null;
        if (Build.VERSION.SDK_INT >= 21) {
            return new WebResourceResponse(mime, encoding, 200, "OK", headers, stream);
        }
        return new WebResourceResponse(mime, encoding, stream);
    }

    private static boolean isUtf8Mime(String mime) {
        return mime.startsWith("text/")
                || "application/javascript".equals(mime)
                || "application/json".equals(mime)
                || "image/svg+xml".equals(mime);
    }

    private static String guessMimeType(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".bmp")) return "image/bmp";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".wasm")) return "application/wasm";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    private void applyImmersiveMode() {
        try {
            Window window = getWindow();
            if (window == null) return;
            View decor = window.getDecorView();
            if (decor == null) return;
            if (Build.VERSION.SDK_INT >= 19) {
                decor.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }
        } catch (Throwable ignored) {
        }
    }

    private void showFallbackScreen(Throwable error) {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(0, 48, 156));
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(48, 64, 48, 64);
        box.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("TrillXP — Android System WebView Required");
        title.setTextColor(Color.WHITE);
        title.setTextSize(20f);
        box.addView(title);

        TextView msg = new TextView(this);
        msg.setPadding(0, 24, 0, 0);
        msg.setTextColor(Color.rgb(219, 234, 254));
        msg.setTextSize(14f);
        msg.setText("Please enable or update Android System WebView / Google Chrome to boot TrillXP.\n\nDetails: "
                + (error != null ? error.toString() : "Unknown WebView error"));
        box.addView(msg);

        scroll.addView(box);
        setContentView(scroll);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            try {
                webView.saveState(outState);
            } catch (Throwable ignored) {
            }
        }
    }

    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - lastBackPressMs < 2000L) {
            super.onBackPressed();
            return;
        }
        lastBackPressMs = now;
        try {
            Toast.makeText(this, "Press Back again to exit TrillXP", Toast.LENGTH_SHORT).show();
        } catch (Throwable ignored) {
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            try {
                webView.onPause();
            } catch (Throwable ignored) {
            }
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            try {
                webView.onResume();
            } catch (Throwable ignored) {
            }
        }
        applyImmersiveMode();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try {
                ViewGroup parent = (ViewGroup) webView.getParent();
                if (parent != null) {
                    parent.removeView(webView);
                }
                webView.destroy();
            } catch (Throwable ignored) {
            }
            webView = null;
        }
        super.onDestroy();
    }
}
