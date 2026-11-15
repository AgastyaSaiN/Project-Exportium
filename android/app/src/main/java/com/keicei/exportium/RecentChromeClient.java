package com.keicei.exportium;

import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Replaces the WebView's file chooser for imports. Instead of a one-time "get content" grant it
 * opens the system documents picker and keeps access to the chosen file (see {@link RecentFilesPlugin}),
 * and when a recent file was queued it hands that file over without showing a picker at all.
 * Image pickers (avatars, wallpapers) and everything else keep the stock behaviour.
 */
class RecentChromeClient extends BridgeWebChromeClient {
    private final MainActivity activity;

    RecentChromeClient(Bridge bridge, MainActivity activity) {
        super(bridge);
        this.activity = activity;
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
        for (String type : params.getAcceptTypes()) {
            if (type != null && (type.startsWith("image/") || type.startsWith("video/"))) {
                return super.onShowFileChooser(webView, callback, params);
            }
        }
        Uri queued = RecentFilesPlugin.takePending();
        if (queued != null) {
            callback.onReceiveValue(new Uri[] { queued });
            return true;
        }
        activity.pickDocument(callback, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
        return true;
    }
}
