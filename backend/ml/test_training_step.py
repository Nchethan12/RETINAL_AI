import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from dataset import ODIRDataset, train_transform
from model import VisionAIModel


EXCEL_FILE = "../../dataset/ODIR-5K/ODIR-5K/train.xlsx"
IMAGE_DIR = "../../dataset/ODIR-5K/ODIR-5K/Training Images"


# Device
if torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

print("Using device:", device)


# Dataset
dataset = ODIRDataset(
    EXCEL_FILE,
    IMAGE_DIR,
    transform=train_transform
)


# DataLoader
loader = DataLoader(
    dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0
)


# Get one batch
batch = next(iter(loader))

images = batch["image"].to(device)

labels = batch["labels"].to(
    device=device,
    dtype=torch.float32
)


# Model
model = VisionAIModel(
    num_classes=8
).to(device)


# Loss
criterion = nn.BCEWithLogitsLoss()


# Optimizer
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=0.0001
)


# -------------------------------
# FIRST FORWARD PASS
# -------------------------------

outputs1 = model(images)

loss1 = criterion(
    outputs1,
    labels
)

print("Loss before update:", loss1.item())


# -------------------------------
# BACKPROPAGATION
# -------------------------------

optimizer.zero_grad()

loss1.backward()

optimizer.step()

print("Weights updated!")


# -------------------------------
# SECOND FORWARD PASS
# -------------------------------

outputs2 = model(images)

loss2 = criterion(
    outputs2,
    labels
)

print("Loss after update:", loss2.item())