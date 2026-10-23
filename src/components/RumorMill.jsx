import React, { useCallback, useEffect, useMemo, useState } from 'react';

const FILTERS = ['Todas', 'Rumor', 'Filtración', 'Fecha / lanzamiento', 'Confirmación / anuncio', 'Novedad'];

function formatDate(value) {
  if (!value) return 'Fecha no indicada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no indicada';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function badgeClass(type) {
  if (type === 'Filtración') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (type === 'Confirmación / anuncio') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (type === 'Rumor') return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
  if (type === 'Fecha / lanzamiento') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  return 'border-zinc-700 bg-zinc-800/70 text-zinc-300';
}

export function RumorMill({ selectedItemId = '', onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [query, setQuery] = useState('');

  const loadItems = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/rumors', { signal, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `No se pudieron consultar los feeds (HTTP ${response.status}).`);
      }
      if (!Array.isArray(result.items)) throw new Error('La respuesta de los feeds no tiene el formato esperado.');
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'No se pudieron cargar las alertas.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadItems(controller.signal);
    return () => controller.abort();
  }, [loadItems]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return (data?.items || []).filter((item) => {
      const matchesType = filter === 'Todas' || item.type === filter;
      const haystack = `${item.title} ${item.summary || ''} ${item.source || ''}`.toLocaleLowerCase('es');
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [data, filter, query]);

  const countByType = useMemo(() => {
    const counts = { Todas: data?.items?.length || 0 };
    for (const item of data?.items || []) counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, [data]);

  const selectedItem = useMemo(() => {
    const items = data?.items || [];
  
    // Si llegamos desde un rumor concreto, respetamos su selección.
    if (selectedItemId) {
      return items.find((item) => item.id === selectedItemId) || null;
    }
  
    // Si entramos desde el Sidebar, mostramos la noticia más reciente.
    return items[0] || null;
  }, [data, selectedItemId]);

  return (
    <section className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">El mentidero gamer</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Rumores, filtraciones y novedades detectadas por Google Alerts. Una alerta es una pista, no una confirmación: abre siempre la fuente original y contrasta la información.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onBack && <button type="button" onClick={onBack} className="rounded-xl border border-zinc-800 bg-darkCard px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-darkHover">← Volver a Próximos lanzamientos</button>}
          <button
            type="button"
            onClick={() => loadItems()}
            disabled={loading}
            className="rounded-xl border border-zinc-800 bg-darkCard px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-darkHover disabled:opacity-50"
          >
            {loading ? 'Consultando…' : '↻ Actualizar'}
          </button>
          </div>
        </div>
      </header>

      {selectedItem && (
        <article className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-darkCard p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(selectedItem.type)}`}>
              {selectedItem.type}
            </span>
            <span className="text-xs text-zinc-500">{formatDate(selectedItem.publishedAt)}</span>
          </div>

          <h3 className="mt-3 break-words text-xl font-extrabold leading-snug text-white sm:text-2xl">
            {selectedItem.title}
          </h3>

          {selectedItem.summary ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
              {selectedItem.summary}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Google Alerts no ha proporcionado un resumen para esta entrada. Consulta la fuente original para leer el desarrollo completo.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
            <a
              href={selectedItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-400"
            >
              Leer noticia original ↗
            </a>
            <p className="text-xs leading-5 text-zinc-500">
              La etiqueta es automática y orientativa; no verifica la veracidad de la información.
            </p>
          </div>
        </article>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-darkCard p-4">
            <p className="text-xs text-zinc-500">Noticias únicas</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{data.total ?? data.items.length}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-darkCard p-4">
            <p className="text-xs text-zinc-500">Feeds activos</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{data.successfulFeeds ?? 0}<span className="text-sm font-medium text-zinc-500"> / {data.configuredFeeds ?? 5}</span></p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-darkCard p-4">
            <p className="text-xs text-zinc-500">Rumores</p>
            <p className="mt-1 text-2xl font-extrabold text-purple-300">{countByType.Rumor || 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-darkCard p-4">
            <p className="text-xs text-zinc-500">Filtraciones</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-300">{countByType.Filtración || 0}</p>
          </div>
        </div>
      )}

      {data?.warning && (
        <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">{data.warning}</p>
      )}

      {loading && !data && (
        <div role="status" className="rounded-2xl border border-zinc-800 bg-darkCard p-6 text-sm text-zinc-300">⏳ Consultando los feeds de Google Alerts…</div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-amber-500/20 bg-darkCard p-5">
          <p className="font-semibold text-white">No se han podido cargar las alertas.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p>
          {error.includes('todavía no están configurados') && (
            <p className="mt-2 text-sm leading-6 text-zinc-400">Configura las cinco variables GOOGLE_ALERTS_RSS_1 … GOOGLE_ALERTS_RSS_5 en el entorno del servidor y vuelve a intentarlo.</p>
          )}
          <button type="button" onClick={() => loadItems()} className="mt-4 rounded-lg bg-twitch px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Reintentar</button>
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Buscar en el mentidero</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar juego, noticia o fuente…"
                className="w-full rounded-xl border border-zinc-800 bg-darkCard px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-twitch"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por tipo</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-darkCard px-3 py-3 text-sm text-zinc-100 outline-none focus:border-twitch sm:w-auto">
                {FILTERS.map((type) => <option key={type} value={type}>{type} ({countByType[type] || 0})</option>)}
              </select>
            </label>
          </div>

          {visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-darkCard p-8 text-center">
              <p className="font-semibold text-white">{data.items.length === 0 ? 'Todavía no hay noticias en los feeds' : 'No hay resultados para este filtro'}</p>
              <p className="mt-2 text-sm text-zinc-400">{data.items.length === 0 ? 'Google Alerts puede tardar un tiempo en encontrar y publicar coincidencias. Vuelve a consultar más adelante.' : 'Prueba con otra búsqueda o selecciona “Todas”.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {visibleItems.map((item) => (
                <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-darkCard p-5 transition hover:border-zinc-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(item.type)}`}>{item.type}</span>
                    <span className="text-xs text-zinc-500">{formatDate(item.publishedAt)}</span>
                  </div>
                  <h3 className="mt-3 break-words text-lg font-bold leading-snug text-white">{item.title}</h3>
                  {item.summary && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-zinc-400">{item.summary}</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-twitch hover:text-white">
                      Leer fuente ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="text-xs leading-5 text-zinc-500">
            Datos procedentes de Google Alerts. La clasificación automática es orientativa y puede equivocarse. Las noticias se deduplican por URL; la consulta se almacena temporalmente en caché en el servidor.
          </p>
        </>
      )}
    </section>
  );
}
