import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

// Types describing combat staging attributes and status conditions
export interface StatusStages {
  attack: number;
  specialAttack: number;
  defense: number;
  specialDefense: number;
  speed: number;
  accuracy: number;
  evasion: number;
  criticalRange: number;
}

export interface StatusConditions {
  nonVolatile?: string; // "burn" | "freeze" | "paralysis" | "poison" | "badly_poison" | "sleep"
  volatile?: string[]; // array of "flinch" | "confusion" | "infatuation"
}

interface RadialMenuOverlayProps {
  menu: {
    tokenId: string;
    type: "stages" | "conditions";
  };
  onClose: () => void;
  onApply: (stages?: Partial<StatusStages>, conditions?: Partial<StatusConditions>) => void;
  pokemon?: any; // Mapped token item with statusStages and statusConditions
  zoom?: number;
}

// 1. Definition of stages metadata
export const STAGE_META = {
  attack: { label: "Ataque", icon: "⚔️", color: "from-rose-500 to-red-600" },
  specialAttack: { label: "Atq. Especial", icon: "🔮", color: "from-purple-500 to-indigo-600" },
  defense: { label: "Defesa", icon: "🛡️", color: "from-blue-500 to-sky-600" },
  specialDefense: { label: "Def. Especial", icon: "📯", color: "from-teal-500 to-emerald-600" },
  speed: { label: "Velocidade", icon: "💨", color: "from-amber-500 to-orange-600" },
  accuracy: { label: "Precisão", icon: "🎯", color: "from-violet-500 to-fuchsia-600" },
  evasion: { label: "Evasão", icon: "👣", color: "from-slate-500 to-neutral-600" },
  criticalRange: { label: "Margem Crítico", icon: "💥", color: "from-yellow-400 to-amber-500" },
};

// 2. Definition of conditions metadata with custom SVG icons
export interface ConditionMetaItem {
  id: string;
  name: string;
  type: "nonVolatile" | "volatile";
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
}

export const CONDITION_META: Record<string, ConditionMetaItem> = {
  burn: {
    id: "burn",
    name: "Queimado",
    type: "nonVolatile",
    color: "#f43f5e",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/30",
    textColor: "text-red-400",
    description: "Reduz o dano físico e causa dano contínuo de calor por rodada.",
  },
  freeze: {
    id: "freeze",
    name: "Congelado",
    type: "nonVolatile",
    color: "#38bdf8",
    bgColor: "bg-sky-550/15",
    borderColor: "border-sky-500/30",
    textColor: "text-sky-400",
    description: "Impede o Pokémon de realizar ações até descongelar ou receber fogo.",
  },
  paralysis: {
    id: "paralysis",
    name: "Paralisado",
    type: "nonVolatile",
    color: "#eab308",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/25",
    textColor: "text-yellow-400",
    description: "Reduz drasticamente a velocidade e pode invalidar turnos de ação.",
  },
  poison: {
    id: "poison",
    name: "Envenenado",
    type: "nonVolatile",
    color: "#a855f7",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
    description: "Causa dano de veneno constante a cada rodada de combate.",
  },
  badly_poison: {
    id: "badly_poison",
    name: "Gravem. Envenenado",
    type: "nonVolatile",
    color: "#db2777",
    bgColor: "bg-pink-600/15",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
    description: "Causa dano de veneno tóxico exponencial, acumulando a cada turno.",
  },
  sleep: {
    id: "sleep",
    name: "Dormindo",
    type: "nonVolatile",
    color: "#6366f1",
    bgColor: "bg-indigo-500/15",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-400",
    description: "Pokémon cai no sono profundo, incapacitado de agir por turnos limitados.",
  },
  flinch: {
    id: "flinch",
    name: "Atordoado",
    type: "volatile",
    color: "#f97316",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400",
    description: "Pokémon hesita por medo ou impacto mecânico, perdendo a vez na rodada.",
  },
  confusion: {
    id: "confusion",
    name: "Confuso",
    type: "volatile",
    color: "#84cc16",
    bgColor: "bg-green-500/15",
    borderColor: "border-green-500/30",
    textColor: "text-green-400",
    description: "Pokémon fica tonto e tem chance de golpear a si mesmo nas ações.",
  },
  infatuation: {
    id: "infatuation",
    name: "Encantado",
    type: "volatile",
    color: "#ec4899",
    bgColor: "bg-rose-500/15",
    borderColor: "border-rose-500/30",
    textColor: "text-rose-400",
    description: "Pokémon fica atraído e hesita em atacar o alvo que o encantou.",
  },
};

