import { useCallback, useEffect, useRef, useState } from 'react';
import { showError, showInfo } from '../components/ToastProvider';
import { MAX_LOGIN_ATTEMPTS, MESSAGES } from '../utils/constants';

export const useWebcam = (failedAttempts) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Should capture?
  const shouldCapture = failedAttempts >= MAX_LOGIN_ATTEMPTS;

  // Request camera permission and start stream
  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      // showInfo(MESSAGES.webcamPermission); // Silent


      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setPermissionGranted(true);
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      // showError('Camera access denied. Security feature disabled.'); // Silent

      setPermissionGranted(false);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Capture snapshot
  const captureSnapshot = useCallback(async () => {
    if (!videoRef.current || !stream) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        // showInfo(MESSAGES.webcamCapture); // Silent

        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }, [stream]);

  // Cleanup stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setPermissionGranted(false);
  }, [stream]);

  // Auto-start when should capture
  useEffect(() => {
    if (shouldCapture && !permissionGranted && !isCapturing) {
      startCamera();
    }
  }, [shouldCapture, permissionGranted, isCapturing, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    permissionGranted,
    isCapturing,
    startCamera,
    captureSnapshot,
    stopCamera,
    shouldCapture
  };
};

