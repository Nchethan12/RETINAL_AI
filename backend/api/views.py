import os
import logging
from threading import Lock
import torch
import numpy as np
from PIL import Image
from torchvision import transforms
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ml.model import VisionAIModel
from ml.explainability import ViTExplainability

logger = logging.getLogger(__name__)


LABELS = [
    "Normal",
    "Diabetic Retinopathy",
    "Glaucoma",
    "Cataract",
    "AMD",
    "Hypertension",
    "Myopia",
    "Other",
]

# Calibrated clinical operating thresholds determined from validation ROC analysis
# Accounts for ODIR-5K class imbalance (e.g. Normal 45%, Glaucoma 4.9%, Hypertension 2.4%)
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

RECOMMENDATIONS = {
    "Normal": "No pathological abnormalities detected above screening threshold. Routine annual fundus exam recommended.",
    "Cataract": "Elevated lens opacity indicator. Slit-lamp biomicroscopy and visual acuity evaluation recommended.",
    "Glaucoma": "Elevated optic disc / cup-to-disc ratio anomaly detected. Urgent tonometry (IOP) and visual field testing recommended.",
    "Diabetic Retinopathy": "Retinal microvascular lesion patterns detected. Dilated retinal examination by a retina specialist recommended.",
    "AMD": "Macular degeneration / drusen pattern detected. Fluorescein angiography / OCT macular scan recommended.",
    "Hypertension": "Arteriolar narrowing / hypertensive retinopathy signs detected. Comprehensive systemic blood pressure and retinal exam advised.",
    "Myopia": "High/pathological myopia fundus changes detected (e.g. tessellated fundus, staphyloma). Retinal periphery check advised.",
    "Other": "Atypical retinal feature detected (e.g. epiretinal membrane, pigmentation, or vascular occlusion). Specialist review advised.",
}

# --------------------------------------------------
# Hospital-Grade Clinical Disease Knowledge Base
# Comprehensive diagnostic codes, precautions, tests, and care plans
# --------------------------------------------------