// Custom high-quality, theme-compatible SVGs for each condition index
export const getStatusIconSvg = (statusId: string, className = "w-5 h-5") => {
  switch (statusId) {
    case "burn":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "freeze":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5L7 19M19 17L5 7M2 12h20M12 7l3 5-3 5-3-5z" />
        </svg>
      );
    case "paralysis":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "poison":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 4c1 0 1.5.5 1.5 1.5s-.5 1.5-1.5 1.5-1.5-.5-1.5-1.5S11 6 12 6zm-4 7c0-2.2 1.8-4 4-4s4 1.8 4 4v2c0 .6-.4 1-1 1H9c-.6 0-1-.4-1-1v-2zm-1.5.5c0-.6.4-1 1-1h1v1h-2zm9 0h-2v-1h1c.6 0 1 .4 1 1z" />
          <path d="M8 19h8" />
        </svg>
      );
    case "badly_poison":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c1.1 0 2 .9 2 2v2m-4-2c0-1.1.9-2 2-2m-6 8h12m-12 4h12M4 8l16 8M4 16l16-8" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      );
    case "sleep":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9zm4 1h3v1l-2.5 3h2.5m-7-5h2v1l-1.5 2h1.5" />
        </svg>
      );
    case "flinch":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
          <path d="M12 7l1.5 3c.3.6.8.8 1.5.9l3.3.4-2.4 2.4c-.5.5-.6 1.1-.5 1.7l.6 3.3-3-1.6" />
        </svg>
      );
    case "confusion":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2A10 10 0 1 0 22 12" />
          <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6c0-1.5-.6-3-1.8-4.2l-1.4 1.4c.7.7 1.2 1.7 1.2 2.8 0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.6 0 1.2.1 1.8.4" />
        </svg>
      );
    case "infatuation":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    default:
      return null;
  }
};

