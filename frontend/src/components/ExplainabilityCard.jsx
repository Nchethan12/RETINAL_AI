import { useState, useMemo } from "react";
import {
  Sparkles,
  Eye,
  Layers,
  Zap,
  Scan,
  ShieldAlert,
  Cpu,
  Info,
  Maximize2,
  CheckCircle2,
} from "lucide-react";
import TiltCard from "./TiltCard";

export default function ExplainabilityCard({
  analysisData,
  activeTab = "all",
  onSelectTab,
}) {
  // Determine available explainability payloads
  const mode = analysisData?.mode || "single";
  const isBilateral = mode === "bilateral";

  // Default eye selection in bilateral mode
  const initialEye = useMemo(() => {
    if (activeTab === "left") return "left";
    if (activeTab === "right") return "right";
    if (analysisData?.right_diagnosis?.status === "disease_detected" && analysisData?.left_diagnosis?.status !== "disease_detected") {
      return "right";
    }
    return "left";
  }, [activeTab, analysisData]);

  const [selectedEye, setSelectedEye] = useState(initialEye);
  const [viewMode, setViewMode] = useState("overlay"); // "overlay" | "heatmap" | "original" | "split"
  const [selectedFindingIdx, setSelectedFindingIdx] = useState(0); // 0 = primary, 1..n = secondary

  // Keep selectedEye in sync if activeTab changes from parent
  useMemo(() => {
    if (activeTab === "left") setSelectedEye("left");
    if (activeTab === "right") setSelectedEye("right");
  }, [activeTab]);

  // Resolve active explainability data based on eye
  const activeEyeExpl = useMemo(() => {
    if (!analysisData) return null;
    if (isBilateral) {
      return selectedEye === "left"
        ? analysisData?.left_explainability || analysisData?.left_diagnosis?.explainability
        : analysisData?.right_explainability || analysisData?.right_diagnosis?.explainability;
    }
    if (mode === "left_eye") {
      return analysisData?.left_explainability || analysisData?.explainability;
    }
    if (mode === "right_eye") {
      return analysisData?.right_explainability || analysisData?.explainability;
    }
    return analysisData?.explainability;
  }, [analysisData, isBilateral, mode, selectedEye]);

  // List of explainability objects for the active eye (primary + secondary)
  const availableFindings = useMemo(() => {
    if (!activeEyeExpl || !activeEyeExpl.available) return [];
    const list = [
      {
        ...activeEyeExpl,
        isPrimary: true,
        findingLabel: `Primary: ${activeEyeExpl.class_name}`,
      },
    ];
    if (Array.isArray(activeEyeExpl.secondary_explanations)) {
      activeEyeExpl.secondary_explanations.forEach((sec, idx) => {
        list.push({
          ...sec,
          isPrimary: false,
          findingLabel: `Secondary: ${sec.class_name}`,
        });
      });
    }
    return list;
  }, [activeEyeExpl]);

  // Current active finding
  const currentExpl = availableFindings[selectedFindingIdx] || availableFindings[0];

  if (!analysisData || (!analysisData.explainability && !analysisData.left_explainability && !analysisData.right_explainability)) {
    return null;
  }

  // Graceful fallback if explainability is unavailable
  if (!activeEyeExpl || !activeEyeExpl.available) {
    return (
      <div className="xai-unavailable-card">
        <ShieldAlert size={24} color="#f59e0b" />
        <div>
          <h4>AI Explainability Telemetry Offline</h4>
          <p>
            {activeEyeExpl?.error ||
              "Visual attention attribution is currently unavailable for this image. Clinical diagnosis telemetry remains fully valid."}
          </p>
        </div>
      </div>
    );
  }

  const eyeLabel =
    selectedEye === "left" || mode === "left_eye"
      ? "Left Eye (OS)"
      : selectedEye === "right" || mode === "right_eye"
      ? "Right Eye (OD)"
      : "Retinal Fundus";

  return (
    <section className="xai-section" id="explainability">
      <TiltCard maxTilt={2} scale={1.002} className="xai-tilt-container">
        <div className="xai-card">
          {/* Header Bar */}
          <div className="xai-header">
            <div className="xai-header-left">
              <div className="xai-header-icon">
                <Sparkles size={22} color="#38bdf8" />
              </div>
              <div>
                <div className="xai-badge-row">
                  <span className="xai-badge xai-badge-live">
                    <span className="xai-pulsing-dot" />
                    ViT-B/16 GRAD-CAM ATTRIBUTION
                  </span>
                  <span className="xai-badge xai-badge-patch">
                    14 × 14 Spatial Tokens (196 Patches)
                  </span>
                </div>
                <h3 className="xai-title">AI Explainability & Attention Telemetry</h3>
                <p className="xai-subtitle">
                  Visualizing pixel-level Vision Transformer multi-layer attention attribution for the selected clinical finding.
                </p>
              </div>
            </div>

            {/* Bilateral Eye Switcher */}
            {isBilateral && (
              <div className="xai-eye-switcher">
                <button
                  type="button"
                  className={`xai-eye-btn ${selectedEye === "left" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedEye("left");
                    setSelectedFindingIdx(0);
                    if (onSelectTab) onSelectTab("left");
                  }}
                >
                  <Eye size={15} />
                  Left Eye (OS)
                </button>
                <button
                  type="button"
                  className={`xai-eye-btn ${selectedEye === "right" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedEye("right");
                    setSelectedFindingIdx(0);
                    if (onSelectTab) onSelectTab("right");
                  }}
                >
                  <Eye size={15} />
                  Right Eye (OD)
                </button>
              </div>
            )}
          </div>

          {/* Finding Selector (if multiple diseases detected) */}
          {availableFindings.length > 1 && (
            <div className="xai-findings-bar">
              <span className="xai-findings-label">Explained Pathologies:</span>
              <div className="xai-findings-chips">
                {availableFindings.map((f, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`xai-finding-chip ${selectedFindingIdx === idx ? "active" : ""}`}
                    onClick={() => setSelectedFindingIdx(idx)}
                  >
                    {f.isPrimary && <span className="chip-primary-dot" />}
                    {f.class_name}
                    {f.confidence != null && (
                      <span className="chip-conf">
                        {typeof f.confidence === "number" && f.confidence < 1.0
                          ? `${(f.confidence * 100).toFixed(1)}%`
                          : `${f.confidence}%`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Viewer Toolbar */}
          <div className="xai-viewer-toolbar">
            <div className="xai-view-modes">
              <button
                type="button"
                className={`xai-mode-btn ${viewMode === "overlay" ? "active" : ""}`}
                onClick={() => setViewMode("overlay")}
                title="AI Heatmap blended over original fundus image"
              >
                <Layers size={15} />
                Overlay
              </button>
              <button
                type="button"
                className={`xai-mode-btn ${viewMode === "heatmap" ? "active" : ""}`}
                onClick={() => setViewMode("heatmap")}
                title="Pure Vision Transformer attribution heatmap"
              >
                <Zap size={15} />
                Attention Heatmap
              </button>
              <button
                type="button"
                className={`xai-mode-btn ${viewMode === "original" ? "active" : ""}`}
                onClick={() => setViewMode("original")}
                title="Original unaltered fundus photograph"
              >
                <Eye size={15} />
                Original Fundus
              </button>
              <button
                type="button"
                className={`xai-mode-btn ${viewMode === "split" ? "active" : ""}`}
                onClick={() => setViewMode("split")}
                title="Side-by-side comparison"
              >
                <Scan size={15} />
                Side-by-Side
              </button>
            </div>

            <div className="xai-target-tag">
              <span className="xai-target-eye">{eyeLabel}</span>
              <span className="xai-target-divider">/</span>
              <span className="xai-target-disease">{currentExpl.class_name}</span>
              <span className="xai-class-idx">Class #{currentExpl.class_index}</span>
            </div>
          </div>

          {/* Main Visual Display */}
          <div className="xai-display-container">
            {viewMode === "split" ? (
              <div className="xai-split-view">
                <div className="xai-image-frame">
                  <div className="xai-frame-label">Original Fundus Photograph</div>
                  <img
                    src={currentExpl.original}
                    alt="Original Retinal Fundus Scan"
                    className="xai-image"
                  />
                  <div className="xai-res-badge">
                    {currentExpl.dimensions?.width} × {currentExpl.dimensions?.height} px
                  </div>
                </div>

                <div className="xai-image-frame xai-overlay-frame">
                  <div className="xai-frame-label xai-overlay-label">
                    <Sparkles size={13} />
                    AI Explainability Overlay ({currentExpl.class_name})
                  </div>
                  <img
                    src={currentExpl.overlay}
                    alt={`AI Attention Overlay for ${currentExpl.class_name}`}
                    className="xai-image"
                  />
                  <div className="xai-res-badge">
                    Fused ViT Attention · JET Colormap
                  </div>
                </div>
              </div>
            ) : (
              <div className="xai-single-view">
                <div className="xai-image-frame">
                  <img
                    src={
                      viewMode === "overlay"
                        ? currentExpl.overlay
                        : viewMode === "heatmap"
                        ? currentExpl.heatmap
                        : currentExpl.original
                    }
                    alt={`${viewMode} view for ${currentExpl.class_name}`}
                    className="xai-image"
                  />
                  <div className="xai-view-watermark">
                    {viewMode === "overlay" && "AI Explainability Overlay (42% Heatmap Blend)"}
                    {viewMode === "heatmap" && "ViT Spatial Patch-Token Attention (JET Scale)"}
                    {viewMode === "original" && "Unaltered Source Fundus Scan"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Color Scale Gradient Indicator */}
          <div className="xai-scale-bar-container">
            <span className="xai-scale-label">Attribution Intensity:</span>
            <div className="xai-scale-gradient">
              <span className="scale-notch notch-0">0.0 Baseline</span>
              <span className="scale-notch notch-mid">0.5 Moderate</span>
              <span className="scale-notch notch-1">1.0 Peak Attribution</span>
            </div>
          </div>

          {/* Clinical Interpretation & Metadata Details Grid */}
          <div className="xai-details-grid">
            <div className="xai-detail-box">
              <div className="detail-box-header">
                <Cpu size={16} color="#38bdf8" />
                <span>EXPLAINABILITY METHODOLOGY</span>
              </div>
              <p className="detail-box-text">
                Vision Transformer (ViT-B/16) Grad-CAM extracts patch-token activations across the final encoder self-attention blocks. Class-specific autograd gradients project 768-dimensional token attributions back to the 14×14 spatial patch grid and upscale bicubically to fundus resolution.
              </p>
            </div>

            <div className="xai-detail-box">
              <div className="detail-box-header">
                <Info size={16} color="#2dd4bf" />
                <span>TARGETED PATHOLOGICAL CORRELATION</span>
              </div>
              <p className="detail-box-text">
                {currentExpl.attribution_note ||
                  "Highlighted regions represent anatomical areas receiving higher model attribution for this specific classification."}
              </p>
            </div>
          </div>

          {/* Mandatory Clinical Telemetry Notice & Disclaimer */}
          <div className="xai-disclaimer">
            <ShieldAlert size={16} color="#94a3b8" />
            <span>
              <strong>Clinical Telemetry Notice:</strong> Explainability visualizations are observational telemetry provided to assist qualified ophthalmologists and optometrists in interpreting AI decision attribution. Highlighted regions reflect mathematical model sensitivity and do not constitute a definitive medical diagnosis or replacement for a comprehensive dilated clinical exam.
            </span>
          </div>
        </div>
      </TiltCard>
    </section>
  );
}
