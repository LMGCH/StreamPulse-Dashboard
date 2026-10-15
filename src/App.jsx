
import React, { useEffect, useMemo, useState } from 'react';
import { getStoredAccessToken, twitchService } from './services/twitchApi';
import { Sidebar } from './components/Sidebar';
import { KpiCard } from './components/KpiCard';
import { TopGamesChart } from './components/TopGamesChart';
import { StreamerList } from './components/StreamerList';
import { FollowersRanking } from './components/FollowersRanking';
import { useTwitch } from './hooks/useTwitch';
import { UpcomingReleases } from './components/UpcomingReleases';
import { RumorMill } from './components/RumorMill';

const normalizeGameName = (name = '') => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

function getHighResolutionBoxArtUrl(boxArtUrl, width = 600, height = 800) {
  if (!boxArtUrl) return '';

  const widthText = String(width);
  const heightText = String(height);

  // La mayoría de endpoints devuelven una plantilla con marcadores.
  let imageUrl = boxArtUrl
    .replaceAll('{width}', widthText)
    .replaceAll('{height}', heightText);

  // Search Categories a veces devuelve una URL ya fijada a 52x72.
  // En ese caso no hay marcadores que sustituir, así que elevamos la resolución.
  if (imageUrl === boxArtUrl) {
    imageUrl = imageUrl.replace(
      /-(\d+)x(\d+)(\.(?:jpe?g|png|webp))(\?.*)?$/i,
      `-${widthText}x${heightText}$3$4`,
    );
  }

  return imageUrl;
}

