import os

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from dataset import ODIRDataset, train_transform, val_transform
from model import VisionAIModel


# ============================================================
# 1. PATHS (Dynamically resolved relative to this file)
# ============================================================

ML_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(ML_DIR))

TRAIN_EXCEL = os.path.join(PROJECT_ROOT, "dataset", "ODIR-5K", "ODIR-5K", "train.xlsx")
VAL_EXCEL = os.path.join(PROJECT_ROOT, "dataset", "ODIR-5K", "ODIR-5K", "val.xlsx")
IMAGE_DIR = os.path.join(PROJECT_ROOT, "dataset", "ODIR-5K", "ODIR-5K", "Training Images")
WEIGHTS_DIR = os.path.join(ML_DIR, "weights")

os.makedirs(WEIGHTS_DIR, exist_ok=True)


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
# 3. DATASETS
# ============================================================

train_dataset = ODIRDataset(
    TRAIN_EXCEL,
    IMAGE_DIR,
    transform=train_transform
)

val_dataset = ODIRDataset(
    VAL_EXCEL,
    IMAGE_DIR,
    transform=val_transform
)

print("Training samples:", len(train_dataset))
print("Validation samples:", len(val_dataset))


# ============================================================
# 4. DATALOADERS
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0
)

val_loader = DataLoader(
    val_dataset,
    batch_size=16,
    shuffle=False,
    num_workers=0
)


# ============================================================
# 5. MODEL
# ============================================================

model = VisionAIModel(
    num_classes=8
).to(device)


# ============================================================
# 6. LOSS
# ============================================================

criterion = nn.BCEWithLogitsLoss()


# ============================================================
# 7. OPTIMIZER
# ============================================================

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=0.0001,
    weight_decay=0.0001
)


# ============================================================
# 8. TRAINING SETTINGS
# ============================================================

EPOCHS = 5

best_val_loss = float("inf")


# ============================================================
# 9. TRAINING LOOP
# ============================================================

for epoch in range(EPOCHS):

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    print(f"\n--- Starting Epoch {epoch + 1}/{EPOCHS} ---")
    model.train()
    train_loss = 0.0

    for batch_idx, batch in enumerate(train_loader):

        images = batch["image"].to(device)

        labels = batch["labels"].to(
            device=device,
            dtype=torch.float32
        )

        # Clear previous gradients
        optimizer.zero_grad()

        # Forward pass
        outputs = model(images)

        # Calculate loss
        loss = criterion(
            outputs,
            labels
        )

        # Backpropagation
        loss.backward()

        # Update model weights
        optimizer.step()

        train_loss += loss.item()

        # Periodic live progress print
        if (batch_idx + 1) % 25 == 0 or (batch_idx + 1) == len(train_loader):
            pct = ((batch_idx + 1) / len(train_loader)) * 100
            print(f"  Epoch [{epoch + 1}/{EPOCHS}] | Step [{batch_idx + 1:3d}/{len(train_loader)}] ({pct:5.1f}%) | Batch Loss: {loss.item():.4f}")

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
                dtype=torch.float32
            )

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            val_loss += loss.item()

    val_loss /= len(val_loader)


    # --------------------------------------------------------
    # PRINT RESULTS
    # --------------------------------------------------------

    print(
        f"\n>> Epoch [{epoch + 1}/{EPOCHS}] Summary -> "
        f"Train Loss: {train_loss:.4f} | "
        f"Val Loss: {val_loss:.4f}"
    )


    # --------------------------------------------------------
    # SAVE BEST MODEL
    # --------------------------------------------------------

    if val_loss < best_val_loss:

        best_val_loss = val_loss

        checkpoint_path = os.path.abspath(
            os.path.join(
                WEIGHTS_DIR,
                "vision_ai_vit.pth"
            )
        )

        state_dict = {
            key: value.detach().cpu()
            for key, value in model.state_dict().items()
        }

        torch.save(
            state_dict,
            checkpoint_path
        )

        print("Best model saved!")
        print("Saved to:", checkpoint_path)
        print("File exists:", os.path.exists(checkpoint_path))
        print(
            "File size:",
            os.path.getsize(checkpoint_path),
            "bytes"
        )


# ============================================================
# 10. TRAINING COMPLETE
# ============================================================

print()
print("Training completed!")
print("Best validation loss:", best_val_loss)