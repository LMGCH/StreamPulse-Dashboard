// src/components/StreamerCard.jsx

import React from 'react';

export const StreamerCard = ({ stream }) => {
  // Miniatura del directo
  const thumbnailUrl = stream.thumbnail_url
    ? stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
    : 'https://placehold.co/440x248/1f1f23/efeff1?text=Sin+miniatura';

  // Formato de espectadores
  const formattedViewers = (stream.viewer_count || 0) >= 1000
    ? `${(stream.viewer_count / 1000).toFixed(1)}k`
    : (stream.viewer_count || 0);

  // Enlace al canal real de Twitch
  const channelUrl = stream.user_login
    ? `https://www.twitch.tv/${encodeURIComponent(stream.user_login)}`
    : null;

  // Si existe el identificador del canal, la tarjeta será un enlace.
  const CardWrapper = channelUrl ? 'a' : 'div';

  const wrapperProps = channelUrl
    ? {
        href: channelUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `Ver el directo de ${stream.user_name} en Twitch (se abre en una pestaña nueva)`,
        title: `Ver a ${stream.user_name} en Twitch`,
      }
    : {};

  return (
    <CardWrapper
      {...wrapperProps}
      className="bg-darkCard rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-twitch/50 group transition-all duration-300 flex flex-col justify-between h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-twitch"
    >
      {/* Miniatura del directo */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        <img
          src={thumbnailUrl}
          alt={`Directo de ${stream.user_name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Etiqueta de EN VIVO */}
        <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded flex items-center gap-1.5 shadow-md">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          En Vivo
        </span>

        {/* Espectadores actuales */}
        <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-zinc-200 text-xs font-semibold px-2 py-1 rounded-md">
          👥 {formattedViewers}
        </span>
      </div>

      {/* Información del directo */}
      <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
        <div>
          <h4
            className="text-sm font-bold text-white line-clamp-2 group-hover:text-twitch transition-colors duration-200"
            title={stream.title}
          >
            {stream.title}
          </h4>

          <p className="text-zinc-300 font-medium text-xs mt-1.5 flex items-center gap-1">
            {stream.user_name}
          </p>
        </div>

        {/* Juego e idioma */}
        <div className="pt-2 border-t border-zinc-800/60 mt-1 flex justify-between items-center">
          <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/40 px-2 py-1 rounded-md max-w-[70%] truncate">
            {stream.game_name || 'Sin categoría'}
          </span>

          <span className="text-[10px] text-zinc-500 font-medium">
            {(stream.language || '—').toUpperCase()}
          </span>
        </div>

        {/* Indicación visual */}
        {channelUrl && (
          <span className="text-[11px] text-zinc-400 group-hover:text-twitch transition-colors pt-1">
            Ver canal en Twitch ↗
          </span>
        )}
      </div>
    </CardWrapper>
  );
};

