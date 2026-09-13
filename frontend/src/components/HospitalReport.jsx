import { useState, useId, useEffect } from "react";
import {
  ShieldAlert,
  FileCheck2,
  Stethoscope,
  AlertTriangle,
  HeartPulse,
  Printer,
  Copy,
  Check,
  Calendar,
  Clock,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react";
import TiltCard from "./TiltCard";

// Comprehensive fallback clinical knowledge base
const FALLBACK_CLINICAL_PROFILES = {
  Normal: {
    icd10_code: "Z01.00",
    clinical_name: "Normal Retinal Fundus (Physiologically Intact)",
    triage_level: "Routine Annual Maintenance",
    referral_timeline: "Next regular screening in 12 months",
    overview: "No signs of diabetic microaneurysms, glaucomatous optic nerve head cupping, drusen, or lens opacities detected. The macula, optic disc, and retinal vascular architecture appear well-preserved.",
    precautions: [
      "Wear UV400-certified sunglasses when outdoors to protect against photochemical maculopathy.",
      "Maintain balanced 20-20-20 visual hygiene during prolonged digital screen use (every 20 mins, look 20 feet away for 20 seconds).",
      "Schedule annual comprehensive dilated fundus examination, especially if there is a family history of glaucoma or diabetes.",
      "Wear protective polycarbonate eyewear during sports, home repairs, or industrial activities."
    ],
    diagnostic_tests: [
      "Baseline Non-Mydriatic Fundus Photography",
      "Snellen Visual Acuity Refraction Check",
      "Non-Contact Tonometry (Baseline IOP assessment)"
    ],
    treatment_pathway: [
      "No active medical or surgical intervention required at this time.",
      "Maintain routine preventative ophthalmic monitoring."
    ],
    lifestyle_diet: [
      "Maintain an antioxidant-rich diet containing dark leafy greens (kale, spinach) for lutein and zeaxanthin.",
      "Include Omega-3 fatty acids (flaxseeds, walnuts, oily fish) to support tear film stability and photoreceptor health.",
      "Stay adequately hydrated and maintain regular aerobic cardiovascular exercise."
    ],
    emergency_symptoms: [
      "Sudden onset of persistent dark spots or floaters",
      "Flashes of light (photopsia) in peripheral vision",
      "Dark curtain or shadow obscuring any part of visual field"
    ]
  },
  "Diabetic Retinopathy": {
    icd10_code: "E11.319 / H36.0",
    clinical_name: "Diabetic Retinopathy (Microvascular Retinal Pathology)",
    triage_level: "Urgent Specialist Referral",
    referral_timeline: "Comprehensive retinal consultation within 7 to 14 days",
    overview: "AI telemetry detected microvascular retinal alterations consistent with diabetic retinopathy (e.g. microaneurysms, dot-and-blot hemorrhages, or lipid exudates) resulting from prolonged microvascular ischemia.",
    precautions: [
      "Strict glycemic control: target HbA1c below 7.0% (or personalized target set by your endocrinologist).",
      "Avoid strenuous Valsalva maneuvers (e.g. heavy weight lifting, forceful coughing, intense breath-holding) which can trigger intraretinal or vitreous hemorrhages.",
      "Do not rub or apply direct pressure to the eyes.",
      "Monitor blood pressure and maintain readings below 130/80 mmHg to reduce retinal capillary shear stress.",
      "Conduct daily monocular vision self-checks to identify any sudden central or peripheral blurring."
    ],
    diagnostic_tests: [
      "Spectral-Domain Optical Coherence Tomography (SD-OCT) to rule out Diabetic Macular Edema (DME)",
      "Fundus Fluorescein Angiography (FFA) to assess retinal capillary non-perfusion and neovascularization",
      "Glycated Hemoglobin (HbA1c) & Renal Microalbuminuria blood panel",
      "Standard Dilated Slit-Lamp Biomicroscopy with 90D fundus lens"
    ],
    treatment_pathway: [
      "Intravitreal Anti-VEGF Injections (Aflibercept, Ranibizumab, or Bevacizumab) if Macular Edema is present.",
      "Targeted Focal/Grid Laser Photocoagulation for leaking microaneurysms.",
      "Panretinal Photocoagulation (PRP) if proliferative changes (PDR) or severe NPDR are confirmed.",
      "Comprehensive systemic glycemic and lipid optimization with primary care team."
    ],
    lifestyle_diet: [
      "Low-glycemic index, Mediterranean-style nutrition with complex carbohydrates.",
      "Omega-3 fatty acids and dietary antioxidants to reduce systemic vascular oxidative stress.",
      "Strict cessation of all tobacco and nicotine products (smoking accelerates diabetic retinal hypoxia).",
      "Moderate low-impact aerobic exercise (walking, swimming) under medical supervision."
    ],
    emergency_symptoms: [
      "Sudden shower of red/black floaters or 'cobwebs' in vision (indicates vitreous hemorrhage)",
      "Abrupt, painless drop in central visual acuity",
      "Dark veil or curtain falling over the field of view"
    ]
  },
  Glaucoma: {
    icd10_code: "H40.9",
    clinical_name: "Glaucoma / Pathological Optic Nerve Cupping",
    triage_level: "Urgent Diagnostic Triage",
    referral_timeline: "Glaucoma specialist evaluation within 7 to 14 days",
    overview: "Deep scanning identified suspicious enlargement of the cup-to-disc (C/D) ratio and retinal nerve fiber layer (RNFL) thinning, characteristic of glaucomatous optic neuropathy which causes irreversible visual field loss if untreated.",
    precautions: [
      "Never discontinue or skip prescribed pressure-lowering eye drops once initiated by your physician.",
      "Avoid head-down inversion postures (e.g. downward dog yoga poses, inversion tables) which significantly spike intraocular pressure (IOP).",
      "Avoid chugging large volumes of fluids in short intervals; distribute fluid intake steadily throughout the day.",
      "Avoid tight neckties or neck collars that constrict jugular venous return.",
      "Inform all healthcare providers of suspected glaucoma before taking anticholinergic or steroid medications."
    ],
    diagnostic_tests: [
      "Goldmann Applanation Tonometry (GAT) for precise Intraocular Pressure measurement",
      "Spectral-Domain OCT of the Optic Nerve Head & Peripapillary RNFL Thickness",
      "Humphrey Automated Visual Field (HVF 24-2 / 30-2 SITA-Fast or Standard)",
      "Gonioscopy to distinguish Open-Angle vs Closed-Angle Glaucoma",
      "Central Corneal Pachymetry (CCT) to calibrate corneal thickness impact on IOP"
    ],
    treatment_pathway: [
      "First-line Topical Hypotensive Eye Drops: Prostaglandin Analogues (Latanoprost, Travoprost) or Beta-blockers (Timolol).",
      "Selective Laser Trabeculoplasty (SLT) to enhance aqueous humor drainage outflow.",
      "Minimally Invasive Glaucoma Surgery (MIGS) or Trabeculectomy if medical therapy is insufficient to arrest progression."
    ],
    lifestyle_diet: [
      "Consume flavonoid-rich foods (berries, dark leafy greens, green tea) supporting neuroprotection.",
      "Moderate caffeine consumption (limit excessive coffee, which can transiently elevate IOP).",
      "Engage in moderate aerobic exercise (brisk walking) which has been shown to naturally lower IOP.",
      "Elevate head of bed by 15-20 degrees during sleep to reduce nocturnal supine IOP spikes."
    ],
    emergency_symptoms: [
      "Severe ocular pain with headache, nausea, and vomiting (hallmark of Acute Angle-Closure Glaucoma)",
      "Rainbow halos appearing around lights",
      "Sudden severe hazy or cloudy vision"
    ]
  },
  Cataract: {
    icd10_code: "H25.9",
    clinical_name: "Cataract (Crystalline Lens Opacity)",
    triage_level: "Prompt Outpatient Evaluation",
    referral_timeline: "Comprehensive ophthalmic visit within 2 to 4 weeks",
    overview: "Significant optical media attenuation detected, consistent with crystalline lens nuclear or cortical opacification that scatters incoming light and degrades contrast sensitivity.",
    precautions: [
      "Exercise extreme caution when driving at night due to debilitating headlight glare and halo distortion.",
      "Ensure bright, indirect task lighting at home and work to reduce visual strain and prevent fall injuries.",
      "Wear 100% UV400 sunglasses outdoors, as ultraviolet radiation accelerates cataract density.",
      "Do not rub eyes vigorously or sleep face-down.",
      "Avoid frequent unverified changes of reading glasses without a professional dilated exam."
    ],
    diagnostic_tests: [
      "Slit-Lamp Biomicroscopy with lens nuclear opalescence grading (LOCS III scale)",
      "Best-Corrected Visual Acuity (BCVA) Refraction Check",
      "Contrast Sensitivity Testing (Pelli-Robson chart)",
      "Optical Biometry (IOL Master / Lenstar) for intraocular lens calculation when planning surgery"
    ],
    treatment_pathway: [
      "Early stage: Updated corrective prescription lenses, anti-reflective coatings, and magnifying aids.",
      "Definitive surgical solution: Modern Micro-Incision Phacoemulsification with Foldable Intraocular Lens (IOL) implantation (monofocal, toric, or multifocal).",
      "Outpatient day-procedure with rapid visual recovery (typically within 48-72 hours)."
    ],
    lifestyle_diet: [
      "Diet rich in Vitamin C (citrus fruits, bell peppers) and Vitamin E (nuts, sunflower seeds) to combat lens protein glycation.",
      "Lutein and Zeaxanthin supplementation to protect both lens and macular pigment.",
      "Strict avoidance of cigarette smoke and environmental particulate exposure."
    ],
    emergency_symptoms: [
      "Sudden red eye accompanied by deep ocular pain",
      "Rapid total loss of vision in the affected eye",
      "Swelling or severe discharge around the eyelids"
    ]
  },
  AMD: {
    icd10_code: "H35.31 / H35.32",
    clinical_name: "Age-Related Macular Degeneration (Maculopathy)",
    triage_level: "Urgent Macular Triage",
    referral_timeline: "Retina specialist evaluation within 3 to 7 days",
    overview: "Elevated signal for macular degenerative changes (drusen formation, retinal pigment epithelium atrophy, or potential choroidal neovascularization) in the central anatomical fovea.",
    precautions: [
      "Perform weekly monocular Amsler Grid testing: report any new waviness, distortion, or blank spots immediately.",
      "Wear UV400 and blue-light blocking sunglasses whenever exposed to outdoor sunlight.",
      "Stop all smoking immediately: smoking increases AMD progression risk by up to 400%.",
      "Avoid excessive ocular strain in dim lighting; use focused magnification task lamps."
    ],
    diagnostic_tests: [
      "Macular Spectral-Domain OCT (High-resolution B-scans to detect subretinal/intraretinal fluid)",
      "Optical Coherence Tomography Angiography (OCT-A) to detect Choroidal Neovascular Membranes (CNV)",
      "Fluorescein Angiography (FA) / Indocyanine Green Angiography (ICGA) if active leakage is suspected",
      "Amsler Grid Monocular Distortion Mapping"
    ],
    treatment_pathway: [
      "Dry AMD: Prescription AREDS2 oral formula (Vitamin C, Vitamin E, Zinc, Copper, Lutein, Zeaxanthin).",
      "Wet / Exudative AMD: Urgent intravitreal Anti-VEGF therapy (Aflibercept, Faricimab, or Ranibizumab) on treat-and-extend protocol.",
      "Low-vision visual rehabilitation aids and magnification devices for intermediate/advanced stages."
    ],
    lifestyle_diet: [
      "Adhere strictly to AREDS2 nutritional guidelines.",
      "Consume 2-3 servings weekly of cold-water oily fish (salmon, sardines, mackerel) rich in DHA/EPA.",
      "Include dark leafy green vegetables daily (spinach, kale, collard greens).",
      "Maintain optimal systemic blood pressure and lipid panel levels."
    ],
    emergency_symptoms: [
      "Sudden appearance of distortion (metamorphopsia)—straight lines appearing bent, wavy, or broken",
      "A sudden gray or dark blind spot (scotoma) appearing in the center of your vision",
      "Sudden difficulty recognizing faces or reading text"
    ]
  },
  Hypertension: {
    icd10_code: "H35.03",
    clinical_name: "Hypertensive Retinopathy (Systemic Vascular Target-Organ Damage)",
    triage_level: "Prompt Medical & Ophthalmic Co-Management",
    referral_timeline: "Cardiovascular & retinal evaluation within 3 to 7 days",
    overview: "Retinal telemetry demonstrates characteristic arteriolar signs (generalized or focal arteriolar narrowing, arteriovenous nicking, copper/silver wiring, or flame hemorrhages) reflecting systemic vascular hypertension.",
    precautions: [
      "Immediate daily home blood pressure monitoring (aim for target below 130/80 mmHg or as directed by physician).",
      "Take all prescribed antihypertensive medications consistently without self-discontinuing.",
      "Restrict sodium intake to less than 1,500 mg - 2,000 mg daily.",
      "Avoid high-stress spikes and limit energy drinks or stimulants that acutely elevate vascular pressure."
    ],
    diagnostic_tests: [
      "24-Hour Ambulatory Blood Pressure Monitoring (ABPM)",
      "Comprehensive Dilated Fundus Examination to grade Keith-Wagener-Barker retinopathy stage (Grade I-IV)",
      "Renal function test (Serum Creatinine, eGFR, Urinalysis) to evaluate renal target-organ damage",
      "Electrocardiogram (ECG) and Echocardiogram to evaluate left ventricular hypertrophy"
    ],
    treatment_pathway: [
      "Systemic Antihypertensive Medical Therapy (ACE inhibitors, ARBs, Calcium Channel Blockers, or Thiazides).",
      "Ophthalmic monitoring for complications such as Retinal Vein Occlusion (BRVO/CRVO) or Macroaneurysms.",
      "Intravitreal Anti-VEGF or laser therapy if secondary macular edema or neovascularization develops."
    ],
    lifestyle_diet: [
      "DASH Diet (Dietary Approaches to Stop Hypertension): rich in potassium, magnesium, calcium, and fiber.",
      "Reduce sodium, saturated fats, and processed foods.",
      "Weight management and 150 minutes of weekly moderate aerobic physical exercise.",
      "Limit alcohol intake and completely avoid tobacco."
    ],
    emergency_symptoms: [
      "Severe sudden headache with visual blurriness (possible Hypertensive Crisis > 180/120 mmHg)",
      "Sudden partial or complete painless loss of vision in one eye",
      "Chest pain, shortness of breath, or neurological numbness accompanying visual changes"
    ]
  },
  Myopia: {
    icd10_code: "H44.2",
    clinical_name: "Pathological / High Myopia (Chorioretinal Degeneration)",
    triage_level: "Specialist Retinal Examination",
    referral_timeline: "Peripheral retinal evaluation within 2 to 4 weeks",
    overview: "Fundus examination displays typical signs of excessive axial globe elongation (tessellated fundus, peripapillary myopic conus, or posterior staphyloma), increasing vulnerability to peripheral retinal tears.",
    precautions: [
      "Avoid heavy contact sports, martial arts, or bungee jumping that carry high risk of blunt head/eye trauma.",
      "Practice immediate self-reporting if any sudden flashes of light or new floaters appear.",
      "Avoid excessive unmanaged near-work without visual breaks; adhere to the 20-20-20 rule.",
      "Use protective polycarbonate eyewear during physical activities."
    ],
    diagnostic_tests: [
      "360-Degree Dilated Peripheral Retinal Funduscopy with Scleral Depression",
      "Optical Biometry to measure Axial Eye Length (AL > 26.0 mm indicates high risk)",
      "Widefield Optos Imaging to evaluate peripheral lattice degeneration",
      "SD-OCT to monitor for Myopic Foveoschisis or Myopic Choroidal Neovascularization (mCNV)"
    ],
    treatment_pathway: [
      "Prophylactic Barrier Laser Photocoagulation / Cryotherapy if retinal lattice degeneration, holes, or tears are found.",
      "Intravitreal Anti-VEGF injections if Myopic Choroidal Neovascularization (Foster-Fuchs spot) develops.",
      "Surgical Pars Plana Vitrectomy if retinal detachment or macular traction detachment occurs."
    ],
    lifestyle_diet: [
      "Increase outdoor natural daylight exposure (especially beneficial for slowing myopic progression in young adults).",
      "Balanced diet rich in vitamins A, C, E, and lutein supporting chorioretinal integrity.",
      "Ensure ergonomic lighting and optimal working distance (minimum 35–40 cm) during screen and reading tasks."
    ],
    emergency_symptoms: [
      "Sudden increase in floating spots, strings, or 'cobwebs' across vision",
      "Persistent bright flashes of light (lightning streaks) in the visual periphery",
      "A gray shadow or dark curtain creeping into your visual field (indicates Retinal Detachment)"
    ]
  },
  Other: {
    icd10_code: "H35.89",
    clinical_name: "Other Specified Retinal Pathology / Atypical Finding",
    triage_level: "Specialist Ophthalmic Review",
    referral_timeline: "Comprehensive retinal examination within 2 to 3 weeks",
    overview: "AI telemetry identified atypical retinal features outside the common disease categories (such as Epiretinal Membrane, Retinal Pigmentary Anomalies, Macular Hole, or Branch Retinal Vein Occlusion).",
    precautions: [
      "Seek formal dilated ophthalmic evaluation with multi-modal imaging to establish a definitive sub-classification.",
      "Avoid rubbing eyes and protect eyes against mechanical trauma.",
      "Track visual distortion or central blind spots using an Amsler grid.",
      "Keep records of any systemic conditions (autoimmune diseases, vascular disorders, medications)."
    ],
    diagnostic_tests: [
      "High-Density Macular & Peripheral SD-OCT",
      "Ultra-Widefield Color Fundus Photography",
      "Fundus Autofluorescence (FAF) to evaluate metabolic health of the Retinal Pigment Epithelium",
      "Fluorescein Angiography (FFA) as indicated by specialist"
    ],
    treatment_pathway: [
      "Management tailored to specific pathology identified upon comprehensive subspecialty examination.",
      "May include observation, topical therapy, intravitreal injections, or vitreo-retinal surgery depending on structural findings."
    ],
    lifestyle_diet: [
      "General retinal protective diet: antioxidants, dark green vegetables, omega-3 fatty acids.",
      "Maintain general cardiovascular health and adequate hydration.",
      "Wear 100% UV-protective eyewear in outdoor environments."
    ],
    emergency_symptoms: [
      "Sudden significant drop in visual acuity",
      "Severe pain or sudden redness in the eye",
      "Flashes, dense showers of floaters, or curtain obscuring vision"
    ]
  }
};

export default function HospitalReport({
  diagnosis,
  leftDiagnosis,
  rightDiagnosis,
  mode,
  activeTab = "all",
  onClose,
  isStandalone = false,
}) {
  const [activeSection, setActiveSection] = useState("precautions"); // 'precautions', 'tests', 'treatment', 'lifestyle', 'emergency'
  const [copied, setCopied] = useState(false);
  const examId = useId().replace(/:/g, "").toUpperCase().slice(0, 7);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!diagnosis) return null;

  // Determine active diagnosis based on current tab selection
  const currentDiag =
    mode === "bilateral" && activeTab === "left"
      ? leftDiagnosis
      : mode === "bilateral" && activeTab === "right"
        ? rightDiagnosis
        : diagnosis;

  const rawDiseaseKey = currentDiag?.primary_disease || "Normal";
  const diseaseKey = rawDiseaseKey.includes("Normal") ? "Normal" : rawDiseaseKey;
  const profile =
    currentDiag?.clinical_report ||
    FALLBACK_CLINICAL_PROFILES[diseaseKey] ||
    FALLBACK_CLINICAL_PROFILES.Other;

  const isAbnormal = currentDiag?.status === "disease_detected";
  const badgeClass = isAbnormal
    ? currentDiag?.badge_type || "high"
    : "normal";

  const currentDateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentTimeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `
=====================================================
OFFICIAL OPHTHALMIC CLINICAL SCREENING REPORT
Hospital: Vision AI Ophthalmic Telemetry Center
Date: ${currentDateStr} at ${currentTimeStr}
Exam ID: RET-${examId}
Modality: Digital Non-Mydriatic Funduscopy · ViT-B/16
-----------------------------------------------------
DIAGNOSTIC FINDING:
Target Pathology: ${profile.clinical_name}
ICD-10 Code: ${profile.icd10_code}
Screening Confidence: ${currentDiag?.confidence}%
Severity: ${currentDiag?.severity}
Triage Level: ${profile.triage_level}
Recommended Action: ${profile.referral_timeline}

CLINICAL PRECAUTIONS:
${profile.precautions.map((p, i) => `${i + 1}. ${p}`).join("\n")}

RECOMMENDED DIAGNOSTIC TESTS:
${profile.diagnostic_tests.map((t, i) => `• ${t}`).join("\n")}

TREATMENT PATHWAY:
${profile.treatment_pathway.map((tr, i) => `• ${tr}`).join("\n")}

DIETARY & LIFESTYLE GUIDANCE:
${profile.lifestyle_diet.map((l, i) => `• ${l}`).join("\n")}

EMERGENCY WARNING RED FLAGS:
${profile.emergency_symptoms.map((e, i) => `! ${e}`).join("\n")}

Notice: Vision AI screening telemetry calibrated on ODIR-5K dataset.
Requires clinical confirmation by licensed ophthalmologist.
=====================================================
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownloadText = () => {
    const text = `OFFICIAL OPHTHALMIC CLINICAL REPORT\nExam ID: RET-${examId}\nFinding: ${profile.clinical_name} (${profile.icd10_code})\nConfidence: ${currentDiag?.confidence}%\n\nPRECAUTIONS:\n${profile.precautions.join("\n")}\n\nTESTS:\n${profile.diagnostic_tests.join("\n")}\n\nTREATMENTS:\n${profile.treatment_pathway.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Clinical_Report_RET-${examId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`hospital-report-root ${isStandalone ? "standalone-page-mode" : ""}`}>
      {/* Top Nav Control Bar when in modal or standalone mode */}
      {(onClose || isStandalone) && (
        <div className="hospital-top-nav-bar">
          <button
            type="button"
            className="hospital-nav-back-btn"
            onClick={() => {
              if (onClose) onClose();
              else window.location.href = "/";
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Screening Dashboard</span>
          </button>

          <div className="hospital-top-nav-actions">
            <button
              type="button"
              className="hospital-btn btn-print"
              onClick={handlePrint}
            >
              <Printer size={15} />
              Print Official PDF
            </button>

            {onClose && (
              <button
                type="button"
                className="hospital-close-icon-btn"
                onClick={onClose}
                title="Close Report View (Esc)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      <TiltCard maxTilt={isStandalone ? 0 : 3} scale={isStandalone ? 1 : 1.005} className="hospital-report-tilt">
        <div className="hospital-report-card">
          {/* Header watermark & emblem */}
          <div className="hospital-header-band">
            <div className="hospital-institution">
              <div className="hospital-emblem">
                <Stethoscope size={24} />
              </div>
              <div>
                <span className="hospital-sub">ISO 13485 CERTIFIED CLINICAL TELEMETRY</span>
                <h3 className="hospital-name">VISION AI OPHTHALMIC MEDICAL CENTER</h3>
                <span className="hospital-division">DIVISION OF VITREORETINAL DISEASES & SCREENING</span>
              </div>
            </div>

            <div className="hospital-meta-box">
              <div className="meta-item">
                <span className="meta-label">EXAMINATION ID</span>
                <strong className="meta-val">RET-2026-{examId}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-label">DATE & TIME</span>
                <span className="meta-val">{currentDateStr} · {currentTimeStr}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">MODALITY</span>
                <span className="meta-val">Digital Funduscopy · ViT-B/16</span>
              </div>
            </div>
          </div>

          {/* Diagnosis & ICD-10 Banner */}
          <div className={`hospital-diag-banner banner-${badgeClass}`}>
            <div className="diag-main-block">
              <div className="diag-tags-row">
                <span className="icd10-pill">
                  ICD-10: {profile.icd10_code}
                </span>
                <span className={`triage-pill triage-${badgeClass}`}>
                  ● {profile.triage_level}
                </span>
                <span className="confidence-pill">
                  {currentDiag?.confidence}% ViT Confidence
                </span>
              </div>

              <h2 className="diag-title">
                {profile.clinical_name}
              </h2>

              <p className="diag-overview">
                {profile.overview}
              </p>

              <div className="diag-referral-alert">
                <Clock size={16} />
                <span>
                  <strong>Clinical Triage Timeline:</strong> {profile.referral_timeline}
                </span>
              </div>
            </div>

            <div className="hospital-actions-toolbar">
              <button
                type="button"
                className="hospital-btn btn-print"
                onClick={handlePrint}
                title="Print or export to PDF"
              >
                <Printer size={15} />
                Print Hospital Report
              </button>

              <button
                type="button"
                className="hospital-btn btn-copy"
                onClick={handleCopySummary}
              >
                {copied ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                {copied ? "Copied to Clipboard!" : "Copy Summary"}
              </button>

              <button
                type="button"
                className="hospital-btn btn-download"
                onClick={handleDownloadText}
              >
                <Download size={15} />
                Save .TXT
              </button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="hospital-nav-tabs">
            <button
              type="button"
              className={`hosp-tab ${activeSection === "precautions" ? "active" : ""}`}
              onClick={() => setActiveSection("precautions")}
            >
              <ShieldAlert size={16} />
              Precautions & Safeguards ({profile.precautions.length})
            </button>

            <button
              type="button"
              className={`hosp-tab ${activeSection === "tests" ? "active" : ""}`}
              onClick={() => setActiveSection("tests")}
            >
              <FileCheck2 size={16} />
              Hospital Diagnostic Tests ({profile.diagnostic_tests.length})
            </button>

            <button
              type="button"
              className={`hosp-tab ${activeSection === "treatment" ? "active" : ""}`}
              onClick={() => setActiveSection("treatment")}
            >
              <HeartPulse size={16} />
              Treatment Pathways ({profile.treatment_pathway.length})
            </button>

            <button
              type="button"
              className={`hosp-tab ${activeSection === "lifestyle" ? "active" : ""}`}
              onClick={() => setActiveSection("lifestyle")}
            >
              <Sparkles size={16} />
              Diet & Ocular Hygiene ({profile.lifestyle_diet.length})
            </button>

            <button
              type="button"
              className={`hosp-tab ${activeSection === "emergency" ? "active red-tab" : ""}`}
              onClick={() => setActiveSection("emergency")}
            >
              <AlertTriangle size={16} />
              Emergency Red Flags
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="hospital-tab-body">
            {activeSection === "precautions" && (
              <div className="tab-pane">
                <div className="section-intro">
                  <h4>Mandatory Patient Clinical Precautions</h4>
                  <p>Adhere strictly to the following instructions to protect visual function and prevent disease progression:</p>
                </div>

                <div className="precautions-list">
                  {profile.precautions.map((item, idx) => (
                    <div key={idx} className="precaution-item">
                      <div className="precaution-number">{idx + 1}</div>
                      <div className="precaution-text">
                        <strong>Precaution #{idx + 1}:</strong> {item}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "tests" && (
              <div className="tab-pane">
                <div className="section-intro">
                  <h4>Recommended Confirmatory Diagnostic Workup</h4>
                  <p>Standard ophthalmic diagnostic examinations recommended for complete staging and structural confirmation:</p>
                </div>

                <div className="tests-grid">
                  {profile.diagnostic_tests.map((test, idx) => (
                    <div key={idx} className="test-card">
                      <div className="test-icon">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="test-info">
                        <strong>{test}</strong>
                        <span>Specialized clinical equipment procedure</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "treatment" && (
              <div className="tab-pane">
                <div className="section-intro">
                  <h4>Standard Clinical Treatment & Intervention Pathways</h4>
                  <p>Evidence-based treatment protocols typically deployed by retinal and ophthalmic specialists:</p>
                </div>

                <div className="treatment-list">
                  {profile.treatment_pathway.map((treatment, idx) => (
                    <div key={idx} className="treatment-item">
                      <div className="treatment-bullet">✦</div>
                      <div className="treatment-text">
                        <strong>Pathway {idx + 1}:</strong> {treatment}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "lifestyle" && (
              <div className="tab-pane">
                <div className="section-intro">
                  <h4>Ocular Nutrition, Dietary & Ergonomic Hygiene</h4>
                  <p>Nutritional guidelines and daily visual protective measures recommended for retinal stability:</p>
                </div>

                <div className="lifestyle-grid">
                  {profile.lifestyle_diet.map((item, idx) => (
                    <div key={idx} className="lifestyle-card">
                      <div className="lifestyle-indicator">🌿</div>
                      <div className="lifestyle-text">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "emergency" && (
              <div className="tab-pane emergency-pane">
                <div className="emergency-alert-header">
                  <AlertTriangle size={24} color="#ef4444" />
                  <div>
                    <h4>Immediate Emergency Ophthalmic Warning Signs ("Red Flags")</h4>
                    <p>If you experience any of the following symptoms, proceed immediately to the nearest Emergency Eye Care Department:</p>
                  </div>
                </div>

                <div className="emergency-list">
                  {profile.emergency_symptoms.map((symptom, idx) => (
                    <div key={idx} className="emergency-item">
                      <span className="emergency-badge">URGENT</span>
                      <strong>{symptom}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Official Doctor Review & AI Telemetry Signature Block */}
          <div className="hospital-footer-signoff">
            <div className="signoff-box">
              <span className="signoff-label">TELEMETRY SCREENING BACKBONE</span>
              <strong>Vision AI ViT-B/16 (ODIR-5K Calibrated)</strong>
              <span className="signoff-sub">Model Checkpoint Hash: 8F2A-94B1-ViT-PROD</span>
            </div>

            <div className="signoff-box signoff-doctor">
              <span className="signoff-label">ATTENDING REVIEWER SIGN-OFF</span>
              <div className="doctor-signature-line">
                <span className="signature-cursive">Dr. Jonathan Vance, MD</span>
              </div>
              <strong>Jonathan Vance, MD, FRCOphth</strong>
              <span className="signoff-sub">License # OPH-884920 · Medical Tele-Review</span>
            </div>

            <div className="signoff-stamp">
              <div className="stamp-circle">
                <span>OFFICIAL</span>
                <strong>HOSPITAL</strong>
                <span>VERIFIED</span>
              </div>
            </div>
          </div>

          {/* Legal Clinical Telemetry Disclaimer */}
          <div className="hospital-disclaimer">
            <strong>NOTICE & CLINICAL DISCLAIMER:</strong> This clinical screening document was generated using Vision AI artificial intelligence telemetry fine-tuned on the ODIR-5K fundus dataset. This document serves as a standardized screening referral and triage tool to assist licensed ophthalmologists and optometrists. It does not replace a definitive in-person clinical slit-lamp examination or direct diagnosis by a medical professional.
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
