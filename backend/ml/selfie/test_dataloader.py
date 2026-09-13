from torch.utils.data import DataLoader

from ml.selfie.dataset import (
    AnteriorEyeDataset,
    train_transform,
)


ANNOTATIONS = "../dataset/anterior-eye/Annotations.csv"

IMAGE_DIR = "../dataset/anterior-eye/Original_Slit-lamp_Images"


dataset = AnteriorEyeDataset(
    ANNOTATIONS,
    IMAGE_DIR,
    transform=train_transform
)


loader = DataLoader(
    dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0,
    collate_fn=lambda batch: {
        "image": __import__("torch").stack(
            [item["image"] for item in batch]
        ),
        "labels": __import__("torch").stack(
            [item["labels"] for item in batch]
        ),
        "filename": [
            item["filename"] for item in batch
        ],
        "lesions": [
            item["lesions"] for item in batch
        ],
    },
)


batch = next(iter(loader))

print("Dataset samples:", len(dataset))
print("Images shape:", batch["image"].shape)
print("Labels shape:", batch["labels"].shape)
print("First filename:", batch["filename"][0])
print("First lesions:", batch["lesions"][0])
print("First labels:", batch["labels"][0])