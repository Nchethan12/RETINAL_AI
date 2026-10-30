# Engineering Rules & Guidelines

## Project: Vision AI — Intelligent Retinal & Anterior Ophthalmic Screening Platform
**Document Version:** 1.0.0  
**Status:** Active Engineering Standard  
**Scope:** Frontend (React 19 / Vite / Three.js), Backend (Django / PyTorch), Machine Learning Pipelines, and Clinical Decision Logic  

---

## 1. Technology Stack & Library Directives

### 1.1 Backend Libraries & ML Dependencies

#### ✅ What to Use
- **Python Standard Library:** `os`, `sys`, `io.BytesIO`, `json`, `math`, `time`.
- **API Framework:** `Django` (specifically `django.http.JsonResponse`, `django.views.decorators.csrf.csrf_exempt`). Keep views modular, focused, and decoupled from heavy model training routines.
- **Deep Learning Runtime:** `torch`, `torch.nn`, `torchvision.models` (`vit_b_16`, `resnet50`), `torchvision.transforms`.
- **Image Processing:** `Pillow` (`PIL.Image`) for decoding, format normalization, and cropping; `numpy` for vector and matrix operations (luminance checks, chromaticity ratios, masking).
- **Hardware Acceleration:** Always use dynamic hardware device arbitration:
  ```python
  device = (
      torch.device("mps") if torch.backends.mps.is_available()
      else torch.device("cuda") if torch.cuda.is_available()
      else torch.device("cpu")
  )
  ```

#### ❌ What to Avoid
- **DO NOT use heavyweight web frameworks or unnecessary layers:** Avoid FastAPI/Flask duplication inside this Django codebase. Keep the Django REST setup lightweight.
- **DO NOT use Pandas in real-time inference request loops:** `pandas` is permissible only in offline dataset preprocessing (`dataset.py`, `train.py`). In `views.py` and real-time inference, use native Python dictionaries and NumPy arrays to avoid high memory overhead and serialization latency.
- **DO NOT install redundant deep learning packages:** Avoid installing TensorFlow, Keras, or ONNX runtimes in the main Django environment unless explicitly migrating to an edge runtime.
- **DO NOT use unpinned, volatile dependencies:** Always pin versions in requirements or lockfiles to avoid breaking changes in PyTorch / Torchvision API signatures (e.g., weights enum syntax).

---

### 1.2 Frontend Libraries & Styling

#### ✅ What to Use
- **Core:** React 19 (`react`, `react-dom`), Vite for lightning-fast HMR and bundling.
- **Styling:** **Vanilla CSS3** with a centralized design system using custom CSS custom properties (tokens), modern glassmorphism, responsive grid/flexbox layouts, and specialized `@media print` stylesheets for hospital reports.
- **3D Visualization:** `three` (Three.js) for WebGL rendering of the holographic eye and neural-particle canvas.
- **Iconography:** `lucide-react` for consistent, accessible, scalable SVG medical and UI icons.
- **Micro-Delight:** `canvas-confetti` for positive reinforcement upon receiving healthy/normal screening results.

#### ❌ What to Avoid
- **DO NOT use TailwindCSS:** Use Vanilla CSS for maximum flexibility, granular control over CSS variables, performance, and avoiding utility class bloat.
- **DO NOT install heavy third-party UI component suites:** Avoid Material UI (MUI), Ant Design, Bootstrap, or Chakra UI. They introduce massive bundle bloat, CSS specificity wars, and compromise the custom medical dark-mode aesthetic.
- **DO NOT load external 3D models (.gltf/.obj) across network calls:** The 3D holographic eye must remain procedurally constructed in WebGL using Three.js native geometries (`SphereGeometry`, `MeshPhysicalMaterial`) to ensure zero external network latency and zero asset-loading failure modes.
- **DO NOT use jQuery or direct DOM mutation outside React:** Always utilize React refs (`useRef`) and reactive state (`useState`, `useEffect`) for DOM and Canvas interactions.

---

## 2. Error Handling & Exception Management

### 2.1 Backend Error Handling & Response Protocol

#### ✅ What to Use
- **Structured Clinical Error Payloads:** All error responses must return well-formed JSON with descriptive, clinical-grade diagnostic feedback:
  ```python
  return JsonResponse({
      "success": False,
      "error_type": "invalid_fundus_image",
      "eye": "left",
      "error": "Left Eye (OS) Rejected: Non-fundus photograph detected. Vision AI requires a circular retinal fundus scan."
  }, status=400)
  ```
- **Explicit HTTP Status Codes:**
  - `400 Bad Request`: Client input errors (e.g., missing file, non-image format, low resolution, failed optical gatekeeper checks).
  - `405 Method Not Allowed`: When endpoints receive `GET` instead of `POST`.
  - `500 Internal Server Error`: Unhandled computational or model execution failures, accompanied by server-side log traces.
