package com.keicei.exportium;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Map;

/**
 * Remembers the exports you open so they can be opened again without the file picker.
 *
 * Android only lets an app keep access to a file chosen through the system "documents" picker, by
 * taking a persistable permission on its URI. The picker in {@link MainActivity} does that for every
 * file you choose and stores the URI here under "name|size". Later, the web layer asks to reopen a
 * file by name and size ({@link #queueReopen}); the next file chooser then hands the WebView that URI
 * straight away instead of showing the picker. The WebView still reads the file lazily, so a huge
 * archive is never loaded into memory. Nothing is sent anywhere.
 */
@CapacitorPlugin(name = "RecentFiles")
public class RecentFilesPlugin extends Plugin {
    private static final String PREFS = "exportium_recent_files";
    /** Android allows 512 persisted grants per app; stay far below that. */
    private static final int MAX_REMEMBERED = 100;
    private static final long PENDING_MS = 15_000;

    private static Uri pending;
    private static long pendingAt;

    private static String keyOf(String name, long size) {
        return name + "|" + size;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Called with each file the user picks: keeps access to it and remembers where it is. */
    static void remember(Context context, Uri uri) {
        try {
            context.getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception failed) {
            // Some providers do not offer persistable access; the file just cannot be reopened later.
            Logger.error("RecentFiles", "Cannot keep access to " + uri + ": " + failed, failed);
            return;
        }
        String name = null;
        long size = -1;
        try (Cursor cursor = context.getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIndex >= 0) name = cursor.getString(nameIndex);
                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex);
            }
        } catch (Exception ignored) {
            return;
        }
        if (name == null) return;
        SharedPreferences store = prefs(context);
        store.edit().putString(keyOf(name, size), uri.toString()).apply();
        trim(context, store);
    }

    /** Releases the oldest grants once too many are held. */
    private static void trim(Context context, SharedPreferences store) {
        Map<String, ?> all = store.getAll();
        if (all.size() <= MAX_REMEMBERED) return;
        int excess = all.size() - MAX_REMEMBERED;
        SharedPreferences.Editor editor = store.edit();
        for (Map.Entry<String, ?> entry : all.entrySet()) {
            if (excess-- <= 0) break;
            try {
                context.getContentResolver().releasePersistableUriPermission(Uri.parse(String.valueOf(entry.getValue())), Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {
                // Already gone.
            }
            editor.remove(entry.getKey());
        }
        editor.apply();
    }

    /** The queued file, once: the next file chooser uses it instead of asking the user. */
    static synchronized Uri takePending() {
        Uri uri = pending;
        boolean fresh = System.currentTimeMillis() - pendingAt < PENDING_MS;
        pending = null;
        return fresh ? uri : null;
    }

    @PluginMethod
    public void queueReopen(PluginCall call) {
        String name = call.getString("name");
        long size = call.getData().optLong("size", -1);
        JSObject result = new JSObject();
        if (name == null) {
            result.put("ok", false);
            call.resolve(result);
            return;
        }
        String key = keyOf(name, size);
        SharedPreferences store = prefs(getContext());
        String stored = store.getString(key, null);
        if (stored == null) {
            result.put("ok", false);
            call.resolve(result);
            return;
        }
        Uri uri = Uri.parse(stored);
        // Make sure the file is still there and readable before the web layer waits on it.
        try (ParcelFileDescriptor descriptor = getContext().getContentResolver().openFileDescriptor(uri, "r")) {
            if (descriptor == null) throw new IllegalStateException("No descriptor");
        } catch (Exception gone) {
            Logger.error("RecentFiles", "Cannot reopen " + stored + ": " + gone, gone);
            store.edit().remove(key).apply();
            result.put("ok", false);
            call.resolve(result);
            return;
        }
        synchronized (RecentFilesPlugin.class) {
            pending = uri;
            pendingAt = System.currentTimeMillis();
        }
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void forget(PluginCall call) {
        String name = call.getString("name");
        long size = call.getData().optLong("size", -1);
        if (name != null) {
            String key = keyOf(name, size);
            SharedPreferences store = prefs(getContext());
            String stored = store.getString(key, null);
            if (stored != null) {
                try {
                    getContext().getContentResolver().releasePersistableUriPermission(Uri.parse(stored), Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (Exception ignored) {
                    // Already gone.
                }
                store.edit().remove(key).apply();
            }
        }
        call.resolve();
    }
}
