import json
import os

import pandas as pd
import torch

from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2,
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


class AnteriorEyeDataset(Dataset):

    LABELS = [
        "Corneal / Conjunctival tumor",
        "Pigmented nevus",
        "Pinguecula",
        "Conjunctival injection",
        "Corneal dystrophy",
        "Subconjunctival hemorrhage",
        "Keratitis",
        "Cataract",
        "Pterygium",
        "Conjunctival cyst",
        "Intraocular lens",
        "Corneal scarring",
        "Lens dislocation",
        "Lens dislocation/Cataract",
    ]

    LABEL_TO_INDEX = {
        label: index
        for index, label in enumerate(LABELS)
    }

    def __init__(
        self,
        annotations_file,
        image_dir,
        transform=None,
    ):
        self.annotations_file = annotations_file
        self.image_dir = image_dir
        self.transform = transform

        # Read CSV
        self.data = pd.read_csv(
            annotations_file
        )

        # Extract lesion from JSON
        self.data["lesion"] = (
            self.data["attributes"]
            .apply(self.extract_lesion)
        )

        # ----------------------------------------------------
        # ALL images, not only lesion images
        # ----------------------------------------------------

        all_filenames = sorted(
            self.data["filename"]
            .dropna()
            .unique()
        )

        # ----------------------------------------------------
        # Group/deduplicate lesions for each image
        # ----------------------------------------------------

        lesion_data = self.data[
            self.data["lesion"] != ""
        ]

        grouped_lesions = (
            lesion_data
            .groupby("filename")["lesion"]
            .apply(
                lambda values: sorted(
                    set(values)
                )
            )
            .to_dict()
        )

        self.samples = []

        # ----------------------------------------------------
        # One sample per image
        # ----------------------------------------------------

        for filename in all_filenames:

            image_path = os.path.join(
                self.image_dir,
                filename,
            )

            if not os.path.isfile(image_path):
                continue

            lesions = grouped_lesions.get(
                filename,
                []
            )

            labels = self.create_label_vector(
                lesions
            )

            self.samples.append({
                "filename": filename,
                "image_path": image_path,
                "lesions": lesions,
                "labels": labels,
            })

    # ========================================================
    # Extract lesion from JSON
    # ========================================================

    @staticmethod
    def extract_lesion(attributes):

        try:
            data = json.loads(attributes)

            return str(
                data.get("lesion", "")
            ).strip()

        except (
            json.JSONDecodeError,
            TypeError,
        ):
            return ""

    # ========================================================
    # Multi-label vector
    # ========================================================

    def create_label_vector(self, lesions):

        labels = torch.zeros(
            len(self.LABELS),
            dtype=torch.float32,
        )

        for lesion in lesions:

            if lesion in self.LABEL_TO_INDEX:

                index = self.LABEL_TO_INDEX[
                    lesion
                ]

                labels[index] = 1.0

        return labels

    # ========================================================
    # Length
    # ========================================================

    def __len__(self):

        return len(self.samples)

    # ========================================================
    # Get sample
    # ========================================================

    def __getitem__(self, index):

        sample = self.samples[index]

        image = Image.open(
            sample["image_path"]
        ).convert("RGB")

        if self.transform is not None:
            image = self.transform(image)

        return {
            "image": image,
            "labels": sample["labels"],
            "filename": sample["filename"],
            "lesions": sample["lesions"],
        }