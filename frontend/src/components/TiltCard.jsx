import { useRef, useState, useCallback } from "react";

export default function TiltCard({
  children,
  className = "",
  maxTilt = 10,
  scale = 1.02,
  perspective = 1000,
  onClick,
  style = {},
  ...props
}) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState(
    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  );
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const xPercent = (clientX / rect.width) * 100;
      const yPercent = (clientY / rect.height) * 100;

      // Calculate tilt angles
      const rotateX = ((clientY / rect.height - 0.5) * -maxTilt).toFixed(2);
      const rotateY = ((clientX / rect.width - 0.5) * maxTilt).toFixed(2);

      setTransform(
        `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      setShine({
        x: xPercent.toFixed(1),
        y: yPercent.toFixed(1),
        opacity: 0.22,
      });
    },
    [maxTilt, perspective, scale]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform(
      `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
    );
    setShine((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      className={`tilt-card-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform,
        transition: isHovered
          ? "transform 0.1s ease-out"
          : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
        transformStyle: "preserve-3d",
        position: "relative",
        ...style,
      }}
      {...props}
    >
      {children}

      {/* Dynamic Specular Light Reflection Overlay */}
      <div
        className="tilt-card-shine"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, ${shine.opacity}), transparent 65%)`,
          transition: isHovered ? "opacity 0.15s ease-out" : "opacity 0.5s ease-out",
          zIndex: 10,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