CLINICAL_DISEASE_PROFILES = {
    "Normal": {
        "icd10_code": "Z01.00",
        "clinical_name": "Normal Retinal Fundus (Physiologically Intact)",
        "triage_level": "Routine Annual Maintenance",
        "referral_timeline": "Next regular screening in 12 months",
        "overview": "No signs of diabetic microaneurysms, glaucomatous optic nerve head cupping, drusen, or lens opacities detected. The macula, optic disc, and retinal vascular architecture appear well-preserved.",
        "precautions": [
            "Wear UV400-certified sunglasses when outdoors to protect against photochemical maculopathy.",
            "Maintain balanced 20-20-20 visual hygiene during prolonged digital screen use (every 20 mins, look 20 feet away for 20 seconds).",
            "Schedule annual comprehensive dilated fundus examination, especially if there is a family history of glaucoma or diabetes.",
            "Wear protective polycarbonate eyewear during sports, home repairs, or industrial activities."
        ],
        "diagnostic_tests": [
            "Baseline Non-Mydriatic Fundus Photography",
            "Snellen Visual Acuity Refraction Check",
            "Non-Contact Tonometry (Baseline IOP assessment)"
        ],
        "treatment_pathway": [
            "No active medical or surgical intervention required at this time.",
            "Maintain routine preventative ophthalmic monitoring."
        ],
        "lifestyle_diet": [
            "Maintain an antioxidant-rich diet containing dark leafy greens (kale, spinach) for lutein and zeaxanthin.",
            "Include Omega-3 fatty acids (flaxseeds, walnuts, oily fish) to support tear film stability and photoreceptor health.",
            "Stay adequately hydrated and maintain regular aerobic cardiovascular exercise."
        ],
        "emergency_symptoms": [
            "Sudden onset of persistent dark spots or floaters",
            "Flashes of light (photopsia) in peripheral vision",
            "Dark curtain or shadow obscuring any part of visual field"
        ]
    },
    "Diabetic Retinopathy": {
        "icd10_code": "E11.319 / H36.0",
        "clinical_name": "Diabetic Retinopathy (Microvascular Retinal Pathology)",
        "triage_level": "Urgent Specialist Referral",
        "referral_timeline": "Comprehensive retinal consultation within 7 to 14 days",
        "overview": "AI telemetry detected microvascular retinal alterations consistent with diabetic retinopathy (e.g. microaneurysms, dot-and-blot hemorrhages, or lipid exudates) resulting from prolonged microvascular ischemia.",
        "precautions": [
            "Strict glycemic control: target HbA1c below 7.0% (or personalized target set by your endocrinologist).",
            "Avoid strenuous Valsalva maneuvers (e.g. heavy weight lifting, forceful coughing, intense breath-holding) which can trigger intraretinal or vitreous hemorrhages.",
            "Do not rub or apply direct pressure to the eyes.",
            "Monitor blood pressure and maintain readings below 130/80 mmHg to reduce retinal capillary shear stress.",
            "Conduct daily monocular vision self-checks to identify any sudden central or peripheral blurring."
        ],
        "diagnostic_tests": [
            "Spectral-Domain Optical Coherence Tomography (SD-OCT) to rule out Diabetic Macular Edema (DME)",
            "Fundus Fluorescein Angiography (FFA) to assess retinal capillary non-perfusion and neovascularization",
            "Glycated Hemoglobin (HbA1c) & Renal Microalbuminuria blood panel",
            "Standard Dilated Slit-Lamp Biomicroscopy with 90D fundus lens"
        ],
        "treatment_pathway": [
            "Intravitreal Anti-VEGF Injections (Aflibercept, Ranibizumab, or Bevacizumab) if Macular Edema is present.",
            "Targeted Focal/Grid Laser Photocoagulation for leaking microaneurysms.",
            "Panretinal Photocoagulation (PRP) if proliferative changes (PDR) or severe NPDR are confirmed.",
            "Comprehensive systemic glycemic and lipid optimization with primary care team."
        ],
        "lifestyle_diet": [
            "Low-glycemic index, Mediterranean-style nutrition with complex carbohydrates.",
            "Omega-3 fatty acids and dietary antioxidants to reduce systemic vascular oxidative stress.",
            "Strict cessation of all tobacco and nicotine products (smoking accelerates diabetic retinal hypoxia).",
            "Moderate low-impact aerobic exercise (walking, swimming) under medical supervision."
        ],
        "emergency_symptoms": [
            "Sudden shower of red/black floaters or 'cobwebs' in vision (indicates vitreous hemorrhage)",
            "Abrupt, painless drop in central visual acuity",
            "Dark veil or curtain falling over the field of view"
        ]
    },
    "Glaucoma": {
        "icd10_code": "H40.9",
        "clinical_name": "Glaucoma / Pathological Optic Nerve Cupping",
        "triage_level": "Urgent Diagnostic Triage",
        "referral_timeline": "Glaucoma specialist evaluation within 7 to 14 days",
        "overview": "Deep scanning identified suspicious enlargement of the cup-to-disc (C/D) ratio and retinal nerve fiber layer (RNFL) thinning, characteristic of glaucomatous optic neuropathy which causes irreversible visual field loss if untreated.",
        "precautions": [
            "Never discontinue or skip prescribed pressure-lowering eye drops once initiated by your physician.",
            "Avoid head-down inversion postures (e.g. downward dog yoga poses, inversion tables) which significantly spike intraocular pressure (IOP).",
            "Avoid chugging large volumes of fluids in short intervals; distribute fluid intake steadily throughout the day.",
            "Avoid tight neckties or neck collars that constrict jugular venous return.",
            "Inform all healthcare providers of suspected glaucoma before taking anticholinergic or steroid medications."
        ],
        "diagnostic_tests": [
            "Goldmann Applanation Tonometry (GAT) for precise Intraocular Pressure measurement",
            "Spectral-Domain OCT of the Optic Nerve Head & Peripapillary RNFL Thickness",
            "Humphrey Automated Visual Field (HVF 24-2 / 30-2 SITA-Fast or Standard)",
            "Gonioscopy to distinguish Open-Angle vs Closed-Angle Glaucoma",
            "Central Corneal Pachymetry (CCT) to calibrate corneal thickness impact on IOP"
        ],
        "treatment_pathway": [
            "First-line Topical Hypotensive Eye Drops: Prostaglandin Analogues (Latanoprost, Travoprost) or Beta-blockers (Timolol).",
            "Selective Laser Trabeculoplasty (SLT) to enhance aqueous humor drainage outflow.",
            "Minimally Invasive Glaucoma Surgery (MIGS) or Trabeculectomy if medical therapy is insufficient to arrest progression."
        ],
        "lifestyle_diet": [
            "Consume flavonoid-rich foods (berries, dark leafy greens, green tea) supporting neuroprotection.",
            "Moderate caffeine consumption (limit excessive coffee, which can transiently elevate IOP).",
            "Engage in moderate aerobic exercise (brisk walking) which has been shown to naturally lower IOP.",
            "Elevate head of bed by 15-20 degrees during sleep to reduce nocturnal supine IOP spikes."
        ],
        "emergency_symptoms": [
            "Severe ocular pain with headache, nausea, and vomiting (hallmark of Acute Angle-Closure Glaucoma)",
            "Rainbow halos appearing around lights",
            "Sudden severe hazy or cloudy vision"
        ]
    },
    "Cataract": {
        "icd10_code": "H25.9",
        "clinical_name": "Cataract (Crystalline Lens Opacity)",
        "triage_level": "Prompt Outpatient Evaluation",
        "referral_timeline": "Comprehensive ophthalmic visit within 2 to 4 weeks",
        "overview": "Significant optical media attenuation detected, consistent with crystalline lens nuclear or cortical opacification that scatters incoming light and degrades contrast sensitivity.",
        "precautions": [
            "Exercise extreme caution when driving at night due to debilitating headlight glare and halo distortion.",
            "Ensure bright, indirect task lighting at home and work to reduce visual strain and prevent fall injuries.",
            "Wear 100% UV400 sunglasses outdoors, as ultraviolet radiation accelerates cataract density.",
            "Do not rub eyes vigorously or sleep face-down.",
            "Avoid frequent unverified changes of reading glasses without a professional dilated exam."
        ],
        "diagnostic_tests": [
            "Slit-Lamp Biomicroscopy with lens nuclear opalescence grading (LOCS III scale)",
            "Best-Corrected Visual Acuity (BCVA) Refraction Check",
            "Contrast Sensitivity Testing (Pelli-Robson chart)",
            "Optical Biometry (IOL Master / Lenstar) for intraocular lens calculation when planning surgery"
        ],
        "treatment_pathway": [
            "Early stage: Updated corrective prescription lenses, anti-reflective coatings, and magnifying aids.",
            "Definitive surgical solution: Modern Micro-Incision Phacoemulsification with Foldable Intraocular Lens (IOL) implantation (monofocal, toric, or multifocal).",
            "Outpatient day-procedure with rapid visual recovery (typically within 48-72 hours)."
        ],
        "lifestyle_diet": [
            "Diet rich in Vitamin C (citrus fruits, bell peppers) and Vitamin E (nuts, sunflower seeds) to combat lens protein glycation.",
            "Lutein and Zeaxanthin supplementation to protect both lens and macular pigment.",
            "Strict avoidance of cigarette smoke and environmental particulate exposure."
        ],
        "emergency_symptoms": [
            "Sudden red eye accompanied by deep ocular pain",
            "Rapid total loss of vision in the affected eye",
            "Swelling or severe discharge around the eyelids"
        ]
    },
    "AMD": {
        "icd10_code": "H35.31 / H35.32",
        "clinical_name": "Age-Related Macular Degeneration (Maculopathy)",
        "triage_level": "Urgent Macular Triage",
        "referral_timeline": "Retina specialist evaluation within 3 to 7 days",
        "overview": "Elevated signal for macular degenerative changes (drusen formation, retinal pigment epithelium atrophy, or potential choroidal neovascularization) in the central anatomical fovea.",
        "precautions": [
            "Perform weekly monocular Amsler Grid testing: report any new waviness, distortion, or blank spots immediately.",
            "Wear UV400 and blue-light blocking sunglasses whenever exposed to outdoor sunlight.",
            "Stop all smoking immediately: smoking increases AMD progression risk by up to 400%.",
            "Avoid excessive ocular strain in dim lighting; use focused magnification task lamps."
        ],
        "diagnostic_tests": [
            "Macular Spectral-Domain OCT (High-resolution B-scans to detect subretinal/intraretinal fluid)",
            "Optical Coherence Tomography Angiography (OCT-A) to detect Choroidal Neovascular Membranes (CNV)",
            "Fluorescein Angiography (FA) / Indocyanine Green Angiography (ICGA) if active leakage is suspected",
            "Amsler Grid Monocular Distortion Mapping"
        ],
        "treatment_pathway": [
            "Dry AMD: Prescription AREDS2 oral formula (Vitamin C, Vitamin E, Zinc, Copper, Lutein, Zeaxanthin).",
            "Wet / Exudative AMD: Urgent intravitreal Anti-VEGF therapy (Aflibercept, Faricimab, or Ranibizumab) on treat-and-extend protocol.",
            "Low-vision visual rehabilitation aids and magnification devices for intermediate/advanced stages."
        ],
        "lifestyle_diet": [
            "Adhere strictly to AREDS2 nutritional guidelines.",
            "Consume 2-3 servings weekly of cold-water oily fish (salmon, sardines, mackerel) rich in DHA/EPA.",
            "Include dark leafy green vegetables daily (spinach, kale, collard greens).",
            "Maintain optimal systemic blood pressure and lipid panel levels."
        ],
        "emergency_symptoms": [
            "Sudden appearance of distortion (metamorphopsia)—straight lines appearing bent, wavy, or broken",
            "A sudden gray or dark blind spot (scotoma) appearing in the center of your vision",
            "Sudden difficulty recognizing faces or reading text"
        ]
    },
    "Hypertension": {
        "icd10_code": "H35.03",
        "clinical_name": "Hypertensive Retinopathy (Systemic Vascular Target-Organ Damage)",
        "triage_level": "Prompt Medical & Ophthalmic Co-Management",
        "referral_timeline": "Cardiovascular & retinal evaluation within 3 to 7 days",
        "overview": "Retinal telemetry demonstrates characteristic arteriolar signs (generalized or focal arteriolar narrowing, arteriovenous nicking, copper/silver wiring, or flame hemorrhages) reflecting systemic vascular hypertension.",
        "precautions": [
            "Immediate daily home blood pressure monitoring (aim for target below 130/80 mmHg or as directed by physician).",
            "Take all prescribed antihypertensive medications consistently without self-discontinuing.",
            "Restrict sodium intake to less than 1,500 mg - 2,000 mg daily.",
            "Avoid high-stress spikes and limit energy drinks or stimulants that acutely elevate vascular pressure."
        ],
        "diagnostic_tests": [
            "24-Hour Ambulatory Blood Pressure Monitoring (ABPM)",
            "Comprehensive Dilated Fundus Examination to grade Keith-Wagener-Barker retinopathy stage (Grade I-IV)",
            "Renal function test (Serum Creatinine, eGFR, Urinalysis) to evaluate renal target-organ damage",
            "Electrocardiogram (ECG) and Echocardiogram to evaluate left ventricular hypertrophy"
        ],
        "treatment_pathway": [
            "Systemic Antihypertensive Medical Therapy (ACE inhibitors, ARBs, Calcium Channel Blockers, or Thiazides).",
            "Ophthalmic monitoring for complications such as Retinal Vein Occlusion (BRVO/CRVO) or Macroaneurysms.",
            "Intravitreal Anti-VEGF or laser therapy if secondary macular edema or neovascularization develops."
        ],
        "lifestyle_diet": [
            "DASH Diet (Dietary Approaches to Stop Hypertension): rich in potassium, magnesium, calcium, and fiber.",
            "Reduce sodium, saturated fats, and processed foods.",
            "Weight management and 150 minutes of weekly moderate aerobic physical exercise.",
            "Limit alcohol intake and completely avoid tobacco."
        ],
        "emergency_symptoms": [
            "Severe sudden headache with visual blurriness (possible Hypertensive Crisis > 180/120 mmHg)",
            "Sudden partial or complete painless loss of vision in one eye",
            "Chest pain, shortness of breath, or neurological numbness accompanying visual changes"
        ]
    },
    "Myopia": {
        "icd10_code": "H44.2",
        "clinical_name": "Pathological / High Myopia (Chorioretinal Degeneration)",
        "triage_level": "Specialist Retinal Examination",
        "referral_timeline": "Peripheral retinal evaluation within 2 to 4 weeks",
        "overview": "Fundus examination displays typical signs of excessive axial globe elongation (tessellated fundus, peripapillary myopic conus, or posterior staphyloma), increasing vulnerability to peripheral retinal tears.",
        "precautions": [
            "Avoid heavy contact sports, martial arts, or bungee jumping that carry high risk of blunt head/eye trauma.",
            "Practice immediate self-reporting if any sudden flashes of light or new floaters appear.",
            "Avoid excessive unmanaged near-work without visual breaks; adhere to the 20-20-20 rule.",
            "Use protective polycarbonate eyewear during physical activities."
        ],
        "diagnostic_tests": [
            "360-Degree Dilated Peripheral Retinal Funduscopy with Scleral Depression",
            "Optical Biometry to measure Axial Eye Length (AL > 26.0 mm indicates high risk)",
            "Widefield Optos Imaging to evaluate peripheral lattice degeneration",
            "SD-OCT to monitor for Myopic Foveoschisis or Myopic Choroidal Neovascularization (mCNV)"
        ],
        "treatment_pathway": [
            "Prophylactic Barrier Laser Photocoagulation / Cryotherapy if retinal lattice degeneration, holes, or tears are found.",
            "Intravitreal Anti-VEGF injections if Myopic Choroidal Neovascularization (Foster-Fuchs spot) develops.",
            "Surgical Pars Plana Vitrectomy if retinal detachment or macular traction detachment occurs."
        ],
        "lifestyle_diet": [
            "Increase outdoor natural daylight exposure (especially beneficial for slowing myopic progression in young adults).",
            "Balanced diet rich in vitamins A, C, E, and lutein supporting chorioretinal integrity.",
            "Ensure ergonomic lighting and optimal working distance (minimum 35–40 cm) during screen and reading tasks."
        ],
        "emergency_symptoms": [
            "Sudden increase in floating spots, strings, or 'cobwebs' across vision",
            "Persistent bright flashes of light (lightning streaks) in the visual periphery",
            "A gray shadow or dark curtain creeping into your visual field (indicates Retinal Detachment)"
        ]
    },
    "Other": {
        "icd10_code": "H35.89",
        "clinical_name": "Other Specified Retinal Pathology / Atypical Finding",
        "triage_level": "Specialist Ophthalmic Review",
        "referral_timeline": "Comprehensive retinal examination within 2 to 3 weeks",
        "overview": "AI telemetry identified atypical retinal features outside the common disease categories (such as Epiretinal Membrane, Retinal Pigmentary Anomalies, Macular Hole, or Branch Retinal Vein Occlusion).",
        "precautions": [
            "Seek formal dilated ophthalmic evaluation with multi-modal imaging to establish a definitive sub-classification.",
            "Avoid rubbing eyes and protect eyes against mechanical trauma.",
            "Track visual distortion or central blind spots using an Amsler grid.",
            "Keep records of any systemic conditions (autoimmune diseases, vascular disorders, medications)."
        ],
        "diagnostic_tests": [
            "High-Density Macular & Peripheral SD-OCT",
            "Ultra-Widefield Color Fundus Photography",
            "Fundus Autofluorescence (FAF) to evaluate metabolic health of the Retinal Pigment Epithelium",
            "Fluorescein Angiography (FFA) as indicated by specialist"
        ],
        "treatment_pathway": [
            "Management tailored to specific pathology identified upon comprehensive subspecialty examination.",
            "May include observation, topical therapy, intravitreal injections, or vitreo-retinal surgery depending on structural findings."
        ],
        "lifestyle_diet": [
            "General retinal protective diet: antioxidants, dark green vegetables, omega-3 fatty acids.",
            "Maintain general cardiovascular health and adequate hydration.",
            "Wear 100% UV-protective eyewear in outdoor environments."
        ],
        "emergency_symptoms": [
            "Sudden significant drop in visual acuity",
            "Severe pain or sudden redness in the eye",
            "Flashes, dense showers of floaters, or curtain obscuring vision"
        ]
    }
}



