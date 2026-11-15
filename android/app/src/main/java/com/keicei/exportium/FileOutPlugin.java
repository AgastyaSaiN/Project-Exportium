package com.keicei.exportium;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Saves a photo, video or document from a chat to the phone, or hands it to another app.
 *
 * The web layer streams the file over in small chunks (a video can be hundreds of megabytes, far too
 * much for one message). It lands in the app's private cache first. "Save" then copies it into the
 * public Pictures / Movies / Download folder through MediaStore, which needs no storage permission,
 * and "share" opens Android's share sheet on it through the FileProvider. Nothing is sent anywhere
 * by this app: the app has no network permission at all.
 */
@CapacitorPlugin(name = "FileOut")
public class FileOutPlugin extends Plugin {
    private static final String FOLDER = "Exportium";

    private final Map<String, FileOutputStream> open = new HashMap<>();
    private final Map<String, File> files = new HashMap<>();
    private int counter = 0;

    private File outDir() {
        File dir = new File(getContext().getCacheDir(), "out");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return dir;
    }

    private static String safeName(String name) {
        String cleaned = name == null ? "file" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        return cleaned.isEmpty() ? "file" : cleaned;
    }

    @PluginMethod
    public synchronized void begin(PluginCall call) {
        String name = safeName(call.getString("name"));
        // Earlier files are no longer needed once a new one starts.
        File[] old = outDir().listFiles();
        if (old != null) for (File f : old) if (!files.containsValue(f)) f.delete();
        try {
            String id = String.valueOf(++counter);
            File dir = new File(outDir(), id);
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            File file = new File(dir, name);
            open.put(id, new FileOutputStream(file));
            files.put(id, file);
            JSObject result = new JSObject();
            result.put("id", id);
            call.resolve(result);
        } catch (Exception failed) {
            call.reject("Cannot start: " + failed);
        }
    }

    @PluginMethod
    public synchronized void chunk(PluginCall call) {
        FileOutputStream stream = open.get(call.getString("id"));
        String data = call.getString("data");
        if (stream == null || data == null) {
            call.reject("Unknown file");
            return;
        }
        try {
            stream.write(Base64.decode(data, Base64.DEFAULT));
            call.resolve();
        } catch (Exception failed) {
            call.reject("Cannot write: " + failed);
        }
    }

    /** Closes the file; with mode "save" it also copies it to the phone's public folders. */
    @PluginMethod
    public synchronized void finish(PluginCall call) {
        String id = call.getString("id");
        String mime = call.getString("mime", "application/octet-stream");
        String mode = call.getString("mode", "save");
        FileOutputStream stream = open.remove(id);
        File file = files.get(id);
        if (stream == null || file == null) {
            call.reject("Unknown file");
            return;
        }
        try {
            stream.close();
        } catch (Exception ignored) {
            // Closing a file we just wrote; the copy below will show any real problem.
        }
        JSObject result = new JSObject();
        try {
            if ("share".equals(mode)) {
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType(mime);
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent chooser = Intent.createChooser(send, null);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(chooser);
                result.put("ok", true);
            } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                // Before Android 10 saving to public folders needs a storage permission we do not ask for.
                result.put("ok", false);
                result.put("reason", "unsupported");
            } else {
                result.put("ok", true);
                result.put("where", saveToPublic(file, mime));
            }
            call.resolve(result);
        } catch (Exception failed) {
            call.reject("Cannot " + mode + ": " + failed);
        }
    }

    private String saveToPublic(File file, String mime) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        Uri collection;
        String folder;
        String label;
        if (mime.startsWith("image/")) {
            collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            folder = "Pictures/" + FOLDER;
            label = "Pictures";
        } else if (mime.startsWith("video/")) {
            collection = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            folder = "Movies/" + FOLDER;
            label = "Movies";
        } else {
            collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            folder = "Download/" + FOLDER;
            label = "Downloads";
        }
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, file.getName());
        values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, folder);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri target = resolver.insert(collection, values);
        if (target == null) throw new IllegalStateException("No destination");
        try (InputStream in = new FileInputStream(file); OutputStream out = resolver.openOutputStream(target)) {
            if (out == null) throw new IllegalStateException("No output");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) > 0) out.write(buffer, 0, read);
        }
        ContentValues done = new ContentValues();
        done.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(target, done, null, null);
        return label + "/" + FOLDER;
    }
}
