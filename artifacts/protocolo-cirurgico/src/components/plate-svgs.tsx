/**
 * SVG miniature illustrations for each plate type.
 * Stroke = plate body; circles = screw holes.
 */
import React from "react";

interface PlateSvgProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const PLATE = "#b0c4de"; // steel-blue plate body
const HOLE = "#fff";
const STROKE = "#4a6e8a";

// ── L-Plate Right (4 holes) ───────────────────────────────────────────────
export function LRight4h({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      {/* Vertical bar */}
      <rect x="32" y="6" width="12" height="42" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* Horizontal bar */}
      <rect x="32" y="42" width="28" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* 4 holes */}
      <circle cx="38" cy="14" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="38" cy="26" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="38" cy="38" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="50" cy="48" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── L-Plate Left (4 holes) ────────────────────────────────────────────────
export function LLeft4h({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect x="28" y="6" width="12" height="42" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <rect x="12" y="42" width="28" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="34" cy="14" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="34" cy="26" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="34" cy="38" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="22" cy="48" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── L-Plate Right (6 holes) ───────────────────────────────────────────────
export function LRight6h({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect x="30" y="4" width="12" height="52" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <rect x="30" y="50" width="28" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="12" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="22" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="32" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="42" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="47" cy="56" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="57" cy="56" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── L-Plate Left (6 holes) ────────────────────────────────────────────────
export function LLeft6h({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect x="30" y="4" width="12" height="52" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <rect x="12" y="50" width="28" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="12" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="22" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="32" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="42" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="25" cy="56" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="15" cy="56" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── BSSO Plate Right ──────────────────────────────────────────────────────
// T-shaped: long vertical + 3 bicortical screw positions
export function BssoRight({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      {/* Vertical bar */}
      <rect x="28" y="6" width="14" height="44" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* Horizontal tab at top */}
      <rect x="18" y="6" width="34" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* 3 bicortical holes (larger, shown with double circle) */}
      <circle cx="35" cy="28" r="4" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="35" cy="28" r="2" fill="none" stroke={STROKE} strokeWidth={0.8} />
      <circle cx="35" cy="40" r="4" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="35" cy="40" r="2" fill="none" stroke={STROKE} strokeWidth={0.8} />
      <circle cx="35" cy="52" r="3.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="35" cy="52" r="1.8" fill="none" stroke={STROKE} strokeWidth={0.8} />
      {/* Top holes */}
      <circle cx="24" cy="12" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="46" cy="12" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── BSSO Plate Left ───────────────────────────────────────────────────────
export function BssoLeft({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect x="30" y="6" width="14" height="44" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <rect x="20" y="6" width="34" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="37" cy="28" r="4" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="37" cy="28" r="2" fill="none" stroke={STROKE} strokeWidth={0.8} />
      <circle cx="37" cy="40" r="4" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="37" cy="40" r="2" fill="none" stroke={STROKE} strokeWidth={0.8} />
      <circle cx="37" cy="52" r="3.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="37" cy="52" r="1.8" fill="none" stroke={STROKE} strokeWidth={0.8} />
      <circle cx="26" cy="12" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="48" cy="12" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── Square / Cruciform 4-hole Plate ───────────────────────────────────────
export function SquarePlate({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      {/* Cross / cruciform shape */}
      <rect x="22" y="10" width="28" height="52" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <rect x="10" y="25" width="52" height="22" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* 4 holes at corners of the cross */}
      <circle cx="36" cy="18" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="54" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="18" cy="36" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="54" cy="36" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── Chin Plate ────────────────────────────────────────────────────────────
// Curved step-plate specific for genioplasty
export function ChinPlate({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      {/* Horizontal upper bar */}
      <rect x="8" y="18" width="56" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* Central step down */}
      <rect x="28" y="26" width="16" height="16" rx="2" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* Lower horizontal bar */}
      <rect x="8" y="38" width="56" height="12" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      {/* 6 holes */}
      <circle cx="18" cy="24" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="24" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="54" cy="24" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="18" cy="44" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="44" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="54" cy="44" r="2.5" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── Straight Plate (4 holes) ──────────────────────────────────────────────
export function StraightPlate({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect x="12" y="28" width="48" height="14" rx="3" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="22" cy="35" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="33" cy="35" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="44" cy="35" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="55" cy="35" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
    </svg>
  );
}

// ── Custom / Generic Plate ────────────────────────────────────────────────
export function CustomPlate({ size = 72, color = PLATE, strokeWidth = 1.5 }: PlateSvgProps) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size}>
      <rect x="10" y="20" width="52" height="32" rx="4" fill={color} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="22" cy="36" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="36" cy="36" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <circle cx="50" cy="36" r="3" fill={HOLE} stroke={STROKE} strokeWidth={strokeWidth} />
      <text x="36" y="64" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif">?</text>
    </svg>
  );
}

// ── Map of plateType → component ─────────────────────────────────────────
export type PlateTypeKey =
  | "L_left_4h" | "L_right_4h"
  | "L_left_6h" | "L_right_6h"
  | "BSSO_right" | "BSSO_left"
  | "square" | "chin" | "straight" | "custom" | "";

export function PlateSvgIcon({
  plateType,
  size = 56,
  rotation = 0,
}: {
  plateType: PlateTypeKey | string;
  size?: number;
  /** Rotação em graus (ex.: 90 para colocar uma placa reta na vertical). */
  rotation?: number;
}) {
  const props = { size };
  let glyph: React.ReactNode;
  switch (plateType) {
    case "L_left_4h":   glyph = <LLeft4h {...props} />; break;
    case "L_right_4h":  glyph = <LRight4h {...props} />; break;
    case "L_left_6h":   glyph = <LLeft6h {...props} />; break;
    case "L_right_6h":  glyph = <LRight6h {...props} />; break;
    case "BSSO_right":  glyph = <BssoRight {...props} />; break;
    case "BSSO_left":   glyph = <BssoLeft {...props} />; break;
    case "square":      glyph = <SquarePlate {...props} />; break;
    case "chin":        glyph = <ChinPlate {...props} />; break;
    case "straight":    glyph = <StraightPlate {...props} />; break;
    default:            glyph = <CustomPlate {...props} />; break;
  }
  if (!rotation) return <>{glyph}</>;
  return (
    <span
      style={{ display: "inline-flex", transform: `rotate(${rotation}deg)`, transformOrigin: "center", lineHeight: 0 }}
    >
      {glyph}
    </span>
  );
}
