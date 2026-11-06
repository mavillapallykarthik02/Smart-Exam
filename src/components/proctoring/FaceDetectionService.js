export function isFaceDetectionSupported() {
    return typeof window !== "undefined" &&
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof window.FaceDetector === "function";
}

export async function detectFacesFromVideo(videoElement) {
    if (!videoElement || typeof window === "undefined") {
        return {
            supported: false,
            faceCount: 0,
            reason: "No video element is available for face detection."
        };
    }

    if (typeof window.FaceDetector !== "function") {
        return {
            supported: false,
            faceCount: 0,
            reason: "FaceDetector API is not available in this browser."
        };
    }

    try {
        const detector = new window.FaceDetector({
            fastMode: true,
            maxDetectedFaces: 5
        });
        const detectedFaces = await detector.detect(videoElement);
        return {
            supported: true,
            faceCount: detectedFaces.length,
            faces: detectedFaces,
            reason: detectedFaces.length > 0 ? "Face(s) detected successfully." : "No face detected in the current frame."
        };
    } catch (error) {
        return {
            supported: false,
            faceCount: 0,
            reason: error instanceof Error ? error.message : "Unable to detect faces in the current frame."
        };
    }
}

export function createFaceDetectionService() {
    let stream = null;
    let isMonitoring = false;
    let animationFrameId = null;
    let lastResult = {
        supported: false,
        faceCount: 0,
        multipleFaces: false,
        facePresent: false,
        status: "idle"
    };

    const stop = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        isMonitoring = false;
        lastResult = {
            ...lastResult,
            status: "stopped"
        };
        return lastResult;
    };

    const start = async (videoElement) => {
        if (!videoElement || typeof navigator === "undefined") {
            throw new Error("A valid video element is required before starting camera monitoring.");
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Webcam access is not supported in this browser.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.play().catch(() => {});
        isMonitoring = true;
        lastResult = {
            supported: isFaceDetectionSupported(),
            faceCount: 0,
            multipleFaces: false,
            facePresent: false,
            status: "ready"
        };

        const tick = async () => {
            if (!isMonitoring || !videoElement || videoElement.readyState < 2) {
                return;
            }

            const detection = await detectFacesFromVideo(videoElement);
            const faceCount = detection.faceCount ?? 0;
            const nextState = {
                supported: detection.supported,
                faceCount,
                multipleFaces: faceCount > 1,
                facePresent: faceCount > 0,
                status: faceCount > 1 ? "multiple_faces" : faceCount > 0 ? "camera_ok" : "face_missing"
            };
            lastResult = nextState;
            if (typeof window !== "undefined") {
                animationFrameId = window.requestAnimationFrame(tick);
            }
        };

        if (typeof window !== "undefined") {
            animationFrameId = window.requestAnimationFrame(tick);
        }

        return lastResult;
    };

    return {
        start,
        stop,
        getState: () => lastResult
    };
}

export default createFaceDetectionService;
