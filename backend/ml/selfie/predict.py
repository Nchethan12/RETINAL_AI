import os
import torch
from PIL import Image

from ml.selfie.dataset import AnteriorEyeDataset, val_transform
from ml.selfie.model import AnteriorEyeModel

# ============================================================
# 1. SETTINGS
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WEIGHTS_PATH = os.path.join(BASE_DIR, "ml", "selfie", "weights", "anterior_eye_resnet50.pth")
DEFAULT_IMAGE = os.path.join(
    os.path.dirname(BASE_DIR),
    "dataset",
    "anterior-eye",
    "Original_Slit-lamp_Images",
    "995.png",
)

LABELS = AnteriorEyeDataset.LABELS

# ============================================================
# 2. DEVICE
# ============================================================

if torch.backends.mps.is_available():
    device = torch.device("mps")
elif torch.cuda.is_available():
    device = torch.device("cuda")
else:
    device = torch.device("cpu")

print("Using device:", device)

# ============================================================
# 3. LOAD IMAGE
# ============================================================

image_path = DEFAULT_IMAGE
if not os.path.exists(image_path):
    raise FileNotFoundError(f"Sample image not found at {image_path}")

raw_image = Image.open(image_path).convert("RGB")
tensor_image = val_transform(raw_image).unsqueeze(0).to(device)
print(f"Loaded image: {image_path} (Shape: {tensor_image.shape})")

# ============================================================
# 4. LOAD MODEL
# ============================================================

model = AnteriorEyeModel(num_classes=len(LABELS)).to(device)

if os.path.exists(WEIGHTS_PATH):
    state_dict = torch.load(WEIGHTS_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    print(f"Loaded trained weights from: {WEIGHTS_PATH}")
else:
    print(f"Weights file not found at {WEIGHTS_PATH}; using pretrained ResNet-50 backbone.")

model.eval()

# ============================================================
# 5. PREDICTION
# ============================================================

with torch.no_grad():
    logits = model(tensor_image)
    probabilities = torch.sigmoid(logits)[0].cpu()

# ============================================================
# 6. RESULTS
# ============================================================

print("\nAnterior Eye Lesion Prediction")
print("------------------------------")
for label, prob in zip(LABELS, probabilities):
    print(f"{label:35s}: {prob.item() * 100:.2f}%")

