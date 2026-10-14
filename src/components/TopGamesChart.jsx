import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const TopGamesChart = ({ topGames, liveStreams }) => {
  const chartData = useMemo(() => {
    const topGamesById = new Map(topGames.map((game) => [game.id, game]));
    const totals = new Map();

    liveStreams.forEach((stream) => {
      if (!stream.game_name) return;
      const key = stream.game_id || stream.game_name;
      const current = totals.get(key) || {
        id: key,
        name: stream.game_name,
        espectadoresObservados: 0,
        canalesObservados: 0,
        boxArtUrl: topGamesById.get(stream.game_id)?.box_art_url || '',
      };
      current.espectadoresObservados += Number(stream.viewer_count) || 0;
      current.canalesObservados += 1;
      totals.set(key, current);
    });

    return [...totals.values()]
      .sort((a, b) => b.espectadoresObservados - a.espectadoresObservados)
      .slice(0, 8)
      .map((game) => ({
        ...game,
        searchUrl: `https://www.twitch.tv/search?term=${encodeURIComponent(game.name)}`,
      }));
  }, [topGames, liveStreams]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const game = payload[0].payload;

    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
        <p className="mb-1 text-sm font-bold text-zinc-200">
          {game.name}
        </p>
        <p className="text-xs font-semibold text-twitch">
          👥 {game.espectadoresObservados.toLocaleString('es-ES')} espectadores observados
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          En {game.canalesObservados} directos de la muestra
        </p>
        <p className="mt-2 text-xs text-zinc-300">
          Pulsa la barra para explorar el juego en Twitch ↗
        </p>
      </div>
    );
  };

  const openGameSearch = (data) => {
    if (data?.searchUrl) {
      window.open(data.searchUrl, '_blank', 'noopener,noreferrer');
    }
  };
  
  
  const renderXAxisTick = ({ x, y, payload }) => {
    const gameName = payload?.value;
  
    if (!gameName) return null;
  
    // Acortar solo la etiqueta visual, nunca el nombre original.
    const visibleName =
      gameName.length > 13
        ? `${gameName.slice(0, 12).trimEnd()}…`
        : gameName;
  
    const searchUrl = `https://www.twitch.tv/search?term=${encodeURIComponent(
      gameName
    )}`;
  
    return (
      <g transform={`translate(${x},${y})`}>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Buscar ${gameName} en Twitch`}
        >
          <title>{gameName}</title>
          <text
            x={0}
            y={0}
            dy={16}
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize={10}
            style={{
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {visibleName}
          </text>
        </a>
      </g>
    );
  };

  return (
    <div className="flex h-[400px] flex-col justify-between rounded-2xl border border-zinc-800/80 bg-darkCard p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold tracking-tight text-white">
          Top de Juegos · audiencia observada
        </h3>
        <p className="mt-0.5 text-xs text-zinc-400">
          Juegos ordenados por los espectadores sumados en la muestra del idioma seleccionado; no representa la audiencia total de Twitch.
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          No hay juegos en la muestra de este idioma.
        </div>
      ) : (
        <div className="min-h-[280px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 5, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              
              <XAxis
                dataKey="name"
                tick={renderXAxisTick}
                interval={0}
                height={45}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000
                    ? `${(value / 1000).toFixed(0)}k`
                    : value
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: '#27272a', opacity: 0.4 }}
              />
              <Bar
                dataKey="espectadoresObservados"
                name="Espectadores observados"
                fill="#9146FF"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
                className="cursor-pointer"
                onClick={(data) => openGameSearch(data)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

