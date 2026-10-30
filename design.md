# UI/UX Design System Specification

## Project: Vision AI — Intelligent Retinal & Anterior Ophthalmic Screening Platform
**Document Version:** 1.0.0  
**Status:** Approved Design Specification  
**Design Lead:** Vision AI Product Design & Clinical UI Team  
**Scope:** Design System Tokens, UI Components, 3D WebGL Visualization, and Print Specifications  
**Repository:** `retinal-ai-vit` (`Nchethan12/Vision_AI`)  

---

## 1. Design Philosophy: The Bio-Digital Clinical Aesthetic

Vision AI is built upon the **Bio-Digital Clinical Aesthetic** — a visual language that fuses the rigorous precision of surgical ophthalmic instruments with modern, glassmorphic digital interfaces.

```
+-------------------------------------------------------------------------+
| DESIGN PILLARS                                                          |
|                                                                         |
| 1. CLINICAL AUTHORITY & TRUST                                           |
|    Muted, ultra-deep dark canvases (#07111f) prevent glare in dimly    |
|    lit ophthalmic examination rooms while elevating visual hierarchy.   |
|                                                                         |
| 2. IMMEDIATE COGNITIVE SCANNABILITY                                     |
|    Multi-cue color coding (icon + color + label) ensures physicians    |
|    can triage findings (Urgent vs. Routine) within 200 milliseconds.    |
|                                                                         |
| 3. MULTI-LAYERED GLASSMORPHISM                                          |
|    Translucent card surfaces (backdrop-filter: blur(18px)) create       |
|    depth above the persistent 3D neural-retinal particle canvas.        |
|                                                                         |
| 4. DUAL-CONTEXT ERGONOMICS                                              |
|    High-contrast luminous dark mode for interactive digital use,        |
|    paired with a seamless print stylesheet for paper hospital records.  |
+-------------------------------------------------------------------------+
```

---

## 2. Design Tokens & Color Palette

### 2.1 Surface & Background Tokens
The application canvas uses deep marine and obsidian tones tailored to mimic specialized medical workstation monitors.

| Token / Role | Hex / RGBA Value | Visual Meaning & Usage |
| :--- | :--- | :--- |
| **`--bg-canvas`** | `#07111f` | Primary viewport background; mimics pupil depth and dark examination rooms. |
| **`--bg-surface-elevated`** | `rgba(13, 27, 49, 0.78)` | Primary card surfaces; glassmorphic container with 18px backdrop blur. |
| **`--bg-surface-hover`** | `rgba(20, 39, 70, 0.88)` | Interactive hover state for cards, dropdowns, and button containers. |
| **`--border-subtle`** | `rgba(255, 255, 255, 0.08)` | Default structural borders, dividers, and card outlines. |
| **`--border-glow`** | `rgba(56, 189, 248, 0.28)` | Accent border for active inputs, focused cards, and targeting reticles. |

---

### 2.2 Semantic Clinical Status Palette
Every diagnostic outcome is paired with an accessible, high-contrast status color:

```
[ Acute / High Risk ]     [ Warning / Borderline ]    [ Healthy / Normal ]
      #f43f5e                    #fbbf24                    #34d399
  (Crimson Rose)              (Amber Gold)              (Emerald Green)
   DR / Glaucoma / AMD        Inflammatory / Stye       Physiologically Intact
```

| Clinical Status | Accent Color | Subtle Background Tint | Associated Conditions & Urgency |
| :--- | :--- | :--- | :--- |
| **Acute / High Risk** | `#f43f5e` (Rose) | `rgba(244, 63, 94, 0.12)` | Proliferative DR, Pathological Glaucoma, Wet AMD, Severe Leukocoria. |
| **Urgent Diagnostic** | `#fb7185` (Coral) | `rgba(251, 113, 133, 0.12)` | Subconjunctival Hemorrhage, Neovascularization, Retinal Occlusion. |
| **Warning / Elevated** | `#fbbf24` (Amber) | `rgba(251, 191, 36, 0.12)` | Early Non-Proliferative DR, Conjunctivitis, Styes, Hypertensive changes. |
| **Systemic / Jaundice** | `#facc15` (Solar) | `rgba(250, 204, 21, 0.14)` | Scleral Icterus (Hepatic/Biliary hyperbilirubinemia). |
| **Healthy / Normal** | `#34d399` (Emerald) | `rgba(52, 211, 153, 0.12)` | Physiologically intact fundus or healthy anterior ocular surface. |
| **Optical / Primary** | `#38bdf8` (Cyan) | `rgba(56, 189, 248, 0.12)` | System controls, primary CTA buttons, optical reticles, Pterygium. |
| **Neural / AI Engine** | `#818cf8` (Indigo) | `rgba(129, 140, 248, 0.12)` | Vision Transformer telemetry, [CLS] attention indicators, WebGL accents. |

