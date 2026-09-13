import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights


class AnteriorEyeModel(nn.Module):

    def __init__(self, num_classes=14):
        super().__init__()

        self.backbone = resnet50(
            weights=ResNet50_Weights.DEFAULT
        )

        in_features = self.backbone.fc.in_features

        self.backbone.fc = nn.Linear(
            in_features,
            num_classes
        )

    def forward(self, x):
        return self.backbone(x)