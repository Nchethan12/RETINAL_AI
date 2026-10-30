# Vision AI — Intelligent Retinal & Anterior Ophthalmic Screening Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-6.x-092e20.svg)](https://www.djangoproject.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C.svg)](https://pytorch.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black.svg)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Classification](https://img.shields.io/badge/SaMD-Class%20IIa%20Concept-amber.svg)](prd.md)

Vision AI is an intelligent, dual-modality clinical decision support platform designed to democratize clinical-grade eye examinations. It unites **Vision Transformers (ViT-B/16)** on posterior retinal fundus photography with **real-time computer vision biometrics & deep residual networks (ResNet-50)** on consumer smartphone and webcam eye selfies.

---

## 📑 Complete Documentation Suite

For comprehensive specifications, design tokens, and engineering standards, refer to our core documentation:

| Document | Description |
| :--- | :--- |
| 📋 **[PRD (Product Requirements Document)](prd.md)** | Clinical problem statement, user personas, disease taxonomy, functional specs, and API contracts. |
| 🏛️ **[System Architecture Document](architecture.md)** | Multi-tier topology, ViT & ResNet specs, optical gatekeepers, and sequence diagrams. |
| 📏 **[Engineering Rules & Guidelines](rules.md)** | What to use vs. what to avoid across libraries, error handling, boundaries, and zero-persistent PHI. |
| 🗺️ **[Phases & Development Roadmap](phases.md)** | Chronological milestones (Phase 0 to 4), quality gates, risk matrix, and RACI governance. |
| 🎨 **[UI/UX Design System Specification](design.md)** | Bio-Digital clinical aesthetic, color tokens, typography, 3D WebGL anatomy, and print styles. |
| 🧠 **[Project Memory & Knowledge Base](memory.md)** | Architectural Decision Records (ADRs), codebase inventory, runbooks, and invariants. |

---

## 🌟 Key Capabilities

### 👁️ Mode A: Posterior Retinal Fundus Screening
- **Vision Transformer Backbone:** ViT-B/16 fine-tuned on the multi-center **ODIR-5K** dataset (5,000 patient examinations).
- **8 ODIR-5K Diagnostic Classes:**
  - `Normal (N)` [`ICD-10: Z01.00`]
  - `Diabetic Retinopathy (D)` [`ICD-10: E11.319 / H36.0`]
  - `Glaucoma (G)` [`ICD-10: H40.9`]
  - `Cataract (C)` [`ICD-10: H25.9`]
  - `Age-Related Macular Degeneration (AMD) (A)` [`ICD-10: H35.30`]
  - `Hypertension (H)` [`ICD-10: H35.0`]
  - `Pathological Myopia (M)` [`ICD-10: H44.2`]
  - `Other Abnormalities (O)` [`ICD-10: H35.9`]
- **Bilateral Eye Analysis:** Ingests Left Eye (OS), Right Eye (OD), or both simultaneously, synthesizing patient-level maximum risk scores and flagging bilateral asymmetry.
- **Dual-Tier Optical Gatekeeper:** Canvas-based client pre-filter and server-side optical barrel aperture, luminance range, and hemoglobin chromaticity filters ($\frac{R}{B} \ge 1.15$) that reject non-fundus selfies with $>99.5\%$ precision.
- **ROC-Calibrated Operating Thresholds:** Overcomes extreme dataset class imbalance by replacing generic $0.50$ cutoffs with clinical sensitivity-tuned thresholds.

### 📷 Mode B: Anterior Eye Selfie Screening
- **Real-Time WebRTC Camera Stream:** Front and rear camera support with an ocular targeting HUD reticle.
- **Automated Eyeball Localization:** Intelligent horizontal ocular band slicing ($18\% - 65\%$ height) and minimum luminance iris/pupil coordinate argmin extraction.
- **Computer Vision Biometric Telemetry:**
  - *Scleral Redness Ratio:* Detects conjunctival hyperemia (Pink Eye / Conjunctivitis).
  - *Bilirubin Yellow Index:* Colorimetric detection of scleral icterus (early systemic jaundice).
  - *Focal Blood Density:* Identifies subconjunctival capillary hemorrhages.
  - *Pupillary Luminance:* Flags leukocoria and mature cataracts.
  - *Eyelid Erythema:* Identifies marginal styes (hordeolum / chalazion).