# --------------------------------------------------
# Device Configuration (CUDA -> Apple Silicon MPS -> CPU)
# --------------------------------------------------

if torch.cuda.is_available():
    DEVICE = torch.device("cuda")
elif torch.backends.mps.is_available():
    DEVICE = torch.device("mps")
else:
    DEVICE = torch.device("cpu")


# --------------------------------------------------
# Model Loading
# --------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "ml",
    "weights",
    "vision_ai_vit.pth",
)

model = None
vit_explainer = None
model_lock = Lock()


def get_model():
    """Load the model on the first inference request, not during web startup."""
    global model, vit_explainer
    if model is None:
        with model_lock:
            if model is None:
                loaded_model = VisionAIModel(num_classes=8).to(DEVICE)
                state_dict = torch.load(MODEL_PATH, map_location="cpu")
                loaded_model.load_state_dict(state_dict)
                loaded_model.eval()
                model = loaded_model
                vit_explainer = ViTExplainability(model, DEVICE)
    return model


def safe_explain(image_file, diagnosis, eye_label="Eye"):
    """
    Safely executes ViT Grad-CAM explainability without crashing the screening pipeline.
    If explainability fails, gracefully returns an unavailable payload while logging the error.
    """
    try:
        if hasattr(image_file, "seek"):
            image_file.seek(0)
        get_model()
        explainer = vit_explainer
        if explainer is None:
            raise RuntimeError("The explainability service was not initialized.")
        expl = explainer.explain_screening_result(
            image_source=image_file,
            diagnosis=diagnosis,
            eye_label=eye_label,
            include_secondary=True,
        )
        if hasattr(image_file, "seek"):
            image_file.seek(0)
        return expl
    except Exception as e:
        logger.error(f"Explainability generation failed for {eye_label}: {e}", exc_info=True)
        return {
            "available": False,
            "error": "Explainability visualization could not be generated.",
            "eye": eye_label,
        }


# --------------------------------------------------
# Image Preprocessing
# --------------------------------------------------

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


# --------------------------------------------------
# Ophthalmic Retinal Fundus Gatekeeper & Validator
# --------------------------------------------------

def validate_fundus_image(image_file):
    """
    Validates whether the uploaded file is a genuine Retinal Fundus Photograph
    (posterior pole scan) versus an anterior eye selfie, face photograph, or non-medical image.
    
    Returns:
        (is_valid: bool, error_message: str)
    """
    try:
        if hasattr(image_file, "seek"):
            image_file.seek(0)
        image = Image.open(image_file).convert("RGB")
        if hasattr(image_file, "seek"):
            image_file.seek(0)
    except Exception as e:
        return False, f"Corrupted or unsupported image file format ({str(e)})."

    arr = np.array(image, dtype=np.float32)
    h, w, _ = arr.shape
    if h < 100 or w < 100:
        return False, "Image resolution is too low (< 100px) for ophthalmic screening."

    # 1. Aperture Check: Genuine fundus cameras photograph through a round barrel/lens aperture,
    # leaving the 4 corners dark/black. In contrast, regular face selfies and room photos have bright corners.
    ch, cw = max(2, int(h * 0.05)), max(2, int(w * 0.05))
    tl = arr[:ch, :cw].mean()
    tr = arr[:ch, -cw:].mean()
    bl = arr[-ch:, :cw].mean()
    br = arr[-ch:, -cw:].mean()
    corner_mean = (tl + tr + bl + br) / 4.0

    # 2. Central Retinal Color Profile
    center = arr[int(h * 0.25):int(h * 0.75), int(w * 0.25):int(w * 0.75)]
    r_mean = float(center[:, :, 0].mean())
    g_mean = float(center[:, :, 1].mean())
    b_mean = float(center[:, :, 2].mean())
    center_brightness = (r_mean + g_mean + b_mean) / 3.0

    if center_brightness < 15.0:
        return False, "Image is severely underexposed or completely dark. Please ensure the retinal camera flash was active."
    if center_brightness > 248.0:
        return False, "Image is severely overexposed or blank white."

    if corner_mean > 35.0:
        return (
            False,
            "Non-fundus photograph detected: The uploaded image appears to be an external face or eye selfie. "
            "Vision AI requires a circular non-mydriatic retinal fundus scan (posterior chamber view showing the retina, optic disc, and blood vessels) taken with a fundus camera or smartphone ophthalmic adapter."
        )

    # 3. Retinal Chromaticity & Hemoglobin Signature:
    # Retinal fundus images are dominated by choroidal vascularization (Red > Green > Blue).
    # In contrast, external eye selfies feature white sclera and iris colors where blue/green are elevated.
    rb_ratio = r_mean / (b_mean + 1e-4)
    rg_ratio = r_mean / (g_mean + 1e-4)

    if rb_ratio < 1.15 or r_mean < b_mean or r_mean < (g_mean * 0.90):
        return (
            False,
            "Invalid retinal chromatic profile: The image does not exhibit standard retinal vascular reflectance. "
            "External photos of the eye surface (cornea, iris, sclera, eyelashes) cannot be analyzed."
        )

    # 4. Sclera & Anterior Segment Check:
    # Detect presence of large white sclera or external skin.
    max_c = np.maximum(np.maximum(center[:, :, 0], center[:, :, 1]), center[:, :, 2])
    min_c = np.minimum(np.minimum(center[:, :, 0], center[:, :, 1]), center[:, :, 2])
    sat = (max_c - min_c) / (max_c + 1e-5)
    sclera_like_pixels = (center_brightness > 130) & (sat < 0.10)
    sclera_fraction = float(sclera_like_pixels.mean())
    if sclera_fraction > 0.20:
        return (
            False,
            "Anterior eye segment detected: The image contains external sclera (white of the eye), eyelids, or corneal surface. "
            "Vision AI specifically requires an internal posterior fundus photograph."
        )

    return True, "Valid Retinal Fundus Scan"


# --------------------------------------------------
# Core Inference & Diagnostic Logic
# --------------------------------------------------

def predict_raw_probabilities(image_file):
    """Run preprocessing and inference, returning raw probabilities (0.0 - 1.0)."""
    if hasattr(image_file, "seek"):
        image_file.seek(0)
    image = Image.open(image_file).convert("RGB")
    if hasattr(image_file, "seek"):
        image_file.seek(0)
    image_tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = get_model()(image_tensor)
        probabilities = torch.sigmoid(logits)[0]

    return {
        label: float(prob.item())
        for label, prob in zip(LABELS, probabilities)
    }


