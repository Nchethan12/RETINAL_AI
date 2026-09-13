import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RetinalBackground3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060e1a, 0.0018);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    camera.position.z = 700;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // --- Particle Nodes (Neural / Retinal Photoreceptors) ---
    const particleCount = 260;
    const maxDistance = 140;
    const bounds = 900;

    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const colors = new Float32Array(particleCount * 3);

    // Palette: Medical Cyan, Emerald, Soft Violet, Arctic White
    const palette = [
      new THREE.Color(0x38bdf8), // Cyan
      new THREE.Color(0x2dd4bf), // Emerald/Teal
      new THREE.Color(0x818cf8), // Violet
      new THREE.Color(0xbae6fd), // Light Cyan
      new THREE.Color(0x0284c7), // Deep Azure
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds;
      positions[i * 3 + 1] = (Math.random() - 0.5) * bounds;
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 0.7;

      velocities.push({
        x: (Math.random() - 0.5) * 0.35,
        y: (Math.random() - 0.5) * 0.35,
        z: (Math.random() - 0.5) * 0.25,
      });

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    // Circular particle texture generator
    const createCircleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.25, "rgba(56, 189, 248, 0.85)");
      gradient.addColorStop(0.7, "rgba(14, 165, 233, 0.2)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      return texture;
    };

    const particleMaterial = new THREE.PointsMaterial({
      size: 14,
      map: createCircleTexture(),
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // --- Dynamic Synaptic Connections (Line Segments) ---
    const maxLineSegments = particleCount * 6;
    const linePositions = new Float32Array(maxLineSegments * 6);
    const lineColors = new Float32Array(maxLineSegments * 6);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    lineGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    // --- Floating Ambient Light Spheres ---
    const ambientOrbsGroup = new THREE.Group();
    const orbGlows = [
      { color: 0x0284c7, x: -350, y: 200, z: -200, size: 140, speed: 0.0008 },
      { color: 0x059669, x: 380, y: -150, z: -300, size: 160, speed: 0.0006 },
      { color: 0x6366f1, x: 50, y: -250, z: -150, size: 120, speed: 0.001 },
    ];

    orbGlows.forEach((item) => {
      const geo = new THREE.SphereGeometry(item.size, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: item.color,
        transparent: true,
        opacity: 0.045,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(item.x, item.y, item.z);
      mesh.userData = item;
      ambientOrbsGroup.add(mesh);
    });
    scene.add(ambientOrbsGroup);

    // --- Mouse Parallax & Scroll ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let scrollY = 0;

    const handleMouseMove = (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };

    const handleScroll = () => {
      scrollY = window.scrollY || window.pageYOffset;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    // --- Animation Loop ---
    let animationFrameId;
    let time = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      time += 0.01;

      // Smooth camera interpolation with mouse + scroll parallax
      targetX += (mouseX * 120 - targetX) * 0.04;
      targetY += (-mouseY * 80 - targetY) * 0.04;

      camera.position.x = targetX;
      camera.position.y = targetY - scrollY * 0.15;
      camera.lookAt(0, -scrollY * 0.1, 0);

      // Rotate whole network subtly
      particleSystem.rotation.y = time * 0.04;
      particleSystem.rotation.x = Math.sin(time * 0.03) * 0.08;
      lineSegments.rotation.y = particleSystem.rotation.y;
      lineSegments.rotation.x = particleSystem.rotation.x;

      // Update particles
      const posArray = particleGeometry.attributes.position.array;
      let vertexCount = 0;
      let colorCount = 0;

      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        posArray[idx] += velocities[i].x;
        posArray[idx + 1] += velocities[i].y;
        posArray[idx + 2] += velocities[i].z;

        // Bounce back into bounds
        const halfB = bounds / 2;
        if (Math.abs(posArray[idx]) > halfB) velocities[i].x *= -1;
        if (Math.abs(posArray[idx + 1]) > halfB) velocities[i].y *= -1;
        if (Math.abs(posArray[idx + 2]) > halfB * 0.7) velocities[i].z *= -1;

        // Find connections
        for (let j = i + 1; j < particleCount; j++) {
          const jdx = j * 3;
          const dx = posArray[idx] - posArray[jdx];
          const dy = posArray[idx + 1] - posArray[jdx + 1];
          const dz = posArray[idx + 2] - posArray[jdx + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDistance && vertexCount + 6 <= maxLineSegments * 6) {
            const alpha = 1.0 - dist / maxDistance;

            linePositions[vertexCount++] = posArray[idx];
            linePositions[vertexCount++] = posArray[idx + 1];
            linePositions[vertexCount++] = posArray[idx + 2];

            linePositions[vertexCount++] = posArray[jdx];
            linePositions[vertexCount++] = posArray[jdx + 1];
            linePositions[vertexCount++] = posArray[jdx + 2];

            // Blend colors with distance alpha
            const cr = 0.22 + 0.3 * alpha;
            const cg = 0.74 + 0.2 * alpha;
            const cb = 0.96 * alpha;

            lineColors[colorCount++] = cr;
            lineColors[colorCount++] = cg;
            lineColors[colorCount++] = cb;

            lineColors[colorCount++] = cr;
            lineColors[colorCount++] = cg;
            lineColors[colorCount++] = cb;
          }
        }
      }

      particleGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      lineGeometry.setDrawRange(0, vertexCount / 3);

      // Animate ambient orbs
      ambientOrbsGroup.children.forEach((mesh, index) => {
        mesh.rotation.y += mesh.userData.speed;
        mesh.rotation.z += mesh.userData.speed * 0.7;
        mesh.position.y += Math.sin(time + index) * 0.4;
      });

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);

      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      scene.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="retinal-3d-background-canvas"
      aria-hidden="true"
    />
  );
}