- **14-Class Anterior Deep Learning Classifier:** ResNet-50 backbone trained on slit-lamp anterior segment corpora.

### 🏥 Hospital-Grade Clinical Reporting & Triage
- **Standardized ICD-10 Coding:** Automatic assignment of official diagnostic billing codes.
- **Triage Priority Stratification:** Instant classification into *Urgent Specialist Referral* (7–14 days), *Urgent Triage* (24–48 hours), *Elective Consultation*, or *Routine Annual Maintenance*.
- **Comprehensive Care Plans:** Actionable precautions (dos & don'ts), recommended diagnostic workups (SD-OCT, FFA, Tonometry, Visual Field), treatment pathways (Anti-VEGF, SLT/MIGS, Phacoemulsification), lifestyle/dietary guidance, and red-flag emergency symptoms.
- **Physical Print Optimization (`@media print`):** One-click export to a clean, monochrome hospital letterhead PDF with doctor signature lines.

### 🔮 Immersive 3D WebGL Visualization
- **Interactive 3D Holographic Eyeball:** Procedural WebGL Three.js eye anatomy with dynamic pupil dilation, refractive corneal dome ($\text{IOR} = 1.336$), concentric iris stroma, and mouse parallax.
- **Neural Particle Retinal Mesh:** Ambient 3D particle constellation simulating interconnected retinal nerve fibers.
- **Dynamic Micro-Interactions:** Mouse spotlight flashlight (`CursorGlow`), 3D parallax tilt cards (`TiltCard`), and celebratory confetti for healthy examinations.

---

## 🏛️ System Architecture

```mermaid
graph TB
    subgraph Client["Frontend Client (React 19 + Vite)"]
        UI[Medical Triage Dashboard]
        ThreeJS[Three.js 3D Holographic Eye & Retinal Mesh]
        WebcamModule[WebRTC Camera & Ocular Reticle]
        ClientGatekeeper[Canvas Optical Gatekeeper]
        HospitalReportView[Hospital Report Generator & Print Engine]
    end

    subgraph API["Backend Gateway (Django 6)"]
        Router[urls.py Dispatcher]
        FundusFilter[Optical & Chromaticity Gatekeeper]
        FaceCropper[Bilateral Eyeball Localization Engine]
        TelemetryEngine[CV Biometric Telemetry Pipeline]
        Calibrator[Clinical Threshold & Decision Engine]
        KnowledgeBase[ICD-10 & Clinical Disease Registry]
    end

    subgraph Models["Deep Learning Runtime (PyTorch)"]
        ViTModel[Vision Transformer ViT-B/16 (Retinal Head)]
        ResNetModel[ResNet-50 (14-Class Anterior Head)]
    end

    ClientGatekeeper -->|Sanitized Fundus Upload| Router
    WebcamModule -->|Selfie / Cropped Eyes| Router

    Router -->|POST /analyze/| FundusFilter
    FundusFilter -->|Validated 224x224 Fundus| ViTModel
    ViTModel -->|Logits -> Sigmoid Probs| Calibrator

    Router -->|POST /analyze-selfie/| FaceCropper
    FaceCropper --> TelemetryEngine
    TelemetryEngine --> ResNetModel

    Calibrator --> KnowledgeBase
    KnowledgeBase --> Router
    Router -->|Structured Diagnostic JSON| UI
    UI --> HospitalReportView
```

---

## 🔬 Calibrated Clinical Operating Thresholds

Due to prevalence imbalance in clinical populations, Vision AI uses sensitivity-optimized operating cutoffs:

| Condition | Class Code | ICD-10 Code | Threshold ($\tau$) | Target Sensitivity | Clinical Action Level |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Normal** | `N` | `Z01.00` | **0.55** | $>90\%$ | Routine annual screening in 12 months |
| **Diabetic Retinopathy** | `D` | `E11.319 / H36.0` | **0.18** | $>94\%$ | Urgent retinal consultation within 7–14 days |
| **Glaucoma** | `G` | `H40.9` | **0.045** | $>92\%$ | Urgent tonometry & Humphrey Visual Field (HVF) |
| **Cataract** | `C` | `H25.9` | **0.50** | $>95\%$ | Slit-lamp biomicroscopy & visual acuity refraction |
| **AMD** | `A` | `H35.30` | **0.08** | $>91\%$ | SD-OCT macula scan & Amsler grid monitoring |
| **Hypertension** | `H` | `H35.0` | **0.06** | $>90\%$ | Blood pressure panel & arteriolar evaluation |
| **Pathological Myopia** | `M` | `H44.2` | **0.15** | $>92\%$ | Peripheral retinal exam for tears / staphyloma |
| **Other Conditions** | `O` | `H35.9` | **0.08** | $>88\%$ | Comprehensive vitreoretinal specialist evaluation |

---

## 📁 Repository Structure

```
retinal-ai-vit/
├── prd.md                                # Product Requirements Document
├── architecture.md                       # System Architecture Document
├── rules.md                              # Engineering Rules & Safety Invariants
├── phases.md                             # Project Roadmap & Phase Gates
├── design.md                             # UI/UX Design System Specification
├── memory.md                             # System Memory & ADRs
├── README.md                             # Repository Overview (This File)
│
├── backend/                              # Django 6 API & PyTorch Inference
│   ├── manage.py                         # Django CLI management script
│   ├── api/                              # REST API Configuration
│   │   ├── settings.py                   # App configuration, CORS headers
│   │   ├── urls.py                       # REST routes (/analyze/, /analyze-selfie/)
│   │   └── views.py                      # Validation, CV biometrics, diagnostic logic
│   └── ml/                               # Deep Learning Subsystems
│       ├── model.py                      # VisionAIModel (ViT-B/16 architecture)
│       ├── dataset.py                    # ODIRDataset loader & augmentations
│       ├── train.py                      # ViT training script with AdamW & BCE
│       ├── test_dataloader.py            # Unit test for data pipelines
│       ├── test_training_step.py         # Unit test for forward/backward pass
│       ├── weights/                      # Trained ViT model checkpoint
│       └── selfie/                       # Mode B Anterior Subsystem
│           ├── model.py                  # AnteriorEyeModel (ResNet-50)
│           ├── dataset.py                # AnteriorEyeDataset loader (14 classes)
│           ├── train.py                  # Anterior training pipeline
│           └── weights/                  # Trained ResNet-50 weights
│
├── frontend/                             # React 19 + Vite Frontend SPA
│   ├── package.json                      # Dependencies (Three.js, Lucide, Confetti)
│   ├── vite.config.js                    # Vite bundler configuration
│   └── src/
│       ├── App.jsx                       # Root UI coordinator, gatekeeper, dashboard
│       ├── App.css                       # Design system, glassmorphism, print styles
│       └── components/
│           ├── AnteriorSelfiePage.jsx    # Mode B WebRTC camera, HUD reticle, telemetry
│           ├── HospitalReport.jsx        # Hospital clinical report, ICD-10, print PDF
│           ├── HolographicEye3D.jsx      # Procedural WebGL 3D holographic eye anatomy
│           ├── RetinalBackground3D.jsx   # 3D particle neural-retinal background
│           ├── FeatureDetailModal.jsx    # Educational disease deep-dive modal
│           ├── TiltCard.jsx              # 3D perspective mouse-tilt card wrapper
│           └── CursorGlow.jsx            # Ambient mouse spotlight follower
│
└── dataset/                              # Datasets & Metadata
    ├── ODIR-5K/                          # 5,000-patient fundus examination corpus
    ├── anterior-eye/                     # External eye slit-lamp corpus
    └── preprocessed_images/              # Normalized 224x224 cache
```

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Python:** Version `3.10` or higher
- **Node.js:** Version `18.x` or higher (Node 20+ recommended)
- **Package Managers:** `pip` and `npm`

---

### 1. Backend Setup (Django + PyTorch)

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install django torch torchvision pillow numpy pandas

# 4. Verify data loaders and training step integrity
python ml/test_dataloader.py
python ml/test_training_step.py

# 5. Start the Django API server
python manage.py runserver
```
The backend API server will be available at: **`http://localhost:8000`**

---

### 2. Frontend Setup (React 19 + Vite + Three.js)

```bash
# 1. In a new terminal, navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
The frontend web application will launch at: **`http://localhost:5173`**

---

## 📡 API Reference

### 1. Retinal Fundus Screening (`POST /analyze/`)
Analyzes one or both retinal fundus photographs.

```bash
curl -X POST http://localhost:8000/analyze/ \
  -F "left_image=@path/to/left_eye.jpg" \
  -F "right_image=@path/to/right_eye.jpg"
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "mode": "bilateral",
  "diagnosis": {
    "status": "disease_detected",
    "primary_disease": "Diabetic Retinopathy",
    "verdict_title": "Bilateral Diabetic Retinopathy Detected",
    "confidence": 94.2,
    "severity": "High Risk / Acute Finding",
    "badge_type": "high",
    "recommendation": "Retinal microvascular lesion patterns detected. Dilated retinal examination recommended.",
    "clinical_report": {
      "icd10_code": "E11.319 / H36.0",
      "clinical_name": "Diabetic Retinopathy (Microvascular Retinal Pathology)",
      "triage_level": "Urgent Specialist Referral",
      "referral_timeline": "Comprehensive retinal consultation within 7 to 14 days"
    },
    "calibrated_risks": {
      "Normal": 14.2,
      "Diabetic Retinopathy": 94.2,
      "Glaucoma": 12.0,
      "Cataract": 5.1
    }
  }
}
```

### 2. Anterior Eye Selfie Screening (`POST /analyze-selfie/`)
Analyzes an external eye selfie or face photograph for surface ocular conditions.

```bash
curl -X POST http://localhost:8000/analyze-selfie/ \
  -F "image=@path/to/eye_selfie.jpg"
```

### 3. Reference Sample Cases (`GET /sample-cases/`)
Retrieves verified reference fundus cases from ODIR-5K for instant clinical demonstration.

```bash
curl http://localhost:8000/sample-cases/
```

---

## 🔒 Privacy, Security & Zero-Persistent PHI

- **Volatile In-Memory Execution:** All uploaded patient fundus images and selfie frames are decoded directly in volatile RAM (`io.BytesIO` / `PIL.Image`) and immediately garbage-collected after inference.
- **Zero Disk Persistence:** No patient images or Protected Health Information (PHI) are written to temporary disk folders (`/tmp`), cloud storage, or the local SQLite database.
- **Encryption:** All communications in production are protected via TLS 1.3 encryption.

---

## ⚖️ Clinical & Regulatory Disclaimer

> [!IMPORTANT]
> **Vision AI is an adjunctive clinical screening decision support tool (SaMD Class IIa Concept).**
> It is designed to assist qualified healthcare professionals and is **not** a replacement for definitive clinical diagnosis, slit-lamp biomicroscopy, or dilated fundus evaluation by a licensed ophthalmologist or optometrist.

---

## 📄 License & Acknowledgments

- **License:** Released under the [MIT License](LICENSE).
- **Datasets:** Gratefully acknowledges the **ODIR-5K** multi-center retinal dataset provided by Peking University International Healthcare.
- **Models:** Built upon PyTorch's pre-trained Vision Transformer (`vit_b_16`) and ResNet architectures.
