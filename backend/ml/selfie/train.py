import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset

from ml.selfie.dataset import (
    AnteriorEyeDataset,
    train_transform,
    val_transform,
)

from ml.selfie.model import AnteriorEyeModel


# ============================================================
# PATHS
# ============================================================

ANNOTATIONS = "../dataset/anterior-eye/Annotations.csv"

IMAGE_DIR = "../dataset/anterior-eye/Original_Slit-lamp_Images"

WEIGHTS_DIR = "ml/selfie/weights"

os.makedirs(WEIGHTS_DIR, exist_ok=True)


# ============================================================
# DEVICE
# ============================================================

if torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

print("Using device:", device)


# ============================================================
# CREATE TWO DATASETS
# ============================================================

train_base = AnteriorEyeDataset(
    ANNOTATIONS,
    IMAGE_DIR,
    transform=train_transform,
)

val_base = AnteriorEyeDataset(
    ANNOTATIONS,
    IMAGE_DIR,
    transform=val_transform,
)


# Make sure both datasets have the same ordering
assert (
    [x["filename"] for x in train_base.samples]
    ==
    [x["filename"] for x in val_base.samples]
)

total_samples = len(train_base)

print("Total samples:", total_samples)


# ============================================================
# TRAIN / VALIDATION INDICES
# ============================================================

generator = torch.Generator().manual_seed(42)

indices = torch.randperm(
    total_samples,
    generator=generator
).tolist()

train_size = int(0.8 * total_samples)

train_indices = indices[:train_size]
val_indices = indices[train_size:]


train_dataset = Subset(
    train_base,
    train_indices
)

val_dataset = Subset(
    val_base,
    val_indices
)


print("Training samples:", len(train_dataset))
print("Validation samples:", len(val_dataset))


# ============================================================
# COLLATE FUNCTION
# ============================================================

def collate_fn(batch):

    return {
        "image": torch.stack(
            [item["image"] for item in batch]
        ),

        "labels": torch.stack(
            [item["labels"] for item in batch]
        ),

        "filename": [
            item["filename"]
            for item in batch
        ],

        "lesions": [
            item["lesions"]
            for item in batch
        ],
    }


# ============================================================
# DATALOADERS
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0,
    collate_fn=collate_fn,
)

val_loader = DataLoader(
    val_dataset,
    batch_size=16,
    shuffle=False,
    num_workers=0,
    collate_fn=collate_fn,
)


# ============================================================
# MODEL
# ============================================================

model = AnteriorEyeModel(
    num_classes=14
).to(device)


# ============================================================
# LOSS
# ============================================================

criterion = nn.BCEWithLogitsLoss()


# ============================================================
# OPTIMIZER
# ============================================================

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=0.0001,
    weight_decay=0.0001,
)


# ============================================================
# TRAINING
# ============================================================

EPOCHS = 5

best_val_loss = float("inf")


for epoch in range(EPOCHS):

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    model.train()

    train_loss = 0.0

    for batch in train_loader:

        images = batch["image"].to(device)

        labels = batch["labels"].to(
            device=device,
            dtype=torch.float32,
        )

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(
            outputs,
            labels,
        )

        loss.backward()

        optimizer.step()

        train_loss += loss.item()

    train_loss /= len(train_loader)


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    model.eval()

    val_loss = 0.0

    with torch.no_grad():

        for batch in val_loader:

            images = batch["image"].to(device)

            labels = batch["labels"].to(
                device=device,
                dtype=torch.float32,
            )

            outputs = model(images)

            loss = criterion(
                outputs,
                labels,
            )

            val_loss += loss.item()

    val_loss /= len(val_loader)


    # --------------------------------------------------------
    # PRINT
    # --------------------------------------------------------

    print(
        f"Epoch [{epoch + 1}/{EPOCHS}] "
        f"Train Loss: {train_loss:.4f} "
        f"Val Loss: {val_loss:.4f}"
    )


    # --------------------------------------------------------
    # SAVE BEST
    # --------------------------------------------------------

    if val_loss < best_val_loss:

        best_val_loss = val_loss

        model_path = os.path.join(
            WEIGHTS_DIR,
            "anterior_eye_resnet50.pth",
        )

        state_dict = {
            key: value.detach().cpu()
            for key, value in model.state_dict().items()
        }

        torch.save(
            state_dict,
            model_path,
        )

        print(
            "Best model saved:",
            os.path.abspath(model_path),
        )


print()
print("Training completed.")
print(
    "Best validation loss:",
    best_val_loss
)