---

### 2.3 Typography System

#### Typeface Hierarchy
- **Primary Interface Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`. Selected for neutral clinical clarity, tall x-height, and legible numerical glyphs.
- **Clinical Telemetry & Monospace Font:** `ui-monospace`, `SFMono-Regular`, `Consolas`, `monospace`. Reserved for Examination IDs (`EXAM-VA-XXXXXX`), ICD-10 diagnostic codes, risk percentages, and optical coordinates.

#### Typographic Scale

| Style Level | Font Size | Font Weight | Line Height | Usage |
| :--- | :--- | :---: | :---: | :--- |
| **Display Title** | `3.25rem` ($52\text{px}$) | `800` (Extrabold) | `1.1` | Hero landing banner headline |
| **H1 Heading** | `2.25rem` ($36\text{px}$) | `700` (Bold) | `1.2` | Diagnostic verdict header, major section titles |
| **H2 Subheading** | `1.50rem` ($24\text{px}$) | `600` (Semibold) | `1.3` | Card headers, modal titles, bilateral subheadings |
| **H3 Section Header** | `1.125rem` ($18\text{px}$) | `600` (Semibold) | `1.4` | Hospital report section titles, clinical precaution tabs |
| **Body Primary** | `0.95rem` ($15.2\text{px}$) | `400` (Regular) | `1.6` | Clinical overview text, treatment instructions |
| **Body Small** | `0.85rem` ($13.6\text{px}$) | `400` / `500` | `1.5` | Helper captions, file upload notes, timestamps |
| **Clinical Monospace**| `0.875rem` ($14\text{px}$) | `600` (Semibold) | `1.4` | ICD-10 tags, biometric telemetry ratios, risk bars |

---

## 3. Spatial System, Grid & Layout

### 3.1 Base Spacing & Rhythm
Vision AI strictly adheres to an **8-pixel spatial baseline rhythm**:

| Unit | Size | Typical Usage |
| :---: | :---: | :--- |
| `0.5x` | `4px` | Badge internal padding, border radiuses for tiny pills |
| `1x` | `8px` | Icon-to-text spacing, tight grid gaps |
| `2x` | `16px` | Standard button padding, list item separations |
| `3x` | `24px` | Card internal padding, section margins |
| `4x` | `32px` | Major dashboard card padding, grid gutter gaps |
| `6x` | `48px` | Outer section vertical separation |
| `8x` | `64px` | Hero section padding, modal container borders |

### 3.2 Responsive Viewport Breakpoints

```
[ Mobile Viewport ]        [ Tablet Viewport ]               [ Desktop Workstation ]
  320px - 640px              641px - 1024px                       > 1024px
  Single column,             2-column grid,                       Full 3D holographic hero,
  docked bottom actions      collapsible bilateral comparison     side-by-side bilateral inspection
