import React, { useMemo } from 'react';

export const FollowersRanking = ({ liveStreams }) => {
  const rankingData = useMemo(() => [...liveStreams]
    .sort((a, b) => (Number(b.viewer_count) || 0) - (Number(a.viewer_count) || 0))
    .slice(0, 15)
    .map((stream, index) => ({
      id: stream.id,
      rank: index + 1,
      name: stream.user_name,
      login: stream.user_login,
      game: stream.game_name || 'Categoría no disponible',
      viewers: Number(stream.viewer_count) || 0,
    })), [liveStreams]);

  return (
    <div className="flex h-[400px] flex-col rounded-2xl border border-zinc-800/80 bg-darkCard p-6">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-white">Streamers con más espectadores</h3>
        <p className="mt-0.5 text-xs text-zinc-400">Top 15 de la muestra consultada, ordenado por espectadores actuales.</p>
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {rankingData.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">No hay directos disponibles para ordenar.</p>
        ) : rankingData.map((streamer) => (
          <div key={streamer.id} className="group flex items-center justify-between rounded-xl border border-zinc-800/40 bg-zinc-800/20 p-3 transition-all duration-200 hover:border-zinc-700/50 hover:bg-darkHover/40">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${streamer.rank === 1 ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : streamer.rank === 2 ? 'border-zinc-400/20 bg-zinc-400/10 text-zinc-300' : streamer.rank === 3 ? 'border-amber-700/20 bg-amber-700/10 text-amber-700' : 'border-transparent bg-zinc-800 text-zinc-500'}`}>{streamer.rank}</span>
              <div className="min-w-0 truncate">
              <a
                href={`https://www.twitch.tv/${encodeURIComponent(streamer.login)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-bold text-white transition-colors group-hover:text-twitch hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-twitch rounded"
                aria-label={`Ver el directo de ${streamer.name} en Twitch, en una pestaña nueva`}
              >
                {streamer.name}
              </a>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {streamer.game}
              </p>
              </div>
            </div>
            <div className="shrink-0 pl-3 text-right">
              <p className="text-xs font-bold text-zinc-300">{streamer.viewers.toLocaleString('es-ES')}</p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500">Espectadores</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
