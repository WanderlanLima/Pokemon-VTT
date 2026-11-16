export interface MapItem {
  id: string;
  name: string;
  url: string;
  gridEnabled: boolean;
  gridSize: number; // in pixels
  gridColor: string;
  gridOpacity: number;
  folderId?: string; // Optional folder association
  gridLineWidth?: number;
  gridType?: 'square' | 'hexH' | 'hexV' | 'iso';
  gridLineType?: 'solid' | 'dashed' | 'dotted';
  gridMeasurement?: string;
  gridUnit?: string;
  ownerId?: string;
  permissions?: {
    canView?: string[];
    canEdit?: string[];
  };
}

export interface MapFolder {
  id: string;
  name: string;
  color?: string; // Optional folder color accent
  ownerId?: string;
  permissions?: {
    canView?: string[];
    canEdit?: string[];
  };
}

export interface CombatSummaryCard {
  id: string;
  pokemonId: string;
  trainerId: string;
  x: number;
  y: number;
  isVisible: boolean;
  isDragging?: boolean;
}

export interface TokenItem {
  id: string;
  name: string;
  url: string;
  x: number; // position relative to the map in pixels
  y: number; // position relative to the map in pixels
  size: number; // multiplier of grid cell (e.g., 1 for Medium, 2 for Large)
  color: string; // border outline/visual accent
  hpCurrent?: number;
  hpMax?: number;
  tempHp?: number;
  snapToGrid?: boolean;
  hideHp?: boolean;
  hideHpBar?: boolean;
  hideHpBarOutOfCombat?: boolean;
  hideHpText?: boolean;
  hideAura?: boolean;
  animatedAuraId?: string;
  auraScale?: number;
  allowTransparency?: boolean;
  trainerId?: string; // Links this token to a permanent trainer record
  pokemonId?: string; // Links this token specifically to a Pokémon in the trainer's party
  mirrored?: boolean; // Horizontal flips / mirrored sprite (saved state)
  level?: number;
  nickname?: string;
  userId?: string; // owner of this token for real-time multiplayer validation
  ownerId?: string;
  permissions?: {
    canView?: string[];
    canEdit?: string[];
  };
  
  // Custom professional aura properties
  auraIntensity?: number;
  auraOpacity?: number;
  auraParticleCount?: number;
  auraAnimationSpeed?: number;
  auraColorPrimary?: string;
  auraColorSecondary?: string;
  auraEnableGlow?: boolean;
  auraEnableDistortion?: boolean;

  // Link Pokémon ↔ Treinador custom properties
  linkEnabled?: boolean;
  linkStyle?: string;
  linkIntensity?: number; // 0 to 200 (percent)
  linkThickness?: number; // 1 to 20
  linkColor?: string;
}

export interface PokemonMoveObject {
  name: string;
  description: string;
  pp: number;
  ppCurrent?: number;
  damage: string;
  cost: string;
  range: string;
  power: number;
  duration: string;
  type: string;
  originalDamage?: string;
  attackBonus?: number; // BA - Bônus de Ataque
  difficultyClass?: number; // CD - Classe de Dificuldade
  attackType?: 'BA' | 'CD'; // Tipo de teste (Bônus de Ataque ou Classe de Dificuldade)
}

export interface CombatSummaryCard {
  id: string;
  pokemonId: string;
  trainerId: string;
  x: number;
  y: number;
  isVisible: boolean;
  isDragging?: boolean;
}

export interface TrainerFolder {
  id: string;
  name: string;
  parentId?: string; // Optional parent folder for unlimited hierarchy
  color?: string;
  createdAt: string;
  ownerId?: string;
  permissions?: {
    canView?: string[];
    canEdit?: string[];
  };
}

export interface TrainerRecord {
  id: string; // unique and permanent identifier (trainerId)
  name: string;
  image: string; // Data URL or imageUrl
  folderId?: string; // Reference to folder id, undefined if in root section
  createdAt: string;
  updatedAt: string;
  userId?: string; // owner of this sheet for multiplayer authorization
  ownerId?: string;
  permissions?: {
    canView?: string[];
    canEdit?: string[];
  };

  // Etapa 2: RPG character sheet properties
  classe?: string;
  nival?: number; // level (called 'level' in standard but can be kept as level/nival)
  experience?: string;
  age?: string;
  height?: string;
  weight?: string;
  appearance?: string;
  history?: string;

  attributeMethod?: "Standard Array" | "Point Buy";
  attributes: {
    FOR: number;
    DES: number;
    CON: number;
    INT: number;
    SAB: number;
    CAR: number;
  };

  skills?: {
    id: string;
    name: string;
    attribute: "FOR" | "DES" | "CON" | "INT" | "SAB" | "CAR";
    isProficient: boolean;
  }[];

  // D&D 5e Perícias Completas
  skillsProficiencies?: {
    atletismo: boolean;
    acrobacia: boolean;
    furtividade: boolean;
    prestidigitacao: boolean;
    arcanismo: boolean;
    historia: boolean;
    investigacao: boolean;
    natureza: boolean;
    religiao: boolean;
    intuicao: boolean;
    lidarComAnimais: boolean;
    medicina: boolean;
    percepcao: boolean;
    sobrevivencia: boolean;
    atuacao: boolean;
    enganacao: boolean;
    intimidacao: boolean;
    persuasao: boolean;
  };

  hpCurrent?: number;
  hpMax?: number;
  armorClass?: number;
  initiative?: number;
  speed?: number; // Deslocamento

  inventory?: {
    id: string;
    name: string;
    quantity: number;
    category: string;
    weight: number;
    description: string;
  }[];

  pokemon?: {
    id: string;
    name: string;
    species: string;
    level: number;
    hpCurrent: number;
    hpMax: number;
    image: string;
    isPc: boolean; // If true, belongs to PC Pokémon. Else Equipe Pokémon.
    revealed?: boolean; // Marks if the Pokémon has been summoned to combat at least once
    ownerId?: string;
    
    // New fields
    speciesId?: number;
    speciesName?: string;
    sprite?: string;
    nickname?: string;
    move1?: string | PokemonMoveObject;
    move2?: string | PokemonMoveObject;
    move3?: string | PokemonMoveObject;
    move4?: string | PokemonMoveObject;
    initiative?: number;
    types?: string[];
    weaknesses?: string[];
    resistances?: string[];
    immunities?: string[];
    talentos?: {
      id: string;
      name: string;
      description: string;
    }[];
    statusStages?: {
      attack: number;
      specialAttack: number;
      defense: number;
      specialDefense: number;
      speed: number;
      accuracy: number;
      evasion: number;
      criticalRange: number;
    };
    statusConditions?: {
      nonVolatile?: string;
      volatile?: string[];
    };
    loyalty?: number;
    loyaltyBonusSkill?: string;
    loyaltySpecialistSkill?: string;
    loyaltyEvolutionEligible?: boolean;
    shiny?: boolean; // S/R - Shiny ou Regular
    size?: string; // Tamanho (Tiny, Small, Medium, Large, Huge, Gargantuan)
  }[];

  feats?: {
    id: string;
    name: string;
    description: string;
    origin: string;
    effects: string;
  }[];

  notes?: string;
  combatSummaryCardOpen?: boolean; // Controla se o card de resumo de combate está aberto
}

export interface Combatant {
  id: string;
  tokenId: string;
  name: string;
  url: string;
  type: 'treinador' | 'pokemon';
  baseInitiative: number;
  dexMod: number;
  tempModifier: number;
  hasAdvantage?: boolean;
  initiativeRoll?: number;
}



