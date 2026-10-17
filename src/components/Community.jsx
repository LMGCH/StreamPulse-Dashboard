
import React, { useCallback, useEffect, useState } from 'react';

const BROWSER_ID_KEY = 'streampulse-community-browser-id';

function getBrowserId() {
  try {
    let id = localStorage.getItem(BROWSER_ID_KEY);

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(BROWSER_ID_KEY, id);
    }

    return id;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return 'Fecha pendiente';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Fecha pendiente';

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function StreamerOfTheWeek() {
  const [streamers, setStreamers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch('/api/polls?type=weekly', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('No se pudo consultar el historial.');
        }

        const data = await response.json();

        if (!cancelled) {
          setStreamers(
            Array.isArray(data.streamers) ? data.streamers : []
          );
        }
      } catch {
        if (!cancelled) {
          setError('No podemos cargar el historial en este momento.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = streamers[0];
  const history = streamers.slice(1);

  return (
    <section className="min-w-0 rounded-2xl border border-zinc-800 bg-darkCard p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">🏆</span>
        <div>
          <h3 className="text-xl font-extrabold text-white">
            Streamer de la semana
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Descubrimientos basados en observaciones reales.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-zinc-400">
          Consultando los datos…
        </p>
      ) : error ? (
        <p className="mt-5 text-sm text-amber-300">{error}</p>
      ) : !featured ? (
        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="font-semibold text-white">
            Estamos reuniendo datos para la primera edición.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Cuando haya suficientes observaciones históricas y se registre
            la primera selección semanal, aparecerá aquí. No inventamos
            ganadores ni estadísticas.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Última edición registrada
            </p>
            <h4 className="mt-2 text-2xl font-extrabold text-white">
              {featured.display_name}
            </h4>

            <p className="mt-1 text-sm text-zinc-400">
              {featured.game_name || 'Juego no disponible'}
              {featured.language ? ` · ${featured.language}` : ''}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-zinc-900/70 p-3">
                <p className="text-xs text-zinc-400">
                  Audiencia representativa
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {Number(featured.representative_viewers).toLocaleString('es-ES')}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-900/70 p-3">
                <p className="text-xs text-zinc-400">Observaciones</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {featured.observations_count}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Semana: {formatDate(featured.week_start)} – {formatDate(featured.week_end)}
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Criterio: {featured.selection_criterion}
            </p>
          </div>

          {history.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold text-white">
                Ediciones anteriores
              </h4>
              <ul className="mt-3 divide-y divide-zinc-800">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {item.display_name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDate(item.week_start)} · {item.game_name || 'Juego no disponible'}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-zinc-300">
                      {Number(item.representative_viewers).toLocaleString('es-ES')} espectadores
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CommunityPoll() {
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPoll = useCallback(async () => {
    try {
      setError('');

      const response = await fetch('/api/polls', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar la encuesta.');
      }

      setPoll(data.poll || null);
      setSelectedOption('');
    } catch (err) {
      setError(err.message || 'No se pudo cargar la encuesta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  async function submitVote(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedOption || !poll?.id) {
      setError('Selecciona una opción antes de participar.');
      return;
    }

    const browserId = getBrowserId();

    if (!browserId) {
      setError('No podemos guardar tu identificador local. Revisa la configuración de privacidad del navegador.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pollId: poll.id,
          optionId: selectedOption,
          browserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo registrar tu participación.');
      }

      setMessage(data.message || 'Participación registrada.');
      await loadPoll();
    } catch (err) {
      setError(err.message || 'No se pudo registrar tu participación.');
    } finally {
      setSubmitting(false);
    }
  }

  const options = Array.isArray(poll?.options) ? poll.options : [];
  const totalVotes = Number(poll?.totalVotes || 0);

  return (
    <section className="min-w-0 rounded-2xl border border-zinc-800 bg-darkCard p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">🗳️</span>
        <div>
          <h3 className="text-xl font-extrabold text-white">
            La voz de la comunidad
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Tu opinión ayuda a orientar futuros descubrimientos.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-zinc-400">
          Cargando encuesta…
        </p>
      ) : error && !poll ? (
        <p className="mt-5 text-sm text-amber-300">{error}</p>
      ) : !poll ? (
        <div className="mt-5 rounded-xl border border-zinc-800 p-4">
          <p className="font-semibold text-white">
            No hay ninguna encuesta activa.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Volveremos cuando haya una nueva pregunta para la comunidad.
          </p>
        </div>
      ) : (
        <>
          <h4 className="mt-5 font-bold leading-6 text-white">
            {poll.question}
          </h4>

          <form onSubmit={submitVote} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  selectedOption === option.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <input
                  type="radio"
                  name="community-poll"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={() => setSelectedOption(option.id)}
                  disabled={submitting}
                  className="mt-1 accent-purple-500"
                />
                <span className="min-w-0 flex-1 text-sm leading-5 text-zinc-200">
                  {option.option_text ?? option.text}
                </span>
              </label>
            ))}

            <button
              type="submit"
              disabled={submitting || !selectedOption || options.length === 0}
              className="col-span-1 w-full rounded-xl bg-twitch px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
            >
              {submitting ? 'Registrando…' : 'Participar'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {totalVotes} participaciones registradas
            </p>
            <button
              type="button"
              onClick={loadPoll}
              className="text-xs font-semibold text-purple-300 hover:text-purple-200"
            >
              Actualizar resultados
            </button>
          </div>

          {totalVotes > 0 && (
            <div className="mt-4 space-y-3">
              {options.map((option) => {
                const votes = Number(option.votes || 0);
                const percentage = Math.round((votes / totalVotes) * 100);

                return (
                  <div key={option.id}>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-zinc-300">
                        {option.option_text ?? option.text}
                      </span>
                      <span className="shrink-0 text-zinc-400">
                        {percentage}% · {votes}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-emerald-300">
          {message}
        </p>
      )}

      {error && poll && (
        <p role="alert" className="mt-4 text-sm text-amber-300">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Se permite una participación por navegador cada 24 horas.
        No equivale a un recuento de personas únicas.
      </p>
    </section>
  );
}

export function Community() {
  return (
    <section className="flex-1 space-y-4 sm:space-y-5">
      <header className="rounded-2xl border border-zinc-800 bg-darkCard px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-2xl" aria-hidden="true">
            👥
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-extrabold text-white sm:text-2xl">
              Comunidad StreamPulse
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-zinc-400">
              Descubre streamers, participa y ayúdanos a decidir qué tendencias explorar.
              Sin cifras inventadas y sin necesidad de crear una cuenta para votar.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <StreamerOfTheWeek />
        <CommunityPoll />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-darkCard px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl" aria-hidden="true">
              💬
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                Foro de la comunidad
              </h3>
              <p className="mt-1 text-sm leading-5 text-zinc-400">
                Comparte recomendaciones y descubrimientos con otros visitantes.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
            Próximamente
          </span>
        </div>
      </section>
    </section>
  );
}
