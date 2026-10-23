
import React, { useState } from "react";

export default function StreamerOfTheWeek() {
  const [channelUrl, setChannelUrl] = useState("");
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [verifiedChannel, setVerifiedChannel] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!accepted) {
      setMessage("Debes aceptar las condiciones antes de continuar.");
      return;
    }

    if (reason.trim().length < 10 || reason.trim().length > 500) {
      setMessage("El motivo debe tener entre 10 y 500 caracteres.");
      return;
    }

    setLoading(true);

    try {
      // Primer paso: verificar el canal.
      if (!verifiedChannel) {
        const response = await fetch("/api/verify-streamer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelUrl: channelUrl.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data.error || "No se ha podido verificar el canal."
          );
          return;
        }

        if (!data.found || !data.channel?.login) {
          setMessage("No se ha podido confirmar el canal en Twitch.");
          return;
        }

        setVerifiedChannel(data.channel);
        setMessage(
          `Canal verificado: ${data.channel.displayName}. Revisa los datos y pulsa «Enviar nominación» para completar el envío.`
        );

        return;
      }

      // Segundo paso: enviar la recomendación por correo.
      const response = await fetch(
        "/api/submit-streamer-recommendation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelUrl: verifiedChannel.channelUrl || channelUrl.trim(),
            reason: reason.trim(),
            website,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.error ||
            "No se ha podido completar la nominación. Inténtalo de nuevo más tarde."
        );
        return;
      }

      setChannelUrl("");
      setReason("");
      setAccepted(false);
      setVerifiedChannel(null);
      setWebsite("");

      setMessage(
        data.message ||
          "Tu recomendación se ha enviado correctamente. Gracias por ayudar a descubrir comunidades."
      );
    } catch {
      setMessage(
        "No se ha podido conectar con StreamPulse. Comprueba la conexión e inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChannelUrlChange(event) {
    setChannelUrl(event.target.value);
    setVerifiedChannel(null);
    setMessage("");
  }

  const buttonColor = verifiedChannel
    ? "bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-300"
    : "bg-purple-600 hover:bg-purple-500 focus-visible:outline-purple-300";

  return (
    <section className="w-full rounded-2xl border border-purple-500/30 bg-slate-900 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-3xl">
          🎮
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
            Comunidad StreamPulse
          </p>

          <h2 className="text-2xl font-bold tracking-tight">
            Streamer de la semana
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            ¿Conoces a un creador que merezca más visibilidad?
            Recomienda su canal y cuéntanos por qué. La propuesta se envía por correo;
            no guardamos una copia en una base de datos de nominaciones.
          </p>
        </div>

        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300">
          En preparación
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/50 p-5">
        <h3 className="text-lg font-semibold">
          Recomienda un streamer
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Ayúdanos a descubrir creadores y comunidades interesantes. Solo necesitamos
          el enlace público del canal y el motivo. La recomendación se envía por correo;
          no guardamos una copia en una base de datos.
        </p>

        <form onSubmit={handleSubmit} className="relative mt-5 space-y-4">
          <div
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px overflow-hidden"
          >
            <label htmlFor="streamer-website">
              No rellenes este campo
            </label>
            <input
              id="streamer-website"
              name="website"
              type="text"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="streamer-url"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Enlace del canal de Twitch
            </label>

            <input
              id="streamer-url"
              type="text"
              inputMode="url"
              value={channelUrl}
              onChange={handleChannelUrlChange}
              placeholder="https://www.twitch.tv/canal"
              required
              maxLength={300}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
            />
          </div>

          {verifiedChannel && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              {verifiedChannel.profileImageUrl && (
                <img
                  src={verifiedChannel.profileImageUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <span
                    aria-label="Canal verificado"
                    title="Canal verificado"
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
                  >
                    ✓
                  </span>
                  {verifiedChannel.displayName}
                </p>

                <p className="mt-1 text-xs text-emerald-200">
                  Canal verificado correctamente
                </p>

                <a
                  href={verifiedChannel.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-slate-300 underline"
                >
                  Ver canal en Twitch
                </a>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="streamer-reason"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              ¿Por qué lo recomiendas?
            </label>

            <textarea
              id="streamer-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Cuéntanos qué hace especial a este canal..."
              required
              minLength={10}
              maxLength={500}
              rows={4}
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {reason.length}/500 caracteres
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-6 text-slate-300">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              required
              className="mt-1 h-4 w-4 shrink-0 accent-purple-500"
            />

            <span>
              Confirmo que recomiendo un canal público de Twitch.
              Entiendo que esta sugerencia no autoriza a publicar una
              presentación del creador ni a utilizar sus materiales.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-xl px-5 py-3 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonColor}`}
          >
            {loading
              ? verifiedChannel
                ? "Enviando nominación..."
                : "Verificando canal..."
              : verifiedChannel
                ? "Enviar nominación"
                : "Verificar canal"}
          </button>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-xl border p-4 text-sm leading-6 ${
                verifiedChannel
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Verificar un canal no implica que su creador haya aceptado
        participar. Las propuestas deberán revisarse antes de cualquier
        publicación.
      </p>
    </section>
  );
}

