const MAX_BODY_BYTES = 2048;

function getLoginFromChannelUrl(value) {
  if (typeof value !== "string" || value.length > 300) return null;

  let url;
  try {
    const input = value.trim();
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    !["twitch.tv", "www.twitch.tv"].includes(url.hostname.toLowerCase()) ||
    url.port || url.username || url.password || url.search || url.hash
  ) return null;

  const match = url.pathname.match(/^\/([a-zA-Z0-9_]{1,25})\/?$/);
  return match ? match[1].toLowerCase() : null;
}

async function verifyTwitchChannel(login) {
  const clientId = process.env.VITE_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Twitch no está configurado.");

  const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenResponse.ok) throw new Error("No se pudo autenticar con Twitch.");
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error("Twitch no devolvió un token válido.");

  const channelResponse = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${tokenData.access_token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!channelResponse.ok) throw new Error("No se pudo consultar el canal en Twitch.");
  const channelData = await channelResponse.json();
  const user = channelData.data?.[0];
  return user ? { login: user.login, channelUrl: `https://www.twitch.tv/${user.login}` } : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return res.status(413).json({ error: "La petición es demasiado grande." });
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "La petición no contiene JSON válido." }); }
    } else if (body && Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
      return res.status(413).json({ error: "La petición es demasiado grande." });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "Datos de la petición no válidos." });
    if (body.website !== undefined && (typeof body.website !== "string" || body.website.trim() !== "")) {
      return res.status(400).json({ error: "No se ha podido procesar la nominación." });
    }

    const login = getLoginFromChannelUrl(body.channelUrl);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!login) return res.status(400).json({ error: "Introduce la URL de un canal válido de Twitch." });
    if (reason.length < 10 || reason.length > 500) return res.status(400).json({ error: "El motivo debe tener entre 10 y 500 caracteres." });

    const scriptUrl = process.env.STREAMPULSE_SCRIPT_URL;
    const secret = process.env.STREAMPULSE_SECRET;
    if (!scriptUrl || !secret) return res.status(500).json({ error: "El servicio de nominaciones no está configurado." });

    let verifiedChannel;
    try { verifiedChannel = await verifyTwitchChannel(login); }
    catch {
      return res.status(502).json({ error: "No se ha podido verificar el canal en Twitch. Inténtalo de nuevo." });
    }
    if (!verifiedChannel) return res.status(404).json({ error: "No hemos encontrado ese canal en Twitch." });

    let emailResponse;
    try {
      emailResponse = await fetch(scriptUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, channelUrl: verifiedChannel.channelUrl, reason }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return res.status(502).json({ ok: false, code: "EMAIL_UNCONFIRMED", error: "No hemos podido confirmar el envío. No guardamos la propuesta para reenviarla automáticamente; puedes intentarlo de nuevo más tarde." });
    }

    let result = null;
    try { result = await emailResponse.json(); } catch { /* respuesta no interpretable */ }

    if (result?.code === "DAILY_LIMIT_REACHED") {
      return res.status(429).json({ ok: false, code: "DAILY_LIMIT_REACHED", error: "Hoy hemos alcanzado el límite diario de recomendaciones. Tu propuesta no se ha enviado; puedes volver a intentarlo mañana." });
    }
    if (result?.code === "MAIL_QUOTA_EXHAUSTED") {
      return res.status(429).json({ ok: false, code: "MAIL_QUOTA_EXHAUSTED", error: "El servicio de correo ha alcanzado su cuota diaria. Tu propuesta no se ha enviado; puedes volver a intentarlo mañana." });
    }
    if (!emailResponse.ok || result?.ok !== true) {
      console.error("[StreamPulse] El servicio de correo no confirmó la nominación.", `HTTP ${emailResponse.status}`);
      return res.status(502).json({ ok: false, code: "EMAIL_UNCONFIRMED", error: "No hemos podido confirmar el envío de la recomendación. No se ha guardado una copia; puedes intentarlo de nuevo más tarde." });
    }

    return res.status(200).json({
      ok: true,
      message: result.nearLimit
        ? "Tu recomendación se ha enviado. Hoy estamos cerca del límite diario de nominaciones. Gracias por ayudar a descubrir comunidades."
        : "Tu recomendación se ha enviado correctamente. Gracias por ayudar a descubrir comunidades.",
      nearLimit: result.nearLimit === true,
    });
  } catch (error) {
    console.error("[StreamPulse] Error procesando nominación:", error instanceof Error ? error.message : "Error desconocido");
    return res.status(500).json({ ok: false, error: "No se ha podido procesar la recomendación. Inténtalo más tarde." });
  }
}
