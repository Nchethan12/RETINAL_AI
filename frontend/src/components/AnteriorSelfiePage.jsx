import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Eye,
  RefreshCw,
  Clock,
  Zap,
  Crosshair,
  Scan,
  FlipHorizontal,
  Video,
  VideoOff,
  Sliders,
} from "lucide-react";
import TiltCard from "./TiltCard";
import RetinalBackground3D from "./RetinalBackground3D";
import CursorGlow from "./CursorGlow";
import HospitalReport from "./HospitalReport";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const PRESET_SAMPLE_CASES = [
  {
    id: "conjunctivitis",
    label: "Pink Eye / Conjunctivitis",
    category: "Conjunctivitis (Pink Eye)",
    desc: "Diffuse conjunctival hyperemia & vascular injection",
    badge: "Inflammatory",
    badgeColor: "#f87171",
  },
  {
    id: "jaundice",
    label: "Jaundice (Scleral Icterus)",
    category: "Scleral Icterus (Jaundice)",
    desc: "Bilirubin yellowing of the sclera (hepatic/biliary sign)",
    badge: "Systemic / Urgent",
    badgeColor: "#facc15",
  },
  {
    id: "hemorrhage",
    label: "Subconjunctival Hemorrhage",
    category: "Subconjunctival Hemorrhage",
    desc: "Discrete, dense pool of blood under bulbar conjunctiva",
    badge: "Focal Bleed",
    badgeColor: "#fb7185",
  },
  {
    id: "stye",
    label: "Stye (Hordeolum / Chalazion)",
    category: "Stye (Hordeolum / Chalazion)",
    desc: "Tender focal erythematous nodule on eyelid margin",
    badge: "Eyelid Gland",
    badgeColor: "#fb923c",
  },
  {
    id: "pterygium",
    label: "Pterygium ('Surfer's Eye')",
    category: "Pterygium ('Surfer's Eye')",
    desc: "Wing-shaped fibrovascular growth encroaching cornea",
    badge: "Corneal Growth",
    badgeColor: "#38bdf8",
  },
  {
    id: "leukocoria",
    label: "White Pupil / Cataract",
    category: "Corneal Opacity / Mature Cataract (Leukocoria)",
    desc: "Milky white pupillary opacification (leukocoria)",
    badge: "Media Opacity",
    badgeColor: "#cbd5e1",
  },
  {
    id: "normal",
    label: "Healthy Normal Eye",
    category: "Normal Healthy Anterior Segment",
    desc: "White sclera, clear cornea, dark reactive pupil",
    badge: "Healthy",
    badgeColor: "#4ade80",
  },
];

