"""
Vision AI — Retinal Explainability Module (ViT-B/16 Grad-CAM)
Intelligent Retinal & Anterior Ophthalmic Screening Platform

This module implements a Vision Transformer-compatible explainability layer
using patch-token activations and exact gradients from the ViT encoder layers.
It computes class-specific attribution heatmaps, aligns them with the original
fundus photograph dimensions, and produces alpha-blended clinical overlays.
"""

import io
import base64
import logging
from typing import Dict, Any, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import transforms

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    cv2 = None
    HAS_OPENCV = False

try:
    import scipy.ndimage as ndimage
    HAS_SCIPY = True
except ImportError:
    ndimage = None
    HAS_SCIPY = False

logger = logging.getLogger(__name__)


def _build_jet_lut() -> np.ndarray:
    """Builds a 256-color JET colormap lookup table in pure NumPy."""
    lut = np.zeros((256, 3), dtype=np.uint8)
    for i in range(256):
        x = i / 255.0
        r = np.clip(1.5 - abs(4.0 * x - 3.0), 0.0, 1.0)
        g = np.clip(1.5 - abs(4.0 * x - 2.0), 0.0, 1.0)
        b = np.clip(1.5 - abs(4.0 * x - 1.0), 0.0, 1.0)
        lut[i] = [int(r * 255), int(g * 255), int(b * 255)]
    return lut


JET_LUT = _build_jet_lut()

# Canonical 8 ODIR-5K retinal disease classes
LABELS = [
    "Normal",
    "Diabetic Retinopathy",
    "Glaucoma",
    "Cataract",
    "AMD",
    "Hypertension",
    "Myopia",
    "Other",
]

# Standard ViT-B/16 input resolution
VIT_INPUT_SIZE = (224, 224)