```

- **Desktop Workstation ($>1024\text{px}$):** Max content width capped at `1200px` (`width: min(1200px, calc(100% - 40px))`) with centered auto-margins.
- **Tablet ($641\text{px} - 1024\text{px}$):** Responsive 2-column layout for bilateral comparison; 3D holographic eye scales proportionally.
- **Mobile ($320\text{px} - 640\text{px}$):** Stacks bilateral eyes into tabbed segmented controllers; full-width action buttons; hides non-essential 3D particle nodes to preserve GPU battery.

---

## 4. Component Design Specifications

### 4.1 Navigation Bar (`.navbar`)
- **Visual Design:** Sticky header (`position: sticky; top: 0; z-index: 100`) with glassmorphic blur (`backdrop-filter: blur(18px); background: rgba(7, 17, 31, 0.9)`).
- **Brand Mark:** Rounded square emblem (`.brand-logo`) in gradient cyan-to-emerald with bold monogram `VA`.
- **Mode Switcher Pill:** Segmented toggle button with subtle background slide animation allowing instant switching between:
  - 👁️ **Mode A: Retinal Fundus Screening**
  - 📷 **Mode B: Anterior Eye Selfie**
- **Demo Quick-Load Action:** One-click sample trigger button for immediate clinician demonstration.

---

### 4.2 Hero Section & 3D WebGL Anatomy

```
+--------------------------------------------------------------------------+
|  HERO BANNER LAYOUT                                                      |
|                                                                          |
|  [ Left Column: Clinical Value ]       [ Right Column: 3D WebGL ]        |
|  * AI Status Badge (Pulsing Green)                                       |
|  * Display Headline: Vision AI          +------------------------------+ |
|    Intelligent Retinal Screening        |                              | |
|  * Sub-headline with ViT-B/16 specs     |   Interactive Three.js 3D    | |
|  * CTA Button: "Begin Examination"      |   Holographic Eyeball Model  | |
|  * Quick Stats: 8 Diseases | <800ms     |   (Responds to Mouse Lerp)   | |
|                                         +------------------------------+ |
+--------------------------------------------------------------------------+
```

- **Interactive 3D Hologram (`HolographicEye3D.jsx`):**
  - High-refraction corneal dome ($\text{IOR} = 1.336$, transmission $0.95$).
  - Concentric procedural iris stroma with pupil dilation responsive to ambient cursor distance.
  - Subsurface scattering on scleral sphere with delicate episcleral microvascular bump maps.
  - Smooth cursor-tracking parallax using dynamic linear interpolation (`lerp`).

---

### 4.3 Dual-Eye Upload Zone & Selector (`.upload-section`)
- **Modality Selector Tabs:** Segmented tab control allowing clinicians to choose:
  - `Bilateral (Both Eyes - OS & OD)` (Default clinical protocol)
  - `Left Eye Only (OS - Oculus Sinister)`
  - `Right Eye Only (OD - Oculus Dexter)`
  - `Single Image / Quick Check`
- **Dropzone States:**
  - *Default:* Glassmorphic card with dashed subtle border (`rgba(56, 189, 248, 0.2)`).
  - *Drag-Over / Active:* Outer neon cyan glow (`box-shadow: 0 0 24px rgba(56, 189, 248, 0.35)`), border color `#38bdf8`, scale transformation `1.01`.
  - *File Selected:* Thumbnail preview with subtle circular aperture mask, file name, byte size, and removal icon.
- **Client Gatekeeper Warning Banner:** If a user drops a face selfie or room photo, an animated rose alert banner slides into view detailing:
  > *"Left Eye (OS) Rejected: Non-fundus photograph detected. Vision AI requires a circular retinal scan taken through a fundus camera."*

---

### 4.4 Diagnostic Results Dashboard

```
+--------------------------------------------------------------------------+
| DIAGNOSTIC VERDICT CARD                                                  |
| +----------------------------------------------------------------------+ |
| | [Severity Badge: HIGH RISK]               Confidence Score: 94.2%   | |
| | Bilateral Diabetic Retinopathy Detected                              | |
| | Urgent retinal consultation within 7 to 14 days recommended.          | |
| |                                                                      | |
| | [ View Hospital Report ]   [ Print Medical PDF ]   [ XAI Heatmap ]   | |
| +----------------------------------------------------------------------+ |
|                                                                          |
| BILATERAL COMPARISON GRID                                                |
| +----------------------------------+ +---------------------------------+ |
| | Left Eye (OS - Oculus Sinister)  | | Right Eye (OD - Oculus Dexter)  | |
| | Fundus Thumbnail + Aperture Ring | | Fundus Thumbnail + Aperture Ring| |
| | Primary: Diabetic Retinopathy    | | Primary: Normal Retinal Fundus  | |
| | Risk Score: 94.2% (High Risk)    | | Risk Score: 14.2% (Healthy)     | |
| +----------------------------------+ +---------------------------------+ |
|                                                                          |
| QUANTITATIVE RISK SPECTRUM (Horizontal Threshold Visualizer)             |
| Normal        [=============================             ] 58% (Healthy)|
| Diabetic Ret. [========================================! ] 94% (BREACH) |
| Glaucoma      [===                                       ]  8% (Safe)   |
| Cataract      [==                                        ]  5% (Safe)   |
+--------------------------------------------------------------------------+
```