// Helper function to build arc wedge pathways in SVGs
function getArcWedgePath(cx: number, cy: number, r: number, startDegrees: number, endDegrees: number, innerR: number = 0) {
  const startRad = (startDegrees * Math.PI) / 180;
  const endRad = (endDegrees * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  const largeArcFlag = endDegrees - startDegrees <= 180 ? 0 : 1;

  if (innerR > 0) {
    const ix2 = cx + innerR * Math.cos(endRad);
    const iy2 = cy + innerR * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(startRad);
    const iy1 = cy + innerR * Math.sin(startRad);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
  } else {
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }
}

export const RadialMenuOverlay: React.FC<RadialMenuOverlayProps> = ({
  menu,
  onClose,
  onApply,
  pokemon,
  zoom,
}) => {
  const currentStages = pokemon?.statusStages || {
    attack: 0,
    specialAttack: 0,
    defense: 0,
    specialDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
    criticalRange: 0,
  };

  const currentConditions = pokemon?.statusConditions || {
    nonVolatile: undefined,
    volatile: [],
  };

  // UI state tracking
  const [level, setLevel] = useState<1 | 2>(1);
  const [hoveredWedgeIndex, setHoveredWedgeIndex] = useState<number | null>(null);

  // Stages internal choice states
  const [selectedAttribute, setSelectedAttribute] = useState<keyof StatusStages | null>(null);

  // Conditions internal choice states
  const [conditionsTab, setConditionsTab] = useState<"nonVolatile" | "volatile" | null>(null);
  
  // Confirmed Substitution dialog states
  const [substitutionRequest, setSubstitutionRequest] = useState<{
    oldId: string;
    newId: string;
  } | null>(null);

  // Quick single stage item removal
  const [quickRemovePrompt, setQuickRemovePrompt] = useState<{
    type: "condition";
    id: string;
  } | null>(null);

  const cx = 180;
  const cy = 180;
  const outerRadius = 160;
  const innerRadius = 60;

  // Render function for Stage Menu Pizza level 1
  const renderStagesLevel1 = () => {
    const attributes = Object.keys(STAGE_META) as (keyof StatusStages)[];
    const wedgeAngleSize = 360 / attributes.length;

    return (
      <div className="relative flex flex-col items-center">
        <h2 className="text-white text-sm font-black uppercase tracking-wider mb-2 font-sans text-center">
          ⚡ Alterar Estágio de Atributos
        </h2>
        <div className="text-[10px] text-neutral-400 mb-6 max-w-sm text-center">
          Modificadores de combate temporários variando de de -6 a +6 estágios.
        </div>

        {/* SVG Pizza container */}
        <div className="relative w-[360px] h-[360px] select-none mx-auto drop-shadow-2xl">
          <svg className="w-full h-full transform -rotate-90">
            {attributes.map((attr, index) => {
              const startAng = index * wedgeAngleSize;
              const endAng = startAng + wedgeAngleSize;
              const meta = STAGE_META[attr];
              const value = currentStages[attr] || 0;

              const isHovered = hoveredWedgeIndex === index;
              const pathStr = getArcWedgePath(cx, cy, outerRadius, startAng, endAng, innerRadius);

              const valueSign = value > 0 ? `+${value}` : String(value);
              const colorStroke = isHovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.05)";

              return (
                <g
                  key={attr}
                  onMouseEnter={() => setHoveredWedgeIndex(index)}
                  onMouseLeave={() => setHoveredWedgeIndex(null)}
                  onClick={() => {
                    setSelectedAttribute(attr);
                    setLevel(2);
                  }}
                  className="cursor-pointer transition-all duration-150 group"
                >
                  {/* Wedge Path Shape */}
                  <path
                    d={pathStr}
                    fill={isHovered ? "rgba(99, 102, 241, 0.4)" : "rgba(10, 12, 17, 0.85)"}
                    stroke={colorStroke}
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                </g>
              );
            })}

            {/* Inner Ring Circle background */}
            <circle cx={cx} cy={cy} r={innerRadius} fill="#0d0e12" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>

          {/* Absolute HTML Labels centered perfectly in polar coordinates */}
          {attributes.map((attr, index) => {
            const startAng = index * wedgeAngleSize;
            const midAngleRad = ((startAng + wedgeAngleSize / 2) * Math.PI) / 180;
            const labelR = innerRadius + (outerRadius - innerRadius) / 2 + 5;

            const labelX = cx + labelR * Math.cos(midAngleRad);
            const labelY = cy + labelR * Math.sin(midAngleRad);

            const meta = STAGE_META[attr];
            const value = currentStages[attr] || 0;

            const isHovered = hoveredWedgeIndex === index;

            return (
              <div
                key={attr}
                onClick={() => {
                  setSelectedAttribute(attr);
                  setLevel(2);
                }}
                className={`absolute pointer-events-none select-none text-center -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ${
                  isHovered ? "scale-105" : ""
                }`}
                style={{ left: `${labelX}px`, top: `${labelY}px` }}
              >
                <div className="text-lg md:text-xl leading-none">{meta.icon}</div>
                <div className="text-[9px] font-black uppercase text-neutral-300 mt-1 max-w-[70px] truncate leading-tight font-sans">
                  {meta.label}
                </div>
                {value !== 0 ? (
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black font-mono leading-none mt-1 ${
                      value > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {value > 0 ? `+${value}` : value}
                  </span>
                ) : (
                  <span className="text-[8px] text-neutral-500 font-mono mt-0.5">0</span>
                )}
              </div>
            );
          })}

          {/* Center Circular Card HUD containing summary information */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full bg-neutral-950 border border-white/10 shadow-inner flex flex-col items-center justify-center pointer-events-none text-center p-2">
            <span className="text-[8px] font-extrabold uppercase text-indigo-400 tracking-wider">Ativo</span>
            <span className="text-[11px] font-black text-white uppercase tracking-tight mt-1 truncate w-full">
              {pokemon?.name || "Pokémon"}
            </span>
            <div className="text-[8.5px] text-neutral-400 border-t border-white/10 mt-1.5 pt-1 font-mono uppercase tracking-widest font-bold">
              Stages
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render function for Stage Menu Pizza level 2 (Select Modifier amount)
  const renderStagesLevel2 = () => {
    if (!selectedAttribute) return null;
    const meta = STAGE_META[selectedAttribute];
    const currentValue = currentStages[selectedAttribute] || 0;

    const positiveOptions = [1, 2, 3, 4, 5, 6];
    const negativeOptions = [-1, -2, -3, -4, -5, -6];

    return (
      <div className="relative max-w-md w-full mx-auto p-4 md:p-6 bg-[#0a0c11]/95 rounded-2xl border border-white/5 shadow-2xl text-center space-y-6">
        <div>
          <button
            onClick={() => setLevel(1)}
            className="text-[9.5px] uppercase font-black text-indigo-400 hover:text-indigo-300 transition-colors tracking-widest"
          >
            ← Voltar para Atributos
          </button>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-2xl">{meta.icon}</span>
            <h3 className="text-white text-base font-black uppercase tracking-wide font-sans">
              Ajustar {meta.label}
            </h3>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            Estágio Atual: <span className="text-white font-mono font-bold">{currentValue > 0 ? `+${currentValue}` : currentValue}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Positive stages */}
          <div className="space-y-1.5">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-400 font-sans block text-left">
              Modificadores Positivos
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {positiveOptions.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    onApply({ [selectedAttribute]: v });
                    setLevel(1);
                  }}
                  className={`py-2 px-1 rounded-xl text-neutral-200 font-bold font-mono text-xs transition-colors cursor-pointer border ${
                    currentValue === v
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-[#11131a] hover:bg-[#181b24] border-white/[0.04]"
                  }`}
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Negative stages */}
          <div className="space-y-1.5">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-400 font-sans block text-left">
              Modificadores Negativos
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {negativeOptions.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    onApply({ [selectedAttribute]: v });
                    setLevel(1);
                  }}
                  className={`py-2 px-1 rounded-xl text-neutral-200 font-bold font-mono text-xs transition-colors cursor-pointer border ${
                    currentValue === v
                      ? "bg-rose-500/20 border-rose-500 text-rose-400"
                      : "bg-[#11131a] hover:bg-[#181b24] border-white/[0.04]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Modifier */}
        <div className="pt-2 border-t border-white/[0.05] flex gap-2 justify-center">
          <button
            onClick={() => {
              onApply({ [selectedAttribute]: 0 });
              setLevel(1);
            }}
            className="flex-1 max-w-xs py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-white/[0.04] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Remover Modificador
          </button>
        </div>
      </div>
    );
  };

  // Render function for Conditions Menu Level 1
  const renderConditionsLevel1 = () => {
    return (
      <div className="relative flex flex-col items-center">
        <h2 className="text-white text-sm font-black uppercase tracking-wider mb-2 font-sans text-center">
          🧬 Alterar Condição de Status
        </h2>
        <div className="text-[10px] text-neutral-400 mb-6 max-w-sm text-center">
          Aplica ou remove condições voláteis e não-voláteis do Pokémon.
        </div>

        {/* Circular Menu Split in two halves */}
        <div className="relative w-[360px] h-[360px] select-none mx-auto drop-shadow-2xl">
          <svg className="w-full h-full transform -rotate-90">
            {/* Left Hand: Non-Volatile Category */}
            <g
              onMouseEnter={() => setHoveredWedgeIndex(100)}
              onMouseLeave={() => setHoveredWedgeIndex(null)}
              onClick={() => {
                setConditionsTab("nonVolatile");
                setLevel(2);
              }}
              className="cursor-pointer transition-all duration-150"
            >
              <path
                d={getArcWedgePath(cx, cy, outerRadius, 90, 270, innerRadius)}
                fill={hoveredWedgeIndex === 100 ? "rgba(225, 29, 72, 0.25)" : "rgba(18, 12, 14, 0.85)"}
                stroke={hoveredWedgeIndex === 100 ? "rgba(244,63,94,0.4)" : "rgba(255,255,255,0.04)"}
                strokeWidth="1.5"
              />
            </g>

            {/* Right Hand: Volatile Category */}
            <g
              onMouseEnter={() => setHoveredWedgeIndex(101)}
              onMouseLeave={() => setHoveredWedgeIndex(null)}
              onClick={() => {
                setConditionsTab("volatile");
                setLevel(2);
              }}
              className="cursor-pointer transition-all duration-150"
            >
              <path
                d={getArcWedgePath(cx, cy, outerRadius, 270, 450, innerRadius)}
                fill={hoveredWedgeIndex === 101 ? "rgba(99, 102, 241, 0.25)" : "rgba(10, 14, 18, 0.85)"}
                stroke={hoveredWedgeIndex === 101 ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.04)"}
                strokeWidth="1.5"
              />
            </g>

            {/* Inner Ring Circle background */}
            <circle cx={cx} cy={cy} r={innerRadius} fill="#0d0e12" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>

          {/* Label positioning in polar coordinates for Left (Não-Voláteis) */}
          <div
            onClick={() => {
              setConditionsTab("nonVolatile");
              setLevel(2);
            }}
            className={`absolute pointer-events-none select-none text-right -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ${
              hoveredWedgeIndex === 100 ? "scale-105" : ""
            }`}
            style={{ left: `${cx - 95}px`, top: `${cy}px` }}
          >
            <div className="text-xl md:text-2xl">💔</div>
            <div className="text-[10px] font-black uppercase text-rose-400 font-sans tracking-wide">
              Não-Voláteis
            </div>
            <div className="text-[7.5px] text-neutral-400 font-semibold mt-1 max-w-[80px] leading-tight ml-auto">
              Somente 1 ativo. (Ex: Queimadura, Sono)
            </div>
            {currentConditions.nonVolatile && (
              <span className="inline-block mt-2 bg-rose-500/10 border border-rose-500/15 font-bold text-rose-400 text-[8px] tracking-wide rounded-md px-1.5 py-0.5 uppercase">
                {CONDITION_META[currentConditions.nonVolatile]?.name}
              </span>
            )}
          </div>

          {/* Label positioning in polar coordinates for Right (Voláteis) */}
          <div
            onClick={() => {
              setConditionsTab("volatile");
              setLevel(2);
            }}
            className={`absolute pointer-events-none select-none text-left-align -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ${
              hoveredWedgeIndex === 101 ? "scale-105" : ""
            }`}
            style={{ left: `${cx + 95}px`, top: `${cy}px` }}
          >
            <div className="text-xl md:text-2xl text-center">🌀</div>
            <div className="text-[10px] font-black uppercase text-indigo-400 font-sans tracking-wide text-center">
              Voláteis
            </div>
            <div className="text-[7.5px] text-neutral-400 font-semibold mt-1 max-w-[80px] leading-tight text-center mx-auto">
              Podem coexistir. (Ex: Confusão, Encanto)
            </div>
            {currentConditions.volatile && currentConditions.volatile.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-2 max-w-[100px]">
                {currentConditions.volatile.map((cId) => (
                  <span
                    key={cId}
                    className="bg-indigo-500/10 border border-indigo-500/15 font-bold text-indigo-400 text-[7px] rounded px-1 py-0.2 uppercase font-sans"
                  >
                    {CONDITION_META[cId]?.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Center Circular Card HUD containing summary information */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full bg-neutral-950 border border-white/10 shadow-inner flex flex-col items-center justify-center pointer-events-none text-center p-2">
            <span className="text-[8px] font-extrabold uppercase text-rose-500 tracking-wider">Ativo</span>
            <span className="text-[11px] font-black text-white uppercase tracking-tight mt-1 truncate w-full">
              {pokemon?.name || "Pokémon"}
            </span>
            <div className="text-[8.5px] text-neutral-400 border-t border-white/10 mt-1.5 pt-1 font-mono uppercase tracking-widest font-bold">
              Status ID
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render function for Conditions Menu Level 2
  const renderConditionsLevel2 = () => {
    if (!conditionsTab) return null;

    const list = Object.values(CONDITION_META).filter((item) => item.type === conditionsTab);

    return (
      <div className="relative max-w-sm w-full mx-auto p-4 md:p-6 bg-[#0a0c11]/95 rounded-2xl border border-white/5 shadow-2xl space-y-5">
        <div className="text-center">
          <button
            onClick={() => setLevel(1)}
            className="text-[9.5px] uppercase font-black text-indigo-400 hover:text-indigo-300 transition-colors tracking-widest"
          >
            ← Voltar para Categorias
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <span className="text-xl">{conditionsTab === "nonVolatile" ? "💔" : "🌀"}</span>
            <h3 className="text-white text-base font-black uppercase tracking-wide font-sans">
              {conditionsTab === "nonVolatile" ? "Status Não-Voláteis" : "Status Voláteis"}
            </h3>
          </div>
          <p className="text-[9.5px] text-neutral-500 mt-1 leading-tight">
            Selecione uma opção para aplicar ou remover a condição do Pokémon.
          </p>
        </div>

        {/* Condition Slices / Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {list.map((item) => {
            const isNonVolActive = conditionsTab === "nonVolatile" && currentConditions.nonVolatile === item.id;
            const isVolActive = conditionsTab === "volatile" && currentConditions.volatile?.includes(item.id);
            const isActive = isNonVolActive || isVolActive;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isActive) {
                    setQuickRemovePrompt({ type: "condition", id: item.id });
                    return;
                  }

                  if (conditionsTab === "nonVolatile") {
                    // Check if another is already active
                    if (currentConditions.nonVolatile) {
                      setSubstitutionRequest({ oldId: currentConditions.nonVolatile, newId: item.id });
                    } else {
                      onApply(undefined, { nonVolatile: item.id });
                      setLevel(1);
                    }
                  } else {
                    // Volatile list
                    const currentArray = currentConditions.volatile || [];
                    onApply(undefined, { volatile: [...currentArray, item.id] });
                    setLevel(1);
                  }
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-colors text-white select-none relative cursor-pointer group ${
                  isActive
                    ? "bg-[#180e15] border-rose-500/30 hover:bg-[#200e1a]"
                    : "bg-[#11131a] hover:bg-[#151924] border-white/[0.04]"
                }`}
              >
                {/* Active check indicator badge on wedge */}
                {isActive && (
                  <span className="absolute top-2.5 right-3 text-[14px] leading-none animate-pulse">
                    🟢
                  </span>
                )}

                {/* SVG icon box */}
                <div
                  className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg ${item.bgColor} ${item.borderColor} ${item.textColor} border`}
                >
                  {getStatusIconSvg(item.id, "w-5 h-5")}
                </div>

                <div className="w-full">
                  <h4 className={`text-[11.5px] font-extrabold uppercase tracking-wide group-hover:text-indigo-300 transition-colors ${
                    isActive ? "text-rose-400" : "text-neutral-200"
                  }`}>
                    {item.name}
                  </h4>
                  <p className="text-[9.5px] text-neutral-400 mt-1 font-sans leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Substitution Dialogue
  const renderSubstitutionDialog = () => {
    if (!substitutionRequest) return null;

    const oldMeta = CONDITION_META[substitutionRequest.oldId];
    const newMeta = CONDITION_META[substitutionRequest.newId];

    return (
      <div className="relative max-w-sm w-full mx-auto p-5 bg-[#0e0d12]/95 border border-amber-500/20 text-center rounded-2xl shadow-3xl space-y-4 animate-fadeIn">
        <div className="flex justify-center">
          <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center rounded-full">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-white text-sm font-black uppercase tracking-wider font-sans">
            Substituir Condição Ativa?
          </h3>
          <p className="text-[10px] text-neutral-400 leading-tight">
            Pokémon só podem possuir uma única condição Não-Volátil ativa por vez no combate.
          </p>
        </div>

        <div className="p-3 bg-black/45 rounded-xl border border-white/[0.03] text-left space-y-1 text-[10.5px]">
          <div className="text-neutral-400 flex justify-between items-center">
            <span>Status Atual:</span>
            <span className="font-extrabold text-neutral-300">{oldMeta?.name}</span>
          </div>
          <div className="text-neutral-400 flex justify-between items-center pt-2 border-t border-white/[0.04]">
            <span>Novo Status:</span>
            <span className="font-extrabold text-rose-400">{newMeta?.name}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setSubstitutionRequest(null)}
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border border-white/5 text-[9.5px] font-black uppercase tracking-wider text-white rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onApply(undefined, { nonVolatile: substitutionRequest.newId });
              setSubstitutionRequest(null);
              setLevel(1);
            }}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-[9.5px] font-black uppercase tracking-wider text-white rounded-xl transition-all shadow-lg active:scale-95 shadow-rose-600/15 cursor-pointer"
          >
            Substituir
          </button>
        </div>
      </div>
    );
  };

  // Render quick removal prompt dialogue
  const renderQuickRemovePrompt = () => {
    if (!quickRemovePrompt) return null;

    const meta = CONDITION_META[quickRemovePrompt.id];

    return (
      <div className="relative max-w-sm w-full mx-auto p-5 bg-[#0a0c10]/95 border border-indigo-500/20 text-center rounded-2xl shadow-3xl space-y-4 animate-fadeIn">
        <div className="space-y-1.5">
          <h3 className="text-white text-sm font-black uppercase tracking-wider font-sans">
            Remover Condição Ativa?
          </h3>
          <p className="text-[10.5px] text-neutral-400 leading-normal">
            Deseja remover o status de <strong className="text-rose-400">{meta?.name}</strong> do Pokémon {pokemon?.name}?
          </p>
        </div>

        <div className="flex gap-2.5 pt-1.5">
          <button
            onClick={() => setQuickRemovePrompt(null)}
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 font-sans border border-white/5 text-[9.5px] font-black uppercase tracking-wider text-white rounded-xl cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (meta.type === "nonVolatile") {
                onApply(undefined, { nonVolatile: null });
              } else {
                const currentArr = currentConditions.volatile || [];
                onApply(undefined, { volatile: currentArr.filter((id) => id !== meta.id) });
              }
              setQuickRemovePrompt(null);
              setLevel(1);
            }}
            className="flex-1 py-2 bg-[#dc2626] hover:bg-red-500 text-[9.5px] font-black uppercase tracking-wide text-white rounded-xl active:scale-95 cursor-pointer transition-transform duration-100 font-sans font-bold"
          >
            Remover Status
          </button>
        </div>
      </div>
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ 
          opacity: 0, 
          scale: 0.3 * (zoom ? Math.min(1.2, Math.max(0.8, 1 / zoom)) : 1), 
          rotate: -35, 
          y: 30 
        }}
        animate={{ 
          opacity: 1, 
          scale: (zoom ? Math.min(1.2, Math.max(0.8, 1 / zoom)) : 1), 
          rotate: 0, 
          y: 0,
          transition: {
            type: "spring",
            stiffness: 280,
            damping: 22
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.5 * (zoom ? Math.min(1.2, Math.max(0.8, 1 / zoom)) : 1), 
          rotate: 35, 
          y: 20,
          transition: { duration: 0.18 }
        }}
        className="relative max-w-md w-full flex flex-col items-center bg-[#0d0e12]/95 border border-white/5 p-2 md:p-4 rounded-3xl sm:-translate-y-4 shadow-2xl origin-center"
      >
        {/* Close overlay anchor */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-[#0a0b0e] hover:bg-neutral-850 border border-white/10 rounded-full text-white cursor-pointer active:scale-95 z-55 transition-all shadow-md hover:border-red-500/40"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Diagonal Switch panel based on mode and dialogs */}
        {substitutionRequest ? (
          renderSubstitutionDialog()
        ) : quickRemovePrompt ? (
          renderQuickRemovePrompt()
        ) : menu.type === "stages" ? (
          level === 1 ? (
            renderStagesLevel1()
          ) : (
            renderStagesLevel2()
          )
        ) : level === 1 ? (
          renderConditionsLevel1()
        ) : (
          renderConditionsLevel2()
        )}
      </motion.div>
    </motion.div>
  );
};