- **Seek Pointer Resetting:** When inspecting uploaded files with Pillow or NumPy, always wrap inspections with `file.seek(0)` before and after reading to prevent corrupted subsequent reads.
- **Safe Dictionary Access:** Always use `.get()` with safe defaults when parsing clinical disease profiles or threshold lookups:
  ```python
  threshold = THRESHOLDS.get(label, 0.10)
  profile = CLINICAL_DISEASE_PROFILES.get(lookup_key, CLINICAL_DISEASE_PROFILES["Other"])
  ```

#### ❌ What to Avoid
- **DO NOT swallow exceptions silently:** Never write bare `except: pass` blocks. Catch specific exceptions (`IOError`, `KeyError`, `RuntimeError`) or log the error before returning a structured JSON response.
- **DO NOT return raw stack traces or internal server paths to the client:** Sanitize error messages to prevent exposing filesystem structures or internal PyTorch stack frames in production.
- **DO NOT allow unhandled model runtime exceptions to crash the Django process:** Wrap model forward passes in `try ... except` blocks with graceful fallbacks.

---

### 2.2 Frontend Error Handling & User Feedback

#### ✅ What to Use
- **Non-Blocking Toast / Banner Alerts:** Render clear, contextual banners when an upload fails validation (e.g., highlighting which eye failed and explaining the optical reason).
- **Graceful MediaStream Fallbacks:** When the webcam fails or permissions are denied (`NotAllowedError`, `NotFoundError`), present an informative guide and automatically switch the UI to upload or preset sample modes.
- **Fallback Clinical Knowledge Base:** `HospitalReport.jsx` must maintain a fallback dictionary of clinical profiles (`FALLBACK_CLINICAL_PROFILES`) so that the report never crashes if an API response omits a field.
- **WebGL Context Loss Recovery:** Listen for `webglcontextlost` on Three.js canvases to prevent zombie renders and cleanly re-instantiate materials when restored.

#### ❌ What to Avoid
- **DO NOT use native browser `alert()` or `confirm()` dialogs:** They freeze the main execution thread, look unpolished, and break the medical user experience.
- **DO NOT leave UI in a perpetual loading/spinner state:** Always wrap asynchronous network calls in `try ... catch ... finally` blocks to ensure loading state spinners are dismissed even on network failure.
- **DO NOT ignore unhandled promise rejections:** Handle all `async/await` and fetch calls with explicit error handlers.

---

## 3. Architectural, Data & Security Boundaries

```
+-----------------------------------------------------------------------------------+
| CLINICAL BOUNDARIES & DATA ENCLAVE                                               |
|                                                                                   |
|  [ Frontend Client ]                                                              |
|       |                                                                           |
|       |  Canvas Pre-Validation (Corner aperture, chromaticity check)              |
|       v                                                                           |
|  [ HTTP REST Boundary (TLS 1.3) ]                                                 |
|       |                                                                           |
|       |  Server-Side Gatekeeper (Aperture, center luminance, sclera exclusion)   |
|       v                                                                           |
|  [ Volatile Memory / RAM Only ]                                                   |
|       |                                                                           |
|       +--> PIL Image Decode -> PyTorch Tensor -> Forward Pass -> Clean up        |
|       |                                                                           |
|  [ Persistent Storage Boundary ]                                                  |
|       X- NO Patient Images written to /tmp or SQLite Database -X                  |
+-----------------------------------------------------------------------------------+
```

### 3.1 Privacy & Data Storage Boundaries

#### ✅ What to Use
- **Zero-Persistent In-Memory Execution:** Treat all incoming medical images as ephemeral streams. Ingest via `request.FILES`, load directly into `io.BytesIO` / `PIL.Image`, and immediately allow garbage collection after inference.
- **Stateless API Gateway:** The screening endpoints (`/analyze/`, `/analyze-selfie/`) must remain stateless. Session cookies and persistent tokens are not required for core inference.
- **CORS Whitelisting:** Enforce strict CORS policies restricting incoming requests to authorized frontend origins in production.

#### ❌ What to Avoid
- **DO NOT save raw patient images to disk:** Never use `.save()` to write uploaded patient eye images or camera selfies to local server storage, temporary directories (`/tmp`), or cloud buckets without explicit cryptographic patient consent.
- **DO NOT store Protected Health Information (PHI) in SQLite:** The development database (`db.sqlite3`) must never store patient names, medical record numbers (MRN), or diagnostic images.
- **DO NOT log sensitive biometric vectors:** Avoid printing full pixel matrices or biometric arrays in persistent server logs.

---

### 3.2 Client vs. Server Responsibilities

