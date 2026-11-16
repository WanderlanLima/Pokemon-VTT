import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, GripHorizontal, Sparkles, ChevronDown, ChevronUp, Zap, Shield, Swords, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Type Colour Map ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { primary: string; secondary: string; glow: string; badge: string; text: string; emoji: string }> = {
  Normal:   { primary: '#a8a878', secondary: '#6d6d4e', glow: 'rgba(168,168,120,0.45)', badge: 'bg-neutral-500/20 border-neutral-400/40 text-neutral-300', text: 'text-neutral-300', emoji: '🔘' },
  Fire:     { primary: '#f08030', secondary: '#c03028', glow: 'rgba(240,128,48,0.55)',   badge: 'bg-orange-500/20 border-orange-400/40 text-orange-300',   text: 'text-orange-400',  emoji: '🔥' },
  Water:    { primary: '#6890f0', secondary: '#445e9c', glow: 'rgba(104,144,240,0.55)',  badge: 'bg-blue-500/20 border-blue-400/40 text-blue-300',         text: 'text-blue-400',    emoji: '💧' },
  Electric: { primary: '#f8d030', secondary: '#b8a038', glow: 'rgba(248,208,48,0.55)',  badge: 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300',   text: 'text-yellow-400',  emoji: '⚡' },
  Grass:    { primary: '#78c850', secondary: '#4e8234', glow: 'rgba(120,200,80,0.50)',   badge: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300', text: 'text-emerald-400', emoji: '🌿' },
  Ice:      { primary: '#98d8d8', secondary: '#638d8d', glow: 'rgba(152,216,216,0.50)', badge: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',         text: 'text-cyan-300',    emoji: '❄️' },
  Fighting: { primary: '#c03028', secondary: '#7d1f1a', glow: 'rgba(192,48,40,0.55)',   badge: 'bg-red-500/20 border-red-400/40 text-red-300',           text: 'text-red-400',     emoji: '💥' },
  Poison:   { primary: '#a040a0', secondary: '#682a68', glow: 'rgba(160,64,160,0.55)',  badge: 'bg-purple-500/20 border-purple-400/40 text-purple-300',   text: 'text-purple-400',  emoji: '💀' },
  Ground:   { primary: '#e0c068', secondary: '#927d44', glow: 'rgba(224,192,104,0.50)', badge: 'bg-amber-600/20 border-amber-500/40 text-amber-300',      text: 'text-amber-500',   emoji: '⛰️' },
  Flying:   { primary: '#a890f0', secondary: '#6d5e9c', glow: 'rgba(168,144,240,0.50)', badge: 'bg-indigo-400/20 border-indigo-300/40 text-indigo-200',  text: 'text-indigo-300',  emoji: '🦅' },
  Psychic:  { primary: '#f85888', secondary: '#a13959', glow: 'rgba(248,88,136,0.55)',  badge: 'bg-pink-500/20 border-pink-400/40 text-pink-300',         text: 'text-pink-400',    emoji: '🔮' },
  Bug:      { primary: '#a8b820', secondary: '#6d7815', glow: 'rgba(168,184,32,0.50)',  badge: 'bg-lime-500/20 border-lime-400/40 text-lime-300',         text: 'text-lime-400',    emoji: '🐛' },
  Rock:     { primary: '#b8a038', secondary: '#786824', glow: 'rgba(184,160,56,0.50)',  badge: 'bg-yellow-700/20 border-yellow-600/40 text-yellow-400',   text: 'text-yellow-500',  emoji: '🪨' },
  Ghost:    { primary: '#705898', secondary: '#493963', glow: 'rgba(112,88,152,0.55)',  badge: 'bg-violet-500/20 border-violet-400/40 text-violet-300',   text: 'text-violet-400',  emoji: '👻' },
  Dragon:   { primary: '#7038f8', secondary: '#4924a1', glow: 'rgba(112,56,248,0.60)',  badge: 'bg-blue-700/20 border-blue-600/40 text-blue-400',         text: 'text-blue-500',    emoji: '🐉' },
  Dark:     { primary: '#705848', secondary: '#49392f', glow: 'rgba(112,88,72,0.50)',   badge: 'bg-neutral-800/30 border-neutral-600/40 text-neutral-400', text: 'text-neutral-400', emoji: '🌑' },
  Steel:    { primary: '#b8b8d0', secondary: '#787887', glow: 'rgba(184,184,208,0.45)', badge: 'bg-zinc-400/20 border-zinc-300/40 text-zinc-200',         text: 'text-zinc-300',    emoji: '⚙️' },
  Fairy:    { primary: '#ee99ac', secondary: '#9b6470', glow: 'rgba(238,153,172,0.55)', badge: 'bg-rose-500/20 border-rose-400/40 text-rose-300',         text: 'text-rose-400',    emoji: '🧚' },
};

const TYPE_TRANSLATIONS: Record<string, string> = {
  Normal: 'Normal', Fire: 'Fogo', Water: 'Água', Electric: 'Elétrico',
  Grass: 'Planta', Ice: 'Gelo', Fighting: 'Lutador', Poison: 'Veneno',
  Ground: 'Terra', Flying: 'Voador', Psychic: 'Psíquico', Bug: 'Inseto',
  Rock: 'Pedra', Ghost: 'Fantasma', Dragon: 'Dragão', Dark: 'Sombrio',
  Steel: 'Aço', Fairy: 'Fada',
};

const STAT_LABELS: Record<string, string> = {
  FOR: 'Força', DES: 'Destreza', CON: 'Constituição',
  INT: 'Inteligência', SAB: 'Sabedoria', CAR: 'Carisma',
};

const STAGE_LABELS: Record<string, { label: string; icon: string }> = {
  attack:         { label: 'Ataque',        icon: '⚔️' },
  specialAttack:  { label: 'Atq. Esp.',     icon: '🔮' },
  defense:        { label: 'Defesa',        icon: '🛡️' },
  specialDefense: { label: 'Def. Esp.',     icon: '📯' },
  speed:          { label: 'Velocidade',    icon: '💨' },
  accuracy:       { label: 'Precisão',      icon: '🎯' },
  evasion:        { label: 'Evasão',        icon: '👣' },
  criticalRange:  { label: 'Crítico',       icon: '💥' },
};

const CONDITION_META: Record<string, { name: string; color: string; icon: string }> = {
  burn:         { name: 'Queimado',          color: '#f43f5e', icon: '🔥' },
  freeze:       { name: 'Congelado',         color: '#38bdf8', icon: '❄️' },
  paralysis:    { name: 'Paralisado',        color: '#eab308', icon: '⚡' },
  poison:       { name: 'Envenenado',        color: '#a855f7', icon: '💀' },
  badly_poison: { name: 'Grav. Envenenado',  color: '#db2777', icon: '☠️' },
  sleep:        { name: 'Dormindo',          color: '#6366f1', icon: '💤' },
  flinch:       { name: 'Atordoado',         color: '#f97316', icon: '😵' },
  confusion:    { name: 'Confuso',           color: '#84cc16', icon: '🌀' },
  infatuation:  { name: 'Encantado',         color: '#ec4899', icon: '💕' },
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface CombatSummaryCardTCGProps {
  tokenId?: string;
  pokemonId: string;
  pokemonData: any;
  trainerId: string;
  x: number;
  y: number;
  isVisible: boolean;
  onClose: () => void;
  onPositionChange: (x: number, y: number) => void;
  calculateMatchups?: (types: string[]) => { weaknesses: string[]; resistances: string[]; immunities: string[] };
  ensureMoveObj?: (m: any) => any;
  onUpdatePP?: (moveSlot: 'move1' | 'move2' | 'move3' | 'move4', newPP: number) => void;
}

// ─── Helper: modifier string ─────────────────────────────────────────────────
function modStr(val: number): string {
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

// ─── Holographic shimmer CSS injected once ───────────────────────────────────
const SHIMMER_STYLE = `
@keyframes tcg-holo-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes tcg-shine {
  0%   { opacity: 0; transform: translateX(-120%) rotate(25deg); }
  40%  { opacity: 0.55; }
  100% { opacity: 0; transform: translateX(220%) rotate(25deg); }
}
@keyframes tcg-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
}
.tcg-holo-border {
  background: linear-gradient(135deg,
    #ff0080, #ff8c00, #ffe000, #00ff80,
    #00cfff, #9b59ff, #ff0080
  );
  background-size: 400% 400%;
  animation: tcg-holo-shift 5s ease infinite;
}
.tcg-card-shine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255,255,255,0.18) 50%,
    transparent 70%
  );
  animation: tcg-shine 4s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}
.tcg-sprite-float {
  animation: tcg-float 3s ease-in-out infinite;
}
`;

// ─── Main Component ──────────────────────────────────────────────────────────
export const CombatSummaryCardTCG: React.FC<CombatSummaryCardTCGProps> = ({
  tokenId,
  pokemonId,
  pokemonData,
  x,
  y,
  isVisible,
  onClose,
  onPositionChange,
  calculateMatchups,
  ensureMoveObj,
  onUpdatePP,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'moves' | 'combate' | 'status'>('moves');
  const [expandedMove, setExpandedMove] = useState<string | null>(null);
  const [isTalentsExpanded, setIsTalentsExpanded] = useState(false);

  // Foil (Holographic shiny overlay) personalization states
  const [showFoilMenu, setShowFoilMenu] = useState<boolean>(false);
  const [foilEnabled, setFoilEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('tcg_foil_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [foilIntensity, setFoilIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('tcg_foil_intensity');
    return saved !== null ? parseInt(saved) : 100;
  });
  const [cardOpacity, setCardOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('tcg_card_opacity');
    return saved !== null ? parseInt(saved) : 100;
  });

  const handleFoilToggle = () => {
    const newVal = !foilEnabled;
    setFoilEnabled(newVal);
    localStorage.setItem('tcg_foil_enabled', String(newVal));
  };

  const handleFoilIntensityChange = (val: number) => {
    setFoilIntensity(val);
    localStorage.setItem('tcg_foil_intensity', String(val));
  };

  const handleCardOpacityChange = (val: number) => {
    setCardOpacity(val);
    localStorage.setItem('tcg_card_opacity', String(val));
  };

  // Inject shimmer CSS once
  useEffect(() => {
    if (!document.getElementById('tcg-shimmer-styles')) {
      const style = document.createElement('style');
      style.id = 'tcg-shimmer-styles';
      style.textContent = SHIMMER_STYLE;
      document.head.appendChild(style);
    }
  }, []);

  // Click outside to close the card
  useEffect(() => {
    const handleOutsideClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !cardRef.current) return;

      // Check if click is inside the card
      if (cardRef.current.contains(target)) {
        return;
      }

      // If they click the toggle button for this card, ignore the click outside so onClick handles the toggle.
      if (tokenId) {
        const triggerBtn = target.closest(`[data-combat-card-trigger="${tokenId}"]`);
        if (triggerBtn) {
          return;
        }
      }

      onClose();
    };

    // Use a delay of 50ms so the click that opened the card does not trigger this close handler
    const timeoutId = setTimeout(() => {
      window.addEventListener('pointerdown', handleOutsideClick, { capture: true });
      window.addEventListener('mousedown', handleOutsideClick, { capture: true });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', handleOutsideClick, { capture: true });
      window.removeEventListener('mousedown', handleOutsideClick, { capture: true });
    };
  }, [onClose, tokenId]);

  // ── Drag logic (global mouse events so card doesn't follow token) ──────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      onPositionChange(newX, newY);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onPositionChange]);

  if (!isVisible || !pokemonData) return null;

  // ── Derived data ────────────────────────────────────────────────────────────
  const mapTypeToEnglishKey = (t: string): string => {
    if (!t) return 'Normal';
    const mapping: Record<string, string> = {
      'normal': 'Normal',
      'fogo': 'Fire', 'fire': 'Fire',
      'água': 'Water', 'agua': 'Water', 'water': 'Water',
      'elétrico': 'Electric', 'eletrico': 'Electric', 'electric': 'Electric',
      'planta': 'Grass', 'grass': 'Grass',
      'gelo': 'Ice', 'ice': 'Ice',
      'lutador': 'Fighting', 'fighting': 'Fighting',
      'veneno': 'Poison', 'poison': 'Poison',
      'terra': 'Ground', 'ground': 'Ground',
      'voador': 'Flying', 'flying': 'Flying',
      'psíquico': 'Psychic', 'psiquico': 'Psychic', 'psychic': 'Psychic',
      'inseto': 'Bug', 'bug': 'Bug',
      'pedra': 'Rock', 'rock': 'Rock',
      'fantasma': 'Ghost', 'ghost': 'Ghost',
      'dragão': 'Dragon', 'dragao': 'Dragon', 'dragon': 'Dragon',
      'sombrio': 'Dark', 'dark': 'Dark',
      'aço': 'Steel', 'aco': 'Steel', 'steel': 'Steel',
      'fada': 'Fairy', 'fairy': 'Fairy'
    };
    const lower = t.trim().toLowerCase();
    return mapping[lower] || 'Normal';
  };

  const primaryType = mapTypeToEnglishKey(pokemonData.types?.[0] || 'Normal');
  const secondaryType = pokemonData.types?.[1] ? mapTypeToEnglishKey(pokemonData.types[1]) : undefined;

  const typeColor = TYPE_COLORS[primaryType] || TYPE_COLORS.Normal;
  const secondaryTypeColor = secondaryType ? (TYPE_COLORS[secondaryType] || TYPE_COLORS.Normal) : null;

  const hpCurrent = pokemonData.hpCurrent ?? 0;
  const hpMax = pokemonData.hpMax ?? 1;
  const hpPercent = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100));
  const hpBarColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444';
  const hpGlow = hpPercent > 50 ? 'rgba(34,197,94,0.6)' : hpPercent > 25 ? 'rgba(245,158,11,0.6)' : 'rgba(239,68,68,0.6)';

  const moves = ensureMoveObj ? [
    { key: 'move1' as const, data: ensureMoveObj(pokemonData.move1) },
    { key: 'move2' as const, data: ensureMoveObj(pokemonData.move2) },
    { key: 'move3' as const, data: ensureMoveObj(pokemonData.move3) },
    { key: 'move4' as const, data: ensureMoveObj(pokemonData.move4) },
  ].filter(m => m.data?.name) : [];

  const matchups = calculateMatchups ? calculateMatchups(pokemonData.types || []) : { weaknesses: [], resistances: [], immunities: [] };

  const parseMatchupString = (item: string) => {
    const match = item.match(/^([A-Za-z]+)\s*×([\d.]+)$/);
    if (match) {
      const type = match[1];
      const mult = match[2];
      const label = `${TYPE_TRANSLATIONS[type] || type} ×${mult}`;
      return { type, label };
    }
    return { type: 'Normal', label: item };
  };

  const stages = pokemonData.statusStages;
  const activeStages = stages ? Object.entries(stages).filter(([, v]) => (v as number) !== 0) : [];
  const conditions = pokemonData.statusConditions;
  const hasConditions = conditions?.nonVolatile || (conditions?.volatile?.length > 0);

  const loyalty = pokemonData.loyalty;

  // ── Loyalty display ─────────────────────────────────────────────────────────
  const loyaltyLabel = loyalty === undefined ? null
    : loyalty >= 3 ? { label: 'Leal', color: '#22c55e', stars: '★★★' }
    : loyalty >= 1 ? { label: 'Amigável', color: '#86efac', stars: '★★☆' }
    : loyalty === 0 ? { label: 'Neutro', color: '#a3a3a3', stars: '★☆☆' }
    : loyalty >= -2 ? { label: 'Desconfiante', color: '#f97316', stars: '☆☆☆' }
    : { label: 'Hostil', color: '#ef4444', stars: '✗✗✗' };

  // ── Card background gradient based on type(s) ──────────────────────────────
  const isOpaque = cardOpacity === 100;

  const cardBg = secondaryTypeColor
    ? `linear-gradient(160deg,
        #0a0c10 0%,
        #0f1118 30%,
        ${typeColor.primary}${isOpaque ? '2c' : '18'} 50%,
        ${secondaryTypeColor.primary}${isOpaque ? '2c' : '18'} 80%,
        #0a0c10 100%
      )`
    : `linear-gradient(160deg,
        #0a0c10 0%,
        #0f1118 30%,
        ${typeColor.primary}${isOpaque ? '2c' : '18'} 60%,
        #0a0c10 100%
      )`;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 9999,
        userSelect: 'none',
        opacity: cardOpacity / 100,
        backgroundColor: '#0a0c10',
        borderRadius: '1rem',
      }}
      className="w-[320px] select-none"
    >
      {/* ── Holographic border wrapper ─────────────────────────────────────── */}
      <div 
        className={`${foilEnabled ? "tcg-holo-border" : ""} p-[2px] rounded-2xl shadow-2xl transition-all duration-300`} 
        style={{
          boxShadow: foilEnabled 
            ? `0 0 ${20 + 10 * (foilIntensity/100)}px ${typeColor.glow.replace(/,[\s]*0\.\d+\)/, `, ${0.45 * (foilIntensity / 100)})`)}, 0 20px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.15)`
            : '0 10px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
          background: foilEnabled 
            ? undefined
            : secondaryTypeColor
              ? `linear-gradient(135deg, ${typeColor.primary}${isOpaque ? 'ff' : '75'}, ${secondaryTypeColor.primary}${isOpaque ? 'ff' : '75'})`
              : `linear-gradient(135deg, ${typeColor.primary}${isOpaque ? 'ff' : '60'}, ${typeColor.secondary}${isOpaque ? 'ff' : '80'})`,
          backgroundSize: foilEnabled ? '400% 400%' : '100% 100%',
        }}
      >
        {/* ── Card inner ─────────────────────────────────────────────────── */}
        <div
          className={`${foilEnabled ? "tcg-card-shine" : ""} relative rounded-[14px] overflow-hidden flex flex-col`}
          style={{ 
            background: cardBg,
            ['--tcg-foil-opacity' as any]: foilEnabled ? (foilIntensity / 100).toFixed(2) : '0',
          }}
        >
          {/* ── Decorative corner energy sparks ─────────────────────────── */}
          <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-30"
            style={{ background: `radial-gradient(circle at 0% 0%, ${typeColor.primary}80, transparent 70%)` }} />
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-30"
            style={{ background: `radial-gradient(circle at 100% 0%, ${secondaryTypeColor ? secondaryTypeColor.primary : typeColor.secondary}80, transparent 70%)` }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none opacity-20"
            style={{ background: `radial-gradient(circle at 0% 100%, ${typeColor.primary}60, transparent 70%)` }} />

          {/* ═══════════════════════════════════════════════════════════════
              HEADER — Name, Level, Drag handle
          ═══════════════════════════════════════════════════════════════ */}
          <div
            className="relative px-3 pt-2.5 pb-2 flex items-center justify-between border-b"
            style={{ borderColor: `${typeColor.primary}30` }}
          >
            {/* Drag grip */}
            <div className="flex items-center gap-2 min-w-0">
              <GripHorizontal className="w-3.5 h-3.5 shrink-0 opacity-40" style={{ color: typeColor.primary }} />
              <div className="min-w-0">
                <h2 className="text-[13px] font-black uppercase tracking-wide text-white leading-none truncate"
                  style={{ textShadow: `0 0 12px ${typeColor.glow}` }}>
                  {pokemonData.nickname || pokemonData.name || 'Pokémon'}
                </h2>
                <p className="text-[9px] text-neutral-400 font-mono mt-0.5 flex items-center gap-1">
                  <span className="opacity-70">{pokemonData.species || pokemonData.name}</span>
                  {pokemonData.shiny && <span className="text-amber-300 font-bold">✨ Shiny</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Level badge */}
              <div className="flex flex-col items-center px-1.5 py-0.5 rounded-lg border"
                style={{ borderColor: `${typeColor.primary}50`, background: `${typeColor.primary}15` }}>
                <span className="text-[7px] font-black uppercase tracking-widest opacity-60" style={{ color: typeColor.primary }}>NV</span>
                <span className="text-[15px] font-black text-white leading-none" style={{ textShadow: `0 0 8px ${typeColor.glow}` }}>
                  {pokemonData.level || 1}
                </span>
              </div>

              {/* Foil Config Button */}
              <button
                data-no-drag
                onClick={(e) => { e.stopPropagation(); setShowFoilMenu(!showFoilMenu); }}
                className={`w-6 h-6 flex items-center justify-center rounded-full border transition-all ${
                  showFoilMenu 
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_6px_rgba(245,158,11,0.25)]" 
                    : "border-white/10 text-neutral-400 hover:text-white hover:border-white/30 hover:bg-white/10"
                } cursor-pointer`}
                title="Configurar Brilho e Opacidade"
              >
                <Sliders className="w-3 h-3" />
              </button>

              {/* Close button */}
              <button
                data-no-drag
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── Foil Menu Config Panel ── */}
          <AnimatePresence>
            {showFoilMenu && (
              <motion.div
                data-no-drag
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-neutral-950/95 border-b border-white/15 px-3 py-2 flex flex-col gap-2 relative z-10"
              >
                <div className="flex items-center justify-between text-[9px] font-bold text-neutral-300">
                  <span className="flex items-center gap-1 uppercase tracking-wide">
                    <Sparkles className="w-3 h-3 text-amber-400" /> EFEITO FOIL (HOLOGRÁFICO)
                  </span>
                  <button
                    onClick={() => handleFoilToggle()}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      foilEnabled 
                        ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 shadow-[0_0_6px_rgba(16,185,129,0.25)]" 
                        : "bg-white/5 text-neutral-400 border border-white/10"
                    }`}
                  >
                    {foilEnabled ? "Ativado" : "Desativado"}
                  </button>
                </div>

                {foilEnabled && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-bold text-neutral-400 uppercase">
                      <span>Intensidade do Brilho</span>
                      <span className="text-amber-400 font-mono">{foilIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={foilIntensity}
                      onChange={(e) => handleFoilIntensityChange(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Opacidade / Transparência Control */}
                <div className="space-y-1 border-t border-white/5 pt-1.5 mt-0.5">
                  <div className="flex justify-between items-center text-[8px] font-bold text-neutral-400 uppercase">
                    <span>Opacidade do Card</span>
                    <span className="text-cyan-400 font-mono">{cardOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="100"
                    step="5"
                    value={cardOpacity}
                    onChange={(e) => handleCardOpacityChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════════
              SPRITE + TYPES + HP — the "art box" of the TCG card
          ═══════════════════════════════════════════════════════════════ */}
          <div className="relative px-3 py-2 flex gap-3 items-start">
            {/* Sprite */}
            <div className="relative shrink-0">
              <div
                className="w-[80px] h-[80px] rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  background: `radial-gradient(circle, ${typeColor.primary}25 0%, ${typeColor.secondary}10 60%, transparent 100%)`,
                  border: `1px solid ${typeColor.primary}30`,
                  boxShadow: `0 0 20px ${typeColor.glow}, inset 0 0 15px ${typeColor.primary}10`,
                }}
              >
                <img
                  src={pokemonData.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png`}
                  alt={pokemonData.name}
                  className="tcg-sprite-float w-[68px] h-[68px] object-contain"
                  style={{ filter: `drop-shadow(0 0 8px ${typeColor.glow}) drop-shadow(0 2px 4px rgba(0,0,0,0.8))` }}
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Loyalty badge below sprite */}
              {loyaltyLabel && (
                <div className="mt-1 text-center">
                  <span className="text-[9px] font-black" style={{ color: loyaltyLabel.color }}>
                    {loyaltyLabel.stars}
                  </span>
                  <span className="block text-[7px] font-bold uppercase tracking-wider" style={{ color: loyaltyLabel.color }}>
                    {loyaltyLabel.label}
                  </span>
                </div>
              )}
            </div>

            {/* Right side: types + HP */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Types */}
              <div className="flex flex-wrap gap-1">
                {(pokemonData.types || []).map((type: string) => {
                  const mappedKey = mapTypeToEnglishKey(type);
                  const tc = TYPE_COLORS[mappedKey] || TYPE_COLORS.Normal;
                  return (
                    <span
                      key={type}
                      className="text-[8px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border"
                      style={{
                        background: `${tc.primary}20`,
                        borderColor: `${tc.primary}50`,
                        color: tc.primary,
                        textShadow: `0 0 6px ${tc.glow}`,
                      }}
                    >
                      {tc.emoji} {TYPE_TRANSLATIONS[mappedKey] || mappedKey}
                    </span>
                  );
                })}
              </div>

              {/* HP */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-neutral-400">PV</span>
                  <span className="text-[10px] font-mono font-black" style={{ color: hpBarColor, textShadow: `0 0 6px ${hpGlow}` }}>
                    {hpCurrent} <span className="text-neutral-500 text-[8px]">/ {hpMax}</span>
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden border border-white/5"
                  style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${hpPercent}%`,
                      background: `linear-gradient(90deg, ${hpBarColor}cc, ${hpBarColor})`,
                      boxShadow: `0 0 8px ${hpGlow}`,
                    }}
                  />
                </div>
              </div>

              {/* Attributes grid (compact 2×3) */}
              <div className="grid grid-cols-3 gap-1">
                {(['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'] as const).map(attr => {
                  const val = pokemonData.attributes?.[attr] ?? 10;
                  const mod = modStr(val);
                  const isPos = !mod.startsWith('-');
                  return (
                    <div key={attr}
                      className="rounded-md px-1 py-0.5 text-center border border-white/5"
                      style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <div className="text-[7px] font-black text-neutral-500 uppercase">{attr}</div>
                      <div className="text-[10px] font-black text-white leading-none">{val}</div>
                      <div className={`text-[7px] font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>{mod}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              ACTIVE STATUS RIBBON
          ═══════════════════════════════════════════════════════════════ */}
          {(hasConditions || activeStages.length > 0) && (
            <div className="mx-3 mb-2 px-2 py-1.5 rounded-lg border border-white/5 flex flex-wrap gap-1"
              style={{ background: 'rgba(0,0,0,0.5)' }}>
              {conditions?.nonVolatile && (() => {
                const cm = CONDITION_META[conditions.nonVolatile];
                return cm ? (
                  <span key={conditions.nonVolatile}
                    className="text-[8px] font-black px-1.5 py-0.5 rounded-full border"
                    style={{ color: cm.color, borderColor: `${cm.color}50`, background: `${cm.color}15` }}>
                    {cm.icon} {cm.name}
                  </span>
                ) : null;
              })()}
              {conditions?.volatile?.map((cId: string) => {
                const cm = CONDITION_META[cId];
                return cm ? (
                  <span key={cId}
                    className="text-[8px] font-black px-1.5 py-0.5 rounded-full border"
                    style={{ color: cm.color, borderColor: `${cm.color}50`, background: `${cm.color}15` }}>
                    {cm.icon} {cm.name}
                  </span>
                ) : null;
              })}
              {activeStages.map(([stageName, val]) => {
                const v = val as number;
                const sm = STAGE_LABELS[stageName];
                if (!sm) return null;
                const isPos = v > 0;
                return (
                  <span key={stageName}
                    className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full border ${isPos ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-rose-400 border-rose-500/40 bg-rose-500/10'}`}>
                    {sm.icon} {sm.label} {isPos ? '+' : ''}{v}
                  </span>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TABS
          ═══════════════════════════════════════════════════════════════ */}
          <div className="flex mx-3 mb-1 gap-1 p-0.5 rounded-lg border border-white/5" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {([
              { id: 'moves', label: `Moves (${moves.length})`, icon: <Swords className="w-2.5 h-2.5" /> },
              { id: 'combate', label: 'Combate', icon: <Shield className="w-2.5 h-2.5" /> },
              { id: 'status', label: 'Estágios', icon: <Zap className="w-2.5 h-2.5" /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                data-no-drag
                onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                className="flex-1 py-1 px-1 rounded-md text-[8px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                style={activeTab === tab.id ? {
                  background: `${typeColor.primary}25`,
                  color: typeColor.primary,
                  border: `1px solid ${typeColor.primary}40`,
                  textShadow: `0 0 6px ${typeColor.glow}`,
                } : {
                  color: '#6b7280',
                  border: '1px solid transparent',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TAB CONTENT
          ═══════════════════════════════════════════════════════════════ */}
          <div className="mx-3 mb-2 rounded-xl overflow-hidden border border-white/5 max-h-[220px] overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.4)', scrollbarWidth: 'thin' }}>
            <AnimatePresence mode="wait">

              {/* ── MOVES TAB ───────────────────────────────────────────── */}
              {activeTab === 'moves' && (
                <motion.div key="moves" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                  className="p-2 flex flex-col gap-1.5">
                  {moves.length > 0 ? moves.map(({ key: slotKey, data: mv }) => {
                    const mappedMvType = mapTypeToEnglishKey(mv.type);
                    const tc = TYPE_COLORS[mappedMvType] || TYPE_COLORS.Normal;
                    const isExpanded = expandedMove === slotKey;
                    const ppCurrent = mv.ppCurrent !== undefined ? mv.ppCurrent : mv.pp;
                    const ppRatio = mv.pp > 0 ? ppCurrent / mv.pp : 0;
                    const ppColor = ppRatio > 0.5 ? '#22c55e' : ppRatio > 0.25 ? '#f59e0b' : '#ef4444';

                    return (
                      <div key={slotKey}
                        className="rounded-lg overflow-hidden border transition-all"
                        style={isExpanded
                          ? { borderColor: `${tc.primary}50`, background: `${tc.primary}08` }
                          : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
                        {/* Move header row */}
                        <div
                          data-no-drag
                          onClick={(e) => { e.stopPropagation(); setExpandedMove(isExpanded ? null : slotKey); }}
                          className="px-2.5 py-2 flex items-center justify-between gap-2 cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black uppercase text-white tracking-wide truncate">{mv.name}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: `${tc.primary}20`, color: tc.primary, border: `1px solid ${tc.primary}40` }}>
                                {tc.emoji} {TYPE_TRANSLATIONS[mappedMvType] || mappedMvType}
                              </span>
                              {mv.damage && (
                                <span className="text-[7.5px] font-mono font-bold text-red-400">{mv.damage}</span>
                              )}
                            </div>
                          </div>

                          {/* PP counter */}
                          <div className="flex items-center gap-1 shrink-0" data-no-drag>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUpdatePP?.(slotKey, ppCurrent - 1); }}
                              className="w-5 h-5 rounded border border-white/10 bg-white/5 hover:bg-red-500/20 text-neutral-300 text-[10px] font-mono flex items-center justify-center transition-colors"
                            >−</button>
                            <div className="flex flex-col items-center min-w-[28px]">
                              <span className="text-[7px] font-black text-neutral-500 uppercase leading-none">PP</span>
                              <span className="text-[10px] font-mono font-black leading-none" style={{ color: ppColor }}>
                                {ppCurrent}<span className="text-[7px] text-neutral-600">/{mv.pp}</span>
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUpdatePP?.(slotKey, ppCurrent + 1); }}
                              className="w-5 h-5 rounded border border-white/10 bg-white/5 hover:bg-emerald-500/20 text-neutral-300 text-[10px] font-mono flex items-center justify-center transition-colors"
                            >+</button>
                          </div>
                        </div>

                        {/* Expanded move details */}
                        {isExpanded && (
                          <div className="px-2.5 pb-2.5 border-t border-white/5 pt-2 flex flex-col gap-1.5">
                            <div className="grid grid-cols-2 gap-1 text-[8.5px] font-mono">
                              {mv.power !== undefined && mv.power > 0 && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">Poder</span>
                                  <span className="text-amber-400 font-bold">{mv.power}</span>
                                </div>
                              )}
                              {mv.damage && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">Dano</span>
                                  <span className="text-red-400 font-bold">{mv.damage}</span>
                                </div>
                              )}
                              {mv.cost && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">Custo</span>
                                  <span className="text-neutral-300 font-bold">{mv.cost}</span>
                                </div>
                              )}
                              {mv.range && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">Alcance</span>
                                  <span className="text-cyan-400 font-bold">{mv.range}</span>
                                </div>
                              )}
                              {mv.attackBonus !== undefined && mv.attackBonus !== 0 && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">BA</span>
                                  <span className="text-emerald-400 font-bold">+{mv.attackBonus}</span>
                                </div>
                              )}
                              {mv.difficultyClass !== undefined && mv.difficultyClass > 0 && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">CD</span>
                                  <span className="text-purple-400 font-bold">{mv.difficultyClass}</span>
                                </div>
                              )}
                              {mv.duration && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30">
                                  <span className="text-neutral-500">Duração</span>
                                  <span className="text-rose-400 font-bold">{mv.duration}</span>
                                </div>
                              )}
                              {mv.attackType && (
                                <div className="flex justify-between px-1.5 py-0.5 rounded border border-white/5 bg-black/30 col-span-2">
                                  <span className="text-neutral-500">Teste</span>
                                  <span className="text-indigo-400 font-bold uppercase tracking-wider">{mv.attackType === 'BA' ? 'Bônus de Ataque (BA)' : mv.attackType === 'CD' ? 'Classe de Dificuldade (CD)' : mv.attackType}</span>
                                </div>
                              )}
                            </div>
                            {mv.description && (
                              <p className="text-[8.5px] text-neutral-400 leading-relaxed bg-black/20 p-1.5 rounded border border-white/5 select-text">
                                {mv.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="py-6 text-center text-[10px] text-neutral-600 italic">Nenhum move configurado.</div>
                  )}
                </motion.div>
              )}

              {/* ── COMBATE TAB ─────────────────────────────────────────── */}
              {activeTab === 'combate' && (
                <motion.div key="combate" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                  className="p-2 flex flex-col gap-2">
                  {/* Matchups */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: '💥 Fraquezas', data: matchups.weaknesses, color: '#ef4444' },
                      { label: '🛡️ Resistências', data: matchups.resistances, color: '#22c55e' },
                      { label: '🌌 Imunidades', data: matchups.immunities, color: '#60a5fa' },
                    ].map(({ label, data, color }) => (
                      <div key={label} className="rounded-lg p-1.5 border border-white/5" style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <div className="text-[7.5px] font-black uppercase tracking-wide mb-1 pb-0.5 border-b border-white/5" style={{ color }}>
                          {label}
                        </div>
                        {data.length > 0 ? data.map(item => {
                          const parsed = parseMatchupString(item);
                          const tc = TYPE_COLORS[parsed.type] || TYPE_COLORS.Normal;
                          return (
                            <div key={item} className="text-[7.5px] font-bold text-white flex items-center gap-0.5 py-0.5">
                              <span>{tc.emoji}</span>
                              <span className="truncate">{parsed.label}</span>
                            </div>
                          );
                        }) : (
                          <span className="text-[7.5px] text-neutral-600 italic">Nenhuma</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Attributes full */}
                  <div className="rounded-lg border border-white/5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="px-2 py-1 border-b border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Atributos & Salvaguardas</span>
                    </div>
                    {(['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'] as const).map(attr => {
                      const val = pokemonData.attributes?.[attr] ?? 10;
                      const mod = modStr(val);
                      const isPos = !mod.startsWith('-');
                      return (
                        <div key={attr} className="flex justify-between items-center px-2 py-1 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full" style={{ background: typeColor.primary }} />
                            <span className="text-[8.5px] font-bold text-neutral-400 uppercase">{STAT_LABELS[attr]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-white">{val}</span>
                            <span className={`text-[8px] font-mono font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>({mod})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── STATUS TAB ──────────────────────────────────────────── */}
              {activeTab === 'status' && (
                <motion.div key="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                  className="p-2 flex flex-col gap-2">
                  {/* Combat stages */}
                  <div className="rounded-lg border border-white/5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="px-2 py-1 border-b border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Estágios de Combate</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0">
                      {stages ? Object.entries(STAGE_LABELS).map(([key, sm]) => {
                        const val = (stages as any)[key] ?? 0;
                        const isPos = val > 0;
                        const isNeg = val < 0;
                        return (
                          <div key={key} className="flex items-center justify-between px-2 py-1 border-b border-r border-white/5 last:border-b-0">
                            <span className="text-[8px] text-neutral-500 flex items-center gap-1">
                              <span>{sm.icon}</span>
                              <span className="truncate">{sm.label}</span>
                            </span>
                            <span className={`text-[9px] font-mono font-black ${isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-neutral-600'}`}>
                              {isPos ? '+' : ''}{val}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="col-span-2 py-4 text-center text-[10px] text-neutral-600 italic">Sem estágios.</div>
                      )}
                    </div>
                  </div>

                  {/* Status conditions */}
                  <div className="rounded-lg border border-white/5 p-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Condições de Status</div>
                    {hasConditions ? (
                      <div className="flex flex-wrap gap-1">
                        {conditions?.nonVolatile && (() => {
                          const cm = CONDITION_META[conditions.nonVolatile];
                          return cm ? (
                            <span key={conditions.nonVolatile}
                              className="text-[8.5px] font-black px-2 py-0.5 rounded-full border"
                              style={{ color: cm.color, borderColor: `${cm.color}50`, background: `${cm.color}15` }}>
                              {cm.icon} {cm.name}
                            </span>
                          ) : null;
                        })()}
                        {conditions?.volatile?.map((cId: string) => {
                          const cm = CONDITION_META[cId];
                          return cm ? (
                            <span key={cId}
                              className="text-[8.5px] font-black px-2 py-0.5 rounded-full border"
                              style={{ color: cm.color, borderColor: `${cm.color}50`, background: `${cm.color}15` }}>
                              {cm.icon} {cm.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span className="text-[9px] text-neutral-600 italic">Sem condições ativas.</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TALENTOS — collapsible footer
          ═══════════════════════════════════════════════════════════════ */}
          {pokemonData.talentos && pokemonData.talentos.length > 0 && (
            <div className="mx-3 mb-3">
              <button
                data-no-drag
                onClick={(e) => { e.stopPropagation(); setIsTalentsExpanded(!isTalentsExpanded); }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-white/5 text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.4)', color: isTalentsExpanded ? typeColor.primary : '#6b7280' }}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  Talentos ({pokemonData.talentos.length})
                </span>
                {isTalentsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {isTalentsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1.5 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                      {pokemonData.talentos.map((tal: any) => (
                        <div key={tal.id || tal.name}
                          className="p-2 rounded-lg border border-white/5 text-[9px]"
                          style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <span className="font-black uppercase tracking-wide block mb-0.5 text-amber-400">{tal.name}</span>
                          <p className="text-neutral-400 leading-relaxed select-text">{tal.description}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              FOOTER — card ID / edition flavour
          ═══════════════════════════════════════════════════════════════ */}
          <div
            className="px-3 py-1.5 flex items-center justify-between border-t"
            style={{ borderColor: `${typeColor.primary}20`, background: 'rgba(0,0,0,0.5)' }}
          >
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-widest">
              VTT Combat Card
            </span>
            <span className="text-[7px] font-mono text-neutral-700 uppercase tracking-widest">
              #{pokemonId.slice(0, 6).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
