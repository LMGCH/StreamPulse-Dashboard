// src/components/StreamerList.jsx
import React from 'react';
import { StreamerCard } from './StreamerCard';

export const StreamerList = ({ liveStreams, searchTerm = '', onClearSearch }) => {
  // Tomamos los primeros 6 streamers con más tráfico
  const hotStreams = liveStreams.slice(0, 6);

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight">Streamers en Tendencia</h3>
        <p className="text-zinc-400 text-xs mt-0.5">Los primeros canales de la muestra, ordenados por audiencia actual.</p>
      </div>

      {/* Grid Responsivo para las tarjetas */}
      {hotStreams.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-darkCard p-5">
          <p className="text-zinc-300 text-sm">{searchTerm ? `No hay coincidencias para «${searchTerm}» entre los directos cargados.` : 'No hay streams disponibles en la muestra actual.'}</p>
          {searchTerm && onClearSearch && <button type="button" onClick={onClearSearch} className="mt-3 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700">Limpiar búsqueda</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotStreams.map((stream) => (
            <StreamerCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </div>
  );
};
