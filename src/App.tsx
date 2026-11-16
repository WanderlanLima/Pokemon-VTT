import React, { useState, useEffect, useRef, useCallback, MouseEvent, WheelEvent, DragEvent } from "react";
import { auth, db, signInWithPopup, GoogleAuthProvider, signOut, OperationType, handleFirestoreError } from "./firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, deleteDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  Cloud,
  CloudOff,
  LogOut,
  Map as MapIcon, 
  Plus, 
  Trash2, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Grid3X3, 
  X,
  Sparkles,
  MousePointer,
  Info,
  Moon,
  Users,
  Heart,
  Shield,
  Crown,
  Layers,
  Palette,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Trash,
  FileUp,
  Link,
  Target,
  Settings,
  Folder,
  FolderOpen,
  FolderPlus,
  Check,
  Edit3,
  Eye,
  Search,
  Copy,
  UserPlus,
  User,
  MoreVertical,
  Briefcase,
  Package,
  Scroll,
  Dumbbell,
  BookOpen,
  Award,
  PlusCircle,
  MinusCircle,
  Clock,
  RotateCcw,
  Bookmark,
  FileText,
  FlipHorizontal,
  ArrowLeftRight,
  Shuffle,
  Dices,
  Swords,
  Trophy,
  Pin,
  PinOff,
  GripHorizontal,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MapItem, TokenItem, MapFolder, TrainerRecord, TrainerFolder, PokemonMoveObject, Combatant } from "./types";
import { ANIMATED_AURAS } from "./auras";
import { AuraCanvas } from "./components/AuraCanvas";
import { RadialMenuOverlay, STAGE_META, CONDITION_META, getStatusIconSvg } from "./components/RadialMenuOverlay";
import { PokebolaIcon, MirrorIcon, StagesIcon, StatusIcon, SettingsIcon, RecallIcon, SwapIcon } from "./components/VttIcons";
import { CombatInspector } from "./components/CombatInspector";
import { PokemonSheetTabs } from "./components/PokemonSheetTabs";
import { CombatSummaryCardTCG } from "./components/CombatSummaryCardTCG";
import { TrainerSkillsSheet } from "./components/TrainerSkillsSheet";

// Helper to dynamically adjust Hex color brightness for CSS gradients
const adjustColorBrightness = (hex: string, percent: number): string => {
  try {
    let num = parseInt(hex.replace("#", ""), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = ((num >> 8) & 0x00ff) + amt;
    let B = (num & 0x0000ff) + amt;
    
    R = Math.max(0, Math.min(255, R));
    G = Math.max(0, Math.min(255, G));
    B = Math.max(0, Math.min(255, B));
    
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  } catch (e) {
    return hex;
  }
};

// Fallback high-quality textures for quick testing if no maps are uploaded
const SAMPLE_MAPS = [
  {
    name: "Ruínas Antigas",
    url: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Mesa da Taverna",
    url: "https://images.unsplash.com/photo-1541845157-a6d2d100c931?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Cadeia do Caos",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
  }
];

const SAMPLE_TOKENS = [
  { name: "Guerreiro Anão", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150", hp: 45, color: "#3b82f6" },
  { name: "Maga Élfica", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", hp: 28, color: "#a855f7" },
  { name: "Ladino Humano", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", hp: 32, color: "#10b981" },
  { name: "Pequeno Goblin", url: "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=150", hp: 12, color: "#ef4444" }
];

const AURA_COLORS = [
  { name: "Aliado (Azul)", hex: "#3b82f6" },
  { name: "Inimigo (Vermelho)", hex: "#ef4444" },
  { name: "Neutro (Verde)", hex: "#10b981" },
  { name: "Chefe (Roxo)", hex: "#a855f7" },
  { name: "Especial (Ouro)", hex: "#f59e0b" }
];

const renderAuraOverlay = (
  auraId: string | undefined, 
  scale: number = 1.0,
  token?: TokenItem,
  previewIntensity?: number,
  previewOpacity?: number,
  previewPartCount?: number,
  previewSpeed?: number,
  previewPrimary?: string,
  previewSecondary?: string,
  previewGlow?: boolean,
  previewDistortion?: boolean
) => {
  if (!auraId || auraId === "none") return null;
  return (
    <AuraCanvas
      auraId={auraId}
      scale={scale}
      intensity={previewIntensity ?? token?.auraIntensity}
      opacity={previewOpacity ?? token?.auraOpacity}
      particleCount={previewPartCount ?? token?.auraParticleCount}
      animationSpeed={previewSpeed ?? token?.auraAnimationSpeed}
      colorPrimary={previewPrimary ?? token?.auraColorPrimary}
      colorSecondary={previewSecondary ?? token?.auraColorSecondary}
      enableGlow={previewGlow ?? token?.auraEnableGlow}
      enableDistortion={previewDistortion ?? token?.auraEnableDistortion}
    />
  );
};

export const LINK_STYLES = [
  { id: "electric-lightning", name: "Raio Elétrico" },
  { id: "blue-plasma", name: "Plasma Azul" },
  { id: "chakra", name: "Chakra" },
  { id: "spiritual-aura", name: "Aura Espiritual" },
  { id: "arcane-fire", name: "Fogo Arcano" },
  { id: "light-beam", name: "Corrente de Luz" },
  { id: "purple-ray", name: "Raio Roxo" },
  { id: "golden-link", name: "Vínculo Dourado" },
  { id: "floating-runes", name: "Runas Flutuantes" },
  { id: "psychic-waves", name: "Energia Psíquica" },
  { id: "star-particles", name: "Partículas Estelares" },
  { id: "dark-smoke", name: "Energia Sombria" },
  { id: "metal-chain", name: "Corrente Metálica" },
  { id: "crystal-shards", name: "Cristais Energéticos" },
  { id: "dna-helix", name: "DNA" },
  { id: "tech-pulse", name: "Pulso Tecnológico" },
  { id: "water-flow", name: "Fluxo de Água" },
  { id: "dragon-energy", name: "Energia Dracônica" },
  { id: "mystic-fog", name: "Névoa Mística" },
  { id: "soul-link", name: "Soul Link" }
];

const TrainerPokemonLinks = ({ 
  activeMap, 
  tokens,
  zoom = 1
}: { 
  activeMap: any; 
  tokens: any[];
  zoom?: number;
}) => {
  const gridSize = activeMap.gridSize || 70;
  const gridUnit = activeMap.gridUnit || "5ft";

  // Find all active pokemon links
  const pkLinks = tokens.filter(t => t.pokemonId && t.linkEnabled);

  if (pkLinks.length === 0) return null;

  // Custom function to calculate RPG distances
  const calculateDistanceText = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const pixelDistance = Math.hypot(dx, dy);
    
    const cells = pixelDistance / gridSize;
    
    let multiplier = 5;
    let unitLabel = "ft";
    
    if (gridUnit) {
      const match = gridUnit.match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        multiplier = parseFloat(match[1]) || 5;
        unitLabel = match[2] || "ft";
      } else {
        unitLabel = gridUnit;
      }
    }
    
    const distanceValue = cells * multiplier;
    const formattedValue = distanceValue % 1 === 0 ? distanceValue : distanceValue.toFixed(1);
    return `${formattedValue} ${unitLabel}`;
  };

  return (
    <svg 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Animated filters for lightning & plasma */}
        <filter id="link-lightning-warp" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" result="noise">
            <animate attributeName="baseFrequency" values="0.09;0.14;0.11;0.15;0.09" dur="0.25s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="link-purple-unstable" x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="4" result="noise">
            <animate attributeName="baseFrequency" values="0.18;0.24;0.21" dur="0.1s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" />
        </filter>

        <filter id="link-plasma-warp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="noise">
            <animate attributeName="baseFrequency" values="0.02;0.04;0.02" dur="0.6s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="link-dark-smoke-warp" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise">
            <animate attributeName="baseFrequency" values="0.01;0.02;0.01" dur="1.5s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="35" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Glow Filters */}
        <filter id="link-heavy-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur1" />
          <feGaussianBlur stdDeviation="3" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="link-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {pkLinks.map(pk => {
        // Find corresponding Trainer token
        const tr = tokens.find(t => t.trainerId === pk.trainerId && !t.pokemonId);
        if (!tr) return null;

        // Pokémon Center Coordinator
        const sizePk = gridSize * pk.size;
        const cxPk = pk.x + sizePk / 2;
        const cyPk = pk.y + sizePk / 2;

        // Trainer Center Coordinator
        const sizeTr = gridSize * tr.size;
        const cxTr = tr.x + sizeTr / 2;
        const cyTr = tr.y + sizeTr / 2;

        // Line properties
        const color = pk.linkColor || pk.color || "#ef4444";
        const baseThickness = pk.linkThickness !== undefined ? pk.linkThickness : 4;
        const intensity = pk.linkIntensity !== undefined ? pk.linkIntensity : 100;
        const intensityFactor = intensity / 100;
        const thickness = baseThickness * intensityFactor;
        const style = pk.linkStyle || "electric-lightning";

        // Distance text and coordinates
        const distText = calculateDistanceText({ x: cxPk, y: cyPk }, { x: cxTr, y: cyTr });
        const midX = (cxPk + cxTr) / 2;
        const actualMidY = (cyPk + cyTr) / 2;

        const distancePx = Math.hypot(cxPk - cxTr, cyPk - cyTr);
        const angleRad = Math.atan2(cyPk - cyTr, cxPk - cxTr);
        const angleDeg = (angleRad * 180) / Math.PI;

        // Render distinct style nodes
        const renderStyle = () => {
          switch (style) {
            case "electric-lightning":
              return (
                <g filter="url(#link-lightning-warp)">
                  {/* Outer glow layer */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 2.8} 
                    opacity={0.35 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  {/* Outer hot streak */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 1.5} 
                    opacity={0.7} 
                    strokeLinecap="round"
                  />
                  {/* White core */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#ffffff" 
                    strokeWidth={Math.max(1.5, thickness * 0.45)} 
                    opacity={0.95} 
                    strokeLinecap="round"
                  />
                </g>
              );

            case "blue-plasma":
              return (
                <g filter="url(#link-plasma-warp)">
                  {/* Wide warm plasma glow */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 3.5} 
                    opacity={0.3 * intensityFactor} 
                  />
                  {/* Flow plasma band */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 1.8} 
                    opacity={0.8} 
                    strokeDasharray="40 20"
                  >
                    <animate attributeName="stroke-dashoffset" from="300" to="0" dur="1.8s" repeatCount="indefinite" />
                  </line>
                  {/* Plasma Core */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#e0f2fe" 
                    strokeWidth={thickness * 0.6} 
                    opacity={0.9} 
                  />
                </g>
              );

            case "chakra": {
              // Draw wavy sine-wave wrapped around direct path
              const points: string[] = [];
              const segmentsCount = Math.floor(distancePx / 12) || 12;
              const freq = 4.5;
              const amp = 14 * intensityFactor;
              
              const dx = cxPk - cxTr;
              const dy = cyPk - cyTr;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              const nx = -uy;
              const ny = ux;

              for (let i = 0; i <= segmentsCount; i++) {
                const ratio = i / segmentsCount;
                const basePx = cxTr + ratio * dx;
                const basePy = cyTr + ratio * dy;
                const offsetAmp = Math.sin(ratio * Math.PI) * amp; // fade on ends
                const waveVal = Math.sin(ratio * freq * Math.PI * 2) * offsetAmp;
                const pxX = basePx + nx * waveVal;
                const pxY = basePy + ny * waveVal;
                points.push(`${pxX},${pxY}`);
              }
              const pathD = `M ${points.join(' L ')}`;

              return (
                <g filter="url(#link-soft-glow)">
                  <line x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} stroke={color} strokeWidth={thickness * 0.5} opacity={0.4} />
                  {/* Spiral wave 1 */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth={thickness * 1.2} 
                    opacity={0.85} 
                    strokeLinecap="round"
                  >
                    <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2.5s" repeatCount="indefinite" />
                  </path>
                  {/* Spiral wave 2 */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth={thickness * 0.5} 
                    opacity={0.75} 
                    transform={`translate(${nx * 2}, ${ny * 2})`}
                  />
                </g>
              );
            }

            case "spiritual-aura":
              return (
                <g filter="url(#link-soft-glow)">
                  {/* Back glow bar */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 3.0} 
                    opacity={0.14 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  {/* Flashing spiritual dash energy line */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness} 
                    strokeDasharray="4 16"
                    strokeLinecap="round"
                    opacity={0.9}
                  >
                    <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2.5s" repeatCount="indefinite" />
                  </line>
                  {/* Sliding spiritual particle bubbles */}
                  {[0, 1, 2].map(i => (
                    <circle key={i} r={4 * intensityFactor} fill="#ffffff" filter="url(#link-soft-glow)">
                      <animateMotion 
                        path={`M ${cxTr} ${cyTr} L ${cxPk} ${cyPk}`} 
                        dur={`${2.2 + i * 0.5}s`} 
                        begin={`${i * 0.7}s`} 
                        repeatCount="indefinite" 
                      />
                    </circle>
                  ))}
                </g>
              );

            case "arcane-fire":
              return (
                <g filter="url(#link-plasma-warp)">
                  {/* Base warm halo fire */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#ef4444" 
                    strokeWidth={thickness * 4.0} 
                    opacity={0.22 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  {/* Middle core orange fire wave */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#f97316" 
                    strokeWidth={thickness * 2.0} 
                    opacity={0.7} 
                    strokeLinecap="round"
                    strokeDasharray="50 15"
                  >
                    <animate attributeName="stroke-dashoffset" from="-180" to="0" dur="1.2s" repeatCount="indefinite" />
                  </line>
                  {/* Central flame spark line */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#facc15" 
                    strokeWidth={thickness * 0.8} 
                    opacity={0.95} 
                    strokeLinecap="round"
                    strokeDasharray="15 40"
                  >
                    <animate attributeName="stroke-dashoffset" from="250" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                </g>
              );

            case "light-beam":
              return (
                <g filter="url(#link-heavy-glow)">
                  {/* Large halo of pure light */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 4.0} 
                    opacity={0.15 * intensityFactor} 
                  />
                  {/* Central beam gradient */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 1.5} 
                    opacity={0.8} 
                  />
                  {/* Intense white center point core */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#ffffff" 
                    strokeWidth={thickness * 0.6} 
                    opacity={1.0} 
                  />
                </g>
              );

            case "purple-ray":
              return (
                <g filter="url(#link-purple-unstable)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 2.8} 
                    opacity={0.4} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 1.3} 
                    opacity={0.8} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#fae8ff" 
                    strokeWidth={Math.max(1.2, thickness * 0.35)} 
                    opacity={0.95} 
                    strokeLinecap="round"
                  />
                </g>
              );

            case "golden-link":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#eab308" 
                    strokeWidth={thickness * 2.8} 
                    opacity={0.2 * intensityFactor} 
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#fef08a" 
                    strokeWidth={thickness} 
                    opacity={0.85} 
                  />
                  {/* Sparkling sacred stars flying along the golden link */}
                  {[0, 1].map(i => (
                    <polygon 
                      key={i} 
                      points="0,-6 2,-2 6,0 2,2 0,6 -2,2 -6,0 -2,-2" 
                      fill="#ffffff" 
                      filter="url(#link-heavy-glow)"
                    >
                      <animateMotion 
                        path={`M ${cxTr} ${cyTr} L ${cxPk} ${cyPk}`} 
                        dur={`${2.8 + i * 0.9}s`} 
                        begin={`${i * 1.4}s`} 
                        repeatCount="indefinite" 
                      />
                    </polygon>
                  ))}
                </g>
              );

            case "floating-runes": {
              const pathId = `rune-path-${pk.id}`;
              return (
                <g>
                  {/* Subtle guiding glow link below */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={Math.max(1, thickness * 0.3)} 
                    opacity={0.35 * intensityFactor} 
                  />
                  {/* Guiding vector for textPath inside defs inline */}
                  <path 
                    id={pathId}
                    d={`M ${cxTr} ${cyTr} L ${cxPk} ${cyPk}`} 
                    fill="none" 
                    stroke="none"
                  />
                  <text 
                    fill={color} 
                    fontSize={11 + thickness * 0.4} 
                    fontFamily="monospace"
                    fontWeight="black"
                    letterSpacing="6px"
                    opacity={0.9 * intensityFactor}
                    filter="url(#link-soft-glow)"
                  >
                    <textPath href={`#${pathId}`} startOffset="0%">
                      <animate attributeName="startOffset" from="0%" to="100%" dur={`${8 / intensityFactor}s`} repeatCount="indefinite" />
                      ᛟᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛋᛏᛒᛗᛚᛜᛝᛟᛞ  ᛟᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛋᛏᛒᛗᛚᛜᛝᛟᛞ
                    </textPath>
                  </text>
                </g>
              );
            }

            case "psychic-waves":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 0.75} 
                    opacity={0.4} 
                  />
                  {/* Pulsating expansion brain rings waves */}
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 2.2} 
                    strokeDasharray="10 35"
                    opacity={0.8}
                  >
                    <animate attributeName="stroke-dashoffset" from="300" to="0" dur="1.7s" repeatCount="indefinite" />
                  </line>
                </g>
              );

            case "star-particles":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={Math.max(1, thickness * 0.35)} 
                    opacity={0.35} 
                  />
                  {[0, 1, 2, 3].map(i => (
                    <polygon 
                      key={i} 
                      points="0,-4 1.5,-1.5 4,0 1.5,1.5 0,4 -1.5,1.5 -4,0 -1.5,-1.5" 
                      fill="#ffffff"
                    >
                      <animateMotion 
                        path={`M ${cxTr} ${cyTr} L ${cxPk} ${cyPk}`} 
                        dur={`${2.0 + i * 0.4}s`} 
                        begin={`${i * 0.5}s`} 
                        repeatCount="indefinite" 
                      />
                    </polygon>
                  ))}
                </g>
              );

            case "dark-smoke":
              return (
                <g filter="url(#link-dark-smoke-warp)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#1e1b4b" 
                    strokeWidth={thickness * 5.0} 
                    opacity={0.4 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 2.5} 
                    opacity={0.7} 
                    strokeLinecap="round"
                    strokeDasharray="30 15"
                  >
                    <animate attributeName="stroke-dashoffset" from="200" to="0" dur="3.0s" repeatCount="indefinite" />
                  </line>
                </g>
              );

            case "metal-chain":
              return (
                <g>
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#000000" 
                    strokeWidth={thickness * 2.8} 
                    opacity={0.4} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#94a3b8" 
                    strokeWidth={thickness * 2.0} 
                    strokeDasharray="12 16"
                    strokeLinecap="round"
                    opacity={0.9} 
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#f1f5f9" 
                    strokeWidth={thickness * 0.9} 
                    strokeDasharray="4 24"
                    strokeLinecap="round"
                    opacity={0.95} 
                  />
                </g>
              );

            case "crystal-shards":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={Math.max(1, thickness * 0.25)} 
                    opacity={0.3} 
                  />
                  {[0, 1, 2].map(i => (
                    <polygon 
                      key={i} 
                      points="0,-5 3,0 0,5 -3,0" 
                      fill={color} 
                      stroke="#ffffff" 
                      strokeWidth="1"
                    >
                      <animateMotion 
                        path={`M ${cxTr} ${cyTr} L ${cxPk} ${cyPk}`} 
                        dur={`${2.6 + i * 0.6}s`} 
                        begin={`${i * 0.8}s`} 
                        repeatCount="indefinite" 
                      />
                    </polygon>
                  ))}
                </g>
              );

            case "dna-helix": {
              const segmentsCount = 20;
              const amp = 10 * intensityFactor;
              const freq = 3.0;

              const dx = cxPk - cxTr;
              const dy = cyPk - cyTr;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              const nx = -uy;
              const ny = ux;

              const wave1Points: string[] = [];
              const wave2Points: string[] = [];
              const rungs: React.ReactNode[] = [];

              for (let i = 0; i <= segmentsCount; i++) {
                const ratio = i / segmentsCount;
                const bx = cxTr + ratio * dx;
                const by = cyTr + ratio * dy;

                const angle = ratio * freq * Math.PI * 2;
                const offsetAmp = Math.sin(ratio * Math.PI) * amp;

                const w1Val = Math.sin(angle) * offsetAmp;
                const w2Val = Math.sin(angle + Math.PI) * offsetAmp;

                const p1x = bx + nx * w1Val;
                const p1y = by + ny * w1Val;
                const p2x = bx + nx * w2Val;
                const p2y = by + ny * w2Val;

                wave1Points.push(`${p1x},${p1y}`);
                wave2Points.push(`${p2x},${p2y}`);

                if (i > 0 && i < segmentsCount && i % 2 === 0) {
                  rungs.push(
                    <line 
                      key={i}
                      x1={p1x} y1={p1y} x2={p2x} y2={p2y} 
                      stroke="#e2e8f0" 
                      strokeWidth={1.5}
                      opacity={0.6} 
                    />
                  );
                }
              }

              return (
                <g filter="url(#link-soft-glow)">
                  <line x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} stroke={color} strokeWidth={1} opacity={0.3} />
                  {rungs}
                  <path 
                    d={`M ${wave1Points.join(' L ')}`} 
                    fill="none" 
                    stroke="#14b8a6" 
                    strokeWidth={thickness * 0.9} 
                    opacity={0.9} 
                  />
                  <path 
                    d={`M ${wave2Points.join(' L ')}`} 
                    fill="none" 
                    stroke="#ec4899" 
                    strokeWidth={thickness * 0.9} 
                    opacity={0.9} 
                  />
                </g>
              );
            }

            case "tech-pulse":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 0.6} 
                    opacity={0.3} 
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 1.5} 
                    strokeDasharray="25 60"
                    opacity={0.88}
                  >
                    <animate attributeName="stroke-dashoffset" from="250" to="0" dur="1.0s" repeatCount="indefinite" />
                  </line>
                </g>
              );

            case "water-flow":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#0ea5e9" 
                    strokeWidth={thickness * 3.0} 
                    opacity={0.25 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#38bdf8" 
                    strokeWidth={thickness * 1.3} 
                    strokeDasharray="15 30"
                    strokeLinecap="round"
                    opacity={0.8}
                  >
                    <animate attributeName="stroke-dashoffset" from="180" to="0" dur="1.4s" repeatCount="indefinite" />
                  </line>
                </g>
              );

            case "dragon-energy":
              return (
                <g filter="url(#link-soft-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#b91c1c" 
                    strokeWidth={thickness * 3.5} 
                    opacity={0.3 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#f59e0b" 
                    strokeWidth={thickness * 1.5} 
                    opacity={0.8} 
                    strokeDasharray="40 10"
                    strokeLinecap="round"
                  >
                    <animate attributeName="stroke-dashoffset" from="300" to="0" dur="2.0s" repeatCount="indefinite" />
                  </line>
                </g>
              );

            case "mystic-fog":
              return (
                <g filter="url(#link-dark-smoke-warp)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke={color} 
                    strokeWidth={thickness * 6.0} 
                    opacity={0.28 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#ffffff" 
                    strokeWidth={thickness * 1.5} 
                    opacity={0.35} 
                    strokeLinecap="round"
                  />
                </g>
              );

            case "soul-link": {
              return (
                <g filter="url(#link-heavy-glow)">
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#a855f7" 
                    strokeWidth={thickness * 4.5} 
                    opacity={0.15 * intensityFactor} 
                    strokeLinecap="round"
                  />
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#ec4899" 
                    strokeWidth={thickness * 2.0} 
                    opacity={0.7} 
                    strokeLinecap="round"
                    strokeDasharray="30 20"
                  >
                    <animate attributeName="stroke-dashoffset" from="250" to="0" dur="1.6s" repeatCount="indefinite" />
                  </line>
                  <line 
                    x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} 
                    stroke="#06b6d4" 
                    strokeWidth={thickness * 1.0} 
                    strokeLinecap="round"
                    opacity={0.8}
                    strokeDasharray="15 35"
                  >
                    <animate attributeName="stroke-dashoffset" from="-180" to="0" dur="0.9s" repeatCount="indefinite" />
                  </line>
                  {[0, 1].map(i => (
                    <circle key={i} r={4 * intensityFactor} fill="#ffffff">
                      <animateMotion 
                        path={`M ${cxTr} ${cyTr} L ${cxPk} ${cyPk}`} 
                        dur={`${1.8 + i * 0.7}s`} 
                        begin={`${i * 0.8}s`} 
                        repeatCount="indefinite" 
                      />
                    </circle>
                  ))}
                </g>
              );
            }

            default:
              return <line x1={cxTr} y1={cyTr} x2={cxPk} y2={cyPk} stroke={color} strokeWidth={thickness} opacity={0.6} />;
          }
        };

        return (
          <g key={pk.id}>
            {renderStyle()}

            <foreignObject
              x={midX - 55}
              y={actualMidY - 14}
              width="110"
              height="28"
              className="pointer-events-none select-none"
            >
              <div className="w-full h-full flex items-center justify-center">
                <span 
                  className="px-2.5 py-0.5 bg-neutral-950/85 backdrop-blur-md border border-white/20 text-white font-mono text-[9px] md:text-[10px] font-black rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.85)] flex items-center gap-1 text-center truncate select-none leading-none origin-center transition-all duration-150"
                  style={{ 
                    transform: `rotate(${angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg}deg) scale(${Math.max(0.7, Math.min(2.0, 0.95 / Math.sqrt(zoom)))})`,
                    boxShadow: `0 0 10px ${color}40, 0 4px 10px rgba(0,0,0,0.85)`,
                    borderColor: `${color}80`
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {distText}
                </span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
};

const GridMeshOverlay = ({ map, width, height }: { map: MapItem; width: number; height: number }) => {
  const size = map.gridSize || 50;
  const color = map.gridColor || "rgba(255, 255, 255, 0.25)";
  const opacity = map.gridOpacity ?? 0.5;
  const lineWidth = map.gridLineWidth || 1.5;
  const lineType = map.gridLineType || "solid";
  const type = map.gridType || "square";

  const dashArray = lineType === "dashed" ? `${lineWidth * 3} ${lineWidth * 2}` : lineType === "dotted" ? `${lineWidth} ${lineWidth * 2}` : undefined;

  let patternWidth = size;
  let patternHeight = size;
  let patternElement = null;

  if (type === "iso") {
    patternWidth = size * 2;
    patternHeight = size;
    patternElement = (
      <path
        d={`M 0 ${size / 2} L ${size} 0 L ${size * 2} ${size / 2} L ${size} ${size} Z`}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
      />
    );
  } else if (type === "hexH") {
    // Hexagon Flat-Top (seamless mathematical tiling)
    const r = size;
    const h = Math.round(r * 1.73205);
    const w = r * 3;
    patternWidth = w;
    patternHeight = h;
    patternElement = (
      <path
        d={`
          M ${r / 2} 0 
          L ${r * 1.5} 0 
          L ${r * 2} ${h / 2} 
          L ${r * 1.5} ${h} 
          L ${r / 2} ${h} 
          L 0 ${h / 2} Z 
          M ${r * 2} ${h / 2} 
          L ${w} ${h / 2} 
          M ${r * 2} 0 
          L ${w} 0
          M 0 0
          L ${r / 2} ${h / 2}
          L 0 ${h}
        `}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
      />
    );
  } else if (type === "hexV") {
    // Hexagon Pointy-Top (seamless mathematical tiling)
    const r = size;
    const w = Math.round(r * 1.73205);
    const h = r * 3;
    patternWidth = w;
    patternHeight = h;
    patternElement = (
      <path
        d={`
          M ${w / 2} 0 
          L ${w} ${r / 2} 
          L ${w} ${r * 1.5} 
          L ${w / 2} ${r * 2} 
          L 0 ${r * 1.5} 
          L 0 ${r / 2} Z 
          M ${w / 2} ${r * 2} 
          L ${w / 2} ${h}
          M 0 ${r * 0.5}
          L ${w / 2} ${r * 2}
          L ${w} ${r * 0.5}
        `}
        stroke={color}
        strokeWidth={lineWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
        fill="none"
      />
    );
  } else {
    // Square grid
    patternWidth = size;
    patternHeight = size;
    patternElement = (
      <rect
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
      />
    );
  }

  const patternId = `grid-pattern-${map.id || 'default'}-${size}-${lineWidth}-${type}-${lineType}`;

  return (
    <svg 
      className="absolute inset-0 pointer-events-none select-none rounded-xl"
      style={{
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      <defs>
        <pattern
          id={patternId}
          width={patternWidth}
          height={patternHeight}
          patternUnits="userSpaceOnUse"
        >
          {patternElement}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

interface PokemonListItem {
  id: number;
  name: string;
  rawName: string;
  sprite: string;
}

const fetchPokemonList = async (): Promise<PokemonListItem[]> => {
  const cached = localStorage.getItem("pokeapi_pokemon_list_v1");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }

  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1200");
  const data = await response.json();
  const list: PokemonListItem[] = data.results.map((item: any) => {
    const parts = item.url.split("/").filter(Boolean);
    const id = parseInt(parts[parts.length - 1], 10);
    const formattedName = item.name.charAt(0).toUpperCase() + item.name.slice(1).replace(/-/g, " ");
    return {
      id,
      name: formattedName,
      rawName: item.name,
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
    };
  });

  try {
    localStorage.setItem("pokeapi_pokemon_list_v1", JSON.stringify(list));
  } catch (err) {
    console.warn("Failed to save pokeapi_pokemon_list_v1 to localStorage:", err);
  }
  return list;
};

const fetchMovesList = async (): Promise<string[]> => {
  const cached = localStorage.getItem("pokeapi_moves_list_v1");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }

  const response = await fetch("https://pokeapi.co/api/v2/move?limit=1100");
  const data = await response.json();
  const list: string[] = data.results.map((item: any) => {
    return item.name
      .split("-")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  });

  try {
    localStorage.setItem("pokeapi_moves_list_v1", JSON.stringify(list));
  } catch (err) {
    console.warn("Failed to save pokeapi_moves_list_v1 to localStorage:", err);
  }
  return list;
};

export const POKEMON_TYPES_STYLING: { [key: string]: { bg: string, border: string, text: string, emoji: string } } = {
  Normal: { bg: "bg-neutral-500/15", border: "border-neutral-500/30", text: "text-neutral-300", emoji: "🔘" },
  Fire: { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400", emoji: "🔥" },
  Water: { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400", emoji: "💧" },
  Electric: { bg: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-400", emoji: "⚡" },
  Grass: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", emoji: "🌿" },
  Ice: { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-300", emoji: "❄️" },
  Fighting: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400", emoji: "💥" },
  Poison: { bg: "bg-purple-500/15", border: "border-purple-500/30", text: "text-purple-400", emoji: "💀" },
  Ground: { bg: "bg-amber-600/15", border: "border-amber-600/30", text: "text-amber-500", emoji: "⛰️" },
  Flying: { bg: "bg-indigo-400/15", border: "border-indigo-400/30", text: "text-indigo-300", emoji: "🦅" },
  Psychic: { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-400", emoji: "🔮" },
  Bug: { bg: "bg-lime-500/15", border: "border-lime-500/30", text: "text-lime-400", emoji: "🐛" },
  Rock: { bg: "bg-yellow-700/15", border: "border-yellow-700/30", text: "text-yellow-650", emoji: "🪨" },
  Ghost: { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400", emoji: "👻" },
  Dragon: { bg: "bg-blue-700/15", border: "border-blue-700/30", text: "text-blue-500", emoji: "🐉" },
  Dark: { bg: "bg-neutral-800/25", border: "border-neutral-700/30", text: "text-neutral-400", emoji: "🌑" },
  Steel: { bg: "bg-zinc-400/15", border: "border-zinc-400/30", text: "text-zinc-300", emoji: "⚙️" },
  Fairy: { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-450", emoji: "🧚" }
};

const POKEMON_SKILLS_LIST = [
  { name: "Adestrar Animais", attr: "SAB" as const },
  { name: "Acrobacia", attr: "DES" as const },
  { name: "Arcanismo", attr: "INT" as const },
  { name: "Atletismo", attr: "FOR" as const },
  { name: "Atuação", attr: "CAR" as const },
  { name: "Enganação", attr: "CAR" as const },
  { name: "História", attr: "INT" as const },
  { name: "Intimidação", attr: "CAR" as const },
  { name: "Intuição", attr: "SAB" as const },
  { name: "Investigação", attr: "INT" as const },
  { name: "Medicina", attr: "SAB" as const },
  { name: "Natureza", attr: "INT" as const },
  { name: "Percepção", attr: "SAB" as const },
  { name: "Persuasão", attr: "CAR" as const },
  { name: "Prestidigitação", attr: "DES" as const },
  { name: "Religião", attr: "INT" as const },
  { name: "Sobrevivência", attr: "SAB" as const },
  { name: "Furtividade", attr: "DES" as const }
];

export interface PokemonLoyaltyLevel {
  value: number;
  label: string;
  color: string;
  barColor: string;
  desc: string;
  tooltipBg: string;
  detail: string;
  bonus: string;
  penalty: string;
}

export const POKEMON_LOYALTY_LEVELS: PokemonLoyaltyLevel[] = [
  { value: -3, label: "Desleal", color: "text-red-500 bg-red-500/10 border-red-500/30", barColor: "bg-red-650", desc: "Desleal", tooltipBg: "border-red-500/40 bg-red-950/90", detail: "O Pokémon não confia em você.", bonus: "Nenhum.", penalty: "-1 em todos os testes de resistência. Antes de executar qualquer Move, realiza teste d20 > 15 automático. Se falhar, o Move falha e exibe 'Pokémon recusou a ordem.'" },
  { value: -2, label: "Indiferente", color: "text-rose-400 bg-rose-500/10 border-rose-500/30", barColor: "bg-rose-550", desc: "Indiferente", tooltipBg: "border-rose-500/40 bg-rose-950/90", detail: "O Pokémon se sente indiferente em relação a você.", bonus: "Nenhum.", penalty: "-1 em todos os testes de resistência. Antes de executar qualquer Move, realiza teste d20 > 10 automático. Se falhar, o Move falha e exibe 'Pokémon ignorou a ordem.'" },
  { value: -1, label: "Chateado", color: "text-orange-500 bg-orange-500/10 border-orange-500/30", barColor: "bg-orange-550", desc: "Chateado", tooltipBg: "border-orange-500/40 bg-orange-950/90", detail: "O Pokémon está chateado com suas decisões recentes.", bonus: "Nenhum.", penalty: "-1 em todos os testes de resistência." },
  { value: 0, label: "Neutro", color: "text-neutral-400 bg-neutral-500/10 border-neutral-500/30", barColor: "bg-neutral-500", desc: "Neutro", tooltipBg: "border-neutral-500/40 bg-[#0c0d12]/95", detail: "Relação típica e sem modificadores.", bonus: "Nenhum.", penalty: "Nenhuma." },
  { value: 1, label: "Contente", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20", barColor: "bg-emerald-400", desc: "Contente", tooltipBg: "border-emerald-500/40 bg-[#051e12]/95", detail: "O Pokémon está feliz e contente com você.", bonus: "+1 em todos os testes de resistência.", penalty: "Nenhuma." },
  { value: 2, label: "Satisfeito", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", barColor: "bg-emerald-500", desc: "Satisfeito", tooltipBg: "border-emerald-500/50 bg-[#051e12]/95", detail: "Relação forte e harmoniosa de companheirismo.", bonus: "+1 em todos os testes de resistência. HP Máximo aumentado em ceil(Nível/2). Seleciona 1 Perícia Proficiente permanente.", penalty: "Nenhuma." },
  { value: 3, label: "Leal", color: "text-emerald-500 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.3)] bg-emerald-500/20 border-emerald-500/50", barColor: "bg-emerald-600 animate-pulse", desc: "Leal", tooltipBg: "border-emerald-500/60 bg-[#051e12]/95", detail: "Laço inquebrável, devoção eterna ao treinador de forma plena.", bonus: "+1 em todos os testes de resistência. HP Máximo aumentado igual ao Nível completo (substitui bônus de Satisfeito). Seleciona 1 Perícia Proficiente permanente (em +2). Seleciona 1 Perícia Especializada (dobro do bônus de proficiência).", penalty: "Nenhuma." }
];

export const SR_VALUES = ["1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];

export const XP_SR_LEVEL_TABLE: (number | null)[][] = [
  // Lvl 1
  [20, 40, 80, 160, 360, 560, 880, 1400, 1800, 2300, null, null, null, null, null, null, null, null],
  // Lvl 2
  [40, 80, 160, 360, 560, 880, 1400, 1800, 2300, 3100, null, null, null, null, null, null, null, null],
  // Lvl 3
  [80, 150, 340, 530, 840, 1400, 1700, 2200, 3000, 3800, null, null, null, null, null, null, null, null],
  // Lvl 4
  [140, 320, 500, 790, 1300, 1700, 2100, 2800, 3600, 4200, null, null, null, null, null, null, null, null],
  // Lvl 5
  [360, 560, 880, 1400, 1800, 2300, 3100, 4000, 4700, 5800, 6700, 8000, 9200, 10400, null, null, null, null],
  // Lvl 6
  [530, 840, 1400, 1700, 2200, 3000, 3800, 4500, 5500, 6400, 7600, 8700, 9900, 10600, null, null, null, null],
  // Lvl 7
  [820, 1300, 1700, 2200, 2900, 3700, 4400, 5400, 6200, 7400, 8600, 9700, 10400, 11000, null, null, null, null],
  // Lvl 8
  [1300, 1700, 2100, 2800, 3600, 4300, 5200, 6100, 7300, 8400, 9500, 10200, 10700, 11300, 12200, 13400, null, null],
  // Lvl 9
  [1600, 2000, 2700, 3500, 4200, 5100, 5900, 7000, 8100, 9200, 9900, 10400, 10900, 11600, 12600, 14200, null, null],
  // Lvl 10
  [2300, 3100, 4000, 4700, 5800, 6700, 8000, 9200, 10400, 11200, 11800, 12400, 13200, 14400, 15600, 16800, 18400, null],
  // Lvl 11
  [3000, 3800, 4500, 5500, 6500, 7700, 8800, 10000, 10800, 11300, 11900, 12700, 13800, 15000, 16100, 17700, 19200, null],
  // Lvl 12
  [3800, 4400, 5400, 6300, 7500, 8600, 9800, 10500, 11100, 11700, 12400, 13500, 14700, 15800, 17300, 18800, 20300, null],
  // Lvl 13
  [4300, 5300, 6200, 7400, 8500, 9600, 10300, 10900, 11400, 12100, 13200, 14400, 15500, 16900, 18400, 19900, 21700, null],
  // Lvl 14
  [5200, 6000, 7200, 8300, 9400, 10100, 10600, 11200, 11900, 13000, 14000, 15100, 16600, 18000, 19400, 21200, 23000, null],
  // Lvl 15
  [5900, 7000, 8100, 9200, 9900, 10400, 10900, 11600, 12700, 13700, 14800, 16200, 17600, 19000, 20800, 22500, 24600, 26800],
  // Lvl 16
  [6900, 7900, 8900, 9600, 10100, 10700, 11400, 12400, 13400, 14400, 15800, 17200, 18600, 20300, 22000, 24100, 26100, 28200],
  // Lvl 17
  [9200, 10400, 11200, 11800, 12400, 13200, 14400, 15600, 16800, 18400, 20000, 21605, 23600, 25600, 28000, 30400, 32800, 36000],
  // Lvl 18
  [10000, 10800, 11300, 11900, 12700, 13800, 15000, 16100, 17700, 19200, 20700, 22700, 24600, 26900, 29200, 31500, 34600, 38400],
  // Lvl 19
  [10500, 11100, 11700, 12400, 13500, 14700, 15800, 17300, 18800, 20300, 22200, 24100, 26300, 28600, 30800, 33800, 37600, 42300],
  // Lvl 20
  [10900, 11400, 12100, 13200, 14400, 15500, 16900, 18400, 19900, 21700, 23600, 25800, 28000, 30200, 33100, 36800, 41400, 46000]
];

export function getSrForBst(bst: number): string {
  if (bst <= 210) return "1/8";
  if (bst <= 270) return "1/4";
  if (bst <= 315) return "1/2";
  if (bst <= 365) return "1";
  if (bst <= 415) return "2";
  if (bst <= 455) return "3";
  if (bst <= 495) return "4";
  if (bst <= 535) return "5";
  if (bst <= 575) return "6";
  if (bst <= 595) return "7";
  if (bst <= 615) return "8";
  if (bst <= 635) return "9";
  if (bst <= 655) return "10";
  if (bst <= 675) return "11";
  if (bst <= 695) return "12";
  if (bst <= 715) return "13";
  if (bst <= 735) return "14";
  return "15";
}

export function getXPRequiredForLevel(level: number, sr: string = "1"): number {
  const l = Math.max(1, Math.min(20, level));
  const srIndex = SR_VALUES.indexOf(sr);
  const srColIndex = srIndex >= 0 ? srIndex : 3;
  const row = XP_SR_LEVEL_TABLE[l - 1];
  if (!row) return 1000;
  const value = row[srColIndex];
  if (value === null || value === undefined || isNaN(value)) {
    for (let offset = 1; offset < SR_VALUES.length; offset++) {
      if (srColIndex - offset >= 0) {
        const leftVal = row[srColIndex - offset];
        if (leftVal !== null && leftVal !== undefined && !isNaN(leftVal)) return leftVal;
      }
      if (srColIndex + offset < SR_VALUES.length) {
        const rightVal = row[srColIndex + offset];
        if (rightVal !== null && rightVal !== undefined && !isNaN(rightVal)) return rightVal;
      }
    }
    return 1000;
  }
  return value;
}

export function calcularXPDerrota(nivel: number, sr: string): number {
  return getXPRequiredForLevel(nivel, sr);
}

export function calcularXPCaptura(nivel: number, sr: string): number {
  return Math.round(0.20 * calcularXPDerrota(nivel, sr));
}

export function parseHitDie(die: string): { max: number; average: number } {
  const clean = (die || "1d8").toLowerCase().replace(/\s/g, "");
  if (clean.includes("d12") || clean === "12") return { max: 12, average: 7 };
  if (clean.includes("d10") || clean === "10") return { max: 10, average: 6 };
  if (clean.includes("d6") || clean === "6") return { max: 6, average: 4 };
  return { max: 8, average: 5 };
}

export function calculateProficiencyBonus(level: number): number {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

export function calculateStabBonus(level: number): number {
  if (level <= 2) return 0;
  if (level <= 6) return 1;
  if (level <= 10) return 2;
  if (level <= 14) return 3;
  if (level <= 18) return 4;
  return 5;
}

const POKEMON_FEATS_POOL = [
  {
    id: "fortitude-maior",
    name: "Fortitude Maior",
    description: "Concede +1 de bônus em Constituição (CON) e adiciona +15 pontos de vida máximos retroativamente.",
    requirements: "Nenhum"
  },
  {
    id: "velocidade-extrema",
    name: "Velocidade Extrema",
    description: "Adiciona +3 metros ao deslocamento por terra do Pokémon e concede +2 de bônus nas jogadas de Iniciativa.",
    requirements: "DES 13+"
  },
  {
    id: "poder-elemental",
    name: "Poder Elemental",
    description: "Sempre que usar um movimento que seja de um tipo correspondente aos tipos naturais do Pokémon, o dano do move recebe um bônus extra de +1d6.",
    requirements: "Nível 4+"
  },
  {
    id: "pele-de-ferro",
    name: "Pele de Ferro",
    description: "O corpo do Pokémon se torna altamente resistente. Concede +1 na Classe de Armadura (CA) e resistência a danos físicos não-mágicos.",
    requirements: "CON 13+"
  },
  {
    id: "foco-supremo",
    name: "Foco Supremo",
    description: "Concede vantagem em testes de salvaguarda criados para manter concentração e adiciona +2 PPs máximos em todos os moves.",
    requirements: "SAB 12+"
  },
  {
    id: "ataque-furtivo",
    name: "Ataque Furtivo",
    description: "Uma vez por turno, o Pokémon pode causar +1d6 de dano de ataque extra se possuir Vantagem na jogada contra o alvo.",
    requirements: "DES 14+"
  },
  {
    id: "iniciativa-alerta",
    name: "Iniciativa Alerta",
    description: "O Pokémon reage instantaneamente aos perigos. Concede +5 de bônus na Iniciativa e impede que o Pokémon seja surpreendido.",
    requirements: "Nenhum"
  },
  {
    id: "vigor-duradouro",
    name: "Vigor Duradouro",
    description: "Quando o HP cai abaixo de 50%, o Pokémon ativa regeneração ativa, recuperando 1d10 HP no início de cada turno por 3 turnos (1 vez por descanso longo).",
    requirements: "CON 14+"
  },
  {
    id: "movimento-agil",
    name: "Movimento Ágil",
    description: "O Pokémon move-se com extrema graciosidade. Ele pode usar a ação de Desangajar (Disengage) como uma Ação Bônus em seu turno.",
    requirements: "DES 12+"
  }
];

interface PokemonNature {
  id: string;
  name: string;
  description: string;
  bonusAttr?: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR" | "CA";
  penaltyAttr?: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
}

const POKEMON_NATURES: PokemonNature[] = [
  { id: "arrogante", name: "Arrogante", description: "Este Pokémon se acha superior aos outros e menospreza a agilidade alheia.", bonusAttr: "FOR", penaltyAttr: "DES" },
  { id: "impulsivo", name: "Impulsivo", description: "Age antes de pensar, priorizando a força imediata sobre a própria resistência física.", bonusAttr: "FOR", penaltyAttr: "CON" },
  { id: "corajoso", name: "Corajoso", description: "Este Pokémon enfrenta o perigo com bravura e determinação, ignorando perigos óbvios.", bonusAttr: "FOR", penaltyAttr: "SAB" },
  { id: "serio", name: "Sério", description: "Focado e compenetrado em seus objetivos físicos, demonstrando pouca expressividade.", bonusAttr: "FOR", penaltyAttr: "CAR" },
  { id: "determinado", name: "Determinado", description: "Focado em movimentos rápidos e precisos no lugar de força bruta pura.", bonusAttr: "DES", penaltyAttr: "FOR" },
  { id: "apressado", name: "Apressado", description: "Sempre com pressa e impaciente, sacrificando a própria integridade e resistência.", bonusAttr: "DES", penaltyAttr: "CON" },
  { id: "energetico", name: "Energético", description: "Possui uma energia frenética que pode ser intimidadora ou inconveniente em interações sociais.", bonusAttr: "DES", penaltyAttr: "CAR" },
  { id: "curioso", name: "Curioso", description: "Sua agilidade de mente e corpo o leva a explorar tudo, muitas vezes sem cautela básica.", bonusAttr: "DES", penaltyAttr: "SAB" },
  { id: "sereno", name: "Sereno", description: "Extremamente calmo e robusto, porém com respostas e movimentos mais lentos.", bonusAttr: "CON", penaltyAttr: "DES" },
  { id: "teimoso", name: "Teimoso", description: "Tem uma resiliência física teimosa, mas pode ignorar conselhos intuitivos e o ambiente.", bonusAttr: "CON", penaltyAttr: "SAB" },
  { id: "apatico", name: "Apático", description: "Fisicamente durável, mas demonstra desinteresse em interações e falta de presença social.", bonusAttr: "CON", penaltyAttr: "CAR" },
  { id: "preguicoso", name: "Preguiçoso", description: "Prefere suportar impactos passivamente no lugar de gastar cansaço com esforços físicos ofensivos.", bonusAttr: "CON", penaltyAttr: "FOR" },
  { id: "prudente", name: "Prudente", description: "Extremamente cauteloso e perceptivo aos perigos, evitando ataques de força bruta direta.", bonusAttr: "SAB", penaltyAttr: "FOR" },
  { id: "sabio", name: "Sábio", description: "Possui uma compreensão profunda do mundo, embora sua constituição física seja mais frágil.", bonusAttr: "SAB", penaltyAttr: "CON" },
  { id: "travesso", name: "Travesso", description: "Brincalhão e perceptivo aos arredores, mas costuma afastar os outros com pegadinhas.", bonusAttr: "SAB", penaltyAttr: "CAR" },
  { id: "alegre", name: "Alegre", description: "Irradia simpatia e felicidade constante, preferindo a boa convivência à violência física.", bonusAttr: "CAR", penaltyAttr: "FOR" },
  { id: "sociavel", name: "Sociável", description: "Altamente amigável e focado em conexões, embora possa ser descoordenado fisicamente.", bonusAttr: "CAR", penaltyAttr: "DES" },
  { id: "ingenuo", name: "Ingênuo", description: "Encantador e inocente, confiando em todos sem julgar os perigos ao seu redor.", bonusAttr: "CAR", penaltyAttr: "SAB" },
  { id: "timido", name: "Tímido", description: "Evita o confronto direto, preferindo focar em autodefesa passiva ao invés de manobras de esquiva.", bonusAttr: "CA", penaltyAttr: "DES" },
  { id: "astuto", name: "Astuto", description: "Usa de táticas defensivas inteligentes e dissimuladas para se proteger, sem depender de força muscular bruta.", bonusAttr: "CA", penaltyAttr: "FOR" }
];

const POKEAPI_TYPE_MAP: { [key: string]: string } = {
  normal: "Normal",
  fire: "Fire",
  water: "Water",
  electric: "Electric",
  grass: "Grass",
  ice: "Ice",
  fighting: "Fighting",
  poison: "Poison",
  ground: "Ground",
  flying: "Flying",
  psychic: "Psychic",
  bug: "Bug",
  rock: "Rock",
  ghost: "Ghost",
  dragon: "Dragon",
  dark: "Dark",
  steel: "Steel",
  fairy: "Fairy"
};

const ALL_POKEMON_TYPES = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
  "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
  "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
];

const TYPE_DEFENSIVE_CHART: { [defendingType: string]: { [attackingType: string]: number } } = {
  Normal: { Fighting: 2, Ghost: 0 },
  Fire: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 },
  Water: { Grass: 2, Electric: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
  Electric: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 },
  Grass: { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ground: 0.5 },
  Ice: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 },
  Fighting: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 },
  Poison: { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 },
  Ground: { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 },
  Flying: { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 },
  Psychic: { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 },
  Bug: { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 },
  Rock: { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 },
  Ghost: { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 },
  Dragon: { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5 },
  Dark: { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 },
  Steel: { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 },
  Fairy: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }
};

const getEffectiveness = (atk: string, defs: string[]): number => {
  let multiplier = 1.0;
  for (const def of defs) {
    if (def && TYPE_DEFENSIVE_CHART[def] && TYPE_DEFENSIVE_CHART[def][atk] !== undefined) {
      multiplier *= TYPE_DEFENSIVE_CHART[def][atk];
    }
  }
  return multiplier;
};

export const calculateMatchups = (types: string[]) => {
  const weaknesses: string[] = [];
  const resistances: string[] = [];
  const immunities: string[] = [];
  
  const filteredTypes = (types || []).filter(Boolean);
  if (filteredTypes.length === 0) {
    return { weaknesses, resistances, immunities };
  }
  
  for (const atk of ALL_POKEMON_TYPES) {
    const mult = getEffectiveness(atk, filteredTypes);
    if (mult > 1) {
      weaknesses.push(`${atk} ×${mult}`);
    } else if (mult === 0) {
      immunities.push(`${atk} ×0`);
    } else if (mult < 1) {
      resistances.push(`${atk} ×${mult}`);
    }
  }
  return { weaknesses, resistances, immunities };
};

export const ensureMoveObj = (m: any): any => {
  if (!m) return { name: "", description: "", pp: 15, ppCurrent: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal", attackBonus: 0, difficultyClass: 0, attackType: "" };
  if (typeof m === "string") {
    return { name: m, description: "", pp: 15, ppCurrent: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal", attackBonus: 0, difficultyClass: 0, attackType: "" };
  }
  const maxPp = m.pp !== undefined ? m.pp : 15;
  return {
    name: m.name || "",
    description: m.description || "",
    pp: maxPp,
    ppCurrent: m.ppCurrent !== undefined ? m.ppCurrent : maxPp,
    damage: m.damage || "",
    cost: m.cost || "",
    range: m.range || "",
    power: m.power !== undefined ? m.power : 0,
    duration: m.duration || "",
    type: m.type || "Normal",
    attackBonus: m.attackBonus !== undefined ? m.attackBonus : 0,
    difficultyClass: m.difficultyClass !== undefined ? m.difficultyClass : 0,
    attackType: m.attackType || ""
  };
};

// Interactive Pokéball SVG component
const PokeballIcon = ({ className = "w-5 h-5", glowColor = "#10b981", hideStyle = false }: { className?: string, glowColor?: string, hideStyle?: boolean }) => {
  return (
    <svg className={`${className} transition-transform duration-300`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2500/svg">
      {/* Outer black edge shadow */}
      <circle cx="50" cy="50" r="46" fill="#11131a" stroke="currentColor" strokeWidth="4" className="text-neutral-700" />
      
      {/* Upper (Red/Pokeball) */}
      <path d="M7 50 C 7 26.25, 26.25 7, 50 7 C 73.75 7, 93 26.25, 93 50 Z" fill="url(#pbRed)" />
      
      {/* Lower (White) */}
      <path d="M7 50 C 7 73.75, 26.25 93, 50 93 C 73.75 93, 93 73.75, 93 50 Z" fill="url(#pbWhite)" />
      
      {/* Center Black Line Divider */}
      <line x1="5" y1="50" x2="95" y2="50" stroke="#090a0f" strokeWidth="8" />
      
      {/* Center Button Housing */}
      <circle cx="50" cy="50" r="16" fill="#090a0f" />
      <circle cx="50" cy="50" r="11" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      
      {/* Center core LED light */}
      <circle cx="50" cy="50" r="5" fill={glowColor} className="animate-pulse" style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }} />

      {hideStyle && (
        <>
          {/* Downward arrows representing recalling/retracting */}
          <path d="M38 31 L50 38 L62 31" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
          <path d="M38 22 L50 29 L62 22" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </>
      )}

      <defs>
        <linearGradient id="pbRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="pbWhite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default function App() {
  const isFetchingFromCloudRef = useRef(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const lastSyncedMapsRef = useRef<MapItem[]>([]);
  const lastSyncedFoldersRef = useRef<MapFolder[]>([]);
  const lastSyncedTrainerFoldersRef = useRef<TrainerFolder[]>([]);
  const lastSyncedTrainerRecordsRef = useRef<TrainerRecord[]>([]);
  const lastSyncedTokensRef = useRef<TokenItem[]>([]);

  // Durable local states
  const [maps, setMaps] = useState<MapItem[]>(() => {
    const saved = localStorage.getItem("vtt_maps");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [activeMapId, setActiveMapId] = useState<string | null>(() => {
    const saved = localStorage.getItem("vtt_active_map_id");
    if (saved && saved !== "null") return saved;
    return null;
  });

  const [tokens, setTokens] = useState<TokenItem[]>(() => {
    const saved = localStorage.getItem("vtt_tokens");
    if (saved) {
      try {
        const parsed: TokenItem[] = JSON.parse(saved);
        return parsed.filter(t => t.trainerId !== "trainer-ash" && t.trainerId !== "trainer-misty" && t.trainerId !== "trainer-brock" && t.trainerId !== "trainer-oak");
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [folders, setFolders] = useState<MapFolder[]>(() => {
    const saved = localStorage.getItem("vtt_map_folders");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [popoverDragActive, setPopoverDragActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [activeAction, setActiveAction] = useState<'upload' | 'link' | 'folder' | null>(null);
  const [draggingSidebarMapId, setDraggingSidebarMapId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingMapNameValue, setEditingMapNameValue] = useState("");
  const [activeFolderColorPickerId, setActiveFolderColorPickerId] = useState<string | null>(null);

  // Trainer Directory States
  const [trainerFolders, setTrainerFolders] = useState<TrainerFolder[]>(() => {
    const saved = localStorage.getItem("vtt_trainer_folders");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: "f-players", name: "Jogadores", createdAt: new Date().toISOString() },
      { id: "f-npcs", name: "NPCs", createdAt: new Date().toISOString() },
      { id: "f-viloes", name: "Vilões", createdAt: new Date().toISOString() },
      { id: "f-elite4", name: "Elite Four", createdAt: new Date().toISOString() },
    ];
  });

  const [trainerRecords, setTrainerRecords] = useState<TrainerRecord[]>(() => {
    const saved = localStorage.getItem("vtt_trainer_records");
    if (saved) {
      try {
        const parsed: TrainerRecord[] = JSON.parse(saved);
        return parsed.filter(t => t.id !== "trainer-ash" && t.id !== "trainer-misty" && t.id !== "trainer-brock" && t.id !== "trainer-oak");
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [searchTrainerQuery, setSearchTrainerQuery] = useState("");
  const [selectedTrainerFolderId, setSelectedTrainerFolderId] = useState<string | null>(null);
  
  // Modals for Trainer management
  const [isCreateTrainerModalOpen, setIsCreateTrainerModalOpen] = useState(false);
  const [isEditTrainerModalOpen, setIsEditTrainerModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [isViewTrainerModalOpen, setIsViewTrainerModalOpen] = useState(false);
  
  // Sharing & Permissions Modal for Foundry style features
  const [sharingModalTarget, setSharingModalTarget] = useState<{
    type: "trainer" | "folder" | "token" | "map" | "mapFolder";
    id: string;
    name: string;
    ownerId?: string;
    permissions?: { canView?: string[]; canEdit?: string[] };
  } | null>(null);
  
  // Etapa 4: Pokéball & Summon States
  const [userRole, setUserRole] = useState<"Mestre" | "Jogador">("Mestre");

  // Mesa Online / Multiplayer States
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mesa");
    if (m) {
      localStorage.setItem("vtt_room_id", m);
      return m;
    }
    return localStorage.getItem("vtt_room_id") || null;
  });
  const [roomData, setRoomData] = useState<any>(null);
  const [roomDmId, setRoomDmId] = useState<string | null>(null);
  const [roomDmName, setRoomDmName] = useState<string | null>(null);
  const [isConnectingRoom, setIsConnectingRoom] = useState(false);
  const [roomPopOpen, setRoomPopOpen] = useState(false);
  const [dismissedRoomOnboarding, setDismissedRoomOnboarding] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mesa")) return false;
    if (localStorage.getItem("vtt_room_id")) return false;
    return !localStorage.getItem("vtt_dismissed_welcome");
  });
  const [inputRoomId, setInputRoomId] = useState("");
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [roomTrainerRecords, setRoomTrainerRecords] = useState<TrainerRecord[]>([]);
  const allAvailableTrainerRecords = React.useMemo(() => {
    const combined = [...trainerRecords];
    roomTrainerRecords.forEach(r => {
      if (!combined.some(c => c.id === r.id)) {
        combined.push(r);
      }
    });
    return combined;
  }, [trainerRecords, roomTrainerRecords]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [inputMessage, setInputMessage] = useState("");

  const [activePokeballTrainerId, setActivePokeballTrainerId] = useState<string | null>(null);
  const [selectedPokeballTrainerId, setSelectedPokeballTrainerId] = useState<string | null>(null);
  const [selectedPokeballPokemon, setSelectedPokeballPokemon] = useState<any | null>(null);
  const [pokeballViewMode, setPokeballViewMode] = useState<'owner' | 'public'>('owner');
  const [vttEffects, setVttEffects] = useState<{ id: string; x: number; y: number; type: 'summon' | 'recall'; imageUrl?: string; size: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredRadialSlice, setHoveredRadialSlice] = useState<number | null>(null);
  
  // Responsive scale and ref for Pokéball radial menu
  const backdropRef = useRef<HTMLDivElement>(null);
  const [radialScale, setRadialScale] = useState(1);
  
  // Custom Pokéball Styling States with persistence
  const [pokeballColor1, setPokeballColor1] = useState<string>(() => {
    return localStorage.getItem("vtt_pokeball_color1") || "#ef4444";
  });
  const [pokeballColor2, setPokeballColor2] = useState<string>(() => {
    return localStorage.getItem("vtt_pokeball_color2") || "#ffffff";
  });
  const [isPokeballSettingsOpen, setIsPokeballSettingsOpen] = useState<boolean>(false);

  const changePokeballColor1 = (val: string) => {
    setPokeballColor1(val);
    localStorage.setItem("vtt_pokeball_color1", val);
  };
  const changePokeballColor2 = (val: string) => {
    setPokeballColor2(val);
    localStorage.setItem("vtt_pokeball_color2", val);
  };
  
  // Active items for editing/viewing in modals
  const [activeTrainerRecord, setActiveTrainerRecord] = useState<TrainerRecord | null>(null);
  const [activeTrainerFolder, setActiveTrainerFolder] = useState<TrainerFolder | null>(null);

  // Form Fields for Trainer/Folder creation and edit
  const [formTrainerName, setFormTrainerName] = useState("");
  const [formTrainerImage, setFormTrainerImage] = useState("");
  const [formTrainerFolderId, setFormTrainerFolderId] = useState<string>("");
  const [formFolderName, setFormFolderName] = useState("");
  const [formFolderParentId, setFormFolderParentId] = useState<string>("");
  const [formFolderColor, setFormFolderColor] = useState("#6366f1");

  // New Etapa 2 States: Multi-step Trainer Wizard Form State
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [formTrainerClass, setFormTrainerClass] = useState("Treinador Pokémon");
  const [formTrainerLevel, setFormTrainerLevel] = useState<number>(1);
  const [formTrainerAttrMethod, setFormTrainerAttrMethod] = useState<"Standard Array" | "Point Buy">("Standard Array");
  const [formTrainerAttrs, setFormTrainerAttrs] = useState({
    FOR: 15,
    DES: 14,
    CON: 13,
    INT: 12,
    SAB: 10,
    CAR: 8
  });

  // Active sheet tab
  const [trainerActiveTab, setTrainerActiveTab] = useState<"geral" | "atributos" | "pericias" | "combate" | "inventario" | "equipe" | "pc" | "talentos" | "notas">("geral");
  const [trainerHeaderCompact, setTrainerHeaderCompact] = useState(false);
  const [bagPocketFilter, setBagPocketFilter] = useState<string>("Tudo");

  useEffect(() => {
    if (isViewTrainerModalOpen) {
      setTrainerHeaderCompact(false);
      if (trainerScrollContainerRef.current) {
        trainerScrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isViewTrainerModalOpen, activeTrainerRecord?.id]);

  // Pokémon creation and editing form state (floating independent modals)
  const [isAddPokemonModalOpen, setIsAddPokemonModalOpen] = useState(false);
  const [formPokemonName, setFormPokemonName] = useState("");
  const [formPokemonSpecies, setFormPokemonSpecies] = useState("");
  const [formPokemonLevel, setFormPokemonLevel] = useState<number>(5);
  const [formPokemonHpMax, setFormPokemonHpMax] = useState<number>(20);
  const [formPokemonHpCurrent, setFormPokemonHpCurrent] = useState<number>(20);
  const [formPokemonImage, setFormPokemonImage] = useState("");
  const [formPokemonIsPc, setFormPokemonIsPc] = useState(false);
  const [editingPokemonId, setEditingPokemonId] = useState<string | null>(null);
  const [hpChangeValue, setHpChangeValue] = useState("");
  const [formPokemonIsShiny, setFormPokemonIsShiny] = useState(false);
  const [formPokemonImageDefault, setFormPokemonImageDefault] = useState("");
  const [formPokemonImageShiny, setFormPokemonImageShiny] = useState("");
  
  // Nature states
  const [formPokemonNature, setFormPokemonNature] = useState<string>("");
  const [formPokemonNatureConfirmed, setFormPokemonNatureConfirmed] = useState<boolean>(false);
  const [isD20Rolling, setIsD20Rolling] = useState(false);
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);

  // Loyalty states
  const [formPokemonLoyalty, setFormPokemonLoyalty] = useState<number>(0);
  const [formPokemonLoyaltyBonusSkill, setFormPokemonLoyaltyBonusSkill] = useState<string>("");
  const [formPokemonLoyaltySpecialistSkill, setFormPokemonLoyaltySpecialistSkill] = useState<string>("");
  const [formPokemonLoyaltyEvolutionEligible, setFormPokemonLoyaltyEvolutionEligible] = useState<boolean>(false);
  const [formPokemonTypes, setFormPokemonTypes] = useState<string[]>([]);
  const [formPokemonWeaknesses, setFormPokemonWeaknesses] = useState<string[]>([]);
  const [formPokemonResistances, setFormPokemonResistances] = useState<string[]>([]);
  const [formPokemonImmunities, setFormPokemonImmunities] = useState<string[]>([]);
  const [formPokemonTalentos, setFormPokemonTalentos] = useState<any[]>([]);

  // Autocomplete & PokeAPI states
  const [formPokemonInitiative, setFormPokemonInitiative] = useState<number>(0);
  const [formPokemonMoveObj1, setFormPokemonMoveObj1] = useState<PokemonMoveObject>({ name: "", description: "", pp: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal" });
  const [formPokemonMoveObj2, setFormPokemonMoveObj2] = useState<PokemonMoveObject>({ name: "", description: "", pp: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal" });
  const [formPokemonMoveObj3, setFormPokemonMoveObj3] = useState<PokemonMoveObject>({ name: "", description: "", pp: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal" });
  const [formPokemonMoveObj4, setFormPokemonMoveObj4] = useState<PokemonMoveObject>({ name: "", description: "", pp: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal" });
  const [expandedMoves, setExpandedMoves] = useState<{ [key: number]: boolean }>({});
  const [expandedTalents, setExpandedTalents] = useState<Record<string, boolean>>({});
  const [expandedFeats, setExpandedFeats] = useState<Record<string, boolean>>({});
  const [expandedMatchups, setExpandedMatchups] = useState<Record<string, boolean>>({});
  const [formPokemonSpeciesId, setFormPokemonSpeciesId] = useState<number | null>(null);

  // Extra states for refactored Pokemon Sheet
  const [formPokemonActiveTab, setFormPokemonActiveTab] = useState<"identidade" | "combate" | "tracos" | "evolucao">("identidade");
  const [formPokemonAttrs, setFormPokemonAttrs] = useState({ FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 });
  const [formPokemonSavingThrows, setFormPokemonSavingThrows] = useState<Record<string, boolean>>({ FOR: false, DES: false, CON: false, INT: false, SAB: false, CAR: false });
  const [formPokemonStatusStages, setFormPokemonStatusStages] = useState({ attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0, criticalRange: 0 });
  const [formPokemonStatusConditions, setFormPokemonStatusConditions] = useState<{ nonVolatile?: string; volatile?: string[] }>({});
  const [formPokemonEquippedItem, setFormPokemonEquippedItem] = useState("");
  const [formPokemonStab, setFormPokemonStab] = useState("x1.5");
  const [formPokemonDadoVida, setFormPokemonDadoVida] = useState("1d8");
  const [pokemonHeaderCompact, setPokemonHeaderCompact] = useState(false);
  const [formPokemonSelectedMoveSlot, setFormPokemonSelectedMoveSlot] = useState<number>(1);
  const pokemonScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastPokemonScrollTopRef = useRef<number>(0);
  const trainerScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTrainerScrollTopRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const [formPokemonMovement, setFormPokemonMovement] = useState({ andando: "9m", nadando: "", escalando: "", voando: "", cavando: "" });
  const [formPokemonSenses, setFormPokemonSenses] = useState({ escuro: "", sismico: "", verdadeiraVisao: "", sonar: "" });
  const [formPokemonSkills, setFormPokemonSkills] = useState<string[]>([]);
  const [formPokemonSpecializedSkills, setFormPokemonSpecializedSkills] = useState<string[]>([]);
  const [formPokemonSr, setFormPokemonSr] = useState("1");
  const [formPokemonXpValue, setFormPokemonXpValue] = useState("100");
  const [formPokemonCdCaptura, setFormPokemonCdCaptura] = useState("15");
  const [formPokemonXp, setFormPokemonXp] = useState<number>(0);
  const [formPokemonXpHistory, setFormPokemonXpHistory] = useState<any[]>([]);
  const [isAddXpModalOpen, setIsAddXpModalOpen] = useState(false);
  const [formAddXpAmount, setFormAddXpAmount] = useState<number>(100);
  const [formAddXpReason, setFormAddXpReason] = useState("");
  const [isFormPokemonEffectsOpen, setIsFormPokemonEffectsOpen] = useState(false);
  const [formPokemonTab, setFormPokemonTab] = useState<'identity' | 'attributes' | 'moves' | 'effects' | 'config'>('identity');
  const [combatSummaryCards, setCombatSummaryCards] = useState<Record<string, { x: number; y: number; isVisible: boolean }>>({});
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  // --- ESTADOS DE LEVEL UP COMPONENT (ETAPA 2) ---
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [levelUpPokemonId, setLevelUpPokemonId] = useState<string | null>(null);
  const [levelUpOldLevel, setLevelUpOldLevel] = useState<number>(1);
  const [levelUpNewLevel, setLevelUpNewLevel] = useState<number>(1);
  const [levelUpCurrentStep, setLevelUpCurrentStep] = useState<"intro" | "asi" | "move" | "recap">("intro");
  const [levelUpStagesCount, setLevelUpStagesCount] = useState<number>(2); // 1, 2, or 3 stages of evolution
  const [levelUpMoveEventsToProcess, setLevelUpMoveEventsToProcess] = useState<number>(0);
  
  // Point system for ASI
  const [levelUpAsiPointsAvailable, setLevelUpAsiPointsAvailable] = useState<number>(0);
  const [levelUpAsiAllocated, setLevelUpAsiAllocated] = useState<Record<string, number>>({ FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 });
  const [levelUpConvertedFeatsCount, setLevelUpConvertedFeatsCount] = useState<number>(0);
  const [levelUpMaxFeatChoices, setLevelUpMaxFeatChoices] = useState<number>(0);
  const [levelUpSelectedFeats, setLevelUpSelectedFeats] = useState<any[]>([]);
  
  // Moves of PokeAPI
  const [levelUpCompatibleMoves, setLevelUpCompatibleMoves] = useState<any[]>([]);
  const [levelUpIsLoadingMoves, setLevelUpIsLoadingMoves] = useState<boolean>(false);
  const [levelUpSelectedMoveToLearn, setLevelUpSelectedMoveToLearn] = useState<any | null>(null);
  const [levelUpSelectedMoveToReplace, setLevelUpSelectedMoveToReplace] = useState<string>("");
  const [levelUpLearnedMovesThisSession, setLevelUpLearnedMovesThisSession] = useState<any[]>([]);
  const [levelUpHistoryLog, setLevelUpHistoryLog] = useState<any[]>([]);
  
  // Session moves for level-up transitions
  const [levelUpMove1, setLevelUpMove1] = useState<PokemonMoveObject | null>(null);
  const [levelUpMove2, setLevelUpMove2] = useState<PokemonMoveObject | null>(null);
  const [levelUpMove3, setLevelUpMove3] = useState<PokemonMoveObject | null>(null);
  const [levelUpMove4, setLevelUpMove4] = useState<PokemonMoveObject | null>(null);
  const [levelUpIsFeatMode, setLevelUpIsFeatMode] = useState<boolean>(false);

  const [apiPokemonList, setApiPokemonList] = useState<PokemonListItem[]>([]);
  const [apiMovesList, setApiMovesList] = useState<string[]>([]);
  const [isPokemonLoading, setIsPokemonLoading] = useState(false);
  const [isMovesLoading, setIsMovesLoading] = useState(false);

  const [showPokemonSuggestions, setShowPokemonSuggestions] = useState(false);
  const [activeMoveSearchIndex, setActiveMoveSearchIndex] = useState<1 | 2 | 3 | 4 | null>(null);

  // Debounced input search for species
  const [debouncedSpeciesQuery, setDebouncedSpeciesQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSpeciesQuery(formPokemonSpecies);
    }, 250);
    return () => clearTimeout(handler);
  }, [formPokemonSpecies]);

  // Debounced input search for active move value
  const [activeMoveQuery, setActiveMoveQuery] = useState("");
  useEffect(() => {
    let currentMoveValue = "";
    if (activeMoveSearchIndex === 1) currentMoveValue = formPokemonMoveObj1.name;
    else if (activeMoveSearchIndex === 2) currentMoveValue = formPokemonMoveObj2.name;
    else if (activeMoveSearchIndex === 3) currentMoveValue = formPokemonMoveObj3.name;
    else if (activeMoveSearchIndex === 4) currentMoveValue = formPokemonMoveObj4.name;
    
    const handler = setTimeout(() => {
      setActiveMoveQuery(currentMoveValue);
    }, 200);
    return () => clearTimeout(handler);
  }, [formPokemonMoveObj1.name, formPokemonMoveObj2.name, formPokemonMoveObj3.name, formPokemonMoveObj4.name, activeMoveSearchIndex]);

  const ensurePokemonCache = async () => {
    if (apiPokemonList.length > 0) return;
    setIsPokemonLoading(true);
    try {
      const list = await fetchPokemonList();
      setApiPokemonList(list);
    } catch (err) {
      console.error("Erro ao carregar cache de Pokémon:", err);
    } finally {
      setIsPokemonLoading(false);
    }
  };

  const ensureMovesCache = async () => {
    if (apiMovesList.length > 0) return;
    setIsMovesLoading(true);
    try {
      const list = await fetchMovesList();
      setApiMovesList(list);
    } catch (err) {
      console.error("Erro ao carregar cache de Moves:", err);
    } finally {
      setIsMovesLoading(false);
    }
  };

  useEffect(() => {
    if (isAddPokemonModalOpen) {
      ensurePokemonCache();
      ensureMovesCache();
      setPokemonHeaderCompact(false);
      setFormPokemonSelectedMoveSlot(1);
      if (pokemonScrollContainerRef.current) {
        pokemonScrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isAddPokemonModalOpen]);

  useEffect(() => {
    setPokemonHeaderCompact(false);
    if (pokemonScrollContainerRef.current) {
      pokemonScrollContainerRef.current.scrollTop = 0;
    }
  }, [formPokemonActiveTab]);

  // --- FUNÇÕES AUXILIARES DE LEVEL UP (ETAPA 2) ---
  const getEvolutionStagesCount = async (speciesIdOrName: string | number): Promise<number> => {
    try {
      const raw = typeof speciesIdOrName === "string" ? speciesIdOrName.toLowerCase().trim() : speciesIdOrName;
      if (!raw) return 2;
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${raw}`);
      if (!res.ok) return 2;
      const speciesData = await res.json();
      const chainUrl = speciesData.evolution_chain?.url;
      if (!chainUrl) return 2;
      
      const chainRes = await fetch(chainUrl);
      if (!chainRes.ok) return 2;
      const chainData = await chainRes.json();
      
      const getDepth = (link: any): number => {
        if (!link) return 0;
        if (!link.evolves_to || link.evolves_to.length === 0) return 1;
        let maxChild = 0;
        for (const child of link.evolves_to) {
          maxChild = Math.max(maxChild, getDepth(child));
        }
        return 1 + maxChild;
      };
      
      return getDepth(chainData.chain);
    } catch (err) {
      console.warn("Falha ao obter estágios evolutivos, usando padrão 2:", err);
      return 2;
    }
  };

  const fetchPokemonCompatibleMoves = async (speciesIdOrName: string | number, maxLevel: number): Promise<any[]> => {
    try {
      const raw = typeof speciesIdOrName === "string" ? speciesIdOrName.toLowerCase().trim().replace(/\s+/g, '-') : speciesIdOrName;
      if (!raw) return [];
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${raw}`);
      if (!res.ok) return [];
      
      const data = await res.json();
      const movesList = data.moves || [];
      const levelUpMoves: any[] = [];
      
      for (const m of movesList) {
        const details = m.version_group_details || [];
        const levelUpDetails = details.find((d: any) => d.move_learn_method?.name === "level-up");
        if (levelUpDetails) {
          const learnLevel = levelUpDetails.level_learned_at || 1;
          if (learnLevel <= maxLevel) {
            levelUpMoves.push({
              name: m.move.name.replace(/-/g, ' '),
              rawName: m.move.name,
              levelLearned: learnLevel,
              url: m.move.url
            });
          }
        }
      }
      
      levelUpMoves.sort((a, b) => {
        if (a.levelLearned !== b.levelLearned) {
          return a.levelLearned - b.levelLearned;
        }
        return a.name.localeCompare(b.name);
      });
      
      // Remover duplicatas por nome
      const seen = new Set();
      return levelUpMoves.filter(el => {
        const val = el.name.toLowerCase();
        const dup = seen.has(val);
        seen.add(val);
        return !dup;
      });
    } catch (err) {
      console.warn("Falha ao obter lista de moves do PokeAPI:", err);
      return [];
    }
  };

  const fetchSingleMoveDetails = async (moveNameOrUrl: string): Promise<any> => {
    try {
      const raw = moveNameOrUrl.toLowerCase().trim().replace(/\s+/g, '-');
      const res = await fetch(`https://pokeapi.co/api/v2/move/${raw}`);
      if (!res.ok) {
        return {
          name: moveNameOrUrl,
          type: "Normal",
          pp: 15,
          damage: "1d6",
          description: "Não foi possível carregar a descrição oficial."
        };
      }
      const data = await res.json();
      const rawType = data.type?.name || "normal";
      const capitalizedType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      const typeToUse = POKEMON_TYPES_STYLING[capitalizedType] ? capitalizedType : "Normal";
      
      const englishEffect = (data.effect_entries || []).find((e: any) => e.language?.name === "en");
      const description = englishEffect ? englishEffect.short_effect : (data.flavor_text_entries?.find((x: any) => x.language?.name === "en")?.flavor_text || "Sem descrição disponível.");
      
      const category = data.damage_class?.name || "status";
      const power = data.power || 0;
      
      let damage = "";
      if (power > 0) {
        if (power <= 40) damage = "1d4";
        else if (power <= 60) damage = "1d6";
        else if (power <= 80) damage = "1d8";
        else if (power <= 100) damage = "1d10";
        else if (power <= 120) damage = "1d12";
        else damage = "2d8";
      }
      
      return {
        name: data.names?.find((n: any) => n.language?.name === "pt")?.name || data.name.replace(/-/g, ' '),
        englishName: data.name,
        type: typeToUse,
        pp: data.pp || 15,
        power: power,
        damage: damage,
        range: data.target?.name === "selected-pokemon" ? "Distância (18m)" : (data.target?.name === "user" ? "Pessoal" : "Meio/Distância (12m)"),
        description: description,
        category: category
      };
    } catch (err) {
      console.warn("Erro ao obter detalhes de move:", err);
      return {
        name: moveNameOrUrl,
        type: "Normal",
        pp: 15,
        damage: "1d6",
        description: "Erro de rede ao carregar bônus bst."
      };
    }
  };

  const getScaledDamage = (baseDamage: string, level: number): string => {
    if (!baseDamage) return "";
    const match = baseDamage.match(/^(\d+)d(\d+)(.*)$/i);
    if (!match) return baseDamage;
    const numDice = parseInt(match[1]);
    const dieSize = parseInt(match[2]);
    const rest = match[3] || "";
    let multiplier = 1;
    if (level >= 17) multiplier = 4;
    else if (level >= 10) multiplier = 3;
    else if (level >= 5) multiplier = 2;
    return `${numDice * multiplier}d${dieSize}${rest}`;
  };

  const scaleMovesForLevel = (moveObj: PokemonMoveObject, level: number): PokemonMoveObject => {
    if (!moveObj || !moveObj.name) return moveObj;
    const baseDamage = moveObj.originalDamage || moveObj.damage || "";
    const scaled = getScaledDamage(baseDamage, level);
    return {
      ...moveObj,
      originalDamage: baseDamage,
      damage: scaled
    };
  };

  const triggerPokemonLevelUp = async (oldLevel: number, newLevel: number) => {
    if (newLevel <= oldLevel) return;
    setLevelUpOldLevel(oldLevel);
    setLevelUpNewLevel(newLevel);
    setLevelUpPokemonId(editingPokemonId);
    setLevelUpLearnedMovesThisSession([]);
    setLevelUpHistoryLog([]);

    // Initialize pre-scaled session moves
    setLevelUpMove1(scaleMovesForLevel(ensureMoveObj(formPokemonMoveObj1), newLevel));
    setLevelUpMove2(scaleMovesForLevel(ensureMoveObj(formPokemonMoveObj2), newLevel));
    setLevelUpMove3(scaleMovesForLevel(ensureMoveObj(formPokemonMoveObj3), newLevel));
    setLevelUpMove4(scaleMovesForLevel(ensureMoveObj(formPokemonMoveObj4), newLevel));

    const asiLevels = [4, 8, 12, 16, 20];
    const asiCount = asiLevels.filter(lvl => oldLevel < lvl && newLevel >= lvl).length;
    
    const moveLevels = [2, 6, 10, 14, 18];
    const moveCount = moveLevels.filter(lvl => oldLevel < lvl && newLevel >= lvl).length;
    
    const specId = formPokemonSpeciesId || formPokemonSpecies;
    let stages = 2;
    if (specId) {
      stages = await getEvolutionStagesCount(specId);
    }
    setLevelUpStagesCount(stages);
    
    const pointsPerAsi = stages === 3 ? 2 : (stages === 2 ? 3 : 4);
    const totalAsiPoints = asiCount * pointsPerAsi;
    
    setLevelUpAsiPointsAvailable(totalAsiPoints);
    setLevelUpMaxFeatChoices(asiCount);
    setLevelUpConvertedFeatsCount(0);
    setLevelUpSelectedFeats([]);
    setLevelUpAsiAllocated({ FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 });
    setLevelUpIsFeatMode(false);
    
    setLevelUpMoveEventsToProcess(moveCount);
    setLevelUpCurrentStep("intro");
    setIsLevelUpModalOpen(true);
    
    if (moveCount > 0 && specId) {
      setLevelUpIsLoadingMoves(true);
      const moves = await fetchPokemonCompatibleMoves(specId, newLevel);
      setLevelUpCompatibleMoves(moves);
      setLevelUpIsLoadingMoves(false);
    } else {
      setLevelUpCompatibleMoves([]);
    }
  };

  // Manage Pokemon loyalty skill bônus and specialized skills automatically on changes
  useEffect(() => {
    if (!isAddPokemonModalOpen) return;
    
    // Manage +2 Bonus Skill
    if (formPokemonLoyalty < 2) {
      if (formPokemonLoyaltyBonusSkill && formPokemonSkills.includes(formPokemonLoyaltyBonusSkill)) {
        setFormPokemonSkills(prev => prev.filter(s => s !== formPokemonLoyaltyBonusSkill));
      }
    } else {
      if (formPokemonLoyaltyBonusSkill && !formPokemonSkills.includes(formPokemonLoyaltyBonusSkill)) {
        setFormPokemonSkills(prev => [...prev, formPokemonLoyaltyBonusSkill]);
      }
    }

    // Manage +3 Specialized Skill
    if (formPokemonLoyalty < 3) {
      if (formPokemonLoyaltySpecialistSkill && formPokemonSpecializedSkills.includes(formPokemonLoyaltySpecialistSkill)) {
        setFormPokemonSpecializedSkills(prev => prev.filter(s => s !== formPokemonLoyaltySpecialistSkill));
      }
    } else {
      if (formPokemonLoyaltySpecialistSkill) {
        if (!formPokemonSpecializedSkills.includes(formPokemonLoyaltySpecialistSkill)) {
          setFormPokemonSpecializedSkills(prev => [...prev, formPokemonLoyaltySpecialistSkill]);
        }
        if (!formPokemonSkills.includes(formPokemonLoyaltySpecialistSkill)) {
          setFormPokemonSkills(prev => [...prev, formPokemonLoyaltySpecialistSkill]);
        }
      }
    }
  }, [formPokemonLoyalty, formPokemonLoyaltyBonusSkill, formPokemonLoyaltySpecialistSkill, isAddPokemonModalOpen]);

  // Recalcular HP Máximo retroativamente de acordo com a Constituição, Nível e Dado de Vida
  useEffect(() => {
    if (!isAddPokemonModalOpen) return;
    const conVal = formPokemonAttrs.CON ?? 10;
    const natureObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
    const isConBenefited = natureObj?.bonusAttr === "CON";
    const isConPenalized = natureObj?.penaltyAttr === "CON";
    const finalCon = isConBenefited ? conVal + 2 : (isConPenalized ? Math.max(1, conVal - 2) : conVal);
    const conMod = Math.floor((finalCon - 10) / 2);

    const hitDie = parseHitDie(formPokemonDadoVida);
    
    // Level 1: Dado de Vida Máximo + MOD CON
    // Level 2+: (Level - 1) * (Média do Dado de Vida + MOD CON)
    const baseCalculatedHp = hitDie.max + conMod + (formPokemonLevel - 1) * (hitDie.average + conMod);
    const finalBaseHp = Math.max(1, baseCalculatedHp);
    
    if (finalBaseHp !== formPokemonHpMax) {
      setFormPokemonHpMax(finalBaseHp);
      if (formPokemonHpCurrent > finalBaseHp) {
        setFormPokemonHpCurrent(finalBaseHp);
      }
    }
  }, [formPokemonAttrs.CON, formPokemonLevel, formPokemonDadoVida, formPokemonNature, isAddPokemonModalOpen]);

  const updateEditingPokemonProperties = (properties: Record<string, any>) => {
    if (!editingPokemonId || !activeTrainerRecord) return;
    setTrainerRecords(prev => {
      const currentTrainer = prev.find(t => t.id === activeTrainerRecord.id);
      if (!currentTrainer) return prev;
      
      const updatedPkList = (currentTrainer.pokemon || []).map(p => {
        if (p.id === editingPokemonId) {
          return {
            ...p,
            ...properties
          };
        }
        return p;
      });
      const updatedTrainer = {
        ...currentTrainer,
        pokemon: updatedPkList,
        updatedAt: new Date().toISOString()
      };
      
      setActiveTrainerRecord(updatedTrainer);
      return prev.map(t => t.id === currentTrainer.id ? updatedTrainer : t);
    });
  };

  const updateEditingPokemonProperty = (key: string, value: any) => {
    updateEditingPokemonProperties({ [key]: value });
  };

  const initializePokemonForm = (pk?: any, defaultIsPc = false) => {
    if (!pk) {
      setEditingPokemonId(null);
      setFormPokemonName("Novo Pokémon");
      setFormPokemonSpecies("");
      setFormPokemonLevel(5);
      setFormPokemonHpMax(20);
      setFormPokemonHpCurrent(20);
      setFormPokemonImage("");
      setFormPokemonIsPc(defaultIsPc);
      setFormPokemonInitiative(0);
      setFormPokemonIsShiny(false);
      setFormPokemonImageDefault("");
      setFormPokemonImageShiny("");
      const emptyMove = { name: "", description: "", pp: 15, damage: "", cost: "", range: "", power: 0, duration: "", type: "Normal" };
      setFormPokemonMoveObj1(emptyMove);
      setFormPokemonMoveObj2(emptyMove);
      setFormPokemonMoveObj3(emptyMove);
      setFormPokemonMoveObj4(emptyMove);
      setFormPokemonTypes([]);
      setFormPokemonWeaknesses([]);
      setFormPokemonResistances([]);
      setFormPokemonImmunities([]);
      setFormPokemonTalentos([]);
      setFormPokemonSpeciesId(null);

      setFormPokemonActiveTab("identidade");
      setFormPokemonAttrs({ FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 });
      setFormPokemonSavingThrows({ FOR: false, DES: false, CON: false, INT: false, SAB: false, CAR: false });
      setFormPokemonStatusStages({ attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0, criticalRange: 0 });
      setFormPokemonStatusConditions({});
      setFormPokemonEquippedItem("");
      setFormPokemonStab("x1.5");
      setFormPokemonDadoVida("1d8");
      setFormPokemonMovement({ andando: "9m", nadando: "", escalando: "", voando: "", cavando: "" });
      setFormPokemonSenses({ escuro: "", sismico: "", verdadeiraVisao: "", sonar: "" });
      setFormPokemonSkills([]);
      setFormPokemonSpecializedSkills([]);
      setFormPokemonNature("");
      setFormPokemonNatureConfirmed(false);
      setFormPokemonLoyalty(0);
      setFormPokemonLoyaltyBonusSkill("");
      setFormPokemonLoyaltySpecialistSkill("");
      setFormPokemonLoyaltyEvolutionEligible(false);
      setIsD20Rolling(false);
      setRolledNumber(null);
      setFormPokemonSr("1");
      setFormPokemonXpValue("100");
      setFormPokemonCdCaptura("15");
      setFormPokemonXp(0);
      setFormPokemonXpHistory([]);
      setIsFormPokemonEffectsOpen(false);
      setExpandedMoves({});
    } else {
      setEditingPokemonId(pk.id);
      setFormPokemonName(pk.name || "");
      setFormPokemonSpecies(pk.species || "");
      setFormPokemonLevel(pk.level || 5);
      setFormPokemonHpMax(pk.hpMax || 20);
      setFormPokemonHpCurrent(pk.hpCurrent || 20);
      setFormPokemonImage(pk.image || "");
      setFormPokemonIsPc(pk.isPc ?? defaultIsPc);
      setFormPokemonInitiative(pk.initiative ?? 0);
      
      const hasSavedShiny = pk.imageShiny && pk.imageDefault;
      setFormPokemonIsShiny(pk.isShiny || false);
      setFormPokemonImageDefault(pk.imageDefault || (pk.isShiny ? "" : pk.image) || "");
      setFormPokemonImageShiny(pk.imageShiny || (pk.isShiny ? pk.image : "") || "");

      if (!hasSavedShiny && pk.speciesId) {
        const fillSprites = async () => {
          try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pk.speciesId}`);
            if (response.ok) {
              const data = await response.json();
              const hdArtwork = data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default;
              const shinyArtwork = data.sprites?.other?.["official-artwork"]?.front_shiny || data.sprites?.front_shiny;
              if (hdArtwork) setFormPokemonImageDefault(hdArtwork);
              if (shinyArtwork) setFormPokemonImageShiny(shinyArtwork);
            }
          } catch (e) {
            console.warn("Failed to enrichment-fetch sprites:", e);
          }
        };
        fillSprites();
      }

      setFormPokemonMoveObj1(ensureMoveObj(pk.move1));
      setFormPokemonMoveObj2(ensureMoveObj(pk.move2));
      setFormPokemonMoveObj3(ensureMoveObj(pk.move3));
      setFormPokemonMoveObj4(ensureMoveObj(pk.move4));
      setFormPokemonTypes(pk.types || []);
      setFormPokemonWeaknesses(pk.weaknesses || []);
      setFormPokemonResistances(pk.resistances || []);
      setFormPokemonImmunities(pk.immunities || []);
      setFormPokemonTalentos(pk.talentos || []);
      setFormPokemonSpeciesId(pk.speciesId || null);

      setFormPokemonActiveTab("identidade");
      setFormPokemonAttrs(pk.attributes || { FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 });
      setFormPokemonSavingThrows(pk.savingThrows || { FOR: false, DES: false, CON: false, INT: false, SAB: false, CAR: false });
      setFormPokemonStatusStages(pk.statusStages || { attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0, criticalRange: 0 });
      setFormPokemonStatusConditions(pk.statusConditions || {});
      setFormPokemonEquippedItem(pk.equippedItem || "");
      setFormPokemonStab(pk.stab || "x1.5");
      setFormPokemonDadoVida(pk.dadoVida || "1d8");
      setFormPokemonMovement(pk.movement || { andando: "9m", nadando: "", escalando: "", voando: "", cavando: "" });
      setFormPokemonSenses(pk.senses || { escuro: "", sismico: "", verdadeiraVisao: "", sonar: "" });
      setFormPokemonSkills(pk.skills || []);
      setFormPokemonSpecializedSkills(pk.specializedSkills || []);
      setFormPokemonNature(pk.nature || "");
      setFormPokemonNatureConfirmed(!!pk.nature); // If they already have a nature, load as confirmed
      setFormPokemonLoyalty(pk.loyalty ?? 0);
      setFormPokemonLoyaltyBonusSkill(pk.loyaltyBonusSkill || "");
      setFormPokemonLoyaltySpecialistSkill(pk.loyaltySpecialistSkill || "");
      setFormPokemonLoyaltyEvolutionEligible(pk.loyaltyEvolutionEligible || false);
      setFormPokemonSr(pk.sr || "1");
      setFormPokemonXpValue(pk.xpValue || "100");
      setFormPokemonCdCaptura(pk.cdCaptura || "15");
      setFormPokemonXp(pk.xp || 0);
      setFormPokemonXpHistory(pk.xpHistory || []);
      setIsFormPokemonEffectsOpen(false);
      setExpandedMoves({});
    }
    setIsAddPokemonModalOpen(true);
  };

  const rollPokemonNature = () => {
    if (isD20Rolling) return;
    setIsD20Rolling(true);
    let counter = 0;
    const interval = setInterval(() => {
      // Pick a random nature during the animation for effect
      const tempIndex = Math.floor(Math.random() * POKEMON_NATURES.length);
      setFormPokemonNature(POKEMON_NATURES[tempIndex].id);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        
        // Final settled roll
        const finalRoll = Math.floor(Math.random() * 20) + 1; // 1 to 20
        setRolledNumber(finalRoll);
        const selectedNature = POKEMON_NATURES[finalRoll - 1]; // Use index 0-19
        setFormPokemonNature(selectedNature.id);
        setIsD20Rolling(false);
        setNotification(`🎲 Rolou d20: ${finalRoll}! Natureza obtida: ${selectedNature.name}!`);
      }
    }, 80);
  };

  const renderMoveBadge = (m: any) => {
    if (!m) return null;
    const name = typeof m === "string" ? m : m.name;
    if (!name || !name.trim()) return null;
    const type = typeof m === "string" ? "Normal" : (m.type || "Normal");
    const styling = POKEMON_TYPES_STYLING[type] || POKEMON_TYPES_STYLING.Normal;
    
    return (
      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wide leading-none flex items-center gap-0.5 border ${styling.bg} ${styling.border} ${styling.text}`}>
        <span>{styling.emoji}</span>
        <span>{name}</span>
      </span>
    );
  };

  const pokemonSuggestions = React.useMemo(() => {
    const query = debouncedSpeciesQuery.trim().toLowerCase();
    if (!query) return [];
    const isNum = /^\d+$/.test(query);
    return apiPokemonList.filter(p => {
      if (isNum) {
        return p.id.toString() === query;
      } else {
        return p.name.toLowerCase().includes(query);
      }
    }).slice(0, 50);
  }, [apiPokemonList, debouncedSpeciesQuery]);

  const movesSuggestions = React.useMemo(() => {
    const query = activeMoveQuery.trim().toLowerCase();
    if (!query || activeMoveSearchIndex === null) return [];
    return apiMovesList.filter(move => 
      move.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [apiMovesList, activeMoveQuery, activeMoveSearchIndex]);

  const handleSelectMove = async (index: number, moveName: string) => {
    // Determine which state to target
    let currentObj: PokemonMoveObject;
    let setter: React.Dispatch<React.SetStateAction<PokemonMoveObject>>;
    let propKey: "move1" | "move2" | "move3" | "move4";

    if (index === 1) {
      currentObj = formPokemonMoveObj1;
      setter = setFormPokemonMoveObj1;
      propKey = "move1";
    } else if (index === 2) {
      currentObj = formPokemonMoveObj2;
      setter = setFormPokemonMoveObj2;
      propKey = "move2";
    } else if (index === 3) {
      currentObj = formPokemonMoveObj3;
      setter = setFormPokemonMoveObj3;
      propKey = "move3";
    } else {
      currentObj = formPokemonMoveObj4;
      setter = setFormPokemonMoveObj4;
      propKey = "move4";
    }

    // 1. Immediately update the name
    const updatedName = { ...currentObj, name: moveName };
    setter(updatedName);
    updateEditingPokemonProperty(propKey, updatedName);
    setActiveMoveSearchIndex(null);

    // 2. Fetch details asynchronously
    try {
      const rawName = moveName.toLowerCase().replace(/\s+/g, '-');
      const res = await fetch(`https://pokeapi.co/api/v2/move/${rawName}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.type && data.type.name) {
          // Capitalize the type (e.g., 'electric' -> 'Electric')
          const rawType = data.type.name;
          const capitalizedType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
          
          // Ensure this is a supported/valid type in POKEMON_TYPES_STYLING, otherwise default
          const typeToUse = POKEMON_TYPES_STYLING[capitalizedType] ? capitalizedType : "Normal";

          // Update the move's type
          setter(prev => {
            // Check that the user hasn't cleared or changed this move field while we were fetching
            if (prev.name === moveName) {
              const finalObj = { ...prev, type: typeToUse };
              updateEditingPokemonProperty(propKey, finalObj);
              return finalObj;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch move details:", error);
    }
  };

  const handleSelectPokemon = async (selected: PokemonListItem) => {
    setFormPokemonSpecies(selected.name);
    setFormPokemonSpeciesId(selected.id);
    
    // Autofill nickname if currently empty
    let newName = formPokemonName;
    if (!formPokemonName.trim() || formPokemonName.toLowerCase() === formPokemonSpecies.toLowerCase() || formPokemonName === "Novo Pokémon") {
      newName = selected.name;
      setFormPokemonName(selected.name);
    }

    setFormPokemonImage(selected.sprite);
    setShowPokemonSuggestions(false);
    setFormPokemonImageDefault(selected.sprite);
    setFormPokemonImageShiny("");

    // Accumulate all state keys we want to update atomically on the sheet
    const accumulatedProps: Record<string, any> = {
      species: selected.name,
      speciesId: selected.id,
      name: newName,
      image: selected.sprite,
      imageDefault: selected.sprite,
      imageShiny: ""
    };

    let retrievedTypes: string[] = ["Normal"];
    let weaknesses: string[] = [];
    let resistances: string[] = [];
    let immunities: string[] = [];

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${selected.rawName}`);
      if (res.ok) {
        const data = await res.json();
        const hdArtwork = data.sprites?.other?.["official-artwork"]?.front_default || data.sprites?.front_default;
        const shinyArtwork = data.sprites?.other?.["official-artwork"]?.front_shiny || data.sprites?.front_shiny;
        
        const defaultImgToUse = hdArtwork || selected.sprite;
        const shinyImgToUse = shinyArtwork || "";
        
        setFormPokemonImageDefault(defaultImgToUse);
        setFormPokemonImageShiny(shinyImgToUse);
        
        const finalImg = formPokemonIsShiny ? (shinyImgToUse || defaultImgToUse) : defaultImgToUse;
        setFormPokemonImage(finalImg);
        
        accumulatedProps.image = finalImg;
        accumulatedProps.imageDefault = defaultImgToUse;
        accumulatedProps.imageShiny = shinyImgToUse;
        
        const hpBase = data.stats?.find((s: any) => s.stat?.name === "hp")?.base_stat;
        if (hpBase) {
          const levelVal = formPokemonLevel || 5;
          const calculatedHp = Math.floor(((2 * hpBase + 31) * levelVal) / 100) + levelVal + 10;
          setFormPokemonHpMax(calculatedHp);
          setFormPokemonHpCurrent(calculatedHp);
          accumulatedProps.hpMax = calculatedHp;
          accumulatedProps.hpCurrent = calculatedHp;
        }

        // Automatic Species Rating (SR) lookup based on BST (Base Stat Total)
        const bst = (data.stats || []).reduce((sum: number, s: any) => sum + (s.base_stat || 0), 0);
        const autoSr = getSrForBst(bst);
        setFormPokemonSr(autoSr);
        accumulatedProps.sr = autoSr;

        // Fetch types and compute type characteristics
        retrievedTypes = (data.types || []).map((t: any) => {
          const rawType = t.type?.name;
          return POKEAPI_TYPE_MAP[rawType] || "Normal";
        });
        
        const matchups = calculateMatchups(retrievedTypes);
        weaknesses = matchups.weaknesses;
        resistances = matchups.resistances;
        immunities = matchups.immunities;
        
        accumulatedProps.types = retrievedTypes;
        accumulatedProps.weaknesses = weaknesses;
        accumulatedProps.resistances = resistances;
        accumulatedProps.immunities = immunities;
      }
    } catch (err) {
      console.warn("Erro ao carregar detalhes oficiais do pokemon:", err);
    }

    // Assign local states
    setFormPokemonTypes(retrievedTypes);
    setFormPokemonWeaknesses(weaknesses);
    setFormPokemonResistances(resistances);
    setFormPokemonImmunities(immunities);

    // Single unified state save to persistent sheet structure
    if (editingPokemonId) {
      updateEditingPokemonProperties(accumulatedProps);
    }
  };

  // Feat creation form state
  const [isAddFeatModalOpen, setIsAddFeatModalOpen] = useState(false);
  const [formFeatName, setFormFeatName] = useState("");
  const [formFeatDesc, setFormFeatDesc] = useState("");
  const [formFeatOrigin, setFormFeatOrigin] = useState("");
  const [formFeatEffects, setFormFeatEffects] = useState("");
  const [editingFeatId, setEditingFeatId] = useState<string | null>(null);

  // Inventory Item creation form state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [formItemName, setFormItemName] = useState("");
  const [formItemQty, setFormItemQty] = useState<number>(1);
  const [formItemCategory, setFormItemCategory] = useState("Consumível");
  const [formItemWeight, setFormItemWeight] = useState<number>(0.1);
  const [formItemDesc, setFormItemDesc] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Context menu for trainer records and folders
  const [trainerContextMenu, setTrainerContextMenu] = useState<{
    x: number;
    y: number;
    record?: TrainerRecord;
    folder?: TrainerFolder;
  } | null>(null);

  // Drag and drop states for trainers
  const [draggingTrainerRecordId, setDraggingTrainerRecordId] = useState<string | null>(null);
  const [activePressedRecordId, setActivePressedRecordId] = useState<string | null>(null);
  const [draggingTrainerFolderId, setDraggingTrainerFolderId] = useState<string | null>(null);
  const [dragOverTrainerFolderId, setDragOverTrainerFolderId] = useState<string | null>(null);
  const [dragOverTrainerRoot, setDragOverTrainerRoot] = useState(false);

  // Expanded folders (keeps track of which trainer folders are expanded/collapsed in VTT directory tree)
  const [expandedTrainerFolderIds, setExpandedTrainerFolderIds] = useState<Record<string, boolean>>(() => {
    return { "f-players": true, "f-npcs": true, "f-viloes": true, "f-elite4": true };
  });

  // PokeVTT5e Floating Dock Selector: 'maps' | 'tokens' | 'grid' | null
  const [activeTab, setActiveTab] = useState<'maps' | 'tokens' | 'grid' | null>(null);
  const [hideAllUI, setHideAllUI] = useState<boolean>(false);
  const [pullX, setPullX] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);

  // Creation forms
  const [newMapName, setNewMapName] = useState("");
  const [newMapUrl, setNewMapUrl] = useState("");
  const [selectedFolderIdForCreation, setSelectedFolderIdForCreation] = useState<string>("");
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenUrl, setNewTokenUrl] = useState("");
  const [newTokenSize, setNewTokenSize] = useState<number>(2);
  const [newTokenColor, setNewTokenColor] = useState("#3b82f6");
  const [newTokenHP, setNewTokenHP] = useState<number>(30);

  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dragOverCanvasType, setDragOverCanvasType] = useState<'map' | 'token' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Tactical Camera Coordinate System
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mapImageSize, setMapImageSize] = useState({ width: 1200, height: 800 });

  // Draggable actors refs
  const [draggingTokenId, _setDraggingTokenId] = useState<string | null>(null);
  const draggingTokenIdRef = useRef<string | null>(null);
  const setDraggingTokenId = (val: string | null) => {
    _setDraggingTokenId(val);
    draggingTokenIdRef.current = val;
  };
  const [tokenDragOffset, setTokenDragOffset] = useState({ x: 0, y: 0 });
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [isMultiSelectActive, setIsMultiSelectActive] = useState<boolean>(false);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  
  // Combat Tracker (Baldur's Gate 3 Style Mode)
  const [isCombatActive, setIsCombatActive] = useState<boolean>(false);
  const [combatParticipants, setCombatParticipants] = useState<Combatant[]>([]);
  const [currentCombatTurn, setCurrentCombatTurn] = useState<number>(0);
  const [combatRound, setCombatRound] = useState<number>(1);
  const [isCombatTrackerUndocked, setIsCombatTrackerUndocked] = useState<boolean>(false);
  const [combatTrackerPos, setCombatTrackerPos] = useState<{ x: number, y: number } | null>(null);
  const combatTrackerRef = useRef<HTMLDivElement>(null);

  const handleCombatTrackerMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isCombatTrackerUndocked) return;
    
    // Prevent dragging when clicking interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('img')) {
      return;
    }

    let startX = 0;
    let startY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else {
      startX = e.clientX;
      startY = e.clientY;
    }

    let initX = 0;
    let initY = 0;
    if (combatTrackerRef.current) {
      const rect = combatTrackerRef.current.getBoundingClientRect();
      initX = rect.left;
      initY = rect.top;
    } else if (combatTrackerPos) {
      initX = combatTrackerPos.x;
      initY = combatTrackerPos.y;
    } else {
      initX = window.innerWidth / 2 - 250;
      initY = 64;
    }

    const handlePointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      let currentX = 0;
      let currentY = 0;
      if ("touches" in moveEvent) {
        if (moveEvent.touches.length === 0) return;
        currentX = moveEvent.touches[0].clientX;
        currentY = moveEvent.touches[0].clientY;
      } else {
        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;
      }

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      setCombatTrackerPos({
        x: initX + deltaX,
        y: initY + deltaY
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("touchend", handlePointerUp);
  };

  const [showPreCombatModal, setShowPreCombatModal] = useState<boolean>(false);
  const [combatHighlightTokenId, setCombatHighlightTokenId] = useState<string | null>(null);
  const [areaStart, setAreaStart] = useState<{ x: number; y: number } | null>(null);
  const [areaEnd, setAreaEnd] = useState<{ x: number; y: number } | null>(null);
  const didDragAreaRef = useRef<boolean>(false);
  const dragStartPositionsRef = useRef<{ [id: string]: { x: number, y: number } }>({});

  const toggleMultiSelectActive = () => {
    setIsMultiSelectActive(prev => {
      const next = !prev;
      if (!next) {
        setSelectedTokenIds(selectedTokenId ? [selectedTokenId] : []);
      }
      return next;
    });
  };

  const [substitutingTokenId, setSubstitutingTokenId] = useState<string | null>(null);
  const [healthInputText, setHealthInputText] = useState<string>("");
  const [isHealthInputFocused, setIsHealthInputFocused] = useState<boolean>(false);
  const [editingTokenSettingsId, setEditingTokenSettingsId] = useState<string | null>(null);

  const [sessionPlayers, setSessionPlayers] = useState<string[]>(() => {
    const saved = localStorage.getItem("vtt_session_players");
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        return parsed.filter(p => p !== "Ash Ketchum" && p !== "Misty" && p !== "Brock");
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("vtt_session_players", JSON.stringify(sessionPlayers));
  }, [sessionPlayers]);

  const [newPlayerNameInput, setNewPlayerNameInput] = useState("");
  const [isPlayersPanelOpen, setIsPlayersPanelOpen] = useState(false);

  // Combat Inspector Panel States
  const [isCombatInspectorOpen, setIsCombatInspectorOpen] = useState<boolean>(false);
  const [combatInspectorTab, setCombatInspectorTab] = useState<'geral' | 'moves' | 'status'>('geral');
  const [mobileSheetState, setMobileSheetState] = useState<'minimized' | 'half' | 'full'>('minimized');
  const [combatInspectorHpDelta, setCombatInspectorHpDelta] = useState<number>(1);
  const [activeExpandedMove, setActiveExpandedMove] = useState<string | null>(null);
  const [manuallyClosedTokenId, setManuallyClosedTokenId] = useState<string | null>(null);
  const [activeRadialMenu, setActiveRadialMenu] = useState<{ tokenId: string; type: "stages" | "conditions" } | null>(null);
  const [holdingTokenId, setHoldingTokenId] = useState<string | null>(null);
  const [holdingProgress, setHoldingProgress] = useState<number>(0);
  const [activePokeballRadialTokenId, setActivePokeballRadialTokenId] = useState<string | null>(null);
  const [tempAuraId, setTempAuraId] = useState<string | null>(null);
  const [tempAuraScale, setTempAuraScale] = useState<number>(1.0);
  const [tempAuraIntensity, setTempAuraIntensity] = useState<number>(1.0);
  const [tempAuraOpacity, setTempAuraOpacity] = useState<number>(0.8);
  const [tempAuraParticleCount, setTempAuraParticleCount] = useState<number>(30);
  const [tempAuraAnimationSpeed, setTempAuraAnimationSpeed] = useState<number>(1.0);
  const [tempAuraColorPrimary, setTempAuraColorPrimary] = useState<string>("#3b82f6");
  const [tempAuraColorSecondary, setTempAuraColorSecondary] = useState<string>("#6366f1");
  const [tempAuraEnableGlow, setTempAuraEnableGlow] = useState<boolean>(true);
  const [tempAuraEnableDistortion, setTempAuraEnableDistortion] = useState<boolean>(true);

  const [auraSelectorOpen, setAuraSelectorOpen] = useState<boolean>(false);
  const [auraCategory, setAuraCategory] = useState<string>("Todos");
  const [appearanceExpanded, setAppearanceExpanded] = useState<boolean>(false);
  const [linkSettingsExpanded, setLinkSettingsExpanded] = useState<boolean>(false);
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOSDevice(isIOS);
    }
  }, []);

  const [auraTuningExpanded, setAuraTuningExpanded] = useState<boolean>(false);
  const lastLoadedTokenIdRef = useRef<string | null>(null);

  // Recalculates Poke Ball radial dimensions dynamically to prevent overflow and keep it aligned on mobile
  useEffect(() => {
    if (!activePokeballTrainerId) return;
    const handleResize = () => {
      if (backdropRef.current) {
        const width = backdropRef.current.clientWidth || window.innerWidth;
        const height = backdropRef.current.clientHeight || window.innerHeight;
        // Radial container standard size is 520, leave a 20px safety margin
        const scaleW = width / 540;
        
        // On screens under 768px wide (mobile), settings open at the bottom, so reserve more vertical space
        const isMobile = width < 768;
        const reservedHeight = isMobile && isPokeballSettingsOpen ? 300 : 130;
        const scaleH = (height - reservedHeight) / 540;
        
        setRadialScale(Math.min(1, scaleW, scaleH));
      } else {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width < 768;
        const reservedHeight = isMobile && isPokeballSettingsOpen ? 300 : 130;
        const scaleW = width / 540;
        const scaleH = (height - reservedHeight) / 540;
        setRadialScale(Math.min(1, scaleW, scaleH));
      }
    };
    
    const timer = setTimeout(handleResize, 50);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [activePokeballTrainerId, isPokeballSettingsOpen]);

  // Touch drag-and-drop mechanics for campaign maps on mobile devices
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchActiveMapId = useRef<string | null>(null);
  const touchDragStarted = useRef<boolean>(false);

  // Touch drag-and-drop mechanics for trainer records (fichas) on mobile devices
  const touchActiveTrainerRecordId = useRef<string | null>(null);
  const touchTrainerDragStarted = useRef<boolean>(false);
  const [touchDraggingRecord, setTouchDraggingRecord] = useState<TrainerRecord | null>(null);
  const [touchDragPos, setTouchDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for the new unified browser-iframe-safe Pointer drag-and-drop mechanics
  const dragStartCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const dragInitiatedRef = useRef<boolean>(false);
  const trainerDragWasActiveRef = useRef<boolean>(false);

  // Unified visual dragging state trackers for ghost preview and canvas target highlighting
  const [dragCoordinates, setDragCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [isDragHoveringSidebar, setIsDragHoveringSidebar] = useState<boolean>(true);

  useEffect(() => {
    if (editingTokenSettingsId) {
      if (lastLoadedTokenIdRef.current !== editingTokenSettingsId) {
        lastLoadedTokenIdRef.current = editingTokenSettingsId;
        const activeTk = resolvedTokens.find(t => t.id === editingTokenSettingsId);
        const aurId = activeTk?.animatedAuraId || "none";
        const auraDef = ANIMATED_AURAS.find(a => a.id === aurId);

        setTempAuraId(aurId);
        setTempAuraScale(activeTk?.auraScale !== undefined ? activeTk.auraScale : 0.5);
        setTempAuraIntensity(activeTk?.auraIntensity !== undefined ? activeTk.auraIntensity : 0.5);
        setTempAuraOpacity(activeTk?.auraOpacity !== undefined ? activeTk.auraOpacity : 0.5);
        setTempAuraParticleCount(activeTk?.auraParticleCount !== undefined ? activeTk.auraParticleCount : 60);
        setTempAuraAnimationSpeed(activeTk?.auraAnimationSpeed !== undefined ? activeTk.auraAnimationSpeed : 0.5);
        setTempAuraColorPrimary(activeTk?.auraColorPrimary !== undefined ? activeTk.auraColorPrimary : (auraDef?.colorPrimary ?? "#3b82f6"));
        setTempAuraColorSecondary(activeTk?.auraColorSecondary !== undefined ? activeTk.auraColorSecondary : (auraDef?.colorSecondary ?? "#6366f1"));
        setTempAuraEnableGlow(activeTk?.auraEnableGlow !== undefined ? activeTk.auraEnableGlow : (auraDef?.enableGlow ?? true));
        setTempAuraEnableDistortion(activeTk?.auraEnableDistortion !== undefined ? activeTk.auraEnableDistortion : (auraDef?.enableDistortion ?? true));

        setAuraSelectorOpen(false);
        setAuraCategory("Todos");
        setAppearanceExpanded(false);
        setAuraTuningExpanded(false);
      }
    } else {
      lastLoadedTokenIdRef.current = null;
      setTempAuraId(null);
      setTempAuraScale(1.0);
    }
  }, [editingTokenSettingsId]);

  // Window drag listeners to track dragCoordinates and hover status of the sidebar
  useEffect(() => {
    const handleWindowDragOver = (e: MouseEvent) => {
      if (!draggingTrainerRecordId) return;
      setDragCoordinates({ x: e.clientX, y: e.clientY });

      const sidebarEl = document.getElementById("vtt-sidebar-popup");
      if (sidebarEl) {
        const rect = sidebarEl.getBoundingClientRect();
        const isInside = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        setIsDragHoveringSidebar(isInside);
      }
    };

    const handleWindowDragEnd = () => {
      setDraggingTrainerRecordId(null);
      setDragOverTrainerFolderId(null);
      setDragCoordinates(null);
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragend", handleWindowDragEnd);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragend", handleWindowDragEnd);
    };
  }, [draggingTrainerRecordId]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileMapInputRef = useRef<HTMLInputElement>(null);
  const fileTokenInputRef = useRef<HTMLInputElement>(null);
  const tokenDragStartMouseRef = useRef({ x: 0, y: 0 });
  const isTokenMovedRef = useRef<boolean>(false);
  const panAnimationRef = useRef<number | null>(null);
  const justFinishedDraggingTokenIdRef = useRef<string | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activePointersRef = useRef<{ pointerId: number; clientX: number; clientY: number }[]>([]);
  const touchStartRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    midX: number;
    midY: number;
    initialPan: { x: number; y: number };
  } | null>(null);

  // Auto synchronization
  useEffect(() => {
    localStorage.setItem("vtt_maps", JSON.stringify(maps));
  }, [maps]);

  useEffect(() => {
    localStorage.setItem("vtt_active_map_id", activeMapId || "null");
  }, [activeMapId]);

  useEffect(() => {
    localStorage.setItem("vtt_tokens", JSON.stringify(tokens));
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem("vtt_map_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("vtt_trainer_folders", JSON.stringify(trainerFolders));
  }, [trainerFolders]);

  useEffect(() => {
    localStorage.setItem("vtt_trainer_records", JSON.stringify(trainerRecords));
  }, [trainerRecords]);

  const createRoom = async (campName?: string) => {
    if (!user) {
      setNotification("Você precisa conectar a Nuvem com o Google primeiro!");
      return;
    }
    setIsConnectingRoom(true);
    try {
      const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCode = `PKV-${randHex}`;
      const finalCampName = campName?.trim() || "Campanha Pokémon";
      
      const newRoom = {
        id: newCode,
        dmId: user.uid,
        dmName: user.displayName || "Mestre",
        campaignName: finalCampName,
        activeMapId: activeMapId || null,
        activeMap: maps.find(m => m.id === activeMapId) || null,
        lastUpdated: Date.now()
      };
      
      await setDoc(doc(db, "rooms", newCode), newRoom);
      
      setRoomId(newCode);
      localStorage.setItem("vtt_room_id", newCode);
      setUserRole("Mestre");
      
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mesa=${newCode}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
      
      setNotification(`Mesa Online ${newCode} criada! Link copiado! 🌟`);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(newUrl).catch(() => {});
      }
    } catch (e) {
      console.error("Error creating room:", e);
      setNotification("Não foi possível criar a Mesa Online.");
    } finally {
      setIsConnectingRoom(false);
    }
  };

  const joinRoom = async (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim().toUpperCase();
    setIsConnectingRoom(true);
    try {
      const col = collection(db, "rooms");
      const snap = await getDocs(query(col, where("id", "==", cleanCode)));
      if (snap.empty) {
        setNotification("Mesa Online não encontrada.");
        setIsConnectingRoom(false);
        return;
      }
      
      setRoomId(cleanCode);
      localStorage.setItem("vtt_room_id", cleanCode);
      setUserRole("Jogador");
      
      const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mesa=${cleanCode}`;
      window.history.pushState({ path: newUrl }, "", newUrl);
      
      setNotification(`Conectado à Mesa Online ${cleanCode}!`);
    } catch (e) {
      console.error("Error joining room:", e);
      setNotification("Não foi possível entrar na Mesa Online.");
    } finally {
      setIsConnectingRoom(false);
    }
  };

  const disconnectRoom = () => {
    setRoomId(null);
    setRoomData(null);
    setRoomDmId(null);
    setRoomDmName(null);
    localStorage.removeItem("vtt_room_id");
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    setNotification("Desconectado da Mesa Online.");
  };

  const activeMapIdRef = useRef(activeMapId);
  const isCombatActiveRef = useRef(isCombatActive);
  const combatParticipantsRef = useRef(combatParticipants);
  const currentCombatTurnRef = useRef(currentCombatTurn);
  const combatRoundRef = useRef(combatRound);

  useEffect(() => { activeMapIdRef.current = activeMapId; }, [activeMapId]);
  useEffect(() => { isCombatActiveRef.current = isCombatActive; }, [isCombatActive]);
  useEffect(() => { combatParticipantsRef.current = combatParticipants; }, [combatParticipants]);
  useEffect(() => { currentCombatTurnRef.current = currentCombatTurn; }, [currentCombatTurn]);
  useEffect(() => { combatRoundRef.current = combatRound; }, [combatRound]);
  const sendChatMessage = async (text: string, type: 'text' | 'roll' | 'system' = 'text', rollResult?: any) => {
    if (!roomId || !user) return;
    try {
      const msgId = `msg-${Math.random().toString(36).substring(2, 11)}`;
      const msgDoc = {
        id: msgId,
        senderId: user.uid,
        senderName: user.displayName || "Jogador",
        senderRole: userRole,
        text: text,
        timestamp: Date.now(),
        type: type,
        rollResult: rollResult || null
      };
      await setDoc(doc(db, "rooms", roomId, "chat", msgId), msgDoc);
    } catch (e) {
      console.error("Failed to send chat message:", e);
    }
  };

  const logToSystemChat = async (msg: string) => {
    await sendChatMessage(msg, 'system');
  };

  // Helper check for token ownership
  const isTokenOwned = (token: TokenItem) => {
    if (!user) return false;
    if (userRole === "Mestre") return true; 
    if (token.userId === user.uid) return true;
    if (token.trainerId) {
      const tr = allAvailableTrainerRecords.find(r => r.id === token.trainerId);
      if (tr && tr.userId === user.uid) return true;
    }
    return false;
  };

  // Automated presence indicator reporting
  useEffect(() => {
    if (!roomId || !user) return;

    const presenceDocRef = doc(db, "rooms", roomId, "players", user.uid);
    const updatePresence = async () => {
      try {
        await setDoc(presenceDocRef, {
          uid: user.uid,
          name: user.displayName || "Jogador Anônimo",
          role: userRole,
          online: true,
          lastActive: Date.now()
        });
      } catch (e) {
        console.error("Failed to update presence:", e);
      }
    };

    updatePresence();
    
    const pingInterval = setInterval(() => {
      setDoc(presenceDocRef, {
         lastActive: Date.now(),
         online: true
      }, { merge: true }).catch(() => {});
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      setDoc(presenceDocRef, {
        online: false,
        lastActive: Date.now()
      }, { merge: true }).catch(() => {});
    };
  }, [roomId, user?.uid, userRole]);

  // Real-time Room subcollections subscription snapshot listeners
  useEffect(() => {
    if (!roomId) {
      setRoomPlayers([]);
      setChatMessages([]);
      return;
    }

    // A. Players Presence listener
    const unsubscribePlayers = onSnapshot(collection(db, "rooms", roomId, "players"), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push(d.data());
      });
      setRoomPlayers(list);
    }, (err) => {
      console.error("Players sync error:", err);
    });

    // B. Chat Message listener
    const unsubscribeChat = onSnapshot(collection(db, "rooms", roomId, "chat"), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push(d.data());
      });
      list.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(list);
    }, (err) => {
      console.error("Chat sync error:", err);
    });

    // C. Tokens subcollection listener
    const unsubscribeTokens = onSnapshot(collection(db, "rooms", roomId, "tokens"), (snap) => {
      isFetchingFromCloudRef.current = true;
      const list: TokenItem[] = [];
      snap.forEach(d => {
        list.push(d.data() as TokenItem);
      });

      setTokens(prev => {
        const activeDraggingId = draggingTokenIdRef.current;
        return list.map((incToken) => {
          if (incToken.id === activeDraggingId) {
            const localToken = prev.find(t => t.id === activeDraggingId);
            if (localToken) {
              return { ...incToken, x: localToken.x, y: localToken.y };
            }
          }
          return incToken;
        });
      });

      setTimeout(() => {
        isFetchingFromCloudRef.current = false;
      }, 100);
    }, (err) => {
      console.error("Tokens sync error:", err);
    });

    // D. Shared TrainerRecords subcollection listener
    const unsubscribeTrainerRecords = onSnapshot(collection(db, "rooms", roomId, "trainerRecords"), (snap) => {
      const list: TrainerRecord[] = [];
      snap.forEach(d => {
        list.push(d.data() as TrainerRecord);
      });
      setRoomTrainerRecords(list);
    }, (err) => {
      console.error("TrainerRecords sync error:", err);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeChat();
      unsubscribeTokens();
      unsubscribeTrainerRecords();
    };
  }, [roomId]);

  // Automated Token multi-user incremental change syncer effect
  const lastSyncedTokensSubcollectionRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!roomId || !user || isFetchingFromCloudRef.current) return;

    tokens.forEach(t => {
      const key = t.id;
      const serialized = JSON.stringify(t);
      if (lastSyncedTokensSubcollectionRef.current[key] !== serialized) {
        lastSyncedTokensSubcollectionRef.current[key] = serialized;
        const tokenDocRef = doc(db, "rooms", roomId, "tokens", t.id);
        setDoc(tokenDocRef, { ...t, userId: t.userId || user.uid }, { merge: true }).catch(err => {
          console.error("Failed matching token to cloud subcollection:", err);
        });
      }
    });

    const currentIds = new Set(tokens.map(t => t.id));
    Object.keys(lastSyncedTokensSubcollectionRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        // ONLY allow deletion if we are the Mestre or the owner/creator of that token
        let canDeleteToken = (userRole === "Mestre");
        if (!canDeleteToken) {
          const cachedTokenStr = lastSyncedTokensSubcollectionRef.current[id];
          if (cachedTokenStr) {
            try {
              const cachedToken = JSON.parse(cachedTokenStr);
              if (cachedToken && (cachedToken.userId === user.uid || cachedToken.ownerId === user.uid)) {
                canDeleteToken = true;
              }
            } catch (_) {}
          }
        }

        delete lastSyncedTokensSubcollectionRef.current[id];

        if (canDeleteToken) {
          deleteDoc(doc(db, "rooms", roomId, "tokens", id)).catch(err => {
            console.error("Failed deleting token from cloud subcollection:", err);
          });
        }
      }
    });
  }, [tokens, roomId, user, userRole]);

  // Safe Decentralized Sharing: Publish character sheets to room subcollection only if they are placed as active tokens
  useEffect(() => {
    if (!roomId || !user) return;

    tokens.forEach(async (t) => {
      if (t.trainerId) {
        const tr = trainerRecords.find(r => r.id === t.trainerId);
        if (tr) {
          try {
            await setDoc(doc(db, "rooms", roomId, "trainerRecords", tr.id), tr, { merge: true });
          } catch (e) {
            console.error("Failed sharing trainer record in room:", e);
          }
        }
      }
    });
  }, [tokens, trainerRecords, roomId, user]);

  // Automated turn advance news reporter
  const lastLoggedCombatKeyRef = useRef<string>("");

  useEffect(() => {
    if (!roomId || !isCombatActive || combatParticipants.length === 0) {
      if (lastLoggedCombatKeyRef.current !== "inactive") {
        lastLoggedCombatKeyRef.current = "inactive";
      }
      return;
    }

    const currentCombatant = combatParticipants[currentCombatTurn];
    if (!currentCombatant) return;

    const key = `combat-${combatRound}-${currentCombatTurn}-${currentCombatant.tokenId}`;
    if (lastLoggedCombatKeyRef.current !== key) {
      lastLoggedCombatKeyRef.current = key;
      logToSystemChat(`⚔️ **Rodada ${combatRound} • Turno de ${currentCombatant.name}**!`);
    }
  }, [isCombatActive, currentCombatTurn, combatRound, roomId, combatParticipants]);

  // 1. Core room state main document listener (Combat stages and Projected Active Arena)
  useEffect(() => {
    if (!roomId) {
      setRoomData(null);
      return;
    }
    
    const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoomData(data);
        setRoomDmId(data.dmId || null);
        setRoomDmName(data.dmName || null);
        
        // Auto detect and set session role
        let detectedRole: "Mestre" | "Jogador" = "Jogador";
        if (user && data.dmId && user.uid === data.dmId) {
          detectedRole = "Mestre";
        }
        
        if (detectedRole !== userRole) {
          setUserRole(detectedRole);
          if (detectedRole === "Mestre") {
            setNotification("Mestre autenticado: Você está no controle da Mesa! 👑");
          } else {
            setNotification(`Conectado como Jogador na Mesa de ${data.dmName || "Mestre"}! 🌟`);
          }
        }
        
        isFetchingFromCloudRef.current = true;
        
        if (detectedRole === "Jogador") {
          if (data.activeMapId !== activeMapIdRef.current || !activeMapIdRef.current) {
            if (data.activeMap) {
              setMaps(prev => {
                const mapItem = data.activeMap;
                if (!prev.some(m => m.id === mapItem.id)) {
                  return [...prev, mapItem];
                }
                return prev.map(m => m.id === mapItem.id ? mapItem : m);
              });
            }
            setActiveMapId(data.activeMapId);
          }

          if (data.isCombatActive !== undefined && data.isCombatActive !== isCombatActiveRef.current) {
            setIsCombatActive(data.isCombatActive);
          }
          if (data.combatParticipants && JSON.stringify(data.combatParticipants) !== JSON.stringify(combatParticipantsRef.current)) {
            setCombatParticipants(data.combatParticipants);
          }
          if (data.currentCombatTurn !== undefined && data.currentCombatTurn !== currentCombatTurnRef.current) {
            setCurrentCombatTurn(data.currentCombatTurn);
          }
          if (data.combatRound !== undefined && data.combatRound !== combatRoundRef.current) {
            setCombatRound(data.combatRound);
          }
        }
        
        setTimeout(() => {
          isFetchingFromCloudRef.current = false;
        }, 120);
      } else {
        setNotification("Mesa Online desfeita ou indisponível.");
        disconnectRoom();
      }
    }, (error) => {
      console.error("Room sync error:", error);
    });
    
    return () => unsubscribe();
  }, [roomId, userRole, user?.uid]);

  // 2. Mestre (DM) -> Sync core campaign stage triggers (active map projection & combat tracker)
  useEffect(() => {
    if (!roomId || userRole !== "Mestre" || !user || isFetchingFromCloudRef.current) return;
    
    const activeMap = maps.find(m => m.id === activeMapId) || null;
    
    const updateRoomInCloud = async () => {
      try {
        await setDoc(doc(db, "rooms", roomId), {
          id: roomId,
          dmId: user.uid,
          dmName: user.displayName || "Mestre",
          activeMapId: activeMapId,
          activeMap: activeMap,
          isCombatActive: isCombatActive,
          combatParticipants: combatParticipants,
          currentCombatTurn: currentCombatTurn,
          combatRound: combatRound,
          lastUpdated: Date.now()
        }, { merge: true });
      } catch (err) {
        console.error("Cloud DM Room update failed:", err);
      }
    };
    
    const timer = setTimeout(updateRoomInCloud, 150);
    return () => clearTimeout(timer);
  }, [activeMapId, maps, roomId, userRole, user, isCombatActive, combatParticipants, currentCombatTurn, combatRound]);

  // Firebase auth listener and cloud initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setNotification(`Nuvem ativa: ${firebaseUser.displayName || 'Mestre'}!`);
        
        try {
          isFetchingFromCloudRef.current = true;
          const qMaps = query(collection(db, "maps"), where("userId", "==", firebaseUser.uid));
          const snapMaps = await getDocs(qMaps);
          
          if (snapMaps.empty) {
            setNotification("Sincronizando sua mesa local na Nuvem segura...");
            
            // Sync maps
            for (const item of maps) {
              await setDoc(doc(db, "maps", item.id), { ...item, userId: firebaseUser.uid });
            }
            // Sync mapFolders
            for (const item of folders) {
              await setDoc(doc(db, "mapFolders", item.id), { ...item, userId: firebaseUser.uid });
            }
            // Sync trainerFolders
            for (const item of trainerFolders) {
              await setDoc(doc(db, "trainerFolders", item.id), { ...item, userId: firebaseUser.uid });
            }
            // Sync trainerRecords
            for (const item of trainerRecords) {
              await setDoc(doc(db, "trainerRecords", item.id), { ...item, userId: firebaseUser.uid });
            }
            // Sync tokens
            for (const item of tokens) {
              await setDoc(doc(db, "tokens", item.id), { ...item, userId: firebaseUser.uid });
            }
            
            setNotification("Mesa importada com sucesso! Conexão Nuvem estabelecida. 🚀");
          } else {
            setNotification("Mesa Nuvem carregada e pronta em tempo real.");
          }
          isFetchingFromCloudRef.current = false;
        } catch (e) {
          console.error("Cloud initialization error:", e);
          isFetchingFromCloudRef.current = false;
        }
      } else {
        setNotification("Modo Local ativo. Faça login para salvar na nuvem.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase Cloud -> Local State snapshot streams
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "maps"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      isFetchingFromCloudRef.current = true;
      const remoteData: MapItem[] = [];
      snapshot.forEach((d) => {
        remoteData.push(d.data() as MapItem);
      });
      setMaps(remoteData);
      lastSyncedMapsRef.current = remoteData;
      setTimeout(() => {
        isFetchingFromCloudRef.current = false;
      }, 50);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "maps");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "mapFolders"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      isFetchingFromCloudRef.current = true;
      const remoteData: MapFolder[] = [];
      snapshot.forEach((d) => {
        remoteData.push(d.data() as MapFolder);
      });
      setFolders(remoteData);
      lastSyncedFoldersRef.current = remoteData;
      setTimeout(() => {
        isFetchingFromCloudRef.current = false;
      }, 50);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "mapFolders");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "trainerFolders"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      isFetchingFromCloudRef.current = true;
      const remoteData: TrainerFolder[] = [];
      snapshot.forEach((d) => {
        remoteData.push(d.data() as TrainerFolder);
      });
      setTrainerFolders(remoteData);
      lastSyncedTrainerFoldersRef.current = remoteData;
      setTimeout(() => {
        isFetchingFromCloudRef.current = false;
      }, 50);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "trainerFolders");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "trainerRecords"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      isFetchingFromCloudRef.current = true;
      const remoteData: TrainerRecord[] = [];
      snapshot.forEach((d) => {
        remoteData.push(d.data() as TrainerRecord);
      });
      setTrainerRecords(remoteData);
      lastSyncedTrainerRecordsRef.current = remoteData;
      setTimeout(() => {
        isFetchingFromCloudRef.current = false;
      }, 50);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "trainerRecords");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || roomId) return;
    const q = query(collection(db, "tokens"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      isFetchingFromCloudRef.current = true;
      const remoteData: TokenItem[] = [];
      snapshot.forEach((d) => {
        remoteData.push(d.data() as TokenItem);
      });
      setTokens(remoteData);
      lastSyncedTokensRef.current = remoteData;
      setTimeout(() => {
        isFetchingFromCloudRef.current = false;
      }, 50);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "tokens");
    });
    return () => unsubscribe();
  }, [user, roomId]);

  // Local State -> Firebase Cloud sync triggers
  useEffect(() => {
    if (!user || isFetchingFromCloudRef.current) {
      lastSyncedMapsRef.current = maps;
      return;
    }
    const prev = lastSyncedMapsRef.current;
    const current = maps;

    current.forEach(async (map) => {
      const original = prev.find(m => m.id === map.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(map)) {
        try {
          await setDoc(doc(db, "maps", map.id), { ...map, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `maps/${map.id}`);
        }
      }
    });

    prev.forEach(async (map) => {
      const stillExists = current.some(m => m.id === map.id);
      if (!stillExists) {
        try {
          await deleteDoc(doc(db, "maps", map.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `maps/${map.id}`);
        }
      }
    });

    lastSyncedMapsRef.current = maps;
  }, [maps, user]);

  useEffect(() => {
    if (!user || isFetchingFromCloudRef.current) {
      lastSyncedFoldersRef.current = folders;
      return;
    }
    const prev = lastSyncedFoldersRef.current;
    const current = folders;

    current.forEach(async (fold) => {
      const original = prev.find(f => f.id === fold.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(fold)) {
        try {
          await setDoc(doc(db, "mapFolders", fold.id), { ...fold, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `mapFolders/${fold.id}`);
        }
      }
    });

    prev.forEach(async (fold) => {
      const stillExists = current.some(f => f.id === fold.id);
      if (!stillExists) {
        try {
          await deleteDoc(doc(db, "mapFolders", fold.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `mapFolders/${fold.id}`);
        }
      }
    });

    lastSyncedFoldersRef.current = folders;
  }, [folders, user]);

  useEffect(() => {
    if (!user || isFetchingFromCloudRef.current) {
      lastSyncedTrainerFoldersRef.current = trainerFolders;
      return;
    }
    const prev = lastSyncedTrainerFoldersRef.current;
    const current = trainerFolders;

    current.forEach(async (fold) => {
      const original = prev.find(f => f.id === fold.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(fold)) {
        try {
          await setDoc(doc(db, "trainerFolders", fold.id), { ...fold, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `trainerFolders/${fold.id}`);
        }
      }
    });

    prev.forEach(async (fold) => {
      const stillExists = current.some(f => f.id === fold.id);
      if (!stillExists) {
        try {
          await deleteDoc(doc(db, "trainerFolders", fold.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `trainerFolders/${fold.id}`);
        }
      }
    });

    lastSyncedTrainerFoldersRef.current = trainerFolders;
  }, [trainerFolders, user]);

  useEffect(() => {
    if (!user || isFetchingFromCloudRef.current) {
      lastSyncedTrainerRecordsRef.current = trainerRecords;
      return;
    }
    const prev = lastSyncedTrainerRecordsRef.current;
    const current = trainerRecords;

    current.forEach(async (rec) => {
      const original = prev.find(r => r.id === rec.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(rec)) {
        try {
          await setDoc(doc(db, "trainerRecords", rec.id), { ...rec, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `trainerRecords/${rec.id}`);
        }
      }
    });

    prev.forEach(async (rec) => {
      const stillExists = current.some(r => r.id === rec.id);
      if (!stillExists) {
        try {
          await deleteDoc(doc(db, "trainerRecords", rec.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `trainerRecords/${rec.id}`);
        }
      }
    });

    lastSyncedTrainerRecordsRef.current = trainerRecords;
  }, [trainerRecords, user]);

  useEffect(() => {
    if (!user || roomId || isFetchingFromCloudRef.current) {
      lastSyncedTokensRef.current = tokens;
      return;
    }
    const prev = lastSyncedTokensRef.current;
    const current = tokens;

    current.forEach(async (tok) => {
      const original = prev.find(t => t.id === tok.id);
      if (!original || JSON.stringify(original) !== JSON.stringify(tok)) {
        try {
          await setDoc(doc(db, "tokens", tok.id), { ...tok, userId: user.uid });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `tokens/${tok.id}`);
        }
      }
    });

    prev.forEach(async (tok) => {
      const stillExists = current.some(t => t.id === tok.id);
      if (!stillExists) {
        try {
          await deleteDoc(doc(db, "tokens", tok.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `tokens/${tok.id}`);
        }
      }
    });

    lastSyncedTokensRef.current = tokens;
  }, [tokens, user, roomId]);

  const handleCloudAuth = async () => {
    if (user) {
      if (confirm("Deseja desconectar sua conta da nuvem? Seus dados continuarão salvos localmente.")) {
        try {
          await signOut(auth);
          setUser(null);
          setNotification("Desconectado da Nuvem.");
        } catch (err) {
          console.error("Logout error:", err);
          setNotification("Erro ao desconectar.");
        }
      }
    } else {
      const provider = new GoogleAuthProvider();
      try {
        setNotification("Conectando com o Google...");
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          setUser(result.user);
          setNotification(`Conectado como ${result.user.displayName || "Treinador"}!`);
        }
      } catch (err: any) {
        if (err && err.code === "auth/popup-closed-by-user") {
          setNotification("Conexão cancelada: janela de login fechada.");
        } else {
          console.error("Auth error:", err);
          setNotification("Não foi possível conectar à Nuvem.");
        }
      }
    }
  };

  const resolvedTokens = React.useMemo(() => {
    return tokens.map(t => {
      if (t.trainerId) {
        const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
        if (tr) {
          if (t.pokemonId) {
            // Find this specific Pokémon in the trainer's records
            const pk = tr.pokemon?.find(p => p.id === t.pokemonId);
            if (pk) {
              const finalHpMax = pk.hpMax !== undefined ? pk.hpMax : (t.hpMax !== undefined ? t.hpMax : 20);
              const finalHpCurrent = pk.hpCurrent !== undefined ? pk.hpCurrent : (t.hpCurrent !== undefined ? t.hpCurrent : finalHpMax);
              return {
                ...t,
                name: pk.name,
                url: pk.image || t.url || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png",
                hpCurrent: finalHpCurrent,
                hpMax: finalHpMax,
                level: pk.level,
                nickname: pk.nickname,
                statusStages: pk.statusStages,
                statusConditions: pk.statusConditions,
              };
            }
          }
          const finalHpMax = tr.hpMax !== undefined ? tr.hpMax : (t.hpMax !== undefined ? t.hpMax : 10);
          const finalHpCurrent = tr.hpCurrent !== undefined ? tr.hpCurrent : (t.hpCurrent !== undefined ? t.hpCurrent : finalHpMax);
          return {
            ...t,
            name: tr.name,
            url: tr.image,
            hpCurrent: finalHpCurrent,
            hpMax: finalHpMax,
          };
        }
      }
      return t;
    });
  }, [tokens, allAvailableTrainerRecords]);

  const activeMap = maps.find(m => m.id === activeMapId);

  // Memoized virtual tactical position of the token being dragged onto the VTT canvas
  const dragCanvasTarget = React.useMemo(() => {
    if (!draggingTrainerRecordId || !dragCoordinates) return null;
    const worldElement = document.getElementById("vtt-canvas-world");
    if (!worldElement || !activeMap) return null;

    const rect = worldElement.getBoundingClientRect();
    const isOverCanvas = (
      dragCoordinates.x >= rect.left &&
      dragCoordinates.x <= rect.right &&
      dragCoordinates.y >= rect.top &&
      dragCoordinates.y <= rect.bottom
    );

    if (!isOverCanvas) return null;

    const dropX = (dragCoordinates.x - rect.left) / zoom;
    const dropY = (dragCoordinates.y - rect.top) / zoom;

    const sizeMultiplier = 1.5;
    const tokenPixelSize = sizeMultiplier * (activeMap.gridSize || 70);
    let finalX = dropX - (tokenPixelSize / 2);
    let finalY = dropY - (tokenPixelSize / 2);

    if (activeMap.gridEnabled && snapToGrid) {
      const step = activeMap.gridSize;
      finalX = Math.round(finalX / step) * step;
      finalY = Math.round(finalY / step) * step;
    }

    const trainer = allAvailableTrainerRecords.find(r => r.id === draggingTrainerRecordId);

    return {
      x: finalX,
      y: finalY,
      size: tokenPixelSize,
      image: trainer?.image,
      name: trainer?.name
    };
  }, [draggingTrainerRecordId, dragCoordinates, activeMap, zoom, snapToGrid, allAvailableTrainerRecords]);

  const editingToken = resolvedTokens.find(t => t.id === editingTokenSettingsId);

  const selectedToken = resolvedTokens.find(t => t.id === selectedTokenId);
  const selectedTokenHp = selectedToken?.hpCurrent;
  const selectedTokenMaxHp = selectedToken?.hpMax;
  const selectedTokenTempHp = selectedToken?.tempHp;

  useEffect(() => {
    if (isHealthInputFocused) return;
    if (selectedToken) {
      setHealthInputText(String(selectedToken.hpCurrent ?? 0));
    } else {
      setHealthInputText("");
    }
  }, [selectedTokenId, selectedTokenHp, selectedTokenTempHp, isHealthInputFocused]);

  // Reset Combat Inspector visibility when selected token changes
  useEffect(() => {
    setIsCombatInspectorOpen(false);
  }, [selectedTokenId]);

  // Close Combat Inspector on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e: any) => {
      if (isCombatInspectorOpen) {
        const inspectorEl = document.getElementById("vtt-combat-inspector");
        const triggerBtn = e.target.closest("[data-combat-inspector-trigger]");
        
        const path = e.composedPath ? e.composedPath() : [];
        const isClickInside = 
          e.target.closest?.("#vtt-combat-inspector") || 
          e.target.closest?.("#vtt-token-context-menu-pokemon") ||
          triggerBtn ||
          path.some((node: any) => node.id === "vtt-combat-inspector" || node.id === "vtt-token-context-menu-pokemon");

        if (inspectorEl && !isClickInside) {
          setIsCombatInspectorOpen(false);
          setManuallyClosedTokenId(selectedTokenId);
        }
      }
    };
    
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCombatInspectorOpen, selectedTokenId]);

  // Update Move PP on selected token's Pokémon
  const updatePokemonMovePP = (tokenId: string, moveSlot: "move1" | "move2" | "move3" | "move4", newPP: number) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token || !token.trainerId || !token.pokemonId) return;

    const trainerId = token.trainerId;
    const pokemonId = token.pokemonId;

    setTrainerRecords(prevRecords => prevRecords.map(tr => {
      if (tr.id === trainerId && tr.pokemon) {
        const updatedPokemon = tr.pokemon.map(pk => {
          if (pk.id === pokemonId) {
            const currentMove = ensureMoveObj(pk[moveSlot as keyof typeof pk]);
            const nextPPCurrent = Math.max(0, Math.min(currentMove.pp, newPP));
            const updatedMove = { ...currentMove, ppCurrent: nextPPCurrent };
            return {
              ...pk,
              [moveSlot]: updatedMove
            };
          }
          return pk;
        });

        const updatedTrainer = {
          ...tr,
          pokemon: updatedPokemon,
          updatedAt: new Date().toISOString()
        };

        if (activeTrainerRecord && activeTrainerRecord.id === trainerId) {
          setActiveTrainerRecord(updatedTrainer);
        }

        return updatedTrainer;
      }
      return tr;
    }));
  };

  // Combat Inspector Dynamic Calculations
  const getCiModifiedStat = (pk: any, attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    if (!pk) return 10;
    const baseVal = pk.attributes?.[attr] ?? 10;
    const natureObj = POKEMON_NATURES.find(n => n.id === pk.nature);
    const isBenefited = natureObj?.bonusAttr === attr;
    const isPenalized = natureObj?.penaltyAttr === attr;
    return isBenefited ? baseVal + 2 : (isPenalized ? Math.max(1, baseVal - 2) : baseVal);
  };

  const getCiModifier = (pk: any, attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    const val = getCiModifiedStat(pk, attr);
    return Math.floor((val - 10) / 2);
  };

  const getCiModifierStr = (pk: any, attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    const mod = getCiModifier(pk, attr);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getCiSavingThrowModStr = (pk: any, attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    if (!pk) return "+0";
    const baseMod = getCiModifier(pk, attr);
    const isProf = pk.savingThrows?.[attr] || false;
    const profBonus = calculateProficiencyBonus(pk.level || 1);
    const loyalty = pk.loyalty ?? 0;
    
    let loyaltyBonus = 0;
    if (loyalty === 3 || loyalty === 2 || loyalty === 1) {
      loyaltyBonus = 1;
    } else if (loyalty === -3 || loyalty === -2 || loyalty === -1) {
      loyaltyBonus = -1;
    }
    
    const totalSave = baseMod + (isProf ? profBonus : 0) + loyaltyBonus;
    return totalSave >= 0 ? `+${totalSave}` : `${totalSave}`;
  };

  const getCiSavingThrowModVal = (pk: any, attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    if (!pk) return 0;
    const baseMod = getCiModifier(pk, attr);
    const isProfInt = pk.savingThrows?.[attr] || false;
    const profBonus = calculateProficiencyBonus(pk.level || 1);
    const loyalty = pk.loyalty ?? 0;
    
    let loyaltyBonus = 0;
    if (loyalty === 3 || loyalty === 2 || loyalty === 1) {
      loyaltyBonus = 1;
    } else if (loyalty === -3 || loyalty === -2 || loyalty === -1) {
      loyaltyBonus = -1;
    }
    
    return baseMod + (isProfInt ? profBonus : 0) + loyaltyBonus;
  };

  const getCiAC = (pk: any) => {
    if (!pk) return 10;
    const desVal = getCiModifiedStat(pk, "DES");
    const desMod = Math.floor((desVal - 10) / 2);
    const hasPeleDeFerro = pk.talentos?.some((t: any) => t.id === "pele-de-ferro" || t.name?.toLowerCase().includes("pele de ferro"));
    
    let natureCaBonus = 0;
    const natureObj = POKEMON_NATURES.find(n => n.id === pk.nature);
    if (natureObj?.bonusAttr === "CA") {
      natureCaBonus = 1;
    }
    
    return 10 + desMod + (hasPeleDeFerro ? 1 : 0) + natureCaBonus;
  };

  const getCiInitiative = (pk: any) => {
    if (!pk) return 0;
    const desMod = getCiModifier(pk, "DES");
    const hasVelocidadeExtrema = pk.talentos?.some((t: any) => t.id === "velocidade-extrema" || t.name?.toLowerCase().includes("velocidade extrema"));
    const hasIniciativaAlerta = pk.talentos?.some((t: any) => t.id === "iniciativa-alerta" || t.name?.toLowerCase().includes("iniciativa alerta"));
    
    let bonus = 0;
    if (hasVelocidadeExtrema) bonus += 2;
    if (hasIniciativaAlerta) bonus += 5;
    
    return desMod + bonus;
  };

  const getCiInitiativeStr = (pk: any) => {
    const val = getCiInitiative(pk);
    return val >= 0 ? `+${val}` : `${val}`;
  };

  const rollDiceFormula = (formula: string): { total: number; rolls: number[]; bonus: number } => {
    let clean = (formula || "").toLowerCase().replace(/\s+/g, "");
    if (!clean) return { total: 0, rolls: [], bonus: 0 };
    
    let parts = clean.split(/[+-]/);
    let diePart = parts[0];
    let isMinus = clean.includes("-");
    let bonusValue = 0;
    if (parts.length > 1) {
      bonusValue = parseInt(parts[1]) || 0;
      if (isMinus) bonusValue = -bonusValue;
    }
    
    let rollsCount = 1;
    let dieSides = 8;
    if (diePart.includes("d")) {
      let subParts = diePart.split("d");
      rollsCount = parseInt(subParts[0]) || 1;
      dieSides = parseInt(subParts[1]) || 6;
    } else {
      let flat = parseInt(diePart) || 0;
      return { total: flat + bonusValue, rolls: [flat], bonus: bonusValue };
    }
    
    let rolls: number[] = [];
    let total = 0;
    for (let i = 0; i < rollsCount; i++) {
      let r = Math.floor(Math.random() * dieSides) + 1;
      rolls.push(r);
      total += r;
    }
    total += bonusValue;
    return { total, rolls, bonus: bonusValue };
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Trigger automatic viewport positioning whenever a token is selected or clicked
  useEffect(() => {
    if (selectedTokenId) {
      const token = resolvedTokens.find(t => t.id === selectedTokenId);
      if (token && activeMap) {
        const timer = setTimeout(() => {
          ensureSelectionMenuVisible(token);
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedTokenId]);

  // Handle auto-focus and centering after finishing dragging a selected token
  useEffect(() => {
    if (justFinishedDraggingTokenIdRef.current) {
      const tokenId = justFinishedDraggingTokenIdRef.current;
      justFinishedDraggingTokenIdRef.current = null;
      
      const token = resolvedTokens.find(t => t.id === tokenId);
      if (token && activeMap && selectedTokenId === tokenId) {
        ensureSelectionMenuVisible(token);
      }
    }
  }, [tokens, selectedTokenId, activeMap]);

  // Clean up any pending animations on unmount
  useEffect(() => {
    return () => {
      if (panAnimationRef.current) {
        cancelAnimationFrame(panAnimationRef.current);
      }
    };
  }, []);

  const animatePan = (targetX: number, targetY: number) => {
    if (panAnimationRef.current) {
      cancelAnimationFrame(panAnimationRef.current);
      panAnimationRef.current = null;
    }

    const startX = pan.x;
    const startY = pan.y;
    const startTime = performance.now();
    const duration = 250; // smooth 250ms pan duration

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // easeOutQuad

      const currentX = startX + (targetX - startX) * ease;
      const currentY = startY + (targetY - startY) * ease;

      setPan({ x: currentX, y: currentY });

      if (progress < 1) {
        panAnimationRef.current = requestAnimationFrame(step);
      } else {
        panAnimationRef.current = null;
      }
    };

    panAnimationRef.current = requestAnimationFrame(step);
  };

  const centerTokenCamera = (tokenId: string) => {
    const tk = resolvedTokens.find(t => t.id === tokenId);
    if (!tk || !canvasRef.current || !activeMap) return;

    const container = canvasRef.current;
    const CW = container.clientWidth;
    const CH = container.clientHeight;
    if (CW <= 0 || CH <= 0) return;

    const sizePx = (activeMap.gridSize || 50) * tk.size;
    const tokenCenterX = tk.x + sizePx / 2;
    const tokenCenterY = tk.y + sizePx / 2;

    const targetPanX = - (tokenCenterX - mapImageSize.width / 2) * zoom;
    const targetPanY = - (tokenCenterY - mapImageSize.height / 2) * zoom;

    animatePan(targetPanX, targetPanY);
  };

  const ensureSelectionMenuVisible = (token: TokenItem) => {
    if (!canvasRef.current || !activeMap) return;

    const container = canvasRef.current;
    const CW = container.clientWidth;
    const CH = container.clientHeight;
    if (CW <= 0 || CH <= 0) return;

    const sizePx = (activeMap.gridSize || 50) * token.size;
    const local_token_center_x = token.x + sizePx / 2;
    const local_token_top_y = token.y;

    // Current screen coordinates of the token's top center relative to the container center
    const token_top_center_sx = (CW / 2) + pan.x + (local_token_center_x - mapImageSize.width / 2) * zoom;
    const token_top_center_sy = (CH / 2) + pan.y + (local_token_top_y - mapImageSize.height / 2) * zoom;

    const isMobileDevice = window.innerWidth < 768;
    const menuBaseScale = 1 / zoom;
    const menuMaxScale = isMobileDevice ? 1.15 : 1.4;
    const menuMinScale = isMobileDevice ? 0.75 : 0.65;
    const finalMenuScale = Math.min(menuMaxScale, Math.max(menuMinScale, menuBaseScale));

    const isPokemon = !!token.pokemonId;
    const W_menu = isMobileDevice 
      ? (isPokemon ? 320 : 280) 
      : (isPokemon ? 520 : 420);
    const H_menu = isMobileDevice ? 44 : 52;

    const W_menu_screen = W_menu * finalMenuScale * zoom;
    const H_menu_screen = H_menu * finalMenuScale * zoom;

    const menu_sx_left = token_top_center_sx - W_menu_screen / 2;
    const menu_sx_right = token_top_center_sx + W_menu_screen / 2;
    const menu_sy_bottom = token_top_center_sy - 8 * zoom; // 8px spacing scaled
    const menu_sy_top = menu_sy_bottom - H_menu_screen;

    const margin = 32;
    let dx_adj = 0;
    let dy_adj = 0;

    // 1. Horizontal adjustment for menu
    if (W_menu_screen > CW - 2 * margin) {
      dx_adj = (CW / 2) - token_top_center_sx;
    } else if (menu_sx_left < margin) {
      dx_adj = margin - menu_sx_left;
    } else if (menu_sx_right > CW - margin) {
      dx_adj = (CW - margin) - menu_sx_right;
    }

    // 2. Vertical adjustment for menu
    if (H_menu_screen > CH - 2 * margin) {
      dy_adj = (CH / 2) - (menu_sy_top + H_menu_screen / 2);
    } else if (menu_sy_top < margin) {
      dy_adj = margin - menu_sy_top;
    } else if (menu_sy_bottom > CH - margin) {
      dy_adj = (CH - margin) - menu_sy_bottom;
    }

    // 3. Keep token visible within bounds if possible, constraint by menu priority
    const token_sy_bottom_new = token_top_center_sy + sizePx * zoom + dy_adj;
    const token_bottom_overflow = token_sy_bottom_new - (CH - margin);

    if (token_bottom_overflow > 0) {
      const max_allowed_up_shift = (menu_sy_top + dy_adj) - margin;
      if (max_allowed_up_shift > 0) {
        const actual_up_shift = Math.max(-max_allowed_up_shift, -token_bottom_overflow);
        dy_adj += actual_up_shift;
      }
    }

    if (Math.abs(dx_adj) > 0.5 || Math.abs(dy_adj) > 0.5) {
      const targetPanX = pan.x + dx_adj;
      const targetPanY = pan.y + dy_adj;
      animatePan(targetPanX, targetPanY);
    }
  };

  const handleArenaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedPokeballPokemon) {
      e.stopPropagation();
      e.preventDefault();

      const isAlreadyOnBoard = tokens.some(tok => tok.pokemonId === selectedPokeballPokemon.id);
      if (isAlreadyOnBoard) {
        setNotification(`Erro: "${selectedPokeballPokemon.name}" já está em campo!`);
        setSelectedPokeballPokemon(null);
        setSelectedPokeballTrainerId(null);
        return;
      }
      
      const worldElement = document.getElementById("vtt-canvas-world");
      if (!worldElement) return;
      
      const rect = worldElement.getBoundingClientRect();
      
      let clientX = e.clientX;
      let clientY = e.clientY;
      
      // Safeguard for touchscreen taps on mobile devices
      if (!clientX && !clientY && (e as any).nativeEvent) {
        const touch = (e as any).nativeEvent.touches?.[0] || (e as any).nativeEvent.changedTouches?.[0];
        if (touch) {
          clientX = touch.clientX;
          clientY = touch.clientY;
        }
      }

      const clickX = (clientX - rect.left) / zoom;
      const clickY = (clientY - rect.top) / zoom;
      
      const gridSize = activeMap?.gridSize || 50;
      const sizeMultiplier = 2.0; 
      const tokenPixelSize = gridSize * sizeMultiplier;
      
      let finalX = clickX - (tokenPixelSize / 2);
      let finalY = clickY - (tokenPixelSize / 2);
      
      if (activeMap?.gridEnabled) {
        finalX = Math.round(finalX / gridSize) * gridSize;
        finalY = Math.round(finalY / gridSize) * gridSize;
      }
      
      const newTokenId = "token-pokemon-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      const newToken: TokenItem = {
        id: newTokenId,
        trainerId: selectedPokeballTrainerId || undefined,
        pokemonId: selectedPokeballPokemon.id,
        name: selectedPokeballPokemon.name,
        url: selectedPokeballPokemon.image,
        x: finalX,
        y: finalY,
        size: sizeMultiplier,
        color: "#f43f5e", // Elegant Rose Border for Battle Pokemon
        hpCurrent: selectedPokeballPokemon.hpCurrent,
        hpMax: selectedPokeballPokemon.hpMax,
        tempHp: 0,
        allowTransparency: true,
        hideAura: true,
        auraScale: 0.5,
        auraIntensity: 0.5,
        auraOpacity: 0.5,
        auraAnimationSpeed: 0.5,
        auraParticleCount: 60
      };
      
      // Double check in functional updater block to safely catch fast double-clicks or race conditions
      let wasAddedSuccessfully = false;
      setTokens(prev => {
        const exists = prev.some(tok => tok.pokemonId === selectedPokeballPokemon.id);
        if (exists) {
          return prev;
        }
        wasAddedSuccessfully = true;
        return [...prev, newToken];
      });

      // If the token was not added due to double tap, early return
      setTimeout(() => {
        if (!wasAddedSuccessfully) {
          setNotification(`Erro: "${selectedPokeballPokemon.name}" já está em campo!`);
          setSelectedPokeballPokemon(null);
          setSelectedPokeballTrainerId(null);
        }
      }, 0);

      // Emit high quality summon animation centering around the token
      const effectCenterX = finalX + tokenPixelSize / 2;
      const effectCenterY = finalY + tokenPixelSize / 2;
      triggerVttEffect(effectCenterX, effectCenterY, 'summon', selectedPokeballPokemon.image, sizeMultiplier);
      
      // Update Trainer Records to mark the summoned pokemon as permanently revealed
      if (selectedPokeballTrainerId) {
        setTrainerRecords(prevRecords => prevRecords.map(tr => {
          if (tr.id === selectedPokeballTrainerId && tr.pokemon) {
            const updatedPokemon = tr.pokemon.map(pk => {
              if (pk.id === selectedPokeballPokemon.id) {
                return { ...pk, revealed: true };
              }
              return pk;
            });
            return { ...tr, pokemon: updatedPokemon };
          }
          return tr;
        }));
      }
      
      setNotification(`${selectedPokeballPokemon.name} invocado com sucesso no campo!`);
      setSelectedTokenId(newTokenId);
      
      setSelectedPokeballPokemon(null);
      setSelectedPokeballTrainerId(null);
      return;
    }

    if (didDragAreaRef.current) {
      didDragAreaRef.current = false;
      return;
    }
    
    // Normal board deselect
    if (isMultiSelectActive) {
      setSelectedTokenIds([]);
    }
    setSelectedTokenId(null);
  };

  // Main board pointer (mouse/touch/pen) panning & dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore interactions with controls
    const target = e.target as HTMLElement;
    
    // Only allow camera gestures (pan/zoom) if they occur directly on the canvas or background
    const isDirectOnCanvas = !!(target.closest("#vtt-canvas-world") || target.id === "vtt-tabletop-arena");
    if (!isDirectOnCanvas) {
      return;
    }

    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('select') || 
      target.closest('textarea') ||
      target.closest('#vtt-token-context-menu')
    ) {
      return;
    }

    if (panAnimationRef.current) {
      cancelAnimationFrame(panAnimationRef.current);
      panAnimationRef.current = null;
    }

    // Save/update this pointer in our active cache list
    const currentPointers = [
      ...activePointersRef.current.filter((p) => p.pointerId !== e.pointerId),
      { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY },
    ];
    activePointersRef.current = currentPointers;

    const isOverToken = !!draggingTokenIdRef.current;

    // Reset didDragAreaRef on start
    didDragAreaRef.current = false;

    if (currentPointers.length === 1) {
      // 1-pointer gesture
      if (isOverToken) {
        // Token drag has been started inside handleTokenPointerDown. Do not pan the map.
        setIsDragging(false);
      } else if (isMultiSelectActive) {
        const arenaEl = document.getElementById("vtt-tabletop-arena");
        if (arenaEl) {
          const rect = arenaEl.getBoundingClientRect();
          setAreaStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setAreaEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (err) {
            // Ignore
          }
        }
        setIsDragging(false);
      } else {
        // Standard single-pointer map panning
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        
        // Capture pointer ONLY for map panning so clicking a token doesn't get captured by the parent
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
          // Ignore
        }
      }
    } else if (currentPointers.length === 2) {
      // 2-pointers pinch-to-zoom & map pan
      // Cancel any ongoing token dragging immediately to avoid confusion
      if (draggingTokenIdRef.current) {
        setDraggingTokenId(null);
      }
      setIsDragging(false);

      // On multi-touch zoom, capture on the parent to follow movements smoothly
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }

      const [p1, p2] = currentPointers;
      const initialDistance = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      touchStartRef.current = {
        initialDistance: initialDistance || 1,
        initialZoom: zoom,
        midX,
        midY,
        initialPan: { x: pan.x, y: pan.y },
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Update pointer position in cache list
    const currentPointers = activePointersRef.current.map((p) => {
      if (p.pointerId === e.pointerId) {
        return { ...p, clientX: e.clientX, clientY: e.clientY };
      }
      return p;
    });
    activePointersRef.current = currentPointers;

    // Handle Active Area Selection box update in real time
    if (areaStart) {
      const arenaEl = document.getElementById("vtt-tabletop-arena");
      if (arenaEl) {
        const rect = arenaEl.getBoundingClientRect();
        const currentRelX = e.clientX - rect.left;
        const currentRelY = e.clientY - rect.top;
        setAreaEnd({ x: currentRelX, y: currentRelY });
        
        const dist = Math.hypot(currentRelX - areaStart.x, currentRelY - areaStart.y);
        if (dist > 4) {
          didDragAreaRef.current = true;
        }
      }
      return;
    }

    if (currentPointers.length === 2 && touchStartRef.current) {
      // Execute 2-finger multi-touch Pinch to Zoom & Pan simultaneously without scaling whole webpage
      const [p1, p2] = currentPointers;
      const currentDistance = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const { initialDistance, initialZoom, midX: startMidX, midY: startMidY, initialPan } = touchStartRef.current;
      
      const ratio = currentDistance / initialDistance;
      const computedZoom = Math.min(Math.max(initialZoom * ratio, 0.2), 4.0);

      // Current gesture center/midpoint between fingers
      const currentMidX = (p1.clientX + p2.clientX) / 2;
      const currentMidY = (p1.clientY + p2.clientY) / 2;

      // Adjust Pan offset so the midpoint stays visually consistent under the zoom transition
      const container = canvasRef.current;
      if (container) {
        const CW = container.clientWidth;
        const CH = container.clientHeight;

        const newPanX = currentMidX - CW / 2 - (startMidX - CW / 2 - initialPan.x) * (computedZoom / initialZoom);
        const newPanY = currentMidY - CH / 2 - (startMidY - CH / 2 - initialPan.y) * (computedZoom / initialZoom);

        setZoom(computedZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    } else if (currentPointers.length === 1) {
      const activePointer = currentPointers[0];

      if (draggingTokenIdRef.current) {
        // Execute smooth token dragging
        const targetTokenId = draggingTokenIdRef.current;
        const dx = activePointer.clientX - tokenDragStartMouseRef.current.x;
        const dy = activePointer.clientY - tokenDragStartMouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 4) {
          isTokenMovedRef.current = true;
          cancelTokenTouchHold();
        }

        const worldElement = document.getElementById("vtt-canvas-world");
        if (worldElement && activeMap) {
          // Calculate move delta in world units
          const worldDeltaX = dx / zoom;
          const worldDeltaY = dy / zoom;

          setTokens(prev => prev.map(t => {
            const startPos = dragStartPositionsRef.current[t.id];
            if (startPos) {
              let finalX = startPos.x + worldDeltaX;
              let finalY = startPos.y + worldDeltaY;

              const shouldSnap = t.snapToGrid !== undefined ? t.snapToGrid : snapToGrid;
              if (activeMap.gridEnabled && shouldSnap) {
                const step = activeMap.gridSize;
                finalX = Math.round(finalX / step) * step;
                finalY = Math.round(finalY / step) * step;
              }
              return { ...t, x: finalX, y: finalY };
            }
            return t;
          }));
        }
      } else if (isDragging) {
        // Execute smooth single-finger/mouse canvas map panning
        setPan({
          x: activePointer.clientX - dragStart.x,
          y: activePointer.clientY - dragStart.y,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Release pointer capture
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if already released or invalid
    }
    try {
      if (e.target && (e.target as HTMLElement).releasePointerCapture) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // Ignore
    }

    if (areaStart && areaEnd) {
      const arenaEl = document.getElementById("vtt-tabletop-arena");
      if (arenaEl) {
        const rect = arenaEl.getBoundingClientRect();
        const clientStart = { x: areaStart.x + rect.left, y: areaStart.y + rect.top };
        const clientEnd = { x: areaEnd.x + rect.left, y: areaEnd.y + rect.top };
        
        const left = Math.min(clientStart.x, clientEnd.x);
        const top = Math.min(clientStart.y, clientEnd.y);
        const right = Math.max(clientStart.x, clientEnd.x);
        const bottom = Math.max(clientStart.y, clientEnd.y);
        
        const width = right - left;
        const height = bottom - top;
        
        if (width > 3 && height > 3) {
          const newlySelectedIds: string[] = [];
          const tokenEls = document.querySelectorAll(".vtt-token-element");
          tokenEls.forEach(el => {
            const tokenRect = el.getBoundingClientRect();
            const intersects = !(
              tokenRect.right < left ||
              tokenRect.left > right ||
              tokenRect.bottom < top ||
              tokenRect.top > bottom
            );
            if (intersects) {
              const id = el.getAttribute("data-token-id");
              if (id) {
                newlySelectedIds.push(id);
              }
            }
          });
          
          setSelectedTokenIds(newlySelectedIds);
          
          if (newlySelectedIds.length > 0) {
            setSelectedTokenId(newlySelectedIds[0]);
          } else {
            setSelectedTokenId(null);
          }
        }
      }
      
      setAreaStart(null);
      setAreaEnd(null);
      
      const currentPointers = activePointersRef.current.filter((p) => p.pointerId !== e.pointerId);
      activePointersRef.current = currentPointers;
      touchStartRef.current = null;
      setIsDragging(false);
      return;
    }

    const currentPointers = activePointersRef.current.filter((p) => p.pointerId !== e.pointerId);
    activePointersRef.current = currentPointers;

    if (currentPointers.length < 2) {
      touchStartRef.current = null;
    }

    if (currentPointers.length === 0) {
      setIsDragging(false);
      if (draggingTokenIdRef.current) {
        justFinishedDraggingTokenIdRef.current = draggingTokenIdRef.current;
        setDraggingTokenId(null);
      }
    } else if (currentPointers.length === 1) {
      // Re-initialize dragStart for panning with single remaining pointer if dragging was happening
      if (isDragging) {
        const remaining = currentPointers[0];
        setDragStart({ x: remaining.clientX - pan.x, y: remaining.clientY - pan.y });
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerUp(e);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (editingTokenSettingsId) return; // Forbid zooming when configuring token settings
    const target = e.target as HTMLElement;
    const isDirectOnCanvas = !!(target.closest("#vtt-canvas-world") || target.id === "vtt-tabletop-arena");
    if (!isDirectOnCanvas) return;

    const factor = 1.12;
    let computedZoom = zoom;
    if (e.deltaY < 0) {
      computedZoom = Math.min(zoom * factor, 4.0);
    } else {
      computedZoom = Math.max(zoom / factor, 0.2);
    }
    setZoom(computedZoom);
  };

  // Function to recalibrate camera to fit current map inside the tabletop viewport
  const recalibrateCamera = useCallback(() => {
    setZoom(1.0); // Default to exactly 100% map scale
    setPan({ x: 0, y: 0 });
  }, []);

  const resetCamera = () => {
    recalibrateCamera();
    setNotification("Visualização recalibrada e centralizada!");
  };

  // --- BG3-STYLE PORTABLE POKÉMON COMBAT TACTICAL ENGINE ---
  const prepareCombatForSelectedTokens = (tokenIds: string[]) => {
    const list: Combatant[] = [];
    tokenIds.forEach(id => {
      const tok = resolvedTokens.find(t => t.id === id);
      if (tok) {
        let baseInitiative = 0;
        let dexMod = 0;
        let type: 'treinador' | 'pokemon' = 'pokemon';

        if (tok.trainerId) {
          const trainer = allAvailableTrainerRecords.find(tr => tr.id === tok.trainerId);
          if (trainer) {
            if (tok.pokemonId && trainer.pokemon) {
              const pk = trainer.pokemon.find(p => p.id === tok.pokemonId);
              if (pk) {
                type = 'pokemon';
                baseInitiative = pk.initiative !== undefined ? pk.initiative : 0;
                const des = trainer.attributes?.DES !== undefined ? trainer.attributes.DES : 10;
                dexMod = Math.floor((des - 10) / 2);
              }
            } else {
              type = 'treinador';
              baseInitiative = trainer.initiative !== undefined ? trainer.initiative : 0;
              const des = trainer.attributes?.DES !== undefined ? trainer.attributes.DES : 10;
              dexMod = Math.floor((des - 10) / 2);
            }
          }
        } else {
          type = 'pokemon';
          baseInitiative = 0;
          dexMod = 0;
        }

        list.push({
          id: tok.id,
          tokenId: tok.id,
          name: tok.nickname || tok.name,
          url: tok.url,
          type,
          baseInitiative,
          dexMod,
          tempModifier: 0,
          hasAdvantage: false
        });
      }
    });

    setCombatParticipants(list);
    setShowPreCombatModal(true);
  };

  const rollInitiativeAndStartCombat = (currentParticipants: Combatant[]) => {
    const rolled = currentParticipants.map(c => {
      const baseVal = c.baseInitiative !== 0 ? c.baseInitiative : c.dexMod;
      const rollSingle = () => Math.floor(Math.random() * 20) + 1;
      
      let dieRoll = rollSingle();
      if (c.hasAdvantage) {
        const second = rollSingle();
        dieRoll = Math.max(dieRoll, second);
      }
      
      const total = dieRoll + baseVal + c.tempModifier;
      return {
        ...c,
        initiativeRoll: total
      };
    });

    // Ordenação Decrescente (BG3 / D&D Ruleset)
    rolled.sort((a, b) => {
      const rollA = a.initiativeRoll || 0;
      const rollB = b.initiativeRoll || 0;
      if (rollB !== rollA) {
        return rollB - rollA;
      }
      
      // Tie breaker: higher total modifier
      const modA = (a.baseInitiative !== 0 ? a.baseInitiative : a.dexMod) + a.tempModifier;
      const modB = (b.baseInitiative !== 0 ? b.baseInitiative : b.dexMod) + b.tempModifier;
      if (modB !== modA) {
        return modB - modA;
      }
      
      // Absolute tie: chaotic random
      return Math.random() - 0.5;
    });

    setCombatParticipants(rolled);
    setCurrentCombatTurn(0);
    setCombatRound(1);
    setIsCombatActive(true);
    setShowPreCombatModal(false);
    setIsMultiSelectActive(false);
    setSelectedTokenIds([]);
    setNotification(`Combate iniciado! Turno de ${rolled[0]?.name}`);
  };

  const addTokenToCombat = (tokenId: string) => {
    if (combatParticipants.some(p => p.tokenId === tokenId)) return;
    
    const tok = resolvedTokens.find(t => t.id === tokenId);
    if (!tok) return;

    let baseInitiative = 0;
    let dexMod = 0;
    let type: 'treinador' | 'pokemon' = 'pokemon';

    if (tok.trainerId) {
      const trainer = allAvailableTrainerRecords.find(tr => tr.id === tok.trainerId);
      if (trainer) {
        if (tok.pokemonId && trainer.pokemon) {
          const pk = trainer.pokemon.find(p => p.id === tok.pokemonId);
          if (pk) {
            type = 'pokemon';
            baseInitiative = pk.initiative !== undefined ? pk.initiative : 0;
            const des = trainer.attributes?.DES !== undefined ? trainer.attributes.DES : 10;
            dexMod = Math.floor((des - 10) / 2);
          }
        } else {
          type = 'treinador';
          baseInitiative = trainer.initiative !== undefined ? trainer.initiative : 0;
          const des = trainer.attributes?.DES !== undefined ? trainer.attributes.DES : 10;
          dexMod = Math.floor((des - 10) / 2);
        }
      }
    } else {
      type = 'pokemon';
      baseInitiative = 0;
      dexMod = 0;
    }

    const baseVal = baseInitiative !== 0 ? baseInitiative : dexMod;
    const dieRoll = Math.floor(Math.random() * 20) + 1;
    const total = dieRoll + baseVal;

    const newCombatant: Combatant = {
      id: tok.id,
      tokenId: tok.id,
      name: tok.nickname || tok.name,
      url: tok.url,
      type,
      baseInitiative,
      dexMod,
      tempModifier: 0,
      hasAdvantage: false,
      initiativeRoll: total
    };

    const activeCombatantId = combatParticipants[currentCombatTurn]?.tokenId;
    const updated = [...combatParticipants, newCombatant];
    
    updated.sort((a, b) => {
      const rollA = a.initiativeRoll || 0;
      const rollB = b.initiativeRoll || 0;
      if (rollB !== rollA) {
        return rollB - rollA;
      }
      const modA = (a.baseInitiative !== 0 ? a.baseInitiative : a.dexMod) + a.tempModifier;
      const modB = (b.baseInitiative !== 0 ? b.baseInitiative : b.dexMod) + b.tempModifier;
      if (modB !== modA) {
        return modB - modA;
      }
      return Math.random() - 0.5;
    });

    setCombatParticipants(updated);
    
    if (activeCombatantId) {
      const newIdx = updated.findIndex(p => p.tokenId === activeCombatantId);
      if (newIdx !== -1) {
        setCurrentCombatTurn(newIdx);
      }
    }
    setNotification(`${newCombatant.name} entrou no combate com iniciativa ${total}!`);
  };

  const removeTokenFromCombat = (tokenId: string) => {
    const activeCombatantId = combatParticipants[currentCombatTurn]?.tokenId;
    const isRemovingActive = activeCombatantId === tokenId;

    const updated = combatParticipants.filter(p => p.tokenId !== tokenId);
    if (updated.length === 0) {
      setIsCombatActive(false);
      setCombatParticipants([]);
      setCurrentCombatTurn(0);
      setNotification("Combate finalizado!");
      return;
    }

    setCombatParticipants(updated);

    if (isRemovingActive) {
      if (currentCombatTurn >= updated.length) {
        setCurrentCombatTurn(0);
      }
    } else if (activeCombatantId) {
      const newIdx = updated.findIndex(p => p.tokenId === activeCombatantId);
      if (newIdx !== -1) {
        setCurrentCombatTurn(newIdx);
      } else if (currentCombatTurn >= updated.length) {
        setCurrentCombatTurn(0);
      }
    }
  };

  const nextCombatTurn = () => {
    if (combatParticipants.length === 0) return;
    const nextIdx = (currentCombatTurn + 1) % combatParticipants.length;
    if (nextIdx === 0) {
      setCombatRound(r => r + 1);
    }
    setCurrentCombatTurn(nextIdx);
  };

  const prevCombatTurn = () => {
    if (combatParticipants.length === 0) return;
    const nextIdx = (currentCombatTurn - 1 + combatParticipants.length) % combatParticipants.length;
    if (currentCombatTurn === 0) {
      setCombatRound(r => Math.max(1, r - 1));
    }
    setCurrentCombatTurn(nextIdx);
  };

  const focusCombatantToken = (tokenId: string) => {
    centerTokenCamera(tokenId);
    setCombatHighlightTokenId(tokenId);
    setTimeout(() => {
      setCombatHighlightTokenId(null);
    }, 1500);
  };
  // ----------------------------------------------------------------------

  // Preload and retrieve the natural dimension of the map image automatically on map load
  useEffect(() => {
    if (activeMap) {
      const tempImg = new Image();
      tempImg.src = activeMap.url;
      tempImg.onload = () => {
        setMapImageSize({
          width: tempImg.naturalWidth || 1200,
          height: tempImg.naturalHeight || 800
        });
      };
    }
  }, [activeMapId]);

  // Recalibrate zoom and center whenever map size changes
  useEffect(() => {
    recalibrateCamera();
  }, [mapImageSize, recalibrateCamera]);

  // Automatically keep elements in optimal scale/zoom ratio on screen resize
  useEffect(() => {
    const handleResize = () => {
      recalibrateCamera();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [recalibrateCamera]);

  // Keyboard shortcuts for Combat Tracker Turn Management (N = Próximo, B = Anterior)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCombatActive) return;
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || activeEl.getAttribute("contenteditable") === "true") {
          return;
        }
      }
      if (e.key === "n" || e.key === "N") {
        nextCombatTurn();
      } else if (e.key === "b" || e.key === "B") {
        prevCombatTurn();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCombatActive, combatParticipants, currentCombatTurn]);

  // Add custom map URL or Upload helper
  const addCampaignMap = (name: string, url: string, folderId?: string) => {
    if (!name.trim() || !url.trim()) return;
    const finalMap: MapItem = {
      id: "map-" + Date.now(),
      name: name.trim(),
      url: url.trim(),
      gridEnabled: true,
      gridSize: 50,
      gridColor: "rgba(255, 255, 255, 0.25)",
      gridOpacity: 0.4,
      folderId: folderId || undefined
    };
    setMaps(prev => [...prev, finalMap]);
    setActiveMapId(finalMap.id);
    setNewMapName("");
    setNewMapUrl("");
    setNotification(`Arena "${finalMap.name}" criada.`);
  };

  const createFolder = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newF: MapFolder = {
      id: "folder-" + Date.now(),
      name: trimmed
    };
    setFolders(prev => [...prev, newF]);
    setNewFolderName("");
    setActiveAction(null);
    setNotification(`Pasta "${trimmed}" criada!`);
  };

  const deleteFolder = (folderId: string) => {
    // Un-assign maps from this folder
    setMaps(prev => prev.map(m => m.folderId === folderId ? { ...m, folderId: undefined } : m));
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setNotification("Pasta removida. Os mapas foram mantidos!");
  };

  // --- TRAINER RECORDS & FOLDERS OPERATIONS ---
  // --- MULTIPLAYER OWNERSHIP & PERMISSIONS HELPERS (Foundry style) ---
  const checkCanView = (entity: { ownerId?: string; userId?: string; permissions?: { canView?: string[] } } | null | undefined): boolean => {
    if (!entity) return true;
    if (userRole === "Mestre") return true; // GM can see everything
    if (!entity.ownerId && !entity.userId) return true; // Legacy is public by default
    if (entity.ownerId === user?.uid || entity.userId === user?.uid) return true; // Owner can see
    if (entity.permissions?.canView?.includes(user?.uid || "")) return true; // Explicit visual permission
    return false;
  };

  const checkCanEdit = (entity: { ownerId?: string; userId?: string; permissions?: { canEdit?: string[] } } | null | undefined): boolean => {
    if (!entity) return true;
    if (userRole === "Mestre") return true; // GM can edit everything
    if (!entity.ownerId && !entity.userId) return true; // Legacy is editable
    if (entity.ownerId === user?.uid || entity.userId === user?.uid) return true; // Owner can edit
    if (entity.permissions?.canEdit?.includes(user?.uid || "")) return true; // Explicit edit permission
    return false;
  };

  const startEditingTrainerRecord = (recordId: string) => {
    if (!user) return;
    setTrainerRecords(prev => prev.map(t => {
      if (t.id === recordId) {
        return {
          ...t,
          editingBy: {
            uid: user.uid,
            name: user.displayName || user.email || "Jogador",
            timestamp: Date.now()
          }
        };
      }
      return t;
    }));
  };

  const stopEditingTrainerRecord = (recordId: string) => {
    if (!user) return;
    setTrainerRecords(prev => prev.map(t => {
      if (t.id === recordId && t.editingBy?.uid === user.uid) {
        const { editingBy, ...rest } = t;
        return rest as TrainerRecord;
      }
      return t;
    }));
  };

  const saveEntityPermissions = async (
    type: "trainer" | "folder" | "token" | "map" | "mapFolder",
    id: string,
    ownerId: string | undefined,
    canView: string[],
    canEdit: string[]
  ) => {
    const updatedPermissions = { canView, canEdit };
    const mergedFields: any = { ownerId };
    if (updatedPermissions) {
      mergedFields.permissions = updatedPermissions;
    }

    if (type === "trainer") {
      setTrainerRecords(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, ownerId, permissions: updatedPermissions, updatedAt: new Date().toISOString() };
        }
        return t;
      }));
    } else if (type === "folder") {
      setTrainerFolders(prev => prev.map(f => {
        if (f.id === id) {
          return { ...f, ownerId, permissions: updatedPermissions };
        }
        return f;
      }));
    } else if (type === "token") {
      setTokens(prev => prev.map(t => {
        if (t.id === id) {
          return { ...t, ownerId, permissions: updatedPermissions };
        }
        return t;
      }));
    } else if (type === "map") {
      setMaps(prev => prev.map(m => {
        if (m.id === id) {
          return { ...m, ownerId, permissions: updatedPermissions };
        }
        return m;
      }));
    } else if (type === "mapFolder") {
      setFolders(prev => prev.map(f => {
        if (f.id === id) {
          return { ...f, ownerId, permissions: updatedPermissions };
        }
        return f;
      }));
    }

    try {
      if (roomId) {
        if (type === "trainer") {
          const docRef = doc(db, "rooms", roomId, "trainerRecords", id);
          await setDoc(docRef, mergedFields, { merge: true });
        } else if (type === "token") {
          const docRef = doc(db, "rooms", roomId, "tokens", id);
          await setDoc(docRef, mergedFields, { merge: true });
        }
      }
      if (type === "folder") {
        const docRef = doc(db, "trainerFolders", id);
        await setDoc(docRef, mergedFields, { merge: true });
      } else if (type === "map") {
        const docRef = doc(db, "maps", id);
        await setDoc(docRef, mergedFields, { merge: true });
      } else if (type === "mapFolder") {
        const docRef = doc(db, "mapFolders", id);
        await setDoc(docRef, mergedFields, { merge: true });
      }
      setNotification(`Permissões salvas no servidor multiplayer com sucesso!`);
    } catch (err: any) {
      console.error("Firestore sync permissions error:", err);
      setNotification(`Estado atualizado, mas houve erro ao sincronizar: ${err.message || err}`);
    }
  };

  const isFolderDescendantOf = (ancestorId: string, folderId: string): boolean => {
    let current = trainerFolders.find(f => f.id === folderId);
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = trainerFolders.find(f => f.id === current.parentId);
    }
    return false;
  };

  const createTrainerRecord = (
    name: string, 
    image: string, 
    folderId?: string,
    classe?: string,
    level?: number,
    attributeMethod?: "Standard Array" | "Point Buy",
    attributes?: { FOR: number; DES: number; CON: number; INT: number; SAB: number; CAR: number }
  ) => {
    const finalName = name.trim() || "Novo Treinador";
    const finalImg = image.trim() || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
    const finalLevel = level || 1;
    const finalClass = classe || "Treinador Pokémon";
    
    const finalAttributes = attributes || { FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 };
    const method = attributeMethod || "Standard Array";

    // Initial HP based on CON modifier
    const conMod = Math.floor((finalAttributes.CON - 10) / 2);
    const initialHp = Math.max(10 + conMod, 6);

    const defaultSkills = [
      { id: "acrobacia", name: "Acrobacia", attribute: "DES" as const, isProficient: false },
      { id: "atletismo", name: "Atletismo", attribute: "FOR" as const, isProficient: false },
      { id: "furtividade", name: "Furtividade", attribute: "DES" as const, isProficient: false },
      { id: "intuicao", name: "Intuição", attribute: "SAB" as const, isProficient: false },
      { id: "investigacao", name: "Investigação", attribute: "INT" as const, isProficient: false },
      { id: "natureza", name: "Natureza", attribute: "INT" as const, isProficient: false },
      { id: "percepcao", name: "Percepção", attribute: "SAB" as const, isProficient: false },
      { id: "persuasao", name: "Persuasão", attribute: "CAR" as const, isProficient: false },
      { id: "sobrevivencia", name: "Sobrevivência", attribute: "SAB" as const, isProficient: false },
    ];

    const newRecord: TrainerRecord = {
      id: "trainer-" + Date.now(),
      name: finalName,
      image: finalImg,
      folderId: folderId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: user ? user.uid : undefined,
      userId: user ? user.uid : undefined,
      permissions: { canView: [], canEdit: [] },
      classe: finalClass,
      nival: finalLevel,
      experience: "0",
      age: "15",
      height: "1.65 m",
      weight: "54 kg",
      appearance: "Visual clássico de treinador com gorro e mochila de viagem.",
      history: "Iniciou sua jornada partindo de sua cidade natal com o sonho de se tornar mestre da Liga Pokémon local.",
      attributeMethod: method,
      attributes: finalAttributes,
      skills: defaultSkills,
      hpCurrent: initialHp,
      hpMax: initialHp,
      armorClass: 10 + Math.floor((finalAttributes.DES - 10) / 2),
      initiative: Math.floor((finalAttributes.DES - 10) / 2),
      speed: 9, // 9 metros (30 pés)
      inventory: [
        { id: "item-1", name: "Pokébola", quantity: 5, category: "Pokébola", weight: 0.1, description: "Dispositivo esférico básico para capturar Pokémon selvagens selvagens." },
        { id: "item-2", name: "Super Poção", quantity: 2, category: "Consumível", weight: 0.2, description: "Restaura 50 de HP de um Pokémon ferido." }
      ],
      pokemon: [
        { id: "pk-1", name: "Pikachu", species: "Pikachu", level: 5, hpCurrent: 20, hpMax: 20, image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png", isPc: false, ownerId: user ? user.uid : undefined }
      ],
      feats: [
        { id: "feat-1", name: "Elos de Amizade", description: "Seus Pokémon ganham +1 em testes de resistência quando você os incentiva com uma ação bônus.", origin: "Inicial", effects: "Concede bônus em testes extraordinários." }
      ],
      notes: "Sua meta atual é vencer o primeiro Ginásio da região e registrar novas espécies na Pokédex!"
    };

    setTrainerRecords(prev => [...prev, newRecord]);
    setNotification(`Ficha "${finalName}" criada com sucesso!`);
  };

  const updateTrainerRecord = (id: string, name: string, image: string, folderId?: string) => {
    setTrainerRecords(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          name: name.trim() || t.name,
          image: image.trim() || t.image,
          folderId: folderId || undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    setNotification("Ficha de Treinador atualizada!");
  };

  const deleteTrainerRecord = (id: string) => {
    const target = trainerRecords.find(t => t.id === id);
    if (!target) return;

    // Delete trainer record and clean up associated tokens seamlessly of the deleted trainer
    setTrainerRecords(prev => prev.filter(t => t.id !== id));
    setTokens(prev => prev.filter(tk => tk.trainerId !== id));
    setNotification(`Ficha "${target.name}" e os tokens associados foram excluídos.`);
  };

  const duplicateTrainerRecord = (record: TrainerRecord) => {
    const duplicated: TrainerRecord = {
      ...record,
      id: "trainer-" + Date.now() + "-copy",
      name: `${record.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: user ? user.uid : undefined,
      userId: user ? user.uid : undefined,
      permissions: { canView: [], canEdit: [] }
    };
    setTrainerRecords(prev => [...prev, duplicated]);
    setNotification(`Ficha "${record.name}" duplicada.`);
  };

  const updateActiveTrainerProperty = <K extends keyof TrainerRecord>(key: K, value: TrainerRecord[K]) => {
    if (!activeTrainerRecord) return;
    const isLocked = activeTrainerRecord.editingBy && activeTrainerRecord.editingBy.uid !== user?.uid && (Date.now() - activeTrainerRecord.editingBy.timestamp < 300000);
    if (isLocked) {
      setNotification(`Esta ficha está travada para edição por outro jogador: ${activeTrainerRecord.editingBy?.name}!`);
      return;
    }
    const isOwnerOrGM = !activeTrainerRecord.ownerId || activeTrainerRecord.ownerId === user?.uid || activeTrainerRecord.userId === user?.uid || userRole === "Mestre" || activeTrainerRecord.permissions?.canEdit?.includes(user?.uid || "");
    if (!isOwnerOrGM) {
      setNotification("Você não tem permissão para editar esta ficha de Treinador!");
      return;
    }
    const updated = {
      ...activeTrainerRecord,
      [key]: value,
      updatedAt: new Date().toISOString()
    };
    setActiveTrainerRecord(updated);
    setTrainerRecords(prev => prev.map(t => t.id === activeTrainerRecord.id ? updated : t));
  };

  const createTrainerFolder = (name: string, parentId?: string, color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newFold: TrainerFolder = {
      id: "folder-" + Date.now(),
      name: trimmed,
      parentId: parentId || undefined,
      color: color || "#6366f1",
      createdAt: new Date().toISOString(),
      ownerId: user ? user.uid : undefined,
      permissions: { canView: [], canEdit: [] }
    };
    setTrainerFolders(prev => [...prev, newFold]);
    setNotification(`Pasta "${trimmed}" criada!`);
  };

  const updateTrainerFolder = (id: string, name: string, parentId?: string, color?: string) => {
    setTrainerFolders(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          name: name.trim() || f.name,
          parentId: parentId || undefined,
          color: color || f.color
        };
      }
      return f;
    }));
    setNotification("Pasta atualizada!");
  };

  const deleteTrainerFolder = (folderId: string) => {
    const f = trainerFolders.find(fold => fold.id === folderId);
    if (!f) return;
    const pId = f.parentId;

    setTrainerRecords(prev => prev.map(r => r.folderId === folderId ? { ...r, folderId: pId } : r));
    setTrainerFolders(prev => prev.map(sf => sf.parentId === folderId ? { ...sf, parentId: pId } : sf));
    setTrainerFolders(prev => prev.filter(fold => fold.id !== folderId));
    setNotification(`Pasta "${f.name}" excluída. Conteúdo movido para cima.`);
  };

  const moveTrainerRecord = (recordId: string, folderId: string | undefined) => {
    setTrainerRecords(prev => prev.map(r => r.id === recordId ? { ...r, folderId: folderId, updatedAt: new Date().toISOString() } : r));
    const destName = folderId ? (trainerFolders.find(f => f.id === folderId)?.name || "Pasta") : "Raiz";
    setNotification(`Ficha movida para "${destName}".`);
  };

  const moveTrainerFolder = (folderId: string, parentId: string | undefined) => {
    if (folderId === parentId) return;
    if (parentId && isFolderDescendantOf(folderId, parentId)) {
      setNotification("Aviso: Não é possível mover uma pasta para dentro de si mesma ou de uma subpasta.");
      return;
    }
    setTrainerFolders(prev => prev.map(f => f.id === folderId ? { ...f, parentId: parentId } : f));
    const destName = parentId ? (trainerFolders.find(f => f.id === parentId)?.name || "Pasta") : "Raiz";
    setNotification(`Pasta movida para "${destName}".`);
  };

  const moveMapToFolder = (mapId: string, folderId: string | undefined) => {
    setMaps(prev => prev.map(m => m.id === mapId ? { ...m, folderId: folderId } : m));
    const folderName = folderId ? folders.find(f => f.id === folderId)?.name : "Raiz/Sem Pasta";
    setNotification(`Mapa movido para ${folderName}`);
  };

  const handleMapDragStart = (e: React.DragEvent, mapId: string) => {
    e.stopPropagation();
    setDraggingSidebarMapId(mapId);
    e.dataTransfer.setData("text/plain", mapId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMapDragEnd = () => {
    setDraggingSidebarMapId(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const mapId = e.dataTransfer.getData("text/plain") || draggingSidebarMapId;
    if (mapId) {
      moveMapToFolder(mapId, folderId);
    }
  };

  const handleMapTouchStart = (e: React.TouchEvent, mapId: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchActiveMapId.current = mapId;
    touchDragStarted.current = false;
  };

  const handleMapTouchMove = (e: React.TouchEvent) => {
    if (!touchActiveMapId.current || !touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 8) {
      if (!touchDragStarted.current) {
        touchDragStarted.current = true;
        setDraggingSidebarMapId(touchActiveMapId.current);
      }
    }

    if (touchDragStarted.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const folderEl = element.closest('[data-folder-id]');
        if (folderEl) {
          const fId = folderEl.getAttribute('data-folder-id');
          if (fId) {
            setDragOverFolderId(fId);
          } else {
            setDragOverFolderId(null);
          }
        } else {
          setDragOverFolderId(null);
        }
      }
    }
  };

  const handleMapTouchEnd = () => {
    if (touchActiveMapId.current && touchDragStarted.current) {
      const mapId = touchActiveMapId.current;
      if (dragOverFolderId) {
        const destFolderId = dragOverFolderId === "unassigned" ? undefined : dragOverFolderId;
        moveMapToFolder(mapId, destFolderId);
      }
    }
    touchActiveMapId.current = null;
    touchStartPos.current = null;
    touchDragStarted.current = false;
    setDraggingSidebarMapId(null);
    setDragOverFolderId(null);
  };

  const handleRecordTouchStart = (e: React.TouchEvent, recordId: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchActiveTrainerRecordId.current = recordId;
    touchTrainerDragStarted.current = false;
    setIsDragHoveringSidebar(true);
    setDragCoordinates({ x: touch.clientX, y: touch.clientY });
  };

  const handleRecordTouchMove = (e: React.TouchEvent, record: TrainerRecord) => {
    if (!touchActiveTrainerRecordId.current || !touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 8) {
      if (!touchTrainerDragStarted.current) {
        touchTrainerDragStarted.current = true;
        setDraggingTrainerRecordId(touchActiveTrainerRecordId.current);
        setTouchDraggingRecord(record);
        setIsDragHoveringSidebar(window.innerWidth < 768 ? false : true);
      }
    }

    if (touchTrainerDragStarted.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      setDragCoordinates({ x: clientX, y: clientY });
      setTouchDragPos({ x: clientX, y: clientY });

      const element = document.elementFromPoint(clientX, clientY);
      const isInsideSidebar = !!element?.closest("#vtt-sidebar-popup");
      if (window.innerWidth < 768) {
        setIsDragHoveringSidebar(false);
      } else {
        setIsDragHoveringSidebar(isInsideSidebar);
      }

      if (element) {
        const folderEl = element.closest('[data-folder-id]');
        if (folderEl) {
          const fId = folderEl.getAttribute('data-folder-id');
          setDragOverTrainerFolderId(fId);
        } else {
          setDragOverTrainerFolderId(null);
        }
        
        const rootEl = element.closest('[data-root-drop-area]');
        setDragOverTrainerRoot(!!rootEl);
      }
    }
  };

  const handleRecordTouchEnd = (e: React.TouchEvent) => {
    if (touchActiveTrainerRecordId.current && touchTrainerDragStarted.current) {
      const recordId = touchActiveTrainerRecordId.current;
      const trainer = trainerRecords.find(r => r.id === recordId);
      
      if (trainer) {
        const lastTouch = e.changedTouches[0] || e.touches[0] || { clientX: dragCoordinates?.x || 0, clientY: dragCoordinates?.y || 0 };
        const worldElement = document.getElementById("vtt-canvas-world");
        
        if (worldElement) {
          const rect = worldElement.getBoundingClientRect();
          // Verify if touch coordinates fall inside the VTT canvas bounds
          if (
            lastTouch.clientX >= rect.left &&
            lastTouch.clientX <= rect.right &&
            lastTouch.clientY >= rect.top &&
            lastTouch.clientY <= rect.bottom
          ) {
            const dropX = (lastTouch.clientX - rect.left) / zoom;
            const dropY = (lastTouch.clientY - rect.top) / zoom;

            const sizeMultiplier = 1.5;
            const tokenPixelSize = sizeMultiplier * (activeMap?.gridSize || 70);
            let finalX = dropX - (tokenPixelSize / 2);
            let yLoc = dropY - (tokenPixelSize / 2);

            if (activeMap?.gridEnabled && snapToGrid) {
              const step = activeMap.gridSize;
              finalX = Math.round(finalX / step) * step;
              yLoc = Math.round(yLoc / step) * step;
            }

            const hpMaxVal = trainer.hpMax !== undefined ? trainer.hpMax : 10;
            const hpCurrentVal = trainer.hpCurrent !== undefined ? trainer.hpCurrent : hpMaxVal;

            const newToken: TokenItem = {
              id: "token-trainer-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
              trainerId: trainer.id,
              name: trainer.name,
              url: trainer.image,
              x: finalX,
              y: yLoc,
              size: sizeMultiplier,
              color: "#6366f1",
              hpCurrent: hpCurrentVal,
              hpMax: hpMaxVal,
              tempHp: 0,
              allowTransparency: false,
              auraScale: 0.5,
              auraIntensity: 0.5,
              auraOpacity: 0.5,
              auraAnimationSpeed: 0.5,
              auraParticleCount: 60
            };

            setTokens(prev => [...prev, newToken]);
            setNotification(`Token de "${trainer.name}" adicionado no mapa!`);
          } else {
            // Also check if we dropped on a folder in the sidebar (if sidebar is still open)
            const element = document.elementFromPoint(lastTouch.clientX, lastTouch.clientY);
            if (element) {
              const folderEl = element.closest('[data-folder-id]');
              if (folderEl) {
                const fId = folderEl.getAttribute('data-folder-id');
                if (fId) {
                  const destFolderId = fId === "unassigned" ? undefined : fId;
                  moveTrainerRecord(recordId, destFolderId);
                  setNotification(`Ficha de "${trainer.name}" movida.`);
                }
              } else {
                // If we dropped on the root area
                const rootAreaEl = element.closest('[data-root-drop-area]');
                if (rootAreaEl) {
                  moveTrainerRecord(recordId, undefined);
                  setNotification(`Ficha de "${trainer.name}" movida para a raiz.`);
                }
              }
            }
          }
        }
      }
    }

    touchActiveTrainerRecordId.current = null;
    touchStartPos.current = null;
    touchTrainerDragStarted.current = false;
    setDraggingTrainerRecordId(null);
    setTouchDraggingRecord(null);
    setDragOverTrainerRoot(false);
    setDragOverTrainerFolderId(null);
    setDragCoordinates(null);
  };

  const handlePointerDownRecord = (e: React.PointerEvent<HTMLDivElement>, recordId: string) => {
    // Only handle left click (button 0) or touch/pen pointer actions
    if (e.button !== 0 && e.pointerType === "mouse") return;

    // Prevent propagation so parent folder elements don't capture this pointer down
    e.stopPropagation();

    // Set pressed record state immediately to turn off folders' draggable attributes
    setActivePressedRecordId(recordId);

    // Record the starting coords
    dragStartCoordsRef.current = { x: e.clientX, y: e.clientY };
    dragInitiatedRef.current = false;
    trainerDragWasActiveRef.current = false;

    const targetId = recordId;

    // To prevent any native HTML5 drag and drop system from activating when dragging a record
    const handleDragStartGlobal = (dragEvent: DragEvent) => {
      dragEvent.preventDefault();
      dragEvent.stopPropagation();
    };

    const handlePointerMoveGlobal = (moveEvent: PointerEvent) => {
      if (!dragStartCoordsRef.current) return;
      
      const dx = moveEvent.clientX - dragStartCoordsRef.current.x;
      const dy = moveEvent.clientY - dragStartCoordsRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Smooth threshold of 6 pixels to start dragging
      if (distance > 6 && !dragInitiatedRef.current) {
        dragInitiatedRef.current = true;
        trainerDragWasActiveRef.current = true;
        setDraggingTrainerRecordId(targetId);
        setIsDragHoveringSidebar(window.innerWidth < 768 ? false : true);
      }

      if (dragInitiatedRef.current) {
        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }
        
        const clientX = moveEvent.clientX;
        const clientY = moveEvent.clientY;
        
        setDragCoordinates({ x: clientX, y: clientY });

        // Collapse or expand sidebar based on whether the cursor is hovering inside it
        const sidebarEl = document.getElementById("vtt-sidebar-popup");
        if (sidebarEl) {
          const rect = sidebarEl.getBoundingClientRect();
          const isInside = (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          );
          if (window.innerWidth < 768) {
            setIsDragHoveringSidebar(false);
          } else {
            setIsDragHoveringSidebar(isInside);
          }
        } else {
          setIsDragHoveringSidebar(false);
        }
      }
    };

    const handlePointerUpGlobal = (upEvent: PointerEvent) => {
      const isDragActive = dragInitiatedRef.current;

      window.removeEventListener("pointermove", handlePointerMoveGlobal);
      window.removeEventListener("pointerup", handlePointerUpGlobal);
      window.removeEventListener("dragstart", handleDragStartGlobal, { capture: true });

      dragStartCoordsRef.current = null;
      dragInitiatedRef.current = false;

      // Clean up the drag active flag after a brief timeout to support onClick intercept
      setTimeout(() => {
        trainerDragWasActiveRef.current = false;
      }, 150);

      if (isDragActive) {
        const clientX = upEvent.clientX;
        const clientY = upEvent.clientY;

        const trainer = trainerRecords.find(r => r.id === targetId);
        if (trainer) {
          const worldElement = document.getElementById("vtt-canvas-world");
          if (worldElement) {
            const rect = worldElement.getBoundingClientRect();
            const isOverCanvas = (
              clientX >= rect.left &&
              clientX <= rect.right &&
              clientY >= rect.top &&
              clientY <= rect.bottom
            );

            if (isOverCanvas) {
              const dropX = (clientX - rect.left) / zoom;
              const dropY = (clientY - rect.top) / zoom;

              const sizeMultiplier = 1.5;
              const tokenPixelSize = sizeMultiplier * (activeMap?.gridSize || 70);
              let finalX = dropX - (tokenPixelSize / 2);
              let finalY = dropY - (tokenPixelSize / 2);

              if (activeMap?.gridEnabled && snapToGrid) {
                const step = activeMap.gridSize;
                finalX = Math.round(finalX / step) * step;
                finalY = Math.round(finalY / step) * step;
              }

              const hpMaxVal = trainer.hpMax !== undefined ? trainer.hpMax : 10;
              const hpCurrentVal = trainer.hpCurrent !== undefined ? trainer.hpCurrent : hpMaxVal;

              const newToken: TokenItem = {
                id: "token-trainer-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                trainerId: trainer.id,
                name: trainer.name,
                url: trainer.image,
                x: finalX,
                y: finalY,
                size: sizeMultiplier,
                color: "#6366f1",
                hpCurrent: hpCurrentVal,
                hpMax: hpMaxVal,
                tempHp: 0,
                allowTransparency: false,
                auraScale: 0.5,
                auraIntensity: 0.5,
                auraOpacity: 0.5,
                auraAnimationSpeed: 0.5,
                auraParticleCount: 60
              };

              setTokens(prev => [...prev, newToken]);
              setNotification(`Token de "${trainer.name}" conclamado à arena!`);
            }
          }
        }

        setDraggingTrainerRecordId(null);
        setDragCoordinates(null);
        setIsDragHoveringSidebar(true);
      }

      // Always clear pressed state on pointer release
      setActivePressedRecordId(null);
    };

    window.addEventListener("pointermove", handlePointerMoveGlobal, { passive: false });
    window.addEventListener("pointerup", handlePointerUpGlobal);
    window.addEventListener("dragstart", handleDragStartGlobal, { capture: true });
  };

  const deleteCampaignMap = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = maps.find(m => m.id === id);
    if (!target) return;
    const rest = maps.filter(m => m.id !== id);
    setMaps(rest);
    if (activeMapId === id) {
      setActiveMapId(rest[0]?.id || null);
    }
    setNotification(`Arena "${target.name}" excluída.`);
  };

  const handleImageFileLoad = (file: File, type: "map" | "token") => {
    if (!file.type.startsWith("image/")) {
      setNotification("Formato de arquivo inválido.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultStr = e.target?.result as string;
      if (type === "map") {
        addCampaignMap(file.name.split(".")[0] || "Mapa Carregado", resultStr, selectedFolderIdForCreation || undefined);
      } else {
        const hpVal = newTokenHP || 30;
        const customToken: TokenItem = {
          id: "token-" + Date.now(),
          name: file.name.split(".")[0] || "Ficha",
          url: resultStr,
          x: Math.abs(pan.x) / zoom + 120,
          y: Math.abs(pan.y) / zoom + 120,
          size: newTokenSize,
          color: newTokenColor,
          hpCurrent: hpVal,
          hpMax: hpVal,
          tempHp: 0,
          allowTransparency: true,
          auraScale: 0.5,
          auraIntensity: 0.5,
          auraOpacity: 0.5,
          auraAnimationSpeed: 0.5,
          auraParticleCount: 60
        };
        setTokens(prev => [...prev, customToken]);
        setNotification(`Token "${customToken.name}" adicionado.`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add token directly to active field
  const addCampaignToken = (name: string, url: string, size: number, color: string, hp: number, trainerId?: string) => {
    if (!url.trim()) return;
    const finalName = name.trim() || "Nova Ficha";
    const finalSize = trainerId ? 1.5 : size;
    const finalAllowTransparency = trainerId ? false : true;
    
    const associatedTrainer = trainerId ? trainerRecords.find(t => t.id === trainerId) : undefined;
    const initialOwnerId = associatedTrainer?.ownerId || (user ? user.uid : undefined);
    const initialPermissions = associatedTrainer?.permissions || { canView: [], canEdit: [] };

    const customToken: TokenItem = {
      id: "token-" + Date.now() + (trainerId ? "-" + trainerId : ""),
      trainerId: trainerId,
      name: finalName,
      url: url.trim(),
      x: Math.abs(pan.x) / zoom + 100 + (tokens.length * 30) % 150,
      y: Math.abs(pan.y) / zoom + 100 + (tokens.length * 20) % 150,
      size: finalSize,
      color: color,
      hpCurrent: hp,
      hpMax: hp,
      tempHp: 0,
      allowTransparency: finalAllowTransparency,
      auraScale: 0.5,
      auraIntensity: 0.5,
      auraOpacity: 0.5,
      auraAnimationSpeed: 0.5,
      auraParticleCount: 60,
      ownerId: initialOwnerId,
      permissions: initialPermissions
    };
    setTokens(prev => [...prev, customToken]);
    setNewTokenName("");
    setNewTokenUrl("");
    setNotification(trainerId ? `Token de "${finalName}" conjurado na arena!` : `Token "${finalName}" adicionado na arena!`);
  };

  // Handle Drag & Drop to overall page/canvas
  const handleCanvasDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggingTrainerRecordId) {
      setDragOverCanvasType(null);
      return;
    }
    const isFileDrag = e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes("Files");
    if (!isFileDrag) {
      return;
    }
    if (!activeMapId) {
      setDragOverCanvasType("map");
    } else {
      setDragOverCanvasType("token");
    }
  };

  const handleCanvasDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverCanvasType(null);

    // 1. Check if we dropped a trainer record card
    const textData = e.dataTransfer.getData("text/plain");
    const targetTrainerId = textData && textData.startsWith("record:") 
      ? textData.split("record:")[1] 
      : draggingTrainerRecordId;

    if (targetTrainerId) {
      const trainer = trainerRecords.find(r => r.id === targetTrainerId);
      if (trainer) {
        const worldElement = document.getElementById("vtt-canvas-world");
        let dropX = 100;
        let dropY = 100;
        if (worldElement) {
          const rect = worldElement.getBoundingClientRect();
          dropX = (e.clientX - rect.left) / zoom;
          dropY = (e.clientY - rect.top) / zoom;
        }

        const sizeMultiplier = 1.5;
        const tokenPixelSize = sizeMultiplier * (activeMap?.gridSize || 70);
        let finalX = dropX - (tokenPixelSize / 2);
        let finalY = dropY - (tokenPixelSize / 2);

        if (activeMap?.gridEnabled && snapToGrid) {
          const step = activeMap.gridSize;
          finalX = Math.round(finalX / step) * step;
          finalY = Math.round(finalY / step) * step;
        }

        const hpMaxVal = trainer.hpMax !== undefined ? trainer.hpMax : 10;
        const hpCurrentVal = trainer.hpCurrent !== undefined ? trainer.hpCurrent : hpMaxVal;

        const newToken: TokenItem = {
          id: "token-trainer-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          trainerId: trainer.id,
          name: trainer.name,
          url: trainer.image,
          x: finalX,
          y: finalY,
          size: sizeMultiplier,
          color: "#6366f1",
          hpCurrent: hpCurrentVal,
          hpMax: hpMaxVal,
          tempHp: 0,
          allowTransparency: false,
          auraScale: 0.5,
          auraIntensity: 0.5,
          auraOpacity: 0.5,
          auraAnimationSpeed: 0.5,
          auraParticleCount: 60
        };

        setTokens(prev => [...prev, newToken]);
        setNotification(`Token de "${trainer.name}" adicionado no mapa!`);
        return;
      }
    }

    // 2. Standard files drop
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!activeMapId) {
        handleImageFileLoad(file, "map");
      } else {
        handleImageFileLoad(file, "token");
      }
    }
  };

  const handlePopoverDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPopoverDragActive(true);
  };

  const handlePopoverDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPopoverDragActive(false);
  };

  const handlePopoverDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPopoverDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleImageFileLoad(file, "map");
      setNotification(`Arena "${file.name.split(".")[0]}" adicionada ao catálogo via arraste!`);
    }
  };

  const updateLinkedTrainerRecord = (trainerId: string, updates: Partial<TrainerRecord>) => {
    // 1. Update personal templates list
    setTrainerRecords(prev => prev.map(tr => {
      if (tr.id === trainerId) {
        return {
          ...tr,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return tr;
    }));

    // 2. Update active room sheets list
    setRoomTrainerRecords(prev => prev.map(tr => {
      if (tr.id === trainerId) {
        return {
          ...tr,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return tr;
    }));

    // 3. Directly push change to Firestore room subcollection if in a room
    if (roomId) {
      const existingRecord = allAvailableTrainerRecords.find(r => r.id === trainerId);
      if (existingRecord) {
        const merged = { ...existingRecord, ...updates, updatedAt: new Date().toISOString() };
        setDoc(doc(db, "rooms", roomId, "trainerRecords", trainerId), merged, { merge: true }).catch(err => {
          console.error("Direct sheet change to room error:", err);
        });
      }
    }
  };

  const updatePokemonCombatConditionsAndStages = (
    tokenId: string,
    stages?: Partial<{
      attack: number;
      specialAttack: number;
      defense: number;
      specialDefense: number;
      speed: number;
      accuracy: number;
      evasion: number;
      criticalRange: number;
    }>,
    conditions?: Partial<{
      nonVolatile?: string | null;
      volatile?: string[];
    }>
  ) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token || !token.trainerId || !token.pokemonId) return;

    const trainerId = token.trainerId;
    const pokemonId = token.pokemonId;

    const updatePokemonObj = (pk: any) => {
      const currentStages = pk.statusStages || {
        attack: 0,
        specialAttack: 0,
        defense: 0,
        specialDefense: 0,
        speed: 0,
        accuracy: 0,
        evasion: 0,
        criticalRange: 0
      };
      const currentConditions = pk.statusConditions || {
        nonVolatile: undefined,
        volatile: []
      };

      const baseStages = stages ? { ...currentStages, ...stages } : currentStages;
      
      const boundedStages = {
        attack: Math.max(-6, Math.min(6, baseStages.attack ?? 0)),
        specialAttack: Math.max(-6, Math.min(6, baseStages.specialAttack ?? 0)),
        defense: Math.max(-6, Math.min(6, baseStages.defense ?? 0)),
        specialDefense: Math.max(-6, Math.min(6, baseStages.specialDefense ?? 0)),
        speed: Math.max(-6, Math.min(6, baseStages.speed ?? 0)),
        accuracy: Math.max(-6, Math.min(6, baseStages.accuracy ?? 0)),
        evasion: Math.max(-6, Math.min(6, baseStages.evasion ?? 0)),
        criticalRange: Math.max(-6, Math.min(6, baseStages.criticalRange ?? 0))
      };

      let nextConditions = { ...currentConditions };
      if (conditions) {
        if ('nonVolatile' in conditions) {
          nextConditions.nonVolatile = conditions.nonVolatile === null ? undefined : conditions.nonVolatile;
        }
        if ('volatile' in conditions) {
          nextConditions.volatile = conditions.volatile;
        }
      }

      return {
        ...pk,
        statusStages: boundedStages,
        statusConditions: nextConditions
      };
    };

    setTrainerRecords(prevRecords => prevRecords.map(tr => {
      if (tr.id === trainerId && tr.pokemon) {
        const updatedPokemon = tr.pokemon.map(pk => {
          if (pk.id === pokemonId) {
            return updatePokemonObj(pk);
          }
          return pk;
        });

        const updatedTrainer = {
          ...tr,
          pokemon: updatedPokemon,
          updatedAt: new Date().toISOString()
        };

        if (activeTrainerRecord && activeTrainerRecord.id === trainerId) {
          setActiveTrainerRecord(updatedTrainer);
        }

        return updatedTrainer;
      }
      return tr;
    }));

    // Force refresh tokens state
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, _lastUpdate: Date.now() } : t));
  };

  // Direct token manipulation functions
  const updateTokenHP = (id: string, newHP: number) => {
    setTokens(prev => prev.map(t => {
      if (t.id === id) {
        let max = Number(t.hpMax) || 100;
        let current = Number(t.hpCurrent ?? max);

        // Resolve against linked trainer/pokemon records if exists
        if (t.trainerId) {
          const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
          if (tr) {
            if (t.pokemonId) {
              const pk = tr.pokemon?.find(p => p.id === t.pokemonId);
              if (pk) {
                max = pk.hpMax !== undefined ? pk.hpMax : (t.hpMax !== undefined ? t.hpMax : 20);
                current = pk.hpCurrent !== undefined ? pk.hpCurrent : (t.hpCurrent !== undefined ? t.hpCurrent : max);
              }
            } else {
              max = tr.hpMax !== undefined ? tr.hpMax : (t.hpMax !== undefined ? t.hpMax : 10);
              current = tr.hpCurrent !== undefined ? tr.hpCurrent : (t.hpCurrent !== undefined ? t.hpCurrent : max);
            }
          }
        }

        const safeHP = Math.max(0, Math.min(max, newHP));
        
        console.log("HP antes:", current);
        console.log("Operação: set");
        console.log("Valor informado:", newHP);
        console.log("Resultado calculado:", safeHP);
        console.log("Resultado salvo:", safeHP);
        
        if (t.trainerId && t.pokemonId) {
          // 1. Update personal library
          setTrainerRecords(prevRecords => prevRecords.map(tr => {
            if (tr.id === t.trainerId && tr.pokemon) {
              const updatedPokemon = tr.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, hpCurrent: safeHP };
                }
                return pk;
              });
              return { ...tr, pokemon: updatedPokemon };
            }
            return tr;
          }));

          // 2. Update active room sheets pool
          setRoomTrainerRecords(prevRecords => prevRecords.map(tr => {
            if (tr.id === t.trainerId && tr.pokemon) {
              const updatedPokemon = tr.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, hpCurrent: safeHP };
                }
                return pk;
              });
              return { ...tr, pokemon: updatedPokemon };
            }
            return tr;
          }));

          // 3. Write directly to Firestore room subcollection if inside a room
          if (roomId) {
            const existingRecord = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
            if (existingRecord && existingRecord.pokemon) {
              const updatedPokemon = existingRecord.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, hpCurrent: safeHP };
                }
                return pk;
              });
              const merged = { ...existingRecord, pokemon: updatedPokemon, updatedAt: new Date().toISOString() };
              setDoc(doc(db, "rooms", roomId, "trainerRecords", t.trainerId), merged, { merge: true }).catch(err => {
                console.error("Direct Pokémon sheet change to room error:", err);
              });
            }
          }
        } else if (t.trainerId) {
          updateLinkedTrainerRecord(t.trainerId, { hpCurrent: safeHP });
        }
        
        return { ...t, hpCurrent: safeHP };
      }
      return t;
    }));
  };

  const applyTokenHPDelta = (id: string, delta: number) => {
    setTokens(prev => prev.map(t => {
      if (t.id === id) {
        let max = Number(t.hpMax) || 100;
        let current = Number(t.hpCurrent ?? max);
        const temp = Number(t.tempHp || 0);

        // Resolve against linked trainer/pokemon records if exists
        if (t.trainerId) {
          const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
          if (tr) {
            if (t.pokemonId) {
              const pk = tr.pokemon?.find(p => p.id === t.pokemonId);
              if (pk) {
                max = pk.hpMax !== undefined ? pk.hpMax : (t.hpMax !== undefined ? t.hpMax : 20);
                current = pk.hpCurrent !== undefined ? pk.hpCurrent : (t.hpCurrent !== undefined ? t.hpCurrent : max);
              }
            } else {
              max = tr.hpMax !== undefined ? tr.hpMax : (t.hpMax !== undefined ? t.hpMax : 10);
              current = tr.hpCurrent !== undefined ? tr.hpCurrent : (t.hpCurrent !== undefined ? t.hpCurrent : max);
            }
          }
        }
        
        let newHP = current;
        let newTemp = temp;

        if (delta > 0) {
          // Healing/Shield: adds to current HP. Any excess above max HP goes into tempHp (extra life).
          const potentialHP = current + delta;
          if (potentialHP > max) {
            newHP = max;
            const excess = potentialHP - max;
            newTemp = temp + excess;
          } else {
            newHP = potentialHP;
          }
        } else if (delta < 0) {
          // Damage: absorbs with tempHp first, and then subtracts from current HP
          let dmg = Math.abs(delta);
          
          if (newTemp > 0) {
            if (dmg >= newTemp) {
              dmg -= newTemp;
              newTemp = 0;
            } else {
              newTemp -= dmg;
              dmg = 0;
            }
          }
          
          if (dmg > 0) {
            newHP = Math.max(0, newHP - dmg);
          }
        }

        console.log("HP antes:", current + (temp > 0 ? " +" + temp : ""));
        console.log("Operação:", delta > 0 ? "+" : "-");
        console.log("Valor informado:", Math.abs(delta));
        console.log("Resultado calculado:", newHP + (newTemp > 0 ? " +" + newTemp : ""));
        console.log("Resultado salvo:", `${newHP}/${max}${newTemp > 0 ? " (+" + newTemp + " extra)" : ""}`);

        if (t.trainerId && t.pokemonId) {
          // 1. Update personal library
          setTrainerRecords(prevRecords => prevRecords.map(tr => {
            if (tr.id === t.trainerId && tr.pokemon) {
              const updatedPokemon = tr.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, hpCurrent: newHP };
                }
                return pk;
              });
              return { ...tr, pokemon: updatedPokemon };
            }
            return tr;
          }));

          // 2. Update active room sheets pool
          setRoomTrainerRecords(prevRecords => prevRecords.map(tr => {
            if (tr.id === t.trainerId && tr.pokemon) {
              const updatedPokemon = tr.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, hpCurrent: newHP };
                }
                return pk;
              });
              return { ...tr, pokemon: updatedPokemon };
            }
            return tr;
          }));

          // 3. Write directly to Firestore room subcollection if in a room
          if (roomId) {
            const existingRecord = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
            if (existingRecord && existingRecord.pokemon) {
              const updatedPokemon = existingRecord.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, hpCurrent: newHP };
                }
                return pk;
              });
              const merged = { ...existingRecord, pokemon: updatedPokemon, updatedAt: new Date().toISOString() };
              setDoc(doc(db, "rooms", roomId, "trainerRecords", t.trainerId), merged, { merge: true }).catch(err => {
                console.error("Direct Pokémon delta sheet change to room error:", err);
              });
            }
          }
        } else if (t.trainerId) {
          updateLinkedTrainerRecord(t.trainerId, { hpCurrent: newHP });
        }

        return { ...t, hpCurrent: newHP, tempHp: newTemp };
      }
      return t;
    }));
  };

  const handleHealthInputCommit = () => {
    if (!selectedTokenId || !selectedToken) return;
    
    const trimmed = healthInputText.trim();
    if (!trimmed) {
      setHealthInputText(String(selectedToken.hpCurrent ?? 0));
      return;
    }

    // Accept only: +N, -N, or N
    const isAddition = /^\+\d+$/.test(trimmed);
    const isSubtraction = /^-\d+$/.test(trimmed);
    const isDirect = /^\d+$/.test(trimmed);

    if (isAddition) {
      const val = parseInt(trimmed.substring(1), 10);
      if (!isNaN(val)) {
        applyTokenHPDelta(selectedTokenId, val);
      } else {
        setHealthInputText(String(selectedToken.hpCurrent ?? 0));
      }
    } else if (isSubtraction) {
      const val = parseInt(trimmed.substring(1), 10);
      if (!isNaN(val)) {
        applyTokenHPDelta(selectedTokenId, -val);
      } else {
        setHealthInputText(String(selectedToken.hpCurrent ?? 0));
      }
    } else if (isDirect) {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val)) {
        updateTokenHP(selectedTokenId, val);
      } else {
        setHealthInputText(String(selectedToken.hpCurrent ?? 0));
      }
    } else {
      // Not a valid input format, reset matching current HP
      setHealthInputText(String(selectedToken.hpCurrent ?? 0));
    }
  };

  const triggerVttEffect = (x: number, y: number, type: 'summon' | 'recall', imageUrl?: string, size: number = 1.0) => {
    const id = "effect-" + Date.now() + "-" + Math.random();
    setVttEffects(prev => [...prev, { id, x, y, type, imageUrl, size }]);
    setTimeout(() => {
      setVttEffects(prev => prev.filter(e => e.id !== id));
    }, 750);
  };

  const locateTokenOnMap = (token: TokenItem) => {
    if (!canvasRef.current || !activeMap) return;
    const gridSize = activeMap.gridSize || 50;
    const sizePx = gridSize * token.size;
    const tokenCenterX = token.x + sizePx / 2;
    const tokenCenterY = token.y + sizePx / 2;
    
    // Zoom in slightly if too zoomed out
    const targetZoom = Math.max(1.3, zoom);
    setZoom(targetZoom);
    setPan({
      x: - (tokenCenterX - mapImageSize.width / 2) * targetZoom,
      y: - (tokenCenterY - mapImageSize.height / 2) * targetZoom
    });
    setSelectedTokenId(token.id);
    setNotification(`Focado em: ${token.name}!`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPokeballPokemon(null);
        setSelectedPokeballTrainerId(null);
        setActivePokeballTrainerId(null);
        setIsPokeballSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const updateTokenSize = (id: string, newSize: number) => {
    setTokens(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, size: newSize };
      }
      return t;
    }));
  };

  const updateTokenColor = (id: string, newColor: string) => {
    setTokens(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, color: newColor };
      }
      return t;
    }));
  };

  const updateTokenName = (id: string, name: string) => {
    setTokens(prev => prev.map(t => {
      if (t.id === id) {
        if (t.trainerId && t.pokemonId) {
          setTrainerRecords(prevRecords => prevRecords.map(tr => {
            if (tr.id === t.trainerId && tr.pokemon) {
              const updatedPokemon = tr.pokemon.map(pk => {
                if (pk.id === t.pokemonId) {
                  return { ...pk, name };
                }
                return pk;
              });
              return { ...tr, pokemon: updatedPokemon };
            }
            return tr;
          }));
        } else if (t.trainerId) {
          updateLinkedTrainerRecord(t.trainerId, { name });
        }
        return { ...t, name };
      }
      return t;
    }));
  };

  const updateTokenProperty = <K extends keyof TokenItem>(id: string, key: K, value: TokenItem[K]) => {
    setTokens(prev => prev.map(t => {
      if (t.id === id) {
        if (t.trainerId && t.pokemonId) {
          if (key === "name") {
            setTrainerRecords(prevRecords => prevRecords.map(tr => {
              if (tr.id === t.trainerId && tr.pokemon) {
                const updatedPokemon = tr.pokemon.map(pk => {
                  if (pk.id === t.pokemonId) {
                    return { ...pk, name: value as string };
                  }
                  return pk;
                });
                return { ...tr, pokemon: updatedPokemon };
              }
              return tr;
            }));
          } else if (key === "url") {
            setTrainerRecords(prevRecords => prevRecords.map(tr => {
              if (tr.id === t.trainerId && tr.pokemon) {
                const updatedPokemon = tr.pokemon.map(pk => {
                  if (pk.id === t.pokemonId) {
                    return { ...pk, image: value as string };
                  }
                  return pk;
                });
                return { ...tr, pokemon: updatedPokemon };
              }
              return tr;
            }));
          } else if (key === "hpCurrent" || key === "hpMax") {
            setTrainerRecords(prevRecords => prevRecords.map(tr => {
              if (tr.id === t.trainerId && tr.pokemon) {
                const updatedPokemon = tr.pokemon.map(pk => {
                  if (pk.id === t.pokemonId) {
                    return { ...pk, [key]: value as number };
                  }
                  return pk;
                });
                return { ...tr, pokemon: updatedPokemon };
              }
              return tr;
            }));
          }
        } else if (t.trainerId) {
          if (key === "name") {
            updateLinkedTrainerRecord(t.trainerId, { name: value as string });
          } else if (key === "url") {
            updateLinkedTrainerRecord(t.trainerId, { image: value as string });
          } else if (key === "hpCurrent") {
            updateLinkedTrainerRecord(t.trainerId, { hpCurrent: value as number });
          } else if (key === "hpMax") {
            updateLinkedTrainerRecord(t.trainerId, { hpMax: value as number });
          }
        }
        return { ...t, [key]: value };
      }
      return t;
    }));
  };

  const deleteToken = (id: string) => {
    setTokens(prev => prev.filter(t => t.id !== id));
    if (selectedTokenId === id) setSelectedTokenId(null);
    setSelectedTokenIds(prev => prev.filter(item => item !== id));
  };

  const handleTokenPointerDown = (e: React.PointerEvent, t: TokenItem) => {
    if (!checkCanEdit(t)) {
      setNotification(`Você não tem permissão de proprietário para mover o token "${t.name}"!`);
      e.stopPropagation();
      return;
    }
    if (panAnimationRef.current) {
      cancelAnimationFrame(panAnimationRef.current);
      panAnimationRef.current = null;
    }
    
    // Safely set pointer capture on the token itself.
    // This directs subsequent move/up events to target the token, ensuring the browser correctly
    // fires the 'click' event on the token element rather than the map parent. Works beautifully on any platform.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }

    setDraggingTokenId(t.id);
    tokenDragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    isTokenMovedRef.current = false;

    const worldElement = document.getElementById("vtt-canvas-world");
    if (worldElement) {
      const rect = worldElement.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / zoom;
      const relativeY = (e.clientY - rect.top) / zoom;

      setTokenDragOffset({
        x: relativeX - t.x,
        y: relativeY - t.y
      });

      // Save start positions for multiple token dragging
      const currentSelectedIds = selectedTokenIds.includes(t.id) ? selectedTokenIds : [t.id];
      const startPositions: { [id: string]: { x: number, y: number } } = {};
      currentSelectedIds.forEach(id => {
        const tok = resolvedTokens.find(token => token.id === id);
        if (tok) {
          startPositions[id] = { x: tok.x, y: tok.y };
        }
      });
      dragStartPositionsRef.current = startPositions;
    }
  };

  const startTokenTouchHold = (e: React.PointerEvent, t: TokenItem) => {
    if (e.button === 2) return;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    setHoldingTokenId(t.id);
    setHoldingProgress(0);

    const maxHoldTime = 450; 
    const step = 20;
    let elapsed = 0;

    holdIntervalRef.current = setInterval(() => {
      elapsed += step;
      const pct = Math.min(100, (elapsed / maxHoldTime) * 100);
      setHoldingProgress(pct);
      if (pct >= 100) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
      }
    }, step);

    holdTimerRef.current = setTimeout(() => {
      setSelectedTokenId(t.id);
      setSelectedTokenIds([t.id]);
      
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(45);
        } catch (err) {
          // ignore
        }
      }

      // Trigger a beautiful summon aura VTT animation effect
      const currentMapObj = maps.find(m => m.id === activeMapId);
      const zoomGrid = currentMapObj?.gridSize || 70;
      const sizePx = zoomGrid * t.size;
      const cX = t.x + sizePx / 2;
      const cY = t.y + sizePx / 2;
      triggerVttEffect(cX, cY, 'summon', undefined, 1.15);

      setNotification(`⚡ Segurado: ${t.name} focado por Toque Longo!`);

      setHoldingTokenId(null);
      setHoldingProgress(0);
    }, maxHoldTime);
  };

  const cancelTokenTouchHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldingTokenId(null);
    setHoldingProgress(0);
  };

  // Grid adjustment helpers
  const updateGridProperty = (prop: keyof MapItem, value: any) => {
    if (!activeMapId) return;

    setMaps(prev => prev.map(m => {
      if (m.id === activeMapId) {
        return { ...m, [prop]: value };
      }
      return m;
    }));
  };

  const handleEmptyPokeballSliceClick = (trainer: TrainerRecord) => {
    setActiveTrainerRecord(trainer);
    setTrainerActiveTab("equipe");
    setIsViewTrainerModalOpen(true);
    setActivePokeballTrainerId(null);
    setIsPokeballSettingsOpen(false);
    setNotification("Adicione um Pokémon ao time na aba Equipe!");
  };

  const handleFilledPokeballSliceClick = (pk: any, trainer: TrainerRecord) => {
    const isMaskedForView = pokeballViewMode === "public" && !pk.revealed;
    if (isMaskedForView) {
      setNotification("Esse Pokémon está oculto pelo mestre.");
      return;
    }

    // Prevent duplicate Pokémon on the canvas/map
    const isAlreadyOnBoard = tokens.some(tok => tok.pokemonId === pk.id && (!substitutingTokenId || tok.id !== substitutingTokenId));
    if (isAlreadyOnBoard) {
      setNotification(`Erro: "${pk.name}" já está no mapa! Não é permitido ter duplicatas.`);
      return;
    }

    if (substitutingTokenId) {
      const oldToken = tokens.find(tok => tok.id === substitutingTokenId);
      if (oldToken) {
        // Calculate the central position for the VTT effect
        const tokenPixelSize = (activeMap?.gridSize || 70) * oldToken.size;
        const effectCenterX = oldToken.x + tokenPixelSize / 2;
        const effectCenterY = oldToken.y + tokenPixelSize / 2;

        // Perform sequential animation
        // 1. Recall current Pokémon
        triggerVttEffect(effectCenterX, effectCenterY, 'recall', oldToken.url, oldToken.size);

        // 2. Summon the new Pokémon after 350ms
        setTimeout(() => {
          triggerVttEffect(effectCenterX, effectCenterY, 'summon', pk.image, oldToken.size);

          setTokens(prev => prev.map(tok => {
            if (tok.id === oldToken.id) {
              return {
                ...tok,
                pokemonId: pk.id,
                name: pk.name,
                url: pk.image || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png",
                hpCurrent: pk.hpCurrent !== undefined ? pk.hpCurrent : pk.hpMax,
                hpMax: pk.hpMax || 100,
                tempHp: 0,
                mirrored: false
              };
            }
            return tok;
          }));

          setNotification(`Substituiu ${oldToken.name} por ${pk.name}!`);
        }, 350);
      }

      setActivePokeballTrainerId(null);
      setSubstitutingTokenId(null);
      setIsPokeballSettingsOpen(false);
      setIsCombatInspectorOpen(false);
      return;
    }

    setSelectedPokeballPokemon(pk);
    setSelectedPokeballTrainerId(trainer.id);
    setActivePokeballTrainerId(null);
    setIsPokeballSettingsOpen(false);
    setSelectedTokenId(null);
    setTrainerContextMenu(null);
    setNotification(`Selecione um local no mapa para conjurar ${pk.name}!`);
  };

  useEffect(() => {
    if (activePokeballTrainerId && backdropRef.current) {
      const timer = setTimeout(() => {
        backdropRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activePokeballTrainerId]);

  return (
    <div 
      id="vtt-root" 
      className="vtt-console-shell relative flex h-screen w-screen overflow-hidden bg-[#07080a] select-none font-sans text-neutral-200"
    >
      {/* Console-RPG persistent campaign HUD */}
      <header id="vtt-console-hud" className={`fixed top-2 left-2 right-2 md:top-3 md:left-4 md:right-4 z-30 pointer-events-none transition-all duration-300 ${hideAllUI ? "opacity-0 -translate-y-20 pointer-events-none" : "opacity-100"}`}>
        <div className="mx-auto max-w-[1240px] rounded-xl border border-white/5 bg-[#080911]/60 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="relative flex items-center justify-between gap-3 px-3 py-1.5 md:py-2 pointer-events-auto min-h-[40px] md:min-h-[44px]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            
            {/* VTT Title and Active Arena (same line) */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative h-7 w-7 shrink-0 rounded-lg border border-amber-500/40 bg-gradient-to-br from-neutral-900 to-amber-950/40 shadow-md flex items-center justify-center">
                <svg className="h-4 w-4 text-amber-400 animate-[spin_10s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Outer glow aura / ring representing the golden wheel around Arceus' torso */}
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
                  {/* The 4 golden spikes of the cosmic wheel */}
                  <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12" stroke="currentColor" strokeWidth="2" />
                  {/* The gems at the base of the spokes */}
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                  <circle cx="12" cy="19" r="1" fill="currentColor" />
                  <circle cx="5" cy="12" r="1" fill="currentColor" />
                  <circle cx="19" cy="12" r="1" fill="currentColor" />
                  
                  {/* Subtle diagonal alignment markers for a complete cosmic compass look */}
                  <circle cx="7.76" cy="7.76" r="0.75" fill="currentColor" opacity="0.6" />
                  <circle cx="16.24" cy="16.24" r="0.75" fill="currentColor" opacity="0.6" />
                  <circle cx="7.76" cy="16.24" r="0.75" fill="currentColor" opacity="0.6" />
                  <circle cx="16.24" cy="7.76" r="0.75" fill="currentColor" opacity="0.6" />
                </svg>
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#080911] bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
                <h1 className="truncate text-xs md:text-sm font-black uppercase tracking-[0.18em] text-white">PokeVTT5e</h1>
                {activeMap && (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300">
                    <span className="text-neutral-600 font-bold">•</span>
                    <span className="truncate max-w-[120px] lg:max-w-xs lowercase tracking-wide font-mono">arena: {activeMap.name}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Compact Quick Indicators as clickable pill badges */}
            <div className="hidden sm:flex items-center gap-1.5 md:gap-2">
              <button
                onClick={() => setActiveTab(activeTab === "maps" ? null : "maps")}
                className={`py-1 px-2.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "maps"
                    ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                    : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
                }`}
                title="Catálogo de Arenas"
              >
                <MapIcon className="h-3 w-3 text-indigo-400" />
                <span>{maps.length} <span className="opacity-60 text-[8px] font-medium hidden md:inline ml-0.5">Arenas</span></span>
              </button>
              
              <button
                onClick={() => setActiveTab(activeTab === "tokens" ? null : "tokens")}
                className={`py-1 px-2.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "tokens"
                    ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-200"
                    : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
                }`}
                title="Portal de Tokens"
              >
                <Users className="h-3 w-3 text-sky-400" />
                <span>{trainerRecords.length} <span className="opacity-60 text-[8px] font-medium hidden md:inline ml-0.5">Fichas</span></span>
              </button>

              <div
                className="py-1 px-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-neutral-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5"
                title="Tokens Iniciados em Campo"
              >
                <Swords className="h-3 w-3 text-rose-400" />
                <span>{resolvedTokens.length} <span className="opacity-60 text-[8px] font-medium hidden md:inline ml-0.5">Tokens</span></span>
              </div>

              <button
                onClick={resetCamera}
                className="py-1 px-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 text-[10px] font-bold tracking-wider uppercase transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                title="Centralizar Arena"
              >
                <Target className="h-3 w-3 text-emerald-400 animate-pulse" />
                <span>{Math.round(zoom * 100)}%</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {/* Google Cloud/Firebase auth node */}
              <button
                onClick={handleCloudAuth}
                className={`group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2 md:px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all active:scale-95 cursor-pointer ${
                  user
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                }`}
                title={user ? `Conta Nuvem activa: ${user.displayName || user.email}` : "Conectar Nuvem de Dados"}
              >
                <Cloud className={`h-3.5 w-3.5 ${user ? "animate-pulse" : ""}`} />
                <span>{user ? "Nuvem ON" : "Nuvem OFF"}</span>
              </button>

              {/* Mesa Online (Multiplayer) Dropdown */}
              <div className="relative shrink-0 flex items-center">
                <button
                  onClick={() => {
                    if (roomId) {
                      setRoomPopOpen(!roomPopOpen);
                    } else {
                      setIsWelcomeModalOpen(true);
                    }
                  }}
                  className={`group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2 md:px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all active:scale-95 cursor-pointer ${
                    roomId
                      ? "border-emerald-300/45 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                      : "border-white/10 bg-white/[0.02] text-neutral-300 hover:bg-white/[0.06]"
                  }`}
                  title="Painel de Mesa Multiplayer Online"
                >
                  <Users className={`h-3.5 w-3.5 ${roomId ? "animate-[pulse_1.5s_infinite]" : ""}`} />
                  <span>{roomId ? roomId.replace("PKV-", "") : "Online"}</span>
                </button>

                {roomPopOpen && (
                  <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-white/10 bg-[#0c0d19]/95 backdrop-blur-2xl p-4 shadow-2xl text-left pointer-events-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-white">Mesa Multiplayer</span>
                      </div>
                      <button 
                        onClick={() => setRoomPopOpen(false)}
                        className="text-neutral-400 hover:text-white rounded-lg p-0.5 hover:bg-white/5 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {roomId ? (
                      <div className="flex flex-col gap-3 text-xs">
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Mesa Conectada</span>
                          <span className="text-lg font-mono font-black text-white px-1 tracking-widest block py-1">{roomId}</span>
                          <button
                            onClick={() => {
                              const shareUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mesa=${roomId}`;
                              navigator.clipboard?.writeText(shareUrl);
                              setNotification("Link da Mesa copiado! Cole para outros jogadores.");
                            }}
                            className="inline-flex items-center justify-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider mt-1 border border-indigo-500/20 rounded px-2 py-0.5 bg-indigo-500/5 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" /> Copiar Link
                          </button>
                        </div>

                        <div className="space-y-1 py-1 border-t border-white/5">
                          <div className="flex justify-between text-neutral-400">
                            <span>Mestre (DM):</span>
                            <span className="font-semibold text-white">{roomDmName || "Mestre"}</span>
                          </div>
                          <div className="flex justify-between text-neutral-400">
                            <span>Seu Papel:</span>
                            <span className={`font-semibold uppercase tracking-wider text-[10px] rounded px-1.5 py-0.5 ${userRole === "Mestre" ? "bg-amber-400/10 text-amber-300" : "bg-cyan-400/10 text-cyan-300"}`}>{userRole}</span>
                          </div>
                        </div>

                        {/* RENDER ACTIVE PLAYER ROSTER */}
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin border-t border-b border-white/5 py-1.5">
                          <span className="text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider">Jogadores Online ({roomPlayers.filter(p => p.online).length})</span>
                          {roomPlayers.filter(p => p.online).length === 0 ? (
                            <div className="text-[10px] text-neutral-500 italic pb-0.5">Aguardando outros jogadores...</div>
                          ) : (
                            roomPlayers.filter(p => p.online).map((p, idx) => (
                              <div key={p.uid || idx} className="flex items-center justify-between text-[11px] py-0.5">
                                <span className={`truncate max-w-[150px] ${p.uid === user?.uid ? "text-indigo-300 font-extrabold" : "text-neutral-300"}`}>
                                  {p.name || "Jogador"} {p.uid === user?.uid && " (Você)"}
                                </span>
                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase shrink-0 ${p.role === "Mestre" ? "bg-amber-500/10 text-amber-400 border border-amber-500/10" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"}`}>
                                  {p.role}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          onClick={() => {
                            disconnectRoom();
                            setRoomPopOpen(false);
                          }}
                          className="w-full py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-100 hover:text-white font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer text-center"
                        >
                          Sair da Mesa (Off-line)
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 text-xs flex-1">
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          Jogue online em tempo real! Os jogadores verão seu mapa ativo, grid e tokens de combate instantaneamente.
                        </p>

                        {!user ? (
                          <div className="flex flex-col gap-3 text-xs mt-1">
                            <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/20 p-3 text-center text-indigo-300 text-[10.5px] leading-relaxed">
                              🌟 Para usar a **Mesa Multiplayer** (Hospedar como Mestre ou Entrar como Jogador), você precisa ativar sua conexão de dados em nuvem.
                            </div>
                            <button
                              onClick={async () => {
                                handleCloudAuth();
                              }}
                              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 text-center opacity-100"
                            >
                              <Cloud className="h-3.5 w-3.5" /> Conectar via Google
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <span className="text-[10px] tracking-wider uppercase font-extrabold text-neutral-400 block">Hospedar (Mestre)</span>
                              <button
                                onClick={createRoom}
                                disabled={isConnectingRoom}
                                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-lg disabled:opacity-50 text-center"
                              >
                                {isConnectingRoom ? "Criando..." : "Nova Mesa Online"}
                              </button>
                            </div>

                            <div className="relative flex py-1 items-center">
                              <div className="flex-grow border-t border-white/5"></div>
                              <span className="flex-shrink mx-2 text-[10px] text-neutral-500 uppercase tracking-widest font-black">OU</span>
                              <div className="flex-grow border-t border-white/5"></div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[10px] tracking-wider uppercase font-extrabold text-neutral-400 block">Conectar (Jogador)</span>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={inputRoomId}
                                  onChange={(e) => setInputRoomId(e.target.value)}
                                  placeholder="CÓDIGO (ex: PKV-A2F3)"
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono tracking-widest text-center text-white placeholder:text-neutral-600 uppercase focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                  onClick={() => {
                                    if (inputRoomId.trim()) {
                                      joinRoom(inputRoomId);
                                      setRoomPopOpen(false);
                                    }
                                  }}
                                  disabled={isConnectingRoom || !inputRoomId.trim()}
                                  className="px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 hover:text-white border border-white/10 font-bold uppercase text-[10px] transition-all cursor-pointer disabled:opacity-50 text-neutral-300"
                                >
                                  Entrar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mestre / Jogador session role switch */}
              <button
                onClick={() => setUserRole(userRole === "Mestre" ? "Jogador" : "Mestre")}
                className={`group inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 md:px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all active:scale-95 cursor-pointer ${
                  userRole === "Mestre"
                    ? "border-amber-300/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                    : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                }`}
                title="Alternar papel da sessão"
              >
                {userRole === "Mestre" ? <Crown className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                <span>{userRole}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 1. POKEVTT5E COMPACT FLOATING TOOLBELT (DOCK) */}
      <nav 
        id="vtt-floating-dock"
        className={`fixed bottom-3 left-1/2 -translate-x-1/2 md:bottom-auto md:left-3 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 z-40 flex flex-row md:flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-[#0b0c10]/60 backdrop-blur-xl border border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.6)] transition-all duration-300 ${
          hideAllUI ? "opacity-0 translate-y-20 md:translate-y-0 md:-translate-x-20 pointer-events-none" : "opacity-100"
        }`}
      >
        <button
          type="button"
          id="vtt-logo-badge"
          onClick={() => setHideAllUI(true)}
          className="relative group w-9 h-9 flex items-center justify-center rounded-xl bg-slate-950/40 hover:bg-slate-900/80 active:scale-90 transition-all shadow-md border border-white/5 cursor-pointer"
          title="Recolher Interface (Ocultar)"
        >
          <PokeballIcon className="w-6 h-6 transition-transform duration-500 hover:rotate-[360deg]" glowColor="#3b82f6" hideStyle={true} />
          <span className="absolute left-[48px] scale-0 md:group-hover:scale-100 transition-all duration-150 origin-left bg-[#0f1115] text-[11px] font-medium tracking-wide px-2.5 py-1.5 rounded-lg border border-white/15 shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Recolher para a Pokébola
          </span>
        </button>

        <div className="w-px h-4 md:w-5 md:h-px bg-white/10 rounded-full" />

        {/* Tab triggers */}
        <button
          onClick={() => setActiveTab(activeTab === "maps" ? null : "maps")}
          className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === "maps"
              ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.55)]"
              : "bg-white/[0.03] text-neutral-400 border border-white/5 hover:bg-white/[0.08] hover:text-white"
          }`}
          title="Arenas & Mapas"
        >
          <MapIcon className="w-4.5 h-4.5" />
          <span className="absolute left-[48px] scale-0 md:group-hover:scale-100 transition-all duration-150 origin-left bg-[#0f1115] text-[11px] font-medium tracking-wide px-2.5 py-1.5 rounded-lg border border-white/15 shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Catálogo de Arenas
          </span>
        </button>

        <button
          onClick={() => setActiveTab(activeTab === "tokens" ? null : "tokens")}
          className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            activeTab === "tokens"
              ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.55)]"
              : "bg-white/[0.03] text-neutral-400 border border-white/5 hover:bg-white/[0.08] hover:text-white"
          }`}
          title="Miniaturas & Monstros"
        >
          <Users className="w-4.5 h-4.5" />
          <span className="absolute left-[48px] scale-0 md:group-hover:scale-100 transition-all duration-150 origin-left bg-[#0f1115] text-[11px] font-medium tracking-wide px-2.5 py-1.5 rounded-lg border border-white/15 shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Portal de Tokens
          </span>
        </button>

        <button
          disabled={!activeMapId}
          onClick={() => setActiveTab(activeTab === "grid" ? null : "grid")}
          className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
            !activeMapId ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
          } ${
            activeTab === "grid"
              ? "bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.55)]"
              : "bg-white/[0.03] text-neutral-400 border border-white/5 hover:bg-white/[0.08] hover:text-white"
          }`}
          title="Configurações de Grade"
        >
          <Grid3X3 className="w-4.5 h-4.5" />
          <span className="absolute left-[48px] scale-0 md:group-hover:scale-100 transition-all duration-150 origin-left bg-[#0f1115] text-[11px] font-medium tracking-wide px-2.5 py-1.5 rounded-lg border border-white/15 shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Ajustar Grade RPG
          </span>
        </button>

        <button
          disabled={!activeMapId}
          onClick={toggleMultiSelectActive}
          className={`relative group w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
            !activeMapId ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
          } ${
            isMultiSelectActive
              ? "bg-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.55)]"
              : "bg-white/[0.03] text-neutral-400 border border-white/5 hover:bg-white/[0.08] hover:text-white"
          }`}
          title="Seleção Múltipla"
        >
          <MousePointer className="w-4.5 h-4.5" />
          <span className="absolute left-[48px] scale-0 md:group-hover:scale-100 transition-all duration-150 origin-left bg-[#0f1115] text-[11px] font-medium tracking-wide px-2.5 py-1.5 rounded-lg border border-white/15 shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Seleção Múltipla
          </span>
        </button>

        <div className="w-px h-4 md:w-5 md:h-px bg-white/10 rounded-full my-1" />

        {/* View adjustments shortcut on the dock */}
        <button
          onClick={resetCamera}
          className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          title="Centralizar Tela"
        >
          <Compass className="w-4 h-4" />
        </button>
      </nav>

      {/* 2. SLICK ANIMAED POPUPS (GRIMOIRES) */}
      <AnimatePresence>
        {activeTab && (
          <div className="contents">
            {/* Click-outside backdrop pointer interceptor */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px] ${draggingTrainerRecordId ? "pointer-events-none" : ""}`} 
              onClick={() => setActiveTab(null)} 
            />
            <motion.div
              key={activeTab}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            id="vtt-sidebar-popup"
            className={`fixed left-0 right-0 bottom-0 md:bottom-auto md:left-[56px] md:right-auto md:top-1/2 md:-translate-y-1/2 z-45 w-full md:w-80 h-[75vh] md:h-auto max-h-[75vh] md:max-h-[82vh] rounded-t-3xl md:rounded-2xl bg-[#0b0c10]/60 backdrop-blur-xl border-t border-x md:border border-white/5 shadow-[0_-15px_45px_rgba(0,0,0,0.9)] md:shadow-[10px_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300 ${
              popoverDragActive && activeTab === "maps"
                ? "border-indigo-500 bg-[#141624]/60 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                : "border-white/5"
            } ${
              draggingTrainerRecordId 
                ? isDragHoveringSidebar
                  ? "opacity-95 scale-[0.98] border-indigo-500/40 shadow-xl"
                  : "scale-95 translate-y-full md:opacity-0 md:pointer-events-none md:scale-90 md:translate-y-0 md:-translate-x-[120%]"
                : "opacity-100"
            }`}
            onDragOver={activeTab === "maps" ? handlePopoverDragOver : undefined}
            onDragLeave={(e) => {
              if (activeTab === "maps") {
                handlePopoverDragLeave(e);
              }
            }}
            onDrop={activeTab === "maps" ? handlePopoverDrop : undefined}
          >
            {/* Mobile Drag/Close Handle Indicator */}
            <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div 
                className="w-12 h-1 bg-white/20 rounded-full cursor-pointer hover:bg-white/30" 
                onClick={() => setActiveTab(null)}
              />
            </div>
            {popoverDragActive && activeTab === "maps" && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/90 backdrop-blur-sm border-2 border-dashed border-indigo-400 m-2 rounded-xl pointer-events-none animate-in fade-in zoom-in duration-200">
                <FileUp className="w-10 h-10 text-indigo-400 animate-bounce mb-2" />
                <span className="text-sm font-semibold text-white">Solte para Catalogar Arena</span>
                <span className="text-[10px] text-indigo-300">JPG, PNG ou SVG</span>
              </div>
            )}
            {/* Popover Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <span className="text-[12px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
                {activeTab === "maps" && (
                  <>
                    <MapIcon className="w-4 h-4 text-indigo-400" /> Catalogar Arena
                  </>
                )}
                {activeTab === "tokens" && (
                  <>
                    <Users className="w-4 h-4 text-indigo-400" /> Portal de Criaturas
                  </>
                )}
                {activeTab === "grid" && (
                  <>
                    <Grid3X3 className="w-4 h-4 text-indigo-400" /> Linhas de Grade
                  </>
                )}
              </span>
              <button 
                onClick={() => setActiveTab(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popover Body Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
              
              {/* TAB A: MAPS AND ARENAS */}
              {activeTab === "maps" && (
                <div className="space-y-4">
                  {/* Minimalist segmented action row */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setActiveAction(activeAction === "upload" ? null : "upload");
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                        activeAction === "upload"
                          ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold"
                          : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                      }`}
                      title="Upload do computador"
                    >
                      <FileUp className="w-4 h-4" />
                      <span className="text-[9px] uppercase tracking-wider font-bold">Upload</span>
                    </button>

                    <button
                      onClick={() => setActiveAction(activeAction === "link" ? null : "link")}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                        activeAction === "link"
                          ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold"
                          : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                      }`}
                      title="Inserir por Link"
                    >
                      <Link className="w-4 h-4" />
                      <span className="text-[9px] uppercase tracking-wider font-bold">Por Link</span>
                    </button>

                    <button
                      onClick={() => setActiveAction(activeAction === "folder" ? null : "folder")}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                        activeAction === "folder"
                          ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold"
                          : "bg-white/[0.02] border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                      }`}
                      title="Criar Pasta"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span className="text-[9px] uppercase tracking-wider font-bold">Nova Pasta</span>
                    </button>
                  </div>

                  {/* Clean transitions for the active action inputs */}
                  <AnimatePresence mode="wait">
                    {activeAction === "upload" && (
                      <motion.div
                        key="act-upload"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div 
                          onClick={() => fileMapInputRef.current?.click()}
                          className="border border-dashed border-indigo-500/30 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.06] hover:border-indigo-500/50 rounded-xl p-4 text-center cursor-pointer transition-all group duration-150"
                        >
                          <input 
                            ref={fileMapInputRef}
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageFileLoad(e.target.files[0], "map");
                                setActiveAction(null);
                              }
                            }}
                          />
                          <FileUp className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform mx-auto mb-1" />
                          <span className="text-[11px] font-semibold text-neutral-200 block">Escolher do Computador</span>
                          <span className="text-[9px] text-neutral-500 block mt-0.5">ou arraste para esta janela popover</span>
                        </div>
                      </motion.div>
                    )}

                    {activeAction === "link" && (
                      <motion.div
                        key="act-link"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-2">
                          <input 
                            type="text" 
                            placeholder="Nome da Arena (ex: Mina de Sal)"
                            value={newMapName}
                            onChange={(e) => setNewMapName(e.target.value)}
                            className="w-full bg-[#14161d] text-xs text-white rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-indigo-500/50 transition-colors"
                          />
                          <input 
                            type="text" 
                            placeholder="Link da Imagem (URL)"
                            value={newMapUrl}
                            onChange={(e) => setNewMapUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addCampaignMap(newMapName, newMapUrl);
                                setActiveAction(null);
                              }
                            }}
                            className="w-full bg-[#14161d] text-xs text-white rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-indigo-500/50 transition-colors"
                          />
                          <button
                            onClick={() => {
                              addCampaignMap(newMapName, newMapUrl);
                              setActiveAction(null);
                            }}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg py-1.5 transition-colors cursor-pointer"
                          >
                            Adicionar Imagem URL
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {activeAction === "folder" && (
                      <motion.div
                        key="act-folder"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex gap-1.5">
                          <input 
                            type="text"
                            placeholder="Nome da pasta (ex: Cavernas)"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                createFolder(newFolderName);
                                setActiveAction(null);
                              }
                            }}
                            className="flex-1 bg-[#14161d] text-xs text-white rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                          />
                          <button
                            onClick={() => {
                              createFolder(newFolderName);
                              setActiveAction(null);
                            }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
                          >
                            Criar
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Clean Horizontal separation line */}
                  <div className="h-px bg-white/10 w-full rounded-full" />

                  {/* Playable list of added folders and arenas */}
                  <div className="space-y-2.5 max-h-[48vh] overflow-y-auto scrollbar-thin pr-1">
                    
                    {/* Folder Drop helper label when a map is being dragged inside sidebar */}
                    {draggingSidebarMapId && (
                      <div className="text-[10px] text-center text-indigo-400 font-semibold animate-pulse py-1 rounded bg-indigo-500/5 border border-indigo-500/10 mb-2">
                        Arraste e solte o mapa sobre a pasta desejada
                      </div>
                    )}

                    {/* RENDER CUSTOM FOLDERS */}
                    {folders.filter(f => checkCanView(f)).map(folder => {
                      const folderMaps = maps.filter(m => m.folderId === folder.id && checkCanView(m));
                      const isExpanded = expandedFolderIds[folder.id] !== false; // expanded by default
                      const isDraggingOverMe = dragOverFolderId === folder.id;

                      return (
                        <div 
                          key={folder.id} 
                          data-folder-id={folder.id}
                          className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                            isDraggingOverMe
                              ? "border-indigo-400 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.02]"
                              : "border-white/5 bg-white/[0.01]"
                          }`}
                          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                          onDragLeave={handleFolderDragLeave}
                          onDrop={(e) => handleFolderDrop(e, folder.id)}
                        >
                          {/* Folder Header Row */}
                          <div 
                            onClick={() => setExpandedFolderIds(prev => ({ ...prev, [folder.id]: !isExpanded }))}
                            className="flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer text-xs font-semibold text-neutral-300 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-1">
                              {isExpanded ? (
                                <FolderOpen className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color: folder.color || '#6366f1' }} />
                              ) : (
                                <Folder className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color: folder.color || '#6366f1' }} />
                              )}
                              <span className="truncate">{folder.name}</span>
                              <span className="text-[10px] font-bold text-neutral-500 bg-white/5 px-2 py-0.2 rounded-full shrink-0">
                                {folderMaps.length}
                              </span>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {(!folder.ownerId || folder.ownerId === user?.uid || userRole === "Mestre") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSharingModalTarget({
                                      type: "mapFolder",
                                      id: folder.id,
                                      name: folder.name,
                                      ownerId: folder.ownerId || undefined,
                                      permissions: folder.permissions || { canView: [], canEdit: [] }
                                    });
                                  }}
                                  className="text-neutral-500 hover:text-yellow-405 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                  title="Permissões da Pasta"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setActiveFolderColorPickerId(activeFolderColorPickerId === folder.id ? null : folder.id);
                                }}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  activeFolderColorPickerId === folder.id ? "text-indigo-400 bg-white/10" : "text-neutral-500 hover:text-indigo-400 hover:bg-white/5"
                                }`}
                                title="Escolher Cor"
                              >
                                <Palette className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFolder(folder.id);
                                }}
                                className="text-neutral-500 hover:text-red-400 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                title="Excluir Pasta"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                              <div className="text-neutral-500 p-0.5">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Folder Color Picker Row */}
                          {activeFolderColorPickerId === folder.id && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border-t border-white/5 select-none" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[9px] uppercase font-bold text-neutral-400 shrink-0">Cor:</span>
                              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none">
                                {["#ef4444", "#10b981", "#3b82f6", "#f97316", "#a855f7", "#06b6d4", "#6366f1", "#ec4899", "#9ca3af"].map(c => (
                                  <button
                                    key={c}
                                    onClick={() => {
                                      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, color: c } : f));
                                      setActiveFolderColorPickerId(null);
                                    }}
                                    className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 active:scale-90 transition-all cursor-pointer shrink-0 shadow-sm"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}

                                {/* Custom HTML5 Color Picker Option */}
                                <div className="relative w-4 h-4 rounded-full border border-white/30 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-90 overflow-hidden shrink-0 transition-transform">
                                  <input
                                    type="color"
                                    value={folder.color || "#6366f1"}
                                    onChange={(e) => {
                                      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, color: e.target.value } : f));
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                                    title="Escolha qualquer cor personalizada..."
                                  />
                                  <Palette className="w-2 h-2 text-white pointer-events-none drop-shadow" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Folder Maps List */}
                          {isExpanded && (
                            <div className="p-1.5 space-y-1 bg-black/15 border-t border-white/[0.02]">
                              {folderMaps.length === 0 ? (
                                <p className="p-3 text-[10px] italic text-neutral-500 text-center select-none">
                                  Nenhum mapa aqui. Arraste mapas para cá!
                                </p>
                              ) : (
                                folderMaps.map(m => (
                                  <div
                                    key={m.id}
                                    draggable="true"
                                    onDragStart={(e) => handleMapDragStart(e, m.id)}
                                    onDragEnd={handleMapDragEnd}
                                    onTouchStart={(e) => handleMapTouchStart(e, m.id)}
                                    onTouchMove={handleMapTouchMove}
                                    onTouchEnd={handleMapTouchEnd}
                                    onClick={() => {
                                      setActiveMapId(m.id);
                                      setNotification(`Arena: ${m.name}`);
                                    }}
                                    className={`group flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none hover:translate-x-0.5 ${
                                      activeMapId === m.id
                                        ? "bg-indigo-500/15 border-indigo-500/30 text-white font-medium"
                                        : "bg-white/[0.01]/70 border-transparent text-neutral-300 hover:bg-white/[0.03]"
                                    }`}
                                    style={draggingSidebarMapId === m.id ? { pointerEvents: "none", opacity: 0.5 } : {}}
                                  >
                                    {editingMapId === m.id ? (
                                      <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          value={editingMapNameValue}
                                          onChange={(e) => setEditingMapNameValue(e.target.value)}
                                          onKeyDown={(ev) => {
                                            if (ev.key === "Enter") {
                                              if (editingMapNameValue.trim()) {
                                                setMaps(prev => prev.map(mapItem => mapItem.id === m.id ? { ...mapItem, name: editingMapNameValue.trim() } : mapItem));
                                              }
                                              setEditingMapId(null);
                                            } else if (ev.key === "Escape") {
                                              setEditingMapId(null);
                                            }
                                          }}
                                          className="bg-neutral-900 border border-indigo-500 text-xs text-white rounded px-2 py-1 w-full focus:outline-none"
                                          autoFocus
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editingMapNameValue.trim()) {
                                              setMaps(prev => prev.map(mapItem => mapItem.id === m.id ? { ...mapItem, name: editingMapNameValue.trim() } : mapItem));
                                            }
                                            setEditingMapId(null);
                                          }}
                                          className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-white/5 cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingMapId(null);
                                          }}
                                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/5 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2 overflow-hidden mr-1 min-w-0 flex-1">
                                          <div 
                                            className="w-7 h-7 rounded bg-cover bg-center shrink-0 border border-white/5" 
                                            style={{ backgroundImage: `url(${m.url})` }} 
                                          />
                                          <div className="flex items-center gap-1 min-w-0 max-w-full">
                                            <span className="text-[11px] font-medium truncate">
                                              {m.name}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingMapId(m.id);
                                                setEditingMapNameValue(m.name);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-white rounded transition-opacity cursor-pointer shrink-0"
                                              title="Editar nome"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {(!m.ownerId || m.ownerId === user?.uid || userRole === "Mestre") && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSharingModalTarget({
                                                type: "map",
                                                id: m.id,
                                                name: m.name,
                                                ownerId: m.ownerId || undefined,
                                                permissions: m.permissions || { canView: [], canEdit: [] }
                                              });
                                            }}
                                            className="text-neutral-500 hover:text-yellow-405 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                                            title="Permissões do Mapa"
                                          >
                                            <Lock className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => deleteCampaignMap(m.id, e)}
                                          className="text-neutral-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                                          title="Remover Arena"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* RENDER SEM PASTA (ROOT) VIRTUAL CONTAINER */}
                    {(() => {
                      const rootMaps = maps.filter(m => !m.folderId && checkCanView(m));
                      const isExpanded = expandedFolderIds["unassigned"] !== false;
                      const isDraggingOverMe = dragOverFolderId === "unassigned";

                      return (
                        <div 
                          data-folder-id="unassigned"
                          className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                            isDraggingOverMe
                              ? "border-indigo-400 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.02]"
                              : "border-white/5 bg-white/[0.01]"
                          }`}
                          onDragOver={(e) => handleFolderDragOver(e, "unassigned")}
                          onDragLeave={handleFolderDragLeave}
                          onDrop={(e) => handleFolderDrop(e, undefined)}
                        >
                          {/* Virtual Unassigned Header */}
                          <div 
                            onClick={() => setExpandedFolderIds(prev => ({ ...prev, "unassigned": !isExpanded }))}
                            className="flex items-center justify-between p-2.5 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer text-xs font-semibold text-neutral-300 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-1">
                              <Folder className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              <span>Sem Pasta</span>
                              <span className="text-[10px] font-bold text-neutral-500 bg-white/5 px-2 py-0.2 rounded-full shrink-0">
                                {rootMaps.length}
                              </span>
                            </div>
                            <div className="text-neutral-500 p-0.5">
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </div>
                          </div>

                          {/* Virtual Unassigned Maps */}
                          {isExpanded && (
                            <div className="p-1.5 space-y-1 bg-black/15 border-t border-white/[0.02]">
                              {rootMaps.length === 0 ? (
                                <p className="p-3 text-[10px] italic text-neutral-500 text-center select-none">
                                  Nenhum mapa solto.
                                </p>
                              ) : (
                                rootMaps.map(m => (
                                  <div
                                    key={m.id}
                                    draggable="true"
                                    onDragStart={(e) => handleMapDragStart(e, m.id)}
                                    onDragEnd={handleMapDragEnd}
                                    onTouchStart={(e) => handleMapTouchStart(e, m.id)}
                                    onTouchMove={handleMapTouchMove}
                                    onTouchEnd={handleMapTouchEnd}
                                    onClick={() => {
                                      setActiveMapId(m.id);
                                      setNotification(`Arena: ${m.name}`);
                                    }}
                                    className={`group flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing select-none hover:translate-x-0.5 ${
                                      activeMapId === m.id
                                        ? "bg-indigo-500/15 border-indigo-500/30 text-white font-medium"
                                        : "bg-white/[0.01]/70 border-transparent text-neutral-300 hover:bg-white/[0.03]"
                                    }`}
                                    style={draggingSidebarMapId === m.id ? { pointerEvents: "none", opacity: 0.5 } : {}}
                                  >
                                    {editingMapId === m.id ? (
                                      <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          value={editingMapNameValue}
                                          onChange={(e) => setEditingMapNameValue(e.target.value)}
                                          onKeyDown={(ev) => {
                                            if (ev.key === "Enter") {
                                              if (editingMapNameValue.trim()) {
                                                setMaps(prev => prev.map(mapItem => mapItem.id === m.id ? { ...mapItem, name: editingMapNameValue.trim() } : mapItem));
                                              }
                                              setEditingMapId(null);
                                            } else if (ev.key === "Escape") {
                                              setEditingMapId(null);
                                            }
                                          }}
                                          className="bg-neutral-900 border border-indigo-500 text-xs text-white rounded px-2 py-1 w-full focus:outline-none"
                                          autoFocus
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editingMapNameValue.trim()) {
                                              setMaps(prev => prev.map(mapItem => mapItem.id === m.id ? { ...mapItem, name: editingMapNameValue.trim() } : mapItem));
                                            }
                                            setEditingMapId(null);
                                          }}
                                          className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-white/5 cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingMapId(null);
                                          }}
                                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/5 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex-1 flex items-center gap-2 overflow-hidden mr-1 min-w-0">
                                          <div 
                                            className="w-7 h-7 rounded bg-cover bg-center shrink-0 border border-white/5" 
                                            style={{ backgroundImage: `url(${m.url})` }} 
                                          />
                                          <div className="flex items-center gap-1 min-w-0 max-w-full">
                                            <span className="text-[11px] font-medium truncate">
                                              {m.name}
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingMapId(m.id);
                                                setEditingMapNameValue(m.name);
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-white rounded transition-opacity cursor-pointer shrink-0"
                                              title="Editar nome"
                                            >
                                              <Edit3 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {(!m.ownerId || m.ownerId === user?.uid || userRole === "Mestre") && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSharingModalTarget({
                                                type: "map",
                                                id: m.id,
                                                name: m.name,
                                                ownerId: m.ownerId || undefined,
                                                permissions: m.permissions || { canView: [], canEdit: [] }
                                              });
                                            }}
                                            className="text-neutral-500 hover:text-yellow-405 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                                            title="Permissões do Mapa"
                                          >
                                            <Lock className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => deleteCampaignMap(m.id, e)}
                                          className="text-neutral-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                                          title="Remover Arena"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                </div>
              )}

              {/* TAB B: FICHAS DE TREINADOR (ESTRUTURA COMPLETA) */}
              {activeTab === "tokens" && (
                <div className="space-y-4 flex flex-col h-full">
                  
                  {/* Action Buttons Row */}
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setFormTrainerName("");
                        setFormTrainerImage("");
                        setFormTrainerFolderId(selectedTrainerFolderId || "");
                        setIsCreateTrainerModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.97] cursor-pointer hover:shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Nova Ficha</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setFormFolderName("");
                        setFormFolderParentId(selectedTrainerFolderId || "");
                        setFormFolderColor("#6366f1");
                        setIsCreateFolderModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-white/10 text-neutral-205 hover:text-white font-bold text-xs rounded-xl border border-white/10 transition-all active:scale-[0.97] cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>Nova Pasta</span>
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative shrink-0">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                    <input 
                      type="text"
                      placeholder="Buscar treinadores pelo nome..."
                      value={searchTrainerQuery}
                      onChange={(e) => setSearchTrainerQuery(e.target.value)}
                      className="w-full bg-[#111319]/95 text-xs text-white rounded-xl pl-9 pr-8 py-2 border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-neutral-500"
                    />
                    {searchTrainerQuery && (
                      <button 
                        onClick={() => setSearchTrainerQuery("")}
                        className="absolute right-3 top-2 text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3 w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Drag drop help alert */}
                  {(draggingTrainerRecordId || draggingTrainerFolderId) && (
                    <div className="text-[10px] text-center text-indigo-400 font-semibold animate-pulse py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 mb-1 shrink-0">
                      Solte sobre uma pasta para mover
                    </div>
                  )}

                  {/* Root / Unassigned Drop Area */}
                  {(draggingTrainerFolderId || draggingTrainerRecordId) && (
                    <div 
                      data-root-drop-area="true"
                      className={`border-2 border-dashed rounded-xl p-3 text-center text-xs transition-all duration-200 shrink-0 ${
                        dragOverTrainerRoot 
                          ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 scale-[1.01]" 
                          : "border-white/10 bg-white/[0.01] text-neutral-400 hover:bg-white/[0.02]"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTrainerRoot(true); }}
                      onDragLeave={() => setDragOverTrainerRoot(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTrainerRoot(false);
                        if (draggingTrainerRecordId) {
                          moveTrainerRecord(draggingTrainerRecordId, undefined);
                        } else if (draggingTrainerFolderId) {
                          moveTrainerFolder(draggingTrainerFolderId, undefined);
                        }
                      }}
                    >
                      Mover para a Pasta Raiz (Início)
                    </div>
                  )}

                  {/* Main Explorer Screen */}
                  <div className="flex-1 overflow-y-auto max-h-[50vh] scrollbar-thin pr-1 space-y-2 mt-1">
                    {searchTrainerQuery.trim() !== "" ? (
                      // SEARCH MODE
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block px-1">
                          Resultado da busca ({trainerRecords.filter(r => r.name.toLowerCase().includes(searchTrainerQuery.toLowerCase())).length})
                        </span>
                        {(() => {
                          const matched = trainerRecords.filter(r => r.name.toLowerCase().includes(searchTrainerQuery.toLowerCase()) && checkCanView(r));
                          if (matched.length === 0) {
                            return (
                              <div className="text-center py-6 text-neutral-505 text-xs italic">
                                Nenhum treinador encontrado.
                              </div>
                            );
                          }
                          return matched.map(r => (
                            <div
                              key={r.id}
                              draggable="false"
                              onDragStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onPointerDown={(e) => handlePointerDownRecord(e, r.id)}
                              onClick={() => {
                                if (trainerDragWasActiveRef.current) {
                                  trainerDragWasActiveRef.current = false;
                                  return;
                                }
                                setActiveTrainerRecord(r);
                                setIsViewTrainerModalOpen(true);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTrainerContextMenu({ x: e.clientX, y: e.clientY, record: r });
                              }}
                              className={`group flex items-center justify-between p-2 rounded-xl border cursor-pointer select-none touch-none transition-all duration-200 ${
                                draggingTrainerRecordId === r.id
                                  ? "scale-95 opacity-55 border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.3)] animate-pulse"
                                  : "bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-white/10 hover:translate-x-0.5"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div 
                                  className="w-8 h-8 rounded-full bg-cover bg-center shrink-0 border border-white/10 bg-[#161821]" 
                                  style={{ backgroundImage: `url(${r.image})` }}
                                  referrerPolicy="no-referrer"
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-neutral-200 truncate">{r.name}</div>
                                  <div className="text-[9px] text-neutral-400 truncate flex items-center gap-1">
                                    <span>ID: {r.id.slice(0, 12)}</span>
                                    <span>•</span>
                                    <span className="text-[8px] text-indigo-400 font-bold">{(() => {
                                      if (!r.folderId) return "Raiz";
                                      const path: string[] = [];
                                      let curr = trainerFolders.find(f => f.id === r.folderId);
                                      while (curr) {
                                        path.unshift(curr.name);
                                        curr = curr.parentId ? trainerFolders.find(f => f.id === curr.parentId) : undefined;
                                      }
                                      return path.join(" / ");
                                    })()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTrainerRecord(r);
                                    setFormTrainerName(r.name);
                                    setFormTrainerImage(r.image);
                                    setFormTrainerFolderId(r.folderId || "");
                                    setIsEditTrainerModalOpen(true);
                                  }}
                                  className="p-1 hover:bg-white/10 text-neutral-300 hover:text-white rounded transition-all cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateTrainerRecord(r);
                                  }}
                                  className="p-1 hover:bg-white/10 text-neutral-300 hover:text-indigo-400 rounded transition-all cursor-pointer"
                                  title="Duplicar"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (true) {
                                      deleteTrainerRecord(r.id);
                                    }
                                  }}
                                  className="p-1 hover:bg-white/10 text-neutral-300 hover:text-red-400 rounded transition-all cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      // TREE EXPLORER MODE - DIRECTORY HIERARCHY
                      <div className="space-y-1.5 pr-1 select-none">
                        {/* Recursive Directory Node Render Function */}
                        {(() => {
                          const getFolderCount = (fId: string): number => {
                            let count = trainerRecords.filter(r => r.folderId === fId).length;
                            trainerFolders.filter(fol => fol.parentId === fId).forEach(sf => {
                              count += getFolderCount(sf.id);
                            });
                            return count;
                          };

                          const renderNode = (parentId: string | undefined, depth: number = 0) => {
                            const currentF = trainerFolders.filter(f => f.parentId === parentId);
                            const currentR = trainerRecords.filter(r => r.folderId === parentId);

                            if (currentF.length === 0 && currentR.length === 0) {
                              if (depth > 0) {
                                return (
                                  <div className="text-[10px] italic text-neutral-500 pl-4 py-1">
                                    Pasta vazia
                                  </div>
                                );
                              }
                              return null;
                            }

                            return (
                              <div className="space-y-1">
                                {/* Subfolders */}
                                {currentF.filter(f => checkCanView(f)).map(folder => {
                                  const isExpanded = expandedTrainerFolderIds[folder.id] !== false;
                                  const isDraggingOverMe = dragOverTrainerFolderId === folder.id;
                                  const recordCount = getFolderCount(folder.id);

                                  return (
                                    <div 
                                      key={folder.id} 
                                      data-folder-id={folder.id}
                                      className={`border rounded-xl transition-all duration-200 ${
                                        isDraggingOverMe
                                          ? "border-indigo-400 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.01]"
                                          : "border-white/5 bg-white/[0.01]"
                                      }`}
                                      draggable={activePressedRecordId ? "false" : "true"}
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setDraggingTrainerFolderId(folder.id);
                                        e.dataTransfer.setData("text/plain", "folder:" + folder.id);
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      onDragEnd={() => {
                                        setDraggingTrainerFolderId(null);
                                        setDragOverTrainerFolderId(null);
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverTrainerFolderId(folder.id);
                                      }}
                                      onDragLeave={() => setDragOverTrainerFolderId(null)}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverTrainerFolderId(null);
                                        if (draggingTrainerRecordId) {
                                          moveTrainerRecord(draggingTrainerRecordId, folder.id);
                                        } else if (draggingTrainerFolderId) {
                                          moveTrainerFolder(draggingTrainerFolderId, folder.id);
                                        }
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTrainerContextMenu({ x: e.clientX, y: e.clientY, folder: folder });
                                      }}
                                    >
                                      {/* Header Fold */}
                                      <div 
                                        onClick={() => {
                                          setSelectedTrainerFolderId(folder.id);
                                          setExpandedTrainerFolderIds(prev => ({
                                            ...prev,
                                            [folder.id]: !isExpanded
                                          }));
                                        }}
                                        className={`group/fold flex items-center justify-between p-2 cursor-pointer rounded-t-xl hover:bg-white/[0.03] select-none transition-colors text-xs font-semibold ${
                                          selectedTrainerFolderId === folder.id
                                            ? "text-indigo-300 bg-indigo-500/5"
                                            : "text-neutral-300"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 overflow-hidden mr-1 min-w-0">
                                          <div className="shrink-0 transition-all duration-150">
                                            {isExpanded ? (
                                              <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#6366f1' }} />
                                            ) : (
                                              <Folder className="w-4 h-4" style={{ color: folder.color || '#6366f1' }} />
                                            )}
                                          </div>
                                          <span className="truncate">{folder.name}</span>
                                          <span className="text-[9px] font-extrabold text-neutral-400 bg-white/5 opacity-85 px-1.5 py-0.2 rounded-full shrink-0">
                                            {recordCount}
                                          </span>
                                        </div>
                                        
                                        {/* Folder quick actions */}
                                        <div className="flex items-center gap-1">
                                          <div className="opacity-0 group-hover/fold:opacity-100 flex items-center gap-0.5 transition-opacity">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTrainerFolderId(folder.id);
                                                setFormTrainerName("");
                                                setFormTrainerImage("");
                                                setFormTrainerFolderId(folder.id);
                                                setIsCreateTrainerModalOpen(true);
                                              }}
                                              className="p-1 hover:bg-indigo-500/10 hover:text-indigo-400 text-neutral-400 rounded cursor-pointer transition-all"
                                              title="Nova Ficha aqui"
                                            >
                                              <UserPlus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveTrainerFolder(folder);
                                                setFormFolderName(folder.name);
                                                setFormFolderParentId(folder.parentId || "");
                                                setFormFolderColor(folder.color || "#6366f1");
                                                setIsEditFolderModalOpen(true);
                                              }}
                                              className="p-1 hover:bg-white/10 hover:text-white text-neutral-400 rounded cursor-pointer transition-all"
                                              title="Configurar pasta"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (true) {
                                                  deleteTrainerFolder(folder.id);
                                                }
                                              }}
                                              className="p-1 hover:bg-white/10 hover:text-red-400 text-neutral-400 rounded cursor-pointer transition-all"
                                              title="Remover pasta"
                                            >
                                              <Trash className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <div className="text-neutral-500 shrink-0 select-none">
                                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sub-elements inside expanded folder */}
                                      {isExpanded && (
                                        <div className="p-1 bg-black/[0.08] border-t border-white/[0.02] pl-3 border-l border-white/5 space-y-1 rounded-b-xl">
                                          {renderNode(folder.id, depth + 1)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Next, Draw Cards / Trainers */}
                                  {currentR.filter(r => checkCanView(r)).map(record => (
                                  <div
                                    key={record.id}
                                    draggable="false"
                                    onDragStart={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onPointerDown={(e) => handlePointerDownRecord(e, record.id)}
                                    onClick={() => {
                                      if (trainerDragWasActiveRef.current) {
                                        trainerDragWasActiveRef.current = false;
                                        return;
                                      }
                                      setActiveTrainerRecord(record);
                                      setIsViewTrainerModalOpen(true);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setTrainerContextMenu({ x: e.clientX, y: e.clientY, record: record });
                                    }}
                                    className={`group flex items-center justify-between p-1.5 rounded-xl border cursor-pointer max-w-full select-none touch-none transition-all duration-200 ${
                                      draggingTrainerRecordId === record.id
                                        ? "scale-95 opacity-55 border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.3)] animate-pulse"
                                        : "bg-white/[0.01]/75 hover:bg-white/[0.03] border-transparent hover:border-white/5 hover:translate-x-0.5"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div 
                                        className="rounded-full bg-cover bg-center shrink-0 border border-white/10"
                                        style={{ width: "28px", height: "28px", backgroundImage: `url(${record.image})` }}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs text-neutral-300 group-hover:text-white font-medium truncate">{record.name}</div>
                                        <div className="text-[8px] text-neutral-500 font-mono truncate">ID: {record.id.slice(0, 12)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPokeballTrainerId(record.id);
                                          setActivePokeballTrainerId(record.id);
                                          setPokeballViewMode("owner");
                                        }}
                                        className="p-1 hover:bg-red-500/15 text-red-400 hover:text-red-300 rounded cursor-pointer transition-all"
                                        title="Abrir Pokébola Radial"
                                      >
                                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-900 relative overflow-hidden flex flex-col shrink-0">
                                          <div className="flex-1 bg-red-400" />
                                          <div className="h-[1px] bg-neutral-950 absolute top-[6px] left-0 right-0 z-10" />
                                          <div className="w-1.5 h-1.5 rounded-full bg-white border border-neutral-950 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
                                          <div className="flex-1 bg-white" />
                                        </div>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTrainerRecord(record);
                                          setFormTrainerName(record.name);
                                          setFormTrainerImage(record.image);
                                          setFormTrainerFolderId(record.folderId || "");
                                          setIsEditTrainerModalOpen(true);
                                        }}
                                        className="p-1 hover:bg-white/10 text-neutral-300 hover:text-white rounded cursor-pointer transition-all"
                                        title="Editar Ficha"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          duplicateTrainerRecord(record);
                                        }}
                                        className="p-1 hover:bg-white/10 text-neutral-300 hover:text-indigo-400 rounded cursor-pointer transition-all"
                                        title="Duplicar"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (true) {
                                            deleteTrainerRecord(record.id);
                                          }
                                        }}
                                        className="p-1 hover:bg-white/10 text-neutral-300 hover:text-red-400 rounded cursor-pointer transition-all"
                                        title="Excluir"
                                      >
                                        <Trash className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          };

                          // Draw root nodes
                          const rootNodes = renderNode(undefined, 0);
                          const rootUnassignedCount = trainerRecords.filter(r => !r.folderId).length;
                          const rootFoldersCount = trainerFolders.filter(f => !f.parentId).length;
                          if (rootUnassignedCount === 0 && rootFoldersCount === 0) {
                            return (
                              <div className="text-center py-8 text-neutral-520 text-xs italic">
                                Catálogo vazio. Crie uma pasta ou ficha para começar!
                              </div>
                            );
                          }
                          return rootNodes;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB C: GRID AND SIZING CONTROL */}
              {activeTab === "grid" && activeMap && (
                <div className="space-y-4">
                  
                  {/* Grid Visiblity Switch */}
                  <div className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                    <span className="text-neutral-300 font-medium">Habilitar Grade Visual</span>
                    <button
                      onClick={() => updateGridProperty("gridEnabled", !activeMap.gridEnabled)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        activeMap.gridEnabled 
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                          : "bg-white/5 text-neutral-450 border-white/5"
                      }`}
                    >
                      {activeMap.gridEnabled ? "Ligado" : "Desligado"}
                    </button>
                  </div>

                  {/* Grid Controls Panel */}
                  <div className="space-y-3.5 bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                      <span className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-350">
                        Configurações de Grade (Grid)
                      </span>
                    </div>

                    {/* Color and Opacity Row */}
                    <div className="grid grid-cols-2 gap-3 pb-1">
                      {/* Grid Color */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Cor</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { name: "Preto", val: "#000000" },
                            { name: "Branco", val: "#ffffff" },
                            { name: "Laranja", val: "#f97316" }
                          ].map(col => (
                            <button
                              key={col.val}
                              onClick={() => updateGridProperty("gridColor", col.val)}
                              className={`w-4 h-4 rounded-full border border-white/10 transition-all cursor-pointer ${
                                activeMap.gridColor === col.val ? "ring-2 ring-indigo-500 scale-110" : "hover:scale-105"
                              }`}
                              style={{ backgroundColor: col.val }}
                              title={col.name}
                            />
                          ))}
                          
                          {/* Rich Custom Gradient Grid Color Picker Option */}
                          <div className="relative w-4 h-4 rounded-full border border-white/20 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 flex items-center justify-center cursor-pointer hover:scale-115 shrink-0 transition-transform">
                            <input
                              type="color"
                              value={activeMap.gridColor.startsWith("rgba") ? "#ffffff" : activeMap.gridColor}
                              onChange={(e) => updateGridProperty("gridColor", e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                              title="Selecione qualquer cor de grade personalizada..."
                            />
                            <Palette className="w-2.5 h-2.5 text-white pointer-events-none drop-shadow" />
                          </div>
                        </div>
                      </div>

                      {/* Opacity slider */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Opacidade</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={(activeMap.gridOpacity ?? 0.4) * 100}
                            onChange={(e) => updateGridProperty("gridOpacity", parseFloat(e.target.value) / 100)}
                            className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-indigo-500"
                          />
                          <span className="text-[10px] font-mono text-neutral-300">
                            {Math.round((activeMap.gridOpacity ?? 0.4) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sizing, Line Width, Snapping row */}
                    <div className="grid grid-cols-3 gap-2.5 text-xs pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block truncate" title="Tamanho do Grid (Escala)">Escala (Grid)</span>
                        <input
                          type="text"
                          value={activeMap.gridUnit || "5ft"}
                          onChange={(e) => updateGridProperty("gridUnit", e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 text-white rounded-lg px-2 py-1 font-mono text-center focus:outline-none focus:border-indigo-500/50"
                          placeholder="Ex: 5ft"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block truncate">Linha (px)</span>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={activeMap.gridLineWidth ?? 1.5}
                            onChange={(e) => updateGridProperty("gridLineWidth", parseFloat(e.target.value) || 1.5)}
                            className="w-full bg-neutral-900 border border-white/10 text-white rounded-lg pl-1 pr-4 py-1 font-mono text-center focus:outline-none focus:border-indigo-500/50 text-[11px]"
                          />
                          <span className="absolute right-1 text-[8px] uppercase font-bold text-neutral-500 select-none">px</span>
                        </div>
                      </div>

                      <div className="space-y-1 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block truncate text-center">Snapping</span>
                        <button
                          onClick={() => {
                            setSnapToGrid(!snapToGrid);
                            setNotification(`Snap Grid: ${!snapToGrid ? "Ativo" : "Inativo"}`);
                          }}
                          className={`w-full py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
                            snapToGrid 
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                              : "bg-white/5 text-neutral-400 border-transparent hover:bg-white/10"
                          }`}
                        >
                          {snapToGrid ? "LIGADO" : "DESLIGADO"}
                        </button>
                      </div>
                    </div>

                    {/* Grid Type Selector Grid Buttons */}
                    <div className="space-y-1 pt-1.5">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tipo de Grade Layout</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: "square", label: "Quadrada", char: "⊞" },
                          { id: "hexH", label: "Hex Flat", char: "⬡" },
                          { id: "hexV", label: "Hex Point", char: "⬢" },
                          { id: "iso", label: "Isométrico", char: "❖" }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => updateGridProperty("gridType", type.id)}
                            className={`py-1.5 px-0.5 rounded-lg border text-sm font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                              (activeMap.gridType || "square") === type.id
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white"
                            }`}
                            title={type.label}
                          >
                            <span className="text-sm font-medium leading-none">{type.char}</span>
                            <span className="text-[8px] font-sans font-medium uppercase tracking-wider text-neutral-450 mt-0.5 leading-none">{type.label.split(" ")[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Line Type Selector Row */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Estilo de Linha</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "solid", label: "Sólido", glyph: "——" },
                          { id: "dashed", label: "Traços", glyph: "- - -" },
                          { id: "dotted", label: "Pontos", glyph: "• • •" }
                        ].map(line => (
                          <button
                            key={line.id}
                            onClick={() => updateGridProperty("gridLineType", line.id)}
                            className={`py-1 h-7 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                              (activeMap.gridLineType || "solid") === line.id
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                : "bg-neutral-900 border-white/5 text-neutral-450 hover:text-white"
                            }`}
                            title={line.label}
                          >
                            <span className="font-mono text-center tracking-wider text-[10px] leading-tight">{line.glyph}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Measurement Strategy Selection Dropdown */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Medição de Distância (Measurement)</span>
                      <select
                        value={activeMap.gridMeasurement || "Chessboard (D&D 5e)"}
                        onChange={(e) => updateGridProperty("gridMeasurement", e.target.value)}
                        className="w-full bg-neutral-900 text-xs text-white rounded-lg px-2 py-1.5 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                      >
                        <option value="Chessboard (D&D 5e)">Chessboard (D&D 5e)</option>
                        <option value="Manhattan (Orthogonal)">Manhattan (Orthogonal)</option>
                        <option value="Euclidean (Diagonal Direct)">Euclidean (Diagonal Direct)</option>
                      </select>
                    </div>

                    {/* Grid Sizing Slider (Tamanho em Pixels) */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center text-[10px] text-neutral-450 uppercase font-bold">
                        <span>Ajustar Pixel Célula</span>
                        <span className="text-white font-mono font-bold text-[10px] bg-white/5 px-2 py-0.5 rounded-md">
                          {activeMap.gridSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="150"
                        value={activeMap.gridSize}
                        onChange={(e) => updateGridProperty("gridSize", parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Viewport Camera & Position Controls */}
                  <div className="space-y-3.5 bg-white/[0.02] p-3.5 rounded-xl border border-white/5 bg-black/10">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-350 block border-b border-white/[0.05] pb-1.5">
                      Controles de Câmera (Viewport)
                    </span>

                    {/* Position X, Y, and Zoom Input Cells */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 text-center block">Posição X</span>
                        <input
                          type="number"
                          value={Math.round(pan.x * 100) / 100}
                          onChange={(e) => setPan(p => ({ ...p, x: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#16181f]/75 border border-white/10 text-white rounded-lg px-1 py-1 font-mono text-center text-xs focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 text-center block">Posição Y</span>
                        <input
                          type="number"
                          value={Math.round(pan.y * 100) / 100}
                          onChange={(e) => setPan(p => ({ ...p, y: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#16181f]/75 border border-white/10 text-white rounded-lg px-1 py-1 font-mono text-center text-xs focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 text-center block">Zoom %</span>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="5"
                            max="500"
                            value={Math.round(zoom * 100)}
                            onChange={(e) => setZoom((parseFloat(e.target.value) || 100) / 100)}
                            className="w-full bg-[#16181f]/75 border border-white/10 text-white rounded-lg pl-1 pr-4 py-1 font-mono text-center text-xs focus:outline-none focus:border-indigo-500/50"
                          />
                          <span className="absolute right-1.5 text-[9px] text-neutral-500 select-none font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action trigger buttons reset / sync */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={resetCamera}
                        className="flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700/80 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg py-2 border border-white/5 transition-all cursor-pointer active:scale-95 duration-100"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                        Resetar Vista
                      </button>
                      <button
                        onClick={() => {
                          setNotification("Visão tática sincronizada com os jogadores!");
                        }}
                        className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg py-2 border border-indigo-500/20 transition-all cursor-pointer active:scale-95 duration-100"
                      >
                        <Target className="w-3.5 h-3.5" />
                        Sincronizar
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. POKEVTT5E COMPACT MAP WORKSPACE STAGE */}
      <main
        id="vtt-tabletop-arena"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerMove(e);
          setMousePos({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        onDragOver={handleCanvasDragOver}
        onDragLeave={() => setDragOverCanvasType(null)}
        onDrop={handleCanvasDrop}
        onClick={handleArenaClick}
        className="flex-1 h-full relative overflow-hidden select-none cursor-grab active:cursor-grabbing bg-radial from-[#0a0c10] to-[#040506] touch-none"
      >
        {/* Semi-transparent Selection Rectangle Overlay (Area Selection) */}
        {areaStart && areaEnd && (
          <div
            id="vtt-area-selection-box"
            className="absolute border border-cyan-400 bg-cyan-500/15 pointer-events-none z-50 rounded"
            style={{
              left: `${Math.min(areaStart.x, areaEnd.x)}px`,
              top: `${Math.min(areaStart.y, areaEnd.y)}px`,
              width: `${Math.abs(areaStart.x - areaEnd.x)}px`,
              height: `${Math.abs(areaStart.y - areaEnd.y)}px`,
            }}
          />
        )}

        {/* Dynamic drop indicator overlays for spectacular visual satisfaction */}
        {dragOverCanvasType && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-8 bg-[#0e1015]/80 backdrop-blur-md border-[4px] border-dashed border-indigo-500/50 m-4 rounded-3xl animate-in fade-in duration-200 pointer-events-none">
            <div className="text-center space-y-3 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto animate-bounce">
                {dragOverCanvasType === "map" ? <MapIcon className="w-8 h-8 text-indigo-400" /> : <Users className="w-8 h-8 text-indigo-400" />}
              </div>
              <p className="text-lg font-bold text-white uppercase tracking-wider">
                {dragOverCanvasType === "map" ? "Solte para Importar como Nova Arena!" : "Solte para Conjurar como Token!"}
              </p>
              <p className="text-xs text-neutral-400">Suporta JPG, PNG e WEBP</p>
            </div>
          </div>
        )}

        {/* Right floating compact lens adjustment cluster */}
        <div id="vtt-lens-controls" className={`absolute top-14 right-4 md:top-16 md:right-5 z-10 flex gap-0.5 md:gap-1 bg-black/40 border border-white/5 p-0.5 rounded-full backdrop-blur-xl shadow-lg transition-all duration-300 ${hideAllUI ? "opacity-0 translate-x-12 pointer-events-none" : "opacity-100"}`}>
          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 4.0))}
            className="p-1.5 md:p-2 rounded-full hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Aproximar Câmera"
          >
            <ZoomIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.2))}
            className="p-1.5 md:p-2 rounded-full hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Afastar Câmera"
          >
            <ZoomOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            onClick={resetCamera}
            className="p-1.5 md:p-2 rounded-full hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Recalibrar Visão"
          >
            <Target className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Dynamic VTT Scene Board */}
        {activeMap ? (
          <div
            id="vtt-canvas-world"
            className="origin-center transition-transform duration-75 select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              display: "inline-block",
              position: "absolute",
              left: "50%",
              top: "50%",
            }}
          >
            {/* Real tactical graphic background banner */}
            <img 
              id="vtt-mesh-underlay"
              src={activeMap.url}
              alt={activeMap.name}
              className="pointer-events-none select-none transition-all duration-300"
              style={{
                width: `${mapImageSize.width}px`,
                height: `${mapImageSize.height}px`,
                maxWidth: "none",
                maxHeight: "none"
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setMapImageSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                  });
                }
              }}
              referrerPolicy="no-referrer"
            />

            {/* Tactical Grid Overlay cells */}
            {activeMap.gridEnabled && (
              <GridMeshOverlay map={activeMap} width={mapImageSize.width} height={mapImageSize.height} />
            )}

            {/* Trainer ↔ Pokémon Links */}
            <TrainerPokemonLinks activeMap={activeMap} tokens={resolvedTokens} zoom={zoom} />

            {/* REAL-TIME drag-and-drop holographic position projection */}
            {dragCanvasTarget && (
              <div
                className="absolute pointer-events-none select-none z-30 flex items-center justify-center animate-pulse"
                style={{
                  left: `${dragCanvasTarget.x}px`,
                  top: `${dragCanvasTarget.y}px`,
                  width: `${dragCanvasTarget.size}px`,
                  height: `${dragCanvasTarget.size}px`,
                }}
              >
                {/* Tactical glowing outline (Contorno Luminoso) */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-400 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.65)] scale-105" />

                {/* Avatar Ghost Image with reduced opacity (Preview semitransparente) */}
                <div 
                  className="w-[88%] h-[88%] rounded-full bg-cover bg-center border border-indigo-300/40 opacity-60 bg-[#0e1014]"
                  style={{ backgroundImage: `url(${dragCanvasTarget.image})` }}
                  referrerPolicy="no-referrer"
                />

                {/* Cell Highlight Label tag */}
                <div className="absolute top-full mt-2 px-2 py-0.5 rounded-md bg-[#0b0c10]/95 border border-indigo-500/30 text-[9px] text-indigo-300 uppercase tracking-widest font-mono font-bold whitespace-nowrap shadow-lg">
                  Criar: {dragCanvasTarget.name}
                </div>
              </div>
            )}

            {/* DRAGGABLE INTERACTIVE TOKENS ON MAP */}
            {resolvedTokens.map((t) => {
              const sizePx = (activeMap.gridSize || 50) * t.size;
              const isTokenSelected = selectedTokenId === t.id;
              const isTokenHighlightSelected = selectedTokenId === t.id || selectedTokenIds.includes(t.id);
              const isCurrentCombatTurnToken = isCombatActive && combatParticipants[currentCombatTurn]?.tokenId === t.id;

              return (
                <div
                  key={t.id}
                  data-token-id={t.id}
                  onPointerDown={(e) => {
                    startTokenTouchHold(e, t);
                    handleTokenPointerDown(e, t);
                  }}
                  onPointerUp={(e) => {
                    cancelTokenTouchHold();
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch (err) {
                      // Ignore
                    }
                  }}
                  onPointerCancel={(e) => {
                    cancelTokenTouchHold();
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch (err) {
                      // Ignore
                    }
                  }}
                  onPointerLeave={() => {
                    cancelTokenTouchHold();
                  }}
                  onDoubleClick={(e) => {
                    if (t.trainerId) {
                      e.stopPropagation();
                      const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
                      if (tr) {
                        setActiveTrainerRecord(tr);
                        setIsViewTrainerModalOpen(true);
                      }
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTokenMovedRef.current) {
                      if (isMultiSelectActive) {
                        setSelectedTokenIds(prev => {
                          const isIncl = prev.includes(t.id);
                          const next = isIncl ? prev.filter(id => id !== t.id) : [...prev, t.id];
                          if (next.length === 1) {
                            setSelectedTokenId(next[0]);
                          } else if (next.length === 0) {
                            setSelectedTokenId(null);
                          } else {
                            setSelectedTokenId(next[next.length - 1]);
                          }
                          return next;
                        });
                      } else {
                        setSelectedTokenId(prev => {
                          const nextId = prev === t.id ? null : t.id;
                          setSelectedTokenIds(nextId ? [nextId] : []);
                          return nextId;
                        });
                      }
                    }
                  }}
                  className={`vtt-token-element absolute select-none group transition-shadow duration-150 touch-none cursor-grab active:cursor-grabbing hover:brightness-110 ${
                    isTokenHighlightSelected ? "z-40" : "z-20"
                  }`}
                  style={{
                    left: `${t.x}px`,
                    top: `${t.y}px`,
                    width: `${sizePx}px`,
                    height: `${sizePx}px`
                  }}
                >
                  {/* Premium spinning selection ring for Multi-Selection or Single Selection */}
                  {isTokenHighlightSelected && (
                    <div className="absolute -inset-1.5 border-[3.5px] border-dashed border-cyan-400 rounded-full animate-[spin_30s_linear_infinite] pointer-events-none z-30 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                  )}

                  {/* Active RPG Combat Turn Pulse Indicator */}
                  {isCurrentCombatTurnToken && (
                    <div className="absolute -inset-2.5 border-[4px] border-amber-500 rounded-full animate-pulse pointer-events-none z-35 shadow-[0_0_20px_rgba(245,158,11,0.85),inset_0_0_10px_rgba(245,158,11,0.5)]" />
                  )}

                  {/* Combat Tracker Focus Ping Visual */}
                  {combatHighlightTokenId === t.id && (
                    <div className="absolute -inset-5 border-[5px] border-emerald-400 rounded-full animate-ping pointer-events-none z-45" />
                  )}

                  {/* Dynamic RPG Animated Aura */}
                  {renderAuraOverlay(t.animatedAuraId, t.auraScale, t)}

                  {/* Touch Hold Progress Circle Indicator */}
                  {holdingTokenId === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center p-1 pointer-events-none z-50">
                      <svg className="w-full h-full transform -rotate-90 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          fill="transparent"
                          stroke="rgba(255, 255, 255, 0.15)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          fill="transparent"
                          stroke="url(#touchHoldGrad)"
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 45}`}
                          strokeDashoffset={`${2 * Math.PI * 45 * (1 - holdingProgress / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-75"
                        />
                        <defs>
                          <linearGradient id="touchHoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  )}

                  {/* Dynamic radial token visual wrapper */}
                  <div 
                    className={`w-full h-full p-0.5 flex items-center justify-center relative transition-transform duration-150 ${
                      t.allowTransparency && t.hideAura ? "" : "rounded-full"
                    } ${
                      t.allowTransparency ? "bg-transparent" : "bg-neutral-900"
                    } ${
                      t.allowTransparency
                        ? (isTokenHighlightSelected
                            ? "token-transparency-shadow-selected scale-[1.04]"
                            : "token-transparency-shadow hover:scale-[1.04]")
                        : (isTokenHighlightSelected 
                            ? (t.hideAura 
                                ? "shadow-[0_0_15px_rgba(255,255,255,0.6)] scale-[1.04]" 
                                : "shadow-[0_0_25px_rgba(255,255,255,0.7),0_0_10px_rgba(99,102,241,0.5)] scale-[1.04]")
                            : (t.hideAura 
                                ? "hover:scale-[1.04] hover:shadow-[0_0_8px_rgba(255,255,255,0.25)] shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                                : "hover:scale-[1.04] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"))
                    }`}
                    style={{ 
                      border: t.hideAura 
                        ? (t.allowTransparency ? "none" : "1.5px solid rgba(255,255,255,0.3)") 
                        : `3.5px solid ${t.color || "#3b82f6"}`,
                      "--token-glow-color": t.color || "#ffffff"
                    } as React.CSSProperties}
                  >
                    {/* Character Face Thumbnail */}
                    <div 
                      className={`w-full h-full bg-center pointer-events-none select-none ${
                        t.allowTransparency ? "bg-contain bg-no-repeat" : "bg-cover"
                      } ${
                        t.allowTransparency ? "" : "rounded-full"
                      }`}
                      style={{ 
                        backgroundImage: `url(${t.url})`,
                        transform: t.mirrored ? "scaleX(-1)" : undefined
                      }}
                    />

                    {/* Visual Proportional RPG HUD Area above/below Token depending on Context Menu State */}
                    {(() => {
                      const isHpBarHidden = t.hideHpBar || (!isCombatActive && t.hideHpBarOutOfCombat !== false);
                      const showHpText = !t.hideHpText && !isHpBarHidden;
                      return (!isHpBarHidden || showHpText || !isTokenSelected) && (
                        <div 
                          className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none select-none z-30 transition-all duration-200 ${
                            isTokenSelected ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+4px)]"
                          }`}
                          style={{
                            transform: `scale(${(() => {
                              const tScale = Math.max(0.8, Math.min(1.6, 0.75 + t.size * 0.25));
                              const cz = Math.max(0.65, Math.min(1.5, 0.95 / Math.sqrt(zoom)));
                              return tScale * cz;
                            })()})`,
                            transformOrigin: isTokenSelected ? "top center" : "bottom center",
                            width: `${Math.max(60, sizePx * 0.9)}px`
                          }}
                        >
                          {/* Compact high-contrast display label (Trainer/Pokemon Name) */}
                          {!isTokenSelected && (
                            <div className="bg-neutral-950/85 backdrop-blur-sm border border-white/10 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md whitespace-nowrap text-center leading-none">
                              {t.name}
                              {t.level !== undefined && t.pokemonId && (
                                <span className="text-[7.5px] text-neutral-400 font-mono ml-1 font-bold">Nv.{t.level}</span>
                              )}
                            </div>
                          )}

                          {/* HP Bar */}
                          {(t.hpMax ?? 0) > 0 && !isHpBarHidden && (
                          <div 
                            className="h-1.5 rounded-full bg-neutral-950/90 backdrop-blur-sm border border-white/15 overflow-hidden flex shadow-lg w-full"
                          >
                            <div 
                              className={`h-full transition-all duration-300 ${
                                (t.hpCurrent || 0) < (t.hpMax || 1) * 0.35 ? "bg-red-500" : "bg-emerald-500"
                              }`}
                              style={{ 
                                width: `${((t.hpCurrent || 0) / ((t.hpMax || 1) + (t.tempHp || 0))) * 100}%` 
                              }}
                            />
                            {(t.tempHp ?? 0) > 0 && (
                              <div 
                                className="h-full bg-sky-400 transition-all duration-300"
                                style={{ 
                                  width: `${((t.tempHp || 0) / ((t.hpMax || 1) + (t.tempHp || 0))) * 100}%` 
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* High-visibility High-contrast life numbers text */}
                        {(t.hpMax ?? 0) > 0 && showHpText && (
                          <div className="bg-neutral-950/90 border border-white/15 rounded-full px-2 py-0.5 text-[9.5px] font-mono font-black whitespace-nowrap shadow-lg flex items-center gap-0.5 text-white tracking-wide border-t-emerald-500/20">
                            <span className={(t.hpCurrent || 0) < (t.hpMax || 1) * 0.35 ? "text-red-400 font-extrabold" : "text-emerald-400 font-extrabold"}>
                              {t.hpCurrent}
                            </span>
                            {(t.tempHp ?? 0) > 0 && (
                              <span className="text-sky-300 font-black">+{t.tempHp}</span>
                            )}
                            <span className="opacity-40">/</span>
                            <span className="opacity-85">{t.hpMax}</span>
                          </div>
                        )}

                        {/* Active Status Conditions and Combat Stages indicators */}
                        {t.pokemonId && (t.statusStages || t.statusConditions) && (
                          <div id="vtt-status-ribbon" className="flex flex-wrap gap-1 items-center justify-center pointer-events-auto max-w-full mt-1 bg-neutral-950/75 p-0.5 px-1 rounded-md border border-white/5 backdrop-blur-xs select-none">
                            {/* Non-Volatile Status */}
                            {t.statusConditions?.nonVolatile && (() => {
                              const condKey = t.statusConditions.nonVolatile;
                              const meta = CONDITION_META[condKey];
                              if (!meta) return null;
                              return (
                                <div 
                                  key={condKey}
                                  id={`token-status-badge-${condKey}`}
                                  className="group/cond relative flex items-center justify-center w-5 h-5 rounded bg-neutral-900 border border-white/10 shadow-sm cursor-help hover:border-indigo-400 transition-all"
                                  title={`${meta.name}: ${meta.description}`}
                                >
                                  <span className="w-3.5 h-3.5 text-white flex items-center justify-center" style={{ color: meta.color }}>
                                    {getStatusIconSvg(condKey)}
                                  </span>
                                  {/* Custom elegant hover tooltip */}
                                  <div id={`tooltip-${condKey}`} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cond:flex flex-col items-center z-[100] pointer-events-none">
                                    <div className="bg-neutral-950/95 border border-white/15 px-2 py-1 rounded-md text-[9px] text-[#ffffffd0] font-sans whitespace-nowrap shadow-xl">
                                      <span className="font-extrabold" style={{ color: meta.color }}>{meta.name}</span>
                                      <p className="text-[8px] text-neutral-400 font-medium leading-normal max-w-[140px] whitespace-normal mt-0.5">{meta.description}</p>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-neutral-950 rotate-45 border-r border-b border-white/15 -mt-1" />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Volatile Statuses */}
                            {t.statusConditions?.volatile?.map((condKey) => {
                              const meta = CONDITION_META[condKey];
                              if (!meta) return null;
                              return (
                                <div 
                                  key={condKey}
                                  id={`token-status-badge-${condKey}`}
                                  className="group/cond relative flex items-center justify-center w-5 h-5 rounded bg-neutral-900 border border-white/10 shadow-sm cursor-help hover:border-indigo-400 transition-all"
                                  title={`${meta.name}: ${meta.description}`}
                                >
                                  <span className="w-3.5 h-3.5 text-white flex items-center justify-center" style={{ color: meta.color }}>
                                    {getStatusIconSvg(condKey)}
                                  </span>
                                  {/* Custom elegant hover tooltip */}
                                  <div id={`tooltip-${condKey}`} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cond:flex flex-col items-center z-[100] pointer-events-none">
                                    <div className="bg-neutral-950/95 border border-white/15 px-2 py-1 rounded-md text-[9px] text-[#ffffffd0] font-sans whitespace-nowrap shadow-xl">
                                      <span className="font-extrabold" style={{ color: meta.color }}>{meta.name}</span>
                                      <p className="text-[8px] text-neutral-400 font-medium leading-normal max-w-[140px] whitespace-normal mt-0.5">{meta.description}</p>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-neutral-950 rotate-45 border-r border-b border-white/15 -mt-1" />
                                  </div>
                                </div>
                              );
                            })}

                            {/* Attribute Stages */}
                            {t.statusStages && Object.entries(t.statusStages).map(([stageName, val]) => {
                              const valNum = val as number;
                              if (!valNum || valNum === 0) return null;
                              const meta = STAGE_META[stageName as keyof typeof STAGE_META];
                              if (!meta) return null;
                              const isPositive = valNum > 0;
                              return (
                                <div 
                                  key={stageName}
                                  id={`token-stage-badge-${stageName}`}
                                  className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[7.5px] font-extrabold font-mono border uppercase tracking-wider ${
                                    isPositive 
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                  }`}
                                  title={`Modificador de ${meta.label}: ${isPositive ? "+" : ""}${valNum} (Limites: -6 a +6)`}
                                >
                                  <span>{meta.label.substring(0, 3)}</span>
                                  <span>{isPositive ? "+" : ""}{valNum}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                    {/* CONTEXT MENUS UNDERLAY AND OVERLAYS PATTERNS */}
                    {isTokenSelected && (
                      t.pokemonId ? (
                        /* POKÉMON EXCLUSIVE COMBAT CONTEXT MENU */
                        <div
                          id="vtt-token-context-menu-pokemon"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()} 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-[#090b0e]/95 backdrop-blur-md border border-red-500/30 p-1 rounded-xl shadow-[0_8px_32px_rgba(239,68,68,0.25),0_4px_12px_rgba(0,0,0,0.85)] flex items-center gap-1 md:gap-1.5 z-55 cursor-default overflow-visible animate-in zoom-in-95 duration-150"
                          style={{
                            transform: `scale(${(() => {
                              const isMob = window.innerWidth < 768;
                              const baseSc = 1 / zoom;
                              const maxSc = isMob ? 1.15 : 1.4;
                              const minSc = isMob ? 0.8 : 0.8;
                              return Math.min(maxSc, Math.max(minSc, baseSc));
                            })()})`,
                            transformOrigin: "bottom center"
                          }}
                        >
                          {/* Pokémon Name & Level Trigger */}
                          <div className="flex flex-col gap-0.5 border-r border-white/10 pr-2 md:pr-2.5 select-none pl-1 md:pl-2">
                            <span className="text-[7.5px] uppercase tracking-wider text-red-400 font-extrabold leading-none flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> Pokemon
                            </span>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId) || allAvailableTrainerRecords.find(r => r.pokemon?.some(poke => poke.id === t.pokemonId));
                                 if (tr) {
                                   const pk = tr.pokemon?.find(poke => poke.id === t.pokemonId);
                                   if (pk) {
                                     setActiveTrainerRecord(tr);
                                     setTrainerActiveTab("equipe");
                                     setIsViewTrainerModalOpen(true);
                                     initializePokemonForm(pk);
                                   } else {
                                     setActiveTrainerRecord(tr);
                                     setTrainerActiveTab("equipe");
                                     setIsViewTrainerModalOpen(true);
                                   }
                                 }
                               }}
                               className="bg-transparent border-0 p-0 text-left cursor-pointer transition-all duration-200 group/pknm text-white flex flex-col items-start"
                               title="Clique para abrir a ficha completa do Pokémon"
                             >
                              <span className="text-[10px] md:text-xs font-black tracking-wide group-hover/pknm:text-red-400 leading-tight truncate max-w-[80px] md:max-w-[110px]">
                                {t.name}
                              </span>
                              {t.level !== undefined && (
                                <span className="text-[8px] md:text-[9.5px] font-mono text-neutral-400 font-bold leading-none mt-0.5">
                                  Nv. {t.level}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* HP Combat Controller */}
                          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 md:pr-2.5">
                            <div className="flex flex-col gap-0.5 select-none">
                              <span className="text-[7px] md:text-[7.5px] uppercase tracking-wider text-[#ffffff60] font-bold leading-none">Ajustar HP</span>
                              <span className="text-[8px] md:text-[9.5px] font-mono text-emerald-400 font-bold leading-none mt-0.5">
                                {t.hpCurrent}/{t.hpMax}
                              </span>
                            </div>
                            <input 
                              type="text"
                              inputMode={isIOSDevice ? "text" : "tel"}
                              pattern="[+-]?[0-9]*"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck="false"
                              value={healthInputText}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^[+-]?\d*$/.test(val)) {
                                  setHealthInputText(val);
                                }
                              }}
                              onFocus={(e) => {
                                setIsHealthInputFocused(true);
                                setHealthInputText("");
                                e.currentTarget.select();
                              }}
                              onKeyDown={(e) => { 
                                if (e.key === "Enter") { 
                                  e.currentTarget.blur(); 
                                } 
                              }}
                              onBlur={() => {
                                handleHealthInputCommit();
                                setIsHealthInputFocused(false);
                              }}
                              className="w-10 md:w-12 bg-white/5 border border-white/10 text-center text-xs font-mono rounded-lg py-0.5 md:py-1 px-1 text-white focus:outline-none focus:border-red-500 transition-colors placeholder-white/20 shadow"
                              placeholder={t.hpCurrent !== undefined ? String(t.hpCurrent) : "HP"}
                            />
                          </div>

                          {/* POKÉBOLA (Recall or Swap Menu Toggle) */}
                          <div className="relative group/pokeball flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePokeballRadialTokenId(activePokeballRadialTokenId === t.id ? null : t.id);
                              }}
                              className={`p-1.5 md:p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95 ${
                                activePokeballRadialTokenId === t.id
                                  ? "bg-red-600 border-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                                  : "bg-neutral-800/40 border-white/5 text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-red-500/30 hover:shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                              }`}
                              title="Ações de Pokébola"
                            >
                              <PokebolaIcon size={14} className={activePokeballRadialTokenId === t.id ? "animate-spin" : "transition-transform group-hover/pokeball:rotate-12"} />
                            </button>

                            {/* Tooltip for Pokébola Button - only show if sub-menu is not open */}
                            {activePokeballRadialTokenId !== t.id && (
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/pokeball:flex flex-col items-center z-[110] animate-in fade-in slide-in-from-bottom-1 duration-150">
                                <div className="bg-[#050608]/95 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-xl text-center whitespace-nowrap min-w-[120px]">
                                  <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">Pokébola</span>
                                  <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[140px]">
                                    Recolher ou substituir este Pokémon da equipe.
                                  </span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                              </div>
                            )}

                            {/* Floating mini radial-menu for Pokebola options */}
                            <AnimatePresence>
                              {activePokeballRadialTokenId === t.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.3, rotate: -180, y: 15 }}
                                  animate={{ 
                                    opacity: 1, 
                                    scale: 1, 
                                    rotate: 0, 
                                    y: 0,
                                    transition: {
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 18
                                    }
                                  }}
                                  exit={{ 
                                    opacity: 0, 
                                    scale: 0.4, 
                                    rotate: 180, 
                                    y: 10,
                                    transition: { duration: 0.18 }
                                  }}
                                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto z-[200]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Background Arc Plate */}
                                  <div className="flex gap-2 p-1.5 bg-[#07080b]/98 border border-white/10 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.95)] backdrop-blur-md relative items-center">
                                    
                                    {/* RECOLHER / RECALL OPTION */}
                                    <div className="group/recall relative flex items-center justify-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Create capturing effect coordinates
                                          const tokenPixelSize = (activeMap?.gridSize || 70) * t.size;
                                          const effectCenterX = t.x + tokenPixelSize / 2;
                                          const effectCenterY = t.y + tokenPixelSize / 2;
                                          triggerVttEffect(effectCenterX, effectCenterY, 'recall', t.url, t.size);

                                          // Execute actions
                                          setTokens(prev => prev.filter(tok => tok.id !== t.id));
                                          setSelectedTokenId(null);
                                          setActivePokeballRadialTokenId(null);
                                          setNotification(`${t.name} recolhido de volta para a Pokébola!`);
                                        }}
                                        className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-neutral-950 hover:shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                      >
                                        <RecallIcon size={18} />
                                      </button>
                                      
                                      {/* Tooltip for Recolher Option */}
                                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/recall:flex flex-col items-center z-[210] animate-in fade-in slide-in-from-bottom-1 duration-150">
                                        <div className="bg-[#050608]/98 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-2xl text-center whitespace-nowrap min-w-[124px]">
                                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">Recolher Pokémon</span>
                                          <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[130px]">
                                            Retorna o Pokémon de volta para a Pokébola de origem.
                                          </span>
                                        </div>
                                        <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                                      </div>
                                    </div>

                                    <div className="w-px h-6 bg-white/10" />

                                    {/* SUBSTITUIR / SWAP OPTION */}
                                    <div className="group/swap relative flex items-center justify-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Open substitute modal patterns
                                          setSubstitutingTokenId(t.id);
                                          setActivePokeballTrainerId(t.trainerId!);
                                          setPokeballViewMode("owner");
                                          
                                          // Close menus
                                          setActivePokeballRadialTokenId(null);
                                          setSelectedTokenId(null);
                                        }}
                                        className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                      >
                                        <SwapIcon size={18} />
                                      </button>

                                      {/* Tooltip for Substituir Option */}
                                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/swap:flex flex-col items-center z-[210] animate-in fade-in slide-in-from-bottom-1 duration-150">
                                        <div className="bg-[#050608]/98 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-2xl text-center whitespace-nowrap min-w-[124px]">
                                          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">Substituir Pokémon</span>
                                          <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[130px]">
                                            Substitui este Pokémon por outro companheiro da equipe.
                                          </span>
                                        </div>
                                        <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                                      </div>
                                    </div>

                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* [Espelhar] Button */}
                          <div className="relative group/mirror flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTokenProperty(t.id, "mirrored", !t.mirrored);
                              }}
                              className={`p-1.5 md:p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95 ${
                                t.mirrored 
                                  ? "bg-indigo-600/90 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.35)]" 
                                  : "bg-neutral-800/40 border-white/5 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                              }`}
                              title="Espelhar Sprite Horizontalmente"
                            >
                              <MirrorIcon size={14} className="transition-transform group-hover/mirror:scale-110" />
                            </button>

                            {/* Tooltip for Espelhar */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/mirror:flex flex-col items-center z-[110] animate-in fade-in slide-in-from-bottom-1 duration-150">
                              <div className="bg-[#050608]/95 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-xl text-center whitespace-nowrap min-w-[120px]">
                                <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">Espelhar Token</span>
                                <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[140px]">
                                  Reflete horizontalmente a fisionomia do Pokémon.
                                </span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                            </div>
                          </div>

                          {/* [Estágios (Mudanças de Status)] Button */}
                          <div className="relative group/stages flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRadialMenu({ tokenId: t.id, type: "stages" });
                              }}
                              className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_8px_rgba(16,185,129,0.35)] transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95"
                              title="Estágios de Atributos"
                            >
                              <StagesIcon size={14} className="transition-transform group-hover/stages:translate-y-[-1px]" />
                            </button>

                            {/* Tooltip for Estágios */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/stages:flex flex-col items-center z-[110] animate-in fade-in slide-in-from-bottom-1 duration-150">
                              <div className="bg-[#050608]/95 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-xl text-center whitespace-nowrap min-w-[120px]">
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">Estágios de Atributos</span>
                                <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[140px]">
                                  Modificadores temporários de atributos (-6 a +6) ativos.
                                </span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                            </div>
                          </div>

                          {/* [Condições de Status] Button */}
                          <div className="relative group/status flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRadialMenu({ tokenId: t.id, type: "conditions" });
                              }}
                              className="p-1.5 md:p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:shadow-[0_0_8px_rgba(244,63,94,0.35)] transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95"
                              title="Mudanças de Condição"
                            >
                              <StatusIcon size={14} className="transition-transform group-hover/status:rotate-45 duration-350" />
                            </button>

                            {/* Tooltip for Status */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/status:flex flex-col items-center z-[110] animate-in fade-in slide-in-from-bottom-1 duration-150">
                              <div className="bg-[#050608]/95 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-xl text-center whitespace-nowrap min-w-[120px]">
                                <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block">Condições de Status</span>
                                <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[140px]">
                                  Aplica sono, veneno, confusão e outras condições.
                                </span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                            </div>
                          </div>

                          {/* [Resumo de Combate TCG Card] Button */}
                          <div className="relative group/inspector flex items-center justify-center">
                            <button
                              data-combat-card-trigger={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (t.pokemonId) {
                                  const cardKey = t.id;
                                  const existing = combatSummaryCards[cardKey];
                                  if (existing?.isVisible) {
                                    // Close the card
                                    setCombatSummaryCards(prev => ({ ...prev, [cardKey]: { ...prev[cardKey], isVisible: false } }));
                                  } else {
                                    // Open the card at center of viewport
                                    const vw = window.innerWidth;
                                    const vh = window.innerHeight;
                                    setCombatSummaryCards(prev => ({
                                      ...prev,
                                      [cardKey]: {
                                        x: Math.max(20, (vw / 2) - 160),
                                        y: Math.max(20, (vh / 2) - 280),
                                        isVisible: true,
                                      }
                                    }));
                                  }
                                }
                              }}
                              className={`p-1.5 md:p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95 ${
                                (t.pokemonId && combatSummaryCards[t.id]?.isVisible)
                                  ? "bg-red-500/20 border-red-500 text-red-400 hover:text-white hover:shadow-[0_0_8px_rgba(239,68,68,0.35)]" 
                                  : "bg-neutral-800/40 border border-white/5 text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-red-500/25"
                              }`}
                              title="Resumo de Combate TCG"
                            >
                              <Info size={14} className="transition-transform group-hover/inspector:scale-110" />
                            </button>

                            {/* Tooltip for Resumo de Combate */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/inspector:flex flex-col items-center z-[110] animate-in fade-in slide-in-from-bottom-1 duration-150">
                              <div className="bg-[#050608]/95 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-xl text-center whitespace-nowrap min-w-[120px]">
                                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider block">Card de Combate</span>
                                <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[140px]">
                                  Abre card TCG arrastável com vida, fraquezas, moves e atributos.
                                </span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                            </div>
                          </div>

                          {/* [Configurações] Button */}
                          <div className="relative group/settings flex items-center justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTokenSettingsId(t.id);
                              }}
                              className="p-1.5 md:p-2 rounded-lg bg-neutral-800/40 border border-white/5 text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-white/20 hover:shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95"
                              title="Configurações do Token Pokémon"
                            >
                              <SettingsIcon size={14} className="transition-transform group-hover/settings:rotate-45 duration-550" strokeWidth={2} />
                            </button>

                            {/* Tooltip for Configurações */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover/settings:flex flex-col items-center z-[110] animate-in fade-in slide-in-from-bottom-1 duration-150">
                              <div className="bg-[#050608]/95 border border-white/10 p-1.5 px-2.5 rounded-lg shadow-xl text-center whitespace-nowrap min-w-[120px]">
                                <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">Configurações</span>
                                <span className="text-[8.5px] text-neutral-400 font-medium leading-normal block mt-0.5 whitespace-normal max-w-[140px]">
                                  Configurar tamanho, visual, auras e vínculos adicionais.
                                </span>
                              </div>
                              <div className="w-1.5 h-1.5 bg-[#050608] rotate-45 border-r border-b border-white/10 -mt-1" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* TRAINER / ADMINISTRATIVE EXCLUSIVE CONTEXT MENU */
                        <div 
                          id="vtt-token-context-menu"
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()} 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-[#090b0e]/95 backdrop-blur-md border border-indigo-500/30 p-1 md:p-1.5 rounded-xl shadow-[0_8px_32px_rgba(99,102,241,0.2),0_4px_12px_rgba(0,0,0,0.8)] flex items-center gap-1.5 md:gap-2.5 z-55 cursor-default anim-in zoom-in-95 duration-155"
                          style={{
                            transform: `scale(${(() => {
                              const isMob = window.innerWidth < 768;
                              const baseSc = 1 / zoom;
                              const maxSc = isMob ? 1.15 : 1.4;
                              const minSc = isMob ? 0.8 : 0.8;
                              return Math.min(maxSc, Math.max(minSc, baseSc));
                            })()})`,
                            transformOrigin: "bottom center"
                          }}
                        >
                          {/* Token name or ficha trigger */}
                          <div className="flex flex-col gap-0.5 border-r border-white/10 pr-2 md:pr-2.5 select-none pl-1 md:pl-2">
                            {t.trainerId ? (
                              (() => {
                                const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId);
                                return (
                                  <>
                                    <span className="text-[7.5px] uppercase tracking-wider text-amber-400 font-extrabold leading-none">Treinador</span>
                                    <button
                                      onClick={() => {
                                        if (tr) {
                                          setActiveTrainerRecord(tr);
                                          setIsViewTrainerModalOpen(true);
                                        }
                                      }}
                                      className="bg-transparent border-0 p-0 text-[10px] md:text-xs font-bold text-white hover:text-indigo-400 cursor-pointer max-w-[80px] md:max-w-[110px] truncate text-left transition-colors flex items-center gap-0.5"
                                      title="Clique para abrir a ficha do personagem"
                                    >
                                      <span className="truncate leading-tight font-black">{t.name}</span>
                                      <span className="text-[8px] text-amber-400">↗</span>
                                    </button>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <span className="text-[7.5px] uppercase tracking-wider text-neutral-400 font-bold leading-none">Renomear</span>
                                <input 
                                  type="text" 
                                  value={t.name}
                                  onChange={(e) => updateTokenName(t.id, e.target.value)}
                                  className="bg-transparent text-[10px] md:text-xs text-white border-0 font-bold focus:ring-0 focus:outline-none p-0 max-w-[80px] md:max-w-[110px] truncate placeholder-neutral-500"
                                  placeholder="Renomear..."
                                />
                              </>
                            )}
                          </div>

                          {/* HP Treinador Controller */}
                          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 md:pr-2.5">
                            <div className="flex flex-col gap-0.5 select-none">
                              <span className="text-[7px] md:text-[7.5px] uppercase tracking-wider text-[#ffffff60] font-bold leading-none">HP Treinador</span>
                              <span className="text-[8px] md:text-[9.5px] font-mono text-indigo-400 font-bold leading-none mt-0.5">
                                {t.hpCurrent !== undefined ? `${t.hpCurrent}/${t.hpMax}` : "HP"}
                              </span>
                            </div>
                            <input 
                              type="text"
                              inputMode={isIOSDevice ? "text" : "tel"}
                              pattern="[+-]?[0-9]*"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck="false"
                              value={healthInputText}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^[+-]?\d*$/.test(val)) {
                                  setHealthInputText(val);
                                }
                              }}
                              onFocus={(e) => {
                                setIsHealthInputFocused(true);
                                setHealthInputText("");
                                e.currentTarget.select();
                              }}
                              onKeyDown={(e) => { 
                                if (e.key === "Enter") { 
                                  e.currentTarget.blur(); 
                                } 
                              }}
                              onBlur={() => {
                                handleHealthInputCommit();
                                setIsHealthInputFocused(false);
                              }}
                              className="w-10 md:w-12 bg-white/5 border border-white/10 text-center text-xs font-mono rounded-lg py-0.5 md:py-1 px-1 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-white/20"
                              placeholder={t.hpCurrent !== undefined ? String(t.hpCurrent) : "HP"}
                            />
                          </div>

                          {/* Pokéball system shortcut for active trainer records */}
                          {t.trainerId && (
                            <div className="flex items-center border-r border-[#ffffff15] pr-2 md:pr-2.5 gap-1.5 animate-in slide-in-from-left duration-200">
                              <button
                                onClick={() => {
                                  setSelectedPokeballTrainerId(t.trainerId!);
                                  setActivePokeballTrainerId(t.trainerId!);
                                  setPokeballViewMode("owner");
                                }}
                                className="p-1 md:p-1.5 px-2 md:px-2.5 text-[8px] md:text-[9px] uppercase font-bold tracking-wider rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center gap-1 md:gap-1.5 shadow"
                                title="Acessar Pokébola do Treinador"
                              >
                                <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border border-neutral-900 relative overflow-hidden flex flex-col shrink-0">
                                  <div className="flex-1 bg-gradient-to-r from-red-500 to-red-600 animate-pulse" />
                                  <div className="h-[1.5px] bg-neutral-950 absolute top-[5.2px] md:top-[6px] left-0 right-0 z-10" />
                                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white border border-neutral-950 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
                                  <div className="flex-1 bg-white" />
                                </div>
                                <span>Pokébola</span>
                              </button>
                            </div>
                          )}

                          {/* Token detailed Settings trigger */}
                          <div className="flex items-center border-r border-[#ffffff15] pr-2 md:pr-2.5">
                            <button
                              onClick={() => setEditingTokenSettingsId(t.id)}
                              className="p-1 md:p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow"
                              title="Configurar Personagem"
                            >
                              <Settings className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                          </div>

                          {/* Ban / Trash trigger */}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteToken(t.id);
                            }}
                            className="p-1 md:p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                            title="Banir de Mesa"
                          >
                            <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                          </button>
                        </div>
                      )
                    )}

                    <AnimatePresence>
                      {isTokenSelected && isCombatInspectorOpen && t.pokemonId && (() => {
                        const tr = allAvailableTrainerRecords.find(r => r.id === t.trainerId) || allAvailableTrainerRecords.find(r => r.pokemon?.some(poke => poke.id === t.pokemonId));
                        const pk = tr?.pokemon?.find(poke => poke.id === t.pokemonId);
                        if (!pk) return null;
                        return (
                          <CombatInspector
                            token={t}
                            pokemon={pk}
                            zoom={zoom}
                            activeMapWidth={activeMap.width || 2000}
                            onUpdatePP={(moveSlot, newPP) => updatePokemonMovePP(t.id, moveSlot, newPP)}
                            onClose={() => {
                              setIsCombatInspectorOpen(false);
                              setManuallyClosedTokenId(t.id);
                            }}
                            POKEMON_TYPES_STYLING={POKEMON_TYPES_STYLING}
                            calculateMatchups={calculateMatchups}
                            ensureMoveObj={ensureMoveObj}
                          />
                        );
                      })()}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {/* SPECTACULAR POKEBALL RECALL / SUMMON OVERLAY ANIMATION FX */}
            {vttEffects.map((eff) => {
              const gridSize = activeMap?.gridSize || 50;
              const sizePx = gridSize * eff.size * 1.5;
              return (
                <div
                  key={eff.id}
                  className="absolute pointer-events-none z-45 flex items-center justify-center origin-center"
                  style={{
                    left: eff.x,
                    top: eff.y,
                    transform: "translate(-50%, -50%)",
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                  }}
                >
                  {eff.type === "summon" ? (
                    <>
                      {/* Shockwave expanding ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-red-500/80 animate-summon-pulse" />
                      
                      {/* Pillar of Materialization Light */}
                      <div className="absolute w-[40%] h-[500%] bottom-1/2 bg-gradient-to-t from-red-500/85 via-white to-transparent blur-md rounded-t-full animate-summon-beam origin-bottom" />
                      
                      {/* Expanding bright flash portal */}
                      <div className="absolute inset-4 rounded-full bg-radial from-white via-red-200/50 to-transparent animate-ping" />
                      
                      {/* Ghost-in rising sprite preview */}
                      {eff.imageUrl && (
                        <img
                          src={eff.imageUrl}
                          alt=""
                          className="absolute w-2/3 h-2/3 object-contain opacity-70 animate-bounce"
                          style={{ filter: "brightness(1.5) drop-shadow(0 0 8px rgba(255, 255, 255, 0.75))" }}
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* Collapsing red recall vortex */}
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-red-500 animate-recall-pull flex items-center justify-center"
                      >
                        {eff.imageUrl && (
                          <img
                            src={eff.imageUrl}
                            alt=""
                            className="w-4/5 h-4/5 object-contain opacity-70"
                            style={{ filter: "brightness(2) sepia(1) hue-rotate(-50deg)" }}
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

          </div>
        ) : (
          /* Sleek Minimal welcome target indicator if empty catalog map */
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="relative text-center max-w-sm border border-white/10 rounded-2xl bg-[#0f1115]/85 backdrop-blur-3xl px-8 py-10 shadow-2xl space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center mx-auto animate-pulse">
                <MapIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-rose-500 tracking-widest uppercase flex items-center justify-center gap-1.5">
                  🔴 PokeVTT5e Arena
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                  Sua mesa virtual definitiva para combates de Pokémon RPG na 5ª Edição! Solte uma imagem de mapa na tela ou carregue uma arena da biblioteca para invocar seus tokens e iniciar o combate.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1 font-semibold">
                <button
                  onClick={() => setActiveTab("maps")}
                  className="w-full text-xs py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all active:scale-95 duration-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Abrir Módulo de Arenas
                </button>
                <button
                  onClick={() => setIsWelcomeModalOpen(true)}
                  className="w-full text-xs py-2 bg-[#12131a]/80 hover:bg-[#1a1b26] border border-indigo-500/20 text-indigo-300 rounded-xl transition-all active:scale-95 duration-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Abrir Painel Multiplayer Online
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. TRANSLUCENT STATUS BANNER (FOOTER & PRESENCE) */}
        {!hideAllUI && (
          <div 
            id="vtt-lens-footer-container"
            className="absolute bottom-3 right-3 z-30 flex items-center gap-2 pointer-events-auto transition-all duration-300"
          >
            {/* Scale / Status Tag */}
            <div 
              id="vtt-lens-footer"
              className="bg-black/50 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5 sm:gap-2 shadow-md hover:bg-neutral-900/60 transition-all"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
              <span className="hidden sm:inline text-neutral-300">Arena</span>
              <span className="text-white/10 hidden sm:inline">|</span>
              <span className="font-mono text-neutral-300">Escala: {Math.round(zoom * 100)}%</span>
            </div>

            {/* Dynamic Presence Indicator Button */}
            <div className="relative">
              <button
                onClick={() => setIsPlayersPanelOpen(!isPlayersPanelOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-md transition-all cursor-pointer pointer-events-auto select-none font-bold text-[9px] sm:text-[10px] uppercase tracking-wider
                  ${isPlayersPanelOpen 
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-105" 
                    : "bg-black/50 hover:bg-neutral-900 border-white/5 text-neutral-300 hover:text-white"
                  }
                `}
                title="Presença de Jogadores"
              >
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
                <span>{sessionPlayers.length}</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </button>

              {/* Popover showing players list (expands upwards & leftwards, resolves to nice bottom drawer on mobile) */}
              {isPlayersPanelOpen && (
                <>
                  {/* Backdrop Overlay - custom dimmed backdrop on mobile for superior focus, transparent on desktop */}
                  <div 
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1.5px] sm:bg-transparent sm:backdrop-blur-none cursor-default transition-all duration-200 animate-in fade-in" 
                    onClick={() => setIsPlayersPanelOpen(false)}
                  />
                  
                  <div 
                    id="vtt-session-players-popover"
                    className="fixed bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/10 bg-[#07080c]/98 backdrop-blur-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.92)] p-4 pb-6 flex flex-col gap-2.5 z-50 transition-all duration-300 origin-bottom transform animate-in slide-in-from-bottom duration-250 ease-out sm:absolute sm:bottom-full sm:left-auto sm:right-0 sm:top-auto sm:mb-2.5 sm:w-64 sm:rounded-2xl sm:border sm:shadow-[0_12px_36px_rgba(0,0,0,0.95),0_0_12px_rgba(99,102,241,0.15)] sm:p-3 sm:pb-3 sm:max-w-[calc(100vw-32px)] sm:animate-in sm:fade-in sm:slide-in-from-bottom-4 sm:zoom-in-95"
                  >
                    {/* Visual drag handle/indicator shown only on mobile */}
                    <div className="sm:hidden flex justify-center pb-2 shrink-0">
                      <div 
                        className="w-12 h-1 bg-white/20 rounded-full cursor-pointer hover:bg-white/30" 
                        onClick={() => setIsPlayersPanelOpen(false)}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider text-neutral-300 uppercase">
                          Presenças ({sessionPlayers.length})
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsPlayersPanelOpen(false)}
                        className="text-neutral-500 hover:text-rose-450 text-xs cursor-pointer px-1 py-0.5 rounded transition-all leading-none"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Compact Scrollable List */}
                    <div className="flex flex-col gap-1.5 max-h-32 sm:max-h-40 overflow-y-auto custom-scrollbar pr-0.5 py-0.5 animate-in fade-in duration-100">
                      {sessionPlayers.length === 0 ? (
                        <span className="text-[9px] text-neutral-500 italic py-2 text-center font-semibold">Nenhum jogador na sala</span>
                      ) : (
                        sessionPlayers.map((player, idx) => (
                          <div key={idx} className="flex items-center justify-between group/player text-[9.5px] sm:text-[10px] text-neutral-200 bg-white/[0.02] hover:bg-white/[0.04] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all border border-white/[0.02]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-emerald-400 font-mono text-[8px]">•</span>
                              <span className="truncate font-bold tracking-wide">{player}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSessionPlayers(prev => prev.filter((_, i) => i !== idx))}
                              className="text-neutral-500 hover:text-rose-400 opacity-60 hover:opacity-100 transition-all p-0.5 cursor-pointer text-[11px] font-bold leading-none"
                              title="Remover"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Player Form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const clean = newPlayerNameInput.trim();
                        if (clean) {
                          if (!sessionPlayers.includes(clean)) {
                            setSessionPlayers(prev => [...prev, clean]);
                          }
                          setNewPlayerNameInput("");
                        }
                      }}
                      className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-white/5"
                    >
                      <input 
                        type="text" 
                        placeholder="Nome..." 
                        value={newPlayerNameInput}
                        onChange={(e) => setNewPlayerNameInput(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none focus:border-indigo-400 focus:bg-white/10 transition-all placeholder-white/20 font-bold"
                      />
                      <button 
                        type="submit"
                        className="bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg px-2 py-1 text-[9px] font-bold transition-all flex items-center justify-center cursor-pointer h-[21px]"
                        title="Adicionar"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Instant floating notifications box */}
        {notification && (
          <div className="vtt-achievement-toast absolute top-24 right-4 md:top-auto md:bottom-16 md:right-5 z-20 px-4 py-3 bg-[#0b0d1c]/92 backdrop-blur-xl rounded-2xl text-xs font-bold text-neutral-100 border border-indigo-300/25 shadow-[0_18px_42px_rgba(0,0,0,0.55),0_0_24px_rgba(99,102,241,0.28)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-150">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-300/25 bg-indigo-400/10 shadow-[0_0_18px_rgba(99,102,241,0.25)]">
              <Info className="w-4 h-4 text-indigo-200" />
            </span>
            <span className="leading-snug">{notification}</span>
          </div>
        )}

        {/* Token Settings Overlay Modal */}
        <AnimatePresence>
          {editingToken && (
            <motion.div
              key="token-settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setEditingTokenSettingsId(null)}
              onWheel={(e) => e.stopPropagation()}
            >
              <motion.div
                key="token-settings-modal"
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-[#0e1014]/98 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white transform cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">Configuração do Token</h3>
                  </div>
                  <button
                    onClick={() => setEditingTokenSettingsId(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Token Profile View, Name and Image replacement with highly tactical arena preview */}
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3 shadow-inner">
                    <div className="flex items-center gap-4">
                      {/* Live preview of selected animated aura inside testing ground */}
                      <div className="relative flex items-center justify-center w-20 h-20 rounded-xl bg-black/45 border border-white/10 overflow-hidden flex-shrink-0 shadow-lg" style={{ backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 80%)" }}>
                        {/* Soft map-like grid background simulation */}
                        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
                        
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          {/* Live preview of selected animated aura with real-time responsive spacing */}
                          {tempAuraId && renderAuraOverlay(
                            tempAuraId, 
                            tempAuraScale, 
                            undefined,
                            tempAuraIntensity,
                            tempAuraOpacity,
                            tempAuraParticleCount,
                            tempAuraAnimationSpeed,
                            tempAuraColorPrimary,
                            tempAuraColorSecondary,
                            tempAuraEnableGlow,
                            tempAuraEnableDistortion
                          )}
                          
                          <div 
                            className="w-12 h-12 rounded-full border-2 flex-shrink-0 bg-cover bg-center shadow-md relative z-10 transition-all duration-150"
                            style={{ 
                              backgroundImage: `url(${editingToken.url})`,
                              borderColor: editingToken.color 
                            }}
                          />
                        </div>
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 border border-white/10 text-[7px] text-indigo-300 font-bold uppercase tracking-wider scale-95 origin-bottom-right">
                          PREVIEW
                        </div>
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Nome do Token</span>
                        <input 
                          type="text" 
                          value={editingToken.name}
                          onChange={(e) => updateTokenProperty(editingToken.id, "name", e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-xs font-bold rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                          placeholder="Nome do personagem..."
                        />
                        <p className="text-[9px] text-neutral-400/80 leading-relaxed italic">
                          Ajuste o tamanho e espaçamento abaixo; veja a simulação em tempo real.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Troca de imagens (URL and File upload) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block font-semibold text-neutral-300">Trocar Imagem</span>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text"
                        value={editingToken.url}
                        onChange={(e) => updateTokenProperty(editingToken.id, "url", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-xs font-mono rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Insira a URL da imagem..."
                      />
                      <label className="flex items-center gap-2 cursor-pointer bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 hover:text-white transition-colors py-1.5 justify-center rounded-lg text-xs font-semibold">
                        <Upload className="w-3.5 h-3.5" />
                        Carregar imagem local
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const resultStr = ev.target?.result as string;
                                if (resultStr) {
                                  updateTokenProperty(editingToken.id, "url", resultStr);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Grid Alignment: Snap to grid Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Ajustar ao Grid</span>
                      <span className="text-[10px] text-neutral-400">Encaixa automaticamente no grid da arena</span>
                    </div>
                    <button
                      onClick={() => updateTokenProperty(editingToken.id, "snapToGrid", editingToken.snapToGrid !== undefined ? !editingToken.snapToGrid : !snapToGrid)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        (editingToken.snapToGrid !== undefined ? editingToken.snapToGrid : snapToGrid) ? "bg-indigo-500" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          (editingToken.snapToGrid !== undefined ? editingToken.snapToGrid : snapToGrid) ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Scale / Size controls */}
                  <div className="space-y-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Escala / Tamanho</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {editingToken.size}x ({editingToken.size <= 1.25 ? "Médio" : editingToken.size <= 2.25 ? "Grande" : editingToken.size <= 3.25 ? "Imenso" : "Colossal"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0.25"
                        max="5"
                        step="0.25"
                        value={editingToken.size}
                        onChange={(e) => updateTokenProperty(editingToken.id, "size", parseFloat(e.target.value) || 1)}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <input 
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="10"
                        value={editingToken.size}
                        onChange={(e) => updateTokenProperty(editingToken.id, "size", parseFloat(e.target.value) || 1)}
                        className="w-14 bg-white/5 border border-white/10 text-center text-xs font-mono rounded px-1.5 py-1 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Aura Color Picker presets & custom picker */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block font-semibold text-neutral-300">Cor da Aura / Indicador</span>
                    <div className="flex items-center gap-2">
                      {AURA_COLORS.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => updateTokenProperty(editingToken.id, "color", c.hex)}
                          className={`w-6 h-6 rounded-full border border-white/10 transition-transform cursor-pointer hover:scale-105 ${
                            editingToken.color === c.hex ? "ring-2 ring-indigo-500 scale-110" : "opacity-70"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                      <div className="relative group w-6 h-6 rounded-full overflow-hidden border border-white/15 hover:border-white/30 flex items-center justify-center bg-white/5 transition-colors">
                        <span className="text-[10px] text-neutral-400 group-hover:text-white font-semibold flex items-center justify-center pointer-events-none">+</span>
                        <input 
                          type="color" 
                          value={editingToken.color} 
                          onChange={(e) => updateTokenProperty(editingToken.id, "color", e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Cor personalizada"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visibilidade e Aparência */}
                  <div className="border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAppearanceExpanded(!appearanceExpanded); }}
                      className={`w-full flex items-center justify-between text-left px-5 py-3.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-lg active:scale-[0.98] ${
                        appearanceExpanded 
                          ? "bg-gradient-to-r from-amber-500/10 via-indigo-600/10 to-indigo-600/20 border-amber-450/70 text-white shadow-[0_4px_20px_rgba(245,158,11,0.15)]" 
                          : "bg-[#18151b] hover:bg-[#1f1a24] border-amber-500/55 text-amber-300 hover:text-white shadow-md animate-pulse animate-duration-3000"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Eye className={`w-4 h-4 transition-colors ${appearanceExpanded ? "text-amber-400" : "text-amber-300"}`} />
                        <span className="text-xs font-black tracking-wider uppercase">
                          Visibilidade & Aparência do Token
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest ${appearanceExpanded ? "bg-amber-500 text-black shadow" : "bg-amber-500/20 text-amber-300"}`}>
                          {appearanceExpanded ? "Ativo" : "Ajustar"}
                        </span>
                        <ChevronRight 
                          className={`w-4 h-4 transition-transform duration-200 ${
                            appearanceExpanded ? "rotate-90 text-amber-400" : "text-neutral-450"
                          }`} 
                        />
                      </div>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {appearanceExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 mt-2 pt-1 pb-1">
                            {/* Exibir Aura Switch */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]/30 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">Exibir Aura / Borda Colorida</span>
                                <span className="text-[10px] text-neutral-400">Mostra o anel de cor para identificar de quem é o token</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); updateTokenProperty(editingToken.id, "hideAura", !editingToken.hideAura); }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  !editingToken.hideAura ? "bg-indigo-500" : "bg-white/10"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    !editingToken.hideAura ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
 
                            {/* Exibir Barra de Vida Switch */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]/30 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">Exibir Barra de Vida</span>
                                <span className="text-[10px] text-neutral-400">Exibe a barra horizontal de PV (verde/vermelha) abaixo do token</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); updateTokenProperty(editingToken.id, "hideHpBar", !editingToken.hideHpBar); }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  !editingToken.hideHpBar ? "bg-indigo-500" : "bg-white/10"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    !editingToken.hideHpBar ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Ocultar Barra de Vida Fora de Combate Switch */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]/30 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">Ocultar Barra de Vida Fora de Combate</span>
                                <span className="text-[10px] text-neutral-400">Oculta a barra de PV automaticamente enquanto nenhum combate estiver ativo</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); updateTokenProperty(editingToken.id, "hideHpBarOutOfCombat", editingToken.hideHpBarOutOfCombat !== false ? false : true); }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  editingToken.hideHpBarOutOfCombat !== false ? "bg-indigo-500" : "bg-white/10"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    editingToken.hideHpBarOutOfCombat !== false ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
 
                            {/* Exibir Números de HP Switch */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]/30 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">Exibir Números de HP</span>
                                <span className="text-[10px] text-neutral-400">Mostra o valor numérico dos Pontos de Vida (ex: 28/28)</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); updateTokenProperty(editingToken.id, "hideHpText", !editingToken.hideHpText); }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  !editingToken.hideHpText ? "bg-indigo-500" : "bg-white/10"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    !editingToken.hideHpText ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
 
                            {/* Permitir Transparência (PNG) Switch */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]/30 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">Permitir Transparência (PNG)</span>
                                <span className="text-[10px] text-neutral-400">Remove o fundo escuro sólido para exibir imagens transparentes</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); updateTokenProperty(editingToken.id, "allowTransparency", !editingToken.allowTransparency); }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  editingToken.allowTransparency ? "bg-indigo-500" : "bg-white/10"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    editingToken.allowTransparency ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vínculo com Treinador Section */}
                  {editingToken.pokemonId && (
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLinkSettingsExpanded(!linkSettingsExpanded); }}
                        className={`w-full flex items-center justify-between text-left px-4 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer shadow-lg active:scale-[0.98] ${
                          linkSettingsExpanded 
                            ? "bg-gradient-to-r from-red-500/10 via-amber-600/10 to-amber-600/20 border-red-500/70 text-white shadow-[0_4px_20px_rgba(239,68,68,0.15)]" 
                            : "bg-[#18151b] hover:bg-[#1f1a24] border-red-500/35 text-red-300 hover:text-white shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Shuffle className={`w-4 h-4 transition-colors ${linkSettingsExpanded ? "text-red-400" : "text-red-300"}`} />
                          <span className="text-xs font-black tracking-wider uppercase">
                            Vínculo com Treinador
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest ${linkSettingsExpanded ? "bg-red-500 text-white shadow" : "bg-red-500/20 text-red-350"}`}>
                            {editingToken.linkEnabled ? "Ativo" : "Inativo"}
                          </span>
                          <ChevronRight 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              linkSettingsExpanded ? "rotate-90 text-red-400" : "text-neutral-450"
                            }`} 
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {linkSettingsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 mt-2 pt-1 pb-1">
                              {/* Enable Link Switch */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02]/30 border border-white/5">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white">Ativar Conexão Visual</span>
                                  <span className="text-[10px] text-neutral-400">Liga visualmente o Pokémon ao seu treinador</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    updateTokenProperty(editingToken.id, "linkEnabled", !editingToken.linkEnabled);
                                  }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    editingToken.linkEnabled ? "bg-red-500" : "bg-white/10"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      editingToken.linkEnabled ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>

                              {editingToken.linkEnabled && (
                                <div className="space-y-3.5 pt-1.5">
                                  {/* Link Style Selection */}
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 block font-semibold">
                                      Estilo do Vínculo
                                    </span>
                                    <select
                                      value={editingToken.linkStyle || "electric-lightning"}
                                      onChange={(e) => updateTokenProperty(editingToken.id, "linkStyle", e.target.value)}
                                      className="w-full bg-[#1c1822] border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500/50 cursor-pointer"
                                    >
                                      {LINK_STYLES.map(style => (
                                        <option key={style.id} value={style.id}>
                                          {style.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Link Intensity Slider */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 block font-semibold">
                                        Intensidade (Aura / Brilho)
                                      </span>
                                      <span className="text-xs font-mono font-bold text-red-400">
                                        {editingToken.linkIntensity !== undefined ? editingToken.linkIntensity : 100}%
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <input 
                                        type="range"
                                        min="0"
                                        max="200"
                                        step="10"
                                        value={editingToken.linkIntensity !== undefined ? editingToken.linkIntensity : 100}
                                        onChange={(e) => updateTokenProperty(editingToken.id, "linkIntensity", parseInt(e.target.value))}
                                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Link Thickness Slider */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 block font-semibold">
                                        Espessura da Linha (px)
                                      </span>
                                      <span className="text-xs font-mono font-bold text-red-400">
                                        {editingToken.linkThickness !== undefined ? editingToken.linkThickness : 4}px
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <input 
                                        type="range"
                                        min="1"
                                        max="20"
                                        step="1"
                                        value={editingToken.linkThickness !== undefined ? editingToken.linkThickness : 4}
                                        onChange={(e) => updateTokenProperty(editingToken.id, "linkThickness", parseInt(e.target.value))}
                                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Link Color Presets & customized HEX */}
                                  <div className="space-y-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-300 block font-semibold">
                                      Cor do Vínculo
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {[
                                        { hex: "#ef4444", name: "Vermelho" },
                                        { hex: "#3b82f6", name: "Azul" },
                                        { hex: "#a855f7", name: "Roxo" },
                                        { hex: "#22c55e", name: "Verde" },
                                        { hex: "#eab308", name: "Dourado" },
                                        { hex: "#edf2f7", name: "Branco" }
                                      ].map((c, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => updateTokenProperty(editingToken.id, "linkColor", c.hex)}
                                          className={`w-6 h-6 rounded-full border border-white/15 transition-transform cursor-pointer hover:scale-105 ${
                                            (editingToken.linkColor || "#ef4444") === c.hex ? "ring-2 ring-red-500 scale-110" : "opacity-75"
                                          }`}
                                          style={{ backgroundColor: c.hex }}
                                          title={c.name}
                                        />
                                      ))}
                                      <div className="relative group w-6 h-6 rounded-full overflow-hidden border border-white/20 hover:border-white/40 flex items-center justify-center bg-white/5 transition-colors">
                                        <span className="text-[10px] text-neutral-450 group-hover:text-white font-semibold flex items-center justify-center pointer-events-none">+</span>
                                        <input 
                                          type="color" 
                                          value={editingToken.linkColor || "#ef4444"} 
                                          onChange={(e) => updateTokenProperty(editingToken.id, "linkColor", e.target.value)}
                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                          title="Cor personalizada"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Animated Aura Selector Section */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block font-semibold text-neutral-300">
                        Aura Mágica Animada (RPG)
                      </span>
                      {tempAuraId && tempAuraId !== "none" && (
                        <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full">
                          {ANIMATED_AURAS.find(a => a.id === tempAuraId)?.name}
                        </span>
                      )}
                    </div>

                    {/* Row with Select button and clear button */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        onClick={() => setAuraSelectorOpen(!auraSelectorOpen)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {auraSelectorOpen ? "Fechar Lista" : "Selecionar Aura..."}
                      </button>
                      <button
                        onClick={() => setTempAuraId("none")}
                        disabled={tempAuraId === "none" || !tempAuraId}
                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-neutral-400 flex items-center justify-center gap-1.2 cursor-pointer"
                      >
                        Remover Aura
                      </button>
                    </div>

                    {/* Espaçamento / Tamanho da Aura Slider e Tuning Avançado */}
                    {tempAuraId && tempAuraId !== "none" && (
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl mt-1.5 overflow-hidden transition-all duration-250 hover:border-white/10">
                        <button
                          onClick={() => setAuraTuningExpanded(!auraTuningExpanded)}
                          className="w-full flex items-center justify-between text-left p-3.5 focus:outline-none group cursor-pointer"
                        >
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-400 block font-semibold">
                            Ajustes e Customização da Energia
                          </span>
                          <ChevronRight 
                            className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-200 ${
                              auraTuningExpanded ? "rotate-90" : ""
                            }`} 
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {auraTuningExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                                {/* Espaçamento Slider */}
                                <div className="space-y-1.5 pt-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-neutral-300">Espaçamento (Escala)</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(tempAuraScale * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0.30"
                                    max="2.50"
                                    step="0.05"
                                    value={tempAuraScale}
                                    onChange={(e) => setTempAuraScale(parseFloat(e.target.value) || 1.0)}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:bg-white/20 transition-colors"
                                  />
                                </div>

                                {/* Intensidade Slider */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-neutral-300">Intensidade (Poder)</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(tempAuraIntensity * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0.10"
                                    max="3.00"
                                    step="0.05"
                                    value={tempAuraIntensity}
                                    onChange={(e) => setTempAuraIntensity(parseFloat(e.target.value) || 1.0)}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:bg-white/20 transition-colors"
                                  />
                                </div>

                                {/* Velocidade Slider */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-neutral-300">Frequência (Velocidade)</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(tempAuraAnimationSpeed * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0.10"
                                    max="3.00"
                                    step="0.05"
                                    value={tempAuraAnimationSpeed}
                                    onChange={(e) => setTempAuraAnimationSpeed(parseFloat(e.target.value) || 1.0)}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:bg-white/20 transition-colors"
                                  />
                                </div>

                                {/* Opacidade Slider */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-neutral-300">Opacidade (Visibilidade)</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(tempAuraOpacity * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0.10"
                                    max="1.00"
                                    step="0.05"
                                    value={tempAuraOpacity}
                                    onChange={(e) => setTempAuraOpacity(parseFloat(e.target.value) || 1.0)}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:bg-white/20 transition-colors"
                                  />
                                </div>

                                {/* Partículas Slider */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-neutral-300">Densidade de Partículas</span>
                                    <span className="text-[10px] font-mono font-bold text-indigo-400">{tempAuraParticleCount} part.</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="120"
                                    step="5"
                                    value={tempAuraParticleCount}
                                    onChange={(e) => setTempAuraParticleCount(parseInt(e.target.value) || 0)}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:bg-white/20 transition-colors"
                                  />
                                </div>

                                {/* Colors Setup */}
                                <div className="grid grid-cols-2 gap-3 pb-1">
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-neutral-400 block font-bold uppercase leading-none">Cor Primária</span>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="color"
                                        value={tempAuraColorPrimary}
                                        onChange={(e) => setTempAuraColorPrimary(e.target.value)}
                                        className="w-8 h-8 rounded-lg border border-white/15 bg-transparent cursor-pointer overflow-hidden p-0"
                                      />
                                      <span className="text-[10px] font-mono uppercase font-semibold">{tempAuraColorPrimary}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-neutral-400 block font-bold uppercase leading-none">Cor Secundária</span>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="color"
                                        value={tempAuraColorSecondary}
                                        onChange={(e) => setTempAuraColorSecondary(e.target.value)}
                                        className="w-8 h-8 rounded-lg border border-white/15 bg-transparent cursor-pointer overflow-hidden p-0"
                                      />
                                      <span className="text-[10px] font-mono uppercase font-semibold">{tempAuraColorSecondary}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Shaders Flags checkbox toggles */}
                                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5">
                                  <div className="flex items-center justify-between bg-white/[0.01] p-2 rounded-lg border border-white/5">
                                    <span className="text-[9px] font-bold text-neutral-300 uppercase leading-none">Pós Brilho (Glow)</span>
                                    <button
                                      onClick={() => setTempAuraEnableGlow(!tempAuraEnableGlow)}
                                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        tempAuraEnableGlow ? "bg-indigo-500" : "bg-white/10"
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          tempAuraEnableGlow ? "translate-x-3" : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between bg-white/[0.01] p-2 rounded-lg border border-white/5">
                                    <span className="text-[9px] font-bold text-neutral-300 uppercase leading-none">Distorcer Espaço</span>
                                    <button
                                      onClick={() => setTempAuraEnableDistortion(!tempAuraEnableDistortion)}
                                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        tempAuraEnableDistortion ? "bg-indigo-500" : "bg-white/10"
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          tempAuraEnableDistortion ? "translate-x-3" : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                  </div>
                                                              <button
                                    onClick={() => {
                                      const baseDef = ANIMATED_AURAS.find(a => a.id === tempAuraId);
                                      if (baseDef) {
                                        setTempAuraScale(0.5);
                                        setTempAuraIntensity(0.5);
                                        setTempAuraOpacity(0.5);
                                        setTempAuraParticleCount(60);
                                        setTempAuraAnimationSpeed(0.5);
                                        setTempAuraColorPrimary(baseDef.colorPrimary);
                                        setTempAuraColorSecondary(baseDef.colorSecondary);
                                        setTempAuraEnableGlow(baseDef.enableGlow);
                                        setTempAuraEnableDistortion(baseDef.enableDistortion);
                                      }
                                    }}
                                    className="px-2 py-1 text-[9px] font-bold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                                  >
                                    Restaurar Predefinições (50%)
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
 
                    {/* The Expandable Grimoire/Grid of Animated Auras */}
                    {auraSelectorOpen && (
                      <div className="mt-2 bg-[#08090d]/95 border border-white/10 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
                        {/* Category filter */}
                        <div className="flex flex-wrap gap-1 pb-1 border-b border-white/5 max-h-24 overflow-y-auto">
                          {["Todos", "Energia de Ki", "Chakra", "Energia Espiritual", "Sombras", "Elemental - Fogo", "Elemental - Gelo", "Elemental - Eletricidade", "Elemental - Vento", "Arcano", "Divino"].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setAuraCategory(cat)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                auraCategory === cat 
                                  ? "bg-indigo-500 text-white shadow" 
                                  : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
 
                        {/* Grid listing */}
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1.5">
                          {ANIMATED_AURAS.filter(a => auraCategory === "Todos" || a.category === auraCategory).map((aura) => (
                            <button
                              key={aura.id}
                              onClick={() => {
                                setTempAuraId(aura.id);
                                setTempAuraScale(0.5);
                                setTempAuraIntensity(0.5);
                                setTempAuraOpacity(0.5);
                                setTempAuraParticleCount(60);
                                setTempAuraAnimationSpeed(0.5);
                                setTempAuraColorPrimary(aura.colorPrimary);
                                setTempAuraColorSecondary(aura.colorSecondary);
                                setTempAuraEnableGlow(aura.enableGlow);
                                setTempAuraEnableDistortion(aura.enableDistortion);
                              }}
                              className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between h-14 cursor-pointer overflow-hidden group ${
                                tempAuraId === aura.id
                                  ? "bg-indigo-500/10 border-indigo-500 text-white scale-[0.98]"
                                  : "bg-white/[0.01] border-white/5 text-neutral-300 hover:bg-white/[0.03] hover:border-white/15"
                              }`}
                            >
                              {/* Visual small color tag in corner */}
                              <div 
                                className="absolute top-0 right-0 w-1 h-full opacity-60" 
                                style={{ backgroundColor: aura.color }} 
                              />
                              
                              <div className="pr-1.5">
                                <p className="text-[10px] font-bold leading-tight truncate">{aura.name}</p>
                                <p className="text-[8px] text-neutral-400 leading-snug line-clamp-2 mt-0.5 group-hover:text-neutral-300 transition-colors">
                                  {aura.description}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Pontos de Vida (HP Controls) */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block font-semibold text-neutral-300">Controle de Pontos de Vida</span>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-400 block font-bold uppercase leading-none">Vida Atual</span>
                        <input 
                          type="number"
                          value={editingToken.hpCurrent ?? 0}
                          onChange={(e) => updateTokenProperty(editingToken.id, "hpCurrent", parseInt(e.target.value) || 0)}
                          className="w-full bg-white/5 border border-white/10 text-center text-xs font-mono rounded-lg py-1.5 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-400 block font-bold uppercase leading-none">Vida Máxima</span>
                        <input 
                          type="number"
                          value={editingToken.hpMax ?? 0}
                          onChange={(e) => updateTokenProperty(editingToken.id, "hpMax", parseInt(e.target.value) || 0)}
                          className="w-full bg-[#ffffff05] border border-white/10 text-center text-xs font-mono rounded-lg py-1.5 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-400 block font-bold uppercase leading-none">Adicional (Azul)</span>
                        <input 
                          type="number"
                          value={editingToken.tempHp ?? 0}
                          onChange={(e) => updateTokenProperty(editingToken.id, "tempHp", parseInt(e.target.value) || 0)}
                          className="w-full bg-[#ffffff05] border border-white/10 text-center text-xs font-mono rounded-lg py-1.5 text-[#38bdf8] focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex justify-end">
                  <button
                    onClick={() => {
                      if (tempAuraId !== null) {
                        updateTokenProperty(editingToken.id, "animatedAuraId", tempAuraId === "none" ? undefined : tempAuraId);
                        updateTokenProperty(editingToken.id, "auraScale", tempAuraScale);
                        updateTokenProperty(editingToken.id, "auraIntensity", tempAuraIntensity);
                        updateTokenProperty(editingToken.id, "auraOpacity", tempAuraOpacity);
                        updateTokenProperty(editingToken.id, "auraParticleCount", tempAuraParticleCount);
                        updateTokenProperty(editingToken.id, "auraAnimationSpeed", tempAuraAnimationSpeed);
                        updateTokenProperty(editingToken.id, "auraColorPrimary", tempAuraColorPrimary);
                        updateTokenProperty(editingToken.id, "auraColorSecondary", tempAuraColorSecondary);
                        updateTokenProperty(editingToken.id, "auraEnableGlow", tempAuraEnableGlow);
                        updateTokenProperty(editingToken.id, "auraEnableDistortion", tempAuraEnableDistortion);

                        if (tempAuraId !== "none" && tempAuraColorPrimary) {
                          updateTokenProperty(editingToken.id, "color", tempAuraColorPrimary);
                        }
                      }
                      setEditingTokenSettingsId(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shadow-lg"
                  >
                    Salvar & Concluir
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL MULTIPLAYER DE COMPARTILHAMENTO E PERMISSÕES */}
        <AnimatePresence>
          {sharingModalTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSharingModalTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0e1014]/98 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2.5 text-yellow-400">
                    <Lock className="w-5 h-5" />
                    <div>
                      <h3 className="text-sm font-bold tracking-wide uppercase">Controle de Compartilhamento</h3>
                      <p className="text-[10px] text-neutral-400">Configuração de Ownership e Permissões</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSharingModalTarget(null)}
                    className="text-neutral-400 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] scrollbar-thin">
                  {/* Entity Details */}
                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Entidade Alvo</div>
                    <div className="text-xs font-semibold text-neutral-200 truncate">{sharingModalTarget.name}</div>
                    <div className="flex items-center gap-2 text-[9px] text-indigo-400">
                      <span className="bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono uppercase">
                        {({
                          trainer: "Ficha de Treinador",
                          folder: "Pasta de Treinador",
                          token: "Token do Canvas",
                          map: "Arena/Mapa",
                          mapFolder: "Pasta de Arenas"
                        } as any)[sharingModalTarget.type] || sharingModalTarget.type}
                      </span>
                      <span>ID: {sharingModalTarget.id.slice(0, 12)}</span>
                    </div>
                  </div>

                  {/* Owner Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400 block px-1">Dono Principal (Owner)</label>
                    <select
                      value={sharingModalTarget.ownerId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSharingModalTarget(prev => prev ? { ...prev, ownerId: val || undefined } : null);
                      }}
                      className="w-full bg-[#111319]/95 text-xs text-white rounded-xl px-3 py-2 border border-white/10 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Nenhum (Sem Dono / Público)</option>
                      {roomPlayers.map(p => (
                        <option key={p.uid} value={p.uid}>
                          {p.displayName || p.email || p.uid} {p.uid === user?.uid ? "(Você)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-neutral-400 px-1">
                      O Dono Principal sempre possui permissão total de alteração e exclusão para este elemento.
                    </p>
                  </div>

                  {/* Individual Player Permissions Roll */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] uppercase font-bold text-neutral-400">Permissões de Jogadores</label>
                      <span className="text-[9px] text-neutral-500 font-medium">Visualizar / Editar</span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                      {roomPlayers.length === 0 ? (
                        <div className="text-center py-4 bg-white/[0.01]/50 rounded-xl border border-dashed border-white/5 text-[11px] text-neutral-500 italic">
                          Nenhum outro jogador conectado neste quarto.
                        </div>
                      ) : (
                        roomPlayers.map(p => {
                          const isOwner = sharingModalTarget.ownerId === p.uid;
                          const currentCanView = sharingModalTarget.permissions?.canView || [];
                          const currentCanEdit = sharingModalTarget.permissions?.canEdit || [];
                          
                          const hasView = currentCanView.includes(p.uid) || isOwner;
                          const hasEdit = currentCanEdit.includes(p.uid) || isOwner;

                          return (
                            <div
                              key={p.uid}
                              className={`flex items-center justify-between p-2 rounded-xl border ${
                                isOwner 
                                  ? "bg-amber-500/5 border-amber-500/20" 
                                  : "bg-white/[0.02] border-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {p.photoURL ? (
                                  <img 
                                    src={p.photoURL} 
                                    className="w-5 h-5 rounded-full border border-white/10 shrink-0" 
                                    alt=""
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-neutral-800 text-[10px] flex items-center justify-center font-bold font-mono text-zinc-400 shrink-0 border border-white/5 uppercase">
                                    {(p.displayName || p.email || "?").slice(0, 1)}
                                  </div>
                                )}
                                <div className="truncate flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {p.displayName || p.email || p.uid.slice(0, 10)}
                                  </div>
                                  {isOwner && (
                                    <span className="text-[8px] text-amber-400 font-extrabold uppercase">Dono/Owner</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* canView Toggle */}
                                <button
                                  disabled={isOwner}
                                  onClick={() => {
                                    const nextView = currentCanView.includes(p.uid)
                                      ? currentCanView.filter(id => id !== p.uid)
                                      : [...currentCanView, p.uid];
                                    setSharingModalTarget(prev => {
                                      if (!prev) return null;
                                      const perms = prev.permissions || { canView: [], canEdit: [] };
                                      return {
                                        ...prev,
                                        permissions: {
                                          ...perms,
                                          canView: nextView
                                        }
                                      };
                                    });
                                  }}
                                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border transition-all cursor-pointer ${
                                    hasView
                                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                      : "bg-white/5 text-neutral-500 border-transparent hover:text-neutral-400"
                                  }`}
                                  title="Permissão para ver"
                                >
                                  Ver
                                </button>

                                {/* canEdit Toggle */}
                                <button
                                  disabled={isOwner}
                                  onClick={() => {
                                    const nextEdit = currentCanEdit.includes(p.uid)
                                      ? currentCanEdit.filter(id => id !== p.uid)
                                      : [...currentCanEdit, p.uid];
                                    setSharingModalTarget(prev => {
                                      if (!prev) return null;
                                      const perms = prev.permissions || { canView: [], canEdit: [] };
                                      return {
                                        ...prev,
                                        permissions: {
                                          ...perms,
                                          canEdit: nextEdit
                                        }
                                      };
                                    });
                                  }}
                                  className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border transition-all cursor-pointer ${
                                    hasEdit
                                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                      : "bg-white/5 text-neutral-500 border-transparent hover:text-neutral-400"
                                  }`}
                                  title="Permissão para editar"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5 bg-white/[0.01]">
                  <button
                    onClick={() => setSharingModalTarget(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!sharingModalTarget) return;
                      await saveEntityPermissions(
                        sharingModalTarget.type,
                        sharingModalTarget.id,
                        sharingModalTarget.ownerId,
                        sharingModalTarget.permissions?.canView || [],
                        sharingModalTarget.permissions?.canEdit || []
                      );
                      setSharingModalTarget(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Salvar Permissões
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL MULTIPLAYER DE INTEGRAÇÃO / PLAYER ONBOARDING */}
        <AnimatePresence>
          {roomId && !user && !dismissedRoomOnboarding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#0c0d12]/98 border border-white/15 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4 text-white text-center"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-black tracking-wide uppercase text-indigo-300">Convite de Mesa Online</h3>
                  <p className="text-[11px] text-neutral-400">Você abriu um link de acesso para uma sessão de aventura</p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-left space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Sala Conectada:</span>
                    <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">{roomId}</span>
                  </div>
                  
                  <p className="text-[10.5px] leading-relaxed text-neutral-350">
                    Para carregar o tabuleiro moderno, visualizar tokens ativos, interagir no chat e acompanhar os combates em tempo real sincronizado com seu Mestre (DM), conecte sua conta Google utilizando a conta da nuvem do simulador RPG.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      handleCloudAuth();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 text-center"
                  >
                    <Cloud className="w-4 h-4" /> Conectar com Google (Nuvem ON)
                  </button>

                  <button
                    onClick={() => setDismissedRoomOnboarding(true)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 font-bold uppercase text-[9px] tracking-wider transition-all border border-white/5 cursor-pointer text-center"
                  >
                    Entrar Off-line (Apenas Observar)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL MULTIPLAYER DE BOAS-VINDAS / LOBBY DE MESAS */}
        <AnimatePresence>
          {isWelcomeModalOpen && !roomId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#07080c]/95 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 25 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 25 }}
                className="bg-[#0e1017]/98 border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-white"
              >
                {/* Header decorativo Pokebola */}
                <div className="relative py-8 px-6 text-center border-b border-white/5 bg-gradient-to-b from-indigo-950/20 to-transparent">
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => {
                        localStorage.setItem("vtt_dismissed_welcome", "true");
                        setIsWelcomeModalOpen(false);
                      }}
                      className="text-neutral-400 hover:text-white hover:bg-white/5 p-1.5 rounded-xl transition-all cursor-pointer"
                      title="Explorar Tabuleiro Local"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 p-0.5 shadow-lg shadow-indigo-500/20 mx-auto flex items-center justify-center mb-3">
                    <div className="w-full h-full rounded-full bg-[#0a0b10] flex items-center justify-center text-white">
                      <Swords className="w-8 h-8 text-rose-400 animate-pulse" />
                    </div>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                    PokeVTT 5e Multiplayer
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                    O tabuleiro virtual tático definitivo para suas jornadas, combates e acampamentos Pokémon na 5ª Edição!
                  </p>
                </div>

                {/* Grid das Opções */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* CARD 1: PLAY LOGALLY / SOLO */}
                  <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                      <MapIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-indigo-300">Jogar Solo / Local</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-2 flex-grow">
                      Use todo o poder do simulador localmente. Perfeito para gerenciar combates, catalogar pokémon, personalizar mapas e construir seu banco de dados off-line.
                    </p>

                    <button
                      onClick={() => {
                        localStorage.setItem("vtt_dismissed_welcome", "true");
                        setIsWelcomeModalOpen(false);
                        setNotification("Modo Solo Local iniciado! Importe suas arenas e tokens no menu.");
                      }}
                      className="w-full py-2.5 mt-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase text-[9px] tracking-widest transition-all cursor-pointer text-center"
                    >
                      Explorar Localmente
                    </button>
                  </div>

                  {/* CARD 2: DM HOSTING */}
                  <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                      <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                    
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-amber-300">Hospedar (Mestre)</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-2 flex-grow">
                      Crie uma mesa online e projete seu mapa, arena tática, grade dinâmica e tokens em tempo real para seus jogadores. Você tem o controle total do combate.
                    </p>

                    {!user ? (
                      <div className="space-y-2 mt-5">
                        <p className="text-[9px] text-neutral-500 italic text-center">Para hospedar, conecte sua conta Google.</p>
                        <button
                          onClick={handleCloudAuth}
                          className="w-full py-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] border border-indigo-500/30 text-white font-extrabold uppercase text-[9px] tracking-wider transition-all cursor-pointer text-center"
                        >
                          <Cloud className="w-3.5 h-3.5" /> Conectar Conta
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-5">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-neutral-500 block px-0.5 font-sans">Nome da Campanha (Opcional)</label>
                          <input
                            type="text"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="ex: Liga Sinnoh RPG"
                            className="w-full bg-white/5 text-xs text-white rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-amber-500 font-medium"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            await createRoom(campaignName);
                            setIsWelcomeModalOpen(false);
                          }}
                          disabled={isConnectingRoom}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer text-center"
                        >
                          {isConnectingRoom ? "Criando Mesa..." : "Criar Mesa Online"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CARD 3: PLAYER JOINING */}
                  <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-emerald-300">Conectar (Jogador)</h3>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-2 flex-grow">
                      Entre na mesa ativa de um mestre para visualizar tudo em tempo real. Mova seus próprios pokémon autorizados e participe do chat e iniciativa de combate.
                    </p>

                    <div className="space-y-3 mt-5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-neutral-500 block px-0.5 font-sans">Código da Mesa</label>
                        <input
                          type="text"
                          value={inputRoomId}
                          onChange={(e) => setInputRoomId(e.target.value)}
                          placeholder="PKV-XXXX"
                          className="w-full bg-white/5 text-xs text-center font-mono tracking-widest text-white rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none focus:border-emerald-500 uppercase placeholder:text-neutral-700"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (inputRoomId.trim()) {
                            await joinRoom(inputRoomId);
                            setIsWelcomeModalOpen(false);
                          } else {
                            setNotification("Insira um código válido para entrar!");
                          }
                        }}
                        disabled={isConnectingRoom || !inputRoomId.trim()}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer text-center disabled:opacity-50"
                      >
                        {isConnectingRoom ? "Conectando..." : "Entrar na Mesa"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Footer */}
                <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1 font-sans">
                    <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                    Banco de Dados Firestore ativo em nuvem multiplayer sincronizada.
                  </span>
                  <span className="font-sans">
                    Mesa Atual: <span className="text-neutral-200 font-bold">{roomId || "Nenhuma (Conexão Local)"}</span>
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: CRIAR OU EDITAR TREINADOR (FICHA) */}
        <AnimatePresence>
          {isCreateTrainerModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000000]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => {
                setIsCreateTrainerModalOpen(false);
                setWizardStep(1);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0e1014]/98 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-white my-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Step Indicator */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2.5 text-indigo-400">
                    <UserPlus className="w-5 h-5 animate-pulse" />
                    <div>
                      <h3 className="text-sm font-bold tracking-wide uppercase">Criação de Treinador</h3>
                      <p className="text-[10px] text-neutral-400 font-mono">Etapa {wizardStep} de 2 — {wizardStep === 1 ? "Informações Básicas" : "Atributos D&D"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCreateTrainerModalOpen(false);
                      setWizardStep(1);
                    }} 
                    className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Wizard Body Component */}
                <div className="p-6 space-y-5">
                  {wizardStep === 1 ? (
                    /* STEP 1: BASIC INFORMATION */
                    <div className="space-y-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Nome do Treinador <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="ex: Red, Ash Ketchum, Cynthia, Diogo"
                          value={formTrainerName}
                          onChange={(e) => setFormTrainerName(e.target.value)}
                          className="w-full bg-[#16181f]/80 text-xs text-white rounded-lg px-3 py-2.5 border border-white/15 focus:outline-none focus:border-indigo-500/50 font-bold"
                        />
                      </div>

                      {/* Class */}
                      <div className="space-y-1.55">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Classe / Especialização</label>
                        <select
                          value={formTrainerClass}
                          onChange={(e) => setFormTrainerClass(e.target.value)}
                          className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-2.5 py-2.5 border border-white/15 focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="Treinador Pokémon">🔴 Treinador Pokémon (Equilibrado)</option>
                          <option value="Criador Pokémon">🌿 Criador Pokémon (Suporte & Cura)</option>
                          <option value="Pesquisador Pokémon">🔍 Pesquisador Pokémon (Conhecimento)</option>
                          <option value="Treinador de Elite">⚡ Treinador de Elite (Combate Forte)</option>
                          <option value="Especialista de Tipo">🔥 Especialista de Tipo (Ignis/Aqua/Glacie)</option>
                        </select>
                      </div>

                      {/* Level */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Nível Inicial</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={formTrainerLevel}
                            onChange={(e) => setFormTrainerLevel(parseInt(e.target.value))}
                            className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                          />
                          <span className="font-mono text-sm font-bold bg-[#1d1f27] border border-white/10 px-3 py-1 rounded text-indigo-300">
                            Nvl {formTrainerLevel}
                          </span>
                        </div>
                      </div>

                      {/* Upload avatar */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Local Uploader</span>
                          <label className="border border-dashed border-white/15 hover:border-indigo-500/50 hover:bg-indigo-500/5 p-3 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 h-16">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      setFormTrainerImage(ev.target.result as string);
                                      setNotification("Retrato do treinador carregado!");
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <Upload className="w-4 h-4 text-neutral-400" />
                            <span className="text-[10px] text-neutral-300 font-semibold select-none">Upload Imagem...</span>
                          </label>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Imagem URL</label>
                          <input
                            type="text"
                            placeholder="https://exemplo.com/retrato.png"
                            value={formTrainerImage}
                            onChange={(e) => setFormTrainerImage(e.target.value)}
                            className="w-full bg-[#16181f]/80 text-[11px] text-white rounded-xl px-2.5 py-4 border border-white/15 focus:outline-none focus:border-indigo-500/50 h-16 truncate"
                          />
                        </div>
                      </div>

                      {/* Folder destination */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Organizar na Pasta</label>
                        <select
                          value={formTrainerFolderId}
                          onChange={(e) => setFormTrainerFolderId(e.target.value)}
                          className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none"
                        >
                          <option value="">Pasta Raiz (Lista Principal)</option>
                          {trainerFolders.map((f) => (
                            <option key={f.id} value={f.id}>📁 {f.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* STEP 2: ATTRIBUTE SELECTION METHOD & ASSIGNMENTS */
                    <div className="space-y-5">
                      {/* Choose Method Segment Control */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Método de Geração de Atributos</label>
                        <div className="flex bg-[#16181f] p-1.5 rounded-xl border border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormTrainerAttrMethod("Standard Array");
                              setFormTrainerAttrs({ FOR: 15, DES: 14, CON: 13, INT: 12, SAB: 10, CAR: 8 });
                            }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              formTrainerAttrMethod === "Standard Array"
                                ? "bg-indigo-600 text-white shadow"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            📊 Standard Array (Valores Fixos)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormTrainerAttrMethod("Point Buy");
                              setFormTrainerAttrs({ FOR: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 });
                            }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              formTrainerAttrMethod === "Point Buy"
                                ? "bg-indigo-600 text-white shadow"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            💰 Point Buy (Compra de Pontos)
                          </button>
                        </div>
                      </div>

                      {/* Display allocation */}
                      {formTrainerAttrMethod === "Standard Array" ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
                            Distribuia os valores fixa: <strong className="text-white">15, 14, 13, 12, 10, 8</strong> entre as seis habilidades. Ao selecionar um valor já utilizado, os atributos irão trocar seus valores automaticamente para velocidade.
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {(["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const).map((attr) => (
                              <div key={attr} className="bg-[#16181f]/75 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono text-xs font-extrabold text-neutral-300">{attr}</span>
                                  <span className="text-[10px] font-bold text-indigo-400">
                                    ({formTrainerAttrs[attr] >= 10 ? "+" : ""}{Math.floor((formTrainerAttrs[attr] - 10) / 2)})
                                  </span>
                                </div>
                                <select
                                  value={formTrainerAttrs[attr]}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setFormTrainerAttrs(prev => {
                                      const next = { ...prev };
                                      const otherKey = (Object.keys(next) as Array<keyof typeof next>).find(
                                        k => next[k] === val && k !== attr
                                      );
                                      if (otherKey) {
                                        next[otherKey] = next[attr];
                                      }
                                      next[attr] = val;
                                      return next;
                                    });
                                  }}
                                  className="w-full bg-[#0e1014] text-xs font-bold font-mono text-white rounded px-2 py-1 border border-white/10 mt-1.5 focus:outline-none"
                                >
                                  {[15, 14, 13, 12, 10, 8].map(v => (
                                    <option key={v} value={v}>{v}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Point Buy Dynamic Allocator */
                        <div className="space-y-4">
                          {/* Point indicator */}
                          {(() => {
                            const getValCost = (v: number) => {
                              if (v === 8) return 0;
                              if (v === 9) return 1;
                              if (v === 10) return 2;
                              if (v === 11) return 3;
                              if (v === 12) return 4;
                              if (v === 13) return 5;
                              if (v === 14) return 7;
                              if (v === 15) return 9;
                              return 0;
                            };
                            const spent = 
                              getValCost(formTrainerAttrs.FOR) +
                              getValCost(formTrainerAttrs.DES) +
                              getValCost(formTrainerAttrs.CON) +
                              getValCost(formTrainerAttrs.INT) +
                              getValCost(formTrainerAttrs.SAB) +
                              getValCost(formTrainerAttrs.CAR);
                            const remaining = 27 - spent;
                            const isOver = remaining < 0;

                            return (
                              <>
                                <div className="flex items-center justify-between p-3 bg-neutral-900 border border-white/5 rounded-xl">
                                  <div className="text-xs">
                                    <span className="text-neutral-450 uppercase font-bold block text-[9px] tracking-wide">Orçamento Point Buy</span>
                                    <span className="text-white font-medium">Todos começam em 8. Limite de 27 pontos.</span>
                                  </div>
                                  <span className={`text-sm font-mono font-black px-3 py-1.5 rounded-lg border ${
                                    isOver 
                                      ? "bg-red-500/15 text-red-400 border-red-500/35 animate-bounce" 
                                      : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                  }`}>
                                    {remaining} Pts Livres
                                  </span>
                                </div>

                                {/* Attribute compra grid */}
                                <div className="grid grid-cols-2 gap-3">
                                  {(["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const).map((attr) => {
                                    const val = formTrainerAttrs[attr];
                                    const canDec = val > 8;
                                    const canInc = val < 15;

                                    const nextCostDiff = getValCost(val + 1) - getValCost(val);
                                    const nextCostAllowed = remaining >= nextCostDiff;

                                    return (
                                      <div key={attr} className="bg-[#16181f]/70 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-neutral-300 uppercase font-extrabold font-mono">{attr}</span>
                                          <span className="text-[10px] text-neutral-450 font-bold font-mono">Custo: {getValCost(val)} pts</span>
                                        </div>

                                        <div className="flex items-center justify-between mt-2.5">
                                          <button
                                            type="button"
                                            disabled={!canDec}
                                            onClick={() => {
                                              setFormTrainerAttrs(prev => ({ ...prev, [attr]: val - 1 }));
                                            }}
                                            className="p-1 px-2.5 bg-neutral-800 disabled:opacity-40 hover:bg-white/5 transition-colors text-white font-bold rounded-lg border border-white/5"
                                          >
                                            -
                                          </button>
                                          
                                          <div className="text-center">
                                            <span className="font-mono font-black text-sm text-indigo-400">{val}</span>
                                            <span className="text-[10px] block font-mono text-neutral-500 leading-none">
                                              ({val >= 10 ? "+" : ""}{Math.floor((val - 10) / 2)})
                                            </span>
                                          </div>

                                          <button
                                            type="button"
                                            disabled={!canInc || !nextCostAllowed}
                                            onClick={() => {
                                              setFormTrainerAttrs(prev => ({ ...prev, [attr]: val + 1 }));
                                            }}
                                            className="p-1 px-2.5 bg-neutral-800 disabled:opacity-40 hover:bg-white/5 transition-colors text-white font-bold rounded-lg border border-white/5"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {wizardStep === 2 && "Tabela: D&D 5e Standard Point Cost"}
                  </div>

                  <div className="flex gap-2">
                    {wizardStep === 2 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-xs font-bold text-neutral-300 transition-colors uppercase cursor-pointer"
                      >
                        Voltar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateTrainerModalOpen(false);
                          setWizardStep(1);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors uppercase"
                      >
                        Cancelar
                      </button>
                    )}

                    {wizardStep === 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!formTrainerName.trim()) {
                            setNotification("Por favor, preencha o Nome do Treinador!");
                            return;
                          }
                          setWizardStep(2);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-xs font-extrabold text-white transition-all uppercase select-none cursor-pointer"
                      >
                        Próximo (Passo 2)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          // Validation for Point buy spend limit
                          if (formTrainerAttrMethod === "Point Buy") {
                            const getCost = (v: number) => {
                              if (v === 8) return 0;
                              if (v === 9) return 1;
                              if (v === 10) return 2;
                              if (v === 11) return 3;
                              if (v === 12) return 4;
                              if (v === 13) return 5;
                              if (v === 14) return 7;
                              if (v === 15) return 9;
                              return 0;
                            };
                            const totalSpent = 
                              getCost(formTrainerAttrs.FOR) +
                              getCost(formTrainerAttrs.DES) +
                              getCost(formTrainerAttrs.CON) +
                              getCost(formTrainerAttrs.INT) +
                              getCost(formTrainerAttrs.SAB) +
                              getCost(formTrainerAttrs.CAR);
                            if (totalSpent > 27) {
                              setNotification("Você gastou mais do que os 27 pontos permitidos!");
                              return;
                            }
                          }

                          createTrainerRecord(
                            formTrainerName, 
                            formTrainerImage, 
                            formTrainerFolderId, 
                            formTrainerClass, 
                            formTrainerLevel, 
                            formTrainerAttrMethod, 
                            formTrainerAttrs
                          );
                          
                          // Reset wizard state
                          setWizardStep(1);
                          setIsCreateTrainerModalOpen(false);
                          // Reset form
                          setFormTrainerName("");
                          setFormTrainerImage("");
                          setFormTrainerFolderId("");
                        }}
                        className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-600 text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        Finalizar Ficha
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditTrainerModalOpen && activeTrainerRecord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000000]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsEditTrainerModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0e1014]/98 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Edit3 className="w-5 h-5" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">Editar Treinador</h3>
                  </div>
                  <button onClick={() => setIsEditTrainerModalOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Local photo upload */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-450 block">Substituir Retrato</span>
                    <label className="border border-dashed border-white/15 hover:border-indigo-500/50 hover:bg-indigo-500/5 p-4 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2.5">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                setFormTrainerImage(ev.target.result as string);
                                setNotification("Novo retrato carregado!");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-300 font-medium select-none">Escolher Novo Arquivo...</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-450">URL da Imagem / Avatar</label>
                    <input
                      type="text"
                      placeholder="https://exemplo.com/retrato.png"
                      value={formTrainerImage}
                      onChange={(e) => setFormTrainerImage(e.target.value)}
                      className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-450">Nome do Treinador</label>
                    <input
                      type="text"
                      value={formTrainerName}
                      onChange={(e) => setFormTrainerName(e.target.value)}
                      className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-indigo-500/50 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-450">Pasta de Destino</label>
                    <select
                      value={formTrainerFolderId}
                      onChange={(e) => setFormTrainerFolderId(e.target.value)}
                      className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none"
                    >
                      <option value="">Pasta Raiz (Principal)</option>
                      {trainerFolders.map((f) => (
                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditTrainerModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formTrainerName.trim()) {
                        setNotification("Por favor, digite um nome!");
                        return;
                      }
                      updateTrainerRecord(activeTrainerRecord.id, formTrainerName, formTrainerImage, formTrainerFolderId);
                      setIsEditTrainerModalOpen(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white transition-all active:scale-95 shadow-lg select-none cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: VER DETALHES DO TREINADOR / FICHA COMPLETA */}
        <AnimatePresence>
          {isViewTrainerModalOpen && activeTrainerRecord && (() => {
            const headerOffset = isMobile ? 260 : 136;
            // Safe fallback defaults for existing backward-compatible recorders
            const sheetLevel = activeTrainerRecord.nival || 1;
            const sheetClass = activeTrainerRecord.classe || "Treinador Pokémon";
            const sheetExperience = activeTrainerRecord.experience || "0";
            const sheetAge = activeTrainerRecord.age || "15";
            const sheetHeight = activeTrainerRecord.height || "1.65 m";
            const sheetWeight = activeTrainerRecord.weight || "52 kg";
            const sheetAppearance = activeTrainerRecord.appearance || "Visual clássico com gorro, camisa vermelha e jaqueta azul.";
            const sheetHistory = activeTrainerRecord.history || "Começou sua jornada com o desejo de registrar todos os Pokémon.";
            const sheetMethod = activeTrainerRecord.attributeMethod || "Standard Array";
            
            const sheetAttrs = activeTrainerRecord.attributes || { FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 };
            const sheetSkills = activeTrainerRecord.skills || [
              { id: "acrobacia", name: "Acrobacia", attribute: "DES" as const, isProficient: false },
              { id: "atletismo", name: "Atletismo", attribute: "FOR" as const, isProficient: false },
              { id: "furtividade", name: "Furtividade", attribute: "DES" as const, isProficient: false },
              { id: "intuicao", name: "Intuição", attribute: "SAB" as const, isProficient: false },
              { id: "investigacao", name: "Investigação", attribute: "INT" as const, isProficient: false },
              { id: "natureza", name: "Natureza", attribute: "INT" as const, isProficient: false },
              { id: "percepcao", name: "Percepção", attribute: "SAB" as const, isProficient: false },
              { id: "persuasao", name: "Persuasão", attribute: "CAR" as const, isProficient: false },
              { id: "sobrevivencia", name: "Sobrevivência", attribute: "SAB" as const, isProficient: false }
            ];

            const sheetHpCurrent = activeTrainerRecord.hpCurrent !== undefined ? activeTrainerRecord.hpCurrent : 10;
            const sheetHpMax = activeTrainerRecord.hpMax !== undefined ? activeTrainerRecord.hpMax : 10;
            const sheetAC = activeTrainerRecord.armorClass !== undefined ? activeTrainerRecord.armorClass : 10;
            const sheetInitiative = activeTrainerRecord.initiative !== undefined ? activeTrainerRecord.initiative : 0;
            const sheetSpeed = activeTrainerRecord.speed !== undefined ? activeTrainerRecord.speed : 9;
            const sheetInventory = activeTrainerRecord.inventory || [];
            const sheetPokemon = activeTrainerRecord.pokemon || [];
            const sheetFeats = activeTrainerRecord.feats || [];
            const sheetNotes = activeTrainerRecord.notes || "";

            const getModifier = (value: number) => {
              return Math.floor((value - 10) / 2);
            };

            const getProficiencyBonus = (level: number) => {
              return Math.floor((level - 1) / 4) + 2;
            };

            const profBonus = getProficiencyBonus(sheetLevel);

            const togglePokemonPc = (pokemonId: string) => {
              const updated = sheetPokemon.map(p => {
                if (p.id === pokemonId) {
                  return { ...p, isPc: !p.isPc };
                }
                return p;
              });
              updateActiveTrainerProperty("pokemon", updated);
              const targetPokemon = sheetPokemon.find(p => p.id === pokemonId);
              if (targetPokemon) {
                setNotification(!targetPokemon.isPc ? "Pokémon armazenado no PC Box!" : "Pokémon retirado para a equipe party!");
              }
            };

            const deletePokemon = (pokemonId: string) => {
              const updated = sheetPokemon.filter(p => p.id !== pokemonId);
              updateActiveTrainerProperty("pokemon", updated);
              setNotification("Pokémon liberado com sucesso para a natureza.");
            };

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4 text-white overflow-hidden"
                onClick={() => setIsViewTrainerModalOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.97, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.97, y: 20 }}
                  className="bg-[#0b0c10]/98 border-0 md:border md:border-white/10 rounded-none md:rounded-2xl w-full h-full md:h-[90vh] md:max-w-5xl shadow-2xl overflow-hidden flex flex-col transform cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* UNIFIED STICKY HEADER & TABS WRAPPER */}
                  <div 
                    className="relative z-45 shrink-0 bg-[#090b11]/98 transition-all duration-300 ease-in-out"
                    style={{
                      transform: trainerHeaderCompact ? `translateY(-${headerOffset}px)` : "translateY(0px)",
                    }}
                  >
                    {/* HERO HEADER AREA (Gamer/RPG Style) */}
                    <div 
                      className="relative overflow-hidden flex flex-col md:flex-row items-center gap-5 p-5 transition-all duration-300 ease-in-out bg-gradient-to-r from-[#14151b] via-[#1b1e28] to-[#121419]"
                      style={{
                        height: isMobile ? "260px" : "136px",
                        opacity: trainerHeaderCompact ? 0 : 1,
                        transform: trainerHeaderCompact ? "scale(0.97)" : "scale(1)",
                        pointerEvents: trainerHeaderCompact ? "none" : "auto",
                      }}
                    >
                      {/* Background visual embellishment */}
                      <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_right,rgba(99,102,241,0.06),transparent_70%)] pointer-events-none animate-fade-in" />
                      <div className="absolute left-1/4 top-0 bottom-0 w-64 bg-[radial-gradient(circle,rgba(239,68,68,0.02),transparent_75%)] pointer-events-none animate-fade-in" />
                      
                      {/* Character Portrait with Metal/Holographic Shield Frame */}
                      <div className="relative shrink-0 select-none group">
                        <div className="relative rounded-2xl overflow-hidden border transition-all duration-300 ease-in-out bg-[#0c0d12] w-20 h-20 md:w-24 md:h-24 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <img 
                            src={activeTrainerRecord.image || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"} 
                            alt={activeTrainerRecord.name}
                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300 pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                          {/* Shimmer glaze active gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10]/90 via-transparent to-transparent pointer-events-none" />
                        </div>
                        
                        {/* Level Badge anchored onto the frame */}
                        <div className="absolute bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-300 text-[#0f1015] font-black rounded shadow-md tracking-wider font-sans select-none transition-all duration-300 ease-in-out -bottom-1 -right-1 text-[10px] px-2 py-0.5">
                          NV {sheetLevel}
                        </div>
                      </div>

                      {/* Character Bio & XP Progress Column */}
                      <div className="flex-1 transition-all duration-300 ease-in-out w-full text-center md:text-left space-y-2">
                        <div className="transition-all duration-300 ease-in-out space-y-0.5">
                          <div className="flex flex-col md:flex-row md:items-baseline gap-2 justify-center md:justify-start">
                            <h2 className="font-black text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all duration-300 text-lg md:text-xl tracking-wide">
                              {activeTrainerRecord.name}
                            </h2>
                            <span className="font-extrabold uppercase bg-indigo-500/10 border border-indigo-500/20 rounded transition-all duration-300 text-[9px] md:text-[10px] px-2.5 py-0.5 tracking-widest text-[#a5b4fc]">
                              {sheetClass}
                            </span>
                          </div>
                          <p className="text-[8.5px] text-neutral-400 font-mono tracking-wider uppercase transition-all duration-300">
                            Registro Oficial de Campanha
                          </p>
                        </div>

                        {/* Experience Progress Bar */}
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-1 max-w-md mx-auto md:mx-0 overflow-hidden"
                        >
                          {(() => {
                            let xpCurrent = 0;
                            let xpMax = 1000;
                            if (sheetExperience.includes("/")) {
                              const parts = sheetExperience.split("/");
                              xpCurrent = parseInt(parts[0]) || 0;
                              xpMax = parseInt(parts[1]) || 1000;
                            } else {
                              xpCurrent = parseInt(sheetExperience) || 0;
                              xpMax = sheetLevel * 1000;
                            }
                            const xpPercentage = Math.max(0, Math.min(100, (xpCurrent / xpMax) * 100));

                            return (
                              <>
                                <div className="flex justify-between items-center text-[9px] font-mono tracking-wider text-neutral-350">
                                  <span className="font-bold uppercase text-amber-500 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500" /> EXPERIÊNCIA
                                  </span>
                                  <span className="font-extrabold text-white bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                    {xpCurrent} / {xpMax} XP ({xpPercentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-black/65 border border-white/[0.08] rounded-full overflow-hidden p-[1px] shadow-inner">
                                  <div 
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                                    style={{ width: `${xpPercentage}%` }}
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </motion.div>
                      </div>

                      {/* Global Actions Row in Header */}
                      <div className="flex items-center gap-2 transition-all duration-300 ease-in-out flex-row md:flex-col self-stretch md:self-center justify-center md:items-end md:justify-start">
                        <button 
                          onClick={() => {
                            addCampaignToken(activeTrainerRecord.name, activeTrainerRecord.image, 1.5, "#6366f1", sheetHpMax, activeTrainerRecord.id);
                            setNotification(`Conjurou ${activeTrainerRecord.name} na arena!`);
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-lg transition-all duration-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer whitespace-nowrap p-1.5 px-3"
                        >
                          <span>🏰 Invocado</span>
                        </button>
                        
                        <button 
                          onClick={() => setIsViewTrainerModalOpen(false)} 
                          className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-neutral-300 hover:text-white transition-all uppercase font-bold cursor-pointer whitespace-nowrap p-1.5 px-3 text-[10px]"
                        >
                          Fechar Ficha
                        </button>
                      </div>
                    </div>

                    {/* MODERN TABS BAR (Horizontal navigation below Hero Header) */}
                    <div className={`relative shrink-0 border-b transition-all duration-300 ease-in-out ${
                      trainerHeaderCompact 
                        ? "bg-[#0b0c10]/80 backdrop-blur-[12px] border-cyan-500/35 shadow-[0_8px_32px_rgba(6,182,212,0.15)] py-2" 
                        : "bg-[#0f1118] border-white/[0.06] py-1.5"
                    }`}>
                      {/* Left & Right scroll fade indicators for touch devices */}
                      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0f1118]/40 to-transparent pointer-events-none z-10 sm:hidden" />
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0f1118]/40 to-transparent pointer-events-none z-10 sm:hidden" />
                      
                      <div className="px-5 md:px-6 flex gap-1 overflow-x-auto scrollbar-none select-none relative custom-scrollbar">
                      {([
                        { id: "geral", label: "Geral", icon: User },
                        { id: "atributos", label: "Atributos", icon: Dumbbell },
                        { id: "pericias", label: "Perícias", icon: Award },
                        { id: "combate", label: "Combate", icon: Shield },
                        { id: "inventario", label: "Inventário", icon: Package },
                        { id: "equipe", label: "Equipe Pokémon", icon: Briefcase },
                        { id: "talentos", label: "Talentos", icon: Scroll },
                        { id: "notas", label: "Notas", icon: FileText }
                      ] as const).map((tab) => {
                        const Icon = tab.icon;
                        const isActive = trainerActiveTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setTrainerActiveTab(tab.id)}
                            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap select-none border ${
                              isActive 
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.1)]" 
                                : "text-neutral-400 border-transparent hover:text-white hover:bg-white/3"
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : "text-neutral-500"}`} />
                            <span>{tab.label}</span>
                            
                            {/* Active Glowing marker underbar */}
                            {isActive && (
                              <motion.div 
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-indigo-500 shadow-[0_0_8px_rgb(99,102,241)]" 
                                transition={{ duration: 0.2 }}
                              />
                            )}
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  </div>

                  {/* Responsive Grid layout */}
                  <div 
                    className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative z-30"
                    style={{
                      transform: trainerHeaderCompact ? `translateY(-${headerOffset}px)` : "translateY(0px)",
                      height: `calc(100% + ${headerOffset}px)`,
                      marginBottom: `-${headerOffset}px`,
                    }}
                  >
                    {/* Central Scrollable Work Panel */}
                    <div 
                      ref={trainerScrollContainerRef}
                      onScroll={(e) => {
                        const scrollTop = e.currentTarget.scrollTop;
                        const prevScrollTop = lastTrainerScrollTopRef.current;
                        
                        if (scrollTop <= 10) {
                          if (trainerHeaderCompact) setTrainerHeaderCompact(false);
                        } else if (scrollTop > prevScrollTop) {
                          if (!trainerHeaderCompact) setTrainerHeaderCompact(true);
                        } else if (scrollTop < prevScrollTop - 8) {
                          if (trainerHeaderCompact) setTrainerHeaderCompact(false);
                        }

                        lastTrainerScrollTopRef.current = scrollTop;
                      }}
                      className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0b0c10] custom-scrollbar"
                    >
                      {/* TAB: GERAL */}
                      {trainerActiveTab === "geral" && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
                            <User className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Dossiê d'Identidade de Treinador</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Identity & Biometrics */}
                            <div className="space-y-5">
                              {/* Identity Card */}
                              <div className="bg-[#11131a] border border-white/[0.05] p-5 rounded-2xl space-y-4 shadow-lg hover:border-indigo-500/15 transition-colors">
                                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider border-b border-white/[0.04] pb-2">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Identidade Básica
                                </div>
                                
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-400">Nome Oficial do Personagem</label>
                                  <input
                                    type="text"
                                    value={activeTrainerRecord.name}
                                    onChange={(e) => updateActiveTrainerProperty("name", e.target.value)}
                                    className="w-full bg-black/40 hover:bg-black/60 focus:bg-black/75 text-xs font-extrabold rounded-xl px-3 py-2.5 border border-white/[0.08] focus:border-indigo-500/50 text-white transition-all focus:outline-none"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-neutral-450 block">Classe / Habilitação</label>
                                    <input
                                      type="text"
                                      value={sheetClass}
                                      onChange={(e) => updateActiveTrainerProperty("classe", e.target.value)}
                                      className="w-full bg-black/40 text-xs rounded-xl px-3 py-2 border border-white/[0.08] text-neutral-200 font-bold focus:border-indigo-400/50 focus:outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-neutral-450 block">Nível de Campanha</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="20"
                                      value={sheetLevel}
                                      onChange={(e) => updateActiveTrainerProperty("nival", parseInt(e.target.value) || 1)}
                                      className="w-full bg-black/40 text-xs font-mono font-black text-indigo-400 rounded-xl px-3 py-2 border border-white/[0.08] focus:border-indigo-400/50 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-450 block">Pontos de Experiência Totais</label>
                                  <input
                                    type="text"
                                    value={sheetExperience}
                                    onChange={(e) => updateActiveTrainerProperty("experience", e.target.value)}
                                    className="w-full bg-black/40 text-xs font-mono rounded-xl px-3 py-2 border border-white/[0.08] text-amber-400 focus:border-amber-400/50 focus:outline-none"
                                    placeholder="ex: 1250 / 2000"
                                  />
                                </div>
                              </div>

                              {/* Biometrics Card */}
                              <div className="bg-[#11131a] border border-white/[0.05] p-5 rounded-2xl space-y-4 shadow-lg hover:border-indigo-500/15 transition-colors">
                                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider border-b border-white/[0.04] pb-2">
                                  <Info className="w-3.5 h-3.5 text-indigo-400" /> Biometria & Portabilidade de Retrato
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-neutral-450 block">Idade</label>
                                    <input
                                      type="text"
                                      value={sheetAge}
                                      onChange={(e) => updateActiveTrainerProperty("age", e.target.value)}
                                      className="w-full bg-black/40 text-xs rounded-xl px-2 py-2 border border-white/[0.08] text-center text-white focus:border-indigo-400 focus:outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-neutral-450 block">Altura</label>
                                    <input
                                      type="text"
                                      value={sheetHeight}
                                      onChange={(e) => updateActiveTrainerProperty("height", e.target.value)}
                                      className="w-full bg-black/40 text-xs rounded-xl px-2 py-2 border border-white/[0.08] text-center text-white focus:border-indigo-400 focus:outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-neutral-450 block">Peso</label>
                                    <input
                                      type="text"
                                      value={sheetWeight}
                                      onChange={(e) => updateActiveTrainerProperty("weight", e.target.value)}
                                      className="w-full bg-black/40 text-xs rounded-xl px-2 py-2 border border-white/[0.08] text-center text-white focus:border-indigo-400 focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-450 block">Link de Imagem do Avatar</label>
                                  <input
                                    type="text"
                                    value={activeTrainerRecord.image}
                                    onChange={(e) => updateActiveTrainerProperty("image", e.target.value)}
                                    className="w-full bg-black/40 text-[10px] font-mono rounded-xl px-3 py-2 border border-white/[0.08] text-neutral-400 focus:border-indigo-400 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Physical Desc & History Description */}
                            <div className="space-y-5">
                              {/* Physical Desc Card */}
                              <div className="bg-[#11131a] border border-white/[0.05] p-5 rounded-2xl space-y-3 shadow-lg flex flex-col h-[180px] md:h-[200px] hover:border-indigo-500/15 transition-colors">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[#a5b4fc] block">Aparência Biológica & Vestuário</label>
                                <textarea
                                  value={sheetAppearance}
                                  onChange={(e) => updateActiveTrainerProperty("appearance", e.target.value)}
                                  className="w-full flex-1 bg-black/40 text-xs rounded-xl px-3.5 py-3 border border-white/[0.08] text-neutral-300 focus:border-indigo-550 focus:outline-none leading-relaxed resize-none"
                                  placeholder="Detalhes físicos, mochilas, uniformes de ginásio, boné da liga, cicatrizes memoráveis no rosto..."
                                />
                              </div>

                              {/* Biography Card */}
                              <div className="bg-[#11131a] border border-white/[0.05] p-5 rounded-2xl space-y-3 shadow-lg flex flex-col h-[220px] md:h-[240px] hover:border-indigo-500/15 transition-colors">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[#a5b4fc] block">Histórico & Jornada do Personagem</label>
                                <textarea
                                  value={sheetHistory}
                                  onChange={(e) => updateActiveTrainerProperty("history", e.target.value)}
                                  className="w-full flex-1 bg-black/40 text-xs rounded-xl px-3.5 py-3 border border-white/[0.08] text-neutral-300 focus:border-indigo-550 focus:outline-none leading-relaxed resize-none"
                                  placeholder="Biografia, sua cidade natal na região, seu primeiro Pokémon inicial obtido, suas motivações, arqui-inimigos e conquistas lendárias na Liga..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB: ATRIBUTOS */}
                      {trainerActiveTab === "atributos" && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2.5">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="w-4 h-4 text-indigo-400" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Atributos Primordiais</h3>
                            </div>
                            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl font-mono text-indigo-300">
                              Gerador via: <strong className="text-white font-black">{sheetMethod}</strong>
                            </span>
                          </div>

                          <div className="p-4 bg-gradient-to-r from-indigo-950/20 to-transparent border border-indigo-500/10 rounded-2xl text-neutral-300 text-xs leading-relaxed flex items-center gap-2">
                            <span>Os atributos primordiais dão a base para as perícias e testes de resistência do Treinador.</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const).map((attr) => {
                              const v = sheetAttrs[attr];
                              const mod = getModifier(v);
                              const plusSign = mod >= 0 ? "+" : "";
                              
                              // Visual customization for each attribute
                              const labels: Record<string, { full: string; desc: string; color: string; icon: string }> = {
                                FOR: { full: "Força", desc: "Esforço Físico", color: "border-red-500/20 text-red-400 bg-red-950/5", icon: "💪" },
                                DES: { full: "Destreza", desc: "Agilidade & Reflexos", color: "border-emerald-500/20 text-emerald-400 bg-emerald-950/5", icon: "🤸" },
                                CON: { full: "Constituição", desc: "Vigor & Resistência", color: "border-amber-500/20 text-amber-400 bg-amber-950/5", icon: "🛡️" },
                                INT: { full: "Inteligência", desc: "Raciocínio & Estudo", color: "border-blue-500/20 text-blue-400 bg-blue-950/5", icon: "🧠" },
                                SAB: { full: "Sabedoria", desc: "Percepção & Instinto", color: "border-purple-500/20 text-purple-400 bg-purple-950/5", icon: "👁️" },
                                CAR: { full: "Carisma", desc: "Presença & Magnetismo", color: "border-pink-500/20 text-pink-400 bg-pink-950/5", icon: "✨" },
                              };

                              const item = labels[attr];
                              const progressPct = Math.min(100, (v / 20) * 100);

                              return (
                                <div 
                                  key={attr} 
                                  className={`bg-[#0d0f15]/90 border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-indigo-500/30 transition-all shadow-inner relative group overflow-hidden ${item.color}`}
                                >
                                  {/* Absolute Badge Icon decoration */}
                                  <div className="absolute top-2 right-4 opacity-[0.03] text-5xl select-none pointer-events-none transition-transform duration-500 group-hover:scale-125">
                                    {item.icon}
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-2.5 text-left">
                                    <div className="space-y-0.5">
                                      <div className="text-[11px] uppercase font-black text-white tracking-wider flex items-center gap-1">
                                        <span>{item.icon}</span>
                                        <span className="text-white">{item.full}</span>
                                        <span className="text-neutral-500 font-mono text-[9px] font-bold">({attr})</span>
                                      </div>
                                      <div className="text-[8.5px] uppercase font-bold text-neutral-400 font-mono leading-none">
                                        {item.desc}
                                      </div>
                                    </div>

                                    {/* Attributes Value controls & Progress bar */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateActiveTrainerProperty("attributes", {
                                              ...sheetAttrs,
                                              [attr]: Math.max(v - 1, 1)
                                            });
                                          }}
                                          className="w-8 h-8 sm:w-7 sm:h-6 flex items-center justify-center bg-black/60 hover:bg-neutral-800 rounded-lg text-sm sm:text-xs font-black transition-all border border-white/5 cursor-pointer text-neutral-300 hover:text-white"
                                        >
                                          -
                                        </button>
                                        <span className="w-8 text-center text-xs font-black font-mono text-white">
                                          {v}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            updateActiveTrainerProperty("attributes", {
                                              ...sheetAttrs,
                                              [attr]: Math.min(v + 1, 30)
                                            });
                                          }}
                                          className="w-8 h-8 sm:w-7 sm:h-6 flex items-center justify-center bg-black/60 hover:bg-neutral-800 rounded-lg text-sm sm:text-xs font-black transition-all border border-white/5 cursor-pointer text-neutral-300 hover:text-white"
                                        >
                                          +
                                        </button>

                                        {/* Progress Bar representing power (1 to 20 or 1 to 30) */}
                                        <div className="flex-1 h-2 bg-black/60 rounded-full border border-white/5 overflow-hidden p-[1px]">
                                          <div 
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-650 to-indigo-500 shadow-[0_0_8px_#6366f1]" 
                                            style={{ width: `${progressPct}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right side: High Highlight Modifier badge */}
                                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border shrink-0 bg-black/50 ${
                                    mod >= 0 
                                      ? "border-emerald-500/25 text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.08)]" 
                                      : "border-rose-500/20 text-rose-400"
                                  }`}>
                                    <span className="text-[7.5px] font-mono font-bold tracking-widest text-neutral-450 uppercase leading-none">MOD</span>
                                    <span className="text-lg font-black font-mono leading-none mt-1">
                                      {plusSign}{mod}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TAB: PERÍCIAS */}
                      {trainerActiveTab === "pericias" && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2.5">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-indigo-400" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Tabela de Perícias de Treinador</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-[#1b1c26] border border-indigo-500/10 px-3 py-1.5 rounded-xl">
                              <span className="text-[10px] uppercase tracking-wider text-neutral-450 font-bold">Bônus de Proficiência:</span>
                              <strong className="text-xs font-mono text-indigo-300">+{profBonus}</strong>
                            </div>
                          </div>

                          <div className="p-4 bg-gradient-to-r from-indigo-950/20 to-transparent border border-indigo-500/10 rounded-2xl text-neutral-300 text-xs leading-relaxed flex items-start gap-3">
                            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <span>
                              A proficiência em testes de perícia adiciona seu <strong className="text-white">Bônus de Proficiência (+{profBonus})</strong> à jogada correspondente. Marque o círculo ao lado da perícia para indicar especialização ou adestramento relevante de campanha.
                            </span>
                          </div>

                          {/* Skill List Container */}
                          <div className="bg-[#11131a] rounded-2xl border border-white/[0.05] overflow-hidden shadow-xl">
                            {/* Table Header */}
                            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-white/[0.02] border-b border-white/[0.05] text-[10px] uppercase font-black tracking-wider text-neutral-400 font-mono">
                              <div className="col-span-2 text-center">Treinado</div>
                              <div className="col-span-4">Perícia de Treinador</div>
                              <div className="col-span-2 text-center">Atributo</div>
                              <div className="col-span-2 text-center">Modificador Base</div>
                              <div className="col-span-2 text-right">Modificador Final</div>
                            </div>

                            <div className="divide-y divide-white/[0.03] text-xs text-neutral-300">
                              {sheetSkills.map((sk) => {
                                const attrModValue = getModifier(sheetAttrs[sk.attribute]);
                                const finalModifier = attrModValue + (sk.isProficient ? profBonus : 0);
                                const finalSign = finalModifier >= 0 ? "+" : "";
                                
                                // Beautiful badge mapping
                                const attrBadgeStyles: Record<string, string> = {
                                  FOR: "bg-red-500/10 text-red-300 border-red-500/20",
                                  DES: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
                                  CON: "bg-amber-500/10 text-amber-300 border-amber-500/20",
                                  INT: "bg-blue-500/10 text-blue-300 border-blue-500/20",
                                  SAB: "bg-purple-500/10 text-purple-300 border-purple-500/20",
                                  CAR: "bg-pink-500/10 text-pink-300 border-pink-500/20",
                                };

                                return (
                                  <div key={sk.id} className="group">
                                    {/* DESKTOP/TABLET GRID VIEW */}
                                    <div 
                                      className={`hidden md:grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-all cursor-pointer hover:bg-white/[0.02] ${
                                        sk.isProficient ? "bg-indigo-500/[0.01]" : ""
                                      }`}
                                      onClick={() => {
                                        const nextSkills = sheetSkills.map(s => {
                                          if (s.id === sk.id) {
                                            return { ...s, isProficient: !s.isProficient };
                                          }
                                          return s;
                                        });
                                        updateActiveTrainerProperty("skills", nextSkills);
                                      }}
                                    >
                                      {/* Prof Checkbox */}
                                      <div className="col-span-2 text-center flex justify-center" onClick={(e) => e.stopPropagation()}>
                                        <label className="relative flex items-center justify-center cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={sk.isProficient}
                                            onChange={() => {
                                              const nextSkills = sheetSkills.map(s => {
                                                if (s.id === sk.id) {
                                                  return { ...s, isProficient: !s.isProficient };
                                                }
                                                return s;
                                              });
                                              updateActiveTrainerProperty("skills", nextSkills);
                                            }}
                                            className="sr-only peer"
                                          />
                                          <div className="w-5 h-5 bg-black/40 border border-white/[0.15] rounded-full transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-400 flex items-center justify-center shadow-inner peer-checked:shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                                            <div className="w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
                                          </div>
                                        </label>
                                      </div>

                                      {/* Skill Name */}
                                      <div className="col-span-4 font-extrabold text-white uppercase tracking-wide">
                                        {sk.name}
                                      </div>

                                      {/* Associated Attribute tag */}
                                      <div className="col-span-2 text-center">
                                        <span className={`text-[10px] uppercase font-bold px-2.5 py-1 border rounded-md font-mono ${
                                          attrBadgeStyles[sk.attribute] || "bg-neutral-800 text-neutral-400"
                                        }`}>
                                          {sk.attribute}
                                        </span>
                                      </div>

                                      {/* Attribute default modifier */}
                                      <div className="col-span-2 text-center font-mono text-neutral-400">
                                        {attrModValue >= 0 ? "+" : ""}{attrModValue}
                                      </div>

                                      {/* Final Modifier bold pill */}
                                      <div className="col-span-2 text-right">
                                        <span className={`inline-block font-mono font-black py-1 px-4 rounded-xl text-xs min-w-[50px] text-center border transition-all ${
                                          sk.isProficient 
                                            ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]" 
                                            : "bg-[#181a24] text-neutral-400 border-transparent"
                                        }`}>
                                          {finalSign}{finalModifier}
                                        </span>
                                      </div>
                                    </div>

                                    {/* MOBILE LIST CARD VIEW */}
                                    <div 
                                      className={`flex md:hidden items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.03] active:bg-[#1b1c26]/60 transition-all cursor-pointer ${
                                        sk.isProficient ? "bg-indigo-500/[0.02]" : ""
                                      }`}
                                      onClick={() => {
                                        const nextSkills = sheetSkills.map(s => {
                                          if (s.id === sk.id) {
                                            return { ...s, isProficient: !s.isProficient };
                                          }
                                          return s;
                                        });
                                        updateActiveTrainerProperty("skills", nextSkills);
                                      }}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        {/* Easy Checkbox for thumb tapping */}
                                        <div className="shrink-0 flex items-center justify-center p-1" onClick={(e) => e.stopPropagation()}>
                                          <label className="relative flex items-center justify-center cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={sk.isProficient}
                                              onChange={() => {
                                                const nextSkills = sheetSkills.map(s => {
                                                  if (s.id === sk.id) {
                                                    return { ...s, isProficient: !s.isProficient };
                                                  }
                                                  return s;
                                                });
                                                updateActiveTrainerProperty("skills", nextSkills);
                                              }}
                                              className="sr-only peer"
                                            />
                                            <div className="w-6 h-6 bg-black/50 border border-white/[0.2] rounded-full transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-400 flex items-center justify-center shadow-inner peer-checked:shadow-[0_0_10px_rgba(99,102,241,0.6)]">
                                              <div className="w-2.5 h-2.5 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                          </label>
                                        </div>

                                        <div className="min-w-0">
                                          <div className="font-extrabold text-[11px] text-white uppercase tracking-wide truncate">
                                            {sk.name}
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 border rounded font-mono scale-[0.9] origin-left ${
                                              attrBadgeStyles[sk.attribute] || "bg-neutral-800 text-neutral-400"
                                            }`}>
                                              {sk.attribute}
                                            </span>
                                            <span className="text-[8.5px] text-neutral-500 font-mono">Mod: {attrModValue >= 0 ? "+" : ""}{attrModValue}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Final Modifier Bold Indicator */}
                                      <div className="shrink-0">
                                        <span className={`inline-block font-mono font-black py-1 px-3.5 rounded-lg text-xs min-w-[45px] text-center border ${
                                          sk.isProficient 
                                            ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.15)]" 
                                            : "bg-[#161720] text-neutral-400 border-transparent"
                                        }`}>
                                          {finalSign}{finalModifier}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB: COMBATE */}
                      {trainerActiveTab === "combate" && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
                            <Shield className="w-4 h-4 text-rose-400 animate-pulse" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#fbbf24] font-mono">Status Vital & Parâmetros de Batalha</h3>
                          </div>

                          {/* HP Controller Block */}
                          <div className="bg-[#0f111a] border border-[#f43f5e]/20 p-6 rounded-2xl relative overflow-hidden space-y-5 shadow-[0_0_25px_rgba(244,63,94,0.03)] hover:border-[#f43f5e]/40 transition-all duration-300">
                            {/* Grid decorative lines */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.012)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                            
                            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 relative z-10">
                              <div className="flex items-center gap-2">
                                <span className="text-xs select-none">❤️</span>
                                <span className="text-[10px] uppercase font-black text-rose-400 tracking-wider font-mono">Pontos de Vida Corporais</span>
                              </div>
                              {(() => {
                                const pct = Math.max(0, Math.min(100, (sheetHpCurrent / (sheetHpMax || 1)) * 100));
                                const statusLabel = pct === 0 ? "DESMAIADO (0 HP)" : pct <= 20 ? "⚠️ ESTADO CRÍTICO" : pct <= 50 ? "🩸 FERIDO" : "❇️ ESTÁVEL";
                                const statusColor = pct === 0 ? "bg-red-950/40 text-red-500 border-red-500/25 animate-pulse" : pct <= 20 ? "bg-red-900/10 text-red-400 border-red-500/30 animate-pulse" : pct <= 50 ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                return (
                                  <span className={"text-[8.5px] font-black font-mono tracking-widest uppercase px-2.5 py-1 rounded border " + statusColor}>
                                    {statusLabel}
                                  </span>
                                );
                              })()}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 py-2 relative z-10">
                              <div className="bg-black/35 p-3 rounded-xl border border-white/[0.04] space-y-1.5 focus-within:border-emerald-500/30 transition-colors">
                                <label className="text-[9px] uppercase font-black tracking-widest text-emerald-400 block text-center font-mono">Vida Atual (-/+)</label>
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={sheetHpCurrent}
                                    onChange={(e) => updateActiveTrainerProperty("hpCurrent", Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-transparent text-xl text-center font-black text-emerald-400 font-mono focus:outline-none placeholder-emerald-950"
                                  />
                                </div>
                              </div>
                              <div className="bg-black/35 p-3 rounded-xl border border-white/[0.04] space-y-1.5 focus-within:border-indigo-500/30 transition-colors">
                                <label className="text-[9px] uppercase font-black tracking-widest text-neutral-400 block text-center font-mono">Vida Limite (Max)</label>
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={sheetHpMax}
                                    onChange={(e) => updateActiveTrainerProperty("hpMax", Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full bg-transparent text-xl text-center font-black text-neutral-200 font-mono focus:outline-none placeholder-neutral-800"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Custom Responsive HP Bar */}
                            {(() => {
                              const pct = Math.max(0, Math.min(100, (sheetHpCurrent / (sheetHpMax || 1)) * 100));
                              const hpColor = pct > 50 ? "from-emerald-600 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-500/30" : pct > 20 ? "from-amber-600 to-amber-450 shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-500/30" : "from-red-650 to-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] border-red-500/30";
                              return (
                                <div className="space-y-2 pt-1 relative z-10">
                                  <div className="flex justify-between items-center font-mono text-[9px] text-neutral-400">
                                    <span className="uppercase font-bold tracking-wider">Integridade Celular</span>
                                    <span className="text-white font-black">{pct.toFixed(0)}% ({sheetHpCurrent} / {sheetHpMax})</span>
                                  </div>
                                  <div className="w-full h-4 bg-black/60 border border-white/10 rounded-lg overflow-hidden p-[2.5px] shadow-inner relative">
                                    <div className={"h-full rounded-[4px] bg-gradient-to-r " + hpColor + " transition-all duration-350"} style={{ width: pct + "%" }} />
                                    {/* Overlay tech bar lines */}
                                    <div className="absolute inset-x-0 inset-y-0 bg-[linear-gradient(90deg,transparent_2px,rgba(0,0,0,0.15)_2px)] bg-[size:6px_100%] pointer-events-none" />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Quick Healing Controls */}
                            <div className="flex gap-2 flex-wrap justify-between items-center pt-3 border-t border-white/[0.04] relative z-10">
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateActiveTrainerProperty("hpCurrent", Math.max(sheetHpCurrent - 5, 0))}
                                  className="h-11 sm:h-8 px-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-[10px] font-black text-red-400 transition-all uppercase cursor-pointer flex items-center justify-center"
                                >
                                  -5 HP
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateActiveTrainerProperty("hpCurrent", Math.max(sheetHpCurrent - 1, 0))}
                                  className="h-11 sm:h-8 px-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-[10px] font-black text-red-400 transition-all uppercase cursor-pointer flex items-center justify-center"
                                >
                                  -1 HP
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => updateActiveTrainerProperty("hpCurrent", sheetHpMax)}
                                className="h-11 sm:h-8 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-400 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                🧪 Restaurar Integridade (Cura Completa)
                              </button>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateActiveTrainerProperty("hpCurrent", Math.min(sheetHpCurrent + 1, sheetHpMax))}
                                  className="h-11 sm:h-8 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-400 transition-all uppercase cursor-pointer flex items-center justify-center"
                                >
                                  +1 HP
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateActiveTrainerProperty("hpCurrent", Math.min(sheetHpCurrent + 5, sheetHpMax))}
                                  className="h-11 sm:h-8 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-[10px] font-black text-emerald-400 transition-all uppercase cursor-pointer flex items-center justify-center"
                                >
                                  +5 HP
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Tactical Attributes Grid (AC, Initiative, Speed) */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Armor Class */}
                            <div className="bg-[#11131a] p-5 rounded-2xl border border-white/[0.05] hover:border-[#fbbf24]/15 transition-all duration-300 flex flex-col justify-between text-center relative group">
                              <div className="absolute top-3 right-4 opacity-10 text-lg group-hover:scale-125 transition-transform">🛡️</div>
                              <span className="text-[9px] uppercase font-black text-indigo-300 block tracking-widest font-mono">Classe de Armadura (CA)</span>
                              
                              <div className="my-5 font-mono flex items-center justify-center gap-3">
                                <input
                                  type="number"
                                  value={sheetAC}
                                  onChange={(e) => updateActiveTrainerProperty("armorClass", parseInt(e.target.value) || 0)}
                                  className="w-24 bg-black/60 text-center font-black text-[#fbbf24] text-2xl rounded-xl py-2.5 border border-white/[0.08] focus:border-indigo-500/50 focus:outline-none tracking-tight"
                                />
                              </div>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-wide font-medium leading-normal">Defesa física e resistência passiva contra golpes</span>
                            </div>

                            {/* Initiative */}
                            <div className="bg-[#11131a] p-5 rounded-2xl border border-white/[0.05] hover:border-[#fbbf24]/15 transition-all duration-300 flex flex-col justify-between text-center relative group">
                              <div className="absolute top-3 right-4 opacity-10 text-lg group-hover:scale-125 transition-transform">⚡</div>
                              <span className="text-[9px] uppercase font-black text-indigo-300 block tracking-widest font-mono">Mod. Iniciativa</span>
                              
                              <div className="my-5 font-mono flex items-center justify-center gap-3">
                                <input
                                  type="number"
                                  value={sheetInitiative}
                                  onChange={(e) => updateActiveTrainerProperty("initiative", parseInt(e.target.value) || 0)}
                                  className="w-24 bg-black/60 text-center font-black text-[#a5b4fc] text-2xl rounded-xl py-2.5 border border-white/[0.08] focus:border-[#fbbf24]/50 focus:outline-none tracking-tight"
                                />
                              </div>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-wide font-medium leading-normal">Agilidade para tomar o início do turno de ação</span>
                            </div>

                            {/* Speed displacement */}
                            <div className="bg-[#11131a] p-5 rounded-2xl border border-white/[0.05] hover:border-emerald-500/15 transition-all duration-300 flex flex-col justify-between text-center relative group">
                              <div className="absolute top-3 right-4 opacity-10 text-lg group-hover:scale-125 transition-transform">👟</div>
                              <span className="text-[9px] uppercase font-black text-indigo-300 block tracking-widest font-mono">Deslocamento</span>
                              
                              <div className="my-5 font-mono flex items-center justify-center gap-3">
                                <input
                                  type="number"
                                  value={sheetSpeed}
                                  onChange={(e) => updateActiveTrainerProperty("speed", parseInt(e.target.value) || 0)}
                                  className="w-24 bg-black/60 text-center font-black text-emerald-400 text-2xl rounded-xl py-2.5 border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none tracking-tight"
                                />
                                <span className="text-xs font-bold text-neutral-400 font-mono lowercase">m</span>
                              </div>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-wide font-medium leading-normal">Capacidade de movimentação tática em metros</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB: INVENTÁRIO */}
                      {trainerActiveTab === "inventario" && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-white/[0.06] pb-2.5">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-indigo-400" />
                              <h3 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Inventário & Itens do Mochilão</h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(null);
                                setFormItemName("");
                                setFormItemQty(1);
                                setFormItemWeight(0.1);
                                setFormItemCategory("Consumível");
                                setFormItemDesc("");
                                setIsAddItemModalOpen(true);
                              }}
                              className="px-4 h-8 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition-all transform hover:scale-[1.03] active:scale-95 flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar Item
                            </button>
                          </div>

                          {/* Inventory Weight total header block */}
                          {(() => {
                            const totalWeight = sheetInventory.reduce((acc, item) => acc + (item.quantity * item.weight), 0);
                            const maxWeight = 50 + (getModifier(sheetAttrs["FOR"]) * 5); // RPG formula or default 50+
                            const pct = Math.min(100, (totalWeight / Math.max(20, maxWeight)) * 100);
                            const barColor = pct > 85 ? "from-red-500 to-rose-600" : pct > 60 ? "from-amber-500 to-amber-600" : "from-indigo-500 to-blue-500";
                            return (
                              <div className="p-5 bg-[#11131a] border border-white/[0.05] rounded-2xl shadow-xl space-y-3 hover:border-indigo-500/15 transition-all">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-neutral-400 uppercase font-black text-[10px] tracking-widest block">Capacidade Útil de Carga</span>
                                    <span className="text-[10px] text-neutral-500 leading-none">Carga máxima baseada em Força ({maxWeight} kg)</span>
                                  </div>
                                  <span className="font-mono font-black text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                                    {totalWeight.toFixed(2)} / {maxWeight} kg
                                  </span>
                                </div>
                                <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden p-[2px] border border-white/[0.04]">
                                  <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Inner Form Overlay for Add / Edit Item */}
                          {isAddItemModalOpen && (
                            <div className="bg-[#11131a] p-5 rounded-2xl border border-indigo-500/20 space-y-4 shadow-xl animate-scaleIn">
                              <div className="flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                <h4 className="text-[11px] uppercase font-black text-indigo-300 tracking-wider">
                                  {editingItemId ? "Dossiê: Alterar Parâmetros do Item" : "Dossiê: Registro de Novo Item na Mochila"}
                                </h4>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-400 block">Nome do Objeto</label>
                                  <input
                                    type="text"
                                    placeholder="ex: Ultra Poção, Pedra da Água, Sementes..."
                                    value={formItemName}
                                    onChange={(e) => setFormItemName(e.target.value)}
                                    className="w-full bg-black/40 text-xs px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-white focus:border-indigo-400 focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-455 block">Classificação / Categoria</label>
                                  <select
                                    value={formItemCategory}
                                    onChange={(e) => setFormItemCategory(e.target.value)}
                                    className="w-full bg-black/40 text-xs px-3 py-2 border border-white/[0.08] rounded-xl text-neutral-300 focus:border-indigo-400 focus:outline-none"
                                  >
                                    <option value="Consumível">Consumível / Cura</option>
                                    <option value="Pokébola">Pokébola / Capture</option>
                                    <option value="Equipamento">Equipamento / Arma</option>
                                    <option value="Baga">Baga (Berry)</option>
                                    <option value="Chave">Item Chave</option>
                                    <option value="Outro">Outros / Diversos</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-455 block">Volume / Quantidade</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={formItemQty}
                                    onChange={(e) => setFormItemQty(parseInt(e.target.value) || 1)}
                                    className="w-full bg-black/40 text-xs px-3.5 py-2.5 border border-white/[0.08] rounded-xl font-mono text-white focus:border-indigo-400 focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold text-neutral-455 block">Massa Unitária (kg)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formItemWeight}
                                    onChange={(e) => setFormItemWeight(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/40 text-xs px-3.5 py-2.5 border border-white/[0.08] rounded-xl font-mono text-white focus:border-indigo-400 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-neutral-455 block">Efeitos Especiais & Descrição</label>
                                <textarea
                                  placeholder="Propriedades táticas de restauração de HP, bônus em testes ou uso estético..."
                                  value={formItemDesc}
                                  onChange={(e) => setFormItemDesc(e.target.value)}
                                  className="w-full bg-black/40 text-xs px-3.5 py-2.5 border border-white/[0.08] rounded-xl text-neutral-300 focus:border-indigo-400 focus:outline-none h-16 resize-none"
                                />
                              </div>

                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsAddItemModalOpen(false)}
                                  className="px-4 py-2 text-[10px] bg-white/[0.04] hover:bg-white/[0.08] rounded-xl font-bold uppercase transition-all"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!formItemName.trim()) {
                                      setNotification("Por favor, preencha o nome do item!");
                                      return;
                                    }
                                    if (editingItemId) {
                                      // Edit mode
                                      const updatedInventory = sheetInventory.map(item => {
                                        if (item.id === editingItemId) {
                                          return {
                                            ...item,
                                            name: formItemName.trim(),
                                            quantity: formItemQty,
                                            category: formItemCategory,
                                            weight: formItemWeight,
                                            description: formItemDesc
                                          };
                                        }
                                        return item;
                                      });
                                      updateActiveTrainerProperty("inventory", updatedInventory);
                                      setNotification("Item updated!");
                                    } else {
                                      // Create mode
                                      const newItem = {
                                        id: "item-" + Date.now(),
                                        name: formItemName.trim(),
                                        quantity: formItemQty,
                                        category: formItemCategory,
                                        weight: formItemWeight,
                                        description: formItemDesc
                                      };
                                      updateActiveTrainerProperty("inventory", [...sheetInventory, newItem]);
                                      setNotification("Item added to backpack!");
                                    }
                                    setIsAddItemModalOpen(false);
                                  }}
                                  className="px-5 py-2 text-[10px] bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-bold uppercase shadow transition-all cursor-pointer"
                                >
                                  {editingItemId ? "Salvar Item" : "Adicionar Item"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Bag Pocket Filter Tabs */}
                          <div className="bg-[#0b0c13] p-1.5 rounded-2xl border border-white/[0.04] flex gap-1.5 flex-wrap">
                            {[
                              { id: "Tudo", label: "🎒 Tudo" },
                              { id: "Consumível", label: "🧪 Consumíveis" },
                              { id: "Pokébola", label: "🔴 Pokébolas" },
                              { id: "Equipamento", label: "🗡️ Equipamento" },
                              { id: "Baga", label: "🍇 Bagas/Berries" },
                              { id: "Chave", label: "🔑 Itens Chave" },
                              { id: "Outro", label: "📦 Outros" }
                            ].map((pocket) => {
                              const count = pocket.id === "Tudo" 
                                ? sheetInventory.length 
                                : sheetInventory.filter(i => i.category === pocket.id).length;
                              const isSel = bagPocketFilter === pocket.id;
                              return (
                                <button
                                  key={pocket.id}
                                  type="button"
                                  onClick={() => setBagPocketFilter(pocket.id)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                                    isSel 
                                      ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.08)]" 
                                      : "bg-transparent text-neutral-400 border-transparent hover:text-neutral-200"
                                  }`}
                                >
                                  <span>{pocket.label}</span>
                                  <span className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold font-mono ${
                                    isSel ? "bg-[#a5b4fc]/15 text-[#a5b4fc]" : "bg-white/[0.04] text-neutral-500"
                                  }`}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Inventory Grid Display */}
                          {(() => {
                            const filteredItems = bagPocketFilter === "Tudo" 
                              ? sheetInventory 
                              : sheetInventory.filter(item => item.category === bagPocketFilter);
                            
                            if (filteredItems.length === 0) {
                              return (
                                <div className="p-12 text-center text-xs text-neutral-500 bg-black/15 border border-dashed border-white/[0.07] rounded-3xl space-y-2">
                                  <Briefcase className="w-8 h-8 text-neutral-600 mx-auto opacity-40 animate-pulse" />
                                  <p className="font-extrabold uppercase tracking-widest text-[#a5b4fc]/60 text-[10.5px]">Compartimento Vazio</p>
                                  <p className="text-neutral-500 leading-relaxed max-w-sm mx-auto text-[11px]">Não há objetos de classificação "{bagPocketFilter === "Tudo" ? "Qualquer" : bagPocketFilter}" neste bolso da mochila.</p>
                                </div>
                              );
                            }

                            // Dynamic icons for item categories
                            const getPocketIcon = (category: string) => {
                              switch (category) {
                                case "Consumível": return "🧪";
                                case "Pokébola": return "🔴";
                                case "Equipamento": return "🗡️";
                                case "Baga": return "🍇";
                                case "Chave": return "🔑";
                                default: return "📦";
                              }
                            };

                            const catColors: Record<string, { bg: string; text: string; border: string }> = {
                              Consumível: { bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/20" },
                              Pokébola: { bg: "bg-[#ef4444]/10", text: "text-[#f87171]", border: "border-[#ef4444]/25" },
                              Equipamento: { bg: "bg-amber-500/10", text: "text-[#fbbf24]", border: "border-amber-500/20" },
                              Baga: { bg: "bg-emerald-500/10", text: "text-[#34d399]", border: "border-emerald-500/20" },
                              Chave: { bg: "bg-purple-500/10", text: "text-[#c084fc]", border: "border-purple-500/20" },
                              Outro: { bg: "bg-neutral-500/10", text: "text-neutral-400", border: "border-white/[0.04]" },
                            };

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredItems.map((item) => {
                                  const badge = catColors[item.category] || catColors["Outro"];
                                  const totalCombWeight = (item.weight * item.quantity).toFixed(2);
                                  return (
                                    <div 
                                      key={item.id} 
                                      className="bg-[#12141c] border border-white/[0.05] p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between gap-4 hover:border-indigo-500/20 hover:shadow-[0_4px_25px_rgba(0,0,0,0.3)] transition-all group"
                                    >
                                      {/* Pocket tech slot details */}
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg bg-black/40 w-8 h-8 rounded-xl border border-white/[0.04] flex items-center justify-center shadow-inner animate-pulse">
                                              {getPocketIcon(item.category)}
                                            </span>
                                            <div>
                                              <p className="font-extrabold text-white text-xs tracking-wide leading-tight">{item.name}</p>
                                              <span className={`text-[8px] uppercase tracking-widest font-black inline-block mt-0.5 px-2 rounded-md ${badge.bg} ${badge.text}`}>
                                                {item.category}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {/* Quantity circle badge */}
                                          <div className="bg-indigo-500/10 border border-indigo-500/20 text-[#a5b4fc] font-mono leading-none font-bold text-[10.5px] px-2.5 py-1 rounded-lg">
                                            x{item.quantity}
                                          </div>
                                        </div>

                                        <p className="text-[11px] text-neutral-400 leading-relaxed min-h-[32px] line-clamp-3">
                                          {item.description || "Este item não possui uma descrição tática em seus registros."}
                                        </p>
                                      </div>

                                      {/* Technical Bottom Bar */}
                                      <div className="border-t border-white/[0.03] pt-3 flex items-center justify-between gap-2">
                                        <div className="font-mono text-[9px] text-neutral-500">
                                          Total: <span className="text-neutral-405 font-extrabold">{totalCombWeight} kg</span>
                                        </div>
                                        
                                        <div className="flex gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingItemId(item.id);
                                              setFormItemName(item.name);
                                              setFormItemQty(item.quantity);
                                              setFormItemWeight(item.weight);
                                              setFormItemCategory(item.category);
                                              setFormItemDesc(item.description);
                                              setIsAddItemModalOpen(true);
                                            }}
                                            className="h-7 px-2.5 bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/[0.04] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const nextInv = sheetInventory.filter(i => i.id !== item.id);
                                              updateActiveTrainerProperty("inventory", nextInv);
                                              setNotification(`Removido "${item.name}"`);
                                            }}
                                            className="h-7 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                          >
                                            Excluir
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* TAB: EQUIPE POKÉMON */}
                      {trainerActiveTab === "equipe" && (() => {
                        const activePk = sheetPokemon.filter(p => !p.isPc);
                        const pcPk = sheetPokemon.filter(p => p.isPc);
                        
                        return (
                          <div className="space-y-6 animate-fadeIn text-left">
                            
                            {/* SECTION 1: TIME ATIVO */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#ef4444] flex items-center gap-1.5 font-sans">
                                  <span className="text-red-500">🔴</span> Time Ativo ({activePk.length} / 6)
                                </h3>
                                
                                <button
                                  type="button"
                                  onClick={() => initializePokemonForm(null, false)}
                                  className="px-3 py-1 bg-gradient-to-r from-red-650 to-red-700 hover:from-red-500 hover:to-red-650 rounded-lg text-[10px] font-black uppercase select-none cursor-pointer text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                                >
                                  + Adicionar Pokémon
                                </button>
                              </div>

                              {activePk.length === 0 ? (
                                <div className="p-8 text-center text-neutral-500 border border-dashed border-white/10 rounded-2xl bg-black/10">
                                  <p className="text-[11px] font-semibold text-neutral-400">Nenhum Pokémon ativo no momento.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-scaleIn">
                                  {activePk.map((pk) => {
                                    const hpPct = Math.max(0, Math.min(100, (pk.hpCurrent / (pk.hpMax || 1)) * 100));
                                    const hpColor = hpPct > 50 
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] border-emerald-450" 
                                      : hpPct > 20 
                                        ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] border-amber-450" 
                                        : "bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500/50 animate-pulse";
                                    const primType = pk.types?.[0] || "Normal";
                                    const themeStyling = POKEMON_TYPES_STYLING[primType] || POKEMON_TYPES_STYLING.Normal;
                                    
                                    return (
                                      <div 
                                        key={pk.id} 
                                        className="bg-[#0e1017] border border-white/[0.04] p-4.5 rounded-2xl flex flex-col justify-between gap-4 transition-all relative overflow-hidden group shadow-lg hover:border-red-500/20 text-left"
                                      >
                                        {/* Colored Type Left-Accent */}
                                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${themeStyling.bg}`} />
                                        
                                        {/* Pokemon Core Row */}
                                        <div className="flex items-start gap-3.5">
                                          {/* Animated circular border sprite holder */}
                                          <div className="relative shrink-0 select-none cursor-pointer" onClick={() => initializePokemonForm(pk, false)}>
                                            <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/[0.08] group-hover:border-red-500/30 flex items-center justify-center p-1 overflow-hidden shadow-inner relative">
                                              <img 
                                                src={pk.image} 
                                                alt={pk.name} 
                                                className="w-full h-full object-contain filter drop-shadow hover:scale-120 hover:rotate-3 transition-transform duration-350"
                                                referrerPolicy="no-referrer"
                                              />
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 bg-red-600 border border-[#f87171]/40 text-white font-mono text-[8px] px-1.5 py-0.5 rounded-md font-extrabold shadow-md leading-none">
                                              LV {pk.level}
                                            </span>
                                          </div>

                                          {/* Meta text details */}
                                          <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                              <div className="min-w-0">
                                                <h4 className="font-sans font-black text-white text-[12px] uppercase tracking-wide truncate flex items-center gap-1 cursor-pointer hover:text-red-400 pb-0.5" onClick={() => initializePokemonForm(pk, false)}>
                                                  <span>{pk.name}</span>
                                                  {pk.isShiny && <span className="text-amber-300 text-xs" title="Variante Shiny ✨">✨</span>}
                                                </h4>
                                                <p className="text-[9px] text-[#ff4444] font-black tracking-widest font-mono uppercase truncate leading-none">
                                                  {pk.species}
                                                </p>
                                              </div>

                                              {/* Types Grid badges */}
                                              {pk.types && pk.types.length > 0 && (
                                                <div className="flex gap-1 shrink-0">
                                                  {pk.types.map(t => {
                                                    const st = POKEMON_TYPES_STYLING[t] || POKEMON_TYPES_STYLING.Normal;
                                                    return (
                                                      <span key={t} className={`text-[7px] font-sans font-black px-2 py-0.5 rounded leading-none border uppercase tracking-wider ${st.bg} ${st.border} ${st.text}`}>
                                                        {t}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>

                                            {/* Loyalty and heart status row */}
                                            {pk.loyalty !== undefined && (
                                              <div className="flex items-center gap-1.5 text-[8.5px] text-neutral-450 font-mono">
                                                <span>Lealdade:</span>
                                                <span className="text-emerald-400 font-bold">
                                                  {pk.loyalty === -3 && "💔💔💔 Desconfiado"}
                                                  {pk.loyalty === -2 && "💔💔 Temeroso"}
                                                  {pk.loyalty === -1 && "💔 Distante"}
                                                  {pk.loyalty === 0 && "😐 Neutro"}
                                                  {pk.loyalty === 1 && "❤️ Confiável"}
                                                  {pk.loyalty === 2 && "❤️❤️ Harmônico"}
                                                  {pk.loyalty === 3 && "💚💚💚 Companheiro Perfeito"}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Thick tactile health progress bar */}
                                        <div className="bg-black/40 p-2.5 rounded-xl border border-white/[0.03] space-y-1">
                                          <div className="flex justify-between items-baseline text-[8px] font-mono leading-none text-neutral-400">
                                            <span className="font-extrabold tracking-wider">PONTOS DE SAÚDE (HP)</span>
                                            <span className="font-black text-neutral-200 text-[9px]">
                                              {pk.hpCurrent} <span className="opacity-30">/</span> {pk.hpMax} HP
                                            </span>
                                          </div>
                                          <div className="w-full h-2 bg-black/60 border border-white/5 rounded-full overflow-hidden p-[1.5px] shadow-inner relative">
                                            <div 
                                              className={`h-full rounded-full ${hpColor} transition-all duration-350`} 
                                              style={{ width: `${hpPct}%` }} 
                                            />
                                          </div>
                                        </div>

                                        {/* Direct VTT Quick Invoke triggers */}
                                        <div className="border-t border-white/[0.03] pt-3 flex items-center justify-between gap-1">
                                          {/* Direct Pokeball Launcher shortcut */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedPokeballPokemon(pk);
                                              setSelectedPokeballTrainerId(activeTrainerRecord.id);
                                              setIsViewTrainerModalOpen(false); // Closes the trainer modal instantly
                                              setNotification(`🔴 Pokébola Carregada! Selecione uma casa no mapa para invocar ${pk.name}!`);
                                            }}
                                            className="px-3.5 h-7.5 bg-[#ef4444]/10 hover:bg-[#ef4444] hover:text-white text-red-400 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow"
                                          >
                                            <span className="text-[11px] animate-bounce select-none">🔴</span> Invocação Rápida
                                          </button>

                                          <div className="flex gap-1.5">
                                            {/* Open details modal trigger */}
                                            <button
                                              type="button"
                                              onClick={() => initializePokemonForm(pk, false)}
                                              className="h-7.5 px-3 bg-[#1d1f2a]/90 hover:bg-[#252837] border border-white/[0.04] text-neutral-300 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer"
                                            >
                                              Ficha
                                            </button>
                                            
                                            {/* Send back to PC Box */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = sheetPokemon.map(p => p.id === pk.id ? { ...p, isPc: true } : p);
                                                updateActiveTrainerProperty("pokemon", updated);
                                                setNotification(`Pokémon "${pk.name}" guardado no PC Box`);
                                              }}
                                              className="h-7.5 px-3 bg-[#11131a] hover:bg-neutral-800 border border-white/[0.04] text-neutral-400 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer"
                                            >
                                              PC
                                            </button>

                                            {/* Release trigger */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (true) {
                                                  const updated = sheetPokemon.filter(p => p.id !== pk.id);
                                                  updateActiveTrainerProperty("pokemon", updated);
                                                  setNotification(`Pokémon "${pk.name}" foi libertado.`);
                                                }
                                              }}
                                              className="h-7.5 px-3 bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 text-red-400 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                                            >
                                              Liberar
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* SECTION 2: PC POKÉMON BOX */}
                            <div className="space-y-3 pt-4 border-t border-white/[0.05]">
                              <div className="flex justify-between items-center pb-2">
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 font-sans">
                                  📂 PC Pokémon Box ({pcPk.length} Arquivados)
                                </h3>
                                
                                <button
                                  type="button"
                                  onClick={() => initializePokemonForm(null, true)}
                                  className="px-3 py-1 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer"
                                >
                                  + Adicionar ao PC Box
                                </button>
                              </div>

                              {pcPk.length === 0 ? (
                                <div className="p-8 text-center text-neutral-500 border border-dashed border-white/5 rounded-2xl bg-black/10">
                                  <p className="text-[11px] text-neutral-400">Nenhum Pokémon arquivado no PC Box.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {pcPk.map((pk) => {
                                    const hpPct = Math.max(0, Math.min(100, (pk.hpCurrent / pk.hpMax) * 100));
                                    const hpColor = hpPct > 50 ? "bg-emerald-500/80" : hpPct > 20 ? "bg-amber-500/80" : "bg-rose-500/80";
                                    const primType = pk.types?.[0] || "Normal";
                                    const themeStyling = POKEMON_TYPES_STYLING[primType] || POKEMON_TYPES_STYLING.Normal;

                                    return (
                                      <div 
                                        key={pk.id} 
                                        onClick={() => initializePokemonForm(pk, true)}
                                        className="bg-[#0b0c10]/95 hover:bg-[#12141c]/95 border border-white/[0.03] p-3 rounded-xl flex items-center gap-3 transition-all relative overflow-hidden group shadow cursor-pointer hover:border-indigo-500/20 text-left"
                                      >
                                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500/50" />

                                        {/* Sprite image */}
                                        <div className="relative shrink-0 select-none">
                                          <div className="w-12 h-12 rounded-lg bg-black/45 border border-white/5 flex items-center justify-center p-1 overflow-hidden shadow-inner opacity-75">
                                            <img 
                                              src={pk.image} 
                                              alt={pk.name} 
                                              className="w-full h-full object-contain filter drop-shadow hover:scale-105 transition-transform duration-300"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                          <span className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-neutral-900 border border-white/10 rounded text-[8px] text-neutral-400 font-bold">
                                            ★ {pk.level}
                                          </span>
                                        </div>

                                        {/* Meta text content */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex justify-between items-baseline gap-2">
                                            <div className="min-w-0">
                                              <h4 className="font-sans font-black text-neutral-200 text-[11px] uppercase tracking-wide truncate flex items-center gap-1">
                                                <span>{pk.name}</span>
                                                {pk.isShiny && <span className="text-amber-400" title="Shiny ✨">✨</span>}
                                                {pk.loyalty !== undefined && pk.loyalty !== 0 && (
                                                  <span className="text-[8.5px] font-mono select-none inline-flex items-center gap-0.5 ml-1" title={`Lealdade: ${pk.loyalty >= 0 ? `+${pk.loyalty}` : pk.loyalty}`}>
                                                    {pk.loyalty === -3 && <span className="text-red-500 font-bold">💔💔💔</span>}
                                                    {pk.loyalty === -2 && <span className="text-red-400 font-bold">💔💔</span>}
                                                    {pk.loyalty === -1 && <span className="text-orange-400 font-bold">💔</span>}
                                                    {pk.loyalty === 1 && <span className="text-emerald-300 font-bold">❤️</span>}
                                                    {pk.loyalty === 2 && <span className="text-emerald-400 font-bold font-sans">❤️❤️</span>}
                                                    {pk.loyalty === 3 && <span className="text-[#10b981] font-bold font-sans">❤️❤️❤️</span>}
                                                  </span>
                                                )}
                                              </h4>
                                              <p className="text-[8.5px] text-neutral-400 font-bold tracking-wider font-mono uppercase truncate leading-none">
                                                {pk.species}
                                              </p>
                                            </div>
                                            
                                            {/* Type tag badges */}
                                            {pk.types && pk.types.length > 0 && (
                                              <div className="flex gap-1 shrink-0 font-sans font-black select-none">
                                                {pk.types.map(t => {
                                                  const st = POKEMON_TYPES_STYLING[t] || POKEMON_TYPES_STYLING.Normal;
                                                  return (
                                                    <span key={t} className={`text-[7px] px-1.5 py-0.5 rounded leading-none border uppercase tracking-wider ${st.bg} ${st.border} ${st.text}`}>
                                                      {t}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>

                                          {/* Health Bar */}
                                          <div className="space-y-0.5">
                                            <div className="flex justify-between items-baseline text-[8px] font-mono leading-none text-neutral-500">
                                              <span>HP</span>
                                              <span className="font-bold text-neutral-400">
                                                {pk.hpCurrent}/{pk.hpMax}
                                              </span>
                                            </div>
                                            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full ${hpColor} transition-all duration-300`} 
                                                style={{ width: `${hpPct}%` }} 
                                              />
                                            </div>
                                          </div>
                                        </div>

                                        {/* Action buttons on card hover */}
                                        <div className="flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity justify-center self-stretch shrink-0 pl-1 border-l border-white/5" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            disabled={activePk.length >= 6}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (activePk.length >= 6) {
                                                setNotification("⚠️ Seu Time Pokémon está lotado! Guarde um Pokémon no PC primeiro.");
                                                return;
                                              }
                                              const updated = sheetPokemon.map(p => p.id === pk.id ? { ...p, isPc: false } : p);
                                              updateActiveTrainerProperty("pokemon", updated);
                                              setNotification(`Pokémon "${pk.name}" retirado para o Time Ativo`);
                                            }}
                                            className="p-1 hover:bg-white/5 text-emerald-400 hover:text-emerald-300 disabled:opacity-20 rounded cursor-pointer"
                                            title="Retirar para o Time Ativo"
                                          >
                                            🎒
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (true) {
                                                const updated = sheetPokemon.filter(p => p.id !== pk.id);
                                                updateActiveTrainerProperty("pokemon", updated);
                                                setNotification(`Pokémon "${pk.name}" foi liberado.`);
                                              }
                                            }}
                                            className="p-1 hover:bg-white/5 text-red-400 hover:text-red-300 rounded cursor-pointer"
                                            title="Liberar Pokémon"
                                          >
                                            ❌
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
{/* TAB: TALENTOS */}
                      {trainerActiveTab === "talentos" && (
                        <div className="space-y-5">
                          <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Talentos & Habilidades Especiais</h3>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFeatId(null);
                                setFormFeatName("");
                                setFormFeatDesc("");
                                setFormFeatOrigin("Classe");
                                setFormFeatEffects("");
                                setIsAddFeatModalOpen(true);
                              }}
                              className="px-3 py-1 bg-indigo-650 hover:bg-indigo-600 rounded-lg text-[10px] font-black uppercase select-none cursor-pointer text-white flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar Talento
                            </button>
                          </div>

                          <div className="p-3 bg-neutral-900 border border-white/5 rounded-xl text-neutral-300 text-xs">
                            Estes talentos são concedidos pela sua classe, nível ou eventos memoráveis na campanha. Eles influenciam a cooperação com os seus Pokémon e expandem suas capacidades em arenas de sobrevivência.
                          </div>

                          {isAddFeatModalOpen && (
                            <div className="bg-[#13151f] p-4 rounded-xl border border-indigo-500/20 space-y-3">
                              <h4 className="text-[11px] uppercase font-bold text-indigo-400">
                                {editingFeatId ? "Editar Detalhes do Talento" : "Cadastrar Novo Talento"}
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-neutral-450 block">Nome do Talento</label>
                                  <input
                                    type="text"
                                    placeholder="ex: Linhagem de Fogo, Mentor Tático..."
                                    value={formFeatName}
                                    onChange={(e) => setFormFeatName(e.target.value)}
                                    className="w-full bg-[#0a0c10] text-xs px-2.5 py-1.5 border border-white/10 rounded text-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-neutral-450 block">Origem do Talento</label>
                                  <input
                                    type="text"
                                    placeholder="ex: Classe Nvl 3, Inicial, Treinador Especialista..."
                                    value={formFeatOrigin}
                                    onChange={(e) => setFormFeatOrigin(e.target.value)}
                                    className="w-full bg-[#0a0c10] text-xs px-2.5 py-1.5 border border-white/10 rounded text-white"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-450 block">Efeitos Mecânicos (Resumo)</label>
                                <input
                                  type="text"
                                  placeholder="ex: Concede +2 de iniciativa e bônus passivo de evasão..."
                                  value={formFeatEffects}
                                  onChange={(e) => setFormFeatEffects(e.target.value)}
                                  className="w-full bg-[#0a0c10] text-xs px-2.5 py-1.5 border border-white/10 rounded text-white"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-450 block">Descrição Detalhada</label>
                                <textarea
                                  placeholder="Mais detalhes sobre como usar..."
                                  value={formFeatDesc}
                                  onChange={(e) => setFormFeatDesc(e.target.value)}
                                  className="w-full bg-[#0a0c10] text-xs px-2.5 py-1.5 border border-white/10 rounded text-white"
                                  rows={2.5}
                                />
                              </div>

                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsAddFeatModalOpen(false)}
                                  className="px-3 py-1 text-[10px] bg-white/5 hover:bg-white/10 rounded font-bold uppercase transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!formFeatName.trim()) {
                                      setNotification("Por favor, preencha o nome do talento!");
                                      return;
                                    }
                                    if (editingFeatId) {
                                      const updatedFeats = sheetFeats.map(f => {
                                        if (f.id === editingFeatId) {
                                          return {
                                            ...f,
                                            name: formFeatName.trim(),
                                            origin: formFeatOrigin.trim(),
                                            effects: formFeatEffects.trim(),
                                            description: formFeatDesc.trim()
                                          };
                                        }
                                        return f;
                                      });
                                      updateActiveTrainerProperty("feats", updatedFeats);
                                      setNotification("Talento atualizado!");
                                    } else {
                                      const newF = {
                                        id: "f-" + Date.now(),
                                        name: formFeatName.trim(),
                                        origin: formFeatOrigin.trim(),
                                        effects: formFeatEffects.trim(),
                                        description: formFeatDesc.trim()
                                      };
                                      updateActiveTrainerProperty("feats", [...sheetFeats, newF]);
                                      setNotification("Talento adicionado!");
                                    }
                                    setIsAddFeatModalOpen(false);
                                  }}
                                  className="px-4 py-1 text-[10px] bg-indigo-650 hover:bg-indigo-600 rounded text-white font-bold uppercase cursor-pointer"
                                >
                                  Salvar Talento
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            {sheetFeats.length === 0 ? (
                              <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-white/10 rounded-xl">
                                Seu personagem não possui talentos listados ainda. Clique em "Adicionar Talento" acima para começar!
                              </div>
                            ) : (
                              sheetFeats.map((feat) => (
                                <div key={feat.id} className="bg-[#13151f]/85 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-white text-xs uppercase">{feat.name}</h4>
                                      <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full font-mono">
                                        Origem: {feat.origin || "Geral"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#fbbf24] font-medium leading-none">Efeito: {feat.effects || "Não fornecido."}</p>
                                    <p className="text-[11px] text-neutral-400 leading-relaxed pt-1">{feat.description || "Sem descrição mecânica."}</p>
                                  </div>

                                  <div className="flex gap-1.5 self-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingFeatId(feat.id);
                                        setFormFeatName(feat.name);
                                        setFormFeatOrigin(feat.origin);
                                        setFormFeatEffects(feat.effects);
                                        setFormFeatDesc(feat.description);
                                        setIsAddFeatModalOpen(true);
                                      }}
                                      className="p-1 px-2.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px] font-bold uppercase transition-all"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateActiveTrainerProperty("feats", sheetFeats.filter(f => f.id !== feat.id));
                                        setNotification(`Excluído talento "${feat.name}"`);
                                      }}
                                      className="p-1 px-2.5 bg-red-800/15 text-red-400 hover:bg-red-800/30 rounded text-[9px] font-bold uppercase transition-all"
                                    >
                                      Remover/Excluir
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* TAB: NOTAS */}
                      {trainerActiveTab === "notas" && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#fbbf24]">Diário / Notas Gerais Livres</h3>
                            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Salvo de forma persistente
                            </span>
                          </div>

                          <div className="bg-[#13151f] p-4 rounded-xl border border-white/5 space-y-2">
                            <label className="text-[10px] uppercase font-bold text-neutral-400 block tracking-widest">Anotações do Jogador</label>
                            <textarea
                              value={sheetNotes}
                              onChange={(e) => updateActiveTrainerProperty("notes", e.target.value)}
                              rows={14}
                              className="w-full bg-[#0a0c10]/95 font-mono text-xs rounded p-4 border border-white/10 text-neutral-300 focus:outline-none focus:border-indigo-500/40 leading-relaxed"
                              placeholder="Utilize este espaço livre para de forma livre documentar pistas, encontros, fraquezas descobertas, metas de ginásio e rotas de exploração..."
                            />
                            <p className="text-[9.5px] text-neutral-400 font-mono mt-1">Dica: Suas anotações são imediatamente gravadas localmente à medida que você digita.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* DETAILS FLOATING MODAL FOR POKEMON SHEET */}
        <AnimatePresence>
          {isAddPokemonModalOpen && (() => {
            const sheetPokemon = activeTrainerRecord?.pokemon || [];
            const headerOffset = isMobile ? 250 : 176;
            const profBonus = Math.floor((formPokemonLevel - 1) / 4) + 2;
            const loyaltyHpBonus = formPokemonLoyalty === 2 ? Math.ceil(formPokemonLevel / 2) : (formPokemonLoyalty === 3 ? formPokemonLevel : 0);
            const effectiveHpMax = formPokemonHpMax + loyaltyHpBonus;
            const hpPct = Math.min(100, Math.max(0, (formPokemonHpCurrent / (effectiveHpMax || 1)) * 100));
            const barColor = hpPct > 55 ? "from-emerald-500 to-teal-400 border-emerald-400/30 text-emerald-400" : 
                             hpPct > 25 ? "from-amber-500 to-orange-400 border-amber-400/30 text-amber-400" : 
                             "from-red-650 to-rose-500 shadow-[0_0_8px_#ef4444] border-red-500/30 text-red-405";

            const mapStatusToUI = (status: string | undefined) => {
              if (!status) return null;
              const s = status.toLowerCase();
              if (s === "paralisia" || s === "paralisado" || s === "paralysis") {
                return { name: "Paralisado", icon: "⚡", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", indicator: "PAR" };
              }
              if (s === "sono" || s === "dormindo" || s === "sleep") {
                return { name: "Dormindo", icon: "💤", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", indicator: "SLP" };
              }
              if (s === "queimadura" || s === "queimado" || s === "burn") {
                return { name: "Queimado", icon: "🔥", color: "bg-rose-500/20 text-rose-300 border-rose-500/30", indicator: "BRN" };
              }
              if (s === "congelamento" || s === "congelado" || s === "freeze" || s === "frozen") {
                return { name: "Congelado", icon: "❄️", color: "bg-sky-500/20 text-sky-350 border-sky-500/30", indicator: "FRZ" };
              }
              if (s === "envenenamento" || s === "envenenado" || s === "poison") {
                return { name: "Envenenado", icon: "🤢", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", indicator: "PSN" };
              }
              if (s === "gravemente envenenado" || s === "envenenado grave" || s === "badly_poison") {
                return { name: "Frat. Toxina", icon: "💀", color: "bg-pink-600/20 text-pink-300 border-pink-500/30", indicator: "TOX" };
              }
              return { name: status, icon: "⚠️", color: "bg-neutral-500/20 text-neutral-300 border-neutral-500/30", indicator: status.slice(0, 3).toUpperCase() };
            };

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden font-sans"
                onClick={() => setIsAddPokemonModalOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.97, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.97, y: 20 }}
                  className="bg-[#0b0c11]/98 border-0 sm:border sm:border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.95)] rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-h-[92vh] max-w-5xl lg:max-w-6xl overflow-hidden flex flex-col text-white relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-650 via-red-500 to-indigo-600 animate-pulse shadow-[0_0_15px_#ef4444]" />

                  {/* Master Header with Responsive Smart Modes & Tab Navigation built-in */}
                  <div
                    className="relative z-45 shrink-0 text-left border-b border-white/[0.04] transition-all duration-300 ease-in-out bg-[#090b11]/98"
                    style={{
                      transform: pokemonHeaderCompact ? `translateY(-${headerOffset}px)` : "translateY(0px)",
                    }}
                  >
                    {/* Parte Superior do Cabeçalho: Desaparece suavemente no scroll */}
                    <div
                      className="transition-all duration-300 ease-in-out overflow-hidden"
                      style={{
                        height: isMobile ? "250px" : "176px",
                        opacity: pokemonHeaderCompact ? 0 : 1,
                        transform: pokemonHeaderCompact ? "scale(0.95)" : "scale(1)",
                        pointerEvents: pokemonHeaderCompact ? "none" : "auto",
                      }}
                    >
                      {/* Mode Normal Header (Complete & High Profile) */}
                      <div className="flex flex-col justify-between h-full p-4 px-6 select-none">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-4 text-left">
                            {/* Detailed Retrato/Sprite */}
                            <div className="relative w-18 h-18 sm:w-20 sm:h-20 bg-black/45 border border-white/5 rounded-2xl flex items-center justify-center p-2 group shadow-inner shrink-0 overflow-hidden">
                              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px]" />
                              <img
                                src={formPokemonImage || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"}
                                alt="Ficha Pokémon Principal"
                                className="w-14 h-14 sm:w-16 sm:h-16 object-contain filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.3)] transition-transform duration-300 group-hover:scale-110 relative z-10"
                                referrerPolicy="no-referrer"
                              />
                              {formPokemonIsShiny && (
                                <span className="absolute bottom-1 right-1 text-[8px] bg-amber-500/15 border border-amber-500/30 px-1 rounded text-amber-300 font-bold select-none">SHINY</span>
                              )}
                            </div>

                            {/* Core Identity text fields/labels */}
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg sm:text-xl font-black uppercase text-white font-mono tracking-tight leading-none">
                                  {formPokemonName || "Sem Nome"}
                                </h4>
                                <span className="text-[9.5px] font-mono font-black text-[#fbbf24] bg-[#fbbf24]/10 border border-[#fbbf24]/20 px-2 py-0.5 rounded leading-none shrink-0 uppercase tracking-wider">
                                  NV. {formPokemonLevel}
                                </span>
                                {formPokemonIsPc ? (
                                  <span className="text-[8px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-black leading-none select-none">📂 PC Box</span>
                                ) : (
                                  <span className="text-[8px] font-mono bg-teal-500/10 border border-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded uppercase font-black leading-none select-none">🎒 Ativo</span>
                                )}
                                {tokens.some(t => t.pokemonId === editingPokemonId) && (
                                  <span className="text-[8px] font-mono bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black leading-none animate-pulse select-none">⚔️ Arena</span>
                                )}
                                {formPokemonHpCurrent === 0 && (
                                  <span className="text-[8px] font-mono bg-red-500/15 border border-red-500/35 text-red-400 px-1.5 py-0.5 rounded font-black uppercase inline-flex items-center gap-1 animate-bounce select-none">💀 Nocauteado</span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {formPokemonTypes.length > 0 ? (
                                  formPokemonTypes.map(t => {
                                    const st = POKEMON_TYPES_STYLING[t] || POKEMON_TYPES_STYLING.Normal;
                                    return (
                                      <span key={t} className={`text-[8.5px] font-sans font-black px-2.5 py-0.5 rounded leading-none border uppercase tracking-widest ${st.bg} ${st.border} ${st.text}`}>
                                        {st.emoji} {t}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-[8.5px] text-neutral-500 tracking-wider font-bold">Nenhuma tipagem cadastrada</span>
                                )}

                                {formPokemonStatusConditions.nonVolatile && (() => {
                                  const cond = mapStatusToUI(formPokemonStatusConditions.nonVolatile);
                                  if (!cond) return null;
                                  return (
                                    <span className={`text-[8.5px] font-sans font-black px-2 py-0.5 rounded leading-none border uppercase tracking-wider ${cond.color}`}>
                                      {cond.icon} {cond.name}
                                    </span>
                                  );
                                })()}
                                
                                {formPokemonNature && (() => {
                                  const natureObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
                                  if (!natureObj) return null;
                                  return (
                                    <div className="relative group/head_nat cursor-help shrink-0 select-none leading-none">
                                      <span className="font-mono text-[8px] text-[#fbbf24] bg-[#fbbf24]/10 border border-[#fbbf24]/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider hover:bg-[#fbbf24]/20 transition-colors">
                                        Natureza: <span className="underline decoration-dotted">{natureObj.name}</span>
                                      </span>
                                      
                                      {/* Header Hover Tooltip */}
                                      <div className="absolute left-0 sm:left-1/3 -translate-x-0 sm:-translate-x-1/3 top-full mt-2 hidden group-hover/head_nat:block bg-neutral-950 border border-white/10 rounded-xl p-3 w-[220px] text-left shadow-2xl z-50 pointer-events-none text-white normal-case leading-normal font-sans tracking-normal">
                                        <h5 className="font-extrabold text-[10px] text-white tracking-widest border-b border-white/10 pb-1.5 uppercase font-mono flex justify-between items-center">
                                          <span>Natureza {natureObj.name}</span>
                                          <span className="text-[7.5px] text-[#fbbf24] font-black">🔒 Permanente</span>
                                        </h5>
                                        <p className="text-[9px] text-[#b9c3df] mt-1.5 font-medium">
                                          {natureObj.description}
                                        </p>
                                        <div className="flex justify-between items-center text-[8px] font-mono border-t border-white/5 pt-1.5 mt-2 font-bold uppercase tracking-wider">
                                          {natureObj.bonusAttr && (
                                            <span className="text-emerald-400">
                                              +{natureObj.bonusAttr === "CA" ? "1 CA" : `2 ${natureObj.bonusAttr}`} ▲
                                            </span>
                                          )}
                                          {natureObj.penaltyAttr && (
                                            <span className="text-rose-455">
                                              -2 {natureObj.penaltyAttr} ▼
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <button 
                            type="button" 
                            onClick={() => setIsAddPokemonModalOpen(false)}
                            className="p-1.5 px-4 bg-red-950/20 hover:bg-neutral-800 border border-red-500/10 hover:border-red-500/30 text-neutral-400 hover:text-white rounded-xl transition-all cursor-pointer font-black text-xs uppercase"
                          >
                            Fechar Ficha
                          </button>
                        </div>

                        {/* HP and XP Progression Slider Bars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 border border-white/5 p-3 rounded-2xl">
                          {/* HP Progress */}
                          <div className="space-y-1.5 text-left">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-mono tracking-wider text-emerald-400 font-extrabold uppercase">❤️ HP Vitalidade</span>
                              <span className="font-mono font-black text-white">
                                {formPokemonHpCurrent} <span className="text-white/40">/</span> {effectiveHpMax} ({Math.round(hpPct)}%)
                              </span>
                            </div>
                            <div className="h-2.5 bg-[#030406] rounded-full p-[2px] border border-white/10 overflow-hidden relative">
                              <div
                                style={{ width: `${hpPct}%` }}
                                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-305`}
                              />
                            </div>
                          </div>

                          {/* XP Progress */}
                          {(() => {
                            const nextXpRequired = getXPRequiredForLevel(formPokemonLevel, formPokemonSr);
                            const xpPercentage = Math.min(100, Math.max(0, (formPokemonXp / (nextXpRequired || 1)) * 100));
                            return (
                              <div className="space-y-1.5 text-left">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-mono tracking-wider text-amber-500 font-extrabold uppercase">🌟 XP Progressão</span>
                                  <span className="font-mono font-black text-white">
                                    {formPokemonXp.toLocaleString("pt-BR")} <span className="text-white/40">/</span> {nextXpRequired.toLocaleString("pt-BR")} ({xpPercentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="h-2.5 bg-[#030406] rounded-full p-[2px] border border-white/10 overflow-hidden relative">
                                  <div
                                    style={{ width: `${xpPercentage}%` }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Integrated Tab Navigation underneath Header */}
                    <div 
                      className={`relative shrink-0 border-t border-white/[0.04] transition-all duration-300 ease-in-out ${
                        pokemonHeaderCompact
                          ? "bg-[#0b0c11]/80 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)] py-2 px-6 border-b border-white/[0.08]"
                          : "mt-1 pb-2 px-6"
                      }`}
                    >
                      <div className="flex gap-1 overflow-x-auto scrollbar-none select-none relative custom-scrollbar">
                        {([
                          { id: "identidade", label: "🎭 Identidade", title: "Dados de cadastro e personalidade" },
                          { id: "combate",    label: "⚔️ Combate",    title: "HP, atributos, moves e efeitos" },
                          { id: "tracos",     label: "🧬 Traços",     title: "Tipos, locomoção, sentidos e perícias" },
                          { id: "evolucao",   label: "📈 Evolução",   title: "XP, progressão e marcos de nível" },
                        ] as const).map((tb) => (
                          <button
                            key={tb.id}
                            type="button"
                            title={tb.title}
                            onClick={() => setFormPokemonActiveTab(tb.id)}
                            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer border-t border-x -mb-px shrink-0 outline-none ${
                              formPokemonActiveTab === tb.id
                                ? "bg-[#050609] border-white/15 text-[#ff4444] font-extrabold"
                                : "bg-black/40 border-transparent text-neutral-400 hover:text-white"
                            }`}
                          >
                            {tb.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>


                  {/* Body Wrapper — Novo Layout com 4 Abas */}
                  <div 
                    className="flex flex-col flex-1 overflow-hidden bg-[#050609] transition-all duration-300 ease-in-out relative z-30"
                    style={{
                      transform: pokemonHeaderCompact ? `translateY(-${headerOffset}px)` : "translateY(0px)",
                      height: `calc(100% + ${headerOffset}px)`,
                      marginBottom: `-${headerOffset}px`,
                    }}
                  >

                    {/* ── TAB CONTENT ── */}
                    <div 
                      ref={pokemonScrollContainerRef}
                      onScroll={(e) => {
                        const scrollTop = e.currentTarget.scrollTop;
                        const prevScrollTop = lastPokemonScrollTopRef.current;
                        
                        if (scrollTop <= 10) {
                          if (pokemonHeaderCompact) setPokemonHeaderCompact(false);
                        } else if (scrollTop > prevScrollTop) {
                          if (!pokemonHeaderCompact) setPokemonHeaderCompact(true);
                        } else if (scrollTop < prevScrollTop - 8) {
                          if (pokemonHeaderCompact) setPokemonHeaderCompact(false);
                        }
                        
                        lastPokemonScrollTopRef.current = scrollTop;
                      }}
                      className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4 text-left"
                    >

                      {/* ════════════════════════════════════════════════
                          ABA 1 — IDENTIDADE
                          Sprite, apelido, espécie, nível, natureza, lealdade
                          ════════════════════════════════════════════════ */}
                      {formPokemonActiveTab === "identidade" && (
                        <div className="space-y-4">

                          {/* ── Sprite + Controles Visuais ── */}
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            {/* Sprite Card */}
                            <div className="flex flex-col items-center gap-2 p-4 bg-black/45 border border-white/5 rounded-2xl relative group shadow-md shrink-0 w-full sm:w-auto">
                              <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <div className="relative w-32 h-32 bg-[#0c0e14] border-2 border-dashed border-[#ef4444]/30 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:12px_12px]" />
                                <img
                                  src={formPokemonImage || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"}
                                  alt="Sprite"
                                  className="w-24 h-24 object-contain filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.35)] transition-all duration-300 group-hover:scale-110 relative z-10"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              {/* Shiny toggle */}
                              <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-[9px] uppercase font-black tracking-wider transition-all select-none ${
                                formPokemonIsShiny
                                  ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                  : "bg-neutral-900/40 hover:bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-neutral-300"
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={formPokemonIsShiny}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setFormPokemonIsShiny(isChecked);
                                    updateEditingPokemonProperty("isShiny", isChecked);
                                    const activeSprite = isChecked
                                      ? (formPokemonImageShiny || formPokemonImageDefault || formPokemonImage)
                                      : (formPokemonImageDefault || formPokemonImage);
                                    if (activeSprite) {
                                      setFormPokemonImage(activeSprite);
                                      updateEditingPokemonProperty("image", activeSprite);
                                    }
                                  }}
                                  className="accent-amber-500 w-3 h-3 cursor-pointer"
                                />
                                <span>✨ Shiny</span>
                              </label>
                              {/* PC Box toggle */}
                              <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-[9px] uppercase font-black tracking-wider transition-all select-none w-full justify-center ${
                                formPokemonIsPc
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                                  : "bg-neutral-900/40 border-white/5 text-neutral-400"
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={formPokemonIsPc}
                                  onChange={(e) => {
                                    setFormPokemonIsPc(e.target.checked);
                                    updateEditingPokemonProperty("isPc", e.target.checked);
                                  }}
                                  className="accent-indigo-500 w-3 h-3 cursor-pointer"
                                />
                                <span>{formPokemonIsPc ? "📂 PC Box" : "🎒 Equipe Ativa"}</span>
                              </label>
                            </div>

                            {/* Campos de identidade */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/45 border border-white/5 p-3.5 rounded-2xl shadow-sm">
                              {/* Apelido */}
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wide">Apelido</label>
                                <input
                                  type="text"
                                  placeholder="ex: Sparky..."
                                  value={formPokemonName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormPokemonName(val);
                                    updateEditingPokemonProperty("name", val);
                                    updateEditingPokemonProperty("nickname", val);
                                  }}
                                  className="w-full bg-[#07090d] text-xs px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:border-red-500 text-white font-bold transition-all"
                                />
                              </div>

                              {/* Espécie */}
                              <div className="space-y-1 relative">
                                <label className="text-[9px] uppercase font-bold text-[#b9c3df] block tracking-wide flex items-center justify-between">
                                  <span>Espécie (Pokédex)</span>
                                  {formPokemonSpeciesId && <span className="text-red-400 text-[8px] font-mono">#{formPokemonSpeciesId}</span>}
                                </label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Pesquisar pokémon..."
                                    value={formPokemonSpecies}
                                    onFocus={() => { ensurePokemonCache(); setShowPokemonSuggestions(true); }}
                                    onBlur={() => setTimeout(() => setShowPokemonSuggestions(false), 200)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormPokemonSpecies(val);
                                      updateEditingPokemonProperty("species", val);
                                    }}
                                    className="w-full bg-[#07090d] text-xs px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:border-red-500 text-white font-black uppercase transition-all"
                                  />
                                  {isPokemonLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  )}
                                </div>
                                {showPokemonSuggestions && pokemonSuggestions.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#10121a] border border-white/15 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-60 divide-y divide-white/5 custom-scrollbar">
                                    {pokemonSuggestions.map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onMouseDown={() => handleSelectPokemon(p)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 flex items-center gap-2 transition-colors text-xs text-neutral-200"
                                      >
                                        <img src={p.sprite} alt="" className="w-7 h-7 object-contain bg-neutral-900/40 rounded shrink-0" referrerPolicy="no-referrer" />
                                        <span className="font-extrabold text-[10px] uppercase text-white truncate">{p.name} (#{p.id})</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Nível */}
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-neutral-450 block">Nível (1–100)</label>
                                <input
                                  type="number" min="1" max="100"
                                  value={formPokemonLevel}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setFormPokemonLevel(val);
                                    updateEditingPokemonProperty("level", val);
                                  }}
                                  className="w-full bg-[#07090d] text-xs px-3 py-1.5 border border-white/10 rounded-xl text-center font-bold focus:outline-none focus:border-red-500"
                                />
                              </div>

                              {/* Tamanho */}
                              <div className="space-y-1">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block">Tamanho</label>
                                <select
                                  value={formPokemonMovement?.andando ? (formPokemonMovement as any)?.size || "Medium" : "Medium"}
                                  onChange={(e) => updateEditingPokemonProperty("size", e.target.value)}
                                  className="w-full bg-[#07090d] text-xs px-3 py-1.5 border border-white/10 rounded-xl focus:outline-none focus:border-red-500 text-white"
                                >
                                  {["Tiny","Small","Medium","Large","Huge","Gargantuan"].map(s => <option key={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* ── Natureza ── */}
                          <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">🌿 Natureza</h3>
                            {!formPokemonNatureConfirmed ? (
                              <div className="space-y-2 bg-[#ef4444]/[0.02] border border-[#ef4444]/15 rounded-xl p-3 relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#fbbf24]/5 to-transparent pointer-events-none" />
                                <label className="text-[9px] uppercase font-bold text-[#fbbf24] block tracking-wider flex items-center justify-between">
                                  <span>Natureza do Pokémon (Personalidade)</span>
                                  <span className="text-[8px] text-amber-500 font-mono font-black">⚠️ Permanente após cadastro</span>
                                </label>
                                <div className="flex gap-2 items-center">
                                  <select
                                    value={formPokemonNature}
                                    disabled={isD20Rolling}
                                    onChange={(e) => setFormPokemonNature(e.target.value)}
                                    className="flex-1 bg-[#07090d] text-xs px-3 py-2 border border-white/10 rounded-xl font-bold uppercase focus:outline-none focus:border-red-500 text-white"
                                  >
                                    <option value="" className="bg-[#0b0c11]">-- Escolha uma Natureza --</option>
                                    {POKEMON_NATURES.map((nat) => (
                                      <option key={nat.id} value={nat.id} className="bg-[#0b0c11]">
                                        {nat.name} ({nat.bonusAttr ? `+${nat.bonusAttr === "CA" ? "1 CA" : `2 ${nat.bonusAttr}`}` : "Sem Bônus"}{nat.penaltyAttr ? `, -2 ${nat.penaltyAttr}` : ""})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={rollPokemonNature}
                                    disabled={isD20Rolling}
                                    className={`h-11 sm:h-9 px-4 sm:px-3 bg-gradient-to-r from-red-650 to-red-750 hover:from-red-550 hover:to-red-650 disabled:opacity-50 text-white rounded-xl flex items-center gap-1.5 text-xs font-black uppercase transition-all cursor-pointer select-none active:scale-95 ${isD20Rolling ? "animate-pulse" : ""}`}
                                  >
                                    <Dices className={`w-3.5 h-3.5 ${isD20Rolling ? "animate-spin" : ""}`} />
                                    <span>{isD20Rolling ? "Rolar..." : "d20"}</span>
                                  </button>
                                </div>
                                <p className="text-[8px] text-neutral-450 leading-tight px-1">* A natureza concede modificadores automáticos permanentes e não poderá ser alterada posteriormente.</p>
                                {formPokemonNature && (() => {
                                  const natObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
                                  if (!natObj) return null;
                                  return (
                                    <div className="mt-1 bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.04] pb-1.5 mb-1">
                                        <span className="text-[#fbbf24] font-black uppercase text-[11px] font-mono tracking-wider">✨ {natObj.name}</span>
                                        <div className="flex gap-2">
                                          {natObj.bonusAttr && <span className="text-emerald-400 font-extrabold uppercase">+{natObj.bonusAttr === "CA" ? "1 CA" : `2 ${natObj.bonusAttr}`} ▲</span>}
                                          {natObj.penaltyAttr && <span className="text-rose-450 font-extrabold uppercase">-2 {natObj.penaltyAttr} ▼</span>}
                                        </div>
                                      </div>
                                      <p className="text-[9px] text-neutral-400 leading-normal italic px-1">{natObj.description}</p>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="bg-white/[0.015] border border-white/[0.05] rounded-xl p-3 flex items-center justify-between relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-indigo-500/[0.015] to-transparent pointer-events-none" />
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-neutral-450 block tracking-wider">Natureza</label>
                                  {formPokemonNature ? (() => {
                                    const natObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
                                    if (!natObj) return <span className="text-xs font-black text-white/50 tracking-wide uppercase mt-1 block">Nenhuma</span>;
                                    return (
                                      <div className="flex items-center gap-1.5 mt-1 relative group/nat_edit cursor-help">
                                        <span className="font-extrabold text-[#fbbf24] text-xs uppercase tracking-wider font-mono">{natObj.name}</span>
                                        {natObj.bonusAttr && <span className="text-[7.5px] bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold uppercase">+{natObj.bonusAttr === "CA" ? "1 CA" : `2 ${natObj.bonusAttr}`} ▲</span>}
                                        {natObj.penaltyAttr && <span className="text-[7.5px] bg-rose-950/20 border border-rose-500/20 text-rose-450 px-1 py-0.5 rounded font-mono font-bold uppercase">-2 {natObj.penaltyAttr} ▼</span>}
                                        <div className="absolute bottom-full mb-2.5 left-0 hidden group-hover/nat_edit:block bg-neutral-950 border border-white/10 rounded-xl p-3 w-[225px] shadow-2xl z-50 pointer-events-none text-white font-sans text-left leading-normal">
                                          <h5 className="font-extrabold text-[10px] text-white tracking-widest border-b border-white/10 pb-1 uppercase flex justify-between items-center">
                                            <span>Natureza {natObj.name}</span>
                                            <span className="text-[8px] text-[#fbbf24] font-black">🔒 Permanente</span>
                                          </h5>
                                          <p className="text-[9px] text-neutral-350 mt-1.5 leading-relaxed font-semibold">{natObj.description}</p>
                                          <div className="flex justify-between items-center text-[8.5px] font-mono border-t border-white/5 pt-1.5 mt-2 font-bold uppercase">
                                            {natObj.bonusAttr && <span className="text-emerald-400">+{natObj.bonusAttr === "CA" ? "1 CA" : `2 ${natObj.bonusAttr}`} ▲</span>}
                                            {natObj.penaltyAttr && <span className="text-rose-450">-2 {natObj.penaltyAttr} ▼</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })() : <span className="text-xs font-bold text-neutral-500 mt-1 block">Não Definido</span>}
                                </div>
                                <div className="px-2 py-0.5 bg-neutral-800 border border-white/5 rounded text-[7.5px] font-bold text-neutral-500 uppercase font-mono tracking-wider select-none shrink-0 pointer-events-none">🔒 Bloqueada</div>
                              </div>
                            )}
                          </div>

                          {/* ── Lealdade ── */}
                          <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 relative group/loyalty_info cursor-help select-none">
                                <span>🤝 Lealdade</span>
                                <span className="text-[9px] text-[#10b981] font-mono hover:underline">(Saiba mais ❓)</span>
                                <div className="absolute bottom-full mb-2 left-0 hidden group-hover/loyalty_info:block bg-neutral-950 border border-white/10 rounded-xl p-4 w-[280px] shadow-2xl z-50 text-white normal-case font-sans tracking-normal leading-relaxed text-xs">
                                  <h4 className="font-extrabold text-[11px] text-[#fbbf24] uppercase border-b border-white/10 pb-1.5 mb-2 font-mono tracking-wider">🤝 Sistema de Lealdade Pokémon</h4>
                                  <p className="text-[9px] text-neutral-350 mb-2 leading-relaxed font-semibold">O vínculo do Pokémon com seu Treinador altera sua resistência e comportamento em combate.</p>
                                  <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 text-[9px] text-neutral-300">
                                    <div className="border-l-2 border-emerald-500 pl-1.5 py-0.5 bg-emerald-500/5 font-semibold"><span className="text-emerald-400 font-bold font-mono">+3 Leal</span>: +1 nas Salvaguardas, bônus de HP Máx igual ao Nível completo, elegível a evoluções por lealdade, +1 Perícia Proficiente e +1 Especializada.</div>
                                    <div className="border-l-2 border-emerald-400 pl-1.5 py-0.5 bg-emerald-500/5 font-semibold"><span className="text-emerald-400 font-bold font-mono">+2 Satisfeito</span>: +1 nas Salvaguardas, bônus de HP Máx de ceil(Nível/2), +1 Perícia Proficiente.</div>
                                    <div className="border-l-2 border-emerald-300 pl-1.5 py-0.5 font-semibold"><span className="text-emerald-300 font-bold font-mono">+1 Contente</span>: +1 em todas as Salvaguardas.</div>
                                    <div className="border-l-2 border-neutral-500 pl-1.5 py-0.5 font-mono font-semibold"><span className="text-neutral-400 font-bold font-mono">0 Neutro</span>: Relação normal.</div>
                                    <div className="border-l-2 border-orange-500 pl-1.5 py-0.5 font-semibold"><span className="text-orange-400 font-bold font-mono">-1 Chateado</span>: -1 em todas as Salvaguardas.</div>
                                    <div className="border-l-2 border-rose-500 pl-1.5 py-0.5 bg-rose-500/5 font-semibold"><span className="text-rose-400 font-bold font-mono">-2 Indiferente</span>: -1 nas Salvaguardas. Executar moves requer d20 &gt; 10 ou falha.</div>
                                    <div className="border-l-2 border-red-500 pl-1.5 py-0.5 bg-red-500/5 font-mono font-semibold"><span className="text-red-500 font-bold font-mono">-3 Desleal</span>: -1 nas Salvaguardas. Executar moves requer d20 &gt; 15 ou falha.</div>
                                  </div>
                                </div>
                              </h3>
                              {formPokemonLoyalty === 3 && (
                                <span className="text-[7.5px] font-black uppercase text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono animate-pulse shrink-0 select-none">💖 Elegível p/ Evolução</span>
                              )}
                            </div>

                            {/* Badge + controles */}
                            {(() => {
                              const currentLev = POKEMON_LOYALTY_LEVELS.find(l => l.value === formPokemonLoyalty) || POKEMON_LOYALTY_LEVELS[3];
                              return (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase font-mono tracking-wider ${currentLev.color}`}>
                                      {formPokemonLoyalty >= 0 ? `+${formPokemonLoyalty}` : formPokemonLoyalty} – {currentLev.label}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 justify-end">
                                    {userRole === "Mestre" ? (
                                      <>
                                        <button type="button" onClick={() => { const newVal = Math.max(-3, formPokemonLoyalty - 1); setFormPokemonLoyalty(newVal); if (editingPokemonId) updateEditingPokemonProperties({ loyalty: newVal, loyaltyEvolutionEligible: newVal === 3 ? true : formPokemonLoyaltyEvolutionEligible }); }} disabled={formPokemonLoyalty === -3} className="px-2.5 py-1.5 bg-red-950/40 hover:bg-[#ef4444]/15 border border-red-500/20 hover:border-red-500/40 text-red-400 disabled:opacity-20 rounded-lg text-[9px] font-black font-mono transition-all uppercase cursor-pointer">💔 Diminuir</button>
                                        <button type="button" onClick={() => { const newVal = Math.min(3, formPokemonLoyalty + 1); setFormPokemonLoyalty(newVal); if (newVal === 3) setFormPokemonLoyaltyEvolutionEligible(true); if (editingPokemonId) updateEditingPokemonProperties({ loyalty: newVal, loyaltyEvolutionEligible: newVal === 3 ? true : formPokemonLoyaltyEvolutionEligible }); }} disabled={formPokemonLoyalty === 3} className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 disabled:opacity-20 rounded-lg text-[9px] font-black font-mono transition-all uppercase cursor-pointer">💚 Aumentar</button>
                                      </>
                                    ) : (
                                      <span className="text-[8px] text-neutral-500 italic font-mono">Apenas o Mestre pode alterar</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Barra visual de lealdade */}
                            <div className="flex gap-1 h-2.5">
                              {POKEMON_LOYALTY_LEVELS.slice().reverse().map((levObj) => {
                                const val = levObj.value;
                                const isActive = val === formPokemonLoyalty;
                                const activeColor = val >= 2 ? "bg-emerald-500" : val === 1 ? "bg-emerald-400" : val === 0 ? "bg-neutral-500" : val === -1 ? "bg-orange-500" : val === -2 ? "bg-rose-500" : "bg-red-600";
                                return (
                                  <div key={val} className={`flex-1 h-full rounded-sm transition-all duration-300 relative cursor-help ${isActive ? `${activeColor} ring-1 ring-white/60 scale-y-110 shadow-[0_0_8px_rgba(16,185,129,0.4)] z-10` : val < formPokemonLoyalty ? `${activeColor}/40` : "bg-white/5"}`} title={`${val >= 0 ? `+${val}` : val}: ${levObj.label}`} />
                                );
                              })}
                            </div>

                            {/* Perícia bônus (lealdade >= 2) */}
                            {formPokemonLoyalty >= 2 && (
                              <div className="p-2.5 bg-emerald-950/10 border border-emerald-500/20 rounded-xl space-y-2 animate-fadeIn text-left">
                                <div className="flex justify-between items-center">
                                  <label className="text-[8.5px] uppercase font-black text-emerald-400 tracking-wider block font-mono">🏆 Vínculo Forte (+2): Perícia Proficiente Bônus</label>
                                  {formPokemonLoyaltyBonusSkill ? <span className="text-[7.5px] uppercase font-bold bg-emerald-500/20 border border-emerald-500/35 px-1.5 py-0.5 rounded font-mono text-emerald-300">Salva persistente</span> : <span className="text-[7.5px] uppercase font-bold bg-amber-500/20 border border-amber-500/35 px-1.5 py-0.5 rounded font-mono text-amber-300 animate-pulse">Selecione Obrigatório</span>}
                                </div>
                                <select value={formPokemonLoyaltyBonusSkill} onChange={(e) => { const value = e.target.value; setFormPokemonLoyaltyBonusSkill(value); if (editingPokemonId) updateEditingPokemonProperties({ loyaltyBonusSkill: value }); }} className="w-full bg-[#07090d] text-xs px-2.5 py-1.5 border border-white/10 rounded-lg text-white font-bold">
                                  <option value="">-- Selecione uma Perícia --</option>
                                  {POKEMON_SKILLS_LIST.map(sk => <option key={sk.name} value={sk.name}>{sk.name} ({sk.attr})</option>)}
                                </select>
                              </div>
                            )}
                            {/* Perícia especialista (lealdade = 3) */}
                            {formPokemonLoyalty === 3 && (
                              <div className="p-2.5 bg-[#10b981]/10 border border-[#10b981]/25 rounded-xl space-y-2 animate-fadeIn text-left">
                                <div className="flex justify-between items-center">
                                  <label className="text-[8.5px] uppercase font-black text-[#10b981] tracking-wider block font-mono font-bold">👑 Vínculo Supremo (+3): Perícia Especialista</label>
                                  {formPokemonLoyaltySpecialistSkill ? <span className="text-[7.5px] uppercase font-bold bg-[#10b981]/20 border border-emerald-500/35 px-1.5 py-0.5 rounded font-mono text-[#10b981]">Salva persistente</span> : <span className="text-[7.5px] uppercase font-bold bg-amber-500/20 border border-amber-500/35 px-1.5 py-0.5 rounded font-mono text-amber-300 animate-pulse font-bold">Selecione Obrigatório</span>}
                                </div>
                                <select value={formPokemonLoyaltySpecialistSkill} onChange={(e) => { const value = e.target.value; setFormPokemonLoyaltySpecialistSkill(value); if (editingPokemonId) updateEditingPokemonProperties({ loyaltySpecialistSkill: value }); }} className="w-full bg-[#07090d] text-xs px-2.5 py-1.5 border border-white/10 rounded-lg text-white font-bold">
                                  <option value="">-- Selecione uma Perícia --</option>
                                  {POKEMON_SKILLS_LIST.map(sk => <option key={sk.name} value={sk.name}>{sk.name} ({sk.attr})</option>)}
                                </select>
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                      {/* ════════════════════════════════════════════════
                          ABA 2 — COMBATE
                          HP, Iniciativa, Atributos, Salvaguardas, Moves, Talentos, Efeitos
                          ════════════════════════════════════════════════ */}
                      {formPokemonActiveTab === "combate" && (
                        <div className="space-y-4">

                          {/* ── HP + Descanso ── */}
                          <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">❤️ Vitalidade (HP)</h3>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormPokemonHpCurrent(effectiveHpMax);
                                  setFormPokemonStatusStages({ attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0, criticalRange: 0 });
                                  setFormPokemonStatusConditions({});
                                  if (formPokemonMoveObj1) setFormPokemonMoveObj1(prev => ({ ...prev, pp: prev.pp ?? 15 }));
                                  if (formPokemonMoveObj2) setFormPokemonMoveObj2(prev => ({ ...prev, pp: prev.pp ?? 15 }));
                                  if (formPokemonMoveObj3) setFormPokemonMoveObj3(prev => ({ ...prev, pp: prev.pp ?? 15 }));
                                  if (formPokemonMoveObj4) setFormPokemonMoveObj4(prev => ({ ...prev, pp: prev.pp ?? 15 }));
                                  setNotification(`💤 ${formPokemonName} descansou! HP, PPs e Condições limpas.`);
                                }}
                                className="py-1.5 px-3 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 font-bold font-mono text-[9px] uppercase rounded-xl flex items-center gap-1.5 transition-all outline-none"
                              >
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Descanso Longo</span>
                              </button>
                            </div>

                            {/* Barra de HP */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-mono tracking-widest text-emerald-400 font-extrabold uppercase">HP</span>
                                <span className="font-mono font-black text-white">
                                  {formPokemonHpCurrent} <span className="text-white/40">/</span> {effectiveHpMax}
                                  {loyaltyHpBonus > 0 && (
                                    <span className="text-emerald-400 font-extrabold ml-1.5 text-[8.5px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono" title={`Bônus de Lealdade: +${loyaltyHpBonus} HP Máximo`}>+{loyaltyHpBonus} vínculo</span>
                                  )}
                                  {" "}({Math.round(hpPct)}%)
                                </span>
                              </div>
                              <div className="h-4 bg-[#090b10] rounded-full p-[3px] border border-white/10 overflow-hidden relative">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${hpPct}%` }}
                                  transition={{ duration: 0.3 }}
                                  className={`h-full rounded-full bg-gradient-to-r ${barColor} relative border-r-2`}
                                />
                              </div>
                            </div>

                             {/* Controles HP */}
                             <div className="flex gap-1.5 w-full items-center">
                               <input
                                 type="number"
                                 placeholder="Valor HP..."
                                 value={hpChangeValue || ""}
                                 onChange={(e) => setHpChangeValue(e.target.value)}
                                 className="flex-1 min-w-[70px] bg-[#07090d] text-xs h-11 sm:h-8 border border-white/10 rounded-lg text-center font-bold focus:outline-none focus:border-red-500"
                               />
                               <button type="button" onClick={() => { const val = parseInt(hpChangeValue) || 0; if (val <= 0) return; setFormPokemonHpCurrent(prev => Math.min(effectiveHpMax, prev + val)); setHpChangeValue(""); }} className="h-11 sm:h-8 px-4 sm:px-3 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black cursor-pointer uppercase active:scale-95 transition-all shrink-0 flex items-center justify-center">Heal</button>
                               <button type="button" onClick={() => { const val = parseInt(hpChangeValue) || 0; if (val <= 0) return; setFormPokemonHpCurrent(prev => Math.max(0, prev - val)); setHpChangeValue(""); }} className="h-11 sm:h-8 px-4 sm:px-3 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/20 text-rose-450 rounded-lg text-[10px] font-black cursor-pointer uppercase active:scale-95 transition-all shrink-0 flex items-center justify-center">Dano</button>
                             </div>
                            <div className="flex items-center justify-between text-[9.5px] text-[#8e95ae]">
                              <span className="font-mono uppercase font-semibold">HP Máximo Base:</span>
                              <input type="number" min="1" value={formPokemonHpMax} onChange={(e) => { const val = parseInt(e.target.value) || 1; setFormPokemonHpMax(val); }} className="w-18 bg-[#07090d] text-[10px] font-mono p-0.5 border border-white/10 rounded text-center text-white focus:outline-none focus:border-indigo-500" />
                            </div>
                          </div>

                          {/* ── Iniciativa ── */}
                          <div className="bg-black/45 border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] uppercase font-bold text-amber-400 block tracking-wide">⚡ Iniciativa</label>
                                <input
                                  type="number"
                                  value={formPokemonInitiative}
                                  onChange={(e) => { const val = parseInt(e.target.value) || 0; setFormPokemonInitiative(val); updateEditingPokemonProperty("initiative", val); }}
                                  className="w-full bg-[#07090d] text-xs px-3 py-1.5 border border-white/10 rounded-xl text-center font-bold focus:outline-none focus:border-amber-500 text-amber-400"
                                />
                              </div>
                              <div className="text-[9px] text-neutral-500 font-mono pt-4">Usado para ordem de turnos no combate</div>
                            </div>
                          </div>

                          {/* ── Atributos RPG ── */}
                          <div className="bg-[#0b0c11]/80 border border-white/[0.08] rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                              <span className="text-[10px] font-black font-mono uppercase tracking-widest text-amber-500 flex items-center gap-1.5">📊 Atributos RPG</span>
                              <span className="text-[8px] font-mono text-neutral-450 uppercase font-bold bg-black/40 px-2 py-0.5 rounded border border-white/5">Natureza Inclusa</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const).map((attr) => {
                                const val = formPokemonAttrs[attr] ?? 10;
                                const natureObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
                                const isBenefited = natureObj?.bonusAttr === attr;
                                const isPenalized = natureObj?.penaltyAttr === attr;
                                const finalVal = isBenefited ? val + 2 : (isPenalized ? Math.max(1, val - 2) : val);
                                const mod = Math.floor((finalVal - 10) / 2);
                                const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                                const progressPct = Math.min(100, (finalVal / 30) * 100);
                                const attributeMeta: Record<string, { label: string; icon: string }> = { FOR: { label: "Força", icon: "💪" }, DES: { label: "Destreza", icon: "🤸" }, CON: { label: "Constituição", icon: "🛡️" }, INT: { label: "Inteligência", icon: "🧠" }, SAB: { label: "Sabedoria", icon: "👁️" }, CAR: { label: "Carisma", icon: "✨" } };
                                const meta = attributeMeta[attr] || { label: attr, icon: "🎯" };
                                return (
                                  <div key={attr} className={`bg-[#050609]/95 border rounded-xl p-3 flex items-center justify-between gap-3 transition-all relative group overflow-hidden ${isBenefited ? "border-emerald-500/20 bg-emerald-950/5 shadow-[0_0_12px_rgba(16,185,129,0.06)]" : isPenalized ? "border-rose-500/15 bg-rose-950/5" : "border-white/[0.05]"}`}>
                                    <div className="flex-1 min-w-0 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[10.5px] font-black tracking-wider uppercase font-mono ${isBenefited ? "text-emerald-400 font-extrabold" : isPenalized ? "text-rose-400" : "text-amber-500"}`}>{meta.icon} {meta.label}</span>
                                        {(isBenefited || isPenalized) && <span className={`text-[7px] font-mono px-1.5 py-0.2 rounded font-extrabold uppercase ${isBenefited ? "text-emerald-400 bg-emerald-500/10" : "text-rose-455 bg-rose-500/10"}`}>{isBenefited ? "+2 Nat" : "-2 Nat"}</span>}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => { const updated = { ...formPokemonAttrs, [attr]: Math.max(1, val - 1) }; setFormPokemonAttrs(updated); if (editingPokemonId) updateEditingPokemonProperty("attributes", updated); }} className="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center bg-black/60 hover:bg-neutral-800 rounded-lg border border-white/5 text-sm sm:text-[10px] text-neutral-300 hover:text-white cursor-pointer select-none font-black">-</button>
                                        <input type="number" min="1" max="35" value={val} onChange={(e) => { const updated = { ...formPokemonAttrs, [attr]: parseInt(e.target.value) || 1 }; setFormPokemonAttrs(updated); if (editingPokemonId) updateEditingPokemonProperty("attributes", updated); }} className="w-8 bg-transparent text-center font-mono font-black text-xs text-white focus:outline-none" />
                                        <button type="button" onClick={() => { const updated = { ...formPokemonAttrs, [attr]: Math.min(35, val + 1) }; setFormPokemonAttrs(updated); if (editingPokemonId) updateEditingPokemonProperty("attributes", updated); }} className="w-11 h-11 sm:w-6 sm:h-6 flex items-center justify-center bg-black/60 hover:bg-neutral-800 rounded-lg border border-white/5 text-sm sm:text-[10px] text-neutral-300 hover:text-white cursor-pointer select-none font-black">+</button>
                                        <div className="flex-1 h-1.5 bg-black/60 rounded-full border border-white/5 overflow-hidden p-[0.5px]">
                                          <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${isBenefited ? "from-emerald-500 to-teal-400 shadow-[0_0_6px_#10b981]" : isPenalized ? "from-rose-500 to-[#e11d48]" : "from-amber-600 to-[#ea580c] shadow-[0_0_6px_#f97316]"}`} style={{ width: `${progressPct}%` }} />
                                        </div>
                                      </div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border shrink-0 bg-black/50 ${isBenefited ? "border-emerald-500/25 text-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.08)]" : isPenalized ? "border-rose-500/20 text-rose-455" : "border-white/10 text-white"}`}>
                                      <span className="text-[7px] font-mono text-neutral-450 uppercase font-black tracking-widest leading-none">MOD</span>
                                      <span className="text-sm font-black font-mono leading-none mt-1">{modStr}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Salvaguardas */}
                            <div className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-3 space-y-2">
                              <div className="flex justify-between border-b border-white/[0.06] pb-1.5">
                                <span className="text-[10px] font-black font-mono uppercase tracking-wider text-teal-400">🛡️ Salvaguardas</span>
                                <span className="text-[8.5px] text-white/50">Bônus de proficiência: +{profBonus}</span>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                                {["FOR", "DES", "CON", "INT", "SAB", "CAR"].map((attr) => {
                                  const val = formPokemonAttrs[attr as keyof typeof formPokemonAttrs] ?? 10;
                                  const natureObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
                                  const isBenefited = natureObj?.bonusAttr === attr;
                                  const isPenalized = natureObj?.penaltyAttr === attr;
                                  const finalVal = isBenefited ? val + 2 : (isPenalized ? Math.max(1, val - 2) : val);
                                  const mod = Math.floor((finalVal - 10) / 2);
                                  const isProficient = !!formPokemonSavingThrows[attr];
                                  const loyaltySavingThrowMod = formPokemonLoyalty >= 1 ? 1 : (formPokemonLoyalty <= -1 ? -1 : 0);
                                  const totalMod = mod + (isProficient ? profBonus : 0) + loyaltySavingThrowMod;
                                  const totalModStr = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
                                  return (
                                    <div key={attr} onClick={() => { const updated = { ...formPokemonSavingThrows, [attr]: !isProficient }; setFormPokemonSavingThrows(updated); }} className={`border rounded-xl p-2 cursor-pointer transition-all flex flex-col items-center select-none ${isProficient ? "bg-teal-950/20 border-teal-500/40 text-teal-300" : "bg-[#07090d]/30 border-white/5 text-neutral-400 hover:border-white/15"}`}>
                                      <span className="text-[10px] font-black font-mono tracking-wider uppercase">{attr}</span>
                                      <span className="text-[14px] font-black font-mono mt-0.5">{totalModStr}</span>
                                      <div className="mt-1.5 flex items-center gap-1">
                                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${isProficient ? "border-teal-400 bg-teal-500/20" : "border-white/20 bg-black/40"}`}>{isProficient && <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />}</div>
                                        <span className="text-[8px] uppercase tracking-wide">Prof.</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* ── 4 Movimentos ── */}
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                            <label className="text-[10px] font-black uppercase text-red-400 tracking-wider block border-b border-white/5 pb-2">⚔️ Movimentos Conhecidos (Máx. 4 Slots)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {([
                                { num: 1 as const, obj: formPokemonMoveObj1, setObj: setFormPokemonMoveObj1, key: "move1" as const },
                                { num: 2 as const, obj: formPokemonMoveObj2, setObj: setFormPokemonMoveObj2, key: "move2" as const },
                                { num: 3 as const, obj: formPokemonMoveObj3, setObj: setFormPokemonMoveObj3, key: "move3" as const },
                                { num: 4 as const, obj: formPokemonMoveObj4, setObj: setFormPokemonMoveObj4, key: "move4" as const },
                              ]).map(({ num, obj, setObj, key }) => (
                                <div key={num} className={`transition-all duration-300 border rounded-xl p-3 space-y-2 ${formPokemonSelectedMoveSlot === num ? "bg-red-950/15 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.12)]" : "bg-black/25 border-white/5"}`}>
                                  <div className="flex justify-between items-center pb-1">
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-[10px] uppercase font-bold text-neutral-400">Slot #{num}</label>
                                      {formPokemonSelectedMoveSlot === num && <span className="text-[8px] tracking-wider uppercase bg-red-500/15 text-red-400 font-extrabold px-1 rounded animate-pulse">🎯 Ativo</span>}
                                    </div>
                                    <div className="flex gap-1.5">
                                      <button 
                                        type="button" 
                                        onClick={() => setFormPokemonSelectedMoveSlot(num)}
                                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all select-none ${
                                          formPokemonSelectedMoveSlot === num
                                            ? "bg-red-500/20 border border-red-500/45 text-red-300"
                                            : "bg-neutral-950 border border-white/10 text-neutral-400 hover:text-white"
                                        }`}
                                      >
                                        Focar
                                      </button>
                                      <button type="button" onClick={() => setExpandedMoves(prev => ({ ...prev, [num]: !prev[num] }))} className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-neutral-300 hover:bg-white/10 transition-all font-bold">⚙️ {expandedMoves[num] ? "Recolher" : "Detalhar"}</button>
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      placeholder="ex: Thunderbolt..."
                                      value={obj.name}
                                      onFocus={() => { ensureMovesCache(); setActiveMoveSearchIndex(num); }}
                                      onBlur={() => setTimeout(() => setActiveMoveSearchIndex(null), 250)}
                                      onChange={(e) => { const updated = { ...obj, name: e.target.value }; setObj(updated); updateEditingPokemonProperty(key, updated); }}
                                      className="w-full bg-[#0a0c10] text-[#ff4444] text-xs px-3 py-2 border border-white/10 rounded-xl focus:outline-none focus:border-red-500 font-bold uppercase"
                                    />
                                    {activeMoveSearchIndex === num && movesSuggestions.length > 0 && (
                                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#12141d] border border-white/10 rounded-xl max-h-40 overflow-y-auto z-60 divide-y divide-white/5 custom-scrollbar">
                                        {movesSuggestions.map((m) => (
                                          <button key={m} type="button" onMouseDown={() => handleSelectMove(num, m)} className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-neutral-200 text-xs font-bold uppercase transition-colors">{m}</button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {expandedMoves[num] && (
                                    <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 animate-fadeIn">
                                      <div className="col-span-2 space-y-0.5">
                                        <label className="text-[9px] uppercase font-bold text-neutral-500 block">Tipo</label>
                                        <select value={obj.type || "Normal"} onChange={(e) => { const updated = { ...obj, type: e.target.value }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-[11px] px-2 py-1 border border-white/10 rounded-lg text-neutral-200">
                                          {Object.keys(POKEMON_TYPES_STYLING).map(t => <option key={t} value={t} className="bg-[#10121a]">{POKEMON_TYPES_STYLING[t].emoji} {t}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none">PP</p>
                                        <input type="number" value={obj.pp} onChange={(e) => { const updated = { ...obj, pp: parseInt(e.target.value) || 0 }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-center text-xs py-1 border border-white/10 rounded-lg" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none">Dano</p>
                                        <input type="text" value={obj.damage || ""} placeholder="1d8" onChange={(e) => { const updated = { ...obj, damage: e.target.value }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-center text-xs py-1 border border-white/10 rounded-lg" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none">Alcance</p>
                                        <input type="text" value={obj.range || ""} placeholder="9m" onChange={(e) => { const updated = { ...obj, range: e.target.value }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-center text-xs py-1 border border-white/10 rounded-lg" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none">Poder</p>
                                        <input type="number" value={obj.power || 0} onChange={(e) => { const updated = { ...obj, power: parseInt(e.target.value) || 0 }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-center text-xs py-1 border border-white/10 rounded-lg" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none">BA</p>
                                        <input type="number" value={obj.attackBonus || 0} onChange={(e) => { const updated = { ...obj, attackBonus: parseInt(e.target.value) || 0 }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-center text-xs py-1 border border-white/10 rounded-lg" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none">CD</p>
                                        <input type="number" value={obj.difficultyClass || 0} onChange={(e) => { const updated = { ...obj, difficultyClass: parseInt(e.target.value) || 0 }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-center text-xs py-1 border border-white/10 rounded-lg" />
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-[9px] uppercase font-bold text-neutral-550 leading-none mb-0.5">Descrição</p>
                                        <textarea rows={2} value={obj.description || ""} placeholder="Efeito do movimento..." onChange={(e) => { const updated = { ...obj, description: e.target.value }; setObj(updated); updateEditingPokemonProperty(key, updated); }} className="w-full bg-[#0a0c10] text-xs px-2 py-1 border border-white/10 rounded-lg resize-none text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* ── Talentos ── */}
                          <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <h3 className="text-[10px] font-black uppercase text-amber-400 tracking-wider">✨ Talentos & Habilidades</h3>
                              <button type="button" onClick={() => { const newTalent = { id: "talent-" + Date.now(), name: "Novo Talento", description: "" }; const updated = [...formPokemonTalentos, newTalent]; setFormPokemonTalentos(updated); if (editingPokemonId) updateEditingPokemonProperty("talentos", updated); }} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase rounded-lg cursor-pointer text-white">+ Adicionar</button>
                            </div>
                            {formPokemonTalentos.length === 0 ? (
                              <p className="text-[9.5px] text-neutral-500 italic py-1">Nenhum talento customizado.</p>
                            ) : (
                              <div className="space-y-2">
                                {formPokemonTalentos.map((talent) => {
                                  const isExpanded = expandedTalents[talent.id] !== false;
                                  return (
                                    <div key={talent.id} className="bg-black/35 border border-white/5 rounded-xl p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <input type="text" placeholder="Nome do Talento" value={talent.name} onChange={(e) => { const updated = formPokemonTalentos.map(t => t.id === talent.id ? { ...t, name: e.target.value } : t); setFormPokemonTalentos(updated); if (editingPokemonId) updateEditingPokemonProperty("talentos", updated); }} className="bg-transparent text-xs font-black uppercase text-white tracking-wide border-b border-dashed border-white/10 focus:border-red-500 focus:outline-none flex-1 max-w-sm mr-2" />
                                        <div className="flex items-center gap-2">
                                          <button type="button" onClick={() => setExpandedTalents(prev => ({ ...prev, [talent.id]: !isExpanded }))} className="px-2 py-0.5 rounded bg-white/5 text-[9px] cursor-pointer text-white">{isExpanded ? "Recolher" : "Detalhar"}</button>
                                          <button type="button" onClick={() => { const updated = formPokemonTalentos.filter(t => t.id !== talent.id); setFormPokemonTalentos(updated); if (editingPokemonId) updateEditingPokemonProperty("talentos", updated); }} className="px-2 py-0.5 rounded bg-red-950/20 text-red-400 text-[9px] cursor-pointer">Excluir</button>
                                        </div>
                                      </div>
                                      {isExpanded && (
                                        <textarea placeholder="Descrição dos efeitos..." rows={2} value={talent.description || ""} onChange={(e) => { const updated = formPokemonTalentos.map(t => t.id === talent.id ? { ...t, description: e.target.value } : t); setFormPokemonTalentos(updated); if (editingPokemonId) updateEditingPokemonProperty("talentos", updated); }} className="w-full bg-black/40 text-xs px-2.5 py-2 border border-white/5 rounded-lg focus:outline-none resize-none font-sans text-white" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* ── Efeitos & Condições (accordion) ── */}
                          <div className="bg-white/[0.01] border border-white/[0.05] p-3.5 rounded-xl space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                              <button type="button" onClick={() => setIsFormPokemonEffectsOpen(!isFormPokemonEffectsOpen)} className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-extrabold text-[9.5px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all text-center">
                                {isFormPokemonEffectsOpen ? "▲ Fechar Efeitos & Condições" : "⚙️ Efeitos & Condições de Combate"}
                              </button>
                              <div className="text-[9px] md:text-[10px] font-mono text-neutral-300 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl whitespace-nowrap">
                                📦 Item: <span className="text-[#fbbf24] font-bold">{formPokemonEquippedItem || "Nenhum"}</span>
                              </div>
                            </div>
                            {isFormPokemonEffectsOpen && (
                              <div className="bg-[#07090d] border border-white/5 rounded-xl p-4 space-y-4 animate-fadeIn text-left mt-2 text-white">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <h4 className="text-[9.5px] font-black uppercase text-red-500 tracking-wider border-b border-white/5 pb-1 block">Estágios de Combate (-6 a +6)</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-2 text-[8.5px] sm:text-[9.5px]">
                                      {[{ key: "attack", label: "Ataque" }, { key: "specialAttack", label: "Atq. Especial" }, { key: "defense", label: "Defesa" }, { key: "specialDefense", label: "Def. Especial" }, { key: "speed", label: "Velocidade" }, { key: "accuracy", label: "Precisão" }, { key: "evasion", label: "Evasão" }, { key: "criticalRange", label: "Crítico [0-3]" }].map((item) => {
                                        const val = formPokemonStatusStages[item.key as keyof typeof formPokemonStatusStages] ?? 0;
                                        const maxVal = item.key === "criticalRange" ? 3 : 6;
                                        const minVal = item.key === "criticalRange" ? 0 : -6;
                                        return (
                                          <div key={item.key} className="flex justify-between items-center bg-black/45 p-1.5 rounded-lg border border-white/[0.02]">
                                            <span className="text-white/80 font-medium">{item.label}:</span>
                                            <div className="flex items-center gap-1.5">
                                              <button type="button" onClick={() => setFormPokemonStatusStages(prev => ({ ...prev, [item.key]: Math.max(minVal, (prev[item.key as keyof typeof prev] ?? 0) - 1) }))} className="w-4 h-4 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center font-black pb-0.5 text-[10px]">-</button>
                                              <span className={`w-6 text-center font-mono font-black ${val > 0 ? "text-emerald-400" : val < 0 ? "text-red-400" : "text-white/40"}`}>{val > 0 ? `+${val}` : val}</span>
                                              <button type="button" onClick={() => setFormPokemonStatusStages(prev => ({ ...prev, [item.key]: Math.min(maxVal, (prev[item.key as keyof typeof prev] ?? 0) + 1) }))} className="w-4 h-4 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center font-black text-[10px]">+</button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="space-y-3.5 text-white">
                                    <div className="space-y-1">
                                      <label className="text-[9px] uppercase font-bold text-neutral-400 block pb-0.5 border-b border-white/5">Condição Não-Volátil</label>
                                      <select value={formPokemonStatusConditions.nonVolatile || ""} onChange={(e) => { const val = e.target.value; setFormPokemonStatusConditions(prev => ({ ...prev, nonVolatile: val ? val : undefined })); }} className="w-full bg-[#0a0c10] text-[10px] px-2 py-1.5 border border-white/10 rounded-lg text-white font-bold">
                                        <option value="" className="bg-[#0b0c11]">Nenhuma</option>
                                        <option value="Paralisia" className="bg-[#0b0c11]">Paralisia ⚡</option>
                                        <option value="Sono" className="bg-[#0b0c11]">Sono 💤</option>
                                        <option value="Queimadura" className="bg-[#0b0c11]">Queimadura 🔥</option>
                                        <option value="Congelamento" className="bg-[#0b0c11]">Congelamento ❄️</option>
                                        <option value="Envenenamento" className="bg-[#0b0c11]">Envenenamento ☠️</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] uppercase font-bold text-neutral-400 block pb-0.5 border-b border-white/5">Condições Voláteis</label>
                                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                                        {["Confuso", "Aturdido", "Apaixonado", "Maldição"].map(cond => {
                                          const activeList = formPokemonStatusConditions.volatile || [];
                                          const hasIt = activeList.includes(cond);
                                          return <button key={cond} type="button" onClick={() => { const next = hasIt ? activeList.filter(c => c !== cond) : [...activeList, cond]; setFormPokemonStatusConditions(prev => ({ ...prev, volatile: next })); }} className={`px-2.5 py-0.5 border text-[8.5px] uppercase font-bold font-mono rounded-full cursor-pointer transition-all ${hasIt ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "bg-black/30 border-white/5 text-neutral-500"}`}>🧠 {cond}</button>;
                                        })}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] uppercase font-bold text-neutral-400 block pb-0.5 border-b border-white/5">Equipar Item</label>
                                      <input type="text" placeholder="ex: Leftovers..." value={formPokemonEquippedItem} onChange={(e) => setFormPokemonEquippedItem(e.target.value)} className="w-full bg-[#0a0c10] text-xs px-2.5 py-1 border border-white/10 rounded-lg focus:outline-none focus:border-red-550 text-white" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                      {/* ════════════════════════════════════════════════
                          ABA 3 — TRAÇOS
                          Tipos, Fraquezas/Resistências, Locomoção, Sentidos, Perícias, Configs
                          ════════════════════════════════════════════════ */}
                      {formPokemonActiveTab === "tracos" && (
                        <div className="space-y-4 text-white">

                          {/* ── Tipos do Pokémon ── */}
                          <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-teal-400 tracking-wider">🔥 Tipos do Pokémon</h3>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.keys(POKEMON_TYPES_STYLING).map(type => {
                                const isSelected = formPokemonTypes.includes(type);
                                const style = POKEMON_TYPES_STYLING[type];
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                      let next: string[];
                                      if (isSelected) {
                                        next = formPokemonTypes.filter(t => t !== type);
                                      } else if (formPokemonTypes.length < 2) {
                                        next = [...formPokemonTypes, type];
                                      } else {
                                        next = [formPokemonTypes[1], type];
                                      }
                                      setFormPokemonTypes(next);
                                      const matchups = calculateMatchups(next);
                                      setFormPokemonWeaknesses(matchups.weaknesses);
                                      setFormPokemonResistances(matchups.resistances);
                                      setFormPokemonImmunities(matchups.immunities);
                                      if (editingPokemonId) updateEditingPokemonProperties({ types: next, weaknesses: matchups.weaknesses, resistances: matchups.resistances, immunities: matchups.immunities });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${isSelected ? `${style.bg || "bg-white/10"} ${style.border || "border-white/20"} ${style.text || "text-white"} shadow-[0_0_8px_rgba(255,255,255,0.1)]` : "bg-black/30 border-white/5 text-neutral-500 hover:border-white/20 hover:text-neutral-300"}`}
                                  >
                                    {style.emoji} {type}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[8px] text-neutral-500 italic">Selecione até 2 tipos. As fraquezas, resistências e imunidades são calculadas automaticamente.</p>
                            {/* Fraquezas / Resistências / Imunidades (calculadas) */}
                            {formPokemonTypes.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                {[
                                  { label: "Fraquezas", data: formPokemonWeaknesses, color: "text-red-400", bg: "bg-red-950/10 border-red-500/15" },
                                  { label: "Resistências", data: formPokemonResistances, color: "text-emerald-400", bg: "bg-emerald-950/10 border-emerald-500/15" },
                                  { label: "Imunidades", data: formPokemonImmunities, color: "text-indigo-400", bg: "bg-indigo-950/10 border-indigo-500/15" },
                                ].map(({ label, data, color, bg }) => (
                                  <div key={label} className={`${bg} border rounded-xl p-2.5 space-y-1.5`}>
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${color} block`}>{label}</span>
                                    <div className="flex flex-wrap gap-1">
                                      {data.length === 0 ? <span className="text-[8px] text-neutral-600 italic">Nenhuma</span> : data.map(item => <span key={item} className="text-[8px] bg-black/30 border border-white/5 px-1.5 py-0.5 rounded font-mono text-neutral-300">{item}</span>)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ── Locomoção + Sentidos ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3 bg-black/25 p-3 rounded-xl border border-white/5">
                              <span className="text-[9.5px] uppercase font-bold text-neutral-400 block border-b border-white/5 pb-1">🏃 Locomoção</span>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                  { key: "andando", label: "Andando", placeholder: "9m" },
                                  { key: "voando", label: "Voando", placeholder: "12m" },
                                  { key: "nadando", label: "Nadando", placeholder: "9m" },
                                  { key: "escalando", label: "Escalando", placeholder: "6m" },
                                  { key: "cavando", label: "Cavando", placeholder: "6m" },
                                ].map(({ key, label, placeholder }) => (
                                  <div key={key} className="space-y-1">
                                    <label className="text-[8.5px] uppercase font-bold text-neutral-450 block">{label}</label>
                                    <input type="text" value={(formPokemonMovement as any)[key] || ""} placeholder={placeholder} onChange={(e) => { const updated = { ...formPokemonMovement, [key]: e.target.value }; setFormPokemonMovement(updated); if (editingPokemonId) updateEditingPokemonProperty("movement", updated); }} className="w-full bg-[#0a0c10] text-xs px-2 py-1 border border-white/10 rounded-lg text-white" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3 bg-black/25 p-3 rounded-xl border border-white/5">
                              <span className="text-[9.5px] uppercase font-bold text-neutral-400 block border-b border-white/5 pb-1">👁️ Sentidos Especiais</span>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                  { key: "escuro", label: "Visão no Escuro", placeholder: "18m" },
                                  { key: "sismico", label: "Sentido Sísmico", placeholder: "9m" },
                                  { key: "verdadeiraVisao", label: "Visão Verdadeira", placeholder: "9m" },
                                  { key: "sonar", label: "Sonar", placeholder: "15m" },
                                ].map(({ key, label, placeholder }) => (
                                  <div key={key} className="space-y-1">
                                    <label className="text-[8.5px] uppercase font-bold text-neutral-455 block">{label}</label>
                                    <input type="text" value={(formPokemonSenses as any)[key] || ""} placeholder={placeholder} onChange={(e) => { const updated = { ...formPokemonSenses, [key]: e.target.value }; setFormPokemonSenses(updated); if (editingPokemonId) updateEditingPokemonProperty("senses", updated); }} className="w-full bg-[#0a0c10] text-xs px-2 py-1 border border-white/10 rounded-lg text-white" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* ── Perícias Treinadas ── */}
                          <div className="space-y-3 bg-black/25 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-1 select-none">
                              <span className="text-[9.5px] uppercase font-bold text-neutral-400 block">🎓 Perícias Treinadas</span>
                              <span className="text-[8px] font-mono text-neutral-450 uppercase">Proficiência: +{profBonus}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1.5">
                              {POKEMON_SKILLS_LIST.map(sk => {
                                const baseVal = formPokemonAttrs[sk.attr as "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR"] ?? 10;
                                const natureObj = POKEMON_NATURES.find(n => n.id === formPokemonNature);
                                const isBenefited = natureObj?.bonusAttr === sk.attr;
                                const isPenalized = natureObj?.penaltyAttr === sk.attr;
                                const val = isBenefited ? baseVal + 2 : (isPenalized ? Math.max(1, baseVal - 2) : baseVal);
                                const baseMod = Math.floor((val - 10) / 2);
                                const isProficient = formPokemonSkills.includes(sk.name);
                                const isSpecialized = formPokemonSpecializedSkills.includes(sk.name);
                                const totalMod = baseMod + (isSpecialized ? (profBonus * 2) : (isProficient ? profBonus : 0));
                                const totalModStr = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
                                return (
                                  <div key={sk.name} className="flex flex-col justify-between p-2 rounded-xl bg-black/35 border border-white/5 hover:border-white/10 transition-all text-left">
                                    <div className="flex items-baseline justify-between select-none">
                                      <span className="text-[10.5px] font-bold text-white tracking-wide truncate max-w-[130px]" title={sk.name}>{sk.name} <span className="text-[8px] font-bold text-neutral-500 font-mono">({sk.attr})</span></span>
                                      <span className="text-white/10 grow mx-1 border-b border-dashed border-white/10"></span>
                                      <span className="font-mono text-[10.5px] font-black text-amber-400 shrink-0">{totalModStr}</span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <button type="button" onClick={() => { let nextSkills = [...formPokemonSkills]; let nextSpecialized = [...formPokemonSpecializedSkills]; if (isProficient) { nextSkills = nextSkills.filter(s => s !== sk.name); nextSpecialized = nextSpecialized.filter(s => s !== sk.name); } else { nextSkills.push(sk.name); } setFormPokemonSkills(nextSkills); setFormPokemonSpecializedSkills(nextSpecialized); if (editingPokemonId) { updateEditingPokemonProperty("skills", nextSkills); updateEditingPokemonProperty("specializedSkills", nextSpecialized); } }} className={`px-2 py-1 rounded-lg text-[8px] uppercase font-black tracking-wider border select-none transition-all flex items-center gap-1.5 cursor-pointer flex-1 justify-center ${isProficient ? "bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20" : "bg-black/40 border-white/5 text-neutral-450 hover:text-neutral-350 hover:bg-neutral-900/40"}`}><span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" /><span>Proficiente</span></button>
                                      <button type="button" disabled={!isProficient} onClick={() => { if (!isProficient) return; let nextSpecialized = [...formPokemonSpecializedSkills]; if (isSpecialized) { nextSpecialized = nextSpecialized.filter(s => s !== sk.name); } else { nextSpecialized.push(sk.name); } setFormPokemonSpecializedSkills(nextSpecialized); if (editingPokemonId) updateEditingPokemonProperty("specializedSkills", nextSpecialized); }} className={`px-2 py-1 rounded-lg text-[8px] uppercase font-black tracking-wider border select-none transition-all flex items-center gap-1.5 flex-1 justify-center ${!isProficient ? "opacity-25 cursor-not-allowed bg-black/20 border-white/5 text-neutral-600" : isSpecialized ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 cursor-pointer" : "bg-black/40 border-white/5 text-neutral-450 hover:text-neutral-350 hover:bg-neutral-900/40 cursor-pointer"}`}><span>✨</span><span>Especialista</span></button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* ── Configurações de Combate (STAB, Dado de Vida, SR, XP ao Derrotar, CD Captura) ── */}
                          <div className="bg-black/25 p-4 rounded-xl border border-white/5 space-y-3">
                            <span className="text-[9.5px] uppercase font-bold text-neutral-400 block border-b border-white/5 pb-1">⚙️ Configurações de Combate</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block">STAB</label>
                                <select value={formPokemonStab} onChange={(e) => { const val = e.target.value; setFormPokemonStab(val); if (editingPokemonId) updateEditingPokemonProperty("stab", val); }} className="w-full bg-[#0a0c10] text-xs px-3 py-2 border border-white/10 rounded-xl font-bold text-white">
                                  <option value="x1.5">x1.5 (Padrão)</option>
                                  <option value="x2.0">x2.0 (Adaptabilidade)</option>
                                  <option value="x1.0">Sem STAB (x1.0)</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block">Dado de Vida</label>
                                <input type="text" placeholder="1d8" value={formPokemonDadoVida} onChange={(e) => { const val = e.target.value; setFormPokemonDadoVida(val); if (editingPokemonId) updateEditingPokemonProperty("dadoVida", val); }} className="w-full bg-[#0a0c10] text-xs px-3 py-2 border border-white/10 rounded-xl text-white" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block">SR da Espécie</label>
                                <input type="text" placeholder="1/4, 1, 2..." value={formPokemonSr} onChange={(e) => { const val = e.target.value; setFormPokemonSr(val); if (editingPokemonId) updateEditingPokemonProperty("sr", val); }} className="w-full bg-[#0a0c10] text-xs px-3 py-2 border border-white/10 rounded-xl text-white" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block">XP ao Derrotar</label>
                                <input type="text" placeholder="100 XP" value={formPokemonXpValue} onChange={(e) => { const val = e.target.value; setFormPokemonXpValue(val); if (editingPokemonId) updateEditingPokemonProperty("xpValue", val); }} className="w-full bg-[#0a0c10] text-xs px-3 py-2 border border-white/10 rounded-xl text-white" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-bold text-neutral-400 block">CD de Captura</label>
                                <input type="text" placeholder="CD 15" value={formPokemonCdCaptura} onChange={(e) => { const val = e.target.value; setFormPokemonCdCaptura(val); if (editingPokemonId) updateEditingPokemonProperty("cdCaptura", val); }} className="w-full bg-[#0a0c10] text-xs px-3 py-2 border border-white/10 rounded-xl text-white" />
                              </div>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* ════════════════════════════════════════════════
                          ABA 4 — EVOLUÇÃO
                          XP, Progressão, Marcos de Nível
                          ════════════════════════════════════════════════ */}
                      {formPokemonActiveTab === "evolucao" && (
                        <div className="space-y-5 text-white animate-fade-in">

                          {/* ── Cards de Progressão ── */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              { label: "Nível Atual", value: `NV. ${formPokemonLevel}`, color: "text-white" },
                              { label: "SR da Espécie", value: `SR ${formPokemonSr}`, color: "text-[#fbbf24]", title: "Species Rating" },
                              { label: "Proficiência", value: `+${calculateProficiencyBonus(formPokemonLevel)}`, color: "text-emerald-400", title: "Bônus de Proficiência" },
                              { label: "Bônus STAB", value: `+${calculateStabBonus(formPokemonLevel)}`, color: "text-indigo-400", title: "Same Type Attack Bonus" },
                            ].map(({ label, value, color, title }) => (
                              <div key={label} className="bg-[#07090d]/50 p-2 border border-white/5 rounded-lg flex flex-col justify-center" title={title}>
                                <span className="text-[8px] text-neutral-400 uppercase font-mono tracking-wider font-bold">{label}</span>
                                <span className={`text-sm font-black mt-0.5 font-mono font-bold ${color}`}>{value}</span>
                              </div>
                            ))}
                          </div>

                          {/* ── XP + Barra ── */}
                          {(() => {
                            const nextXpRequired = getXPRequiredForLevel(formPokemonLevel, formPokemonSr);
                            const xpPercentage = Math.min(100, Math.max(0, (formPokemonXp / (nextXpRequired || 1)) * 100));
                            return (
                              <div className="bg-[#0b0d13]/50 border border-white/5 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold font-mono tracking-wide text-neutral-350 uppercase">Experiência</span>
                                  <div className="text-right">
                                    <span className="font-mono text-xs font-black text-amber-400">{formPokemonXp.toLocaleString("pt-BR")}</span>
                                    <span className="font-mono text-[10px] text-neutral-500 font-bold mx-1">/</span>
                                    <span className="font-mono text-[10px] font-extrabold text-neutral-400">{nextXpRequired.toLocaleString("pt-BR")} XP</span>
                                    <span className="text-indigo-400 font-extrabold ml-1.5 text-[9px]">({xpPercentage.toFixed(1)}%)</span>
                                  </div>
                                </div>
                                <div className="w-full bg-[#030406] rounded-full h-3 border border-white/10 overflow-hidden relative p-0.5">
                                  <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" style={{ width: `${xpPercentage}%` }} />
                                </div>
                                <div className="flex justify-between text-[8px] font-mono text-neutral-450 font-black">
                                  <span>NÍVEL {formPokemonLevel}</span>
                                  <span>{xpPercentage.toFixed(1)}% COMPLETADO</span>
                                  <span>NÍVEL {formPokemonLevel < 100 ? formPokemonLevel + 1 : 100}</span>
                                </div>
                                <div className="flex justify-between items-center gap-2 pt-1 border-t border-white/5">
                                  <span className="text-[8px] text-neutral-400 leading-normal font-medium">Ao acumular XP suficiente, o Pokémon sobe de nível automaticamente.</span>
                                  <button type="button" onClick={() => { setFormAddXpAmount(nextXpRequired - formPokemonXp > 0 ? nextXpRequired - formPokemonXp : 100); setFormAddXpReason(""); setIsAddXpModalOpen(true); }} className="px-3 py-1 bg-indigo-950/40 hover:bg-indigo-950/85 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 font-black text-[9px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 font-mono">✚ Adicionar XP</button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── Histórico de XP ── */}
                          <div className="border border-white/5 rounded-xl p-3 space-y-2">
                            <label className="text-[8.5px] uppercase font-black text-neutral-400 tracking-wider block font-mono">📜 Histórico de Experiência</label>
                            <div className="max-h-[100px] overflow-y-auto custom-scrollbar space-y-1 font-mono text-[8.5px]">
                              {formPokemonXpHistory && formPokemonXpHistory.length > 0 ? (
                                [...formPokemonXpHistory].reverse().map((hist, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-1 px-2 border border-white/[0.03] bg-[#07090d]/30 rounded-lg">
                                    <div className="flex items-center gap-1.5 text-neutral-300 select-none">
                                      <span className="text-neutral-500">[{hist.data || "N/A"}]</span>
                                      <span className="text-neutral-350 italic font-semibold">{hist.motivo || "Não especificado"}</span>
                                    </div>
                                    <span className="text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">+{hist.amount?.toLocaleString("pt-BR")} XP</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-neutral-500 italic text-left py-1 select-none">Nenhum registro de XP gravado.</p>
                              )}
                            </div>
                          </div>

                          {/* ── Botão Level Up ── */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-white/5 rounded-xl p-4">
                            <div>
                              <h4 className="text-[11px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">📈 Recompensas de Nível</h4>
                              <p className="text-[9px] text-neutral-400 font-medium mt-0.5">Verifique bônus, habilidades desbloqueadas e histórico de evolução</p>
                            </div>
                            <button type="button" onClick={() => { if (formPokemonLevel > 1) { triggerPokemonLevelUp(formPokemonLevel - 1, formPokemonLevel); } else { setNotification("⚠️ Seu Pokémon precisa estar pelo menos no Nível 2!"); } }} className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-mono text-[9px] uppercase font-black rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-1.5 cursor-pointer animate-pulse">
                              <span>🌟</span><span>Verificar Recompensas</span>
                            </button>
                          </div>

                          {/* ── Tabela de Marcos por Nível ── */}
                          <div className="bg-[#0b0d13]/50 border border-white/5 rounded-xl p-4 space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider border-b border-white/5 pb-2">🗺️ Marcos de Progressão por Nível</h4>
                            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                              {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => {
                                const isCurrent = lvl === formPokemonLevel;
                                const isPassed = lvl < formPokemonLevel;
                                const hasStab = [3, 7, 13].includes(lvl);
                                const hasProf = [5, 9, 13, 17].includes(lvl);
                                const hasMove = [2, 6, 10, 14, 18].includes(lvl);
                                const hasAsi = [4, 8, 12, 16, 20].includes(lvl);
                                const isDamageScale = [5, 10, 17].includes(lvl);
                                let label = "-";
                                let colorClasses = "border-white/5 text-neutral-500 opacity-60";
                                if (isCurrent) colorClasses = "bg-indigo-950/40 border-indigo-500/40 text-indigo-300 ring-1 ring-indigo-500/30 scale-105 font-bold";
                                else if (isPassed) colorClasses = "bg-neutral-900/40 border-emerald-950/20 text-emerald-450";
                                if (hasStab) label = "STAB";
                                else if (hasProf) label = "PROF";
                                else if (hasMove) label = "MOVE";
                                else if (hasAsi) label = "ASI";
                                else if (isDamageScale) label = "DANO+";
                                return (
                                  <div key={lvl} className={`p-2 border rounded-lg flex flex-col justify-between h-14 ${colorClasses}`}>
                                    <span className="text-[7.5px] uppercase font-mono tracking-wider font-bold block">Nv {lvl}</span>
                                    <span className="text-[8px] font-black tracking-wide">{label}</span>
                                    {isPassed ? <span className="text-[6.5px] text-emerald-500 select-none">✓ Ativo</span> : isCurrent ? <span className="text-[6.5px] text-indigo-400 font-extrabold animate-pulse">● Atual</span> : <span className="text-[6.5px] text-neutral-500">🔒</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      )}

                    </div>{/* End Tab Content */}
                  </div>{/* End Body Wrapper */}


                {/* Footer and confirm action */}
                <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex justify-between items-center shrink-0">
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold select-none">
                    🔵 Conectado ao Firebase VTT
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddPokemonModalOpen(false)}
                      className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 font-bold text-[10px] uppercase rounded-lg border border-white/5 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    {!editingPokemonId ? (
                      <button
                        type="button"
                        onClick={() => {
                          const newPk = {
                            id: "pk-" + Date.now(),
                            name: formPokemonName || "Novo Pokémon",
                            species: formPokemonSpecies || "Pikachu",
                            level: formPokemonLevel || 5,
                            hpCurrent: formPokemonHpCurrent || 20,
                            hpMax: formPokemonHpMax || 20,
                            image: formPokemonImage || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
                            isPc: formPokemonIsPc,
                            initiative: formPokemonInitiative || 0,
                            speciesId: formPokemonSpeciesId || 25,
                            isShiny: formPokemonIsShiny,
                            imageDefault: formPokemonImageDefault,
                            imageShiny: formPokemonImageShiny,
                            move1: formPokemonMoveObj1,
                            move2: formPokemonMoveObj2,
                            move3: formPokemonMoveObj3,
                            move4: formPokemonMoveObj4,
                            types: formPokemonTypes.length > 0 ? formPokemonTypes : ["Normal"],
                            weaknesses: formPokemonWeaknesses,
                            resistances: formPokemonResistances,
                            immunities: formPokemonImmunities,
                            talentos: formPokemonTalentos,
                            skills: formPokemonSkills,
                            specializedSkills: formPokemonSpecializedSkills,
                            attributes: formPokemonAttrs,
                            savingThrows: formPokemonSavingThrows,
                            statusStages: formPokemonStatusStages,
                            statusConditions: formPokemonStatusConditions,
                            equippedItem: formPokemonEquippedItem,
                            stab: formPokemonStab,
                            dadoVida: formPokemonDadoVida,
                            movement: formPokemonMovement,
                            senses: formPokemonSenses,
                            sr: formPokemonSr,
                            xpValue: formPokemonXpValue,
                            cdCaptura: formPokemonCdCaptura,
                            xp: formPokemonXp,
                            xpHistory: formPokemonXpHistory,
                            nature: formPokemonNature || "",
                            loyalty: formPokemonLoyalty,
                            loyaltyBonusSkill: formPokemonLoyaltyBonusSkill,
                            loyaltySpecialistSkill: formPokemonLoyaltySpecialistSkill,
                            loyaltyEvolutionEligible: formPokemonLoyaltyEvolutionEligible
                          };

                          updateActiveTrainerProperty("pokemon", [...sheetPokemon, newPk]);
                          setIsAddPokemonModalOpen(false);
                          setNotification(`Pokémon "${newPk.name}" adicionado com sucesso!`);
                        }}
                        className="px-5 py-2 bg-red-650 hover:bg-red-550 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer"
                      >
                        Salvar e Cadastrar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = sheetPokemon.map(p => {
                            if (p.id === editingPokemonId) {
                              return {
                                ...p,
                                name: formPokemonName || "Novo Pokémon",
                                species: formPokemonSpecies || "Pikachu",
                                level: formPokemonLevel || 5,
                                hpCurrent: formPokemonHpCurrent || 20,
                                hpMax: formPokemonHpMax || 20,
                                image: formPokemonImage || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
                                isPc: formPokemonIsPc,
                                initiative: formPokemonInitiative || 0,
                                speciesId: formPokemonSpeciesId || 25,
                                isShiny: formPokemonIsShiny,
                                imageDefault: formPokemonImageDefault,
                                imageShiny: formPokemonImageShiny,
                                move1: formPokemonMoveObj1,
                                move2: formPokemonMoveObj2,
                                move3: formPokemonMoveObj3,
                                move4: formPokemonMoveObj4,
                                types: formPokemonTypes.length > 0 ? formPokemonTypes : ["Normal"],
                                weaknesses: formPokemonWeaknesses,
                                resistances: formPokemonResistances,
                                immunities: formPokemonImmunities,
                                talentos: formPokemonTalentos,
                                skills: formPokemonSkills,
                                specializedSkills: formPokemonSpecializedSkills,
                                attributes: formPokemonAttrs,
                                savingThrows: formPokemonSavingThrows,
                                statusStages: formPokemonStatusStages,
                                statusConditions: formPokemonStatusConditions,
                                equippedItem: formPokemonEquippedItem,
                                stab: formPokemonStab,
                                dadoVida: formPokemonDadoVida,
                                movement: formPokemonMovement,
                                senses: formPokemonSenses,
                                sr: formPokemonSr,
                                xpValue: formPokemonXpValue,
                                cdCaptura: formPokemonCdCaptura,
                                xp: formPokemonXp,
                                xpHistory: formPokemonXpHistory,
                                nature: formPokemonNature || "",
                                loyalty: formPokemonLoyalty,
                                loyaltyBonusSkill: formPokemonLoyaltyBonusSkill,
                                loyaltySpecialistSkill: formPokemonLoyaltySpecialistSkill,
                                loyaltyEvolutionEligible: formPokemonLoyaltyEvolutionEligible
                              };
                            }
                            return p;
                          });
                          updateActiveTrainerProperty("pokemon", updated);
                          setIsAddPokemonModalOpen(false);
                          setNotification(`Pokémon "${formPokemonName}" atualizado com sucesso!`);
                        }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase rounded-lg cursor-pointer"
                      >
                        Salvar e Fechar
                      </button>
                    )}
                  </div>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>


      {/* MODAL DE ADIÇÃO DE XP POKÉMON */}
      <AnimatePresence>
        {isAddXpModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto font-sans"
            onClick={() => setIsAddXpModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0c0e14] border border-indigo-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.25)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-indigo-950/20 px-5 py-4 border-b border-indigo-500/15 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold font-sans">
                  <span className="text-sm">🌟</span>
                  <div>
                    <h3 className="text-[11px] font-black uppercase text-indigo-400 tracking-wider font-mono">Adicionar Experiência (XP)</h3>
                    <p className="text-[9px] text-neutral-450 font-black font-sans mt-0.5">{formPokemonName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddXpModalOpen(false)}
                  className="text-neutral-400 hover:text-white transition-all text-xs font-black p-1 hover:bg-white/5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 space-y-4 text-left">
                {/* XP Input */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-neutral-450 block tracking-wider font-mono">
                    Quantidade de XP
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 500"
                    value={formAddXpAmount}
                    onChange={(e) => setFormAddXpAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#07090d] text-sm px-3.5 py-2.5 border border-white/10 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-indigo-500 hover:border-white/20 transition-all text-center"
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap justify-center">
                    {[100, 250, 500, 1000, 2000, 5000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormAddXpAmount(val)}
                        className="px-2 py-1 bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 font-mono text-[8.5px] font-black rounded transition-all cursor-pointer"
                      >
                        +{val.toLocaleString("pt-BR")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-neutral-450 block tracking-wider font-mono">
                    Motivo / Descrição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Vitória contra Onix, Captura de Pidgey..."
                    value={formAddXpReason}
                    maxLength={40}
                    onChange={(e) => setFormAddXpReason(e.target.value)}
                    className="w-full bg-[#07090d] text-xs px-3.5 py-2.5 border border-white/10 rounded-xl text-white font-black placeholder-neutral-600 focus:outline-none focus:border-indigo-500 hover:border-white/20 transition-all font-sans"
                  />
                </div>

                {/* Info Note template */}
                <div className="bg-neutral-900/60 p-3 rounded-lg border border-white/[0.03] space-y-1 select-none">
                  <p className="text-[8.5px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider flex items-center gap-1">
                    <span>💡 Prévia de Progressão</span>
                  </p>
                  {(() => {
                    const extra = formAddXpAmount;
                    const nextXpRequired = getXPRequiredForLevel(formPokemonLevel, formPokemonSr);
                    let tempLevel = formPokemonLevel;
                    let tempXp = formPokemonXp + extra;
                    let levelsGained = 0;
                    
                    while (tempLevel < 100) {
                      const req = getXPRequiredForLevel(tempLevel, formPokemonSr);
                      if (tempXp >= req) {
                        tempLevel += 1;
                        tempXp -= req;
                        levelsGained += 1;
                      } else {
                        break;
                      }
                    }
                    
                    return (
                      <p className="text-[8px] text-neutral-400 leading-relaxed font-semibold">
                        Ganhando <span className="text-[#fbbf24] font-black">+{extra.toLocaleString("pt-BR")} XP</span>, o seu Pokémon irá para o <span className="text-white font-black font-mono font-bold">NÍVEL {tempLevel}</span> (com {tempXp.toLocaleString("pt-BR")} XP restantes).
                        {levelsGained > 0 && (
                          <span className="text-emerald-400 font-bold block mt-1 uppercase font-mono animate-bounce">
                            ⚡ IRÁ ADQUIRIR +{levelsGained} NÍVEIS!
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-neutral-950 px-5 py-4 border-t border-white/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddXpModalOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-mono text-[9px] uppercase font-bold rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const xpAmount = Math.max(1, formAddXpAmount);
                    const reason = formAddXpReason.trim() || "Treinamento / Recompensa";
                    const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

                    const newRecord = {
                      data: today,
                      amount: xpAmount,
                      motivo: reason
                    };

                    const updatedHistory = [...formPokemonXpHistory, newRecord];
                    setFormPokemonXpHistory(updatedHistory);

                    let currentLevel = formPokemonLevel;
                    let currentXp = formPokemonXp + xpAmount;
                    let didLevelUp = false;

                    while (currentLevel < 100) {
                      const requiredXp = getXPRequiredForLevel(currentLevel, formPokemonSr);
                      if (currentXp >= requiredXp) {
                        currentLevel += 1;
                        currentXp -= requiredXp;
                        didLevelUp = true;
                      } else {
                        break;
                      }
                    }

                    setFormPokemonXp(currentXp);
                    setFormPokemonLevel(currentLevel);

                    const accumulatedUps: Record<string, any> = {
                      xp: currentXp,
                      xpHistory: updatedHistory,
                      level: currentLevel
                    };

                    if (didLevelUp) {
                      setNotification(`🌟 PARABÉNS! ${formPokemonName} subiu para o Nível ${currentLevel}!`);
                      setTimeout(() => {
                        triggerPokemonLevelUp(formPokemonLevel, currentLevel);
                      }, 100);
                    } else {
                      setNotification(`⚡ ${xpAmount.toLocaleString("pt-BR")} XP adicionado a ${formPokemonName}!`);
                    }

                    if (editingPokemonId) {
                      updateEditingPokemonProperties(accumulatedUps);
                    }

                    setIsAddXpModalOpen(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] uppercase font-black rounded-lg transition-all hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ASSISTENTE DE LEVEL UP (ETAPA 2) */}
      <AnimatePresence>
        {isLevelUpModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[101] flex items-center justify-center p-4 overflow-y-auto font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0c10] border border-orange-500/35 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.18)] relative text-white text-left flex flex-col max-h-[90vh]"
            >
              {/* Header do Wizard */}
              <div className="bg-[#10121a] px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl animate-bounce">🌟</span>
                  <div>
                    <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider font-mono">
                      Controle de Evolução & Recompensas
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-semibold font-sans mt-0.5">
                      {formPokemonName} — Subiu do Nível <span className="text-amber-300 font-black font-mono text-xs">{levelUpOldLevel}</span> para o <span className="text-orange-400 font-black font-mono text-xs">{levelUpNewLevel}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Step indicators */}
                  <div className="flex gap-1">
                    {["intro", "asi", "move", "recap"].map((st) => {
                      let bgClass = "bg-neutral-800";
                      let activeIndicator = false;
                      if (levelUpCurrentStep === st) {
                        bgClass = "bg-amber-500";
                        activeIndicator = true;
                      } else {
                        const steps = ["intro", "asi", "move", "recap"];
                        const currIdx = steps.indexOf(levelUpCurrentStep);
                        const thisIdx = steps.indexOf(st);
                        if (thisIdx < currIdx) bgClass = "bg-emerald-500";
                      }
                      return (
                        <div
                          key={st}
                          className={`w-4 h-1.5 rounded-full ${bgClass} transition-all duration-300 ${activeIndicator ? "scale-x-125" : ""}`}
                          title={`Etapa: ${st}`}
                        />
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Deseja pular o assistente de distribuição? Passivos essenciais continuarão subindo de nível automaticamente!")) {
                        setIsLevelUpModalOpen(false);
                      }
                    }}
                    className="text-neutral-450 hover:text-white transition-all text-xs font-black p-1 hover:bg-white/5 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Wizard Body (Scrollable container) */}
              <div className="p-6 overflow-y-auto grow space-y-6 flex-1 min-h-0">
                
                {/* STEP 1: INTRO */}
                {levelUpCurrentStep === "intro" && (
                  <div className="space-y-5 animate-fade-in text-left">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-tr from-amber-600 to-orange-500 rounded-full flex items-center justify-center text-2xl shadow-md shrink-0">
                        📈
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-400 uppercase font-mono">Bônus Passivos Atualizados!</h4>
                        <p className="text-[10px] text-neutral-300 leading-relaxed font-medium">
                          Habilidades estáticas e modificadores matemáticos (como bônus STAB, bônus de Proficiência e Vida Máxima) de {formPokemonName} foram ajustados para o Nível {levelUpNewLevel}.
                        </p>
                      </div>
                    </div>

                    <h5 className="font-mono text-[9px] uppercase font-black text-neutral-400 tracking-wider">
                      Resumo Estatístico do Salto de Nível:
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Vida Máxima */}
                      <div className="bg-[#12141c] border border-white/5 p-3 rounded-lg flex flex-col justify-between">
                        <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono">Vida HP Máxima</span>
                        <div className="mt-1 flex items-baseline gap-1 bg-neutral-900/40 p-1 px-2 rounded-md self-start">
                          <span className="text-xs font-black text-white">Automático</span>
                        </div>
                        <p className="text-[8px] text-neutral-400 mt-1">Sua nova vida máxima já possui bônus CON embutido por nível.</p>
                      </div>

                      {/* Proficiência */}
                      <div className="bg-[#12141c] border border-white/5 p-3 rounded-lg flex flex-col justify-between">
                        <span className="text-[8px] uppercase font-bold text-sky-400 font-mono">Proficiência Base</span>
                        <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                          <span className="text-neutral-500 text-[9px] font-bold">Anterior:</span>
                          <span className="text-white text-xs font-black">+{calculateProficiencyBonus(levelUpOldLevel)}</span>
                          <span className="text-neutral-500 text-[10px]">➔</span>
                          <span className="text-sky-300 text-xs font-black">+{calculateProficiencyBonus(levelUpNewLevel)}</span>
                        </div>
                        <p className="text-[8px] text-neutral-400 mt-1">Concede bônus maiores nos salvaguardas e perícias habilitadas.</p>
                      </div>

                      {/* STAB */}
                      <div className="bg-[#12141c] border border-white/5 p-3 rounded-lg flex flex-col justify-between">
                        <span className="text-[8px] uppercase font-bold text-orange-400 font-mono">Bônus de STAB</span>
                        <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                          <span className="text-neutral-500 text-[9px] font-bold">Anterior:</span>
                          <span className="text-white text-xs font-black">+{calculateStabBonus(levelUpOldLevel)}</span>
                          <span className="text-neutral-500 text-[10px]">➔</span>
                          <span className="text-orange-300 text-xs font-black">+{calculateStabBonus(levelUpNewLevel)}</span>
                        </div>
                        <p className="text-[8px] text-neutral-400 mt-1">Dano bônus extra na conjuração de habilidades do mesmo tipo.</p>
                      </div>
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2 select-none">
                      <span className="text-[9px] uppercase font-black text-amber-500 tracking-wider block font-mono">Recompensas Requeridas de Ação Humana:</span>
                      <ul className="text-[10px] space-y-1.5 leading-relaxed text-neutral-350 list-disc pl-4 font-medium">
                        {levelUpAsiPointsAvailable > 0 ? (
                          <li>
                            Você atravessou marcos de <strong className="text-amber-400 font-bold">Pontos de Atributos/ASI</strong>. Recebeu um total de{" "}
                            <span className="text-white font-black font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-xs">{levelUpAsiPointsAvailable} pontos</span> para distribuir entre Atributos ou converter em 1 maravilhoso Talento!
                          </li>
                        ) : (
                          <li>Nenhum aumento de Atributo (ASI) de herança cruza estes níveis.</li>
                        )}
                        {levelUpMoveEventsToProcess > 0 ? (
                          <li>
                            Habilidade compatível desbloqueada! Seu Pokémon pode aprender até{" "}
                            <strong className="text-emerald-400 font-bold">{levelUpMoveEventsToProcess} movimento(s)</strong> diretamente de sua lista no PokeAPI de forma guiada!
                          </li>
                        ) : (
                          <li>Nenhum slot para aprendizado de movimentos compatíveis cruza estes níveis.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}


                {/* STEP 2: ASI */}
                {levelUpCurrentStep === "asi" && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-amber-500 font-mono tracking-wider">
                          🎁 {levelUpIsFeatMode ? "Seleção de Talento Pokémon" : "Distribuição de Atributos (ASI)"}
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans mt-0.5">
                          {levelUpIsFeatMode 
                            ? "Escolha um talento especial para o seu Pokémon herdar no lugar do ganho de atributos" 
                            : "Aprimore as capacidades físicas e cognitivas do seu Pokémon"}
                        </p>
                      </div>

                      {/* TOGGLE FEAT OR ASI MODE */}
                      {levelUpMaxFeatChoices > 0 && (
                        <button
                          type="button"
                          onClick={() => setLevelUpIsFeatMode(prev => !prev)}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono font-black text-[9px] uppercase border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{levelUpIsFeatMode ? "📊 Ver Atributos" : "🧬 Escolher Talento"}</span>
                        </button>
                      )}
                    </div>

                    {!levelUpIsFeatMode ? (
                      /* ASI POINT DISTRIBUTOR */
                      <div className="space-y-4 text-left">
                        {/* Budget Bar */}
                        {(() => {
                          const spentCount = (levelUpAsiAllocated.FOR || 0) +
                                             (levelUpAsiAllocated.DES || 0) +
                                             (levelUpAsiAllocated.CON || 0) +
                                             (levelUpAsiAllocated.INT || 0) +
                                             (levelUpAsiAllocated.SAB || 0) +
                                             (levelUpAsiAllocated.CAR || 0);
                          const remaining = levelUpAsiPointsAvailable - spentCount;
                          
                          return (
                            <div className="bg-[#12141c] border border-white/5 p-4 rounded-xl flex justify-between items-center select-none font-mono">
                              <span className="text-[10px] font-black text-neutral-450 uppercase tracking-widest">
                                Pontos Restantes de Distribuição:
                              </span>
                              <span className={`text-base font-black px-3 py-1 rounded-lg ${remaining > 0 ? "bg-amber-500/20 text-amber-400 animate-pulse font-bold" : "bg-neutral-900 text-neutral-500 font-bold"}`}>
                                {remaining} PONTOS
                              </span>
                            </div>
                          );
                        })()}

                        {/* Attribute Modifier Rows */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.keys(formPokemonAttrs).map((attr) => {
                            const key = attr as "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
                            const baseVal = formPokemonAttrs[key] || 10;
                            const added = levelUpAsiAllocated[key] || 0;
                            const totalVal = baseVal + added;
                            
                            const spentCount = (levelUpAsiAllocated.FOR || 0) +
                                               (levelUpAsiAllocated.DES || 0) +
                                               (levelUpAsiAllocated.CON || 0) +
                                               (levelUpAsiAllocated.INT || 0) +
                                               (levelUpAsiAllocated.SAB || 0) +
                                               (levelUpAsiAllocated.CAR || 0);
                            const canAdd = spentCount < levelUpAsiPointsAvailable;
                            const canSub = added > 0;
                            
                            return (
                              <div key={key} className="bg-[#12141c]/40 border border-white/5 p-3.5 rounded-xl flex items-center justify-between select-none">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-black text-neutral-350">{key}</span>
                                    <span className="text-[8px] text-neutral-500 font-black">•</span>
                                    <span className="text-[9px] uppercase font-bold text-neutral-400 font-sans tracking-wide">
                                      {key === "FOR" ? "Força" : key === "DES" ? "Destreza" : key === "CON" ? "Constituição" : key === "INT" ? "Inteligência" : key === "SAB" ? "Sabedoria" : "Carisma"}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-neutral-500 font-semibold">
                                    Base: {baseVal} <span className="font-bold text-neutral-400 font-mono">➔ Modificador: {Math.floor((totalVal - 10) / 2) >= 0 ? `+${Math.floor((totalVal - 10) / 2)}` : Math.floor((totalVal - 10) / 2)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    disabled={!canSub}
                                    onClick={() => {
                                      setLevelUpAsiAllocated(prev => ({
                                        ...prev,
                                        [key]: prev[key] - 1
                                      }));
                                    }}
                                    className={`w-7 h-7 bg-neutral-900 border border-white/10 rounded-full flex items-center justify-center font-bold hover:bg-neutral-800 hover:text-white transition-all cursor-pointer ${!canSub ? "opacity-30 cursor-not-allowed" : ""}`}
                                  >
                                    -
                                  </button>
                                  <span className="font-mono text-base font-black w-7 text-center">
                                    {totalVal}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!canAdd}
                                    onClick={() => {
                                      setLevelUpAsiAllocated(prev => ({
                                        ...prev,
                                        [key]: prev[key] + 1
                                      }));
                                    }}
                                    className={`w-7 h-7 bg-gradient-to-tr from-amber-600 to-orange-500 border border-transparent rounded-full flex items-center justify-center font-bold text-white hover:opacity-90 transition-all cursor-pointer ${!canAdd ? "opacity-30 cursor-not-allowed" : ""}`}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* FEAT SELECTION FOR POKÉMON */
                      <div className="space-y-4">
                        <div className="bg-[#12141c] border border-orange-500/10 p-3.5 rounded-xl flex items-center gap-2 select-none">
                          <span className="text-xs">💡</span>
                          <p className="text-[10px] text-neutral-300 font-medium">
                            Escolher um talento consome os pontos de atributos (ASI) pendentes desta fase de evolução. Você tem direito a escolher <strong className="text-amber-400 font-bold">{levelUpMaxFeatChoices} talento(s)</strong>.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {POKEMON_FEATS_POOL.map((feat) => {
                            const isSelected = levelUpSelectedFeats.some(f => f.id === feat.id);
                            const count = levelUpSelectedFeats.length;
                            const canSelect = count < levelUpMaxFeatChoices || isSelected;
                            
                            return (
                              <button
                                key={feat.id}
                                type="button"
                                disabled={!canSelect}
                                onClick={() => {
                                  if (isSelected) {
                                    setLevelUpSelectedFeats(prev => prev.filter(f => f.id !== feat.id));
                                  } else {
                                    setLevelUpSelectedFeats(prev => [...prev, feat]);
                                  }
                                }}
                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${isSelected ? "bg-amber-950/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "bg-neutral-900/40 border-white/5 hover:border-white/10 hover:bg-neutral-900/60"} ${!canSelect ? "opacity-50" : ""}`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <span className="font-sans text-xs font-black text-white">{feat.name}</span>
                                  {isSelected && (
                                    <span className="text-amber-400 text-[10px] font-black uppercase font-mono tracking-widest bg-amber-500/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <span>✓</span> Selecionado
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-neutral-400 leading-normal font-medium">{feat.description}</p>
                                <div className="text-[8px] font-mono font-semibold text-neutral-500">
                                  Requisitos: {feat.requirements}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* STEP 3: MOVES */}
                {levelUpCurrentStep === "move" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div>
                      <h4 className="text-xs font-black uppercase text-emerald-400 font-mono tracking-wider select-none">
                        ⚔️ Movimentos de Combate Desbloqueados
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-medium font-sans mt-0.5">
                        Selecione as habilidades de de PokeAPI disponíveis para o Nível {levelUpNewLevel} ou anteriores.
                      </p>
                    </div>

                    {levelUpIsLoadingMoves ? (
                      <div className="p-12 text-center space-y-3">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">Consultando PokeAPI de Movimentos...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Moves List Panel (Left) */}
                        <div className="md:col-span-6 bg-[#12141c]/50 border border-white/5 rounded-xl p-3 flex flex-col justify-start gap-1 max-h-[260px] overflow-y-auto">
                          <span className="text-[8px] uppercase font-bold text-neutral-500 tracking-wider font-mono block mb-2 select-none">Habilidades Compatíveis ({levelUpCompatibleMoves.length})</span>
                          {levelUpCompatibleMoves.length === 0 ? (
                            <p className="text-[10px] text-neutral-500 py-6 text-center select-none font-semibold">Nenhum movimento elegível encontrado para este nível.</p>
                          ) : (
                            levelUpCompatibleMoves.map((m) => {
                              const isCurrentSelect = levelUpSelectedMoveToLearn && levelUpSelectedMoveToLearn.englishName === m.rawName;
                              return (
                                <button
                                  key={m.rawName}
                                  type="button"
                                  onClick={async () => {
                                    setLevelUpSelectedMoveToLearn(null);
                                    const details = await fetchSingleMoveDetails(m.rawName);
                                    setLevelUpSelectedMoveToLearn(details);
                                    setLevelUpSelectedMoveToReplace("");
                                  }}
                                  className={`px-3 py-2 text-left rounded-lg text-xs font-semibold flex justify-between items-center transition-all cursor-pointer ${isCurrentSelect ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20 font-bold" : "hover:bg-white/5 text-neutral-300"}`}
                                >
                                  <span className="capitalize font-sans md:text-[11px]">{m.name}</span>
                                  <span className="font-mono text-[8px] text-neutral-500 font-bold bg-black/40 px-1.5 py-0.5 rounded">Nív. {m.levelLearned}</span>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* Move Details & Replace Form (Right) */}
                        <div className="md:col-span-6 space-y-3">
                          {levelUpSelectedMoveToLearn ? (
                            <div className="bg-[#12141c] border border-white/5 rounded-xl p-4 space-y-4">
                              {/* Move Card Top */}
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="text-[11px] font-black uppercase text-emerald-400 tracking-wide font-sans capitalize">{levelUpSelectedMoveToLearn.name}</h5>
                                  <p className="text-[8px] text-neutral-400 font-mono font-medium lowercase">en: {levelUpSelectedMoveToLearn.englishName}</p>
                                </div>
                                <span className={`text-[8.5px] font-black uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full border border-current select-none ${POKEMON_TYPES_STYLING[levelUpSelectedMoveToLearn.type] || "text-neutral-400"}`}>
                                  {levelUpSelectedMoveToLearn.type}
                                </span>
                              </div>

                              {/* Specs Grid */}
                              <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-mono select-none">
                                <div className="bg-neutral-900/60 p-1.5 rounded">
                                  <span className="text-neutral-500 block text-[7.5px] uppercase font-bold">Dano Base</span>
                                  <span className="text-white font-bold">{levelUpSelectedMoveToLearn.damage || "Status"}</span>
                                </div>
                                <div className="bg-neutral-900/60 p-1.5 rounded">
                                  <span className="text-neutral-500 block text-[7.5px] uppercase font-bold">Pontos PP</span>
                                  <span className="text-white font-bold">{levelUpSelectedMoveToLearn.pp} PPs</span>
                                </div>
                                <div className="bg-neutral-900/60 p-1.5 rounded bg-amber-500/5">
                                  <span className="text-amber-500/80 block text-[7.5px] uppercase font-semibold">Distância</span>
                                  <span className="text-white font-semibold truncate text-[8px]">{levelUpSelectedMoveToLearn.range || "Meio (12m)"}</span>
                                </div>
                              </div>

                              <p className="text-[9px] text-neutral-400 leading-normal font-sans border-t border-white/5 pt-2 font-medium">{levelUpSelectedMoveToLearn.description}</p>

                              {/* Learning Slot Selector */}
                              <div className="border-t border-white/5 pt-3 space-y-2 select-none">
                                <span className="text-[8px] uppercase font-bold text-neutral-500 tracking-wider font-mono block">Escolha em qual slot alocar o move:</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { id: "move1", label: "Slot 1", val: levelUpMove1 },
                                    { id: "move2", label: "Slot 2", val: levelUpMove2 },
                                    { id: "move3", label: "Slot 3", val: levelUpMove3 },
                                    { id: "move4", label: "Slot 4", val: levelUpMove4 },
                                  ].map((slot) => {
                                    const isSelected = levelUpSelectedMoveToReplace === slot.id;
                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => setLevelUpSelectedMoveToReplace(slot.id)}
                                        className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between h-12 cursor-pointer ${isSelected ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "border-white/5 bg-black/20 hover:border-white/10"}`}
                                      >
                                        <span className="text-[7.5px] font-mono text-neutral-500 uppercase font-black tracking-wider">{slot.label}</span>
                                        <span className="text-[9px] font-bold text-neutral-300 truncate w-full">{slot.val?.name || "Vazio"}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* LEARN MOVE CLICK ACTION */}
                              <button
                                type="button"
                                disabled={!levelUpSelectedMoveToReplace}
                                onClick={() => {
                                  if (!levelUpSelectedMoveToReplace || !levelUpSelectedMoveToLearn) return;
                                  
                                  const slotKey = levelUpSelectedMoveToReplace;
                                  let prevMoveName = "Vazio";
                                  
                                  if (slotKey === "move1") {
                                    prevMoveName = levelUpMove1?.name || "Vazio";
                                    setLevelUpMove1(levelUpSelectedMoveToLearn);
                                  } else if (slotKey === "move2") {
                                    prevMoveName = levelUpMove2?.name || "Vazio";
                                    setLevelUpMove2(levelUpSelectedMoveToLearn);
                                  } else if (slotKey === "move3") {
                                    prevMoveName = levelUpMove3?.name || "Vazio";
                                    setLevelUpMove3(levelUpSelectedMoveToLearn);
                                  } else if (slotKey === "move4") {
                                    prevMoveName = levelUpMove4?.name || "Vazio";
                                    setLevelUpMove4(levelUpSelectedMoveToLearn);
                                  }

                                  const logMsg = `Aprendeu ${levelUpSelectedMoveToLearn.name} no slot ${slotKey.replace("move", "Slot ")} (substituindo ${prevMoveName})`;
                                  setLevelUpLearnedMovesThisSession(prev => [...prev, {
                                    move: levelUpSelectedMoveToLearn,
                                    slot: slotKey,
                                    prevName: prevMoveName
                                  }]);
                                  
                                  setLevelUpHistoryLog(prev => [...prev, logMsg]);

                                  // Reset selected learning
                                  setLevelUpSelectedMoveToLearn(null);
                                  setLevelUpSelectedMoveToReplace("");
                                  
                                  setNotification(`⚔️ Movimento ${levelUpSelectedMoveToLearn.name} aprendido!`);
                                }}
                                className={`w-full py-2 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-mono text-[9px] uppercase font-black rounded-lg transition-all hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${!levelUpSelectedMoveToReplace ? "opacity-45 cursor-not-allowed" : ""}`}
                              >
                                <span>Learn Habilidade</span>
                              </button>
                            </div>
                          ) : (
                            <div className="bg-[#12141c]/30 border border-dashed border-white/5 rounded-xl p-12 text-center h-full flex flex-col justify-center items-center gap-2 select-none">
                              <span className="text-xl">👉</span>
                              <span className="font-mono text-[9px] text-[#2ebd85] font-black uppercase tracking-widest">Aparência de Movimento</span>
                              <p className="text-[10px] text-neutral-500 leading-normal font-semibold max-w-[180px]">Selecione uma habilidade compatível à esquerda para carregar seus modificadores DND e alocação de slot.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Learned moves indicator lists */}
                    {levelUpLearnedMovesThisSession.length > 0 && (
                      <div className="bg-[#12141c]/50 border border-emerald-500/10 p-3.5 rounded-xl space-y-1.5">
                        <span className="text-[8px] uppercase font-bold text-neutral-400 font-mono tracking-wider block">Movimentos adicionados nesta sessão:</span>
                        <div className="flex gap-2 flex-wrap">
                          {levelUpLearnedMovesThisSession.map((learned, idx) => (
                            <div key={idx} className="bg-emerald-950/20 border border-emerald-500/20 p-1 px-2.5 rounded-lg text-[9px] font-sans font-bold text-emerald-300 flex items-center gap-1.5 animate-fade-in select-none">
                              <span>⚔️</span>
                              <span>{learned.move.name} ({learned.slot.replace("move", "Slot ")})</span>
                              {learned.prevName !== "Vazio" && (
                                <span className="text-[8px] font-mono text-neutral-500 line-through">esquecendo {learned.prevName}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* STEP 4: RECAP */}
                {levelUpCurrentStep === "recap" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="bg-indigo-950/20 p-4 border border-indigo-500/20 rounded-xl flex items-center gap-4 select-none">
                      <div className="text-2xl animate-bounce">⚔️</div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-indigo-400 font-mono tracking-wider">
                          Recapitulação de Mudanças & Confirmação
                        </h4>
                        <p className="text-[10px] text-neutral-450 font-medium font-sans mt-0.5">
                          Pronto! Todas as decisões foram registradas. Revise as melhorias antes de aplicar definitivamente na ficha.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Atributos Modos recap */}
                      <div className="bg-[#12141c] border border-white/5 p-4 rounded-xl space-y-3">
                        <span className="text-[8.5px] uppercase font-bold text-[#f59e0b] tracking-wider font-mono block select-none">📊 Novas Estatísticas Principais:</span>
                        <div className="space-y-1.5">
                          {Object.keys(formPokemonAttrs).map((attr) => {
                            const key = attr as "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
                            const baseVal = formPokemonAttrs[key] || 10;
                            const added = levelUpAsiAllocated[key] || 0;
                            const totalVal = baseVal + added;
                            const didChange = added > 0;
                            return (
                              <div key={key} className="flex justify-between items-center text-xs font-mono select-none">
                                <span className="text-neutral-500 font-bold">{key}</span>
                                <div className="flex gap-2 items-center font-bold">
                                  <span className="text-neutral-400">{baseVal}</span>
                                  {didChange && (
                                    <>
                                      <span className="text-neutral-500">➔</span>
                                      <span className="text-amber-400">+{added}</span>
                                      <span className="text-neutral-500">➔</span>
                                      <span className="text-white font-extrabold">{totalVal}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Outras melhorias recapitulação */}
                      <div className="bg-[#12141c] border border-white/5 p-4 rounded-xl space-y-4">
                        {/* Selected Feats */}
                        <div>
                          <span className="text-[8.5px] uppercase font-bold text-sky-400 tracking-wider font-mono block select-none">🧬 Talentos / Feats de Evolução:</span>
                          {levelUpSelectedFeats.length === 0 ? (
                            <p className="text-[10px] text-neutral-500 italic mt-1 font-semibold select-none">Nenhum talento selecionado (pontos gastos em atributos).</p>
                          ) : (
                            <div className="space-y-1.5 mt-2">
                              {levelUpSelectedFeats.map(f => (
                                <div key={f.id} className="bg-sky-500/5 border border-sky-500/10 p-2 rounded text-[10px] font-sans font-bold text-sky-300">
                                  {f.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Staged logs of moves learned */}
                        <div>
                          <span className="text-[8.5px] uppercase font-bold text-emerald-400 tracking-wider font-mono block select-none">⚔️ Movimentos Aprendidos / Reajustados:</span>
                          {levelUpHistoryLog.length === 0 ? (
                            <p className="text-[10px] text-neutral-500 italic mt-1 font-semibold select-none">Nenhum movimento alterado nesta sessão (danos escalados automaticamente).</p>
                          ) : (
                            <div className="space-y-1.5 mt-2">
                              {levelUpHistoryLog.map((log, lIdx) => (
                                <p key={lIdx} className="text-[9px] text-neutral-400 flex items-center gap-1.5 font-sans font-semibold">
                                  <span className="text-emerald-500">•</span> {log}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Footer (Actions navigation) */}
              <div className="bg-[#10121a] px-6 py-4 border-t border-white/10 flex justify-between select-none shrink-0">
                {/* BOTÃO VOLTAR */}
                <button
                  type="button"
                  disabled={levelUpCurrentStep === "intro"}
                  onClick={() => {
                    if (levelUpCurrentStep === "recap") {
                      if (levelUpCompatibleMoves.length > 0) setLevelUpCurrentStep("move");
                      else if (levelUpAsiPointsAvailable > 0) setLevelUpCurrentStep("asi");
                      else setLevelUpCurrentStep("intro");
                    } else if (levelUpCurrentStep === "move") {
                      if (levelUpAsiPointsAvailable > 0) setLevelUpCurrentStep("asi");
                      else setLevelUpCurrentStep("intro");
                    } else if (levelUpCurrentStep === "asi") {
                      setLevelUpCurrentStep("intro");
                    }
                  }}
                  className={`px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-mono text-[9px] uppercase font-black rounded-lg transition-all cursor-pointer ${levelUpCurrentStep === "intro" ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  Voltar
                </button>

                {/* BOTÃO PROSSEGUIR OU APLICAR */}
                {levelUpCurrentStep !== "recap" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (levelUpCurrentStep === "intro") {
                        if (levelUpAsiPointsAvailable > 0) {
                          setLevelUpCurrentStep("asi");
                        } else if (levelUpCompatibleMoves.length > 0) {
                          setLevelUpCurrentStep("move");
                        } else {
                          setLevelUpCurrentStep("recap");
                        }
                      } else if (levelUpCurrentStep === "asi") {
                        // Validate point spends before proceeding
                        const allocatedSum = (levelUpAsiAllocated.FOR || 0) +
                                             (levelUpAsiAllocated.DES || 0) +
                                             (levelUpAsiAllocated.CON || 0) +
                                             (levelUpAsiAllocated.INT || 0) +
                                             (levelUpAsiAllocated.SAB || 0) +
                                             (levelUpAsiAllocated.CAR || 0);
                        if (!levelUpIsFeatMode && allocatedSum < levelUpAsiPointsAvailable) {
                          if (!confirm(`Você ainda possui ${levelUpAsiPointsAvailable - allocatedSum} pontos não alocados! Deseja mesmo prosseguir sem gastá-los?`)) {
                            return;
                          }
                        }
                        if (levelUpIsFeatMode && levelUpSelectedFeats.length === 0) {
                          if (!confirm("Você selecionou o modo de Talentos, mas não escolheu nenhum talento do menu! Deseja prosseguir?")) {
                            return;
                          }
                        }

                        if (levelUpCompatibleMoves.length > 0) {
                          setLevelUpCurrentStep("move");
                        } else {
                          setLevelUpCurrentStep("recap");
                        }
                      } else if (levelUpCurrentStep === "move") {
                        setLevelUpCurrentStep("recap");
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-mono text-[9px] uppercase font-black rounded-lg shadow-md transition-all hover:opacity-90 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Avançar</span>
                    <span>➔</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Apply level up reward changes!
                      const finalAttrs = {
                        FOR: (formPokemonAttrs.FOR || 10) + levelUpAsiAllocated.FOR,
                        DES: (formPokemonAttrs.DES || 10) + levelUpAsiAllocated.DES,
                        CON: (formPokemonAttrs.CON || 10) + levelUpAsiAllocated.CON,
                        INT: (formPokemonAttrs.INT || 10) + levelUpAsiAllocated.INT,
                        SAB: (formPokemonAttrs.SAB || 10) + levelUpAsiAllocated.SAB,
                        CAR: (formPokemonAttrs.CAR || 10) + levelUpAsiAllocated.CAR,
                      };

                      const finalTalentos = [...(formPokemonTalentos || [])];
                      levelUpSelectedFeats.forEach(f => {
                        if (!finalTalentos.some(t => t.id === f.id)) {
                          finalTalentos.push({
                            id: f.id,
                            name: f.name,
                            description: f.description
                          });
                        }
                      });

                      // Apply updates states of moves
                      if (levelUpMove1) setFormPokemonMoveObj1(levelUpMove1);
                      if (levelUpMove2) setFormPokemonMoveObj2(levelUpMove2);
                      if (levelUpMove3) setFormPokemonMoveObj3(levelUpMove3);
                      if (levelUpMove4) setFormPokemonMoveObj4(levelUpMove4);

                      // Update local hooks
                      setFormPokemonAttrs(finalAttrs);
                      setFormPokemonLevel(levelUpNewLevel);
                      setFormPokemonTalentos(finalTalentos);

                      // Final db writeproperties block
                      const finalProperties: Record<string, any> = {
                        level: levelUpNewLevel,
                        attributes: finalAttrs,
                        talentos: finalTalentos,
                        move1: levelUpMove1 || formPokemonMoveObj1,
                        move2: levelUpMove2 || formPokemonMoveObj2,
                        move3: levelUpMove3 || formPokemonMoveObj3,
                        move4: levelUpMove4 || formPokemonMoveObj4
                      };

                      updateEditingPokemonProperties(finalProperties);
                      setNotification(`🎉 Recompensas ecológicas de Nível ${levelUpNewLevel} aplicadas para ${formPokemonName}!`);
                      setIsLevelUpModalOpen(false);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white hover:text-white font-mono text-[9px] uppercase font-black rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-1.5 cursor-pointer animate-pulse"
                  >
                    <span>✓</span>
                    <span>Salvar e Aplicar</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* RADIAL MENU: POKÉBOLA WORKSPACE (CONJURAÇÃO & CONTROLE) */}
        <AnimatePresence>
          {activePokeballTrainerId && (() => {
            const trainer = allAvailableTrainerRecords.find(t => t.id === activePokeballTrainerId);
            if (!trainer) return null;
            
            const substitutingToken = tokens.find(tok => tok.id === substitutingTokenId);
            const team = (trainer.pokemon || [])
              .filter(pk => !pk.isPc)
              .filter(pk => !substitutingToken || pk.id !== substitutingToken.pokemonId);

            // Math conversions for Pizza-like Radial sectors
            const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
              const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
              return {
                x: centerX + radius * Math.cos(angleInRadians),
                y: centerY + radius * Math.sin(angleInRadians)
              };
            };

            const getDonutSlicePath = (
              x: number,
              y: number,
              innerRadius: number,
              outerRadius: number,
              startAngle: number,
              endAngle: number
            ) => {
              const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
              const endOuter = polarToCartesian(x, y, outerRadius, endAngle);
              const startInner = polarToCartesian(x, y, innerRadius, startAngle);
              const endInner = polarToCartesian(x, y, innerRadius, endAngle);

              const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

              return [
                `M ${startOuter.x} ${startOuter.y}`,
                `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
                `L ${endInner.x} ${endInner.y}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
                "Z"
              ].join(" ");
            };

            return (
              <motion.div
                ref={backdropRef}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setActivePokeballTrainerId(null);
                    setIsPokeballSettingsOpen(false);
                    setSelectedPokeballPokemon(null);
                    setSelectedPokeballTrainerId(null);
                    setSubstitutingTokenId(null);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 overflow-hidden select-none outline-none"
                onClick={() => {
                  setActivePokeballTrainerId(null);
                  setIsPokeballSettingsOpen(false);
                  setSubstitutingTokenId(null);
                }}
              >
                {/* Visual context info top left */}
                <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-3 select-none pointer-events-none z-45">
                  <div className="w-10 h-10 rounded-full border-2 border-red-500 relative overflow-hidden flex flex-col shrink-0 animate-spin" style={{ animationDuration: '6s' }}>
                    <div className="flex-1 bg-red-500" />
                    <div className="h-[2px] bg-neutral-950 absolute top-[18px] left-0 right-0 z-10" />
                    <div className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-950 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
                    <div className="flex-1 bg-white" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                      Pokébola de {trainer.name}
                    </h2>
                    <p className="text-[9px] text-neutral-400 font-mono uppercase tracking-widest">Menu Radial de Conjuração Direta</p>
                  </div>
                </div>

                {/* Header Action Row (Perspective switches + Gear Settings) */}
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2.5 z-50">
                  <div className="flex items-center bg-neutral-900/90 border border-white/10 rounded-full p-1 shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPokeballViewMode("owner");
                      }}
                      className={`px-4 py-1.5 text-[9px] uppercase tracking-wider font-black rounded-full transition-all duration-200 cursor-pointer ${
                        pokeballViewMode === "owner" 
                          ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Treinador
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPokeballViewMode("public");
                      }}
                      className={`px-4 py-1.5 text-[9px] uppercase tracking-wider font-black rounded-full transition-all duration-200 cursor-pointer ${
                        pokeballViewMode === "public" 
                          ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Outros
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPokeballSettingsOpen(!isPokeballSettingsOpen);
                    }}
                    className={`p-2.5 rounded-full border bg-neutral-900/90 transition-all duration-250 shadow-lg cursor-pointer ${
                      isPokeballSettingsOpen 
                        ? "border-cyan-500/50 text-cyan-400 bg-cyan-950/20" 
                        : "border-white/10 text-neutral-400 hover:text-white hover:border-white/25"
                    }`}
                    title="Ajustes de Aparência da Pokébola"
                  >
                    <Settings 
                      className={`w-4 h-4 ${isPokeballSettingsOpen ? 'animate-spin' : ''}`} 
                      style={{ animationDuration: isPokeballSettingsOpen ? '10s' : undefined }} 
                    />
                  </button>
                </div>

                {/* Main Wheel Area with dynamic container query scaling to fit perfectly on any screens */}
                <motion.div
                  initial={{ scale: 0.2 * radialScale, rotate: -45, opacity: 0 }}
                  animate={{ scale: radialScale, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.2 * radialScale, rotate: 45, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 120, damping: 15 }}
                  style={{
                    transformOrigin: "center center",
                  }}
                  className="relative w-[520px] h-[520px] flex items-center justify-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Outer Tech Circle Details */}
                  <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none scale-105 select-none" />
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/5 pointer-events-none scale-110 select-none opacity-20" style={{ animation: 'spin 20s linear infinite' }} />

                  {/* SVG Wheel segments mapping */}
                  <svg 
                    width="520" 
                    height="520" 
                    viewBox="0 0 520 520" 
                    className="absolute inset-0 pointer-events-auto select-none"
                  >
                    {/* Inner glowing filter */}
                    <defs>
                      <filter id="glow-radial-custom" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-radial-green" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {Array.from({ length: 6 }).map((_, index) => {
                      const midAngle = index * 60 - 90;
                      // Pizza segment with calculated gap (width 54deg instead of 60deg for sweet look)
                      const pathData = getDonutSlicePath(260, 260, 85, 235, midAngle - 27, midAngle + 27);
                      const isHovered = hoveredRadialSlice === index;
                      const pk = team[index];
                      const isPlaced = pk ? tokens.find(t => t.trainerId === trainer.id && t.pokemonId === pk.id) : null;

                      // Slices colors: dynamic colors based on status (representing a solid wheel piece)
                      let fillValue = "rgba(10, 12, 18, 0.93)";
                      let strokeValue = "rgba(255, 255, 255, 0.08)";
                      let filterStr = undefined;

                      if (isHovered) {
                        if (pk) {
                          if (isPlaced) {
                            fillValue = "rgba(16, 185, 129, 0.22)";
                            strokeValue = "rgba(16, 185, 129, 0.85)";
                            filterStr = "url(#glow-radial-green)";
                          } else {
                            fillValue = `${pokeballColor1}22`;
                            strokeValue = `${pokeballColor1}dd`;
                            filterStr = "url(#glow-radial-custom)";
                          }
                        } else {
                          fillValue = "rgba(99, 102, 241, 0.22)";
                          strokeValue = "rgba(99, 102, 241, 0.75)";
                        }
                      } else {
                        if (pk) {
                          if (isPlaced) {
                            fillValue = "rgba(16, 185, 129, 0.08)";
                            strokeValue = "rgba(16, 185, 129, 0.35)";
                          } else {
                            fillValue = `${pokeballColor1}0e`;
                            strokeValue = `${pokeballColor1}45`;
                          }
                        } else {
                          fillValue = "rgba(10, 12, 18, 0.85)";
                          strokeValue = "rgba(255, 255, 255, 0.06)";
                        }
                      }

                      return (
                        <path
                          key={index}
                          d={pathData}
                          fill={fillValue}
                          stroke={strokeValue}
                          strokeWidth={isHovered ? "2.5" : "1.5"}
                          filter={filterStr}
                          className="transition-all duration-300 cursor-pointer ease-out"
                          onMouseEnter={() => setHoveredRadialSlice(index)}
                          onMouseLeave={() => setHoveredRadialSlice(null)}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => {
                            e.stopPropagation();
                            if (pk) {
                              handleFilledPokeballSliceClick(pk, trainer);
                            } else {
                              handleEmptyPokeballSliceClick(trainer);
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pk) {
                              handleFilledPokeballSliceClick(pk, trainer);
                            } else {
                              handleEmptyPokeballSliceClick(trainer);
                            }
                          }}
                        />
                      );
                    })}
                  </svg>

                  {/* HTML Content Overlay: Absolute items centered over respective slices */}
                  {Array.from({ length: 6 }).map((_, index) => {
                    const midAngle = index * 60 - 90;
                    const textRadius = 160; // Orbit offset range to clear center
                    const radialRad = (midAngle * Math.PI) / 180;
                    const posX = 260 + textRadius * Math.cos(radialRad);
                    const posY = 260 + textRadius * Math.sin(radialRad);

                    const pk = team[index];
                    const isHovered = hoveredRadialSlice === index;
                    const isPlaced = pk ? tokens.find(t => t.trainerId === trainer.id && t.pokemonId === pk.id) : null;
                    const isMaskedForView = pk && pokeballViewMode === "public" && !pk.revealed;

                    return (
                      <div
                        key={index}
                        className="absolute leading-none z-10 pointer-events-none"
                        style={{
                          left: `${posX}px`,
                          top: `${posY}px`,
                          transform: "translate(-50%, -50%) scale(1)",
                        }}
                      >
                        <motion.div
                          animate={{
                            scale: isHovered ? 1.08 : 1.0,
                            y: isHovered ? (posY < 260 ? -5 : 5) : 0,
                            x: isHovered ? (posX < 260 ? -5 : 5) : 0,
                          }}
                          transition={{ type: "spring", stiffness: 350, damping: 18 }}
                          className="pointer-events-auto cursor-pointer"
                        >
                          {pk ? (
                            // Existing Pokémon inside the active slot (direct visual draw with no wrapper cards or borders)
                            <div 
                              className="w-[145px] flex flex-col items-center justify-center text-center select-none relative"
                              onMouseEnter={() => setHoveredRadialSlice(index)}
                              onMouseLeave={() => setHoveredRadialSlice(null)}
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => {
                                e.stopPropagation();
                                handleFilledPokeballSliceClick(pk, trainer);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFilledPokeballSliceClick(pk, trainer);
                              }}
                            >
                              {/* Central Glow Effect & Sprite */}
                              <div className="w-12 h-12 flex items-center justify-center relative shrink-0">
                                <div className={`absolute inset-0 rounded-full blur-[10px] transition-all duration-300 ${
                                  isPlaced 
                                    ? "bg-emerald-500/25 scale-110" 
                                    : isHovered 
                                      ? "bg-red-500/15 scale-110"
                                      : "bg-transparent scale-100"
                                }`} />
                                <img 
                                  src={pk.image || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png"} 
                                  alt="" 
                                  className={`w-11 h-11 object-contain transition-all duration-300 relative z-10 ${
                                    isMaskedForView ? "brightness-0 opacity-35 blur-[0.5px]" : "hover:scale-110"
                                  }`}
                                  referrerPolicy="no-referrer"
                                />
                                {isMaskedForView && (
                                  <span className="absolute inset-0 flex items-center justify-center font-bold text-neutral-500 text-xs font-mono z-20">?</span>
                                )}
                              </div>

                              {/* Placed Glow Badge Pin */}
                              {isPlaced && !isMaskedForView && (
                                <div className="absolute top-0 right-10 flex items-center justify-center">
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                </div>
                              )}

                              {/* Name, Level, and Stats drawn directly into the sector */}
                              <div className="mt-1 flex flex-col items-center font-bold">
                                <span className={`text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider leading-tight transition-colors duration-250 ${isHovered ? 'text-red-300' : ''}`}>
                                  {isMaskedForView ? "???" : pk.name}
                                </span>
                                <span className="text-[8.5px] text-neutral-400 font-mono mt-0.5 leading-none">
                                  {isMaskedForView ? "Nv. ??" : `Nv. ${pk.level || 1}`}
                                </span>
                                {!isMaskedForView && pk.loyalty !== undefined && pk.loyalty !== 0 && (
                                  <div className="text-[7.5px] mt-1 select-none flex items-center justify-center gap-0.5" title={`Lealdade: ${pk.loyalty >= 0 ? `+${pk.loyalty}` : pk.loyalty}`}>
                                    {pk.loyalty === -3 && <span className="text-red-500 font-mono font-bold">💔💔💔</span>}
                                    {pk.loyalty === -2 && <span className="text-red-400 font-mono font-bold">💔💔</span>}
                                    {pk.loyalty === -1 && <span className="text-orange-400 font-mono font-bold">💔</span>}
                                    {pk.loyalty === 1 && <span className="text-emerald-300 font-mono font-bold">❤️</span>}
                                    {pk.loyalty === 2 && <span className="text-emerald-400 font-mono font-bold">❤️❤️</span>}
                                    {pk.loyalty === 3 && <span className="text-[#10b981] font-mono font-bold filter drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]">❤️❤️❤️</span>}
                                  </div>
                                )}
                              </div>

                              {/* Direct Integrated Minimal HP Bar */}
                              {!isMaskedForView && (
                                <div className="mt-1.5 w-[76px] space-y-0.5">
                                  <div className="flex justify-between items-center text-[7px] font-mono text-neutral-400 leading-none">
                                    <span>HP</span>
                                    <span>{pk.hpCurrent !== undefined ? pk.hpCurrent : (pk.hpMax || 100)}/{pk.hpMax || 100}</span>
                                  </div>
                                  <div className="w-full bg-neutral-950/80 rounded-full h-[3px] overflow-hidden border border-white/5">
                                    <div 
                                      className={`h-full opacity-90 transition-all duration-500 ${
                                        Math.round(((pk.hpCurrent !== undefined ? pk.hpCurrent : (pk.hpMax || 100)) / (pk.hpMax || 100)) * 100) < 35 
                                          ? "bg-red-500 animate-pulse" 
                                          : "bg-emerald-500"
                                      }`} 
                                      style={{ width: `${Math.min(100, Math.round(((pk.hpCurrent !== undefined ? pk.hpCurrent : (pk.hpMax || 100)) / (pk.hpMax || 100)) * 100))}%` }} 
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Placed vs Direct Quick Recall integrated overlay */}
                              {isPlaced ? (
                                <button
                                  type="button"
                                  onClick={(subE) => {
                                    subE.stopPropagation(); // Avoid triggering positioning state
                                    const tokenPixelSize = (activeMap?.gridSize || 50) * isPlaced.size;
                                    const effectCenterX = isPlaced.x + tokenPixelSize / 2;
                                    const effectCenterY = isPlaced.y + tokenPixelSize / 2;
                                    triggerVttEffect(effectCenterX, effectCenterY, 'recall', pk.image, isPlaced.size);
                                    
                                    setTokens(prev => prev.filter(tok => tok.id !== isPlaced.id));
                                    setNotification(`${pk.name} recolhido de volta para a Pokébola!`);
                                  }}
                                  className="mt-1.5 px-2 py-0.5 bg-red-600/95 hover:bg-red-500 border border-red-500/20 text-white rounded text-[7px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Recolher Pokémon de volta para a Pokébola"
                                >
                                  <RotateCcw className="w-2 h-2" />
                                  <span>Recolher</span>
                                </button>
                              ) : (
                                <div className="mt-1.5 text-[7px] font-black uppercase tracking-wider text-rose-300/50 font-sans tracking-wide">
                                  Disponível
                                </div>
                              )}
                            </div>
                          ) : (
                            // Clean Empty Segment placeholder - strictly NO cards, NO containers, NO wrapping panels
                            <div 
                              className="w-[120px] h-[75px] flex flex-col items-center justify-center text-center select-none"
                              onMouseEnter={() => setHoveredRadialSlice(index)}
                              onMouseLeave={() => setHoveredRadialSlice(null)}
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => {
                                e.stopPropagation();
                                handleEmptyPokeballSliceClick(trainer);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmptyPokeballSliceClick(trainer);
                              }}
                            >
                              <Plus className={`w-5 h-5 mb-1 transition-all duration-300 ${isHovered ? 'scale-125 text-indigo-400' : 'text-neutral-500'}`} />
                              <span className={`text-[8.5px] font-bold uppercase tracking-wider transition-all duration-300 leading-tight ${isHovered ? 'text-indigo-300' : 'text-neutral-500'}`}>
                                Adicionar Pokémon
                              </span>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}

                  {/* Absolute Center Pokéball Core Wrapper (Guarantees Mathematically Perfect Alignment Across All Viewports) */}
                  <div className="absolute z-20 w-32 h-32 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                    <div 
                      className="w-full h-full rounded-full border-[6px] border-neutral-950 overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group bg-neutral-900"
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        setActivePokeballTrainerId(null);
                        setIsPokeballSettingsOpen(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePokeballTrainerId(null);
                        setIsPokeballSettingsOpen(false);
                      }}
                      title="Fechar Menu Radial"
                      style={{
                        boxShadow: `0 0 32px ${pokeballColor1}60`
                      }}
                    >
                      {/* Top half (Customizable Color 1) */}
                      <div 
                        className="flex-1 transition-all duration-300" 
                        style={{
                          background: `linear-gradient(to bottom, ${pokeballColor1}, ${adjustColorBrightness(pokeballColor1, -25)})`
                        }}
                      />
                      
                      {/* Middle joint bar */}
                      <div className="h-2.5 bg-neutral-950 absolute top-[53px] left-0 right-0 z-10" />

                      {/* Central glowing core button */}
                      <div className="w-11 h-11 rounded-full bg-white border-[4px] border-neutral-950 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] group-hover:border-cyan-400">
                        <div className="w-4 h-4 rounded-full bg-cyan-400 group-hover:bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                      </div>

                      {/* Bottom half (Customizable Color 2) */}
                      <div 
                        className="flex-1 transition-all duration-300"
                        style={{
                          background: `linear-gradient(to bottom, ${adjustColorBrightness(pokeballColor2, 10)}, ${pokeballColor2})`
                        }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Pokeball Appearance Settings Panel */}
                <AnimatePresence>
                  {isPokeballSettingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ type: "spring", damping: 20, stiffness: 180 }}
                      className="absolute z-50 left-4 right-4 bottom-22 md:left-auto md:bottom-auto md:right-6 md:top-20 w-auto md:w-[280px] bg-neutral-900/98 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 text-white pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Panel Title */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                          <Settings className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase font-black tracking-widest font-mono">Customizar Aparência</span>
                        </div>
                        <button 
                          onClick={() => setIsPokeballSettingsOpen(false)}
                          className="p-1 rounded hover:bg-white/5 text-neutral-400 hover:text-white transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Top Color Selection */}
                      <div className="space-y-1">
                        <span className="text-[8.5px] uppercase tracking-wider text-neutral-400 font-extrabold flex justify-between font-mono">
                          <span>Cor Superior (Metade 1)</span>
                          <span className="text-neutral-500">{pokeballColor1}</span>
                        </span>
                        <div className="flex items-center gap-2 bg-black/40 p-2 border border-white/5 rounded-xl">
                          <input 
                            type="color" 
                            value={pokeballColor1} 
                            onChange={(e) => changePokeballColor1(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 outline-none overflow-hidden shrink-0"
                          />
                          <div className="flex-1 grid grid-cols-5 gap-1">
                            {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7"].map((c) => (
                              <button
                                key={c}
                                onClick={() => changePokeballColor1(c)}
                                className={`w-full aspect-square rounded-md border transition-all cursor-pointer ${
                                  pokeballColor1 === c ? 'border-cyan-400 scale-110 shadow' : 'border-white/5'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Color Selection */}
                      <div className="space-y-1">
                        <span className="text-[8.5px] uppercase tracking-wider text-neutral-400 font-extrabold flex justify-between font-mono font-bold">
                          <span>Cor Inferior (Metade 2)</span>
                          <span className="text-neutral-500">{pokeballColor2}</span>
                        </span>
                        <div className="flex items-center gap-2 bg-black/40 p-2 border border-white/5 rounded-xl">
                          <input 
                            type="color" 
                            value={pokeballColor2} 
                            onChange={(e) => changePokeballColor2(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 outline-none overflow-hidden shrink-0"
                          />
                          <div className="flex-1 grid grid-cols-5 gap-1">
                            {["#ffffff", "#e2e8f0", "#adb5bd", "#495057", "#1e1b4b"].map((c) => (
                              <button
                                key={c}
                                onClick={() => changePokeballColor2(c)}
                                className={`w-full aspect-square rounded-md border transition-all cursor-pointer ${
                                  pokeballColor2 === c ? 'border-cyan-400 scale-110 shadow' : 'border-white/5'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Presets Grid */}
                      <div className="space-y-2 border-t border-white/5 pt-3">
                        <span className="text-[8px] uppercase tracking-widest text-[#fbbf24] font-black block font-mono">Modelos de Fábrica</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { name: "Padrão", c1: "#ef4444", c2: "#ffffff" },
                            { name: "Super", c1: "#3b82f6", c2: "#ffffff" },
                            { name: "Ultra", c1: "#1e1b4b", c2: "#f59e0b" },
                            { name: "Master", c1: "#a855f7", c2: "#ffffff" },
                            { name: "Safari", c1: "#166534", c2: "#ca8a04" },
                            { name: "Premier", c1: "#fafafa", c2: "#f3f4f6" },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => {
                                changePokeballColor1(preset.c1);
                                changePokeballColor2(preset.c2);
                              }}
                              className="text-[8px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                            >
                              <div className="w-5 h-5 rounded-full border border-neutral-950 flex flex-col overflow-hidden shadow">
                                <div className="flex-1" style={{ backgroundColor: preset.c1 }} />
                                <div className="h-[1px] bg-neutral-950" />
                                <div className="flex-1" style={{ backgroundColor: preset.c2 }} />
                              </div>
                              <span className="truncate w-full text-center text-neutral-400 font-mono text-[7px]">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Restore default button */}
                      <button
                        onClick={() => {
                          changePokeballColor1("#ef4444");
                          changePokeballColor2("#ffffff");
                        }}
                        className="text-[8px] font-mono uppercase tracking-widest text-neutral-400 hover:text-cyan-400 transition-all text-center py-1 mt-0.5 font-black cursor-pointer"
                      >
                        Restaurar Configurações Originais
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hotkey close reminder at the bottom */}
                <div className="absolute bottom-6 font-mono text-[9px] md:text-[10px] text-neutral-400 uppercase tracking-widest pointer-events-none select-none flex items-center gap-2 bg-neutral-900/80 py-1.5 px-3.5 rounded-full border border-white/5 shadow-md z-45">
                  <span>Pressione <kbd className="bg-neutral-800 border border-white/10 px-1.5 py-0.5 rounded text-white text-[9px] font-sans">ESC</kbd> ou clique no centro para sair</span>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        
{/* MODAL: CRIAR PASTA */}
        <AnimatePresence>
          {isCreateFolderModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000000]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsCreateFolderModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0e1014]/98 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Folder className="w-5 h-5" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">Nova Pasta de Treinadores</h3>
                  </div>
                  <button onClick={() => setIsCreateFolderModalOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400">Nome da Pasta</label>
                    <input
                      type="text"
                      placeholder="ex: NPCs Importantes, Ginásio 1"
                      value={formFolderName}
                      onChange={(e) => setFormFolderName(e.target.value)}
                      className="w-full bg-[#16181f]/80 text-xs text-white rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-indigo-500/50 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400">Pasta Mãe (Ninhada)</label>
                    <select
                      value={formFolderParentId}
                      onChange={(e) => setFormFolderParentId(e.target.value)}
                      className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="">Nenhuma / Pasta Raiz</option>
                      {trainerFolders.map((f) => (
                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Folder icon preset colors */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400 block">Cor Especial</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { color: "#f59e0b", label: "Gold" },
                        { color: "#ef4444", label: "Red" },
                        { color: "#10b981", label: "Emerald" },
                        { color: "#3b82f6", label: "Sky" },
                        { color: "#a855f7", label: "Grape" },
                        { color: "#ec4899", label: "Poka" },
                        { color: "#ffffff", label: "Slate" },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setFormFolderColor(preset.color)}
                          className={`w-6 h-6 rounded-full border border-white/10 transition-transform ${
                            formFolderColor === preset.color ? "ring-2 ring-indigo-550 scale-110" : "opacity-70 hover:scale-105"
                          }`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formFolderName.trim()) {
                        setNotification("Por favor, digite um nome!");
                        return;
                      }
                      createTrainerFolder(formFolderName, formFolderParentId, formFolderColor);
                      setIsCreateFolderModalOpen(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white transition-all active:scale-95"
                  >
                    Criar Pasta
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: EDITAR PASTA */}
        <AnimatePresence>
          {isEditFolderModalOpen && activeTrainerFolder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000000]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsEditFolderModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0e1014]/98 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <FolderOpen className="w-5 h-5" />
                    <h3 className="text-sm font-bold tracking-wide uppercase">Configurações de Pasta</h3>
                  </div>
                  <button onClick={() => setIsEditFolderModalOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400">Nome da Pasta</label>
                    <input
                      type="text"
                      value={formFolderName}
                      onChange={(e) => setFormFolderName(e.target.value)}
                      className="w-full bg-[#16181f]/80 text-xs text-white rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-indigo-500/50 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400">Pasta Mãe (Nivel)</label>
                    <select
                      value={formFolderParentId}
                      onChange={(e) => setFormFolderParentId(e.target.value)}
                      className="w-full bg-[#16181f]/85 text-xs text-white rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="">Pasta Raiz (Lista Principal)</option>
                      {trainerFolders
                        .filter(f => f.id !== activeTrainerFolder.id && !isFolderDescendantOf(f.id, activeTrainerFolder.id))
                        .map((f) => (
                          <option key={f.id} value={f.id}>📁 {f.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Preset colors selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-neutral-400 block">Trocar Cor</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { color: "#f59e0b", label: "Gold" },
                        { color: "#ef4444", label: "Red" },
                        { color: "#10b981", label: "Emerald" },
                        { color: "#3b82f6", label: "Sky" },
                        { color: "#a855f7", label: "Grape" },
                        { color: "#ec4899", label: "Poka" },
                        { color: "#ffffff", label: "Slate" },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setFormFolderColor(preset.color)}
                          className={`w-6 h-6 rounded-full border border-white/10 transition-transform ${
                            formFolderColor === preset.color ? "ring-2 ring-indigo-550 scale-110" : "opacity-70 hover:scale-105"
                          }`}
                          style={{ backgroundColor: preset.color }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditFolderModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formFolderName.trim()) {
                        setNotification("Por favor, digite um nome!");
                        return;
                      }
                      updateTrainerFolder(activeTrainerFolder.id, formFolderName, formFolderParentId, formFolderColor);
                      setIsEditFolderModalOpen(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white transition-all active:scale-95"
                  >
                    Salvar Pasta
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAY: MENU DE CONTEXTO RÁPIDO DO TREINADOR */}
        <AnimatePresence>
          {trainerContextMenu && (
            <div 
              className="fixed inset-0 z-50 pointer-events-auto"
              onClick={() => setTrainerContextMenu(null)}
              onContextMenu={(e) => { e.preventDefault(); setTrainerContextMenu(null); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.1 }}
                className="absolute bg-[#111218]/95 border border-white/10 rounded-xl shadow-2xl p-1.5 w-44 text-white text-xs space-y-0.5 z-55 backdrop-blur-md"
                style={{ top: trainerContextMenu.y, left: trainerContextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* RECORD OPTIONS */}
                {trainerContextMenu.recordId && (() => {
                  const rec = trainerRecords.find(r => r.id === trainerContextMenu.recordId);
                  if (!rec) return null;
                  return (
                    <>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          setActiveTrainerRecord(rec);
                          setIsViewTrainerModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-indigo-600/60 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Abrir Informações</span>
                      </button>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          addCampaignToken(rec.name, rec.image, 1.5, "#6366f1", rec.hpMax || 80, rec.id);
                          setNotification(`"${rec.name}" evocado no mapa como Token!`);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-indigo-600/60 transition-colors flex items-center gap-2 text-indigo-300 font-bold hover:text-white cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Conjurar Token</span>
                      </button>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          setActiveTrainerRecord(rec);
                          setFormTrainerName(rec.name);
                          setFormTrainerImage(rec.image);
                          setFormTrainerFolderId(rec.folderId || "");
                          setIsEditTrainerModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Ficha</span>
                      </button>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          duplicateTrainerRecord(rec);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicar Ficha</span>
                      </button>
                      <hr className="border-white/5 my-1" />
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          if (true) {
                            deleteTrainerRecord(rec.id);
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-red-650/80 hover:text-white transition-colors flex items-center gap-2 text-red-400 cursor-pointer"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        <span>Excluir Ficha</span>
                      </button>
                    </>
                  );
                })()}

                {/* FOLDER OPTIONS */}
                {trainerContextMenu.folderId && (() => {
                  const fold = trainerFolders.find(f => f.id === trainerContextMenu.folderId);
                  if (!fold) return null;
                  return (
                    <>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          setExpandedTrainerFolderIds((prev) => ({
                            ...prev,
                            [fold.id]: !prev[fold.id],
                          }));
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 font-bold cursor-pointer"
                      >
                        {expandedTrainerFolderIds[fold.id] ? <ChevronDown className="w-3.5 h-3.5 text-neutral-450" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-450" />}
                        <span>Alternar Expansão</span>
                      </button>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          setActiveTrainerFolder(fold);
                          setFormFolderName(fold.name);
                          setFormFolderParentId(fold.parentId || "");
                          setFormFolderColor(fold.color || "#fbbf24");
                          setIsEditFolderModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Configurar Pasta</span>
                      </button>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          // Clear values for new create subfolder
                          setFormFolderName("");
                          setFormFolderParentId(fold.id);
                          setFormFolderColor("#fbbf24");
                          setIsCreateFolderModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 text-yellow-500" />
                        <span>Subpasta Aqui</span>
                      </button>
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          // Clear values and focus folder
                          setFormTrainerName("");
                          setFormTrainerImage("");
                          setFormTrainerFolderId(fold.id);
                          setIsCreateTrainerModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer text-indigo-300"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Treinador Aqui</span>
                      </button>
                      <hr className="border-white/5 my-1" />
                      <button
                        onClick={() => {
                          setTrainerContextMenu(null);
                          if (true) {
                            deleteTrainerFolder(fold.id);
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-red-650/80 hover:text-white transition-colors flex items-center gap-2 text-red-400 cursor-pointer"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        <span>Excluir Pasta</span>
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* UNIFIED GHOST PREVIEW INDICATOR FOR BOTH DESKTOP AND MOBILE TOKENS DRAGGING */}
        {draggingTrainerRecordId && dragCoordinates && (
          <div
            className="fixed pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none"
            style={{
              left: `${dragCoordinates.x}px`,
              top: `${dragCoordinates.y}px`,
            }}
          >
            {(() => {
              const trainer = allAvailableTrainerRecords.find(t => t.id === draggingTrainerRecordId);
              if (!trainer) return null;
              return (
                <div 
                  className="relative w-16 h-16 rounded-full border-2 border-indigo-400 bg-cover bg-center shadow-[0_0_24px_rgba(99,102,241,0.7)] opacity-75 bg-[#0e1014] animate-pulse scale-95"
                  style={{ backgroundImage: `url(${trainer.image})` }}
                  referrerPolicy="no-referrer"
                >
                  <div className="absolute inset-0 rounded-full border border-white/20" />
                </div>
              );
            })()}
          </div>
        )}

        {/* DRAG-AND-DROP PLACEHOLDER PREVIEW FOR ACTIVE POKEBALL SELECTIONS */}
        {selectedPokeballPokemon && (
          <div 
            className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 opacity-90 select-none cursor-crosshair animate-float-gentle"
            style={{ left: mousePos.x, top: mousePos.y }}
          >
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-red-500 bg-red-500/15 backdrop-blur-sm flex items-center justify-center p-1.5 shadow-[0_5px_15px_rgba(239,68,68,0.3)] animate-pulse">
              <img 
                src={selectedPokeballPokemon.image || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png"} 
                alt={selectedPokeballPokemon.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="bg-neutral-900/95 text-white font-extrabold text-[10px] px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider shadow-lg whitespace-nowrap">
              {selectedPokeballPokemon.name} (Nv. {selectedPokeballPokemon.level})
            </div>
            <div className="text-[9px] text-red-300 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-red-500/10">
              Clique para Conjurar (ESC Cancelar)
            </div>
          </div>
        )}

        {/* COMBAT TRIGGER FLOATING BTN, PRE-COMBAT MODAL & ACTIVE TRACKER */}
        
        {/* INICIAR COMBATE FLOATING ACTION TRIGGER */}
        <AnimatePresence>
          {selectedTokenIds.length >= 2 && !isCombatActive && !showPreCombatModal && (
            <motion.div
              initial={{ opacity: 0, y: 30, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 30, x: "-50%" }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[#0b0c10]/95 backdrop-blur-md px-5 py-2.5 rounded-full border border-rose-500/30 text-rose-250 hover:text-white flex items-center gap-2.5 shadow-[0_10px_35px_rgba(244,63,94,0.35)] transition-all cursor-pointer font-black tracking-widest text-[9px] uppercase hover:bg-slate-900/95 hover:scale-105 active:scale-95 group"
              onClick={() => prepareCombatForSelectedTokens(selectedTokenIds)}
            >
              <Swords className="w-4 h-4 text-rose-500 group-hover:rotate-12 transition-transform duration-150" />
              <span>Iniciar Combate ({selectedTokenIds.length} selecionados)</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRE-COMBAT SETTINGS MODAL */}
        <AnimatePresence>
          {showPreCombatModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-xl rounded-2xl bg-[#0b0c10]/95 border border-white/5 shadow-2xl p-6 flex flex-col gap-4 text-neutral-200 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Swords className="w-5 h-5 text-amber-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">Preparar Combate Pokémon</h3>
                      <p className="text-[9px] text-neutral-450 uppercase tracking-wide">Configure modificadores temporários e vantagem de dados.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPreCombatModal(false)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {combatParticipants.map((participant, index) => {
                    const baseVal = participant.baseInitiative !== 0 ? participant.baseInitiative : participant.dexMod;
                    const baseLabel = participant.baseInitiative !== 0 ? "Base" : "DEX";

                    return (
                      <div
                        key={participant.id}
                        className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={participant.url}
                            className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 object-cover shrink-0"
                            alt={participant.name}
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{participant.name}</span>
                            <span className="text-[8px] uppercase font-mono tracking-wider text-indigo-400 bg-indigo-500/10 px-1 inline-block mt-0.5 rounded border border-indigo-500/5">
                              {participant.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3.5 text-xs">
                          {/* Mod Base display */}
                          <div className="flex flex-col items-center">
                            <span className="text-[7.5px] text-neutral-500 uppercase tracking-widest font-black leading-none">{baseLabel}</span>
                            <span className="font-mono text-white text-[11px] font-bold mt-1">
                              {baseVal >= 0 ? `+${baseVal}` : baseVal}
                            </span>
                          </div>

                          {/* Advantage Checkbox */}
                          <label className="flex items-center gap-1.5 cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] p-1.5 px-2 rounded-lg border border-white/5 select-none transition-colors">
                            <input
                              type="checkbox"
                              checked={!!participant.hasAdvantage}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCombatParticipants(prev => {
                                  const c = [...prev];
                                  c[index] = { ...c[index], hasAdvantage: checked };
                                  return c;
                                });
                              }}
                              className="accent-amber-500 rounded cursor-pointer"
                            />
                            <span className="text-[8.5px] uppercase font-black tracking-wider text-amber-500">Vantagem</span>
                          </label>

                          {/* Temporary Modifier Selector */}
                          <div className="flex flex-col">
                            <span className="text-[7.5px] text-neutral-500 uppercase tracking-widest mb-1 font-black leading-none">Mod. Temp</span>
                            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg p-0.5">
                              <button
                                onClick={() => {
                                  setCombatParticipants(prev => {
                                    const c = [...prev];
                                    c[index] = { ...c[index], tempModifier: (c[index].tempModifier || 0) - 1 };
                                    return c;
                                  });
                                }}
                                className="w-6 h-6 rounded bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center font-mono font-bold text-xs select-none cursor-pointer"
                                title="Diminuir modificador"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={participant.tempModifier}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setCombatParticipants(prev => {
                                    const c = [...prev];
                                    c[index] = { ...c[index], tempModifier: isNaN(val) ? 0 : val };
                                    return c;
                                  });
                                }}
                                className="w-10 text-center bg-transparent border-none text-xs font-mono font-bold text-amber-400 focus:outline-none focus:ring-0 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => {
                                  setCombatParticipants(prev => {
                                    const c = [...prev];
                                    c[index] = { ...c[index], tempModifier: (c[index].tempModifier || 0) + 1 };
                                    return c;
                                  });
                                }}
                                className="w-6 h-6 rounded bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center font-mono font-bold text-xs select-none cursor-pointer"
                                title="Aumentar modificador"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-3.5 border-t border-white/5 pt-3.5">
                  <button
                    onClick={() => setShowPreCombatModal(false)}
                    className="px-4 py-2 hover:bg-white/5 text-[10px] font-extrabold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest rounded-xl border border-white/5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => rollInitiativeAndStartCombat(combatParticipants)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-[10px] font-black uppercase tracking-widest text-black rounded-xl transition-all font-sans active:scale-95 shadow-[0_4px_15px_rgba(245,158,11,0.25)] flex items-center gap-2 cursor-pointer"
                  >
                    <Dices className="w-3.5 h-3.5 text-black" />
                    <span>Rolar Iniciativas</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPACT BG3-STYLE HORIZONTAL COMBAT TRACKER BAR WITH DRAG & LOCK */}
        <AnimatePresence>
          {isCombatActive && combatParticipants.length > 0 && (
            <motion.div
              ref={combatTrackerRef}
              key="vtt-combat-tracker-bar"
              onMouseDown={handleCombatTrackerMouseDown}
              onTouchStart={handleCombatTrackerMouseDown}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 18 }}
              style={combatTrackerPos ? {
                position: "fixed",
                left: `${combatTrackerPos.x}px`,
                top: `${combatTrackerPos.y}px`,
                transform: "none",
                touchAction: isCombatTrackerUndocked ? "none" : "auto",
              } : {
                position: "fixed",
                top: "3.5rem",
                left: "50%",
                transform: "translateX(-50%)",
              }}
              className={`z-[35] flex items-center gap-1.5 py-1 px-3.5 rounded-full bg-[#0b0c10]/95 backdrop-blur-xl border shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-w-[95vw] ${
                isCombatTrackerUndocked 
                  ? "cursor-grab active:cursor-grabbing border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-colors duration-300" 
                  : "border-white/10 transition-all duration-300"
              }`}
            >
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 max-h-7">
                <div className="p-0.5 rounded-full bg-amber-500/10 text-amber-400 shrink-0" title="Combate Ativo">
                  <Swords className="w-3 h-3 animate-pulse" />
                </div>
                <div className="hidden sm:flex flex-col justify-center leading-none">
                  <div className="text-[10px] font-black tracking-wider text-amber-400 uppercase">RODADA {combatRound}</div>
                  <div className="text-[8.5px] font-bold text-neutral-300 mt-0.5 whitespace-nowrap uppercase">TURNO {currentCombatTurn + 1} de {combatParticipants.length}</div>
                </div>
              </div>
 
              {/* Turn backward navigation */}
              <button
                onClick={prevCombatTurn}
                className="w-5.5 h-5.5 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer group shrink-0"
                title="Turno Anterior (Atalho: B)"
              >
                <ChevronRight className="w-3 h-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              </button>
 
              {/* Combatants Portrait List */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[100px] xs:max-w-[180px] sm:max-w-xs md:max-w-md lg:max-w-xl scrollbar-none py-0.5 px-0.5">
                {combatParticipants.map((participant, index) => {
                  const isActive = index === currentCombatTurn;
                  const currentToken = resolvedTokens.find(t => t.id === participant.tokenId);
                  const name = currentToken ? (currentToken.nickname || currentToken.name) : participant.name;
                  const url = currentToken ? currentToken.url : participant.url;
 
                  return (
                    <div
                      key={participant.id}
                      onClick={() => focusCombatantToken(participant.tokenId)}
                      className={`relative shrink-0 w-7 h-7 md:w-8 h-8 rounded-full border-2 cursor-pointer transition-all ${
                        isActive
                          ? "border-amber-400 scale-102 shadow-[0_0_10px_rgba(245,158,11,0.5)] z-10"
                          : "border-white/10 opacity-70 hover:opacity-100 hover:scale-101"
                      } group`}
                      title={`${name} (Inic: ${participant.initiativeRoll}) - Focar na Câmera`}
                    >
                      <img
                        src={url}
                        className="w-full h-full rounded-full object-cover bg-neutral-950"
                        alt={name}
                        referrerPolicy="no-referrer"
                      />
 
                      {/* Small Active Turn Badge */}
                      {isActive && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[4.5px] font-black px-0.5 rounded uppercase tracking-wider scale-90 shadow-md z-15">
                          TURNO
                        </div>
                      )}
 
                      {/* Initiative Score Bubble */}
                      <div className="absolute -bottom-0.5 -right-0.5 bg-black border border-white/10 text-[7px] font-mono text-amber-300 w-3 h-3 rounded-full flex items-center justify-center font-extrabold shadow-sm">
                        {participant.initiativeRoll || 0}
                      </div>
 
                      {/* Small Remove hover button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTokenFromCombat(participant.tokenId);
                        }}
                        className="absolute -top-0.5 -right-0.5 bg-red-650 hover:bg-red-700 text-white w-3 h-3 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 shadow-md cursor-pointer"
                        title="Remover do combate"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  );
                })}
              </div>
 
              {/* Turn forward navigation */}
              <button
                onClick={nextCombatTurn}
                className="w-5.5 h-5.5 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer group shrink-0"
                title="Próximo Turno (Atalho: N)"
              >
                <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
 
              {/* Isolated Controls Divider - Anchor/Unpin Toggle Controls */}
              <div className="w-px h-4.5 bg-white/10 mx-1 self-center" />
 
              {/* Detach / Anchor Button (Unpin) */}
              <button
                type="button"
                onClick={() => {
                  if (!isCombatTrackerUndocked) {
                    if (combatTrackerRef.current) {
                      const rect = combatTrackerRef.current.getBoundingClientRect();
                      setCombatTrackerPos({ x: rect.left, y: rect.top });
                    }
                  }
                  setIsCombatTrackerUndocked(!isCombatTrackerUndocked);
                }}
                className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isCombatTrackerUndocked 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.25)]" 
                    : "bg-white/[0.02] border border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                }`}
                title={isCombatTrackerUndocked ? "Fixar no topo (Bloquear arrasto)" : "Desprender do topo (Arrastar livremente)"}
              >
                {isCombatTrackerUndocked ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3 rotate-45" />}
              </button>
              
              {isCombatTrackerUndocked && (
                <div 
                  className="text-neutral-500 hover:text-neutral-300 p-0.5 cursor-grab active:cursor-grabbing"
                  title="Elemento Desprendido - Segure e Arraste"
                >
                  <GripHorizontal className="w-3 h-3" />
                </div>
              )}
 
              {/* HIGHLY ISOLATED DIVIDER & ADD BUTTON (To completely avoid accidental clicks) */}
              <div className="w-px h-5.5 bg-emerald-500/20 mx-2 self-center" />
 
              {/* Separated and isolated: Add Token Dropdown / Menu */}
              <div className="relative group/add shrink-0 mr-1">
                <button
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-[#24c482] hover:bg-[#24c482] hover:text-black hover:border-transparent transition-all cursor-pointer shadow-sm font-bold"
                  title="Adicionar Token ao combate"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                
                {/* Floating additions list */}
                <div className="absolute top-[calc(100%+8px)] right-0 w-44 bg-[#0b0c10]/95 border border-white/10 rounded-xl p-1.5 shadow-2xl hidden group-hover/add:block hover:block z-[48] backdrop-blur-md">
                  <div className="text-[8px] font-bold text-neutral-500 px-2 py-0.5 uppercase tracking-widest border-b border-white/5 mb-1.5">
                    Adicionar Token:
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {resolvedTokens
                      .filter(t => !combatParticipants.some(p => p.tokenId === t.id))
                      .map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            addTokenToCombat(t.id);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 text-[9.5px] text-neutral-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <img src={t.url} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" alt="" />
                          <span className="truncate">{t.nickname || t.name}</span>
                        </button>
                      ))}
                    {resolvedTokens.filter(t => !combatParticipants.some(p => p.tokenId === t.id)).length === 0 && (
                      <div className="text-neutral-500 text-[8.5px] text-center py-2">
                        Sem tokens vagos.
                      </div>
                    )}
                  </div>
                </div>
              </div>
 
              {/* End Combat Button */}
              <button
                onClick={() => {
                  setIsCombatActive(false);
                  setCombatParticipants([]);
                  setCurrentCombatTurn(0);
                  setCombatTrackerPos(null);
                  setIsCombatTrackerUndocked(false);
                  setNotification("Combate finalizado!");
                }}
                className="py-0.5 px-2 rounded-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-350 font-black uppercase text-[8px] tracking-wider transition-colors cursor-pointer shrink-0"
                title="Encerrar combate"
              >
                Encerrar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMBAT SUMMARY TCG CARDS — fixed overlay, draggable, independent of tokens */}
        {(Object.entries(combatSummaryCards) as [string, { x: number; y: number; isVisible: boolean }][]).map(([tokenId, cardState]) => {
          if (!cardState.isVisible) return null;
          const token = resolvedTokens.find(t => t.id === tokenId);
          if (!token || !token.pokemonId) return null;
          const tr = allAvailableTrainerRecords.find(r => r.id === token.trainerId) || allAvailableTrainerRecords.find(r => r.pokemon?.some(poke => poke.id === token.pokemonId));
          const pk = tr?.pokemon?.find(poke => poke.id === token.pokemonId);
          if (!pk) return null;
          // Merge trainer attributes into pokemon data for the card
          const pokemonDataForCard = {
            ...pk,
            hpCurrent: token.hpCurrent ?? pk.hpCurrent,
            hpMax: token.hpMax ?? pk.hpMax,
            attributes: tr?.attributes || { FOR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
            statusStages: token.statusStages || pk.statusStages,
            statusConditions: token.statusConditions || pk.statusConditions,
          };
          return (
            <CombatSummaryCardTCG
              key={tokenId}
              tokenId={tokenId}
              pokemonId={pk.id}
              pokemonData={pokemonDataForCard}
              trainerId={token.trainerId || ""}
              x={cardState.x}
              y={cardState.y}
              isVisible={cardState.isVisible}
              onClose={() => setCombatSummaryCards(prev => ({ ...prev, [tokenId]: { ...prev[tokenId], isVisible: false } }))}
              onPositionChange={(nx, ny) => setCombatSummaryCards(prev => ({ ...prev, [tokenId]: { ...prev[tokenId], x: nx, y: ny } }))}
              calculateMatchups={calculateMatchups}
              ensureMoveObj={ensureMoveObj}
              onUpdatePP={(moveSlot, newPP) => updatePokemonMovePP(tokenId, moveSlot, newPP)}
            />
          );
        })}

        {/* RADIAL MENU OVERLAYS FOR BATTLE STAGES & STATUS CONDITIONS */}
        <AnimatePresence>
          {activeRadialMenu && (
            <RadialMenuOverlay
              menu={activeRadialMenu}
              onClose={() => setActiveRadialMenu(null)}
              onApply={(stages, conditions) => {
                updatePokemonCombatConditionsAndStages(activeRadialMenu.tokenId, stages, conditions);
              }}
              pokemon={resolvedTokens.find(t => t.id === activeRadialMenu.tokenId)}
              zoom={zoom}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Dynamic Pokéball pull-to-restore HUD */}
      <AnimatePresence>
        {hideAllUI && (
          <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 h-56 w-auto flex items-center justify-start pointer-events-none select-none">
            {/* Visual Slotted Capsule Track on the Screen Edge */}
            <motion.div 
              initial={{ x: -25, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -25, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="relative h-full w-10 bg-[#090a10]/65 border-y border-r border-white/10 rounded-r-3xl flex flex-col justify-between py-6 items-center shadow-2xl backdrop-blur-xl pointer-events-auto border-l-0"
            >
              {/* Slit Grid Lines / Digital Notch Lights representing power slots */}
              <div className="flex flex-col gap-2 opacity-35">
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX > 30 ? "bg-indigo-300" : "bg-white/40"}`} />
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX > 60 ? "bg-indigo-400" : "bg-white/40"}`} />
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX > 90 ? "bg-indigo-500" : "bg-white/40"}`} />
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX >= 120 ? "bg-emerald-400" : "bg-white/40"}`} />
              </div>

              {/* Central Energy Core Indicator */}
              <div className="relative group flex items-center justify-center">
                <div className={`absolute h-7 w-7 rounded-full animate-ping opacity-15 ${pullX >= 120 ? "bg-emerald-500" : "bg-indigo-500"}`} />
                <div className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${pullX >= 120 ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.5)]"}`} />
              </div>

              {/* Lower Grid Lines */}
              <div className="flex flex-col gap-2 opacity-35">
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX >= 120 ? "bg-emerald-400" : "bg-white/40"}`} />
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX > 90 ? "bg-indigo-500" : "bg-white/40"}`} />
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX > 60 ? "bg-indigo-400" : "bg-white/40"}`} />
                <div className={`w-3.5 h-[1.5px] rounded-full ${pullX > 30 ? "bg-indigo-300" : "bg-white/40"}`} />
              </div>

              {/* Holographic Plasma Beam Stream Stretching behind the dragging Pokéball */}
              {isPulling && (
                <div 
                  className="absolute left-[36px] top-1/2 -translate-y-1/2 h-2.5 bg-gradient-to-r from-indigo-500/80 via-indigo-600/45 to-transparent blur-[2px] rounded-l-full pointer-events-none origin-left"
                  style={{ width: `${pullX}px` }}
                />
              )}
              {isPulling && (
                <div 
                  className="absolute left-[36px] top-1/2 -translate-y-1/2 h-[1.5px] bg-white opacity-90 rounded-l-full pointer-events-none origin-left shadow-[0_0_6px_#fff]"
                  style={{ width: `${pullX}px` }}
                />
              )}

              {/* Draggable Pokéball Handle */}
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 180 }}
                dragElastic={0.05}
                onDragStart={() => setIsPulling(true)}
                onDrag={(e, info) => {
                  setPullX(Math.max(0, info.offset.x));
                }}
                onDragEnd={(e, info) => {
                  setIsPulling(false);
                  if (info.offset.x > 120) {
                    setHideAllUI(false);
                  }
                  setPullX(0);
                }}
                style={{ x: pullX }}
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-50 pointer-events-auto cursor-grab active:cursor-grabbing flex items-center"
              >
                <div 
                  className={`transition-all duration-150 relative shrink-0 ${!isPulling ? "hover:scale-110" : ""}`}
                  style={{
                    transform: `rotate(${pullX * 2.8}deg) scale(${isPulling ? 1.15 : 1})`,
                    filter: `drop-shadow(0 10px 25px ${pullX >= 120 ? "rgba(16, 185, 129, 0.7)" : "rgba(99, 102, 241, 0.55)"})`,
                    animation: !isPulling ? "pballWiggle 3.2s infinite ease-in-out" : undefined
                  }}
                >
                  <PokeballIcon 
                    className="w-11 h-11" 
                    glowColor={pullX >= 120 ? "#10b981" : "#3b82f6"} 
                  />
                </div>

                {/* Highly discrete animated side arrows guide pointing to the right to leave the side */}
                {!isPulling && (
                  <div className="absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-60 pointer-events-none select-none z-30">
                    <ChevronRight className="w-3.5 h-3.5 text-white/70 animate-pulse shrink-0" style={{ animationDuration: '1.2s', animationDelay: '0s' }} />
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400/50 animate-pulse shrink-0" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400/30 animate-pulse shrink-0" style={{ animationDuration: '1.2s', animationDelay: '0.6s' }} />
                  </div>
                )}
              </motion.div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pballWiggle {
          0%, 100% { transform: translateX(0px) scale(1); }
          15% { transform: translateX(5px) rotate(8deg) scale(1.04); }
          30% { transform: translateX(-1px) rotate(-4deg) scale(0.98); }
          45% { transform: translateX(6px) rotate(12deg) scale(1.06); }
          60% { transform: translateX(0px) rotate(0deg) scale(1); }
        }
      `}</style>

    </div>
  );
}
