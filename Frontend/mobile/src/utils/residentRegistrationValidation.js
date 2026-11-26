/** Return live-face quality measurements from face-api.js 68-point landmarks. */
export function isUsableLiveFace(face, frameWidth, frameHeight) {
  const box = face?.detection?.box;
  const score = face?.detection?.score || 0;
  if (!box || !frameWidth || !frameHeight || score < 0.72 || box.width < 100 || box.height < 100) {
    return false;
  }
  const areaRatio = (box.width * box.height) / (frameWidth * frameHeight);
  const aspectRatio = box.width / box.height;
  const centerX = (box.x + box.width / 2) / frameWidth;
  const centerY = (box.y + box.height / 2) / frameHeight;
  return (
    areaRatio >= 0.04 &&
    aspectRatio >= 0.55 && aspectRatio <= 1.35 &&
    centerX >= 0.18 && centerX <= 0.82 &&
    centerY >= 0.12 && centerY <= 0.88
  );
}

export function getLiveFaceYaw(landmarks) {
  const points = landmarks?.positions;
  if (!Array.isArray(points) || points.length < 48) return null;
  const leftEyeCenter = points.slice(36, 42).reduce((sum, point) => sum + point.x, 0) / 6;
  const rightEyeCenter = points.slice(42, 48).reduce((sum, point) => sum + point.x, 0) / 6;
  const eyeSpan = Math.abs(rightEyeCenter - leftEyeCenter);
  if (!eyeSpan || !points[30]) return null;
  const eyeMidpoint = (leftEyeCenter + rightEyeCenter) / 2;
  const noseTip = points[30];

  return (noseTip.x - eyeMidpoint) / eyeSpan;
}
