import React from "react";

// Standard props for SVG components
interface VttIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

// 1. Sleek Futuristic Pokéball Icon (Centerpiece)
export const PokebolaIcon: React.FC<VttIconProps> = ({ size = 20, className = "", glow = false, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${glow ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : ""}`}
      {...props}
    >
      {/* Outer Sphere */}
      <circle cx="12" cy="12" r="10" />
      {/* Central Division Line */}
      <line x1="2" y1="12" x2="22" y2="12" />
      {/* Outer Button Circle */}
      <circle cx="12" cy="12" r="3" fill="#090b0e" />
      {/* Inner Core Button */}
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      {/* Futuristic Hemisphere Panels */}
      <path d="M6 7.5c2-1.5 5.5-2 6-2s4 .5 6 2" className="opacity-40" />
      <path d="M6 16.5c2 1.5 5.5 2 6 2s4-.5 6-2" className="opacity-40" />
    </svg>
  );
};

// 2. Dual Horizontal Mirror Icon
export const MirrorIcon: React.FC<VttIconProps> = ({ size = 20, className = "", glow = false, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${glow ? "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : ""}`}
      {...props}
    >
      {/* Symmetric Horizontal Flipping Triangles / Panels */}
      <path d="M3 16V8h3l3 4-3 4H3z" />
      <path d="M21 16V8h-3l-3 4 3 4h3z" />
      {/* Mirror Axis Center Line */}
      <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3" className="opacity-90 stroke-indigo-400" />
      {/* Connection arrow arcs */}
      <path d="M8 5a8.5 8.5 0 0 1 8 0" className="opacity-50" />
      <path d="M16 19a8.5 8.5 0 0 1-8 0" className="opacity-50" />
    </svg>
  );
};

// 3. Attribute Stages / Modifiers Boost & Curse Icon
export const StagesIcon: React.FC<VttIconProps> = ({ size = 20, className = "", glow = false, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${glow ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : ""}`}
      {...props}
    >
      {/* Cybernetic Multi-tier Stat Bars */}
      <rect x="4" y="14" width="2" height="6" rx="0.5" />
      <rect x="9" y="10" width="2" height="10" rx="0.5" />
      <rect x="14" y="6" width="2" height="14" rx="0.5" />
      {/* Ascending dynamic diagonal vector line with arrow */}
      <path d="M3 18l5-5 5 4 8-9" className="stroke-emerald-400" />
      <polyline points="17 8 21 8 21 12" className="stroke-emerald-400" />
    </svg>
  );
};

// 4. Status Conditions (Altered States) Icon
export const StatusIcon: React.FC<VttIconProps> = ({ size = 20, className = "", glow = false, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${glow ? "drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" : ""}`}
      {...props}
    >
      {/* DNA Helix or Bio-Hazard / Status Atom Rings */}
      <circle cx="12" cy="12" r="5" className="stroke-rose-400" />
      {/* Electron orbits or volatile layers */}
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" className="opacity-70" />
      <path d="M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" className="opacity-40" />
      {/* Ring-surrounding points */}
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
};

// 5. Config / Engine Gear Icon
export const SettingsIcon: React.FC<VttIconProps> = ({ size = 20, className = "", ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
};

// 6. Pokebola Recall (Energy Beam / Extraction Portal) Icon
export const RecallIcon: React.FC<VttIconProps> = ({ size = 20, className = "", ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Extraction portal with focus beams */}
      <path d="M12 2a10 10 0 0 0-10 10c0 4.5 3 8 8 9.5" className="opacity-45" />
      <path d="M12 2a10 10 0 0 1 10 10c0 4.5-3 8-8 9.5" className="opacity-45" />
      
      {/* Force field beam vortex */}
      <path d="M12 6V22" className="stroke-amber-400" />
      {/* Returning curves representing suction into the ball */}
      <path d="M17 10c-1.5 2-3.5 3-5 3s-3.5-1-5-3" className="stroke-amber-400" />
      <path d="M19 14c-2.5 2.5-5 3.5-7 3.5s-4.5-1-7-3.5" className="stroke-indigo-400 opacity-85" />
      <path d="M12 6l-3 3M12 6l3 3" className="stroke-amber-400" />
    </svg>
  );
};

// 7. Pokebola Swap (Alternating Rotation Exchange) Icon
export const SwapIcon: React.FC<VttIconProps> = ({ size = 20, className = "", ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer exchange arrows forming a perfect orbital circulation */}
      <path d="M16 3h5v5" className="stroke-red-400" />
      <path d="M21 3c-1.5 1.5-4.5 3-9 3-4.5 0-7.5-1.5-9-3" className="stroke-red-400 opacity-75" />
      
      <path d="M8 21H3v-5" className="stroke-indigo-400" />
      <path d="M3 21c1.5-1.5 4.5-3 9-3 4.5 0 7.5 1.5 9 3" className="stroke-indigo-400 opacity-75" />

      {/* Orbiting focal inner sphere representing swapping cores */}
      <circle cx="12" cy="12" r="4" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
};
