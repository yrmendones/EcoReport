import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeCameraPermission = registerPlugin("CameraPermission");

export function isAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function requestCameraPermission() {
  if (!isAndroidApp()) return { granted: true, canAskAgain: true };
  return NativeCameraPermission.requestCameraPermission();
}

export async function checkCameraPermission() {
  if (!isAndroidApp()) return { granted: true, canAskAgain: true };
  return NativeCameraPermission.checkCameraPermission();
}

export async function openCameraAppSettings() {
  if (!isAndroidApp()) return { granted: true, canAskAgain: true };
  return NativeCameraPermission.openAppSettings();
}
