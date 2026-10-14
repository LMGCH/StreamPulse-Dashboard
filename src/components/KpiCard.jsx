// src/components/KpiCard.jsx
import React from 'react';

export const KpiCard = ({ title, value, icon, description, trend }) => {
  return (
    <div className="bg-darkCard p-6 rounded-2xl border border-zinc-800/80 hover:border-zinc-700/50 transition-all duration-300 flex flex-col justify-between group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
            {title}
          </p>
          <h3 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {value}
          </h3>
        </div>
        <div className="p-3 bg-zinc-800/40 rounded-xl text-xl group-hover:bg-twitch/10 group-hover:text-twitch transition-all duration-300">
          {icon}
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-xs">
        {trend && (
          <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {trend}
          </span>
        )}
        <span className="text-zinc-500 font-medium">{description}</span>
      </div>
    </div>
  );
};
