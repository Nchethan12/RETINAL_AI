import torch
from PIL import Image
from torchvision import transforms

from model import VisionAIModel


# ============================================================
# 1. SETTINGS
# ============================================================

MODEL_PATH = "weights/vision_ai_vit.pth"

IMAGE_PATH = "../../dataset/ODIR-5K/ODIR-5K/Training Images/1_left.jpg"

LABELS = [
    "Normal",
    "Diabetic Retinopathy",
    "Glaucoma",
    "Cataract",
    "AMD",
    "Hypertension",
    "Myopia",
    "Other"
]


# ============================================================
# 2. DEVICE
# ============================================================

if torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

print("Using device:", device)


# ============================================================
# 3. PREPROCESSING
# ============================================================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# 4. LOAD IMAGE
# ============================================================

image = Image.open(IMAGE_PATH).convert("RGB")

image = transform(image)

# Add batch dimension
image = image.unsqueeze(0)

image = image.to(device)

print("Input shape:", image.shape)


# ============================================================
# 5. LOAD MODEL
# ============================================================

model = VisionAIModel(
    num_classes=8
).to(device)

state_dict = torch.load(
    MODEL_PATH,
    map_location="cpu"
)

model.load_state_dict(state_dict)

model.eval()

print("Model loaded!")


# ============================================================
# 6. PREDICTION
# ============================================================

with torch.no_grad():

    logits = model(image)

    probabilities = torch.sigmoid(logits)

    probabilities = probabilities[0].cpu()


# ============================================================
# 7. DISPLAY RESULTS
# ============================================================

print()
print("Vision AI Prediction")
print("--------------------")

for label, probability in zip(
    LABELS,
    probabilities
):

    print(
        f"{label:25s}: {probability.item() * 100:.2f}%"
    )