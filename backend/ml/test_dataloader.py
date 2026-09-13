from torch.utils.data import DataLoader

from dataset import ODIRDataset, train_transform


EXCEL_FILE = "../../dataset/ODIR-5K/ODIR-5K/train.xlsx"
IMAGE_DIR = "../../dataset/ODIR-5K/ODIR-5K/Training Images"


dataset = ODIRDataset(
    EXCEL_FILE,
    IMAGE_DIR,
    transform=train_transform
)


loader = DataLoader(
    dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0
)


batch = next(iter(loader))


print("Images shape :", batch["image"].shape)
print("Labels shape :", batch["labels"].shape)
print("Eyes         :", batch["eye"])
print("Patient IDs  :", batch["patient_id"])
print("Filenames    :", batch["filename"])