// 🔒 Silent capture - NO UI (except permission-required warnings), works immediately on call
import { showWarning } from '../components/ToastProvider';
import { MESSAGES } from '../utils/constants';

const isPermissionError = (err) => {
  const name = err?.name;
  const code = err?.code;
  const message = (err?.message || '').toLowerCase();

  return (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError' ||
    code === 18 || // some browsers
    message.includes('permission') ||
    message.includes('not allowed') ||
    message.includes('denied') ||
    message.includes('security')
  );
};

export const ensureWebcamForLogin = async () => {
  // Requirement: webcam is REQUIRED for login authentication.
  // Preserve silent workflow: reuse silent snapshot capture as an initialization+permission gate.
  const blob = await captureSilentSnapshot();
  return !!blob;
};

export const captureSilentSnapshot = async () => {
  let stream = null;

  try {
    if (!navigator?.mediaDevices?.getUserMedia) {
      showWarning(MESSAGES.webcamPermission);
      return null;
    }

    // 1. Request camera
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });





    // 2. Create hidden video
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    // 3. Start video playback (REQUIRED)
    await video.play();

    // 4. Wait for video metadata
    await new Promise((resolve) => {
      if (video.readyState >= 1) {
        resolve();
      } else {
        video.onloadedmetadata = resolve;
      }
    });

    // 5. Extra safety: wait until videoWidth is available
    await new Promise((resolve) => {
      const check = () => {
        if (video.videoWidth > 0) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });




    // 6. Small delay for frame stability
    await new Promise((r) => setTimeout(r, 150));

    // 7. Capture frame to canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);


    // 8. Convert to blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Blob is null'));
      }, 'image/jpeg', 0.95);
    });

    return blob;
  } catch (err) {
    // Only notify for permission-required / security-related errors
    if (isPermissionError(err)) {
      showWarning(MESSAGES.webcamPermission);
    }

    return null;
  } finally {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
};
