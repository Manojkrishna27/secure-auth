// 🔒 Silent capture - NO UI, works immediately on call
export const captureSilentSnapshot = async () => {
  let stream = null;

  try {
    console.log("[Security] camera started");

    // 1. Request camera
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    console.log("[Security] camera stream ready");

    // 2. Create hidden video
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    // 3. Start video playback (REQUIRED)
    await video.play();
    console.log("[Security] video playing");

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

    console.log("[Security] video ready");

    // 6. Small delay for frame stability
    await new Promise((r) => setTimeout(r, 150));

    // 7. Capture frame to canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    console.log("[Security] frame captured");

    // 8. Convert to blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) {
          console.log("[Security] blob created:", b.size, "bytes");
          resolve(b);
        } else {
          reject(new Error("Blob is null"));
        }
      }, "image/jpeg", 0.95);
    });

    // 9. Stop camera stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    return blob;
  } catch (err) {
    console.error("[Security] capture failed:", err);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    return null;
  }
};