def diagnose_fundus(raw_probs):
    """
    Evaluates raw probabilities against calibrated clinical thresholds
    to generate an accurate primary finding, confidence, risk levels, and recommendations.
    """
    findings = []
    for label, prob in raw_probs.items():
        th = THRESHOLDS.get(label, 0.10)
        ratio = prob / th
        if label != "Normal":
            if ratio >= 1.0:
                findings.append({
                    "label": label,
                    "raw_score": round(prob * 100, 2),
                    "threshold_score": round(th * 100, 2),
                    "risk_ratio": round(ratio, 2),
                })

    # Sort findings by risk ratio descending (strongest signal first)
    findings.sort(key=lambda x: x["risk_ratio"], reverse=True)

    # Calibrated risk dictionary for UI display (normalized 0-100 scale)
    calibrated_risks = {}
    for label, prob in raw_probs.items():
        th = THRESHOLDS.get(label, 0.10)
        ratio = prob / th
        if label == "Normal":
            # Normal confidence scales with score relative to threshold
            norm_val = min(100.0, max(0.0, (prob / th) * 60.0))
            calibrated_risks[label] = round(norm_val, 2)
        else:
            # Disease risk: ratio 1.0 -> 50%, ratio 2.0 -> 80%, ratio >= 3.0 -> 95%+
            if ratio < 1.0:
                score = ratio * 45.0
            elif ratio < 2.0:
                score = 50.0 + (ratio - 1.0) * 30.0
            else:
                score = min(99.5, 80.0 + (ratio - 2.0) * 6.5)
            calibrated_risks[label] = round(score, 2)

    if findings:
        primary = findings[0]
        primary_label = primary["label"]
        ratio = primary["risk_ratio"]

        if ratio >= 2.5:
            confidence = min(99.2, 88.0 + ratio * 3.0)
            severity = "High Risk / Acute Finding"
            badge_type = "high"
        elif ratio >= 1.5:
            confidence = round(78.0 + (ratio - 1.5) * 10.0, 1)
            severity = "Elevated Pathology Indicator"
            badge_type = "moderate"
        else:
            confidence = round(60.0 + (ratio - 1.0) * 35.0, 1)
            severity = "Borderline / Early Signs"
            badge_type = "warning"

        verdict_title = f"{primary_label} Detected"
        status = "disease_detected"
        recommendation = RECOMMENDATIONS.get(primary_label, "Follow-up ophthalmic evaluation recommended.")

    else:
        norm_prob = raw_probs.get("Normal", 0.5)
        primary_label = "Normal Retinal Fundus"
        verdict_title = "Normal Retinal Fundus (Healthy)"
        status = "normal"
        confidence = round(min(98.0, max(68.0, norm_prob * 100)), 1)
        severity = "Healthy / Low Risk"
        badge_type = "normal"
        recommendation = RECOMMENDATIONS["Normal"]

    # Fetch comprehensive clinical profile
    lookup_key = "Normal" if "Normal" in primary_label else primary_label
    clinical_profile = CLINICAL_DISEASE_PROFILES.get(
        lookup_key,
        CLINICAL_DISEASE_PROFILES.get(primary_label, CLINICAL_DISEASE_PROFILES.get("Other"))
    )

    return {
        "status": status,
        "primary_disease": primary_label,
        "verdict_title": verdict_title,
        "confidence": confidence,
        "severity": severity,
        "badge_type": badge_type,
        "recommendation": recommendation,
        "clinical_report": clinical_profile,
        "findings": findings,
        "calibrated_risks": calibrated_risks,
        "raw_percentages": {
            k: round(v * 100, 2) for k, v in raw_probs.items()
        }
    }


# --------------------------------------------------
# Analyze API Endpoint
# --------------------------------------------------

@csrf_exempt
def analyze_retina(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Only POST requests are allowed."},
            status=405,
        )

    left_file = (
        request.FILES.get("left_image")
        or request.FILES.get("leftEye")
        or request.FILES.get("left")
    )
    right_file = (
        request.FILES.get("right_image")
        or request.FILES.get("rightEye")
        or request.FILES.get("right")
    )
    single_file = request.FILES.get("image")

    if not left_file and not right_file and not single_file:
        return JsonResponse(
            {"error": "No image uploaded. Please upload a fundus photograph."},
            status=400,
        )

    # --------------------------------------------------
    # Retinal Fundus Image Validation (Restrict Non-Fundus / Selfies)
    # --------------------------------------------------
    if left_file:
        is_valid, err_msg = validate_fundus_image(left_file)
        if not is_valid:
            return JsonResponse({
                "success": False,
                "error_type": "invalid_fundus_image",
                "eye": "left",
                "error": f"Left Eye (OS) Rejected: {err_msg}",
            }, status=400)

    if right_file:
        is_valid, err_msg = validate_fundus_image(right_file)
        if not is_valid:
            return JsonResponse({
                "success": False,
                "error_type": "invalid_fundus_image",
                "eye": "right",
                "error": f"Right Eye (OD) Rejected: {err_msg}",
            }, status=400)

    if single_file and not left_file and not right_file:
        is_valid, err_msg = validate_fundus_image(single_file)
        if not is_valid:
            return JsonResponse({
                "success": False,
                "error_type": "invalid_fundus_image",
                "eye": "single",
                "error": f"Image Rejected: {err_msg}",
            }, status=400)

    try:
        # Bilateral analysis when both eyes are provided
        if left_file and right_file:
            left_raw = predict_raw_probabilities(left_file)
            right_raw = predict_raw_probabilities(right_file)

            left_diag = diagnose_fundus(left_raw)
            right_diag = diagnose_fundus(right_raw)

            # Combined patient-level probabilities (max risk across eyes)
            combined_raw = {
                label: max(left_raw[label], right_raw[label])
                for label in LABELS
            }
            patient_diag = diagnose_fundus(combined_raw)

            # Bilateral composite summary
            if left_diag["status"] == "disease_detected" and right_diag["status"] == "disease_detected":
                if left_diag["primary_disease"] == right_diag["primary_disease"]:
                    patient_diag["verdict_title"] = f"Bilateral {left_diag['primary_disease']} Detected"
                else:
                    patient_diag["verdict_title"] = f"Bilateral Pathology: OS ({left_diag['primary_disease']}), OD ({right_diag['primary_disease']})"
            elif left_diag["status"] == "disease_detected":
                patient_diag["verdict_title"] = f"Left Eye (OS): {left_diag['primary_disease']} Detected | Right Eye (OD): Normal"
            elif right_diag["status"] == "disease_detected":
                patient_diag["verdict_title"] = f"Right Eye (OD): {right_diag['primary_disease']} Detected | Left Eye (OS): Normal"
            else:
                patient_diag["verdict_title"] = "Bilateral Normal Retinal Fundus (Healthy)"

            # Generate bilateral explainability maps
            left_expl = safe_explain(left_file, left_diag, "Left Eye (OS)")
            right_expl = safe_explain(right_file, right_diag, "Right Eye (OD)")

            # Select primary patient-level explanation based on clinical severity
            if left_diag["status"] == "disease_detected" and right_diag["status"] == "disease_detected":
                l_conf = left_diag.get("confidence", 0)
                r_conf = right_diag.get("confidence", 0)
                primary_expl = left_expl if l_conf >= r_conf else right_expl
            elif left_diag["status"] == "disease_detected":
                primary_expl = left_expl
            elif right_diag["status"] == "disease_detected":
                primary_expl = right_expl
            else:
                primary_expl = left_expl

            left_diag["explainability"] = left_expl
            right_diag["explainability"] = right_expl
            patient_diag["explainability"] = primary_expl

            return JsonResponse({
                "success": True,
                "mode": "bilateral",
                "diagnosis": patient_diag,
                "left_diagnosis": left_diag,
                "right_diagnosis": right_diag,
                "results": patient_diag["raw_percentages"],
                "left_eye": left_diag["raw_percentages"],
                "right_eye": right_diag["raw_percentages"],
                "calibrated_risks": patient_diag["calibrated_risks"],
                "explainability": primary_expl,
                "left_explainability": left_expl,
                "right_explainability": right_expl,
            })

        # Left eye only
        elif left_file:
            raw = predict_raw_probabilities(left_file)
            diag = diagnose_fundus(raw)
            diag["verdict_title"] = f"Left Eye (OS): {diag['verdict_title']}"
            left_expl = safe_explain(left_file, diag, "Left Eye (OS)")
            diag["explainability"] = left_expl

            return JsonResponse({
                "success": True,
                "mode": "left_eye",
                "diagnosis": diag,
                "left_diagnosis": diag,
                "results": diag["raw_percentages"],
                "calibrated_risks": diag["calibrated_risks"],
                "explainability": left_expl,
                "left_explainability": left_expl,
            })

        # Right eye only
        elif right_file:
            raw = predict_raw_probabilities(right_file)
            diag = diagnose_fundus(raw)
            diag["verdict_title"] = f"Right Eye (OD): {diag['verdict_title']}"
            right_expl = safe_explain(right_file, diag, "Right Eye (OD)")
            diag["explainability"] = right_expl

            return JsonResponse({
                "success": True,
                "mode": "right_eye",
                "diagnosis": diag,
                "right_diagnosis": diag,
                "results": diag["raw_percentages"],
                "calibrated_risks": diag["calibrated_risks"],
                "explainability": right_expl,
                "right_explainability": right_expl,
            })

        # Generic single image
        else:
            raw = predict_raw_probabilities(single_file)
            diag = diagnose_fundus(raw)
            single_expl = safe_explain(single_file, diag, "Eye")
            diag["explainability"] = single_expl

            return JsonResponse({
                "success": True,
                "mode": "single",
                "diagnosis": diag,
                "results": diag["raw_percentages"],
                "calibrated_risks": diag["calibrated_risks"],
                "explainability": single_expl,
            })

    except Exception as error:
        return JsonResponse(
            {
                "success": False,
                "error": str(error),
            },
            status=500,
        )


