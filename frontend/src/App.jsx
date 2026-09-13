import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  FileText,
  Layers,
  Scan,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Zap,
  ExternalLink,
  Printer,
  Camera,
} from "lucide-react";
import RetinalBackground3D from "./components/RetinalBackground3D";
import HolographicEye3D from "./components/HolographicEye3D";
import TiltCard from "./components/TiltCard";
import CursorGlow from "./components/CursorGlow";
import HospitalReport from "./components/HospitalReport";
import FeatureDetailModal from "./components/FeatureDetailModal";
import AnteriorSelfiePage from "./components/AnteriorSelfiePage";
import "./App.css";

const API_URL = "/analyze/";

const DISEASES = [
  {
    code: "N",
    name: "Normal",
  },
  {
    code: "D",
    name: "Diabetic Retinopathy",
  },
  {
    code: "G",
    name: "Glaucoma",
  },
  {
    code: "C",
    name: "Cataract",
  },
  {
    code: "A",
    name: "AMD",
  },
  {
    code: "H",
    name: "Hypertension",
  },
  {
    code: "M",
    name: "Myopia",
  },
  {
    code: "O",
    name: "Other",
  },
];

/**
 * Client-side gatekeeper to immediately reject external eye/face selfies
 * and non-fundus photographs before sending to backend ViT model.
 */
function validateClientFundusImage(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve({ valid: false, error: "The uploaded file is not an image." });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve({ valid: true });
          return;
        }

        const size = 120;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // 1. Check four corners (fundus optical aperture mask check)
        const patch = 6;
        let cornerSum = 0;
        let cornerPixels = 0;
        const cornerCoords = [
          [0, 0],
          [size - patch, 0],
          [0, size - patch],
          [size - patch, size - patch],
        ];

        cornerCoords.forEach(([sx, sy]) => {
          for (let y = sy; y < sy + patch; y++) {
            for (let x = sx; x < sx + patch; x++) {
              const idx = (y * size + x) * 4;
              const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              cornerSum += brightness;
              cornerPixels++;
            }
          }
        });

        const avgCorner = cornerSum / cornerPixels;

        // 2. Check central retinal chromaticity
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let centerCount = 0;
        let scleraLikeCount = 0;

        const start = Math.floor(size * 0.25);
        const end = Math.floor(size * 0.75);

        for (let y = start; y < end; y++) {
          for (let x = start; x < end; x++) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            rSum += r;
            gSum += g;
            bSum += b;
            centerCount++;

            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = (maxC - minC) / (maxC + 0.001);
            const brightness = (r + g + b) / 3;
            if (brightness > 135 && sat < 0.12) {
              scleraLikeCount++;
            }
          }
        }

        const rMean = rSum / centerCount;
        const gMean = gSum / centerCount;
        const bMean = bSum / centerCount;
        const rbRatio = rMean / (bMean + 0.001);
        const scleraFraction = scleraLikeCount / centerCount;

        if (avgCorner > 38) {
          resolve({
            valid: false,
            error:
              "Non-fundus photograph detected: The uploaded image appears to be an external face or eye selfie. Vision AI specifically requires an internal retinal fundus photograph (posterior pole view showing the optic disc, retinal blood vessels, and macula).",
          });
          return;
        }

        if (rbRatio < 1.15 || rMean < bMean || rMean < gMean * 0.9) {
          resolve({
            valid: false,
            error:
              "Invalid chromatic profile: This image lacks retinal vascular reflectance. External eye selfies (cornea, iris, eyelashes) or standard camera photos cannot be screened.",
          });
          return;
        }

        if (scleraFraction > 0.20) {
          resolve({
            valid: false,
            error:
              "Anterior eye segment detected: The image contains external sclera (white of the eye) or eyelid structures. Please upload an internal retinal fundus scan.",
          });
          return;
        }

        resolve({ valid: true });
      } catch {
        resolve({ valid: true });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ valid: false, error: "Failed to read image file." });
    };

    img.src = objectUrl;
  });
}

