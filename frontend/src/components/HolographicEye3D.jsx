import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function HolographicEye3D() {
  const containerRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState("all"); // 'all', 'vessels', 'grid'
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 460;

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 260);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Outer Hologram Wireframe Sphere
    const sphereRadius = 82;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 28, 22);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    mainGroup.add(sphereMesh);

    // 2. Inner Glow Sphere (Vitrous / Retina chamber)
    const innerGeo = new THREE.SphereGeometry(sphereRadius * 0.96, 20, 20);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    mainGroup.add(innerMesh);

    // 3. Retinal Photoreceptor & Vascular Particles
    const particleCount = 800;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Golden spiral distribution on sphere surface
      const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
      const theta = Math.PI * (1 + 5 ** 0.5) * i;

      // Slight radial variation for vascular depth
      const r = sphereRadius * (0.97 + Math.random() * 0.04);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      // Retinal colors: macula gold, vascular red/cyan, normal azure
      if (Math.abs(z - sphereRadius * 0.7) < 25 && Math.abs(x) < 25) {
        // Optic disc / Macula region
        particleColors[i * 3] = 0.98;
        particleColors[i * 3 + 1] = 0.75;
        particleColors[i * 3 + 2] = 0.28;
      } else if (i % 3 === 0) {
        // Cyan highlights
        particleColors[i * 3] = 0.22;
        particleColors[i * 3 + 1] = 0.85;
        particleColors[i * 3 + 2] = 0.98;
      } else {
        // Medical teal
        particleColors[i * 3] = 0.18;
        particleColors[i * 3 + 1] = 0.65;
        particleColors[i * 3 + 2] = 0.85;
      }
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particlesGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const createDiscTexture = () => {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255, 255, 255, 1)");
      g.addColorStop(0.3, "rgba(56, 189, 248, 0.8)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
      const tex = new THREE.Texture(c);
      tex.needsUpdate = true;
      return tex;
    };

    const particlesMat = new THREE.PointsMaterial({
      size: 5.5,
      map: createDiscTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    mainGroup.add(particles);

    // 4. Optic Disc Core (Glowing Beacon)
    const opticDiscGeo = new THREE.RingGeometry(0.1, 14, 32);
    const opticDiscMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const opticDisc = new THREE.Mesh(opticDiscGeo, opticDiscMat);
    opticDisc.position.set(0, 0, sphereRadius);
    mainGroup.add(opticDisc);

    // 5. Orbiting Biometric HUD Rings
    const ring1Geo = new THREE.RingGeometry(sphereRadius * 1.18, sphereRadius * 1.20, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI * 0.35;
    scene.add(ring1);

    const ring2Geo = new THREE.RingGeometry(sphereRadius * 1.28, sphereRadius * 1.30, 48);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI * 0.4;
    scene.add(ring2);

    // 6. 3D Laser Scanning Sweep Plane
    const scanPlaneGeo = new THREE.PlaneGeometry(sphereRadius * 2.2, 2);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    scene.add(scanPlane);

    // --- Interactive Drag Rotation ---
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationX = 0.2;
    let targetRotationY = 0.4;

    const onPointerDown = (e) => {
      isDragging = true;
      setIsInteracting(true);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      targetRotationY += deltaX * 0.008;
      targetRotationX += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
      setIsInteracting(false);
    };

    const domElem = renderer.domElement;
    domElem.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // --- Resize handler ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- Animation Loop ---
    let animationId;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.016;

      // Auto rotation when not dragging
      if (!isDragging) {
        targetRotationY += 0.004;
        targetRotationX = 0.2 + Math.sin(time * 0.5) * 0.1;
      }

      // Smooth damping
      mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.08;
      mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.08;

      // Rings orbit
      ring1.rotation.z += 0.008;
      ring2.rotation.z -= 0.006;
      ring2.rotation.x = Math.PI * 0.3 + Math.sin(time * 0.8) * 0.15;

      // Laser sweep scanning up and down
      const scanY = Math.sin(time * 1.8) * (sphereRadius * 0.95);
      scanPlane.position.y = scanY;
      const fadeAlpha = 0.3 + 0.5 * Math.cos((scanY / sphereRadius) * (Math.PI / 2));
      scanPlaneMat.opacity = fadeAlpha;

      // Pulse Optic Disc
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      opticDisc.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      domElem.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", handleResize);

      sphereGeo.dispose();
      sphereMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      opticDiscGeo.dispose();
      opticDiscMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      scanPlaneGeo.dispose();
      scanPlaneMat.dispose();
      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="holographic-eye-container">
      {/* HUD Corner Brackets */}
      <div className="hud-corner hud-top-left" />
      <div className="hud-corner hud-top-right" />
      <div className="hud-corner hud-bottom-left" />
      <div className="hud-corner hud-bottom-right" />

      {/* Floating HUD Badges & Telemetry */}
      <div className="hud-telemetry hud-telemetry-top">
        <div className="hud-indicator-dot" />
        <span className="hud-tag">3D RETINAL SCANNER</span>
        <span className="hud-value">ViT-B/16 LOCK</span>
      </div>

      <div className="hud-telemetry hud-telemetry-bottom">
        <div className="hud-metric">
          <span className="metric-label">PATCHES</span>
          <span className="metric-val">196 (14×14)</span>
        </div>
        <div className="hud-metric">
          <span className="metric-label">ATTN HEADS</span>
          <span className="metric-val">12 HEADS</span>
        </div>
        <div className="hud-metric">
          <span className="metric-label">RESOLUTION</span>
          <span className="metric-val">224 × 224</span>
        </div>
      </div>

      <div className="hud-hint">
        <span>{isInteracting ? "Rotating 3D Model..." : "✦ Drag to rotate 3D retina"}</span>
      </div>

      {/* Three.js Canvas mount */}
      <div
        ref={containerRef}
        className="holographic-canvas-mount"
      />
    </div>
  );
}