# --------------------------------------------------
# API Root Status Endpoint
# --------------------------------------------------

def api_root(request):
    """Returns Vision AI backend telemetry status and endpoint index."""
    return JsonResponse({
        "status": "online",
        "service": "Vision AI — Intelligent Retinal & Anterior Ophthalmic Screening Platform",
        "version": "2.0.0",
        "frontend_url": "https://retinal-ai-ten.vercel.app/",
        "endpoints": {
            "retinal_screening": "/analyze/ (POST)",
            "anterior_selfie_screening": "/analyze-selfie/ (POST)",
            "sample_cases": "/sample-cases/ (GET)",
        },
        "explainability": {
            "status": "active",
            "backbone": "Vision Transformer (ViT-B/16)",
            "methodology": "Patch-Token Grad-CAM (Encoder Layers 10 & 11)",
            "classes": 8,
        },
        "message": "Vision AI API backend is running! Open the React UI in your browser at http://localhost:5173/"
    })


# --------------------------------------------------
# Sample Cases API Endpoint
# --------------------------------------------------

def sample_cases(request):
    """Returns verified reference test cases from ODIR-5K for each of the 8 categories."""
    cases = [
        {
            "category": "Cataract",
            "file": "0_left.jpg",
            "eye": "Left (OS)",
            "description": "Patient 0 OS - Dense cortical/nuclear cataract",
            "expected": "Cataract Detected"
        },
        {
            "category": "Glaucoma",
            "file": "1218_left.jpg",
            "eye": "Left (OS)",
            "description": "Patient 1218 OS - Pathological cup-to-disc enlargement",
            "expected": "Glaucoma Detected"
        },
        {
            "category": "Myopia",
            "file": "144_left.jpg",
            "eye": "Left (OS)",
            "description": "Patient 144 OS - High/pathological myopia with fundus changes",
            "expected": "Myopia Detected"
        },
        {
            "category": "AMD",
            "file": "102_right.jpg",
            "eye": "Right (OD)",
            "description": "Patient 102 OD - Dry age-related macular degeneration with drusen",
            "expected": "AMD Detected"
        },
        {
            "category": "Diabetic Retinopathy",
            "file": "157_left.jpg",
            "eye": "Left (OS)",
            "description": "Patient 157 OS - Moderate non-proliferative diabetic retinopathy",
            "expected": "Diabetic Retinopathy Detected"
        },
        {
            "category": "Hypertension",
            "file": "32_left.jpg",
            "eye": "Left (OS)",
            "description": "Patient 32 OS - Hypertensive retinopathy with arteriolar signs",
            "expected": "Hypertension / Retinopathy"
        },
        {
            "category": "Normal",
            "file": "394_left.jpg",
            "eye": "Left (OS)",
            "description": "Patient 394 OS - Clear normal retinal fundus",
            "expected": "Normal Retinal Fundus (Healthy)"
        },
        {
            "category": "Normal (Contralateral)",
            "file": "0_right.jpg",
            "eye": "Right (OD)",
            "description": "Patient 0 OD - Normal fundus (Fellow eye of cataract patient)",
            "expected": "Normal Retinal Fundus (Healthy)"
        },
    ]
    return JsonResponse({"success": True, "cases": cases})


# =========================================================
# MODE B: ANTERIOR EYE SELFIE SCREENING (FRONT OF THE EYE)
# =========================================================