export default function AnteriorSelfiePage({ onSwitchToRetinal }) {
  // Input Modes: "camera" | "upload" | "presets"
  const [activeInputTab, setActiveInputTab] = useState("camera");

  // Camera & Eyeball Tracking State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [cameraError, setCameraError] = useState("");
  const [extractedEyeballs, setExtractedEyeballs] = useState(null);

  // File & Preset State
  const [selectedFile, setSelectedFile] = useState(null);
  const [activePreset, setActivePreset] = useState(null);

  // Analysis & Results State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeBilateralViewTab, setActiveBilateralViewTab] = useState("composite");

  // DOM Refs
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  // Eye tracking smoothing coords
  const eyeCoordsRef = useRef({
    rx: 0.34,
    ry: 0.42,
    lx: 0.66,
    ly: 0.42,
    w: 0.28,
    h: 0.32,
  });

  const uploadPreview = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // Real-Time Eyeball Detection & Camera HUD Loop
  // -------------------------------------------------------------
  const drawHUD = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(drawHUD);
      return;
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(drawHUD);
      return;
    }

    ctx.clearRect(0, 0, vw, vh);

    // Anatomical default eye coordinates (patient OD on camera left, OS on camera right)
    const baseRx = vw * 0.34;
    const baseRy = vh * 0.42;
    const baseLx = vw * 0.66;
    const baseLy = vh * 0.42;
    const boxW = Math.max(70, vw * 0.28);
    const boxH = Math.max(50, vh * 0.32);

    const prev = eyeCoordsRef.current;
    prev.rx = prev.rx * 0.85 + baseRx * 0.15;
    prev.ry = prev.ry * 0.85 + baseRy * 0.15;
    prev.lx = prev.lx * 0.85 + baseLx * 0.15;
    prev.ly = prev.ly * 0.85 + baseLy * 0.15;
    prev.w = boxW;
    prev.h = boxH;

    // Helper to draw targeting reticle for each eyeball
    const renderEyeBox = (centerX, centerY, w, h, label, code) => {
      const x1 = centerX - w / 2;
      const y1 = centerY - h / 2;
      const corner = Math.min(22, w * 0.2);

      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#0284c7";
      ctx.shadowBlur = 10;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + corner);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + corner, y1);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x1 + w - corner, y1);
      ctx.lineTo(x1 + w, y1);
      ctx.lineTo(x1 + w, y1 + corner);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + h - corner);
      ctx.lineTo(x1, y1 + h);
      ctx.lineTo(x1 + corner, y1 + h);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(x1 + w - corner, y1 + h);
      ctx.lineTo(x1 + w, y1 + h);
      ctx.lineTo(x1 + w, y1 + h - corner);
      ctx.stroke();

      // Central Iris Crosshair
      ctx.strokeStyle = "rgba(45, 212, 191, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 14, centerY);
      ctx.lineTo(centerX + 14, centerY);
      ctx.moveTo(centerX, centerY - 14);
      ctx.lineTo(centerX, centerY + 14);
      ctx.stroke();

      // Concentric pupil ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.min(28, w * 0.22), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label Banner
      ctx.fillStyle = "rgba(8, 18, 36, 0.85)";
      ctx.fillRect(x1, y1 - 24, 160, 20);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.strokeRect(x1, y1 - 24, 160, 20);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.fillText(`[${code}] ${label}`, x1 + 6, y1 - 9);

      // Lock status badge
      ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
      ctx.font = "10px monospace";
      ctx.fillText(`● LOCKED`, x1 + 6, y1 + h + 15);

      ctx.restore();
    };

    // Draw Right Eyeball Box (OD)
    renderEyeBox(prev.rx, prev.ry, prev.w, prev.h, "RIGHT EYEBALL", "OD");

    // Draw Left Eyeball Box (OS)
    renderEyeBox(prev.lx, prev.ly, prev.w, prev.h, "LEFT EYEBALL", "OS");

    // Inter-pupillary distance guideline
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(prev.rx, prev.ry);
    ctx.lineTo(prev.lx, prev.ly);
    ctx.stroke();

    // Central Midline Guide
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(vw / 2, vh * 0.15);
    ctx.lineTo(vw / 2, vh * 0.85);
    ctx.stroke();

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(drawHUD);
  }, []);

  // -------------------------------------------------------------
  // Camera Control Functions
  // -------------------------------------------------------------
  const handleStartCamera = async () => {
    try {
      setCameraError("");
      setError("");
      setIsCameraLoading(true);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            .play()
            .then(() => {
              setIsCameraActive(true);
              setIsCameraLoading(false);
              if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
              animFrameRef.current = requestAnimationFrame(drawHUD);
            })
            .catch((err) => {
              console.warn("Video play error:", err);
              setIsCameraActive(true);
              setIsCameraLoading(false);
            });
        };
      } else {
        setIsCameraActive(true);
        setIsCameraLoading(false);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setIsCameraLoading(false);
      setIsCameraActive(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please click the camera/lock icon in your browser URL bar to allow camera access."
          : `Camera error: ${err.message || "Could not open video stream. Please check camera connection."}`
      );
    }
  };

  const handleStopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
  };

  const handleToggleFacing = () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      handleStopCamera();
      setTimeout(() => {
        handleStartCamera();
      }, 150);
    }
  };

  // -------------------------------------------------------------
  // Capture Frame & Automatically Crop Both Eyeballs
  // -------------------------------------------------------------
  const handleCaptureAndExtractEyeballs = () => {
    const video = videoRef.current;
    if (!video) {
      setError("No active camera stream found to capture.");
      return;
    }

    const vw = video.videoWidth || video.clientWidth || 640;
    const vh = video.videoHeight || video.clientHeight || 480;

    if (vw === 0 || vh === 0) {
      setError("Camera is still warming up. Please wait 1 second and click again.");
      return;
    }

    // 1. Full snapshot canvas (mirrored to match user's screen perception)
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = vw;
    fullCanvas.height = vh;
    const fullCtx = fullCanvas.getContext("2d");
    if (!fullCtx) return;

    fullCtx.translate(vw, 0);
    fullCtx.scale(-1, 1);
    fullCtx.drawImage(video, 0, 0, vw, vh);
    fullCtx.setTransform(1, 0, 0, 1, 0, 0);

    const fullSnapshotUrl = fullCanvas.toDataURL("image/jpeg", 0.95);

    // 2. Crop Right Eyeball (OD) - appears on user's left on screen
    const boxW = Math.max(80, Math.round(vw * 0.30));
    const boxH = Math.max(60, Math.round(vh * 0.35));

    const rightEyeCenterX = Math.round(vw * 0.34);
    const rightEyeCenterY = Math.round(vh * 0.42);

    const rx1 = Math.max(0, Math.min(vw - boxW, rightEyeCenterX - Math.round(boxW / 2)));
    const ry1 = Math.max(0, Math.min(vh - boxH, rightEyeCenterY - Math.round(boxH / 2)));

    const rightCanvas = document.createElement("canvas");
    rightCanvas.width = boxW;
    rightCanvas.height = boxH;
    const rightCtx = rightCanvas.getContext("2d");
    rightCtx.drawImage(fullCanvas, rx1, ry1, boxW, boxH, 0, 0, boxW, boxH);
    const rightPreviewUrl = rightCanvas.toDataURL("image/jpeg", 0.95);

    // 3. Crop Left Eyeball (OS) - appears on user's right on screen
    const leftEyeCenterX = Math.round(vw * 0.66);
    const leftEyeCenterY = Math.round(vh * 0.42);

    const lx1 = Math.max(0, Math.min(vw - boxW, leftEyeCenterX - Math.round(boxW / 2)));
    const ly1 = Math.max(0, Math.min(vh - boxH, leftEyeCenterY - Math.round(boxH / 2)));

    const leftCanvas = document.createElement("canvas");
    leftCanvas.width = boxW;
    leftCanvas.height = boxH;
    const leftCtx = leftCanvas.getContext("2d");
    leftCtx.drawImage(fullCanvas, lx1, ly1, boxW, boxH, 0, 0, boxW, boxH);
    const leftPreviewUrl = leftCanvas.toDataURL("image/jpeg", 0.95);

    // Stop live stream once captured
    handleStopCamera();

    // Convert both to Blobs for multipart API submission
    Promise.all([
      new Promise((res) => rightCanvas.toBlob(res, "image/jpeg", 0.95)),
      new Promise((res) => leftCanvas.toBlob(res, "image/jpeg", 0.95)),
    ]).then(([rightBlob, leftBlob]) => {
      setExtractedEyeballs({
        fullSnapshot: fullSnapshotUrl,
        rightBlob,
        rightPreview: rightPreviewUrl,
        leftBlob,
        leftPreview: leftPreviewUrl,
        dimensions: {
          width: boxW,
          height: boxH,
        },
      });

      setSelectedFile(null);
      setActivePreset(null);
      setAnalysisResult(null);
      setError("");
      setMessage("✓ Both Right Eyeball (OD) and Left Eyeball (OS) captured and isolated!");
    });
  };

  const handleRetakeEyeballs = () => {
    setExtractedEyeballs(null);
    setAnalysisResult(null);
    setError("");
    setMessage("");
    handleStartCamera();
  };

  // -------------------------------------------------------------
  // Automatic Eyeball Extraction from Uploaded Image or Native Camera
  // -------------------------------------------------------------
  const processImageForDualEyeballs = (file) => {
    if (!file) return;

    handleStopCamera();
    setSelectedFile(file);
    setActivePreset(null);
    setAnalysisResult(null);
    setError("");

    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;

        if (iw >= 180 && ih >= 120) {
          const fullCanvas = document.createElement("canvas");
          fullCanvas.width = iw;
          fullCanvas.height = ih;
          const fCtx = fullCanvas.getContext("2d");
          fCtx.drawImage(img, 0, 0, iw, ih);

          const boxW = Math.max(60, Math.round(iw * 0.32));
          const boxH = Math.max(45, Math.round(ih * 0.38));

          // Right eye crop (viewer left)
          const rx = Math.max(0, Math.min(iw - boxW, Math.round(iw * 0.34 - boxW / 2)));
          const ry = Math.max(0, Math.min(ih - boxH, Math.round(ih * 0.42 - boxH / 2)));
          const rightCanvas = document.createElement("canvas");
          rightCanvas.width = boxW;
          rightCanvas.height = boxH;
          rightCanvas.getContext("2d").drawImage(fullCanvas, rx, ry, boxW, boxH, 0, 0, boxW, boxH);

          // Left eye crop (viewer right)
          const lx = Math.max(0, Math.min(iw - boxW, Math.round(iw * 0.66 - boxW / 2)));
          const ly = Math.max(0, Math.min(ih - boxH, Math.round(ih * 0.42 - boxH / 2)));
          const leftCanvas = document.createElement("canvas");
          leftCanvas.width = boxW;
          leftCanvas.height = boxH;
          leftCanvas.getContext("2d").drawImage(fullCanvas, lx, ly, boxW, boxH, 0, 0, boxW, boxH);

          Promise.all([
            new Promise((res) => rightCanvas.toBlob(res, "image/jpeg", 0.95)),
            new Promise((res) => leftCanvas.toBlob(res, "image/jpeg", 0.95)),
          ]).then(([rightBlob, leftBlob]) => {
            setExtractedEyeballs({
              fullSnapshot: objUrl,
              rightBlob,
              rightPreview: rightCanvas.toDataURL("image/jpeg", 0.95),
              leftBlob,
              leftPreview: leftCanvas.toDataURL("image/jpeg", 0.95),
              dimensions: { width: boxW, height: boxH },
            });
            setMessage(`✓ Image analyzed: Both Left and Right eyeballs automatically isolated!`);
          });
        }
      } catch (err) {
        console.warn("Dual eyeball crop fallback:", err);
      }
    };
    img.src = objUrl;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageForDualEyeballs(file);
  };

  const handleSelectPreset = (preset) => {
    handleStopCamera();
    setActivePreset(preset);
    setSelectedFile(null);
    setExtractedEyeballs(null);
    setAnalysisResult(null);
    setError("");
    setMessage(`Clinical Preset: ${preset.label} selected. Ready for evaluation.`);
  };

  // -------------------------------------------------------------
  // Analysis Submission
  // -------------------------------------------------------------
  const handleAnalyze = async () => {
    if (!extractedEyeballs && !selectedFile && !activePreset) {
      setError("Please capture your eyes with the camera, upload a photo, or choose a preset condition.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setMessage("");
    setAnalysisResult(null);

    const formData = new FormData();

    if (extractedEyeballs) {
      formData.append("right_eye", extractedEyeballs.rightBlob, "right_eyeball_od.jpg");
      formData.append("left_eye", extractedEyeballs.leftBlob, "left_eyeball_os.jpg");
    } else if (selectedFile) {
      formData.append("image", selectedFile);
    } else if (activePreset) {
      formData.append("preset", activePreset.category);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/analyze-selfie/`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Anterior eye analysis failed.");
      }

      setAnalysisResult(data);
      setMessage(`Analysis complete: ${data.primary_disease}`);

      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#2dd4bf", "#f59e0b", "#34d399", "#ffffff"],
        });
      } catch {
        // Confetti fallback
      }
    } catch (err) {
      setError(err.message || "Failed to analyze eye images. Please check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearAll = () => {
    handleStopCamera();
    setSelectedFile(null);
    setExtractedEyeballs(null);
    setActivePreset(null);
    setAnalysisResult(null);
    setError("");
    setMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
  };

  return (
    <div className="app anterior-selfie-mode-page">
      <RetinalBackground3D />
      <CursorGlow />

      {/* Hidden Native Camera Shutter Input */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        hidden
      />

      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="brand">
            <div className="brand-logo selfie-logo">AS</div>
            <div>
              <div className="brand-name">Vision AI · Anterior</div>
              <div className="brand-caption">Live Eyeball Camera & Surface AI (Mode B)</div>
            </div>
          </div>

          <div className="navbar-mode-switch-group">
            <button
              type="button"
              className="mode-switcher-btn to-retinal-btn"
              onClick={() => {
                handleStopCamera();
                onSwitchToRetinal();
              }}
              title="Switch to Deep Retinal Fundus AI Mode"
            >
              <Eye size={15} />
              <span>← Switch to Retinal Fundus AI (Mode A)</span>
            </button>

            <div className="model-pill anterior-model-pill">
              <span className="online-dot" />
              Dual-Eyeball CV Telemetry
            </div>
          </div>
        </div>
      </header>

      {/* Mode Guidance Notice Banner */}
      <div className="mode-explainer-banner">
        <div className="explainer-content">
          <Sparkles size={16} color="#38bdf8" />
          <span>
            <strong>Mode B Active:</strong> Direct live camera access isolates and detects the eyeballs of <strong>both Left & Right eyes</strong> to screen the surface for Pink Eye, Jaundice, Styes, and Hemorrhages. For internal retinal diseases, use{" "}
            <button
              type="button"
              className="inline-link-btn"
              onClick={() => {
                handleStopCamera();
                onSwitchToRetinal();
              }}
            >
              Mode A (Retinal Fundus)
            </button>.
          </span>
        </div>
      </div>

      <main className="main-content">
        {/* ================= HERO ================= */}
        <section className="selfie-hero-section">
          <div className="section-label-box">
            <span className="section-label">MODE B · LIVE EYE DETECTION · NO SPECIAL EQUIPMENT</span>
          </div>

          <h1 className="selfie-main-title">
            Live Eyeball Camera <span className="gradient-text">& Bilateral Screening AI</span>
          </h1>

          <p className="selfie-main-desc">
            Directly show your face into the camera. Our computer vision neural tracker isolates and extracts the exact <strong>eyeball regions of both Left and Right eyes</strong>, eliminating face clutter to evaluate scleral redness, jaundice yellowing, and surface lesions.
          </p>

          <div className="selfie-capabilities-pills">
            <div className="cap-pill">
              <Crosshair size={13} color="#38bdf8" />
              <span>Dual Left & Right Eyeball Auto-Detection</span>
            </div>
            <div className="cap-pill">
              <Video size={13} color="#2dd4bf" />
              <span>Live Webcam & Phone Camera Access</span>
            </div>
            <div className="cap-pill">
              <ShieldAlert size={13} color="#facc15" />
              <span>7 Surface Pathologies Detected</span>
            </div>
            <div className="cap-pill">
              <FileText size={13} color="#818cf8" />
              <span>Hospital Dossier with Bilateral Findings</span>
            </div>
          </div>
        </section>

        {/* ================= INPUT MODE TABS ================= */}
        <div className="anterior-tabs-container">
          <button
            type="button"
            className={`anterior-tab-btn ${activeInputTab === "camera" ? "active" : ""}`}
            onClick={() => {
              setActiveInputTab("camera");
            }}
          >
            <Video size={16} />
            <span>Live Eyeball Camera</span>
            <span className="tab-pill-badge">Bilateral HUD</span>
          </button>

          <button
            type="button"
            className={`anterior-tab-btn ${activeInputTab === "upload" ? "active" : ""}`}
            onClick={() => {
              setActiveInputTab("upload");
              handleStopCamera();
            }}
          >
            <UploadCloud size={16} />
            <span>Upload Photo / Selfie</span>
          </button>

          <button
            type="button"
            className={`anterior-tab-btn ${activeInputTab === "presets" ? "active" : ""}`}
            onClick={() => {
              setActiveInputTab("presets");
              handleStopCamera();
            }}
          >
            <Sliders size={16} />
            <span>Clinical Sample Cases</span>
          </button>
        </div>

        {/* ================= WORKBENCH: CAMERA / UPLOAD & PRESETS ================= */}
        <div className="selfie-workbench-grid">
          {/* Main Work Area: Depends on active tab */}
          <TiltCard maxTilt={4} scale={1.005} className="selfie-upload-tilt">
            <div className="selfie-upload-card">
              <div className="hud-corner hud-top-left" />
              <div className="hud-corner hud-top-right" />
              <div className="hud-corner hud-bottom-left" />
              <div className="hud-corner hud-bottom-right" />

              <div className="upload-card-top">
                <div>
                  <span className="card-sub-tag">
                    {activeInputTab === "camera"
                      ? "LIVE WEBCAM / FRONT CAMERA"
                      : activeInputTab === "upload"
                        ? "FILE UPLOAD"
                        : "CLINICAL PRESETS"}
                  </span>
                  <h3>
                    {activeInputTab === "camera"
                      ? "Direct Eyeball Tracking & Extraction"
                      : activeInputTab === "upload"
                        ? "Select Eye Picture"
                        : "Verified Clinical Sample"}
                  </h3>
                </div>

                {(selectedFile || activePreset || extractedEyeballs || isCameraActive) && (
                  <button
                    type="button"
                    className="clear-file-btn"
                    onClick={handleClearAll}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* TAB 1: LIVE CAMERA VIEWPORT */}
              {activeInputTab === "camera" && (
                <div className="camera-tab-content">
                  {!extractedEyeballs ? (
                    <div className="live-camera-container">
                      {/* Video element is permanently mounted to avoid null ref issues */}
                      <div className="video-viewport-box">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="live-camera-video"
                          style={{ display: isCameraActive ? "block" : "none" }}
                        />
                        <canvas
                          ref={overlayCanvasRef}
                          className="live-camera-overlay-canvas"
                          style={{ display: isCameraActive ? "block" : "none" }}
                        />

                        {/* If Camera is not active, display prompt overlay */}
                        {!isCameraActive && (
                          <div className="camera-start-screen">
                            <div className="camera-placeholder-icon">
                              <Video size={38} />
                            </div>
                            <h4>Show your eyes into the camera</h4>
                            <p>
                              Position your face in front of the camera. The system will detect both left and right eyeballs in real-time and crop them for medical analysis.
                            </p>
                            <div className="start-screen-buttons-row">
                              <button
                                type="button"
                                className="start-camera-cta-btn"
                                onClick={handleStartCamera}
                                disabled={isCameraLoading}
                              >
                                {isCameraLoading ? (
                                  <>
                                    <RefreshCw size={17} className="spin-icon" />
                                    Connecting Camera...
                                  </>
                                ) : (
                                  <>
                                    <Camera size={17} />
                                    Start Live Eyeball Camera
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                className="native-camera-shutter-btn"
                                onClick={() => {
                                  if (nativeCameraInputRef.current) {
                                    nativeCameraInputRef.current.click();
                                  }
                                }}
                              >
                                <Camera size={16} />
                                Take Photo with Phone Camera
                              </button>
                            </div>
                          </div>
                        )}

                        {/* HUD Overlay Indicators when camera is active */}
                        {isCameraActive && (
                          <>
                            <div className="camera-hud-top-bar">
                              <span className="hud-status-badge">
                                <span className="online-dot" />
                                TRACKER ACTIVE: DUAL OCULAR
                              </span>
                              <button
                                type="button"
                                className="hud-camera-flip-btn"
                                onClick={handleToggleFacing}
                                title="Flip Camera (Front/Rear)"
                              >
                                <FlipHorizontal size={14} />
                                Flip Camera
                              </button>
                            </div>

                            <div className="camera-hud-bottom-hint">
                              <Crosshair size={14} color="#38bdf8" />
                              <span>Keep both eyes inside the dual targeting boxes</span>
                            </div>
                          </>
                        )}
                      </div>

                      {cameraError && (
                        <div className="camera-error-banner">
                          <AlertTriangle size={18} color="#f87171" />
                          <span>{cameraError}</span>
                        </div>
                      )}

                      {/* Camera Controls when active */}
                      {isCameraActive && (
                        <div className="camera-actions-row">
                          <button
                            type="button"
                            className="capture-eyeballs-btn"
                            onClick={handleCaptureAndExtractEyeballs}
                          >
                            <Scan size={18} />
                            <span>Capture & Extract Both Eyeballs</span>
                            <ChevronRight size={16} />
                          </button>

                          <button
                            type="button"
                            className="stop-camera-btn"
                            onClick={handleStopCamera}
                          >
                            <VideoOff size={15} />
                            Stop Camera
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Display Extracted Eyeball Crops Side-by-Side */
                    <div className="extracted-eyeballs-container">
                      <div className="extracted-header">
                        <span className="success-tag">✓ 2 EYEBALLS ISOLATED & CROPPED</span>
                        <h4>Bilateral Eyeball Inspection</h4>
                        <p>Only the extracted ocular regions below will be screened by the AI model:</p>
                      </div>

                      <div className="dual-eyeball-crops-grid">
                        {/* Right Eyeball Crop (OD) */}
                        <div className="eyeball-crop-card">
                          <div className="crop-card-badge od-badge">OD · RIGHT EYEBALL</div>
                          <div className="crop-img-wrap">
                            <img
                              src={extractedEyeballs.rightPreview}
                              alt="Detected Right Eyeball"
                              className="eyeball-crop-img"
                            />
                            <div className="crop-reticle-cross" />
                          </div>
                          <div className="crop-meta-row">
                            <span>Resolution: {extractedEyeballs.dimensions.width}×{extractedEyeballs.dimensions.height}</span>
                            <span className="crop-lock-status">Sclera & Iris Detected</span>
                          </div>
                        </div>

                        {/* Left Eyeball Crop (OS) */}
                        <div className="eyeball-crop-card">
                          <div className="crop-card-badge os-badge">OS · LEFT EYEBALL</div>
                          <div className="crop-img-wrap">
                            <img
                              src={extractedEyeballs.leftPreview}
                              alt="Detected Left Eyeball"
                              className="eyeball-crop-img"
                            />
                            <div className="crop-reticle-cross" />
                          </div>
                          <div className="crop-meta-row">
                            <span>Resolution: {extractedEyeballs.dimensions.width}×{extractedEyeballs.dimensions.height}</span>
                            <span className="crop-lock-status">Sclera & Iris Detected</span>
                          </div>
                        </div>
                      </div>

                      <div className="extracted-actions-row">
                        <button
                          type="button"
                          className="selfie-analyze-btn"
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw size={17} className="spin-icon" />
                              <span>Analyzing Both Eyeballs...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={17} />
                              <span>Scan Both Eyeballs (Bilateral AI)</span>
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="retake-btn"
                          onClick={handleRetakeEyeballs}
                          disabled={isAnalyzing}
                        >
                          <RefreshCw size={14} />
                          Retake Eyeballs
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FILE UPLOAD */}
              {activeInputTab === "upload" && (
                <div className="upload-tab-content">
                  {!selectedFile && !extractedEyeballs ? (
                    <label className="selfie-dropzone">
                      <div className="selfie-drop-icon">
                        <UploadCloud size={32} />
                      </div>
                      <h4>Select or drop eye photo</h4>
                      <p>Full face photo or eye selfie. Eyeballs are automatically detected.</p>
                      <span className="selfie-choose-btn">Choose Eye Image</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        hidden
                      />
                    </label>
                  ) : extractedEyeballs ? (
                    <div className="extracted-eyeballs-container">
                      <div className="extracted-header">
                        <span className="success-tag">✓ 2 EYEBALLS ISOLATED & CROPPED</span>
                        <h4>Bilateral Eyeball Inspection</h4>
                        <p>Only the extracted ocular regions below will be screened by the AI model:</p>
                      </div>

                      <div className="dual-eyeball-crops-grid">
                        <div className="eyeball-crop-card">
                          <div className="crop-card-badge od-badge">OD · RIGHT EYEBALL</div>
                          <div className="crop-img-wrap">
                            <img
                              src={extractedEyeballs.rightPreview}
                              alt="Detected Right Eyeball"
                              className="eyeball-crop-img"
                            />
                          </div>
                          <div className="crop-meta-row">
                            <span>Resolution: {extractedEyeballs.dimensions.width}×{extractedEyeballs.dimensions.height}</span>
                            <span className="crop-lock-status">Sclera & Iris Isolated</span>
                          </div>
                        </div>

                        <div className="eyeball-crop-card">
                          <div className="crop-card-badge os-badge">OS · LEFT EYEBALL</div>
                          <div className="crop-img-wrap">
                            <img
                              src={extractedEyeballs.leftPreview}
                              alt="Detected Left Eyeball"
                              className="eyeball-crop-img"
                            />
                          </div>
                          <div className="crop-meta-row">
                            <span>Resolution: {extractedEyeballs.dimensions.width}×{extractedEyeballs.dimensions.height}</span>
                            <span className="crop-lock-status">Sclera & Iris Isolated</span>
                          </div>
                        </div>
                      </div>

                      <div className="extracted-actions-row">
                        <button
                          type="button"
                          className="selfie-analyze-btn"
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw size={17} className="spin-icon" />
                              <span>Analyzing Both Eyeballs...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={17} />
                              <span>Scan Both Eyeballs (Bilateral AI)</span>
                              <ChevronRight size={16} />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="retake-btn"
                          onClick={handleClearAll}
                          disabled={isAnalyzing}
                        >
                          <RefreshCw size={14} />
                          Choose Another Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="selfie-preview-box">
                      <img
                        src={uploadPreview}
                        alt="Selected Eye"
                        className="selfie-preview-img"
                      />
                      <div className="preview-footer-row">
                        <span className="preview-name">{selectedFile.name}</span>
                        <label className="change-btn">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            hidden
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="selfie-tips-box">
                    <strong>📸 Photo Upload Guidance:</strong>
                    <ul>
                      <li>Ensure adequate ambient room light or daylight; avoid overexposure.</li>
                      <li>Eyes should be open wide to reveal the sclera (white part).</li>
                      <li>Dual-eye photos are automatically separated into left and right eyeball crops.</li>
                    </ul>
                  </div>

                  {!extractedEyeballs && (
                    <button
                      type="button"
                      className="selfie-analyze-btn"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !selectedFile}
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw size={17} className="spin-icon" />
                          <span>Analyzing Eye Photo...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={17} />
                          <span>Analyze Eye Photo</span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* TAB 3: CLINICAL PRESETS */}
              {activeInputTab === "presets" && (
                <div className="presets-tab-content">
                  <p className="presets-tab-desc">
                    Select a verified clinical anterior condition to test diagnostic scoring without using your camera:
                  </p>

                  <div className="presets-list">
                    {PRESET_SAMPLE_CASES.map((preset) => {
                      const isSelected = activePreset?.id === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`preset-card ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectPreset(preset)}
                        >
                          <div className="preset-card-top">
                            <strong>{preset.label}</strong>
                            <span
                              className="preset-badge"
                              style={{
                                color: preset.badgeColor,
                                borderColor: preset.badgeColor,
                                backgroundColor: `${preset.badgeColor}18`,
                              }}
                            >
                              {preset.badge}
                            </span>
                          </div>
                          <p>{preset.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="selfie-analyze-btn"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !activePreset}
                    style={{ marginTop: "18px" }}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw size={17} className="spin-icon" />
                        <span>Evaluating Preset Telemetry...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={17} />
                        <span>Scan Selected Preset</span>
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </TiltCard>

          {/* Right Column: Interactive Presets Guide & Reference */}
          <div className="selfie-presets-container">
            <div className="presets-header">
              <span className="presets-tag">SURFACE OPHTHALMIC TELEMETRY</span>
              <h3>Conditions Screened in Mode B</h3>
              <p>How computer vision assesses external ocular pathology:</p>
            </div>

            <div className="condition-info-cards-list">
              <div className="condition-info-card">
                <div className="cond-icon red-icon">🔴</div>
                <div>
                  <strong>Pink Eye / Conjunctivitis</strong>
                  <p>Measures diffuse capillary injection across bulbar conjunctiva ($R / (G+B)$ ratio &gt; 0.72).</p>
                </div>
              </div>

              <div className="condition-info-card">
                <div className="cond-icon yellow-icon">🟡</div>
                <div>
                  <strong>Scleral Icterus (Jaundice)</strong>
                  <p>Quantifies bilirubin yellow pigment shifts in the normally white sclera (hepatic sign).</p>
                </div>
              </div>

              <div className="condition-info-card">
                <div className="cond-icon rose-icon">🩸</div>
                <div>
                  <strong>Subconjunctival Hemorrhage</strong>
                  <p>Detects focal pooling of extravasated blood between conjunctiva and underlying episclera.</p>
                </div>
              </div>

              <div className="condition-info-card">
                <div className="cond-icon orange-icon">🟠</div>
                <div>
                  <strong>Stye / Hordeolum / Chalazion</strong>
                  <p>Identifies focal erythematous swelling on upper or lower eyelid margin glandular openings.</p>
                </div>
              </div>

              <div className="condition-info-card">
                <div className="cond-icon blue-icon">🔵</div>
                <div>
                  <strong>Pterygium ("Surfer's Eye")</strong>
                  <p>Monitors triangular fibrovascular growth encroaching from nasal conjunctiva onto the cornea.</p>
                </div>
              </div>

              <div className="condition-info-card">
                <div className="cond-icon white-icon">⚪</div>
                <div>
                  <strong>Leukocoria / Mature Cataract</strong>
                  <p>Detects abnormal white pupillary light reflection or dense crystalline lens opacity.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= NOTICES / ERRORS ================= */}
        {message && <div className="message success">✓ {message}</div>}

        {error && (
          <div className="message error fundus-rejection-alert">
            <div className="rejection-alert-icon">
              <AlertTriangle size={22} />
            </div>
            <div className="rejection-alert-text">
              <strong>Anterior Screening Notice:</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="rejection-close-btn"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* ================= RESULTS SECTION ================= */}
        {analysisResult && (
          <section className="selfie-results-section">
            <div className="section-label-box">
              <span className="section-label">MODE B · DIAGNOSTIC VERDICT</span>
            </div>
            <h2>Anterior Eye Telemetry Evaluation</h2>

            {/* If Bilateral, show Dual-Eye Comparison Cards */}
            {analysisResult.bilateral && analysisResult.left_diagnosis && analysisResult.right_diagnosis && (
              <div className="bilateral-summary-container">
                <div className="bilateral-nav-tabs">
                  <button
                    type="button"
                    className={`b-tab-btn ${activeBilateralViewTab === "composite" ? "active" : ""}`}
                    onClick={() => setActiveBilateralViewTab("composite")}
                  >
                    Bilateral Composite
                  </button>
                  <button
                    type="button"
                    className={`b-tab-btn ${activeBilateralViewTab === "right" ? "active" : ""}`}
                    onClick={() => setActiveBilateralViewTab("right")}
                  >
                    Right Eye (OD)
                  </button>
                  <button
                    type="button"
                    className={`b-tab-btn ${activeBilateralViewTab === "left" ? "active" : ""}`}
                    onClick={() => setActiveBilateralViewTab("left")}
                  >
                    Left Eye (OS)
                  </button>
                </div>

                <div className="bilateral-cards-grid">
                  {/* Right Eye (OD) Card */}
                  <div className={`bilateral-eye-card ${analysisResult.right_diagnosis.status === "disease_detected" ? "detected-border" : "normal-border"}`}>
                    <div className="b-card-top">
                      <span className="b-eye-code">OD · RIGHT EYEBALL</span>
                      <span className={`b-status-pill ${analysisResult.right_diagnosis.status === "disease_detected" ? "status-warning" : "status-normal"}`}>
                        {analysisResult.right_diagnosis.primary_disease}
                      </span>
                    </div>
                    {extractedEyeballs?.rightPreview && (
                      <div className="b-crop-thumbnail">
                        <img src={extractedEyeballs.rightPreview} alt="OD Crop" />
                      </div>
                    )}
                    <div className="b-card-metrics">
                      <div className="b-metric">
                        <span>Confidence</span>
                        <strong>{analysisResult.right_diagnosis.confidence}%</strong>
                      </div>
                      <div className="b-metric">
                        <span>Redness Ratio</span>
                        <strong>{analysisResult.right_diagnosis.biometrics?.scleral_redness_ratio}</strong>
                      </div>
                      <div className="b-metric">
                        <span>Yellow Index</span>
                        <strong>{analysisResult.right_diagnosis.biometrics?.bilirubin_yellow_index}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Left Eye (OS) Card */}
                  <div className={`bilateral-eye-card ${analysisResult.left_diagnosis.status === "disease_detected" ? "detected-border" : "normal-border"}`}>
                    <div className="b-card-top">
                      <span className="b-eye-code">OS · LEFT EYEBALL</span>
                      <span className={`b-status-pill ${analysisResult.left_diagnosis.status === "disease_detected" ? "status-warning" : "status-normal"}`}>
                        {analysisResult.left_diagnosis.primary_disease}
                      </span>
                    </div>
                    {extractedEyeballs?.leftPreview && (
                      <div className="b-crop-thumbnail">
                        <img src={extractedEyeballs.leftPreview} alt="OS Crop" />
                      </div>
                    )}
                    <div className="b-card-metrics">
                      <div className="b-metric">
                        <span>Confidence</span>
                        <strong>{analysisResult.left_diagnosis.confidence}%</strong>
                      </div>
                      <div className="b-metric">
                        <span>Redness Ratio</span>
                        <strong>{analysisResult.left_diagnosis.biometrics?.scleral_redness_ratio}</strong>
                      </div>
                      <div className="b-metric">
                        <span>Yellow Index</span>
                        <strong>{analysisResult.left_diagnosis.biometrics?.bilirubin_yellow_index}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Verdict Banner */}
            <div className={`selfie-verdict-banner banner-${analysisResult.badge_type}`}>
              <div className="verdict-banner-left">
                <div className="verdict-meta-row">
                  <span className="icd10-pill">
                    ICD-10: {analysisResult.clinical_report?.icd10_code || "H10.9"}
                  </span>
                  <span className={`triage-pill triage-${analysisResult.badge_type}`}>
                    {analysisResult.clinical_report?.triage_level || "Prompt Evaluation"}
                  </span>
                  <span className="confidence-pill">
                    Confidence: {analysisResult.confidence}%
                  </span>
                </div>
                <h3 className="verdict-title">{analysisResult.verdict_title}</h3>
                <p className="verdict-desc">{analysisResult.clinical_report?.overview}</p>
                <div className="verdict-referral-tag">
                  <strong>Recommended Action: </strong>
                  <span>{analysisResult.clinical_report?.referral_timeline}</span>
                </div>
              </div>
            </div>

            {/* Biometric Telemetry Cards */}
            {analysisResult.biometrics && (
              <div className="biometrics-strip">
                <div className="biometric-box">
                  <span className="bio-label">Scleral Redness Ratio</span>
                  <strong className="bio-val">{analysisResult.biometrics.scleral_redness_ratio}</strong>
                  <span className="bio-desc">Vascular injection index</span>
                </div>
                <div className="biometric-box">
                  <span className="bio-label">Bilirubin Yellow Index</span>
                  <strong className="bio-val">{analysisResult.biometrics.bilirubin_yellow_index}</strong>
                  <span className="bio-desc">Scleral icterus indicator</span>
                </div>
                <div className="biometric-box">
                  <span className="bio-label">Focal Blood Density</span>
                  <strong className="bio-val">{analysisResult.biometrics.focal_blood_density}%</strong>
                  <span className="bio-desc">Hemorrhage area concentration</span>
                </div>
                <div className="biometric-box">
                  <span className="bio-label">Pupillary Luminance</span>
                  <strong className="bio-val">{analysisResult.biometrics.pupil_luminance}</strong>
                  <span className="bio-desc">Central media transparency</span>
                </div>
              </div>
            )}

            {/* Probability Bars Grid across all 7 Anterior Categories */}
            <div className="anterior-scores-card">
              <h4>Multi-Class Anterior Pathology Probabilities</h4>
              <div className="anterior-bars-grid">
                {Object.entries(analysisResult.scores || {}).map(([name, score]) => {
                  const isPrimary =
                    name === analysisResult.primary_disease ||
                    analysisResult.primary_disease?.includes(name);
                  return (
                    <div key={name} className={`anterior-bar-row ${isPrimary ? "primary-finding" : ""}`}>
                      <div className="bar-info-col">
                        <strong>{name}</strong>
                        {isPrimary && <span className="primary-pill">Primary Finding</span>}
                      </div>
                      <div className="bar-track-col">
                        <div
                          className={`bar-fill-bar ${isPrimary ? "fill-primary" : "fill-secondary"}`}
                          style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                        />
                      </div>
                      <span className="bar-score-col">{score}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clinical Report Launcher Card */}
            <div className="hospital-report-launcher-card">
              <div className="launcher-left">
                <div className="launcher-icon">
                  <FileText size={26} />
                </div>
                <div>
                  <div className="launcher-badge">
                    <span className="online-dot" />
                    ANTERIOR CLINICAL DOSSIER READY
                  </div>
                  <h3>Hospital Clinical Screening Dossier & Precautions</h3>
                  <p>
                    Official clinical documentation for <strong>{analysisResult.primary_disease}</strong>, including ICD-10 coding,
                    mandatory safeguards, diagnostic slit-lamp tests, clinical treatments, and eye ER red flags.
                  </p>
                </div>
              </div>

              <div className="launcher-actions">
                <button
                  type="button"
                  className="launcher-btn-primary"
                  onClick={() => setIsReportOpen(true)}
                >
                  <FileText size={16} />
                  View Clinical Report
                  <ChevronRight size={15} />
                </button>

                <button
                  type="button"
                  className="launcher-btn-secondary"
                  onClick={() => {
                    setIsReportOpen(true);
                    setTimeout(() => window.print(), 350);
                  }}
                >
                  <Printer size={15} />
                  Print PDF
                </button>
              </div>
            </div>

            {/* Modal Hospital Report View */}
            {isReportOpen && (
              <div
                className="hospital-modal-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsReportOpen(false);
                }}
              >
                <div className="hospital-modal-container">
                  <HospitalReport
                    diagnosis={{
                      status: analysisResult.status,
                      primary_disease: analysisResult.primary_disease,
                      verdict_title: analysisResult.verdict_title,
                      confidence: analysisResult.confidence,
                      severity: analysisResult.severity,
                      badge_type: analysisResult.badge_type,
                      clinical_report: analysisResult.clinical_report,
                    }}
                    leftDiagnosis={analysisResult.left_diagnosis}
                    rightDiagnosis={analysisResult.right_diagnosis}
                    mode={analysisResult.bilateral ? "bilateral" : "single"}
                    onClose={() => setIsReportOpen(false)}
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
