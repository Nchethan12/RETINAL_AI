import torch
import torch.nn as nn
from torchvision.models import vit_b_16, ViT_B_16_Weights


class VisionAIModel(nn.Module):

    def __init__(self, num_classes=8):

        super().__init__()

        # Load pretrained ViT-B/16
        self.model = vit_b_16(
            weights=ViT_B_16_Weights.DEFAULT
        )

        # Original classifier input size
        in_features = self.model.heads.head.in_features

        # Replace ImageNet classifier
        self.model.heads.head = nn.Linear(
            in_features,
            num_classes
        )

    def forward(self, x):

        return self.model(x)


if __name__ == "__main__":

    model = VisionAIModel()

    print("Model created successfully!")

    x = torch.randn(
        1,
        3,
        224,
        224
    )

    with torch.no_grad():

        output = model(x)

    print("Input shape :", x.shape)
    print("Output shape:", output.shape)
    print("Output      :", output)