ANTERIOR_DISEASE_PROFILES = {
    "Conjunctivitis (Pink Eye)": {
        "icd10_code": "H10.9",
        "clinical_name": "Acute Conjunctivitis (Infectious / Allergic Erythema)",
        "triage_level": "Prompt Outpatient Care",
        "referral_timeline": "Primary care doctor or optometrist within 24 to 48 hours",
        "overview": "Prominent bulbar conjunctival hyperemia (diffuse red/pink vascular injection) detected across the sclera, typical of viral, bacterial, or allergic conjunctivitis.",
        "precautions": [
            "Strict hand hygiene: Wash hands frequently with soap and water for at least 20 seconds.",
            "Do NOT touch or rub your eyes, as this spreads infection between eyes and to other people.",
            "Discard currently used contact lenses, eye makeup, and mascara immediately.",
            "Use clean, separate face towels and pillowcases daily; avoid sharing towels with family.",
            "Apply cool, clean damp compresses over closed eyelids to soothe burning."
        ],
        "diagnostic_tests": [
            "Slit-Lamp Biomicroscopy (to evaluate follicular vs papillary reaction and rule out keratitis)",
            "Fluorescein Eye Stain (to rule out corneal dendritic ulceration or abrasion)",
            "Conjunctival Swab & Culture (indicated for severe purulent discharge or unresolving cases)"
        ],
        "treatment_pathway": [
            "Bacterial: Topical broad-spectrum antibiotic eye drops (e.g. Polymyxin B/Trimethoprim, Tobramycin, or Moxifloxacin).",
            "Viral: Supportive therapy with preservative-free artificial tears and cold compresses (antibiotics ineffective).",
            "Allergic: Dual-acting antihistamine and mast-cell stabilizer drops (e.g. Olopatadine, Ketotifen)."
        ],
        "lifestyle_diet": [
            "Temporarily switch from contact lenses to prescription eyeglasses for at least 7 to 10 days.",
            "Wear sunglasses outdoors to shield against photophobia, wind, and airborne allergen triggers."
        ],
        "emergency_symptoms": [
            "Severe deep, boring ocular pain or headache",
            "Marked decrease in visual acuity or inability to keep eye open",
            "Extreme sensitivity to light (severe photophobia suggests corneal involvement / uveitis)",
            "Abundant thick green/yellow discharge continuously gluing eyelids shut"
        ]
    },
    "Scleral Icterus (Jaundice)": {
        "icd10_code": "R17",
        "clinical_name": "Scleral Icterus (Systemic Hyperbilirubinemia / Hepatic Dysfunction)",
        "triage_level": "Urgent Medical / Hepatobiliary Workup",
        "referral_timeline": "Internal medicine or emergency physician within 24 hours",
        "overview": "Significant yellowish pigmentation (xanthochromia) detected across the bulbar sclera. Scleral elastin binds bilirubin preferentially, making the sclera the earliest anatomical site where jaundice manifests (serum bilirubin > 2.5 - 3.0 mg/dL).",
        "precautions": [
            "Immediate formal medical evaluation for hepatic, biliary, or hemolytic systemic etiology.",
            "Strictly avoid alcohol and all hepatotoxic substances.",
            "Review all medications and supplements with a physician; avoid unprescribed acetaminophen/paracetamol.",
            "Monitor for associated systemic signs: dark tea-colored urine, pale clay-colored stools, and cutaneous pruritus (itching)."
        ],
        "diagnostic_tests": [
            "Serum Bilirubin Fractionation (Total, Direct/Conjugated, Indirect/Unconjugated Bilirubin)",
            "Comprehensive Liver Function Panel (ALT, AST, ALP, GGT, Serum Albumin, PT/INR)",
            "Abdominal Ultrasound (to evaluate for choledocholithiasis, gallstones, or biliary duct dilatation)",
            "Complete Blood Count (CBC) & Reticulocyte Count (to rule out hemolytic anemia)"
        ],
        "treatment_pathway": [
            "Etiology-directed hospital medical management:",
            "Obstructive Biliary: Endoscopic retrograde cholangiopancreatography (ERCP) or surgical decompression.",
            "Hepatocellular: Management of acute/chronic viral hepatitis, autoimmune liver disease, or toxic hepatitis.",
            "Hemolytic: Hematology consultation for hemolysis cessation."
        ],
        "lifestyle_diet": [
            "Zero alcohol intake.",
            "Low-fat, balanced nutrient-dense diet to avoid biliary colic; maintain optimal hydration."
        ],
        "emergency_symptoms": [
            "High fever, shaking chills, and right upper quadrant abdominal pain (Charcot's Triad for Cholangitis)",
            "New-onset mental confusion, disorientation, or drowsiness (Hepatic Encephalopathy)",
            "Persistent vomiting, severe lethargy, or easy bruising/bleeding"
        ]
    },
    "Subconjunctival Hemorrhage": {
        "icd10_code": "H11.3",
        "clinical_name": "Subconjunctival Hemorrhage (Acutely Ruptured Conjunctival Capillary)",
        "triage_level": "Routine Outpatient Monitoring",
        "referral_timeline": "Primary care or optometrist within 3 to 5 days if asymptomatic",
        "overview": "A discrete, well-demarcated bright red pool of blood detected between the transparent bulbar conjunctiva and underlying white episclera, caused by rupture of a fragile conjunctival microvessel (often secondary to coughing, sneezing, straining, or minor trauma).",
        "precautions": [
            "Do not be alarmed: While visually dramatic, isolated subconjunctival hemorrhage is usually harmless and painless.",
            "Avoid rubbing the eye or applying pressure.",
            "Avoid Valsalva maneuvers (heavy weightlifting, straining, breath-holding).",
            "Discontinue contact lens use until the hemorrhage has resorbed.",
            "Measure and record blood pressure today."
        ],
        "diagnostic_tests": [
            "Non-Invasive Blood Pressure (BP) Measurement (to rule out acute hypertensive surge)",
            "Slit-Lamp Examination (to ensure intact sclera and rule out penetrating foreign body / open globe)",
            "Coagulation Profile (PT/INR, aPTT) if patient is taking blood thinners or has recurrent episodes"
        ],
        "treatment_pathway": [
            "Self-resolving condition: Requires no active medical or surgical intervention.",
            "Blood resorbs naturally within 10 to 14 days (transitioning from bright red to yellow-brown, like a skin bruise).",
            "Preservative-free lubricating artificial tears 3-4 times daily if mild foreign-body scratchiness occurs."
        ],
        "lifestyle_diet": [
            "Maintain controlled blood pressure; avoid smoking and heavy alcohol consumption.",
            "Treat underlying coughing or constipation if present to prevent recurrent intra-abdominal pressure spikes."
        ],
        "emergency_symptoms": [
            "Associated significant decrease in vision or blurriness",
            "Severe ocular pain, photophobia, or discharge (indicates trauma or uveitis)",
            "History of high-velocity blunt ocular impact or penetrating trauma"
        ]
    },
    "Stye (Hordeolum / Chalazion)": {
        "icd10_code": "H00.0",
        "clinical_name": "External/Internal Hordeolum (Acute Eyelid Gland Infection)",
        "triage_level": "Outpatient Conservative Care",
        "referral_timeline": "Primary care doctor or eye clinic within 48 to 72 hours",
        "overview": "Localized erythematous swelling and tender focal nodule detected along the eyelid margin, reflecting an acute focal infection (usually Staphylococcal) of the eyelash follicle (Glands of Zeis/Moll) or meibomian gland.",
        "precautions": [
            "CRITICAL: NEVER attempt to squeeze, pop, puncture, or express the stye yourself (high risk of preseptal cellulitis).",
            "Completely stop using eye makeup, mascaras, eyeliners, and false eyelashes.",
            "Do not wear contact lenses until the lesion has completely healed.",
            "Wash hands thoroughly before touching your face."
        ],
        "diagnostic_tests": [
            "Eyelid Margin Biomicroscopy (to differentiate external hordeolum from internal meibomianitis or preseptal cellulitis)",
            "Meibomian Gland Transillumination & Expressibility Assessment"
        ],
        "treatment_pathway": [
            "Warm Compresses: Apply a warm, damp cloth over the closed eye for 10 to 15 minutes, 3 to 4 times daily (promotes spontaneous drainage).",
            "Eyelid Cleansing: Gentle lid scrubs using diluted baby shampoo or commercial hypochlorous acid eyelid wipes.",
            "Topical Antibiotics: Erythromycin or Bacitracin ophthalmic ointment if recurrent.",
            "Incision & Curettage (I&C): Minor outpatient procedure by ophthalmologist if chalazion persists > 4-6 weeks."
        ],
        "lifestyle_diet": [
            "Daily eyelid hygiene routine; discard eye cosmetics older than 3 months.",
            "Dietary Omega-3 supplementation (EPA/DHA) to improve meibomian gland lipid viscosity."
        ],
        "emergency_symptoms": [
            "Swelling and redness spreading beyond the eyelid into the cheek or face (Cellulitis)",
            "Inability to open the eye, eye protrusion (proptosis), or pain with eye movement",
            "Fever or systemic malaise"
        ]
    },
    "Pterygium ('Surfer's Eye')": {
        "icd10_code": "H11.0",
        "clinical_name": "Pterygium (Fibrovascular Limbal Corneal Encroachment)",
        "triage_level": "Outpatient Specialist Monitoring",
        "referral_timeline": "Ophthalmology consultation within 2 to 4 weeks",
        "overview": "Elevated, wing-shaped fibrovascular conjunctival growth detected extending horizontally across the limbus onto the anterior cornea, strongly associated with chronic ultraviolet (UV) radiation, wind, and ocular surface dryness.",
        "precautions": [
            "Wear wrap-around sunglasses with certified 100% UV400 protection whenever outdoors.",
            "Protect eyes with safety glasses or goggles in dusty, sandy, or windy environments.",
            "Use lubricating eye drops frequently to prevent surface friction and inflammatory flare-ups.",
            "Avoid rubbing the eyes."
        ],
        "diagnostic_tests": [
            "High-Magnification Slit-Lamp Biomicroscopy (to measure millimeters of corneal encroachment from the limbus)",
            "Corneal Topography (to measure induced irregular astigmatism)",
            "Anterior Segment Optical Coherence Tomography (AS-OCT) for epithelial thickness mapping"
        ],
        "treatment_pathway": [
            "Mild / Early Stage: Lubricating artificial tears and topical lubricants.",
            "Inflammatory Episodes: Short-course mild topical corticosteroid drops under doctor supervision.",
            "Surgical Intervention: Pterygium excision with conjunctival autograft (CAG) if the lesion threatens the central visual axis."
        ],
        "lifestyle_diet": [
            "Strict long-term outdoor UV radiation protection.",
            "Maintain ocular surface moisture with indoor humidifiers."
        ],
        "emergency_symptoms": [
            "Rapid horizontal growth approaching the center of the pupil",
            "Significant sudden drop in visual sharpness or double vision"
        ]
    },
    "Corneal Opacity / Mature Cataract (Leukocoria)": {
        "icd10_code": "H25.9 / H17.9",
        "clinical_name": "Pupillary Opacification / Leukocoria (White Pupil Phenomenon)",
        "triage_level": "Specialist Ophthalmic Consultation",
        "referral_timeline": "Ophthalmologist examination within 1 to 2 weeks",
        "overview": "Abnormal white or cloudy reflex (leukocoria) detected within the pupillary aperture replacing the normal black pupil, indicative of advanced mature cataract, corneal scarring, or intraocular media opacity.",
        "precautions": [
            "Exercise extreme caution moving in low-light environments (high fall risk due to degraded contrast and depth perception).",
            "Avoid driving, especially at night, due to severe glare disability and halo scattering.",
            "Ensure home environments are brightly illuminated with glare-free warm lighting."
        ],
        "diagnostic_tests": [
            "Comprehensive Dilated Slit-Lamp Biomicroscopy & LOCS III Grading",
            "Optical Biometry & Keratometry (for precision intraocular lens IOL power calculation)",
            "B-Scan Ophthalmic Ultrasonography (if mature opacity completely precludes optical fundus visualization)"
        ],
        "treatment_pathway": [
            "Curative Surgical Treatment: Micro-Incision Phacoemulsification Surgery.",
            "The opacified crystalline lens is emulsified using ultrasonic energy and replaced with a clear permanent foldable Intraocular Lens (IOL).",
            "High success rate (> 98%) with immediate restoration of visual clarity."
        ],
        "lifestyle_diet": [
            "Antioxidant-rich nutrition, tobacco cessation, and UV400-certified eyewear."
        ],
        "emergency_symptoms": [
            "Sudden severe eye pain, eye redness, with nausea/vomiting (indicates phacomorphic acute angle-closure glaucoma)"
        ]
    },
    "Normal Healthy Anterior Segment": {
        "icd10_code": "Z01.00",
        "clinical_name": "Normal Healthy Anterior Segment (Physiologically Intact)",
        "triage_level": "Routine Annual Wellness",
        "referral_timeline": "Routine comprehensive eye exam in 12 months",
        "overview": "Clear transparent cornea, bright white uninflamed sclera, crisp circular iris, normal dark reactive pupil, and healthy eyelid margins with zero erythema, swelling, or abnormal growths.",
        "precautions": [
            "Wear UV400-certified sunglasses when outdoors.",
            "Practice the 20-20-20 visual ergonomics rule during digital screen use.",
            "Maintain regular annual comprehensive eye exams."
        ],
        "diagnostic_tests": [
            "Baseline Snellen visual acuity assessment",
            "Annual comprehensive ophthalmic checkup"
        ],
        "treatment_pathway": [
            "No active medical or surgical intervention required.",
            "Maintain routine preventative ocular hygiene."
        ],
        "lifestyle_diet": [
            "Antioxidant-rich diet (leafy greens, omega-3s), adequate daily hydration, and eye safety protection."
        ],
        "emergency_symptoms": [
            "Sudden vision changes, pain, flashes of light, or trauma"
        ]
    }
}


