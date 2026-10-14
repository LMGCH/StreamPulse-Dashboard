
import React, { useEffect, useState } from 'react';

function formatRelativeDate(value) {
  if (!value) return 'Fecha no indicada';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Fecha no indicada';

  const hours = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 3600000)
  );

  if (hours < 1) return 'Hace menos de 1 h';
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);

  return `Hace ${days} d`;
}

function typeStyle(type) {
  if (type === 'Filtración') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  if (type === 'Confirmación / anuncio') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (type === 'Rumor') {
    return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
  }

  if (type === 'Fecha / lanzamiento') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  }

  return 'border-zinc-700 bg-zinc-800/70 text-zinc-300';
}

export function RumorTicker({
  onSelect,
  onOpenAll,
  variant = 'default',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const compact = variant === 'sidebar';

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    async function load() {
      try {
        const response = await fetch('/api/rumors', {
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error || 'No se pudieron cargar las novedades.'
          );
        }

        if (!Array.isArray(result.items)) {
          throw new Error(
            'La respuesta RSS no tiene el formato esperado.'
          );
        }

        if (alive) {
          const sortedItems = [...result.items].sort(
            (a, b) =>
              (Date.parse(b.publishedAt || '') || 0) -
              (Date.parse(a.publishedAt || '') || 0)
          );

          setItems(sortedItems.slice(0, compact ? 3 : 4));
          setError('');
        }
      } catch (err) {
        if (alive && err.name !== 'AbortError') {
          setError(
            err.message || 'No se pudieron cargar las novedades.'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [compact]);

  function handleOpenAll() {
    if (onOpenAll) {
      onOpenAll();
      return;
    }

    // Compatibilidad con el comportamiento anterior.
    if (items.length > 0) {
      onSelect?.(items[0]);
    }
  }

  return (
    <section
      aria-labelledby="rumor-ticker-title"
      className={
        compact
          ? 'overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-zinc-950 shadow-lg'
          : 'mt-7 rounded-2xl border border-amber-500/20 bg-darkCard p-4 shadow-lg sm:p-5'
      }
    >
      <header
        className={
          compact
            ? 'border-b border-amber-500/20 p-3'
            : 'mb-4 flex flex-wrap items-start justify-between gap-3'
        }
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🗞️
            </span>

            <h2
              id="rumor-ticker-title"
              className={
                compact
                  ? 'text-sm font-extrabold uppercase tracking-wide text-amber-200'
                  : 'text-lg font-extrabold text-white'
              }
            >
              El Mentidero
            </h2>
          </div>

          <p
            className={
              compact
                ? 'mt-1 text-[11px] leading-4 text-zinc-400'
                : 'mt-1 text-sm text-zinc-400'
            }
          >
            {compact
              ? 'Lo que se cuece en el gaming'
              : 'Pistas, rumores y noticias que quizá todavía no habías visto.'}
          </p>
        </div>

        {!compact && (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
            Radar de novedades
          </span>
        )}
      </header>

      <div
        className={
          compact
            ? 'space-y-0 px-3'
            : 'grid grid-cols-1 gap-2 lg:grid-cols-2'
        }
      >
        {loading ? (
          <p
            role="status"
            className="py-3 text-xs text-zinc-400"
          >
            Buscando novedades…
          </p>
        ) : error ? (
          <p
            role="status"
            className="py-3 text-xs leading-5 text-zinc-400"
          >
            No se han podido cargar las noticias.
          </p>
        ) : items.length === 0 ? (
          <p className="py-3 text-xs leading-5 text-zinc-400">
            Todavía no hay novedades disponibles.
          </p>
        ) : (
          items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item)}
              aria-label={`Abrir noticia: ${item.title}`}
              className={
                compact
                  ? `block w-full py-3 text-left transition-colors hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      index > 0 ? 'border-t border-zinc-800' : ''
                    }`
                  : 'group flex min-w-0 items-start gap-3 rounded-xl border border-zinc-800 bg-black/10 p-3 text-left transition hover:border-amber-500/40 hover:bg-darkHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
              }
            >
              {!compact && (
                <span className="mt-0.5 text-lg" aria-hidden="true">
                  {item.type === 'Filtración'
                    ? '🧩'
                    : item.type === 'Confirmación / anuncio'
                      ? '📣'
                      : item.type === 'Rumor'
                        ? '👀'
                        : '🎮'}
                </span>
              )}

              <span className="block min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${typeStyle(item.type)}`}
                  >
                    {item.type || 'Novedad'}
                  </span>

                  <span className="text-[10px] text-zinc-500">
                    {formatRelativeDate(item.publishedAt)}
                  </span>
                </span>

                <span
                  className={
                    compact
                      ? 'block break-words text-xs font-semibold leading-5 text-zinc-100'
                      : 'block break-words text-sm font-semibold leading-5 text-zinc-100 group-hover:text-white'
                  }
                >
                  {item.title}
                </span>

                {!compact && item.summary && (
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-zinc-400">
                    {item.summary}
                  </span>
                )}
              </span>

              {compact && (
                <span
                  className="mt-1 shrink-0 text-xs text-amber-400"
                  aria-hidden="true"
                >
                  ↗
                </span>
              )}

              {!compact && (
                <span
                  className="mt-1 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-amber-300"
                  aria-hidden="true"
                >
                  ↗
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <footer
        className={
          compact
            ? 'border-t border-amber-500/20 p-3'
            : 'mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3'
        }
      >
        {!compact && (
          <p className="text-xs text-zinc-500">
            Los rumores son pistas, no hechos confirmados.
          </p>
        )}

        <button
          type="button"
          onClick={handleOpenAll}
          className="text-xs font-bold text-amber-300 transition hover:text-white focus-visible:outline-none focus-visible:underline"
        >
          {compact
            ? 'Abrir el Mentidero →'
            : 'Explorar todas las noticias →'}
        </button>
      </footer>
    </section>
  );
}