function GameCover({ game, boxArtUrl }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getHighResolutionBoxArtUrl(boxArtUrl);

  if (!imageUrl || imageFailed) {
    return <span className="text-4xl" aria-hidden="true">🎮</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={`Portada de ${game.name}`}
      loading="lazy"
      onError={() => setImageFailed(true)}
      className="h-full max-w-full object-contain"
    />
  );
}

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('global');
  const { topGames, liveStreams, loading, error, authRequired, connect, refetch } = useTwitch(selectedLanguage);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [selectedRumorId, setSelectedRumorId] = useState('');
  const [gameArtByName, setGameArtByName] = useState({});
  
  const [remoteSearch, setRemoteSearch] = useState({
    categories: [],
    channels: [],
  });
  const [remoteSearchLoading, setRemoteSearchLoading] = useState(false);
  const [remoteSearchDone, setRemoteSearchDone] = useState(false);
  const [remoteSearchError, setRemoteSearchError] = useState('');


  const filteredStreams = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('es');
    if (!query) return liveStreams;
    return liveStreams.filter((stream) =>
      (stream.user_name || '').toLocaleLowerCase('es').includes(query)
      || (stream.title || '').toLocaleLowerCase('es').includes(query)
      || (stream.game_name || '').toLocaleLowerCase('es').includes(query),
    );
  }, [searchTerm, liveStreams]);

  
  useEffect(() => {
    const query = searchTerm.trim();

    if (query.length < 2) {
      setRemoteSearch({ categories: [], channels: [] });
      setRemoteSearchLoading(false);
      setRemoteSearchDone(false);
      setRemoteSearchError('');
      return;
    }

    const token = getStoredAccessToken();

    setRemoteSearch({ categories: [], channels: [] });
    setRemoteSearchDone(false);
    setRemoteSearchError('');

    if (!token) {
      setRemoteSearchLoading(false);
      setRemoteSearchError('Conecta con Twitch para buscar resultados.');
      return;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setRemoteSearchLoading(true);

      try {
        const [categoriesResult, channelsResult] = await Promise.allSettled([
          twitchService.searchCategories(token, query),
          twitchService.searchChannels(token, query),
        ]);

        if (cancelled) return;

        const categoriesOk = categoriesResult.status === 'fulfilled';
        const channelsOk = channelsResult.status === 'fulfilled';

        setRemoteSearch({
          categories: categoriesOk
            ? categoriesResult.value.data ?? []
            : [],
          channels: channelsOk
            ? (channelsResult.value.data ?? []).filter((channel) =>
                selectedLanguage === 'global' || channel.broadcaster_language === selectedLanguage
              )
            : [],
        });

        if (!categoriesOk && !channelsOk) {
          const reason = categoriesResult.reason;
          setRemoteSearchError(
            reason instanceof Error
              ? reason.message
              : 'No se pudieron obtener resultados de Twitch.'
          );
        } else if (!categoriesOk || !channelsOk) {
          setRemoteSearchError(
            'Una de las búsquedas no ha podido completarse. Se muestran los resultados disponibles.'
          );
        }

        setRemoteSearchDone(true);
      } catch {
        if (!cancelled) {
          setRemoteSearchError('Ha ocurrido un error al buscar en Twitch.');
        }
      } finally {
        if (!cancelled) {
          setRemoteSearchLoading(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm, selectedLanguage]);


  const gameRanking = useMemo(() => {
    const gamesById = new Map(topGames.map((game) => [game.id, game]));
    const totals = new Map();
    liveStreams.forEach((stream) => {
      if (!stream.game_name) return;
      const key = stream.game_id || stream.game_name;
      const current = totals.get(key) || {
        id: key,
        name: stream.game_name,
        box_art_url: gamesById.get(stream.game_id)?.box_art_url || '',
        viewers: 0,
        channels: 0,
      };
      current.viewers += Number(stream.viewer_count) || 0;
      current.channels += 1;
      totals.set(key, current);
    });
    return [...totals.values()].sort((a, b) => b.viewers - a.viewers);
  }, [liveStreams, topGames]);

  // Twitch no siempre incluye en topGames las categorías presentes en los directos.
  // Para esas tarjetas, buscamos la categoría por su nombre y guardamos el resultado.
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || gameRanking.length === 0) return undefined;

    let cancelled = false;
    const gamesToLookup = gameRanking
      .filter((game) => {
        if (game.box_art_url) return false;
        const key = normalizeGameName(game.name);
        return key && !Object.prototype.hasOwnProperty.call(gameArtByName, key);
      })
      .slice(0, 50);

    if (gamesToLookup.length === 0) return undefined;

    const foundArt = {};
    let nextIndex = 0;
    const workerCount = Math.min(4, gamesToLookup.length);

    const worker = async () => {
      while (!cancelled && nextIndex < gamesToLookup.length) {
        const game = gamesToLookup[nextIndex++];
        const key = normalizeGameName(game.name);
        try {
          // null significa que la búsqueda se completó pero no encontró carátula exacta.
          foundArt[key] = await twitchService.getCategoryBoxArtByName(token, game.name);
        } catch {
          // No marcamos los errores temporales como resueltos; podrán reintentarse.
        }
      }
    };

    Promise.all(Array.from({ length: workerCount }, () => worker())).then(() => {
      if (!cancelled && Object.keys(foundArt).length > 0) {
        setGameArtByName((current) => ({ ...current, ...foundArt }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameRanking, gameArtByName]);

  const totalObservedViewers = liveStreams.reduce((total, stream) => total + (Number(stream.viewer_count) || 0), 0);
  const formattedViewers = totalObservedViewers >= 1000
    ? `${(totalObservedViewers / 1000).toFixed(1)}K`
    : totalObservedViewers.toLocaleString('es-ES');
  const topGameName = gameRanking[0]?.name || (loading ? 'Cargando…' : 'Sin datos');
  const topGameUrl = gameRanking[0]?.name
  ? `https://www.twitch.tv/search?term=${encodeURIComponent(gameRanking[0].name)}`
  : null;

  return (
    <div className="min-h-screen bg-darkBg text-zinc-100 md:flex">
    
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSelectNews={(item) => {
          setSelectedRumorId(item?.id || '');
          setActiveSection('El mentidero gamer');
        }}
        onOpenAllNews={() => {
          setSelectedRumorId('');
          setActiveSection('El mentidero gamer');
        }}
      />

      <main className="flex min-h-screen min-w-0 flex-1 flex-col p-4 sm:p-6 md:ml-64 md:p-8">
        <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Estadísticas de Twitch</h2>
            <p className="mt-1 text-sm text-zinc-400">Explora directos y juegos por idioma, con datos observados de la API de Twitch.</p>
          </div>
          {!authRequired && (
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <label className="flex shrink-0 flex-col gap-1 text-xs font-semibold text-zinc-400">
                <span>Idioma de los directos</span>
                <select
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  aria-label="Filtrar directos por idioma"
                  className="rounded-xl border border-zinc-800 bg-darkCard px-3 py-2 text-sm text-zinc-100 outline-none focus:border-twitch"
                >
                  <option value="global">🌍 GLOBAL · Todos</option>
                  <option value="es">🇪🇸 ES · Español</option>
                  <option value="en">🇬🇧 EN · Inglés</option>
                  <option value="ja">🇯🇵 JA · Japonés</option>
                  <option value="fr">🇫🇷 FR · Francés</option>
                  <option value="de">🇩🇪 DE · Alemán</option>
                  <option value="it">🇮🇹 IT · Italiano</option>
                  <option value="pt">🇵🇹 PT · Portugués</option>
                </select>
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-3">
              <label className="relative min-w-0 flex-1 md:w-64">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500" aria-hidden="true">🔍</span>
                <input
                  type="search"
                  aria-label="Buscar en los directos cargados"
                  placeholder="Buscar en la muestra: canal, título o juego…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-darkCard py-2 pl-10 pr-4 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-500 focus:border-twitch"
                />
              </label>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="whitespace-nowrap rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-darkHover"
                  aria-label="Limpiar búsqueda"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={loading}
                className="whitespace-nowrap rounded-xl border border-zinc-800 bg-darkCard px-4 py-2 text-sm font-semibold text-zinc-300 transition-all hover:bg-darkHover hover:text-white disabled:opacity-50"
              >
                {loading ? 'Sincronizando…' : '↻ Refrescar'}
              </button>
              </div>
            </div>
          )}
        </header>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {activeSection === 'El mentidero gamer' ? (
          <section className="flex-1">
            <RumorMill
              selectedItemId={selectedRumorId}
              onBack={() => setActiveSection('Próximos lanzamientos')}
            />
          </section>
        ) : activeSection === 'Comunidad' ? (
          <section className="flex-1 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-darkCard p-6 sm:p-8">
              <div className="text-4xl" aria-hidden="true">👥</div>
              <h3 className="mt-4 text-2xl font-extrabold text-white">
                Comunidad StreamPulse
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Un espacio para descubrir juegos, compartir intereses y seguir
                la actualidad gamer. Empezamos por construir los cimientos,
                sin inventar usuarios ni conversaciones.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveSection('Top de Juegos')}
                className="rounded-2xl border border-zinc-800 bg-darkCard p-5 text-left transition hover:border-twitch hover:bg-darkHover"
              >
                <span className="text-2xl" aria-hidden="true">🎮</span>
                <h4 className="mt-3 font-bold text-white">Descubre juegos</h4>
                <p className="mt-1 text-sm leading-5 text-zinc-400">
                  Explora el ranking de juegos basado en la audiencia observada.
                </p>
                <span className="mt-4 block text-sm font-semibold text-purple-300">
                  Explorar juegos →
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('El mentidero gamer')}
                className="rounded-2xl border border-zinc-800 bg-darkCard p-5 text-left transition hover:border-twitch hover:bg-darkHover"
              >
                <span className="text-2xl" aria-hidden="true">📰</span>
                <h4 className="mt-3 font-bold text-white">El Mentidero Gamer</h4>
                <p className="mt-1 text-sm leading-5 text-zinc-400">
                  Consulta el espacio de actualidad y rumores que ya existe.
                </p>
                <span className="mt-4 block text-sm font-semibold text-purple-300">
                  Ir al Mentidero →
                </span>
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-darkCard p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">💬</span>
                <h4 className="text-lg font-bold text-white">Conversaciones</h4>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Este espacio está preparado para futuras conversaciones de la
                comunidad. Todavía no hay publicaciones disponibles.
              </p>
              <span className="mt-4 inline-flex rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                Próximamente
              </span>
            </div>
          </section>
        ) : authRequired ? (
          <section className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-darkCard p-6 text-center shadow-2xl sm:p-10">
              <div className="mb-4 text-5xl" aria-hidden="true">⚡</div>
              <h3 className="text-2xl font-extrabold text-white">Conecta StreamPulse con Twitch</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                Para mostrar estadísticas reales, autoriza la conexión con Twitch. StreamPulse no inventará cifras cuando falten datos.
              </p>
              <button type="button" onClick={connect} className="mt-6 rounded-xl bg-twitch px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline-white">
                Conectar con Twitch
              </button>
              <p className="mt-4 text-xs leading-5 text-zinc-500">
                Necesitas configurar <code className="rounded bg-zinc-800 px-1.5 py-0.5">VITE_TWITCH_CLIENT_ID</code> y registrar la URL de retorno de esta aplicación en el panel de Twitch.
              </p>
            </div>
          </section>
        ) : loading && liveStreams.length === 0 ? (
          <div className="animate-pulse space-y-6" aria-label="Cargando estadísticas">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-darkCard" />
              <div className="h-32 rounded-2xl bg-darkCard" />
              <div className="h-32 rounded-2xl bg-darkCard" />
            </div>
            <div className="h-64 w-full rounded-2xl bg-darkCard" />
          </div>
        ) : (
          <section className="flex-1 space-y-6">

        {searchTerm.trim().length >= 2 && (
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-darkCard p-5">
            <div>
              <h3 className="text-lg font-bold text-white">
                Resultados de búsqueda en Twitch
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Consultas externas a la muestra inicial de directos.
              </p>
            </div>

            {remoteSearchLoading && (
              <p role="status" className="text-sm text-zinc-400">
                Buscando categorías y canales…
              </p>
            )}

            {remoteSearchError && (
              <p role="alert" className="text-sm text-amber-300">
                {remoteSearchError}
              </p>
            )}

            {remoteSearch.categories.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white">Categorías</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {remoteSearch.categories.map((category) => (
                    <a
                      key={category.id}
                      href={`https://www.twitch.tv/search?term=${encodeURIComponent(category.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-200 transition hover:border-twitch hover:bg-darkHover"
                    >
                      🎮 {category.name}
                      <span className="mt-1 block text-xs text-zinc-500">
                        Abrir categoría en Twitch ↗
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {remoteSearch.channels.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white">Canales</h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {remoteSearch.channels.map((channel) => (
                    <a
                      key={channel.id}
                      href={`https://www.twitch.tv/search?term=${encodeURIComponent(channel.display_name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-zinc-800 p-3 transition hover:border-twitch hover:bg-darkHover"
                    >
                      <span className="block font-semibold text-zinc-100">
                        {channel.display_name}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {channel.is_live ? '🔴 En directo' : 'Desconectado'}
                        {channel.game_name ? ` · ${channel.game_name}` : ''}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {remoteSearchDone &&
              !remoteSearchLoading &&
              !remoteSearchError &&
              remoteSearch.categories.length === 0 &&
              remoteSearch.channels.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No se han encontrado categorías ni canales coincidentes.
                </p>
              )}
          </div>
        )}

          {activeSection === 'Dashboard' && (
            <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <KpiCard title="Espectadores observados" value={formattedViewers} icon="👥" description={`Suma de ${liveStreams.length} directos consultados`} />
              <div className="relative">
                <KpiCard
                  title="Juego destacado"
                  value={topGameName}
                  icon="🎮"
                  description="Juego con más audiencia observada en esta muestra"
                />

                {topGameUrl && (
                  <a
                    href={topGameUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Explorar directos de ${topGameName} en Twitch`}
                    title={`Explorar directos de ${topGameName} en Twitch`}
                    className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-twitch"
                  >
                    <span className="sr-only">
                      Explorar directos de {topGameName} en Twitch
                    </span>
                  </a>
                )}
              </div>
              <KpiCard
                title="Directos en la muestra"
                value={liveStreams.length.toLocaleString('es-ES')}
                icon="🎥"
                description={searchTerm ? `${filteredStreams.length.toLocaleString('es-ES')} resultados coinciden con la búsqueda` : 'Hasta 100 directos devueltos por la API'}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2"><TopGamesChart topGames={topGames} liveStreams={liveStreams} /></div>
              <FollowersRanking liveStreams={liveStreams} />
            </div>

            <div aria-live="polite" className="text-xs text-zinc-400">
              {searchTerm
                ? `${filteredStreams.length} resultado(s) de ${liveStreams.length} directos cargados. La búsqueda no consulta todo Twitch.`
                : `La búsqueda se limita a los ${liveStreams.length} directos cargados por la API.`}
            </div>
            <StreamerList liveStreams={filteredStreams} searchTerm={searchTerm} onClearSearch={() => setSearchTerm('')} />
            <p className="border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
              Nota: la audiencia mostrada es una suma de los directos consultados, no una medida de toda Twitch. La API devuelve una muestra limitada y se actualiza aproximadamente cada 60 segundos.
            </p>
          </>
          )}

          {activeSection === 'Top de Juegos' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Top de Juegos por audiencia observada
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Juegos ordenados por la audiencia sumada de los directos consultados en el idioma seleccionado. No representa la audiencia total de Twitch.
                </p>
              </div>

              <TopGamesChart
                topGames={topGames}
                liveStreams={liveStreams}
              />

              {gameRanking.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gameRanking.map((game, index) => {
                    const observedStreams = liveStreams.filter(
                      (stream) => (stream.game_id || stream.game_name) === game.id
                    );

                    const viewers = game.viewers;

                    const gameUrl = `https://www.twitch.tv/search?term=${encodeURIComponent(
                      game.name
                    )}`;

                    return (
                      <a
                        key={game.id}
                        href={gameUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block overflow-hidden rounded-2xl border border-zinc-800 bg-darkCard transition hover:border-twitch hover:bg-darkHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-twitch"
                      >
                      
                        <div className="flex h-56 items-center justify-center bg-zinc-900 p-2">
                          <GameCover
                            key={`${game.id}-${game.box_art_url || gameArtByName[normalizeGameName(game.name)] || 'fallback'}`}
                            game={game}
                            boxArtUrl={game.box_art_url || gameArtByName[normalizeGameName(game.name)] || ''}
                          />
                        </div>
                    
                        <div className="p-5">

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-500">
                              Puesto #{index + 1}
                            </p>
                            <h4 className="mt-1 break-words font-bold text-white">
                              {game.name}
                            </h4>
                          </div>
                          <span aria-hidden="true">↗</span>
                        </div>

                        <p className="mt-4 text-sm text-zinc-300">
                          👥 {viewers.toLocaleString('es-ES')} espectadores observados
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          En {game.channels} directos de la muestra
                        </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-zinc-800 p-6 text-sm text-zinc-400">
                  No hay juegos disponibles en la muestra de este idioma. Prueba GLOBAL u otro idioma.
                </p>
              )}
            </div>
          )}
          
          {activeSection === 'Streamers con más éxito' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Streamers con más éxito
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Consulta los canales cargados, filtra por nombre, título
                  o juego y abre cada canal directamente en Twitch.
                </p>
              </div>

              <FollowersRanking liveStreams={filteredStreams} />

              <StreamerList
                liveStreams={filteredStreams}
                searchTerm={searchTerm}
                onClearSearch={() => setSearchTerm('')}
              />

              <p className="border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
                Se muestran los canales de la muestra cargada por la API.
                El ranking utiliza espectadores actuales, no seguidores
                históricos.
              </p>
            </div>
          )}
          
          {activeSection === 'Próximos lanzamientos' && (
            <div className="space-y-0">
              <UpcomingReleases />
            </div>
          )}

          </section>
        )}
      </main>
    </div>
  );
}

export default App;