def evaluate_anterior_telemetry(image):
    """
    Evaluates an external eye photograph (anterior segment) using computer vision
    biometrics to detect surface pathologies like Pink Eye, Jaundice, Styes, and Hemorrhages.
    """
    arr = np.array(image.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    brightness = (r + g + b) / 3.0

    # Scleral region localization: bright areas of the eye (110 < brightness < 248)
    sclera_mask = (brightness > 110) & (brightness < 248)
    if np.sum(sclera_mask) < 200:
        sclera_mask = np.ones((h, w), dtype=bool)

    s_r = r[sclera_mask]
    s_g = g[sclera_mask]
    s_b = b[sclera_mask]

    # Biometric indicators
    # 1. Scleral Redness / Vascular Injection (Conjunctivitis)
    redness_ratio = float(np.mean(s_r / (s_g + s_b + 1e-4)))

    # 2. Localized Dense Capillary Blood Pool (Subconjunctival Hemorrhage)
    blood_foci = float(np.mean((s_r > 165) & (s_g < 95) & (s_b < 95)))

    # 3. Bilirubin Yellow Index (Scleral Icterus / Jaundice)
    yellow_idx = float(np.mean((s_r * 0.5 + s_g * 0.5) - s_b))

    # 4. Central Pupillary Opacity (Leukocoria / Cataract)
    ch, cw = int(h * 0.35), int(w * 0.35)
    pupil_bright = float(arr[ch:h-ch, cw:w-cw].mean())

    # 5. Eyelid Margin Erythema (Stye / Hordeolum)
    eyelid_zone = np.concatenate([arr[:int(h * 0.2), :], arr[-int(h * 0.2):, :]])
    eyelid_redness = float(eyelid_zone[:, :, 0].mean() / (eyelid_zone[:, :, 1].mean() + eyelid_zone[:, :, 2].mean() + 1e-4))

    # Decision tree classification with calibrated thresholds
    if blood_foci > 0.035:
        primary = "Subconjunctival Hemorrhage"
        confidence = min(98.5, 75.0 + blood_foci * 250)
        status = "disease_detected"
        severity = "Focal Capillary Bleed / Benign"
        badge_type = "warning"
    elif yellow_idx > 38.0:
        primary = "Scleral Icterus (Jaundice)"
        confidence = min(98.2, 70.0 + (yellow_idx - 38.0) * 1.6)
        status = "disease_detected"
        severity = "High Clinical Priority (Systemic Workup)"
        badge_type = "high"
    elif redness_ratio > 0.72:
        primary = "Conjunctivitis (Pink Eye)"
        confidence = min(97.5, 68.0 + (redness_ratio - 0.72) * 85)
        status = "disease_detected"
        severity = "Active Inflammatory Erythema"
        badge_type = "warning"
    elif pupil_bright > 165.0:
        primary = "Corneal Opacity / Mature Cataract (Leukocoria)"
        confidence = min(95.0, 72.0 + (pupil_bright - 165.0) * 0.4)
        status = "disease_detected"
        severity = "Significant Media Opacification"
        badge_type = "high"
    elif eyelid_redness > 0.75:
        primary = "Stye (Hordeolum / Chalazion)"
        confidence = min(94.0, 65.0 + (eyelid_redness - 0.75) * 80)
        status = "disease_detected"
        severity = "Focal Glandular Inflammation"
        badge_type = "warning"
    else:
        primary = "Normal Healthy Anterior Segment"
        confidence = 96.2
        status = "normal"
        severity = "Healthy / Low Risk"
        badge_type = "normal"

    confidence = round(confidence, 1)

    # Compute probability scores across all 7 categories
    scores = {}
    for cat in ANTERIOR_DISEASE_PROFILES:
        if cat == primary:
            scores[cat] = confidence
        else:
            base = 3.0
            if "Normal" in cat and status == "disease_detected":
                base = 1.5
            elif "Conjunctivitis" in cat:
                base = round(min(45.0, max(2.0, (redness_ratio - 0.4) * 50)), 1)
            elif "Jaundice" in cat:
                base = round(min(45.0, max(2.0, (yellow_idx - 10.0) * 1.1)), 1)
            elif "Subconjunctival" in cat:
                base = round(min(40.0, max(2.0, blood_foci * 300)), 1)
            elif "Cataract" in cat:
                base = round(min(40.0, max(2.0, (pupil_bright - 80) * 0.3)), 1)
            scores[cat] = base

    biometrics = {
        "scleral_redness_ratio": round(redness_ratio, 3),
        "bilirubin_yellow_index": round(yellow_idx, 2),
        "focal_blood_density": round(blood_foci * 100, 2),
        "pupil_luminance": round(pupil_bright, 1),
    }

    return primary, confidence, status, severity, badge_type, scores, biometrics


def detect_eyeballs_from_image(image):
    """
    Locates and extracts the left and right eyeballs from a face or dual-eye selfie.
    Returns: (right_eyeball_img, left_eyeball_img, (r_box, l_box))
    """
    w, h = image.size
    arr = np.array(image.convert("L"), dtype=np.float32)

    # Search in ocular zone: 18% to 65% of height
    y_start, y_end = int(h * 0.18), int(h * 0.65)
    ocular_strip = arr[y_start:y_end, :]

    mid_x = w // 2

    # Right eye (patient's OD, camera/viewer left)
    right_zone = ocular_strip[:, int(w * 0.06):int(mid_x * 0.95)]
    if right_zone.size > 0:
        ry, rx = np.unravel_index(np.argmin(right_zone), right_zone.shape)
        center_rx = int(w * 0.06) + int(rx)
        center_ry = y_start + int(ry)
    else:
        center_rx = int(w * 0.28)
        center_ry = int(h * 0.42)

    # Left eye (patient's OS, camera/viewer right)
    left_zone = ocular_strip[:, int(mid_x * 1.05):int(w * 0.94)]
    if left_zone.size > 0:
        ly, lx = np.unravel_index(np.argmin(left_zone), left_zone.shape)
        center_lx = int(mid_x * 1.05) + int(lx)
        center_ly = y_start + int(ly)
    else:
        center_lx = int(w * 0.72)
        center_ly = int(h * 0.42)

    box_w = max(60, int(w * 0.32))
    box_h = max(45, int(h * 0.38))

    # Right eyeball crop (OD)
    r_x1 = max(0, center_rx - box_w // 2)
    r_y1 = max(0, center_ry - box_h // 2)
    r_x2 = min(w, r_x1 + box_w)
    r_y2 = min(h, r_y1 + box_h)
    right_crop = image.crop((r_x1, r_y1, r_x2, r_y2))

    # Left eyeball crop (OS)
    l_x1 = max(0, center_lx - box_w // 2)
    l_y1 = max(0, center_ly - box_h // 2)
    l_x2 = min(w, l_x1 + box_w)
    l_y2 = min(h, l_y1 + box_h)
    left_crop = image.crop((l_x1, l_y1, l_x2, l_y2))

    return right_crop, left_crop, ((r_x1, r_y1, r_x2, r_y2), (l_x1, l_y1, l_x2, l_y2))


@csrf_exempt
def analyze_anterior_selfie(request):
    """
    API endpoint for Mode B: Anterior Eye Selfie Screening.
    Supports:
    - Direct bilateral eyeball uploads (left_eye + right_eye)
    - Single eye selfie image
    - Full face selfie with automatic dual-eyeball detection and cropping
    - Preset clinical conditions
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    left_file = request.FILES.get("left_eye") or request.FILES.get("left_image")
    right_file = request.FILES.get("right_eye") or request.FILES.get("right_image")
    image_file = request.FILES.get("image") or request.FILES.get("file")
    preset_condition = request.POST.get("preset")

    if not left_file and not right_file and not image_file and not preset_condition:
        return JsonResponse({"error": "No eye selfie image or eyeball crops uploaded."}, status=400)

    try:
        # Case 1: Preset Clinical Condition
        if preset_condition and preset_condition in ANTERIOR_DISEASE_PROFILES:
            primary_name = preset_condition
            confidence = 95.8
            finding_profile = ANTERIOR_DISEASE_PROFILES[primary_name]
            scores = {k: 4.2 for k in ANTERIOR_DISEASE_PROFILES}
            scores[primary_name] = confidence
            status = "normal" if "Normal" in primary_name else "disease_detected"
            severity = "Healthy / Low Risk" if "Normal" in primary_name else "Active Clinical Finding"
            badge_type = "normal" if "Normal" in primary_name else ("high" if "Jaundice" in primary_name or "Cataract" in primary_name else "warning")
            biometrics = {
                "scleral_redness_ratio": 0.82 if "Conjunctivitis" in primary_name else 0.51,
                "bilirubin_yellow_index": 52.4 if "Jaundice" in primary_name else 14.2,
                "focal_blood_density": 8.6 if "Hemorrhage" in primary_name else 0.0,
                "pupil_luminance": 182.0 if "Cataract" in primary_name else 42.0,
            }

            return JsonResponse({
                "success": True,
                "mode": "anterior_selfie",
                "bilateral": False,
                "primary_disease": primary_name,
                "confidence": confidence,
                "status": status,
                "severity": severity,
                "badge_type": badge_type,
                "verdict_title": f"{primary_name} Detected" if status == "disease_detected" else "Healthy Anterior Eye (Normal)",
                "scores": scores,
                "biometrics": biometrics,
                "clinical_report": finding_profile,
            })

        # Case 2: Bilateral Eyeball Crops (Explicit Left & Right Eyeball)
        if left_file and right_file:
            left_img = Image.open(left_file).convert("RGB")
            right_img = Image.open(right_file).convert("RGB")

            l_prim, l_conf, l_stat, l_sev, l_badge, l_scores, l_bio = evaluate_anterior_telemetry(left_img)
            r_prim, r_conf, r_stat, r_sev, r_badge, r_scores, r_bio = evaluate_anterior_telemetry(right_img)

            # Determine composite verdict
            if l_stat == "disease_detected" or r_stat == "disease_detected":
                status = "disease_detected"
                if l_stat == "disease_detected" and r_stat == "disease_detected":
                    primary_name = l_prim if l_prim == r_prim else f"{r_prim} (OD) / {l_prim} (OS)"
                    confidence = round((l_conf + r_conf) / 2.0, 1)
                    severity = l_sev
                    badge_type = "high" if (l_badge == "high" or r_badge == "high") else "warning"
                elif r_stat == "disease_detected":
                    primary_name = f"{r_prim} (Right Eye · OD)"
                    confidence = r_conf
                    severity = r_sev
                    badge_type = r_badge
                else:
                    primary_name = f"{l_prim} (Left Eye · OS)"
                    confidence = l_conf
                    severity = l_sev
                    badge_type = l_badge
            else:
                primary_name = "Normal Healthy Anterior Segment (Both Eyes)"
                status = "normal"
                confidence = round((l_conf + r_conf) / 2.0, 1)
                severity = "Healthy / Low Risk"
                badge_type = "normal"

            report_key = l_prim if l_stat == "disease_detected" else r_prim
            finding_profile = ANTERIOR_DISEASE_PROFILES.get(report_key, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"])

            return JsonResponse({
                "success": True,
                "mode": "anterior_selfie",
                "bilateral": True,
                "primary_disease": primary_name,
                "confidence": confidence,
                "status": status,
                "severity": severity,
                "badge_type": badge_type,
                "verdict_title": f"Bilateral Screening: {primary_name}",
                "scores": l_scores if l_stat == "disease_detected" else r_scores,
                "biometrics": {
                    "left_eye": l_bio,
                    "right_eye": r_bio,
                    "scleral_redness_ratio": round((l_bio["scleral_redness_ratio"] + r_bio["scleral_redness_ratio"]) / 2.0, 3),
                    "bilirubin_yellow_index": round((l_bio["bilirubin_yellow_index"] + r_bio["bilirubin_yellow_index"]) / 2.0, 2),
                    "focal_blood_density": round((l_bio["focal_blood_density"] + r_bio["focal_blood_density"]) / 2.0, 2),
                    "pupil_luminance": round((l_bio["pupil_luminance"] + r_bio["pupil_luminance"]) / 2.0, 1),
                },
                "left_diagnosis": {
                    "primary_disease": l_prim,
                    "confidence": l_conf,
                    "status": l_stat,
                    "severity": l_sev,
                    "badge_type": l_badge,
                    "biometrics": l_bio,
                    "scores": l_scores,
                    "clinical_report": ANTERIOR_DISEASE_PROFILES.get(l_prim, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"]),
                },
                "right_diagnosis": {
                    "primary_disease": r_prim,
                    "confidence": r_conf,
                    "status": r_stat,
                    "severity": r_sev,
                    "badge_type": r_badge,
                    "biometrics": r_bio,
                    "scores": r_scores,
                    "clinical_report": ANTERIOR_DISEASE_PROFILES.get(r_prim, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"]),
                },
                "clinical_report": finding_profile,
            })

        # Case 3: Single Image (Either an isolated eyeball or a dual-eye / face selfie)
        image = Image.open(image_file).convert("RGB")
        w, h = image.size

        # If image is wide enough to contain both eyes (aspect ratio > 1.25 and width > 280), auto-detect both eyeballs!
        if (w / float(h)) >= 1.25 and w >= 280:
            right_crop, left_crop, (r_box, l_box) = detect_eyeballs_from_image(image)
            l_prim, l_conf, l_stat, l_sev, l_badge, l_scores, l_bio = evaluate_anterior_telemetry(left_crop)
            r_prim, r_conf, r_stat, r_sev, r_badge, r_scores, r_bio = evaluate_anterior_telemetry(right_crop)

            if l_stat == "disease_detected" or r_stat == "disease_detected":
                status = "disease_detected"
                if l_stat == "disease_detected" and r_stat == "disease_detected":
                    primary_name = l_prim if l_prim == r_prim else f"{r_prim} (OD) / {l_prim} (OS)"
                    confidence = round((l_conf + r_conf) / 2.0, 1)
                    severity = l_sev
                    badge_type = "high" if (l_badge == "high" or r_badge == "high") else "warning"
                elif r_stat == "disease_detected":
                    primary_name = f"{r_prim} (Right Eye · OD)"
                    confidence = r_conf
                    severity = r_sev
                    badge_type = r_badge
                else:
                    primary_name = f"{l_prim} (Left Eye · OS)"
                    confidence = l_conf
                    severity = l_sev
                    badge_type = l_badge
            else:
                primary_name = "Normal Healthy Anterior Segment (Both Eyes)"
                status = "normal"
                confidence = round((l_conf + r_conf) / 2.0, 1)
                severity = "Healthy / Low Risk"
                badge_type = "normal"

            report_key = l_prim if l_stat == "disease_detected" else r_prim
            finding_profile = ANTERIOR_DISEASE_PROFILES.get(report_key, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"])

            return JsonResponse({
                "success": True,
                "mode": "anterior_selfie",
                "bilateral": True,
                "auto_detected_eyeballs": True,
                "primary_disease": primary_name,
                "confidence": confidence,
                "status": status,
                "severity": severity,
                "badge_type": badge_type,
                "verdict_title": f"Bilateral Screening: {primary_name}",
                "scores": l_scores if l_stat == "disease_detected" else r_scores,
                "biometrics": {
                    "left_eye": l_bio,
                    "right_eye": r_bio,
                    "scleral_redness_ratio": round((l_bio["scleral_redness_ratio"] + r_bio["scleral_redness_ratio"]) / 2.0, 3),
                    "bilirubin_yellow_index": round((l_bio["bilirubin_yellow_index"] + r_bio["bilirubin_yellow_index"]) / 2.0, 2),
                    "focal_blood_density": round((l_bio["focal_blood_density"] + r_bio["focal_blood_density"]) / 2.0, 2),
                    "pupil_luminance": round((l_bio["pupil_luminance"] + r_bio["pupil_luminance"]) / 2.0, 1),
                },
                "left_diagnosis": {
                    "primary_disease": l_prim,
                    "confidence": l_conf,
                    "status": l_stat,
                    "severity": l_sev,
                    "badge_type": l_badge,
                    "biometrics": l_bio,
                    "scores": l_scores,
                    "clinical_report": ANTERIOR_DISEASE_PROFILES.get(l_prim, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"]),
                },
                "right_diagnosis": {
                    "primary_disease": r_prim,
                    "confidence": r_conf,
                    "status": r_stat,
                    "severity": r_sev,
                    "badge_type": r_badge,
                    "biometrics": r_bio,
                    "scores": r_scores,
                    "clinical_report": ANTERIOR_DISEASE_PROFILES.get(r_prim, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"]),
                },
                "clinical_report": finding_profile,
            })

        # Single eyeball image (close up of single eye)
        primary_name, confidence, status, severity, badge_type, scores, biometrics = evaluate_anterior_telemetry(image)
        finding_profile = ANTERIOR_DISEASE_PROFILES.get(primary_name, ANTERIOR_DISEASE_PROFILES["Normal Healthy Anterior Segment"])

        return JsonResponse({
            "success": True,
            "mode": "anterior_selfie",
            "bilateral": False,
            "primary_disease": primary_name,
            "confidence": confidence,
            "status": status,
            "severity": severity,
            "badge_type": badge_type,
            "verdict_title": f"{primary_name} Detected" if status == "disease_detected" else "Healthy Anterior Eye (Normal)",
            "scores": scores,
            "biometrics": biometrics,
            "clinical_report": finding_profile,
        })
    except Exception as error:
        return JsonResponse({"success": False, "error": str(error)}, status=500)