import os

import pandas as pd
from PIL import Image

import torch
from torch.utils.data import Dataset
from torchvision import transforms

train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


class ODIRDataset(Dataset):

    LABELS = ["N", "D", "G", "C", "A", "H", "M", "O"]

    def __init__(self, excel_file, image_dir, transform=None):

        self.data = pd.read_excel(excel_file)
        self.image_dir = image_dir
        self.transform = transform
        self.samples = []

        # Go through every patient
        for _, row in self.data.iterrows():

            # -------------------------
            # LEFT EYE
            # -------------------------

            left_image = row["Left-Fundus"]
            left_keywords = row["Left-Diagnostic Keywords"]

            if isinstance(left_image, str):

                self.samples.append({
                    "patient_id": row["ID"],
                    "eye": "left",
                    "filename": left_image,
                    "keywords": left_keywords,
                    "labels": self.create_labels(left_keywords)
                })

            # -------------------------
            # RIGHT EYE
            # -------------------------

            right_image = row["Right-Fundus"]
            right_keywords = row["Right-Diagnostic Keywords"]

            if isinstance(right_image, str):

                self.samples.append({
                    "patient_id": row["ID"],
                    "eye": "right",
                    "filename": right_image,
                    "keywords": right_keywords,
                    "labels": self.create_labels(right_keywords)
                })

    # =====================================================
    # Convert diagnostic keywords into our 8 labels
    # =====================================================

    def create_labels(self, keywords):

        text = str(keywords).lower()

        labels = [0.0] * 8

        # N = Normal
        if "normal fundus" in text:
            labels[0] = 1.0

        # D = Diabetic Retinopathy
        if (
            "diabetic" in text
            or "non proliferative retinopathy" in text
            or "nonproliferative retinopathy" in text
            or "proliferative retinopathy" in text
        ):
            labels[1] = 1.0

        # G = Glaucoma
        if "glaucoma" in text:
            labels[2] = 1.0

        # C = Cataract
        if "cataract" in text:
            labels[3] = 1.0

        # A = AMD
        if (
            "age-related macular" in text
            or "amd" in text
            or "drusen" in text
        ):
            labels[4] = 1.0

        # H = Hypertension
        if (
            "hypertensive retinopathy" in text
            or "hypertension" in text
        ):
            labels[5] = 1.0

        # M = Myopia
        if (
            "myopia" in text
            or "myopic" in text
        ):
            labels[6] = 1.0

        # O = Other
        other_keywords = [
            "epiretinal membrane",
            "retinal pigmentation",
            "vitreous degeneration",
            "retinal artery occlusion",
            "retinal vein occlusion",
            "branch retinal artery occlusion",
            "myelinated nerve fibers",
            "laser spot",
            "retinal detachment"
        ]

        if any(keyword in text for keyword in other_keywords):
            labels[7] = 1.0

        return labels

    # =====================================================
    # Number of samples
    # =====================================================

    def __len__(self):

        return len(self.samples)

    # =====================================================
    # Get one sample
    # =====================================================

    def __getitem__(self, index):

        sample = self.samples[index]

        image_path = os.path.join(
            self.image_dir,
            sample["filename"]
        )

        image = Image.open(image_path).convert("RGB")
        if self.transform:
            image = self.transform(image)


        labels = torch.tensor(
            sample["labels"],
            dtype=torch.float32
        )

        return {
            "image": image,
            "patient_id": sample["patient_id"],
            "eye": sample["eye"],
            "filename": sample["filename"],
            "keywords": sample["keywords"],
            "labels": labels
        }