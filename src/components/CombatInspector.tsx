import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Info, Sparkles, ChevronDown, ChevronUp, Shield, HelpCircle, FileText, Zap } from "lucide-react";
import { TokenItem, PokemonMoveObject } from "../types";

export interface CombatInspectorProps {
  token: TokenItem;
  pokemon: any;
  zoom: number;
  activeMapWidth: number;
  onUpdatePP: (moveSlot: "move1" | "move2" | "move3" | "move4", newPP: number) => void;
  onClose: () => void;
  POKEMON_TYPES_STYLING: any;
  calculateMatchups: (types: string[]) => { weaknesses: string[]; resistances: string[]; immunities: string[] };
  ensureMoveObj: (m: any) => PokemonMoveObject;
}

const TYPE_TRANSLATIONS: { [key: string]: string } = {
  Normal: "Normal",
  Fire: "Fogo",
  Water: "Água",
  Electric: "Elétrico",
  Grass: "Planta",
  Ice: "Gelo",
  Fighting: "Lutador",
  Poison: "Veneno",
  Ground: "Terra",
  Flying: "Voador",
  Psychic: "Psíquico",
  Bug: "Inseto",
  Rock: "Pedra",
  Ghost: "Fantasma",
  Dragon: "Dragão",
  Dark: "Sombrio",
  Steel: "Aço",
  Fairy: "Fada"
};

const STAT_LABELS = {
  FOR: "Força",
  DES: "Destreza",
  CON: "Constituição",
  INT: "Inteligência",
  SAB: "Sabedoria",
  CAR: "Carisma"
};

