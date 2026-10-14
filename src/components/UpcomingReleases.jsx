import React, { useEffect, useState } from 'react';

function formatReleaseDate(dateString) {
  if (!dateString) return 'Fecha sin especificar';

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getCountdownLabel(game) {
  if (
    !game ||
    game.tba ||
    !game.released ||
    !/^\d{4}-\d{2}-\d{2}$/.test(game.released)
  ) {
    return null;
  }

  const releaseDate = new Date(`${game.released}T00:00:00`);

  if (Number.isNaN(releaseDate.getTime())) {
    return null;
  }

  // Margen conservador de un día por posibles diferencias horarias.
  // La fecha original mostrada en la tarjeta no se modifica.
  releaseDate.setDate(releaseDate.getDate() + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntil = Math.round(
    (releaseDate.getTime() - today.getTime()) / 86400000
  );

  if (daysUntil < 0 || daysUntil > 7) {
    return null;
  }

  if (daysUntil === 0) return '¡Se lanza hoy!';
  if (daysUntil === 1) return '¡Solo queda 1 día!';

  return `¡Quedan ${daysUntil} días!`;
}

export const UpcomingReleases = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadReleases() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/releases', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `No se pudieron cargar los lanzamientos (HTTP ${response.status}).`
          );
        }

        const result = await response.json();

        if (!Array.isArray(result.games)) {
          throw new Error('La respuesta de RAWG no tiene el formato esperado.');
        }

        setData(result);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'No se pudieron cargar los lanzamientos.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReleases();

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Próximos lanzamientos
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Videojuegos con fecha publicada en RAWG durante los próximos 30 días.
          Las fechas pueden variar según el país, la plataforma o el editor.
        </p>
      </div>

      {loading && (
        <div
          role="status"
          className="rounded-2xl border border-zinc-800 bg-darkCard p-6 text-zinc-300"
        >
          <span className="mr-2" aria-hidden="true">⏳</span>
          Consultando próximos lanzamientos...
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-900 bg-darkCard p-6"
        >
          <p className="font-semibold text-white">
            No se han podido cargar los lanzamientos.
          </p>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-twitch px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Recargar página
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">
              <span className="font-bold text-white">
                {data.count ?? data.games.length}
              </span>{' '}
              juegos encontrados
            </p>
            {data.range?.from && data.range?.to && (
              <p className="text-xs text-zinc-500">
                Del {formatReleaseDate(data.range.from)} al{' '}
                {formatReleaseDate(data.range.to)}
              </p>
            )}
          </div>

          {data.games.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-darkCard p-8 text-center">
              <p className="text-lg font-semibold text-white">
                No hay lanzamientos fechados en este intervalo
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Prueba de nuevo más adelante: el catálogo puede actualizarse.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.games.map((game) => (
                <article
                  key={game.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-darkCard transition hover:border-zinc-600"
                >
                  <div className="flex h-52 items-center justify-center overflow-hidden bg-zinc-900">
                    {game.backgroundImage ? (
                      <img
                        src={game.backgroundImage}
                        alt={`Portada de ${game.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="p-6 text-center text-5xl" aria-hidden="true">
                        🎮
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                        {game.tba ? 'Fecha por confirmar' : 'Fecha publicada en RAWG'}
                      </span>
                    </div>
                  
                    <h3 className="text-lg font-bold leading-snug text-white">
                      {game.name}
                    </h3>

                    <p className="text-sm text-zinc-300">
                      <span aria-hidden="true">📅</span>{' '}
                      {formatReleaseDate(game.released)}
                    </p>
                    
                    {getCountdownLabel(game) && (
                      <div
                        role="status"
                        className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-sm font-semibold text-purple-200"
                      >
                        ⏳ {getCountdownLabel(game)}
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Plataformas
                      </p>
                      {game.platforms?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {game.platforms.map((platform) => (
                            <span
                              key={platform}
                              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          Plataformas no especificadas
                        </p>
                      )}
                    </div>

                    <a
                      href={game.rawgUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-purple-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-twitch"
                    >
                      Ver ficha en RAWG <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
          Datos de videojuegos proporcionados por{' '}
          <a
            href="https://rawg.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-purple-300 hover:text-white underline"
          >
            RAWG
          </a>
          . Consulta su catálogo para obtener más información sobre cada juego.
          Las fechas pueden cambiar y su publicación en el catálogo no implica
          necesariamente una confirmación oficial del editor.
          </p>
        </>
      )}
    </div>
  );
};

export default UpcomingReleases;