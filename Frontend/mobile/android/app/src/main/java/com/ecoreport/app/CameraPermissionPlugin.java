package com.ecoreport.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "CameraPermission",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class CameraPermissionPlugin extends Plugin {

    private static final String PREFERENCES = "ecoreport_camera_permission";
    private static final String REQUESTED_BEFORE = "requested_before";
    private static final String GRANTED_BEFORE_REQUEST = "granted_before_request";
    private static final String WAS_GRANTED = "was_granted";

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        if (isCameraGranted()) {
            preferences().edit().putBoolean(WAS_GRANTED, true).apply();
            resolvePermission(call, true, true);
            return;
        }

        SharedPreferences preferences = preferences();
        boolean requestedBefore = preferences.getBoolean(REQUESTED_BEFORE, false);
        boolean wasGranted = preferences.getBoolean(WAS_GRANTED, false);
        boolean shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
            getActivity(),
            Manifest.permission.CAMERA
        );

        if (requestedBefore && !shouldShowRationale && !wasGranted) {
            resolvePermission(call, false, false);
            return;
        }

        preferences.edit()
            .putBoolean(REQUESTED_BEFORE, true)
            .putBoolean(GRANTED_BEFORE_REQUEST, wasGranted)
            .apply();
        requestPermissionForAlias("camera", call, "cameraPermissionCallback");
    }

    @PluginMethod
    public void checkCameraPermission(PluginCall call) {
        boolean granted = isCameraGranted();
        boolean canAskAgain = granted || ActivityCompat.shouldShowRequestPermissionRationale(
            getActivity(),
            Manifest.permission.CAMERA
        ) || !preferences().getBoolean(REQUESTED_BEFORE, false);
        resolvePermission(call, granted, canAskAgain);
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        boolean granted = isCameraGranted();
        SharedPreferences preferences = preferences();
        boolean wasGrantedBeforeRequest = preferences.getBoolean(GRANTED_BEFORE_REQUEST, false);
        boolean canAskAgain = granted || wasGrantedBeforeRequest ||
            ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.CAMERA);
        preferences.edit().putBoolean(WAS_GRANTED, granted).apply();
        resolvePermission(call, granted, canAskAgain);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        startActivityForResult(call, intent, "settingsReturned");
    }

    @ActivityCallback
    private void settingsReturned(PluginCall call, ActivityResult result) {
        boolean granted = isCameraGranted();
        preferences().edit().putBoolean(WAS_GRANTED, granted).apply();
        resolvePermission(call, granted, granted ||
            ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.CAMERA));
    }

    private boolean isCameraGranted() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private void resolvePermission(PluginCall call, boolean granted, boolean canAskAgain) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        result.put("canAskAgain", canAskAgain);
        result.put("permissionState", getPermissionState("camera").toString());
        call.resolve(result);
    }
}
