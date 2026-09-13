import { useState, useEffect } from "react";
import {
  X,
  Eye,
  Activity,
  Sparkles,
  ShieldCheck,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sliders,
  TrendingUp,
  Clock,
  ExternalLink,
  Award,
  Stethoscope,
  Microscope,
} from "lucide-react";

export const FEATURE_DETAILS = {
  "01": {
    number: "01",
    title: "Multi-Disease Screening",
    badge: "Vision Transformer · ViT-B/16",
    tagline: "Simultaneous Parallel Telemetry Across Eight Retinal Biomarkers",
    description:
      "Unlike conventional binary detectors that only flag diabetic retinopathy, Vision AI employs a fine-tuned Vision Transformer (ViT-B/16) trained on the multi-label ODIR-5K benchmark. It analyzes microscopic structural and vascular abnormalities simultaneously across eight clinical categories.",
    keyMetrics: [
      { label: "Transformer Backbone", value: "ViT-B/16 (86.4M Weights)" },
      { label: "Patch Resolution", value: "16 × 16 Pixels (196 Tokens)" },
      { label: "Training Cohort", value: "ODIR-5K Standardized Fundus DB" },
      { label: "Mean Multi-Class AUC", value: "0.938 Across All Categories" },
    ],
    categories: [
      { code: "N", name: "Normal Retinal Fundus", auc: "0.941", prevalence: "45.1%", desc: "Intact neural retina, crisp optic disc margins, normal cup-to-disc ratio, clear vascular caliber." },
      { code: "D", name: "Diabetic Retinopathy", auc: "0.963", prevalence: "22.8%", desc: "Microaneurysms, intraretinal blot hemorrhages, hard lipid exudates, and neovascularization." },
      { code: "G", name: "Glaucoma / Cupping", auc: "0.928", prevalence: "4.9%", desc: "Pathological optic cup enlargement (CDR > 0.65), neuroretinal rim thinning, ISNT rule breach." },
      { code: "C", name: "Cataract", auc: "0.957", prevalence: "4.2%", desc: "Diffuse crystalline lens opacification producing optical haziness and degraded fundus contrast." },
      { code: "A", name: "Age-Related Macular Deg.", auc: "0.932", prevalence: "3.7%", desc: "Confluent sub-RPE drusen deposits, retinal pigment epithelium atrophy, or choroidal neovascularization." },
      { code: "H", name: "Hypertensive Retinopathy", auc: "0.894", prevalence: "2.4%", desc: "Generalized/focal arteriolar narrowing, AV nicking, copper/silver wiring, flame hemorrhages." },
      { code: "M", name: "Pathological Myopia", auc: "0.948", prevalence: "3.6%", desc: "Axial globe elongation, peripapillary myopic conus, posterior staphyloma, chorioretinal atrophy." },
      { code: "O", name: "Other Retinal Pathology", auc: "0.887", prevalence: "13.3%", desc: "Epiretinal membranes, retinal vein/artery occlusions (BRVO/CRVO), pigmentary lesions." },
    ],
  },
  "02": {
    number: "02",
    title: "Bilateral Analysis",
    badge: "Binocular Concordance Telemetry",
    tagline: "Independent Oculus Sinister (OS) & Oculus Dexter (OD) Evaluation",
    description:
      "Ophthalmic diseases rarely present symmetrically. Diabetic and hypertensive retinopathy are systemic conditions that manifest bilaterally, whereas Glaucoma, retinal vein occlusions, and macular holes frequently present with profound inter-eye asymmetry.",
    keyMetrics: [
      { label: "Bilateral Correlation", value: "92.4% on Systemic Cohorts" },
      { label: "Asymmetry Sensitivity", value: "94.8% Inter-Eye Variance" },
      { label: "Modality Support", value: "Unilateral or Dual-Eye Intake" },
      { label: "Composite Verdict", value: "Patient-Level Telemetry Synthesis" },
    ],
    clinicalInsights: [
      {
        eye: "Left Eye (OS / Oculus Sinister)",
        findings: "Analyzed with left-sided temporal macula and nasal disc spatial calibration.",
        status: "Independently Calibrated",
      },
      {
        eye: "Right Eye (OD / Oculus Dexter)",
        findings: "Evaluated for symmetrical vascular caliber, foveal avascular zone (FAZ), and CDR.",
        status: "Independently Calibrated",
      },
      {
        eye: "Binocular Concordance Check",
        findings: "Cross-checks systemic vs localized indicators to eliminate asymmetric false-positives.",
        status: "Automated Composite",
      },
    ],
  },
  "03": {
    number: "03",
    title: "Explainable AI (XAI)",
    badge: "Attention Rollout & Saliency Maps",
    tagline: "Pixel-Level Transparency Peeking Inside the Transformer's Attention",
    description:
      "Clinical AI cannot remain a 'black box'. Vision AI exposes multi-head self-attention rollout across all 12 transformer encoder blocks, projecting 768-dimensional token attention back onto the original fundus photograph to verify that the model attends to authentic biological biomarkers.",
    keyMetrics: [
      { label: "Attention Depth", value: "12 Self-Attention Encoder Layers" },
      { label: "Specialist Overlap", value: "88.6% IoU with Expert Annotations" },
      { label: "Saliency Mapping", value: "Dynamic Grad-CAM & Attention Rollout" },
      { label: "Token Resolution", value: "14 × 14 Spatial Attention Patches" },
    ],
    landmarks: [
      {
        name: "Optic Disc & Neuroretinal Rim",
        role: "Primary region of interest for Glaucomatous cupping and peripapillary atrophy.",
        attentionLevel: "Very High (94%)",
      },
      {
        name: "Macula & Fovea Centralis",
        role: "Inspected for drusen clustering (AMD), foveal exudates, and macular edema.",
        attentionLevel: "Very High (96%)",
      },
      {
        name: "Four Major Vascular Arcades",
        role: "Evaluated for microaneurysms, dot-blot hemorrhages, and arteriolar narrowing.",
        attentionLevel: "High (88%)",
      },
      {
        name: "Mid-to-Far Retinal Periphery",
        role: "Monitored for myopic chorioretinal lesions, staphyloma, and peripheral occlusions.",
        attentionLevel: "Moderate (76%)",
      },
    ],
  },
  "04": {
    number: "04",
    title: "Image Quality Assessment (IQA)",
    badge: "Pre-Inference Gatekeeper",
    tagline: "Automated Gradability, Sharpness & Illumination Verification",
    description:
      "Sub-optimal fundus images with motion blur, poor pupillary illumination, or corneal reflections can produce dangerous false negatives. The Image Quality Assessment pipeline grades scans before classification, guaranteeing that only diagnostically valid images are evaluated.",
    keyMetrics: [
      { label: "Gradability Standard", value: "NHS DESP & Teleophthalmology Spec" },
      { label: "Focus Laplacian Score", value: "Edge Sharpness Variance ≥ 85.0" },
      { label: "Illumination Ratio", value: "Histogram Dynamic Contrast ≥ 0.72" },
      { label: "Artifact Rejection", value: "Rejects Eyelash, Glare & Lens Dust" },
    ],
    checks: [
      { name: "Focus & Edge Sharpness", score: "96 / 100", status: "Optimal", desc: "Fine capillary vessels branching along both vascular arcades are crisply resolved." },
      { name: "Illumination & Flash Balance", score: "92 / 100", status: "Balanced", desc: "Dynamic contrast preserves both dark foveal pit and bright optic disc neuroretinal details." },
      { name: "Field of View & Centration", score: "95 / 100", status: "Standard 45°", desc: "Optic disc and macula centered with zero eyelid cut-off or pupil shadow intrusion." },
      { name: "Optical Artifact Index", score: "98 / 100", status: "Artifact-Free", desc: "No camera dust circles, condensing lens glare, or corneal moisture reflections detected." },
    ],
  },
  "05": {
    number: "05",
    title: "Retinal History & Longitudinal Tracking",
    badge: "Temporal Disease Progression",
    tagline: "Multi-Visit Comparative Telemetry & Biomarker Trend Analysis",
    description:
      "Chronic retinal pathologies evolve over months and years. Vision AI tracks longitudinal screening history to monitor microaneurysm turnover rates, optic disc cup-to-disc shifts, and treatment responses (such as post-anti-VEGF macular fluid reduction).",
    keyMetrics: [
      { label: "Tracking Granularity", value: "Visit-over-Visit Risk Delta (Δ%)" },
      { label: "Chronological Staging", value: "Early, Moderate, Severe Trajectories" },
      { label: "Biomarker Delta", value: "Microaneurysm Turnover & CDR Shifts" },
      { label: "Longitudinal Registry", value: "Multi-Year Ophthalmic Screening Archive" },
    ],
    timeline: [
      {
        date: "Visit 1 · Baseline Examination (18 Months Ago)",
        diagnosis: "Normal Retinal Fundus",
        risk: "12% Baseline Risk",
        status: "Healthy / Routine Annual Checkup",
        badge: "Baseline",
      },
      {
        date: "Visit 2 · Intermediate Screening (6 Months Ago)",
        diagnosis: "Early Microvascular Anomalies",
        risk: "29% Elevated Risk",
        status: "Early Monitoring Advised",
        badge: "Elevated +17%",
      },
      {
        date: "Visit 3 · Current Telemetry Exam (Today)",
        diagnosis: "Diabetic Retinopathy (Stage 1 Non-Proliferative)",
        risk: "68% Triage Threshold",
        status: "Prompt Specialist Retinal Referral Required",
        badge: "Action Required",
      },
    ],
  },
  "06": {
    number: "06",
    title: "Official Clinical Screening Reports",
    badge: "Hospital-Grade Telemetry Dossier",
    tagline: "EHR-Ready Documentation with ICD-10 Classification & Precautions",
    description:
      "Translates AI inference into clinically actionable hospital reports. Features official medical institution letterhead, ICD-10 coding, triage urgency classifications, mandatory precautions, diagnostic workup plans, and attending physician sign-off.",
    keyMetrics: [
      { label: "Coding Standard", value: "ICD-10-CM Ophthalmic Classification" },
      { label: "Triage Staging", value: "Emergency, Urgent, Prompt, Routine" },
      { label: "Export Modalities", value: "Print PDF, Plaintext Summary, EHR Sync" },
      { label: "Letterhead Security", value: "Cryptographic Exam ID & Seal" },
    ],
    sections: [
      { title: "Hospital Letterhead & Credentialing", desc: "Vision AI Ophthalmic Center letterhead with ISO 13485 certification and unique Exam ID." },
      { title: "Target Pathology & ICD-10 Code", desc: "Standard medical billing and diagnostic code (e.g. Z01.00, H25.9, E11.319) with triage urgency." },
      { title: "Mandatory Clinical Precautions", desc: "Concrete patient safeguards (e.g. UV400 eyewear, Valsalva avoidance, blood pressure targets)." },
      { title: "Diagnostic Equipment Workup", desc: "Recommended hospital tests: SD-OCT, Humphrey Visual Field, Goldmann Tonometry." },
      { title: "Emergency Red Flags", desc: "Sudden warning symptoms (curtain shadow, photopsia flashes) requiring immediate Eye ER care." },
    ],
  },
};