- **Verdict Banner:** Bold, color-coded header with luminous ambient glow corresponding to the triage severity badge (Rose for High Risk, Amber for Warning, Emerald for Normal).
- **Horizontal Risk Spectrum Visualizer:**
  - Displays calibrated $0-100\%$ risk bars for all 8 categories.
  - A vertical dashed indicator line marks the calibrated screening threshold.
  - Disease bars that breach threshold trigger an animated pulse and warning icon.

---

### 4.5 Mode B: Anterior Eye Selfie Interface (`AnteriorSelfiePage.jsx`)
- **Live Viewfinder HUD:** Real-time WebRTC camera feed framed with a cyan medical reticle HUD.
- **Ocular Alignment Guides:** Dashed elliptical markers guiding the patient to center both eyes within the optimal focal plane.
- **Extracted Eyeball Preview Strip:** Dual cropped previews showing the extracted Right Eyeball (OD) and Left Eyeball (OS) returned by the localization engine.
- **Biometric Telemetry Dials:**
  - *Scleral Redness Ratio:* Radial circular gauge with colored zones (Green $<0.50$, Amber $0.50-0.72$, Red $>0.72$).
  - *Bilirubin Yellow Index:* Colorimetric bar showing scleral yellowness for jaundice screening.
  - *Focal Blood Density:* Percentage meter detecting subconjunctival capillary pools.

---

### 4.6 Hospital-Grade Clinical Report (`HospitalReport.jsx`)

#### Digital View
- Encapsulated within a dedicated elevated card or fullscreen modal.
- Includes examination barcode / serial number, patient metadata, and official ICD-10 diagnostic pill.
- Collapsible accordions for clinical sections:
  1. *Clinical Overview & Pathological Explanation*
  2. *Immediate Precautions (Dos & Don'ts)*
  3. *Recommended Diagnostic Workup Tests*
  4. *Evidence-Based Treatment Pathways*
  5. *Lifestyle & Nutritional Recommendations*
  6. *Emergency Red Flag Symptoms*

#### Physical Print View (`@media print`)
When a clinician prints the report or clicks **Print Medical PDF**, the design transforms completely:
- **Canvas Wipe:** Screen background turns pure `#ffffff`; text turns crisp `#000000`.
- **UI Elimination:** All website navigation, 3D canvases, upload buttons, tabs, and interactive buttons are hidden via `display: none !important`.
- **Hospital Letterhead Layout:** Features an official hospital header, patient demographic box, structured 2-column tables, clean grayscale borders, and a formal **Reviewing Ophthalmologist Signature Line**.

```
+--------------------------------------------------------------------------+
| HOSPITAL OPHTHALMIC CLINICAL SCREENING REPORT                            |
| Vision AI Clinical Decision Support System                               |
|--------------------------------------------------------------------------|
| Exam ID: EXAM-VA-849201       Date: 2026-09-13     Modality: Bilateral   |
| Patient Ref: OUTPATIENT-4092  Status: REVIEW COMPLETED                   |
|--------------------------------------------------------------------------|
| PRIMARY CLINICAL FINDING:                                                |
| Diabetic Retinopathy (Microvascular Retinal Pathology)                   |
| ICD-10 Code: E11.319 / H36.0           Triage Level: Urgent Specialist    |
| Referral Timeline: Consultation required within 7 to 14 days             |
|                                                                          |
| RECOMMENDED WORKUP:                                                      |
| [ ] Spectral-Domain OCT (SD-OCT)       [ ] Fundus Fluorescein Angio (FFA)|
| [ ] Slit-Lamp Biomicroscopy (90D)      [ ] Glycated Hemoglobin (HbA1c)   |
|                                                                          |
| CLINICAL CARE PLAN & PRECAUTIONS:                                        |
| 1. Strict glycemic control (target HbA1c < 7.0%).                       |
| 2. Avoid heavy Valsalva maneuvers (lifting / breath-holding).            |
| 3. Schedule dilated ophthalmic exam for neovascularization staging.      |
|                                                                          |
| Reviewing Clinician: _______________________   Signature: ______________ |
+--------------------------------------------------------------------------+
```

---

## 5. Motion, Physics & Micro-Interactions

### 5.1 Animation Timing & Easing Curves
All animations utilize smooth cubic-bezier physics to feel weighted and professional:
- **Standard Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard for card reveals and accordions).
- **Parallax Tilt Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (Snappy response with soft deceleration).
- **Fast Transition:** `150ms` (Button active states, badge color shifts).
- **Normal Transition:** `300ms` (Modal entries, tab indicator sliding, drawer expansion).
- **Slow Ambient Transition:** `800ms - 2400ms` (3D particle drift, cursor flashlight glow lag).