#### ✅ What to Use
- **Client Responsibility:** User interactions, WebRTC camera frame capture, rendering 3D visualizations, offline pre-validation (quick canvas check to save bandwidth), responsive layout, and report printing.
- **Server Responsibility:** Authoritative optical validation, running heavy neural inference (ViT and ResNet), risk ratio calibration, clinical profile resolution, and synthesizing patient-level bilateral findings.

#### ❌ What to Avoid
- **DO NOT run deep neural inference on the frontend via bulky weights:** Do not attempt to load multi-hundred-megabyte PyTorch models into the browser via WebAssembly unless an optimized, quantised ONNX edge model is explicitly architected.
- **DO NOT rely solely on client-side gatekeeping:** Never trust the client alone. The backend server gatekeeper (`validate_fundus_image`) must always independently re-verify image authenticity.

---

## 4. Clinical Safety & Medical Machine Learning Guardrails

### 4.1 Calibration & Threshold Rules

#### ✅ What to Use
- **Calibrated Clinical Operating Thresholds:** Always evaluate model predictions against the empirical `THRESHOLDS` mapping derived from ROC analysis:
  ```python
  THRESHOLDS = {
      "Normal": 0.55,
      "Diabetic Retinopathy": 0.18,
      "Glaucoma": 0.045,
      "Cataract": 0.50,
      "AMD": 0.08,
      "Hypertension": 0.06,
      "Myopia": 0.15,
      "Other": 0.08,
  }
  ```
- **Sensitivity-Prioritized Risk Ratios:** Calculate risk relative to the operating threshold ($r = \frac{p}{\tau}$). A risk ratio $r \ge 1.0$ must trigger an elevated clinical finding even if the absolute raw probability appears small.
- **Bilateral Conservative Aggregation:** In bilateral examinations, patient-level risk for any pathology must reflect the maximum risk score across both eyes:
  $$\text{Risk}_{\text{Patient}}(c) = \max\left(\text{Score}_{\text{OS}}(c), \text{Score}_{\text{OD}}(c)\right)$$

#### ❌ What to Avoid
- **DO NOT use standard 0.50 Softmax/Sigmoid cutoffs:** Applying a generic $0.50$ cutoff results in catastrophic false negatives for conditions with severe class imbalance (such as Glaucoma and Hypertensive Retinopathy).
- **DO NOT treat multi-label disease outputs as mutually exclusive:** Avoid `nn.Softmax(dim=-1)` across the 8 output classes. Always use `torch.sigmoid()` to support multi-morbid pathology presentation (e.g., Cataract + Glaucoma).
- **DO NOT mask or suppress secondary clinical findings:** If both Diabetic Retinopathy and Glaucoma breach threshold, both findings must be surfaced in the report.

---

### 4.2 Regulatory & Decision Support Boundaries

#### ✅ What to Use
- **Mandatory SaMD Clinical Disclaimer:** Every UI view, API response, and printed report must clearly display:
  > *"Vision AI is an adjunctive clinical screening aid and does not constitute a definitive medical diagnosis. All findings must be validated through dilated clinical examination by a licensed ophthalmologist or optometrist."*
- **Actionable Care Tiers:** Always pair detected diseases with specific referral timelines (e.g., 7-14 days vs. routine 12 months) and confirmatory diagnostic tests (SD-OCT, Visual Field, Tonometry).
- **Standardized ICD-10 Coding:** Always include verified ICD-10 diagnostic codes for medical interoperability (e.g., `E11.319` for Diabetic Retinopathy, `H40.9` for Glaucoma).

#### ❌ What to Avoid
- **DO NOT use definitive diagnostic language:** Avoid stating *"You have Glaucoma"*. Use calibrated screening language such as *"Elevated Glaucoma Indicator Detected (Optic Nerve Cupping)"* or *"Findings consistent with Diabetic Retinopathy"*.
- **DO NOT automate surgical or prescription orders:** The system suggests clinical care pathways and diagnostic workups for the physician's review; it must never prescribe drug dosages directly to consumers.

---

## 5. Frontend UI/UX & Coding Conventions

### 5.1 Styling & Design System Rules

#### ✅ What to Use
- **Centralized CSS Custom Properties:** Maintain color tokens, spacing, and glassmorphism gradients in `App.css`:
  ```css
  :root {
    --bg-primary: #0a0e1a;
    --bg-card: rgba(18, 24, 43, 0.75);
    --border-card: rgba(56, 189, 248, 0.15);
    --accent-cyan: #38bdf8;
    --accent-emerald: #10b981;
    --accent-rose: #f43f5e;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
  }
  ```
- **Print-Specific Media Queries:** Every clinical report must look like a high-grade paper document when printed:
  ```css
  @media print {
    body { background: #ffffff !important; color: #000000 !important; }
    .navbar, .hero-section, .upload-section, .interactive-3d { display: none !important; }
    .hospital-report-card { box-shadow: none !important; border: 1px solid #ccc !important; }
  }
  ```