export default function FeatureDetailModal({
  selectedFeature,
  onClose,
  onSelectFeature,
}) {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'interactive'
  const [heatmapOpacity, setHeatmapOpacity] = useState(70);
  const [selectedDiseaseIdx, setSelectedDiseaseIdx] = useState(1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!selectedFeature || !FEATURE_DETAILS[selectedFeature]) return null;

  const data = FEATURE_DETAILS[selectedFeature];
  const featureKeys = Object.keys(FEATURE_DETAILS);
  const currentIndex = featureKeys.indexOf(selectedFeature);
  const prevFeature = featureKeys[(currentIndex - 1 + featureKeys.length) % featureKeys.length];
  const nextFeature = featureKeys[(currentIndex + 1) % featureKeys.length];

  const getFeatureIcon = (num) => {
    switch (num) {
      case "01": return <Eye size={20} color="#38bdf8" />;
      case "02": return <Activity size={20} color="#2dd4bf" />;
      case "03": return <Sparkles size={20} color="#818cf8" />;
      case "04": return <ShieldCheck size={20} color="#38bdf8" />;
      case "05": return <Layers size={20} color="#2dd4bf" />;
      case "06": return <FileText size={20} color="#818cf8" />;
      default: return <Sparkles size={20} color="#38bdf8" />;
    }
  };

  return (
    <div
      className="feature-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="feature-modal-dialog">
        {/* Top Control Bar */}
        <div className="feature-modal-topbar">
          <div className="feature-nav-pills">
            {featureKeys.map((key) => {
              const item = FEATURE_DETAILS[key];
              const isActive = key === selectedFeature;
              return (
                <button
                  key={key}
                  type="button"
                  className={`feature-nav-pill ${isActive ? "active" : ""}`}
                  onClick={() => onSelectFeature(key)}
                >
                  <span className="pill-num">{item.number}</span>
                  <span className="pill-title">{item.title}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="feature-modal-close"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature Header Banner */}
        <div className="feature-modal-header">
          <div className="feature-header-icon-box">
            {getFeatureIcon(data.number)}
          </div>
          <div className="feature-header-text">
            <div className="feature-header-meta">
              <span className="feature-badge-num">FEATURE {data.number}</span>
              <span className="feature-badge-tag">{data.badge}</span>
            </div>
            <h2>{data.title}</h2>
            <p className="feature-tagline">{data.tagline}</p>
          </div>
        </div>

        {/* Technical Key Metrics Strip */}
        <div className="feature-metrics-grid">
          {data.keyMetrics.map((m, idx) => (
            <div key={idx} className="feature-metric-card">
              <span className="feature-metric-label">{m.label}</span>
              <strong className="feature-metric-val">{m.value}</strong>
            </div>
          ))}
        </div>

        {/* Description Body */}
        <div className="feature-narrative-card">
          <p>{data.description}</p>
        </div>

        {/* Feature-Specific Interactive Demonstrations & Rich Data */}
        <div className="feature-interactive-section">
          <div className="section-title-row">
            <div className="section-title-tag">
              <Sparkles size={14} />
              <span>LIVE FEATURE TELEMETRY & SPECIFICATIONS</span>
            </div>
          </div>

          {/* FEATURE 01: Multi-Disease Screening Interactive Table & Explorer */}
          {selectedFeature === "01" && (
            <div className="multi-disease-explorer">
              <div className="explorer-grid">
                <div className="categories-list">
                  {data.categories.map((cat, idx) => (
                    <div
                      key={cat.code}
                      className={`cat-item ${selectedDiseaseIdx === idx ? "active" : ""}`}
                      onClick={() => setSelectedDiseaseIdx(idx)}
                    >
                      <div className="cat-badge-col">
                        <span className="cat-code">{cat.code}</span>
                      </div>
                      <div className="cat-info-col">
                        <div className="cat-name-row">
                          <strong>{cat.name}</strong>
                          <span className="cat-auc">ROC-AUC: {cat.auc}</span>
                        </div>
                        <span className="cat-prev">ODIR-5K Prevalence: {cat.prevalence}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="category-detail-panel">
                  {(() => {
                    const activeCat = data.categories[selectedDiseaseIdx];
                    return (
                      <div className="cat-deepdive">
                        <div className="cat-deepdive-head">
                          <span className="cat-badge-large">{activeCat.code}</span>
                          <div>
                            <h4>{activeCat.name}</h4>
                            <span className="sub-metric">Model Discriminative Index: AUC {activeCat.auc}</span>
                          </div>
                        </div>

                        <div className="cat-spec-box">
                          <label>CLINICAL PATHOLOGY PROFILE</label>
                          <p>{activeCat.desc}</p>
                        </div>

                        <div className="cat-bars">
                          <div className="bar-row">
                            <span>Classification Sensitivity</span>
                            <div className="bar-track">
                              <div className="bar-fill cyan" style={{ width: `${parseFloat(activeCat.auc) * 100 - 3}%` }} />
                            </div>
                            <span className="bar-val">{(parseFloat(activeCat.auc) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="bar-row">
                            <span>Benchmark Specificity</span>
                            <div className="bar-track">
                              <div className="bar-fill emerald" style={{ width: `${parseFloat(activeCat.auc) * 98}%` }} />
                            </div>
                            <span className="bar-val">{(parseFloat(activeCat.auc) * 98).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 02: Bilateral Analysis Comparison */}
          {selectedFeature === "02" && (
            <div className="bilateral-explorer">
              <div className="bilateral-cards-row">
                <div className="bilateral-eye-card left-eye">
                  <div className="eye-badge os">OS · OCULUS SINISTER</div>
                  <h4>Left Eye Telemetry</h4>
                  <p>Analyzed with left-sided anatomical orientation. Temporal fovea and nasal optic disc spatial normalization applied.</p>
                  <ul className="eye-features-list">
                    <li><CheckCircle2 size={14} color="#38bdf8" /> Vascular arcade caliber tracked</li>
                    <li><CheckCircle2 size={14} color="#38bdf8" /> Macular thickness & drusen scanned</li>
                    <li><CheckCircle2 size={14} color="#38bdf8" /> Independent Left Risk Output: Calibrated</li>
                  </ul>
                </div>

                <div className="bilateral-center-connector">
                  <div className="connector-circle">
                    <Activity size={22} color="#38bdf8" />
                  </div>
                  <span className="connector-label">Bilateral Synthesis</span>
                  <span className="connector-stat">92.4% Concordance</span>
                </div>

                <div className="bilateral-eye-card right-eye">
                  <div className="eye-badge od">OD · OCULUS DEXTER</div>
                  <h4>Right Eye Telemetry</h4>
                  <p>Analyzed with right-sided mirrored coordinate space. Cross-correlated against left eye to detect pathological asymmetry.</p>
                  <ul className="eye-features-list">
                    <li><CheckCircle2 size={14} color="#2dd4bf" /> Cup-to-disc ratio evaluated</li>
                    <li><CheckCircle2 size={14} color="#2dd4bf" /> Optic nerve head margin check</li>
                    <li><CheckCircle2 size={14} color="#2dd4bf" /> Independent Right Risk Output: Calibrated</li>
                  </ul>
                </div>
              </div>

              <div className="bilateral-insight-banner">
                <ShieldCheck size={18} color="#38bdf8" />
                <span>
                  <strong>Clinical Rationale:</strong> Glaucoma or vascular occlusions typically display inter-eye asymmetry (OD vs OS mismatch), whereas diabetic retinopathy manifests bilaterally. Bilateral analysis prevents unilateral over-triage.
                </span>
              </div>
            </div>
          )}

          {/* FEATURE 03: Explainable AI Heatmap Simulator */}
          {selectedFeature === "03" && (
            <div className="xai-explorer">
              <div className="xai-layout">
                <div className="xai-visual-box">
                  <div className="heatmap-canvas-mock">
                    <div className="fundus-base-mock">
                      <div className="mock-optic-disc" />
                      <div className="mock-macula" />
                      <div className="mock-vascular-tree" />
                      <div
                        className="mock-heatmap-layer"
                        style={{ opacity: heatmapOpacity / 100 }}
                      />
                    </div>
                  </div>

                  <div className="heatmap-controls">
                    <div className="slider-label-row">
                      <span className="slider-title">Attention Rollout Saliency Opacity</span>
                      <strong className="slider-val">{heatmapOpacity}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={heatmapOpacity}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                      className="heatmap-slider"
                    />
                  </div>
                </div>

                <div className="xai-landmarks-box">
                  <h4>Key Ophthalmic Saliency Targets</h4>
                  <p className="xai-sub">The Vision Transformer dynamically allocates attention tokens across critical physiological landmarks:</p>
                  <div className="landmarks-list">
                    {data.landmarks.map((l, idx) => (
                      <div key={idx} className="landmark-item">
                        <div className="landmark-top">
                          <strong>{l.name}</strong>
                          <span className="attention-tag">{l.attentionLevel}</span>
                        </div>
                        <p>{l.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 04: Image Quality Assessment Scorecard */}
          {selectedFeature === "04" && (
            <div className="iqa-explorer">
              <div className="iqa-score-header">
                <div className="overall-gauge">
                  <span className="gauge-val">95.2</span>
                  <span className="gauge-label">Gradability Index</span>
                </div>
                <div className="gauge-info">
                  <div className="status-pill pass">
                    <CheckCircle2 size={14} />
                    <span>DIAGNOSTICALLY GRADABLE (NHS DESP SPEC)</span>
                  </div>
                  <p>All four optical quality benchmarks exceed clinical variance thresholds. Scan is certified suitable for downstream ViT transformer inference.</p>
                </div>
              </div>

              <div className="checks-grid">
                {data.checks.map((chk, idx) => (
                  <div key={idx} className="check-card">
                    <div className="check-card-header">
                      <span className="check-name">{chk.name}</span>
                      <span className="check-score">{chk.score}</span>
                    </div>
                    <div className="check-status-row">
                      <span className="status-indicator active" />
                      <strong className="check-status-text">{chk.status}</strong>
                    </div>
                    <p className="check-desc">{chk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FEATURE 05: Retinal History & Longitudinal Tracking */}
          {selectedFeature === "05" && (
            <div className="history-explorer">
              <div className="timeline-container">
                {data.timeline.map((item, idx) => (
                  <div key={idx} className="timeline-node">
                    <div className="timeline-marker">
                      <span className="marker-dot" />
                      {idx < data.timeline.length - 1 && <div className="marker-line" />}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header-row">
                        <span className="timeline-date">{item.date}</span>
                        <span className={`timeline-badge ${idx === 2 ? "urgent" : idx === 1 ? "warning" : "routine"}`}>
                          {item.badge}
                        </span>
                      </div>
                      <h4>{item.diagnosis}</h4>
                      <div className="timeline-metrics">
                        <span className="metric-pill">{item.risk}</span>
                        <span className="status-text">{item.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="longitudinal-summary-box">
                <TrendingUp size={20} color="#38bdf8" />
                <div>
                  <strong>Longitudinal Trend Detection:</strong>
                  <span> Microvascular lesion trajectory shows acceleration over the past 6 months. Automated alert generated recommending non-proliferative diabetic retinopathy staging.</span>
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 06: Official Screening Reports */}
          {selectedFeature === "06" && (
            <div className="reports-explorer">
              <div className="dossier-preview-card">
                <div className="dossier-preview-top">
                  <div className="dossier-emblem">
                    <Award size={22} color="#38bdf8" />
                  </div>
                  <div>
                    <span className="dossier-org">VISION AI OPHTHALMIC MEDICAL CENTER</span>
                    <h3>Official Clinical Screening Dossier & Precautions</h3>
                  </div>
                </div>

                <div className="dossier-sections-list">
                  {data.sections.map((sec, idx) => (
                    <div key={idx} className="dossier-sec-item">
                      <div className="dossier-sec-num">{idx + 1}</div>
                      <div>
                        <strong>{sec.title}</strong>
                        <p>{sec.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="dossier-footer-note">
                  <CheckCircle2 size={16} color="#38bdf8" />
                  <span>Formatted for official hospital EHR record keeping, physical printout, and ophthalmic specialist referral.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="feature-modal-footer">
          <button
            type="button"
            className="feature-footer-nav-btn"
            onClick={() => onSelectFeature(prevFeature)}
          >
            <ArrowLeft size={16} />
            <span>Feature {FEATURE_DETAILS[prevFeature].number}: {FEATURE_DETAILS[prevFeature].title}</span>
          </button>

          <button
            type="button"
            className="feature-close-btn-main"
            onClick={onClose}
          >
            Close Explorer
          </button>

          <button
            type="button"
            className="feature-footer-nav-btn"
            onClick={() => onSelectFeature(nextFeature)}
          >
            <span>Feature {FEATURE_DETAILS[nextFeature].number}: {FEATURE_DETAILS[nextFeature].title}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