### 5.2 3D Tilt Card Physics (`TiltCard.jsx`)
Cards wrapped in `TiltCard` calculate cursor offsets relative to the element's center:
$$\text{RotateX} = -\left(\frac{y - y_0}{H}\right) \cdot \text{MaxTilt}, \quad \text{RotateY} = \left(\frac{x - x_0}{W}\right) \cdot \text{MaxTilt}$$
Where $\text{MaxTilt} = 8^\circ$. A radial reflection gradient shines across the glassmorphic surface in the direction of the light source.

### 5.3 Celebratory Physics (`canvas-confetti`)
When the diagnosis returns **Normal Retinal Fundus (Healthy)**, a dual-cannon confetti spray fires from bottom-left and bottom-right corners with emerald, cyan, and gold particles to provide positive reinforcement to the patient.

---

## 6. Accessibility (a11y) & Clinical Safety Standards

Vision AI adheres to **WCAG 2.1 Level AA** standards:
1. **High Text Contrast:** All clinical diagnostic text maintains a minimum contrast ratio of $\ge 4.5:1$ against glass surfaces; primary verdicts exceed $\ge 7:1$.
2. **Colorblind-Safe Redundancy (No Color-Alone Coding):**
   - High risk is not indicated solely by red color. It is accompanied by a warning triangle icon (`<ShieldAlert />`), bold text label (`HIGH RISK`), and explicit text explanations.
3. **Keyboard Navigability:** All interactive tabs, upload dropzones, and buttons support standard `Tab` focus rings with high-visibility cyan focus indicators (`outline: 2px solid #38bdf8; outline-offset: 3px`).
4. **Reduced Motion Mode (`prefers-reduced-motion`):**
   When the user has reduced motion enabled in their operating system:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
     .retinal-3d-background-canvas, .cursor-spotlight {
       display: none !important;
     }
   }
   ```

---

## 7. Design System Token Reference Table

| Token Name | Value | Purpose |
| :--- | :--- | :--- |
| `--bg-base` | `#07111f` | Root canvas background |
| `--bg-card` | `rgba(13, 27, 49, 0.78)` | Glassmorphic card surface |
| `--bg-card-hover` | `rgba(20, 39, 70, 0.88)` | Hover card state |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Default card border |
| `--border-focus` | `rgba(56, 189, 248, 0.35)` | Active input and reticle border |
| `--accent-cyan` | `#38bdf8` | Optical primary controls |
| `--accent-emerald` | `#34d399` | Healthy status & clearance |
| `--accent-amber` | `#fbbf24` | Warning & borderline findings |
| `--accent-rose` | `#f43f5e` | Acute disease & urgent referral |
| `--accent-solar` | `#facc15` | Scleral icterus / jaundice |
| `--accent-indigo` | `#818cf8` | Deep learning ViT accents |
| `--font-sans` | `Inter, -apple-system, sans-serif` | Primary readable UI typography |
| `--font-mono` | `ui-monospace, Consolas, monospace`| Clinical IDs, ICD-10 codes, numbers |
| `--radius-sm` | `6px` | Small tags and badges |
| `--radius-md` | `12px` | Buttons, text inputs |
| `--radius-lg` | `18px` | Standard diagnostic cards |
| `--radius-xl` | `24px` | Hero and modal containers |

---

*Design system specifications maintained by the Vision AI Human-Computer Interaction (HCI) Group.*
