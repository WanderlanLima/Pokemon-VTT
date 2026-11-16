import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PokemonMoveObject } from '../types';

interface PokemonSheetTabsProps {
  activeTab: 'identity' | 'attributes' | 'moves' | 'effects' | 'config';
  onTabChange: (tab: 'identity' | 'attributes' | 'moves' | 'effects' | 'config') => void;
  pokemonData: any;
  onDataChange: (key: string, value: any) => void;
}

export const PokemonSheetTabs: React.FC<PokemonSheetTabsProps> = ({
  activeTab,
  onTabChange,
  pokemonData,
  onDataChange,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vitality: true,
    identity: true,
    attributes: true,
    moves: true,
    effects: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const tabs = [
    { id: 'identity', label: '🎭 Identidade', icon: '🎭' },
    { id: 'attributes', label: '📊 Atributos', icon: '📊' },
    { id: 'moves', label: '⚡ Movimentos', icon: '⚡' },
    { id: 'effects', label: '✨ Efeitos', icon: '✨' },
    { id: 'config', label: '⚙️ Config', icon: '⚙️' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#050609]">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-white/[0.05] bg-black/40">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-red-650 to-red-750 text-white shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* IDENTITY TAB */}
        {activeTab === 'identity' && (
          <div className="space-y-4">
            {/* Sprite Card */}
            <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                  🎨 Aparência
                </h3>
                <button
                  onClick={() => toggleSection('identity')}
                  className="p-1 hover:bg-white/10 rounded transition-all"
                >
                  {expandedSections.identity ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              </div>

              {expandedSections.identity && (
                <div className="space-y-3">
                  {/* Sprite Preview */}
                  <div className="flex justify-center">
                    <div className="w-32 h-32 bg-[#0c0e14] border-2 border-dashed border-[#ef4444]/30 rounded-xl flex items-center justify-center">
                      <img
                        src={pokemonData.image || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'}
                        alt="sprite"
                        className="w-24 h-24 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  {/* Shiny Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pokemonData.shiny || false}
                      onChange={(e) => onDataChange('shiny', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-neutral-300">Shiny</span>
                  </label>

                  {/* Name & Nickname */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-neutral-400">Espécie</label>
                      <input
                        type="text"
                        value={pokemonData.species || ''}
                        onChange={(e) => onDataChange('species', e.target.value)}
                        className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-neutral-400">Apelido</label>
                      <input
                        type="text"
                        value={pokemonData.nickname || ''}
                        onChange={(e) => onDataChange('nickname', e.target.value)}
                        className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Level & Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-neutral-400">Nível</label>
                      <input
                        type="number"
                        value={pokemonData.level || 1}
                        onChange={(e) => onDataChange('level', parseInt(e.target.value) || 1)}
                        className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-neutral-400">Tamanho</label>
                      <select
                        value={pokemonData.size || 'Medium'}
                        onChange={(e) => onDataChange('size', e.target.value)}
                        className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
                      >
                        <option>Tiny</option>
                        <option>Small</option>
                        <option>Medium</option>
                        <option>Large</option>
                        <option>Huge</option>
                        <option>Gargantuan</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vitality Card */}
            <div className="bg-black/45 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">
                  ❤️ Vitalidade
                </h3>
                <button
                  onClick={() => toggleSection('vitality')}
                  className="p-1 hover:bg-white/10 rounded transition-all"
                >
                  {expandedSections.vitality ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              </div>

              {expandedSections.vitality && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-neutral-400">HP Atual</label>
                      <input
                        type="number"
                        value={pokemonData.hpCurrent || 0}
                        onChange={(e) => onDataChange('hpCurrent', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-neutral-400">HP Máx</label>
                      <input
                        type="number"
                        value={pokemonData.hpMax || 0}
                        onChange={(e) => onDataChange('hpMax', parseInt(e.target.value) || 0)}
                        className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATTRIBUTES TAB */}
        {activeTab === 'attributes' && (
          <div className="space-y-4">
            <div className="bg-black/45 border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-3">
                📊 Atributos RPG
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'].map((attr) => (
                  <div key={attr} className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-neutral-400">{attr}</label>
                    <input
                      type="number"
                      value={pokemonData.attributes?.[attr] || 10}
                      onChange={(e) =>
                        onDataChange('attributes', {
                          ...pokemonData.attributes,
                          [attr]: parseInt(e.target.value) || 10,
                        })
                      }
                      className="w-full bg-[#07090d] text-xs px-2 py-1.5 border border-white/10 rounded-lg focus:outline-none focus:border-red-500 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MOVES TAB */}
        {activeTab === 'moves' && (
          <div className="space-y-4">
            <div className="bg-black/45 border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-3">
                ⚡ Movimentos
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((moveNum) => (
                  <div key={moveNum} className="bg-[#07090d] border border-white/5 rounded-lg p-3 space-y-2">
                    <div className="text-[9px] font-bold text-neutral-400 uppercase">Move {moveNum}</div>
                    <input
                      type="text"
                      placeholder="Nome do movimento"
                      className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                    />
                    <textarea
                      placeholder="Descrição"
                      rows={2}
                      className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500 resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="PP"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="number"
                        placeholder="Dano"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Alcance"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="number"
                        placeholder="Poder"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Duração"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="number"
                        placeholder="BA"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                      <input
                        type="number"
                        placeholder="CD"
                        className="w-full bg-black/60 text-xs px-2 py-1.5 border border-white/10 rounded focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EFFECTS TAB */}
        {activeTab === 'effects' && (
          <div className="space-y-4">
            <div className="bg-black/45 border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-3">
                ✨ Efeitos & Condições
              </h3>
              <p className="text-xs text-neutral-400">Seção de efeitos em desenvolvimento...</p>
            </div>
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="bg-black/45 border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-3">
                ⚙️ Configurações
              </h3>
              <p className="text-xs text-neutral-400">Seção de configurações em desenvolvimento...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
