
 // src/components/Sidebar.jsx

import React from 'react';
import { RumorTicker } from './RumorTicker';

const menuItems = [
  { name: 'Dashboard', icon: '📊' },
  { name: 'Top de Juegos', icon: '🎮' },
  { name: 'Streamers con más éxito', icon: '🎥' },
  { name: 'Próximos lanzamientos', icon: '🗓️' },
];

export const Sidebar = ({
  activeSection,
  onSectionChange,
  onOpenNews,
  onOpenAllNews,
  onSelectNews,
}) => {
  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-zinc-800 bg-darkCard px-3 py-3 md:flex">
      {/* Identidad de Streampulse */}
      <div className="mb-3 flex shrink-0 items-center gap-2 px-2 py-2">
        <span className="text-2xl" aria-hidden="true">
          ⚡
        </span>

        <h1 className="text-xl font-bold tracking-wider text-white">
          Stream<span className="text-twitch">Pulse</span>
        </h1>
      </div>

      {/* Navegación principal compacta */}
      <nav
        className="shrink-0 space-y-0.5"
        aria-label="Navegación principal"
      >
        {menuItems.map((item) => {
          const isActive = activeSection === item.name;

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onSectionChange(item.name)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-twitch text-white shadow-lg shadow-twitch/20'
                  : 'text-zinc-400 hover:bg-darkHover hover:text-white'
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {item.icon}
              </span>

              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Mentidero: ocupa el espacio restante */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Fuera de guion
          </span>

          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-400"
              aria-hidden="true"
            />
            EN EL RADAR
          </span>
        </div>

        <RumorTicker
          variant="sidebar"
          onSelect={onSelectNews || onOpenNews}
          onOpenAll={onOpenAllNews || onOpenNews}
        />
      </div>

      {/* Pie del sidebar */}
      <div className="shrink-0 border-t border-zinc-800 px-2 pt-3 text-[10px] text-zinc-500">
        Proyecto educativo de portfolio
      </div>
    </aside>
  );
};