# Default preprocessing transform
DEFAULT_TRANSFORM = transforms.Compose([
    transforms.Resize(VIT_INPUT_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

# Clinical attribution guidance per pathology
CLINICAL_ATTRIBUTION_GUIDES = {
    "Normal": (
        "AI attention is uniformly distributed across physiological retinal landmarks "
        "(macula, vascular arcades, and optic disc) with an absence of focal pathological lesion clusters."
    ),
    "Diabetic Retinopathy": (
        "High model attribution is concentrated on microvascular alterations along the retinal "
        "vascular arcades and posterior pole (consistent with microaneurysms, hemorrhages, or lipid exudates)."
    ),
    "Glaucoma": (
        "High model attribution is concentrated predominantly on the optic nerve head and neuroretinal rim "
        "(consistent with cup-to-disc ratio enlargement and peripapillary nerve fiber layer changes)."
    ),
    "Cataract": (
        "Model attribution displays diffuse, generalized optical media attenuation patterns "
        "consistent with crystalline lens nuclear or cortical opacification scattering light across the pupil."
    ),
    "AMD": (
        "High model attribution is concentrated in the central anatomical macula and foveal avascular zone "
        "(consistent with drusen accumulation, retinal pigment epithelium changes, or macular atrophy)."
    ),
    "Hypertension": (
        "High model attribution aligns with retinal arteriolar paths, arteriovenous crossing sites, "
        "and focal vascular narrowing characteristic of hypertensive arteriopathy."
    ),
    "Myopia": (
        "Model attribution highlights peripapillary chorioretinal atrophy, tessellated fundus patterns, "
        "and posterior pole elongation typical of high/pathological myopia."
    ),
    "Other": (
        "High model attribution highlights focal atypical retinal lesions, pigmentary changes, "
        "or structural abnormalities deviating from standard physiological anatomy."
    ),
}

CLINICAL_DISCLAIMER = (
    "AI-highlighted regions represent anatomical areas receiving higher model attribution for this prediction. "
    "Explainability visualization is provided to support clinical interpretation and does not constitute a definitive medical diagnosis."
)


def image_to_base64(image_np: np.ndarray, format: str = "JPEG", quality: int = 88) -> str:
    """Encode an RGB numpy array image into a Base64 data URL."""
    pil_img = Image.fromarray(image_np)
    buf = io.BytesIO()
    pil_img.save(buf, format=format, quality=quality)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/jpeg" if format.upper() == "JPEG" else "image/png"
    return f"data:{mime};base64,{encoded}"


class ViTExplainability:
    """
    Vision Transformer (ViT-B/16) Explainability Service.
    
    Extracts spatial patch token activations from the transformer encoder blocks
    and computes class-specific Grad-CAM attributions using exact autograd gradients.
    """

    def __init__(
        self,
        model: nn.Module,
        device: Optional[torch.device] = None,
        target_layer_indices: Tuple[int, ...] = (-1, -2),
    ):
        """
        Initialize the explainer with a loaded ViT model instance.
        
        Args:
            model: Existing loaded VisionAIModel or torchvision VisionTransformer instance.
            device: Target torch device (MPS, CUDA, or CPU). If None, inferred from model parameters.
            target_layer_indices: Negative or positive indices of encoder blocks to hook.
                                  Default (-1, -2) fuses the last two encoder blocks for optimal
                                  semantic and structural localization.
        """
        self.model = model
        self.device = device or next(model.parameters()).device
        self.vit = model.model if hasattr(model, "model") else model
        self.target_layer_indices = target_layer_indices
        self.transform = DEFAULT_TRANSFORM

    def _get_target_modules(self) -> List[Tuple[str, nn.Module]]:
        """Resolve the target layer normalization modules inside the encoder blocks."""
        encoder_layers = self.vit.encoder.layers
        num_layers = len(encoder_layers)
        targets = []
        for idx in self.target_layer_indices:
            actual_idx = idx if idx >= 0 else num_layers + idx
            if 0 <= actual_idx < num_layers:
                block = encoder_layers[actual_idx]
                # ln_1 normalizes tokens entering multi-head self-attention
                target_submodule = getattr(block, "ln_1", block)
                targets.append((f"block_{actual_idx}", target_submodule))
        return targets

    def compute_patch_attribution(
        self,
        input_tensor: torch.Tensor,
        target_class_index: int,
    ) -> np.ndarray:
        """
        Computes 14x14 spatial patch attributions for a given class index.
        
        Returns:
            Normalized 14x14 numpy array with values in [0.0, 1.0].
        """
        target_modules = self._get_target_modules()
        if not target_modules:
            raise ValueError("No valid transformer encoder blocks found to hook.")

        saved_activations: Dict[str, torch.Tensor] = {}
        hook_handles = []

        def make_forward_hook(name: str):
            def hook(module, inp, out):
                saved_activations[name] = out
            return hook

        try:
            # Register forward hooks safely
            for name, module in target_modules:
                handle = module.register_forward_hook(make_forward_hook(name))
                hook_handles.append(handle)

            # Ensure gradients are enabled for this pass even if called from a no_grad scope
            with torch.enable_grad():
                # Prepare tensor with grad tracking
                x = input_tensor.to(self.device).clone().detach().requires_grad_(True)
                self.model.zero_grad(set_to_none=True)

                # Forward inference pass
                logits = self.model(x)

                if target_class_index < 0 or target_class_index >= logits.shape[-1]:
                    raise IndexError(f"Target class index {target_class_index} out of range (0-{logits.shape[-1] - 1}).")

                target_logit = logits[0, target_class_index]

                # Compute exact gradients with respect to saved token activations
                act_tensors = [saved_activations[name] for name, _ in target_modules]
                grads = torch.autograd.grad(
                    outputs=target_logit,
                    inputs=act_tensors,
                    retain_graph=False,
                    create_graph=False,
                )

        finally:
            # Safely remove all registered hooks immediately
            for handle in hook_handles:
                try:
                    handle.remove()
                except Exception:
                    pass
            # Clear model gradients
            self.model.zero_grad(set_to_none=True)

        # Process patch tokens across hooked layers
        layer_cams = []
        for (name, _), act, grad in zip(target_modules, act_tensors, grads):
            # Token 0 is [CLS]; tokens 1:197 are spatial patches (196 = 14x14)
            patch_act = act[0, 1:, :]  # Shape: (196, 768)
            patch_grad = grad[0, 1:, :]  # Shape: (196, 768)

            # Channel importance weights: Global average of gradients across patches
            weights = patch_grad.mean(dim=0)  # Shape: (768,)

            # Weighted linear combination of patch features
            cam = torch.matmul(patch_act, weights)  # Shape: (196,)
            cam = torch.relu(cam)  # Discard negative contributions

            cam_np = cam.reshape(14, 14).detach().cpu().numpy().astype(np.float32)

            # Normalize layer CAM
            cam_min, cam_max = cam_np.min(), cam_np.max()
            if cam_max > cam_min:
                cam_np = (cam_np - cam_min) / (cam_max - cam_min)
            else:
                cam_np = np.zeros_like(cam_np)

            layer_cams.append(cam_np)

        # Multi-layer fusion (equal or weighted combination of selected blocks)
        if len(layer_cams) == 1:
            fused_cam = layer_cams[0]
        else:
            fused_cam = np.mean(layer_cams, axis=0)

        fused_min, fused_max = fused_cam.min(), fused_cam.max()
        if fused_max > fused_min:
            fused_cam = (fused_cam - fused_min) / (fused_max - fused_min)
        else:
            fused_cam = np.zeros_like(fused_cam)

        return fused_cam

    def generate_heatmap_and_overlay(
        self,
        cam_14x14: np.ndarray,
        original_image: Image.Image,
        alpha: float = 0.42,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Scales the 14x14 patch CAM to the original image dimensions,
        applies smooth Gaussian filtering and JET colormap, and blends
        an overlay preserving the black fundus camera boundary.
        
        Returns:
            (colored_heatmap_rgb: np.ndarray, overlay_rgb: np.ndarray)
        """
        orig_w, orig_h = original_image.size
        orig_np = np.array(original_image.convert("RGB"))

        # Upscale and smooth patch CAM to original image resolution
        if HAS_OPENCV and cv2 is not None:
            cam_resized = cv2.resize(cam_14x14, (orig_w, orig_h), interpolation=cv2.INTER_CUBIC)
            cam_resized = np.clip(cam_resized, 0.0, 1.0)
            k_size = max(15, (int(min(orig_w, orig_h) * 0.04) // 2) * 2 + 1)
            cam_smooth = cv2.GaussianBlur(cam_resized, (k_size, k_size), 0)
        else:
            pil_cam = Image.fromarray((cam_14x14 * 255.0).astype(np.uint8))
            pil_resized = pil_cam.resize((orig_w, orig_h), resample=Image.Resampling.BICUBIC)
            cam_resized = np.array(pil_resized, dtype=np.float32) / 255.0
            if HAS_SCIPY and ndimage is not None:
                sigma = max(3.0, min(orig_w, orig_h) * 0.015)
                cam_smooth = ndimage.gaussian_filter(cam_resized, sigma=sigma)
            else:
                cam_smooth = cam_resized

        s_min, s_max = cam_smooth.min(), cam_smooth.max()
        if s_max > s_min:
            cam_smooth = (cam_smooth - s_min) / (s_max - s_min)
        else:
            cam_smooth = np.zeros_like(cam_smooth)

        # Colormap generation (JET: blue=low, yellow=medium, red=peak attribution)
        heatmap_u8 = (cam_smooth * 255.0).astype(np.uint8)
        if HAS_OPENCV and cv2 is not None:
            colored_bgr = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_JET)
            colored_rgb = cv2.cvtColor(colored_bgr, cv2.COLOR_BGR2RGB)
        else:
            colored_rgb = JET_LUT[heatmap_u8]

        # Retinal aperture mask: preserve the circular dark boundary of the fundus camera
        gray = orig_np.mean(axis=-1)
        mask = (gray > 14).astype(np.float32)
        if HAS_OPENCV and cv2 is not None:
            mask = cv2.GaussianBlur(mask, (9, 9), 0)
        elif HAS_SCIPY and ndimage is not None:
            mask = ndimage.gaussian_filter(mask, sigma=2.0)
        mask_3d = np.expand_dims(mask, axis=-1)

        # Alpha-blend: overlay = alpha * heatmap + (1 - alpha) * original
        blended = (colored_rgb * alpha + orig_np * (1.0 - alpha)).astype(np.float32)

        # Apply aperture mask so non-retinal black border remains pure black
        overlay_rgb = np.clip(blended * mask_3d + orig_np * (1.0 - mask_3d), 0, 255).astype(np.uint8)
        masked_heatmap_rgb = np.clip(colored_rgb * mask_3d, 0, 255).astype(np.uint8)

        return masked_heatmap_rgb, overlay_rgb

    def generate_explanation(
        self,
        image_source: Union[Image.Image, Any],
        target_class_index: int,
        eye_label: str = "Eye",
        confidence: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Full end-to-end explainability generation.
        
        Args:
            image_source: PIL Image or file-like object.
            target_class_index: Disease/class index (0-7).
            eye_label: 'Left Eye (OS)', 'Right Eye (OD)', or 'Eye'.
            confidence: Probability or confidence percentage for this finding.
            
        Returns:
            Dictionary containing base64 images and clinical metadata.
        """
        # Load and normalize PIL Image
        if isinstance(image_source, Image.Image):
            pil_img = image_source.convert("RGB")
        else:
            if hasattr(image_source, "seek"):
                image_source.seek(0)
            pil_img = Image.open(image_source).convert("RGB")
            if hasattr(image_source, "seek"):
                image_source.seek(0)

        orig_w, orig_h = pil_img.size

        # Preprocess input tensor for ViT
        tensor = self.transform(pil_img).unsqueeze(0)

        # 1. Compute patch attribution
        cam_14x14 = self.compute_patch_attribution(tensor, target_class_index)

        # 2. Upscale and blend heatmap & overlay
        heatmap_rgb, overlay_rgb = self.generate_heatmap_and_overlay(cam_14x14, pil_img)

        # 3. Base64 encoding
        orig_np = np.array(pil_img)
        heatmap_b64 = image_to_base64(heatmap_rgb, format="JPEG", quality=88)
        overlay_b64 = image_to_base64(overlay_rgb, format="JPEG", quality=88)
        orig_b64 = image_to_base64(orig_np, format="JPEG", quality=88)

        class_name = LABELS[target_class_index]
        attribution_note = CLINICAL_ATTRIBUTION_GUIDES.get(class_name, "")

        return {
            "available": True,
            "eye": eye_label,
            "class_index": target_class_index,
            "class_name": class_name,
            "confidence": confidence,
            "attribution_note": attribution_note,
            "disclaimer": CLINICAL_DISCLAIMER,
            "heatmap": heatmap_b64,
            "overlay": overlay_b64,
            "original": orig_b64,
            "dimensions": {"width": orig_w, "height": orig_h},
        }

    def explain_screening_result(
        self,
        image_source: Union[Image.Image, Any],
        diagnosis: Dict[str, Any],
        eye_label: str = "Eye",
        include_secondary: bool = True,
    ) -> Dict[str, Any]:
        """
        Explains the specific outcome determined by the existing calibrated threshold diagnosis.
        
        Args:
            image_source: PIL Image or file-like object.
            diagnosis: The dictionary returned by `diagnose_fundus()`.
            eye_label: 'Left Eye (OS)', 'Right Eye (OD)', or 'Eye'.
            include_secondary: Whether to generate heatmaps for secondary detected diseases.
            
        Returns:
            Dictionary with primary explainability result and optional secondary explanations.
        """
        # Determine primary class to explain
        status = diagnosis.get("status", "normal")
        primary_disease = diagnosis.get("primary_disease", "Normal")

        # Map disease name back to index
        if status == "disease_detected":
            # Extract base name if contains prefix/suffix
            matched_idx = None
            for idx, label in enumerate(LABELS):
                if label in primary_disease:
                    matched_idx = idx
                    break
            target_class_idx = matched_idx if matched_idx is not None else 0
        else:
            target_class_idx = 0  # Normal

        primary_confidence = diagnosis.get("confidence", 85.0)

        # Generate primary explanation
        primary_expl = self.generate_explanation(
            image_source=image_source,
            target_class_index=target_class_idx,
            eye_label=eye_label,
            confidence=primary_confidence,
        )

        # Generate secondary explanations if multiple findings exist
        secondary_explanations = []
        if include_secondary:
            findings = diagnosis.get("findings", [])
            for finding in findings:
                f_label = finding.get("label")
                if f_label and f_label in LABELS and f_label != LABELS[target_class_idx]:
                    sec_idx = LABELS.index(f_label)
                    try:
                        sec_expl = self.generate_explanation(
                            image_source=image_source,
                            target_class_index=sec_idx,
                            eye_label=eye_label,
                            confidence=finding.get("raw_score", 0.0),
                        )
                        secondary_explanations.append(sec_expl)
                    except Exception as sec_err:
                        logger.warning(f"Could not generate secondary explanation for {f_label}: {sec_err}")

        primary_expl["secondary_explanations"] = secondary_explanations
        return primary_expl
