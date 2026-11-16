import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TrainerSkillsSheetProps {
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
  attributes: {
    FOR: number;
    DES: number;
    CON: number;
    INT: number;
    SAB: number;
    CAR: number;
  };
  proficiencyBonus: number;
  onSkillChange: (skill: string, isProficient: boolean) => void;
}

const SKILLS_D5E = [
  { id: 'atletismo', name: 'Atletismo', attribute: 'FOR', description: 'Força e resistência física' },
  { id: 'acrobacia', name: 'Acrobacia', attribute: 'DES', description: 'Equilíbrio e coordenação' },
  { id: 'furtividade', name: 'Furtividade', attribute: 'DES', description: 'Mover-se silenciosamente' },
  { id: 'prestidigitacao', name: 'Prestidigitação', attribute: 'DES', description: 'Manipulação de objetos' },
  { id: 'arcanismo', name: 'Arcanismo', attribute: 'INT', description: 'Conhecimento de magia' },
  { id: 'historia', name: 'História', attribute: 'INT', description: 'Conhecimento histórico' },
  { id: 'investigacao', name: 'Investigação', attribute: 'INT', description: 'Análise e dedução' },
  { id: 'natureza', name: 'Natureza', attribute: 'INT', description: 'Conhecimento da natureza' },
  { id: 'religiao', name: 'Religião', attribute: 'INT', description: 'Conhecimento religioso' },
  { id: 'intuicao', name: 'Intuição', attribute: 'SAB', description: 'Percepção emocional' },
  { id: 'lidarComAnimais', name: 'Lidar com Animais', attribute: 'SAB', description: 'Interagir com animais' },
  { id: 'medicina', name: 'Medicina', attribute: 'SAB', description: 'Conhecimento médico' },
  { id: 'percepcao', name: 'Percepção', attribute: 'SAB', description: 'Observação aguçada' },
  { id: 'sobrevivencia', name: 'Sobrevivência', attribute: 'SAB', description: 'Rastrear e sobreviver' },
  { id: 'atuacao', name: 'Atuação', attribute: 'CAR', description: 'Representação e atuação' },
  { id: 'enganacao', name: 'Enganação', attribute: 'CAR', description: 'Mentir e enganar' },
  { id: 'intimidacao', name: 'Intimidação', attribute: 'CAR', description: 'Ameaçar e intimidar' },
  { id: 'persuasao', name: 'Persuasão', attribute: 'CAR', description: 'Convencer e influenciar' },
];

export const TrainerSkillsSheet: React.FC<TrainerSkillsSheetProps> = ({
  skillsProficiencies = {},
  attributes,
  proficiencyBonus,
  onSkillChange,
}) => {
  const [expandedAttribute, setExpandedAttribute] = React.useState<string | null>('FOR');

  const attributeLabels: Record<string, string> = {
    FOR: '💪 Força',
    DES: '🤸 Destreza',
    CON: '🛡️ Constituição',
    INT: '🧠 Inteligência',
    SAB: '👁️ Sabedoria',
    CAR: '✨ Carisma',
  };

  const groupedSkills = SKILLS_D5E.reduce((acc, skill) => {
    if (!acc[skill.attribute]) acc[skill.attribute] = [];
    acc[skill.attribute].push(skill);
    return acc;
  }, {} as Record<string, typeof SKILLS_D5E>);

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider border-b border-white/10 pb-2">
        📜 Perícias D&D 5e
      </h3>

      {Object.entries(groupedSkills).map(([attribute, skills]) => {
        const isExpanded = expandedAttribute === attribute;
        const attrValue = attributes[attribute as keyof typeof attributes] || 10;
        const attrMod = Math.floor((attrValue - 10) / 2);

        return (
          <div key={attribute} className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
            {/* Attribute Header */}
            <button
              onClick={() => setExpandedAttribute(isExpanded ? null : attribute)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-white">
                  {attributeLabels[attribute]}
                </span>
                <span className="text-[9px] font-mono text-amber-400 font-bold">
                  {attrMod >= 0 ? '+' : ''}{attrMod}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {/* Skills List */}
            {isExpanded && (
              <div className="border-t border-white/10 p-2 space-y-2 bg-black/20">
                {skills.map((skill) => {
                  const isProficient = (skillsProficiencies as any)[skill.id] || false;
                  const skillMod = attrMod + (isProficient ? proficiencyBonus : 0);
                  const skillModStr = skillMod >= 0 ? `+${skillMod}` : `${skillMod}`;

                  return (
                    <label
                      key={skill.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                        isProficient
                          ? 'bg-emerald-950/40 border border-emerald-500/30'
                          : 'bg-transparent border border-transparent hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isProficient}
                        onChange={(e) => onSkillChange(skill.id, e.target.checked)}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold text-white">{skill.name}</div>
                        <div className="text-[8px] text-neutral-500">{skill.description}</div>
                      </div>
                      <div className="text-[10px] font-mono font-black text-amber-400 shrink-0">
                        {skillModStr}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