export function CombatInspector({
  token,
  pokemon,
  zoom,
  activeMapWidth,
  onUpdatePP,
  onClose,
  POKEMON_TYPES_STYLING,
  calculateMatchups,
  ensureMoveObj
}: CombatInspectorProps) {
  const [activeTab, setActiveTab] = useState<"combate" | "moves">("moves");
  const [expandedMove, setExpandedMove] = useState<string | null>(null);
  const [isTalentsExpanded, setIsTalentsExpanded] = useState<boolean>(false);

  // Close when pressing the ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!pokemon) return null;

  // Real-time HP from token with fallback to Pokémon record
  const currentHp = token.hpCurrent !== undefined ? token.hpCurrent : (pokemon.hpCurrent ?? 20);
  const maxHp = token.hpMax !== undefined ? token.hpMax : (pokemon.hpMax ?? 20);
  const hpPercent = Math.max(0, Math.min(100, (currentHp / (maxHp || 1)) * 100));

  const hpBarColor = hpPercent < 35 
    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
    : hpPercent < 70 
      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";

  // Matchups calculations
  const matchups = calculateMatchups(pokemon.types || []);

  const parseMatchupString = (item: string) => {
    const match = item.match(/^([A-Za-z]+)\s*×([\d.]+)$/);
    if (match) {
      const type = match[1];
      const mult = match[2];
      const label = `${TYPE_TRANSLATIONS[type] || type} ×${mult}`;
      return { type, mult, label };
    }
    return { type: "Normal", mult: "1", label: item };
  };

  // Attributes & Saving Throw modifiers calculations
  const getProficiencyBonus = (level: number): number => {
    return Math.floor((level - 1) / 4) + 2;
  };

  const getCiModifiedStatValue = (attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    const baseVal = pokemon.attributes?.[attr] ?? 10;
    // Attempt to query the nature from global lists
    const pkNature = pokemon.nature || "";
    // Hardcoded nature check as simple fallback if list is not directly imported
    const natureBonusAttr = pokemon.natureBonusAttr; // supports custom mapping if present
    const naturePenaltyAttr = pokemon.naturePenaltyAttr;
    
    // Default system nature alignment
    let natureMultiplier = 0;
    // Map traditional pokemon natures to attributes in standard 5e VTT if needed
    if (pkNature === "arrogante" && attr === "FOR") natureMultiplier = 2;
    if (pkNature === "arrogante" && attr === "DES") natureMultiplier = -2;
    if (pkNature === "impulsivo" && attr === "FOR") natureMultiplier = 2;
    if (pkNature === "impulsivo" && attr === "CON") natureMultiplier = -2;
    if (pkNature === "corajoso" && attr === "FOR") natureMultiplier = 2;
    if (pkNature === "corajoso" && attr === "SAB") natureMultiplier = -2;
    if (pkNature === "serio" && attr === "FOR") natureMultiplier = 2;
    if (pkNature === "serio" && attr === "CAR") natureMultiplier = -2;
    if (pkNature === "determinado" && attr === "DES") natureMultiplier = 2;
    if (pkNature === "determinado" && attr === "FOR") natureMultiplier = -2;
    if (pkNature === "apressado" && attr === "DES") natureMultiplier = 2;
    if (pkNature === "apressado" && attr === "CON") natureMultiplier = -2;
    if (pkNature === "energetico" && attr === "DES") natureMultiplier = 2;
    if (pkNature === "energetico" && attr === "CAR") natureMultiplier = -2;
    if (pkNature === "curioso" && attr === "DES") natureMultiplier = 2;
    if (pkNature === "curioso" && attr === "SAB") natureMultiplier = -2;
    if (pkNature === "sereno" && attr === "CON") natureMultiplier = 2;
    if (pkNature === "sereno" && attr === "DES") natureMultiplier = -2;
    if (pkNature === "teimoso" && attr === "CON") natureMultiplier = 2;
    if (pkNature === "teimoso" && attr === "SAB") natureMultiplier = -2;
    if (pkNature === "apatico" && attr === "CON") natureMultiplier = 2;
    if (pkNature === "apatico" && attr === "CAR") natureMultiplier = -2;
    if (pkNature === "preguicoso" && attr === "CON") natureMultiplier = 2;
    if (pkNature === "preguicoso" && attr === "FOR") natureMultiplier = -2;
    if (pkNature === "prudente" && attr === "SAB") natureMultiplier = 2;
    if (pkNature === "prudente" && attr === "FOR") natureMultiplier = -2;
    if (pkNature === "sabio" && attr === "SAB") natureMultiplier = 2;
    if (pkNature === "sabio" && attr === "CON") natureMultiplier = -2;
    if (pkNature === "travesso" && attr === "SAB") natureMultiplier = 2;
    if (pkNature === "travesso" && attr === "CAR") natureMultiplier = -2;
    if (pkNature === "alegre" && attr === "CAR") natureMultiplier = 2;
    if (pkNature === "alegre" && attr === "FOR") natureMultiplier = -2;
    if (pkNature === "sociavel" && attr === "CAR") natureMultiplier = 2;
    if (pkNature === "sociavel" && attr === "DES") natureMultiplier = -2;
    if (pkNature === "ingenuo" && attr === "CAR") natureMultiplier = 2;
    if (pkNature === "ingenuo" && attr === "SAB") natureMultiplier = -2;

    const finalValue = baseVal + natureMultiplier;
    return Math.max(1, finalValue);
  };

  const getCiModifiedModifier = (attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    const val = getCiModifiedStatValue(attr);
    return Math.floor((val - 10) / 2);
  };

  const getCiModifierStr = (attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    const mod = getCiModifiedModifier(attr);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getCiSavingThrowModStr = (attr: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR") => {
    const baseMod = getCiModifiedModifier(attr);
    const isProf = pokemon.savingThrows?.[attr] || false;
    const profBonus = getProficiencyBonus(pokemon.level || 1);
    
    // Loyalty influence
    const loyalty = pokemon.loyalty ?? 0;
    let loyaltyBonus = 0;
    if (loyalty === 3 || loyalty === 2 || loyalty === 1) {
      loyaltyBonus = 1;
    } else if (loyalty === -3 || loyalty === -2 || loyalty === -1) {
      loyaltyBonus = -1;
    }
    
    const totalSave = baseMod + (isProf ? profBonus : 0) + loyaltyBonus;
    return totalSave >= 0 ? `+${totalSave}` : `${totalSave}`;
  };

  // Pre-compiled list of moves
  const moves = [
    { key: "move1" as const, data: ensureMoveObj(pokemon.move1) },
    { key: "move2" as const, data: ensureMoveObj(pokemon.move2) },
    { key: "move3" as const, data: ensureMoveObj(pokemon.move3) },
    { key: "move4" as const, data: ensureMoveObj(pokemon.move4) }
  ].filter(m => m.data && m.data.name);

  // Position rules (Left/Right depending on coordinate split)
  const isLeftSided = token.x < activeMapWidth / 2;

  return (
    <motion.div
      id="vtt-combat-inspector"
      initial={{ opacity: 0, scale: 0.92, y: "-47%" }}
      animate={{ opacity: 1, scale: 1, y: "-50%" }}
      exit={{ opacity: 0, scale: 0.92, y: "-47%" }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`fixed md:absolute z-[105] bg-[#0c1015]/98 text-white border border-neutral-800 rounded-xl shadow-[0_15px_45px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col
        w-[90vw] md:w-[340px] max-h-[85vh] md:max-h-[600px]
        top-1/2 left-1/2 md:left-auto
        ${isLeftSided 
          ? "md:left-[calc(100%+24px)] md:right-auto" 
          : "md:right-[calc(100%+24px)] md:left-auto"
        }
      `}
      style={{
        transform: window.innerWidth < 768 
          ? "translate(-50%, -50%)" 
          : `scale(${Math.min(1.25, Math.max(0.7, 1 / zoom))}) translateY(-50%)`,
        transformOrigin: window.innerWidth < 768 
          ? "center center" 
          : (isLeftSided ? "left center" : "right center")
      }}
    >
      {/* 1. Header (Banner & Identity) */}
      <div className="relative p-3 bg-gradient-to-r from-red-950/40 via-neutral-900/90 to-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between gap-3 min-h-[64px]">
        <div className="flex items-center gap-3">
          {/* Sprite Box */}
          <div className="w-11 h-11 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-center p-0.5 overflow-hidden shadow-inner">
            <img 
              src={pokemon.image || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png"} 
              alt={pokemon.name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            {/* Nickname / Name */}
            <h4 className="text-sm font-black tracking-wide text-white leading-tight uppercase select-text">
              {pokemon.nickname || pokemon.name}
            </h4>
            {/* Species */}
            <p className="text-[10px] text-neutral-400 font-mono flex items-center gap-1 mt-0.5">
              <span>{pokemon.species}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-red-400 font-bold">Nv. {pokemon.level}</span>
            </p>
          </div>
        </div>

        {/* Dynamic type pills */}
        <div className="flex flex-col gap-1 items-end">
          {pokemon.types && pokemon.types.map((tp: string) => {
            const styling = POKEMON_TYPES_STYLING[tp] || { bg: "bg-neutral-800/20", border: "border-neutral-700/30", text: "text-neutral-400", emoji: "🔘" };
            return (
              <span 
                key={tp} 
                className={`flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${styling.bg} ${styling.border} ${styling.text} uppercase tracking-tight scale-90 origin-right`}
              >
                <span>{styling.emoji}</span>
                <span>{TYPE_TRANSLATIONS[tp] || tp}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 2. Rapid HP Display Panel */}
      <div className="p-3 bg-neutral-950/40 border-b border-neutral-800/50 flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">Pontos de Vida</span>
          <span className="text-xs font-mono font-bold tracking-tight text-white">
            {currentHp} <span className="text-[10px] text-neutral-500">/ {maxHp}</span>
          </span>
        </div>

        {/* Life bar container */}
        <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900 flex">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${hpBarColor}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex bg-neutral-950/70 border-b border-neutral-800/80 p-1 gap-1">
        <button
          onClick={() => setActiveTab("moves")}
          className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "moves"
              ? "bg-red-500/15 border border-red-500/25 text-red-400 font-extrabold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/40 border border-transparent"
          }`}
        >
          <FileText size={11} />
          Moves ({moves.length})
        </button>
        <button
          onClick={() => setActiveTab("combate")}
          className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "combate"
              ? "bg-red-500/15 border border-red-500/25 text-red-400 font-extrabold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/40 border border-transparent"
          }`}
        >
          <Zap size={11} />
          Combate
        </button>
      </div>

      {/* 4. Tab Contents (Wrapped inside custom internal scroll window) */}
      <div className="flex-1 overflow-y-auto max-h-[320px] scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        <AnimatePresence mode="wait">
          {activeTab === "combate" ? (
            <motion.div
              key="combate-tab"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="p-3 flex flex-col gap-4"
            >
              {/* Defensive Chart (Fraquezas / Resistências) */}
              <div className="grid grid-cols-3 gap-2 bg-neutral-950/30 p-2.5 rounded-lg border border-neutral-900/70">
                {/* Weaknesses */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8.5px] font-extrabold text-red-400 tracking-wider uppercase block border-b border-red-500/10 pb-1">💥 Fraquezas</span>
                  <div className="flex flex-col gap-1">
                    {matchups.weaknesses.length > 0 ? (
                      matchups.weaknesses.map(item => {
                        const parsed = parseMatchupString(item);
                        const styling = POKEMON_TYPES_STYLING[parsed.type] || { text: "text-red-400", emoji: "💥" };
                        return (
                          <div key={item} className="text-[9px] font-bold tracking-tight text-white flex items-center gap-1 bg-red-950/15 py-0.5 px-1 rounded border border-red-500/5">
                            <span>{styling.emoji}</span>
                            <span className="whitespace-nowrap">{parsed.label}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[9px] text-neutral-500 italic block mt-0.5">Nenhuma</span>
                    )}
                  </div>
                </div>

                {/* Resistances */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8.5px] font-extrabold text-emerald-400 tracking-wider uppercase block border-b border-emerald-500/10 pb-1">🛡️ Resistências</span>
                  <div className="flex flex-col gap-1">
                    {matchups.resistances.length > 0 ? (
                      matchups.resistances.map(item => {
                        const parsed = parseMatchupString(item);
                        const styling = POKEMON_TYPES_STYLING[parsed.type] || { text: "text-emerald-400", emoji: "🛡️" };
                        return (
                          <div key={item} className="text-[9px] font-bold tracking-tight text-white flex items-center gap-1 bg-emerald-950/15 py-0.5 px-1 rounded border border-emerald-500/5">
                            <span>{styling.emoji}</span>
                            <span className="whitespace-nowrap">{parsed.label}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[9px] text-neutral-500 italic block mt-0.5">Nenhuma</span>
                    )}
                  </div>
                </div>

                {/* Immunities */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8.5px] font-extrabold text-blue-400 tracking-wider uppercase block border-b border-blue-500/10 pb-1">🌌 Imunidades</span>
                  <div className="flex flex-col gap-1">
                    {matchups.immunities.length > 0 ? (
                      matchups.immunities.map(item => {
                        const parsed = parseMatchupString(item);
                        const styling = POKEMON_TYPES_STYLING[parsed.type] || { text: "text-blue-400", emoji: "🌌" };
                        return (
                          <div key={item} className="text-[9px] font-bold tracking-tight text-white flex items-center gap-1 bg-blue-950/15 py-0.5 px-1 rounded border border-blue-500/5">
                            <span>{styling.emoji}</span>
                            <span className="whitespace-nowrap">{parsed.label}</span>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[9px] text-neutral-500 italic block mt-0.5">Nenhuma</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attributes & Saving Throws Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black tracking-widest text-neutral-450 uppercase pb-1 border-b border-neutral-900">Atributos e Salvaguardas</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1 bg-neutral-950/15 p-2 rounded-lg border border-neutral-900/40">
                  {(["FOR", "DES", "CON", "INT", "SAB", "CAR"] as const).map(attr => {
                    const finalVal = getCiModifiedStatValue(attr);
                    const modStr = getCiModifierStr(attr);
                    const isFavorable = Number(modStr) > 0;
                    const saveStr = getCiSavingThrowModStr(attr);
                    const isSaveNf = saveStr.startsWith("-");
                    
                    return (
                      <div key={attr} className="flex justify-between items-center text-xs py-1 border-b border-white/5 last:border-0 hover:bg-neutral-900/20 px-1 rounded">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-tight leading-tight flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500/50" />
                            {STAT_LABELS[attr]}
                          </span>
                          <span className="text-xs font-bold text-white leading-normal mt-0.5">
                            {finalVal} <span className={`text-[10px] font-mono ${isFavorable ? "text-emerald-400" : "text-neutral-500"}`}>({modStr})</span>
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[8.5px] font-extrabold text-neutral-500 uppercase tracking-tight">Salvaguarda</span>
                          <span className={`text-xs font-mono font-black mt-0.5 ${isSaveNf ? "text-red-400" : "text-emerald-400"}`}>
                            {saveStr}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="moves-tab"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12 }}
              className="p-3 flex flex-col gap-2.5"
            >
              {moves.length > 0 ? (
                moves.map(({ key: slotKey, data: mv }) => {
                  const styling = POKEMON_TYPES_STYLING[mv.type] || { bg: "bg-neutral-800/10", border: "border-neutral-700/20", text: "text-neutral-400", emoji: "🔘" };
                  const isExpanded = expandedMove === slotKey;
                  const ppCurrentValue = mv.ppCurrent !== undefined ? mv.ppCurrent : mv.pp;

                  return (
                    <div 
                      key={slotKey} 
                      className={`rounded-lg border bg-neutral-950/20 overflow-hidden transition-all text-left ${
                        isExpanded ? "border-red-500/30 bg-neutral-900/20" : "border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {/* Move Row Header */}
                      <div 
                        onClick={() => setExpandedMove(isExpanded ? null : slotKey)}
                        className="p-2.5 flex justify-between items-center gap-2 cursor-pointer select-none active:bg-neutral-900/10"
                      >
                        <div className="flex flex-col gap-0.5 min-w-[120px]">
                          <span className="text-xs font-extrabold text-white tracking-wide uppercase line-clamp-1">
                            {mv.name}
                          </span>
                          <span className="text-[9px] text-neutral-400 line-clamp-1 italic font-mono flex items-center gap-1">
                            <span className="text-[10px]">{styling.emoji}</span>
                            <span>{TYPE_TRANSLATIONS[mv.type] || mv.type}</span>
                          </span>
                        </div>

                        {/* Interactive Combat-focused PP Module */}
                        <div className="flex items-center gap-1.5 bg-neutral-900/80 border border-neutral-800/80 rounded px-1.5 py-1">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-neutral-500 tracking-wider leading-none uppercase">PP</span>
                            <span className="text-[10.5px] font-mono font-extrabold text-white leading-tight mt-0.5">
                              {ppCurrentValue} <span className="text-[8.5px] text-neutral-500">/{mv.pp}</span>
                            </span>
                          </div>
                          
                          {/* Live incremental controllers */}
                          <div className="flex gap-1 ml-1">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onUpdatePP(slotKey, ppCurrentValue - 1); 
                              }} 
                              className="w-4.5 h-4.5 bg-neutral-800 border border-white/5 active:bg-red-950 flex items-center justify-center text-[10px] font-mono rounded font-bold text-neutral-300 hover:text-white"
                            >
                              -
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onUpdatePP(slotKey, ppCurrentValue + 1); 
                              }} 
                              className="w-4.5 h-4.5 bg-neutral-800 border border-white/5 active:bg-emerald-950 flex items-center justify-center text-[10px] font-mono rounded font-bold text-neutral-300 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Move details box */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-neutral-900/40 bg-neutral-950/40 text-[10.5px] text-neutral-300 leading-relaxed font-sans flex flex-col gap-2">
                          {/* Move stats block */}
                          <div className="grid grid-cols-2 gap-1 bg-neutral-950/60 p-1.5 rounded border border-white/5 font-mono text-[9.5px]">
                            {mv.damage && (
                              <div className="flex justify-between px-1">
                                <span className="text-neutral-500">Dano:</span>
                                <span className="text-red-400 font-bold">{mv.damage}</span>
                              </div>
                            )}
                            {mv.power !== undefined && (
                              <div className="flex justify-between px-1">
                                <span className="text-neutral-500">Poder:</span>
                                <span className="text-amber-400 font-bold">{mv.power}</span>
                              </div>
                            )}
                            {mv.cost && (
                              <div className="flex justify-between px-1">
                                <span className="text-neutral-500">Custo:</span>
                                <span className="text-neutral-300">{mv.cost}</span>
                              </div>
                            )}
                            {mv.range && (
                              <div className="flex justify-between px-1">
                                <span className="text-neutral-500">Alcance:</span>
                                <span className="text-cyan-400 font-bold">{mv.range}</span>
                              </div>
                            )}
                          </div>

                          {/* Decription */}
                          {mv.description ? (
                            <p className="text-neutral-400 select-text leading-normal bg-neutral-900/20 p-1.5 rounded border border-neutral-800/10 whitespace-pre-wrap">
                              {mv.description}
                            </p>
                          ) : (
                            <p className="text-neutral-600 italic">Sem descrição disponível.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-neutral-500 italic">
                  Nenhum Move configurado para combate.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Collapsible Talentos Module Footer */}
      <div className="mt-auto border-t border-neutral-800 bg-neutral-950 p-2">
        <button 
          onClick={() => setIsTalentsExpanded(!isTalentsExpanded)}
          className="w-full flex items-center justify-between text-[11px] font-black tracking-widest text-neutral-400 hover:text-white transition-colors duration-150 uppercase bg-neutral-900/40 rounded px-2.5 py-1.5 cursor-pointer border border-white/5"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-amber-400" />
            Talentos ({pokemon.talentos?.length || 0})
          </span>
          {isTalentsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <AnimatePresence>
          {isTalentsExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="pt-2 px-1 flex flex-col gap-1.5 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                {pokemon.talentos && pokemon.talentos.length > 0 ? (
                  pokemon.talentos.map((tal: any) => (
                    <div key={tal.id || tal.name} className="p-2 bg-neutral-900/60 rounded border border-white/5 text-[10px] text-left">
                      <span className="font-extrabold text-amber-400 uppercase tracking-wide block mb-0.5">{tal.name}</span>
                      <p className="text-neutral-400 leading-normal select-text">{tal.description}</p>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-neutral-600 block text-center py-2 italic font-medium">Nenhum talento registrado.</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. Close trigger button details */}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-neutral-500 hover:text-white hover:bg-white/5 rounded-md transition-colors duration-150 cursor-pointer md:hidden"
      >
        <span className="text-xs font-bold font-mono px-1">Fechar ×</span>
      </button>
    </motion.div>
  );
}