- **Dynamic 3D Parallax & Micro-Animations:** Implement GPU-accelerated transforms (`transform: translate3d(...)`, `will-change: transform`) and smooth cubic-bezier transitions.

#### ❌ What to Avoid
- **DO NOT hardcode inline hex colors across components:** Reference CSS variables to keep dark/light themes coherent and maintainable.
- **DO NOT use fixed pixel widths for major layout containers:** Use responsive clamp formulas, flexbox, or grid layouts (`clamp(320px, 90vw, 1280px)`).
- **DO NOT block the main render loop with Three.js animations:** Always request animation frames cleanly using `requestAnimationFrame`, and cancel them in component unmount cleanup functions.

---

### 5.2 React Component Hygiene & State Management

#### ✅ What to Use
- **Clean Component Unmounting & Resource Disposal:** Always dispose of Three.js geometries, materials, and textures in the `useEffect` cleanup hook to avoid WebGL memory leaks:
  ```javascript
  useEffect(() => {
    // Setup Three.js scene...
    return () => {
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);
  ```
- **Stream Cleanup:** Always stop active video tracks when closing the camera in Mode B:
  ```javascript
  stream.getTracks().forEach((track) => track.stop());
  ```
- **Derived State via `useMemo`:** Compute filtered findings, risk percentages, and severity badge types using `useMemo` rather than maintaining redundant synchronized state.

#### ❌ What to Avoid
- **DO NOT mutate state directly:** Always use pure state updater functions (`setAnalysisData(prev => ({ ...prev, ...updates }))`).
- **DO NOT create circular render loops:** Be careful with `useEffect` dependency arrays when syncing active tabs or URL route state.
- **DO NOT write monolithic multi-thousand-line single-file components:** Break complex features into dedicated child components (e.g., `HospitalReport.jsx`, `AnteriorSelfiePage.jsx`, `FeatureDetailModal.jsx`).

---

## 6. Testing, CI/CD & Deployment Guardrails

### 6.1 Unit & Integration Testing Requirements

#### ✅ What to Use
- **Data Pipeline Verification:** Ensure `test_dataloader.py` passes without missing images or label shape mismatches.
- **Forward-Backward Pass Verification:** Ensure `test_training_step.py` executes without shape errors or NaN gradients before initiating model training runs.
- **Gatekeeper Verification Tests:** Maintain unit tests verifying that standard face selfies, landscape photos, and blank frames are strictly rejected by `validate_fundus_image`.
- **Linting:** Run `oxlint` on frontend assets to guarantee zero dead imports or malformed JSX syntax.

#### ❌ What to Avoid
- **DO NOT push model checkpoints (`.pth`) directly to GitHub:** Keep heavy model binary weights in a `.gitignore`-protected directory or external artifact storage (e.g., Hugging Face, S3, Git LFS) to prevent git repository bloat.
- **DO NOT bypass optical validation tests in staging:** Automated CI workflows must verify that non-fundus images return HTTP 400 with `error_type: "invalid_fundus_image"`.

---

## 7. Quick-Reference Rules Matrix

| Dimension | Mandatory (What to Use) | Forbidden (What to Avoid) |
| :--- | :--- | :--- |
| **Backend Framework** | Django 6, stateless endpoints, `JsonResponse` | Heavy microservice bloat, redundant FastAPI layers |
| **Machine Learning** | PyTorch, `vit_b_16`, `resnet50`, BCEWithLogitsLoss | TensorFlow, unpinned dependencies, training code in views |
| **Real-Time Data** | NumPy arrays, native dicts, in-memory `BytesIO` | Pandas DataFrames in request loops, saving images to disk |
| **Frontend Core** | React 19, Vite, Three.js, Lucide-React | TailwindCSS, heavy UI frameworks (MUI, AntD) |
| **Styling** | Vanilla CSS custom properties, glassmorphism, `@media print` | Inline hardcoded hex colors, unstyled print layouts |
| **Error Handling** | Structured clinical error JSON, explicit HTTP 400/405/500 | Bare `except: pass`, raw stack traces sent to client |
| **Optical Gatekeeper** | 4-corner aperture mask + hemoglobin chromaticity check | Permitting raw selfies or room photos into ViT fundus models |
| **Clinical Decision** | Calibrated operating thresholds (`THRESHOLDS` mapping) | Generic $0.50$ softmax thresholds, single-label assumption |
| **Data Privacy** | In-memory stream processing, zero persistent PHI | Storing patient photos in `/tmp`, database, or cloud disks |
| **Safety & Legal** | Mandatory SaMD disclaimers, referral timelines, ICD-10 | Definitive diagnostic language ("You have Glaucoma") |

---

*These engineering rules are mandatory across all contributions, code reviews, and deployments for Vision AI.*
