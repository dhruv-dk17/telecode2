"use client";

import type { CSSProperties, HTMLAttributes, MouseEvent } from "react";
import { useState } from "react";

type TiltCardProps = HTMLAttributes<HTMLDivElement> & {
  glareClassName?: string;
};

const DEFAULT_STYLE: CSSProperties = {
  transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0)",
};

export function TiltCard({
  children,
  className = "",
  glareClassName = "",
  onMouseMove,
  onMouseLeave,
  style,
  ...props
}: TiltCardProps) {
  const [cardStyle, setCardStyle] = useState<CSSProperties>(DEFAULT_STYLE);
  const [glareStyle, setGlareStyle] = useState<CSSProperties>({
    opacity: 0,
    background:
      "radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.24), rgba(139, 92, 246, 0.18) 28%, transparent 62%)",
  });

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const rotateX = ((y / bounds.height) - 0.5) * -12;
    const rotateY = ((x / bounds.width) - 0.5) * 14;

    setCardStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`,
    });
    setGlareStyle({
      opacity: 1,
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(245, 158, 11, 0.28), rgba(139, 92, 246, 0.16) 28%, transparent 62%)`,
    });

    onMouseMove?.(event);
  }

  function handleMouseLeave(event: MouseEvent<HTMLDivElement>) {
    setCardStyle(DEFAULT_STYLE);
    setGlareStyle((current) => ({ ...current, opacity: 0 }));
    onMouseLeave?.(event);
  }

  return (
    <div
      {...props}
      className={`tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, ...cardStyle }}
    >
      <div className={`tilt-card__glare ${glareClassName}`} style={glareStyle} aria-hidden="true" />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