function EyeUploadCard({
  eyeName,
  eyeCode,
  file,
  onUpload,
  onRemove,
  isAnalyzing,
}) {
  const preview = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <TiltCard className="eye-card-tilt" maxTilt={5} scale={1.01}>
      <div className={`eye-card ${isAnalyzing ? "scanning-active" : ""}`}>
        {/* Sci-fi HUD Corner Accents */}
        <div className="hud-corner hud-top-left" />
        <div className="hud-corner hud-top-right" />
        <div className="hud-corner hud-bottom-left" />
        <div className="hud-corner hud-bottom-right" />

        <div className="eye-card-header">
          <div>
            <span className="eye-code">
              {eyeCode}
            </span>

            <h2>{eyeName}</h2>
          </div>

          <span
            className={
              isAnalyzing
                ? "eye-status scanning"
                : file
                  ? "eye-status ready"
                  : "eye-status"
            }
          >
            {isAnalyzing ? "Scanning..." : file ? "Ready" : "Waiting"}
          </span>
        </div>

        {!file ? (
          <label className="upload-area">
            <div className="upload-icon">
              <UploadCloud size={24} />
            </div>

            <h3>
              Upload fundus image
            </h3>

            <p>
              JPG, PNG, WEBP or any retinal scan
            </p>

            <span className="upload-button">
              Choose Image
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              hidden
            />
          </label>
        ) : (
          <div className="preview-wrapper">
            <div className="fundus-img-container">
              <img
                src={preview}
                alt={`${eyeName} fundus`}
                className="fundus-preview"
              />
              {isAnalyzing && (
                <div className="scanning-overlay">
                  <div className="scanner-line" />
                  <div className="scanner-grid" />
                  {/* 14x14 ViT Tokenization Patch Matrix Grid */}
                  <div className="vit-token-matrix">
                    {Array.from({ length: 196 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="vit-token-cell"
                        style={{
                          animationDelay: `${(idx % 14) * 0.04 + Math.floor(idx / 14) * 0.03}s`,
                        }}
                      />
                    ))}
                  </div>
                  {/* Biometric Center HUD Reticle */}
                  <div className="biometric-reticle">
                    <div className="biometric-cross-h" />
                    <div className="biometric-cross-v" />
                  </div>
                  <div className="scanner-badge">
                    <span className="scanner-pulse" />
                    ViT-B/16 Deep Scanning & Tokenization...
                  </div>
                </div>
              )}
            </div>

            <div className="file-details">
              <div className="file-text">
                <strong>
                  {file.name}
                </strong>

                <span>
                  {(
                    file.size /
                    (1024 * 1024)
                  ).toFixed(2)}{" "}
                  MB
                </span>
              </div>

              <button
                type="button"
                className="remove-button"
                onClick={onRemove}
                disabled={isAnalyzing}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </TiltCard>
  );
}

function DiagnosisVerdictBanner({
  diagnosis,
  leftDiagnosis,
  rightDiagnosis,
  mode,
  activeTab,
}) {
  if (!diagnosis) return null;

  // Select active diagnosis based on current tab in bilateral mode
  const currentDiag = (mode === "bilateral" && activeTab === "left")
    ? leftDiagnosis
    : (mode === "bilateral" && activeTab === "right")
      ? rightDiagnosis
      : diagnosis;

  const isAbnormal = currentDiag?.status === "disease_detected";
  const badgeClass = isAbnormal ? (currentDiag?.badge_type || "high") : "normal";

  return (
    <TiltCard maxTilt={4} scale={1.01} className="verdict-tilt-wrap">
      <div className={`verdict-banner verdict-${badgeClass}`}>
        <div className="verdict-top-bar">
          <div className="verdict-indicator">
            <span className={`verdict-pulse-dot dot-${badgeClass}`} />
            <span className="verdict-badge-text">
              {isAbnormal ? "CLINICAL PATHOLOGY DETECTED" : "HEALTHY RETINAL FUNDUS"}
            </span>
          </div>
          <span className="verdict-confidence-pill">
            {currentDiag?.confidence}% Screening Confidence
          </span>
        </div>

        <div className="verdict-body">
          <div className="verdict-main-info">
            <span className="verdict-label">PRIMARY CLINICAL FINDING</span>
            <h2 className="verdict-title">{currentDiag?.verdict_title}</h2>
            <div className="verdict-meta-row">
              <span className={`verdict-severity-tag tag-${badgeClass}`}>
                Severity: {currentDiag?.severity}
              </span>
              <span className="verdict-disease-tag">
                Target: {currentDiag?.primary_disease}
              </span>
            </div>
          </div>

          {mode === "bilateral" && activeTab === "all" && leftDiagnosis && rightDiagnosis && (
            <div className="bilateral-split-cards">
              <div className={`eye-mini-verdict ${leftDiagnosis.status === "disease_detected" ? "abnormal" : "normal"}`}>
                <div className="mini-eye-header">
                  <span className="mini-code">OS</span>
                  <span className="mini-title">Left Eye</span>
                </div>
                <strong className="mini-disease">{leftDiagnosis.primary_disease}</strong>
                <span className="mini-conf">{leftDiagnosis.confidence}% conf</span>
              </div>

              <div className={`eye-mini-verdict ${rightDiagnosis.status === "disease_detected" ? "abnormal" : "normal"}`}>
                <div className="mini-eye-header">
                  <span className="mini-code">OD</span>
                  <span className="mini-title">Right Eye</span>
                </div>
                <strong className="mini-disease">{rightDiagnosis.primary_disease}</strong>
                <span className="mini-conf">{rightDiagnosis.confidence}% conf</span>
              </div>
            </div>
          )}
        </div>

        {currentDiag?.recommendation && (
          <div className="verdict-recommendation">
            <div className="rec-icon">📋</div>
            <div className="rec-text">
              <strong>Clinical Screening Guidance:</strong> {currentDiag.recommendation}
            </div>
          </div>
        )}
      </div>
    </TiltCard>
  );
}

function ReferenceCasesGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const testCases = [
    { name: "Cataract", file: "0_left.jpg", eye: "Left (OS)", note: "Dense cortical/nuclear lens opacity" },
    { name: "Normal (Fellow Eye)", file: "0_right.jpg", eye: "Right (OD)", note: "Patient 0 Right eye is 100% normal fundus" },
    { name: "Glaucoma", file: "1218_left.jpg", eye: "Left (OS)", note: "Pathological cup-to-disc ratio enlargement" },
    { name: "Myopia", file: "144_left.jpg", eye: "Left (OS)", note: "High/pathological myopia fundus changes" },
    { name: "AMD", file: "102_right.jpg", eye: "Right (OD)", note: "Dry macular degeneration with drusen" },
    { name: "Diabetic Retinopathy", file: "157_left.jpg", eye: "Left (OS)", note: "Moderate NPDR microvascular lesions" },
    { name: "Hypertension", file: "32_left.jpg", eye: "Left (OS)", note: "Hypertensive retinopathy arteriolar signs" },
    { name: "Normal (Bilateral)", file: "394_left.jpg", eye: "Left (OS)", note: "Clean healthy normal retinal fundus" },
  ];

  return (
    <div className="reference-guide-card">
      <div className="guide-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="guide-title">
          <span className="guide-icon">💡</span>
          <div>
            <strong>ODIR-5K Verified Test Images & Diagnostic Reference</strong>
            <p>Important: Know which eye file contains the disease (Unilateral vs Bilateral)</p>
          </div>
        </div>
        <button type="button" className="guide-toggle-btn">
          {isOpen ? "Hide Reference Guide ▲" : "View Verified Test Files ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="guide-content">
          <div className="guide-alert">
            <strong>⚠️ Why did Patient 0 show Normal on <code>0_right.jpg</code>?</strong>
            <p>
              In ODIR-5K, cataracts and other diseases are often <strong>unilateral</strong> (in one eye only).
              For Patient 0, the cataract is in the left eye (<code>0_left.jpg</code>), while the fellow right eye (<code>0_right.jpg</code>)
              is a 100% healthy normal retina. When you test <code>0_right.jpg</code>, the AI correctly reports Normal!
            </p>
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Target Disease</th>
                  <th>Image Filename</th>
                  <th>Eye</th>
                  <th>Clinical Diagnostic Notes</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc) => (
                  <tr key={tc.file}>
                    <td><span className="guide-disease-badge">{tc.name}</span></td>
                    <td><code>{tc.file}</code></td>
                    <td>{tc.eye}</td>
                    <td>{tc.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  name,
  score,
  rawScore,
  riskRatio,
  isPrimary = false,
  index = 0,
}) {
  const safeScore = Math.min(
    Math.max(Number(score) || 0, 0),
    100
  );

  const getRiskStatus = (score, label) => {
    if (label === "Normal") {
      if (score >= 60) return { text: "Normal Indicator", level: "normal" };
      if (score >= 40) return { text: "Borderline Normal", level: "moderate" };
      return { text: "Reduced Normalcy", level: "neutral" };
    }
    if (score >= 65) return { text: "High Risk", level: "high" };
    if (score >= 35) return { text: "Elevated Alert", level: "moderate" };
    return { text: "Low Risk", level: "low" };
  };

  const risk = getRiskStatus(safeScore, name);

  return (
    <TiltCard maxTilt={8} scale={1.02} className="result-card-tilt">
      <div
        className={`result-card result-${risk.level} ${isPrimary ? "primary-finding-card" : ""}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="result-header">
          <div className="result-title-row">
            <span className="disease-name-label">
              {name}
              {isPrimary && <span className="primary-pill">PRIMARY FINDING</span>}
            </span>
            <span className={`risk-pill pill-${risk.level}`}>
              {risk.text}
            </span>
          </div>

          <div className="result-score-block">
            <strong className="result-score-val">
              {safeScore.toFixed(1)}%
            </strong>
            {rawScore !== undefined && (
              <span className="raw-score-sub">
                Raw: {Number(rawScore).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="result-bar">
          <div
            className={`result-fill fill-${risk.level}`}
            style={{
              width: `${safeScore}%`,
            }}
          />
        </div>

        {riskRatio && Number(riskRatio) >= 1.0 && (
          <div className="risk-ratio-tag">
            ⚡ {Number(riskRatio).toFixed(1)}× above screening baseline
          </div>
        )}
      </div>
    </TiltCard>
  );
}

function App() {
  const [leftEye, setLeftEye] = useState(null);
  const [rightEye, setRightEye] = useState(null);

  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState(null);
  const [scoreViewMode, setScoreViewMode] = useState("calibrated");

  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [isStandaloneView] = useState(() => {
    return (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("view") === "report"
    );
  });

  const [activeMode, setActiveMode] = useState(() => {
    if (typeof window === "undefined") return "retinal";
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "selfie" ? "selfie" : "retinal";
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveMode(params.get("mode") === "selfie" ? "selfie" : "retinal");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Restore session data if opening report in a new tab
  useEffect(() => {
    if (isStandaloneView && !analysisData) {
      try {
        const saved = sessionStorage.getItem("vision_ai_report_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.analysisData) {
            setAnalysisData(parsed.analysisData);
            setResults(parsed.results || parsed.analysisData.results);
            if (parsed.activeTab) setActiveTab(parsed.activeTab);
          }
        }
      } catch (e) {
        console.error("Failed to restore report session:", e);
      }
    }
  }, [isStandaloneView, analysisData]);

  const handleOpenInNewTab = () => {
    try {
      sessionStorage.setItem(
        "vision_ai_report_data",
        JSON.stringify({
          analysisData,
          results,
          activeTab,
        })
      );
    } catch (e) {
      console.error("Storage error:", e);
    }
    window.open("/?view=report", "_blank");
  };

  const handleLeftUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");

    // Gatekeeper validation: verify image is an authentic retinal fundus scan
    const check = await validateClientFundusImage(file);
    if (!check.valid) {
      setError(`Left Eye (OS) Rejected: ${check.error}`);
      event.target.value = "";
      return;
    }

    setLeftEye(file);
    setAnalysisData(null);
    setResults(null);
  };

  const handleRightUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setError("");

    // Gatekeeper validation: verify image is an authentic retinal fundus scan
    const check = await validateClientFundusImage(file);
    if (!check.valid) {
      setError(`Right Eye (OD) Rejected: ${check.error}`);
      event.target.value = "";
      return;
    }

    setRightEye(file);
    setAnalysisData(null);
    setResults(null);
  };

  const removeLeftEye = () => {
    setLeftEye(null);
    setAnalysisData(null);
    setResults(null);
    setMessage("");
    setError("");
  };

  const removeRightEye = () => {
    setRightEye(null);
    setAnalysisData(null);
    setResults(null);
    setMessage("");
    setError("");
  };

  const handleAnalyze = async () => {
    setMessage("");
    setError("");
    setResults(null);
    setAnalysisData(null);

    if (!leftEye && !rightEye) {
      setError(
        "Please upload at least one fundus image."
      );

      return;
    }

    const formData = new FormData();

    if (leftEye && rightEye) {
      formData.append("left_image", leftEye);
      formData.append("right_image", rightEye);
    } else if (leftEye) {
      formData.append("left_image", leftEye);
      formData.append("image", leftEye);
    } else if (rightEye) {
      formData.append("right_image", rightEye);
      formData.append("image", rightEye);
    }

    setAnalyzing(true);

    try {
      let response;

      try {
        response = await fetch(
          API_URL,
          {
            method: "POST",
            body: formData,
          }
        );
      } catch {
        // Fallback directly to Django backend URL
        response = await fetch(
          "http://127.0.0.1:8000/analyze/",
          {
            method: "POST",
            body: formData,
          }
        );
      }

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          "Vision AI analysis failed."
        );
      }

      setAnalysisData(data);
      setResults(data.results);
      setActiveTab(
        data.mode === "bilateral"
          ? "all"
          : data.mode === "right_eye"
            ? "right"
            : "left"
      );

      // Trigger celebratory particle telemetry burst on completion
      try {
        confetti({
          particleCount: 65,
          spread: 75,
          origin: { y: 0.62 },
          colors: ["#38bdf8", "#2dd4bf", "#818cf8", "#34d399", "#ffffff"],
        });
      } catch {
        // Fallback gracefully if confetti unavailable
      }

      if (data.mode === "bilateral") {
        setMessage(
          "Bilateral analysis complete: Both Left (OS) and Right (OD) eyes evaluated successfully."
        );
      } else if (data.mode === "left_eye") {
        setMessage(
          "Analysis completed successfully for Left Eye (OS)."
        );
      } else if (data.mode === "right_eye") {
        setMessage(
          "Analysis completed successfully for Right Eye (OD)."
        );
      } else {
        setMessage(
          "Analysis completed successfully."
        );
      }

    } catch (err) {
      console.error(
        "Vision AI error:",
        err
      );

      setError(
        err.message ||
        "Unable to connect to the Vision AI backend."
      );

    } finally {
      setAnalyzing(false);
    }
  };

  // Dedicated Full-Page View when opened in a new tab (?view=report)
  if (isStandaloneView) {
    return (
      <div className="app standalone-report-page">
        <RetinalBackground3D />
        <CursorGlow />
        <div className="standalone-report-container">
          <HospitalReport
            diagnosis={analysisData?.diagnosis}
            leftDiagnosis={analysisData?.left_diagnosis}
            rightDiagnosis={analysisData?.right_diagnosis}
            mode={analysisData?.mode}
            activeTab={activeTab}
            isStandalone={true}
          />
        </div>
      </div>
    );
  }

  if (activeMode === "selfie") {
    return (
      <AnteriorSelfiePage
        onSwitchToRetinal={() => {
          setActiveMode("retinal");
          window.history.pushState({}, "", "/");
        }}
      />
    );
  }

  return (
    <div className="app">
      {/* Dynamic 3D Neural-Retina Particle Background */}
      <RetinalBackground3D />

      {/* Ambient Mouse Flashlight Spotlight */}
      <CursorGlow />

      {/* ================= NAVBAR ================= */}

      <header className="navbar">
        <div className="navbar-container">

          <div className="brand">

            <div className="brand-logo">
              VA
            </div>

            <div>
              <div className="brand-name">
                Vision AI
              </div>

              <div className="brand-caption">
                Intelligent Retinal Screening
              </div>
            </div>

          </div>

          <nav className="navigation">
            <a href="#screening">
              Screening
            </a>

            <a href="#features">
              Features
            </a>

            <a href="#model">
              Model
            </a>

            <a href="#about">
              About
            </a>
          </nav>

          <div className="navbar-actions-group">
            <button
              type="button"
              className="navbar-mode-btn"
              onClick={() => {
                setActiveMode("selfie");
                window.history.pushState({}, "", "/?mode=selfie");
              }}
              title="Switch to Normal Smartphone Eye Selfie Screening (Mode B)"
            >
              <Camera size={15} />
              <span>Eye Selfie AI (Mode B)</span>
              <span className="mode-new-badge">NEW</span>
            </button>

            <div className="model-pill">
              <span className="online-dot" />
              ViT-B/16 Retinal
            </div>
          </div>

        </div>
      </header>


      {/* ================= HERO ================= */}

      <section className="hero">

        <div className="hero-container">

          <div className="hero-grid">

            <div className="hero-content">

              <div className="hero-badge-wrap">
                <span className="hero-badge-dot" />
                <span className="hero-badge-text">AI-Assisted Retinal Screening</span>
              </div>

              <h1>
                See retinal health
                <span className="gradient-text">
                  {" "}through AI.
                </span>
              </h1>

              <p>
                Vision AI utilizes a Vision Transformer (ViT-B/16) fine-tuned on the ODIR-5K dataset
                to analyze retinal fundus images and deliver calibrated multi-disease screening telemetry.
              </p>

              <div className="hero-cta-group">
                <a href="#screening" className="hero-primary-btn">
                  <Scan size={16} />
                  Start Retinal Screening
                  <ChevronRight size={15} />
                </a>

                <a href="#model" className="hero-secondary-btn">
                  <Cpu size={16} />
                  Explore 3D ViT Model
                </a>
              </div>

              <div className="hero-stats-row">
                <div className="hero-stat-item">
                  <strong>ViT-B/16</strong>
                  <span>Vision Transformer</span>
                </div>

                <div className="hero-stat-item">
                  <strong>196 Patches</strong>
                  <span>14×14 Token Matrix</span>
                </div>

                <div className="hero-stat-item">
                  <strong>8 Pathologies</strong>
                  <span>ODIR-5K Screened</span>
                </div>

                <div className="hero-stat-item">
                  <strong>&lt; 50ms</strong>
                  <span>Inference Telemetry</span>
                </div>
              </div>

              <div className="hero-tags">
                <span>✓ Multi-disease screening</span>
                <span>✓ Bilateral-ready</span>
                <span>✓ Explainable AI</span>
                <span>✓ ROC Calibrated</span>
              </div>

            </div>

            {/* Interactive 3D Holographic Retinal Scanner Viewport */}
            <div className="hero-visualizer">
              <HolographicEye3D />
            </div>

          </div>

        </div>

      </section>



      {/* ================= SCREENING ================= */}

      <main
        id="screening"
        className="screening"
      >

        <div className="section-top">

          <div>

            <span className="section-label">
              SCREENING
            </span>

            <h2>
              Upload fundus images
            </h2>

            <p>
              Add a clear retinal photograph
              from one or both eyes.
            </p>

          </div>

          <div className="privacy-badge">
            🔒 Local development
          </div>

        </div>


        {/* ================= EYE CARDS ================= */}

        <div className="eye-grid">

          <EyeUploadCard
            eyeName="Left Eye"
            eyeCode="OS"
            file={leftEye}
            onUpload={handleLeftUpload}
            onRemove={removeLeftEye}
            isAnalyzing={analyzing}
          />

          <EyeUploadCard
            eyeName="Right Eye"
            eyeCode="OD"
            file={rightEye}
            onUpload={handleRightUpload}
            onRemove={removeRightEye}
            isAnalyzing={analyzing}
          />

        </div>


        {/* ================= ANALYZE ================= */}

        <div className="analyze-panel">

          <div className="analyze-description">

            <div className="analyze-icon">
              ✦
            </div>

            <div>

              <h3>
                Ready to analyze?
              </h3>

              <p>
                Your image will be processed by
                the trained Vision AI ViT model.
              </p>

            </div>

          </div>

          <button
            type="button"
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={analyzing}
          >

            {analyzing ? (
              <>
                <span className="spinner" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Retina
                <span className="button-arrow">
                  →
                </span>
              </>
            )}

          </button>

        </div>


        {/* ================= MESSAGE ================= */}

        {message && (
          <div className="message success">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="message error fundus-rejection-alert">
            <div className="rejection-alert-icon">
              <ShieldAlert size={22} />
            </div>
            <div className="rejection-alert-text">
              <strong>Ophthalmic Gatekeeper Notice:</strong>
              <p>{error}</p>
              <div className="rejection-tip">
                💡 <em>Only genuine non-mydriatic retinal fundus scans (photographed through the pupil showing retinal vessels, optic disc, and macula) are accepted.</em>
                <div className="rejection-tip-action">
                  <span>Looking to test a normal eye photo or check for pink eye / stye / jaundice?</span>
                  <button
                    type="button"
                    className="rejection-switch-mode-btn"
                    onClick={() => {
                      setError("");
                      setActiveMode("selfie");
                      window.history.pushState({}, "", "/?mode=selfie");
                    }}
                  >
                    <Camera size={13} />
                    Open Eye Selfie AI (Mode B) →
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="rejection-close-btn"
              onClick={() => setError("")}
              title="Dismiss warning"
            >
              ×
            </button>
          </div>
        )}


        {/* ================= REFERENCE GUIDE ================= */}
        <ReferenceCasesGuide />

        {/* ================= RESULTS ================= */}

        {results && (
          <section className="results-section">

            <div className="results-heading">

              <div>

                <span className="section-label">
                  CLINICAL SCREENING REPORT
                </span>

                <h2>
                  Vision AI Diagnostic Evaluation
                </h2>

                <p>
                  AI-assisted evaluation powered by calibrated Vision Transformer telemetry.
                </p>

              </div>

              <div className="result-status">
                {analysisData?.mode === "bilateral"
                  ? "Bilateral screening complete"
                  : analysisData?.mode === "left_eye"
                    ? "Left Eye (OS) complete"
                    : analysisData?.mode === "right_eye"
                      ? "Right Eye (OD) complete"
                      : "Analysis complete"}
              </div>

            </div>

            {analysisData?.mode === "bilateral" && (
              <div className="results-tabs">
                <button
                  type="button"
                  className={`results-tab ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  Combined Patient Summary
                </button>

                <button
                  type="button"
                  className={`results-tab ${activeTab === "left" ? "active" : ""}`}
                  onClick={() => setActiveTab("left")}
                >
                  Left Eye (OS)
                </button>

                <button
                  type="button"
                  className={`results-tab ${activeTab === "right" ? "active" : ""}`}
                  onClick={() => setActiveTab("right")}
                >
                  Right Eye (OD)
                </button>
              </div>
            )}

            {/* Primary Clinical Diagnosis Verdict Banner */}
            <DiagnosisVerdictBanner
              diagnosis={analysisData?.diagnosis}
              leftDiagnosis={analysisData?.left_diagnosis}
              rightDiagnosis={analysisData?.right_diagnosis}
              mode={analysisData?.mode}
              activeTab={activeTab}
            />

            {/* Official Hospital-Grade Clinical Screening Report Launcher Card */}
            <div className="hospital-report-launcher-card">
              <div className="launcher-left">
                <div className="launcher-icon">
                  <FileText size={26} />
                </div>
                <div>
                  <div className="launcher-badge">
                    <span className="online-dot" />
                    OFFICIAL CLINICAL DOSSIER READY
                  </div>
                  <h3>Hospital Clinical Screening Dossier & Precautions</h3>
                  <p>
                    Official ophthalmic documentation including ICD-10 coding, mandatory precautions,
                    recommended hospital diagnostic equipment workup, clinical treatment pathways, and emergency warning signs.
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
                  onClick={handleOpenInNewTab}
                  title="Open full clinical report in a dedicated new tab"
                >
                  <ExternalLink size={15} />
                  Open in New Tab
                </button>

                <button
                  type="button"
                  className="launcher-btn-secondary"
                  onClick={() => {
                    setIsReportOpen(true);
                    setTimeout(() => window.print(), 350);
                  }}
                  title="Print or save as PDF"
                >
                  <Printer size={15} />
                  Print PDF
                </button>
              </div>
            </div>

            {/* Full-Screen Hospital Report Modal View */}
            {isReportOpen && (
              <div
                className="hospital-modal-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsReportOpen(false);
                }}
              >
                <div className="hospital-modal-container">
                  <HospitalReport
                    diagnosis={analysisData?.diagnosis}
                    leftDiagnosis={analysisData?.left_diagnosis}
                    rightDiagnosis={analysisData?.right_diagnosis}
                    mode={analysisData?.mode}
                    activeTab={activeTab}
                    onClose={() => setIsReportOpen(false)}
                  />
                </div>
              </div>
            )}



            {/* View Mode Toggle: Calibrated Clinical Risk vs Raw Probabilities */}
            <div className="view-mode-bar">
              <span className="view-mode-label">Display Metrics:</span>
              <div className="view-mode-toggles">
                <button
                  type="button"
                  className={`view-mode-btn ${scoreViewMode === "calibrated" ? "active" : ""}`}
                  onClick={() => setScoreViewMode("calibrated")}
                >
                  Calibrated Clinical Risk (Normalized)
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${scoreViewMode === "raw" ? "active" : ""}`}
                  onClick={() => setScoreViewMode("raw")}
                >
                  Raw Model Probabilities
                </button>
              </div>
            </div>

            <div className="results-grid">
              {(() => {
                // Determine active diagnosis & score sets
                const currentDiag = (activeTab === "left" && analysisData?.left_diagnosis)
                  ? analysisData.left_diagnosis
                  : (activeTab === "right" && analysisData?.right_diagnosis)
                    ? analysisData.right_diagnosis
                    : analysisData?.diagnosis;

                const rawSource = (activeTab === "left" && analysisData?.left_eye)
                  ? analysisData.left_eye
                  : (activeTab === "right" && analysisData?.right_eye)
                    ? analysisData.right_eye
                    : results;

                const calibratedSource = (activeTab === "left" && analysisData?.left_diagnosis?.calibrated_risks)
                  ? analysisData.left_diagnosis.calibrated_risks
                  : (activeTab === "right" && analysisData?.right_diagnosis?.calibrated_risks)
                    ? analysisData.right_diagnosis.calibrated_risks
                    : (analysisData?.calibrated_risks || rawSource);

                const activeScores = scoreViewMode === "calibrated" ? calibratedSource : rawSource;

                // Build findings map for risk ratios
                const findingMap = {};
                (currentDiag?.findings || []).forEach((f) => {
                  findingMap[f.label] = f.risk_ratio;
                });

                return Object.entries(activeScores).map(([name, score], idx) => {
                  const rawScore = rawSource?.[name];
                  const isPrimary = currentDiag?.status === "disease_detected" && currentDiag?.primary_disease === name;
                  const riskRatio = findingMap[name];

                  return (
                    <ResultCard
                      key={name}
                      name={name}
                      score={score}
                      rawScore={rawScore}
                      riskRatio={riskRatio}
                      isPrimary={isPrimary}
                      index={idx}
                    />
                  );
                });
              })()}
            </div>

            <div className="results-note">
              <strong>Clinical Telemetry Notice:</strong>
              <span>
                Vision AI utilizes a Vision Transformer (ViT-B/16) fine-tuned on the ODIR-5K dataset.
                Thresholds are calibrated against ROC validation curves to mitigate severe population prevalence imbalance.
                Outputs represent AI screening telemetry and do not replace formal ophthalmic diagnosis.
              </span>
            </div>

          </section>
        )}

      </main>


      {/* ================= FEATURES ================= */}

      <section
        id="features"
        className="features-section"
      >

        <div className="section-heading centered">

          <span className="section-label">
            FEATURES
          </span>

          <h2>
            Designed as a complete
            retinal screening workflow
          </h2>

          <p>
            Vision AI is more than an image classifier.
            The application is designed to support a broader
            retinal screening workflow.
          </p>

        </div>


        <div className="features-grid">

          <FeatureCard
            number="01"
            title="Multi-Disease Screening"
            description="Generate independent screening scores for eight retinal categories."
            onClick={() => setSelectedFeature("01")}
          />

          <FeatureCard
            number="02"
            title="Bilateral Analysis"
            description="Support independent analysis of the left and right eyes."
            onClick={() => setSelectedFeature("02")}
          />

          <FeatureCard
            number="03"
            title="Explainable AI"
            description="Visualize image regions that influence model predictions."
            onClick={() => setSelectedFeature("03")}
          />

          <FeatureCard
            number="04"
            title="Image Quality"
            description="Identify images that may be unsuitable for reliable analysis."
            onClick={() => setSelectedFeature("04")}
          />

          <FeatureCard
            number="05"
            title="Retinal History"
            description="Track screening results across different examination dates."
            onClick={() => setSelectedFeature("05")}
          />

          <FeatureCard
            number="06"
            title="Screening Reports"
            description="Generate structured reports for review alongside professional assessment."
            onClick={() => setSelectedFeature("06")}
          />

        </div>

        {/* Interactive Feature Telemetry & Data Modal */}
        {selectedFeature && (
          <FeatureDetailModal
            selectedFeature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
            onSelectFeature={setSelectedFeature}
          />
        )}

      </section>


      {/* ================= MODEL ================= */}

      <section
        id="model"
        className="model-section"
      >

        <div className="model-card">

          <div className="model-information">

            <span className="section-label">
              MODEL ARCHITECTURE
            </span>

            <h2>
              Vision Transformer
              <span>
                {" "}ViT-B/16
              </span>
            </h2>

            <p>
              The current Vision AI model uses a
              pretrained Vision Transformer backbone
              fine-tuned for retinal image screening.
            </p>

          </div>


          <div className="model-pipeline">

            <ModelStep text="Fundus Image" />

            <div className="pipeline-arrow">
              ↓
            </div>

            <ModelStep text="224 × 224 preprocessing" />

            <div className="pipeline-arrow">
              ↓
            </div>

            <ModelStep text="ViT-B/16" />

            <div className="pipeline-arrow">
              ↓
            </div>

            <ModelStep text="8 Screening Outputs" />

          </div>

        </div>

      </section>


      {/* ================= DISEASES ================= */}

      <section className="disease-section">

        <div className="section-heading centered">

          <span className="section-label">
            OUTPUT CATEGORIES
          </span>

          <h2>
            Eight screening categories
          </h2>

        </div>

        <div className="disease-grid">
          {DISEASES.map((disease) => (
            <TiltCard key={disease.code} maxTilt={8} scale={1.03}>
              <div className="disease-card">
                <div className="disease-code">
                  {disease.code}
                </div>
                <div>
                  {disease.name}
                </div>
              </div>
            </TiltCard>
          ))}
        </div>


      </section>


      {/* ================= ABOUT ================= */}

      <section
        id="about"
        className="about-section"
      >

        <div className="about-content">

          <span className="section-label">
            ABOUT VISION AI
          </span>

          <h2>
            AI-assisted retinal
            image screening
          </h2>

          <p>
            Vision AI is an educational and research
            project built using React, Django,
            PyTorch and a Vision Transformer model.
          </p>

          <p>
            The current model has been trained on
            retinal fundus images from ODIR-5K.
            Its outputs are intended as screening
            indicators and should not be treated as
            a clinical diagnosis.
          </p>

        </div>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="footer">

        <div className="footer-container">

          <div>

            <strong>
              Vision AI
            </strong>

            <p>
              Intelligent Retinal Screening
            </p>

          </div>

          <div className="footer-model">
            ViT-B/16 · PyTorch · Django · React
          </div>

        </div>

        <div className="footer-disclaimer">
          Vision AI is a research and educational
          application. AI-generated outputs are not
          a substitute for professional medical evaluation.
        </div>

      </footer>

    </div>
  );
}


/* ========================================================= */
/* FEATURE CARD                                               */
/* ========================================================= */

function FeatureCard({
  number,
  title,
  description,
  onClick,
}) {
  const iconMap = {
    "01": <Eye size={20} color="#38bdf8" />,
    "02": <Activity size={20} color="#2dd4bf" />,
    "03": <Sparkles size={20} color="#818cf8" />,
    "04": <ShieldCheck size={20} color="#38bdf8" />,
    "05": <Layers size={20} color="#2dd4bf" />,
    "06": <FileText size={20} color="#818cf8" />,
  };

  return (
    <TiltCard maxTilt={9} scale={1.03} className="feature-tilt-wrap">
      <div
        className="feature-card interactive-feature-card"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="feature-number">
            {number}
          </div>
          <div className="feature-icon-badge">
            {iconMap[number] || <Sparkles size={20} color="#38bdf8" />}
          </div>
        </div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

        <div className="feature-card-cta">
          <span>Click to explore data & specs</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </TiltCard>
  );
}


/* ========================================================= */
/* MODEL STEP                                                */
/* ========================================================= */

function ModelStep({
  text,
}) {
  return (
    <TiltCard maxTilt={8} scale={1.03}>
      <div className="model-step">
        {text}
      </div>
    </TiltCard>
  );
}


export default App;