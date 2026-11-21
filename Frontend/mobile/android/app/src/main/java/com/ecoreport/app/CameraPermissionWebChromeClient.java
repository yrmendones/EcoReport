package com.ecoreport.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.text.TextUtils;
import android.webkit.PermissionRequest;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.Locale;

public class CameraPermissionWebChromeClient extends BridgeWebChromeClient {

    private final Bridge bridge;

    public CameraPermissionWebChromeClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public void onPermissionRequest(PermissionRequest request) {
        String[] requestedResources = request.getResources();
        boolean requestsCamera = false;
        if (requestedResources != null) {
            for (String resource : requestedResources) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                    requestsCamera = true;
                    break;
                }
            }
        }

        if (!requestsCamera || !isAppOrigin(request.getOrigin())) {
            request.deny();
            return;
        }

        Activity activity = bridge.getActivity();
        if (activity == null) {
            request.deny();
            return;
        }

        activity.runOnUiThread(() -> {
            if (activity.isFinishing()) {
                request.deny();
                return;
            }

            boolean cameraGranted = ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED;

            if (cameraGranted) {
                request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            } else {
                request.deny();
            }
        });
    }

    private boolean isAppOrigin(Uri requestOrigin) {
        if (requestOrigin == null) return false;
        Uri appUri = Uri.parse(bridge.getAppUrl());
        return TextUtils.equals(normalize(appUri.getScheme()), normalize(requestOrigin.getScheme())) &&
            TextUtils.equals(normalize(appUri.getAuthority()), normalize(requestOrigin.getAuthority()));
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
