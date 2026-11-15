package com.keicei.exportium;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.ValueCallback;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private ActivityResultLauncher<Intent> openDocument;
    private ValueCallback<Uri[]> chooserCallback;
    private boolean backHandled = false;
    private OnBackPressedCallback backCallback;

    /** Lets Android handle Back normally, which closes the app. */
    private void leave() {
        if (backCallback != null) backCallback.setEnabled(false);
        getOnBackPressedDispatcher().onBackPressed();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RecentFilesPlugin.class);
        registerPlugin(FileOutPlugin.class);
        super.onCreate(savedInstanceState);
        openDocument = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            ValueCallback<Uri[]> callback = chooserCallback;
            chooserCallback = null;
            if (callback == null) return;
            Intent data = result.getData();
            if (result.getResultCode() != RESULT_OK || data == null) {
                callback.onReceiveValue(null);
                return;
            }
            List<Uri> uris = new ArrayList<>();
            ClipData clip = data.getClipData();
            if (clip != null) {
                for (int i = 0; i < clip.getItemCount(); i++) uris.add(clip.getItemAt(i).getUri());
            } else if (data.getData() != null) {
                uris.add(data.getData());
            }
            for (Uri uri : uris) RecentFilesPlugin.remember(this, uri);
            callback.onReceiveValue(uris.toArray(new Uri[0]));
        });
    }

    @Override
    public void onStart() {
        super.onStart();
        if (!backHandled) {
            backHandled = true;
            // Back steps back through the page (closing the photo viewer or settings, leaving a chat) and only
            // leaves the app from the first screen. Added after Capacitor's own handler so that this one wins.
            backCallback = new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    if (getBridge() == null) { leave(); return; }
                    // Ask the page first: it closes an open photo viewer / settings page, or steps back a screen.
                    getBridge().getWebView().evaluateJavascript(
                        "(function(){return !!(window.__exportiumBack && window.__exportiumBack());})()",
                        value -> { if (!"true".equals(value)) leave(); });
                }
            };
            getOnBackPressedDispatcher().addCallback(this, backCallback);
        }
        if (backCallback != null) backCallback.setEnabled(true);
        if (getBridge() != null) {
            getBridge().getWebView().setWebChromeClient(new RecentChromeClient(getBridge(), this));
            // No Android 12 "stretch" or glow when a screen is pulled past its end: the page just stops.
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }

    /** Opens the system documents picker and keeps access to what the user chooses. */
    void pickDocument(ValueCallback<Uri[]> callback, boolean multiple) {
        if (chooserCallback != null) chooserCallback.onReceiveValue(null);
        chooserCallback = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            openDocument.launch(intent);
        } catch (Exception failed) {
            chooserCallback = null;
            callback.onReceiveValue(null);
        }
    }
}
