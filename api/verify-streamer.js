
const MAX_BODY_BYTES = 2048;

function getTwitchConfig() {
  const clientId = process.env.VITE_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

async function getAppAccessToken({ clientId, clientSecret }) {
  const response = await fetch(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    throw new Error("No se pudo autenticar con Twitch.");
  }

  const data = await response.json();

  if (
    typeof data.access_token !== "string" ||
    !data.access_token
  ) {
    throw new Error("Twitch no devolvió un token válido.");
  }

  return data.access_token;
}

function extractChannelLogin(value) {
  if (typeof value !== "string" || value.length > 300) {
    return null;
  }

  let url;

  try {
    url = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`
    );
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    !["twitch.tv", "www.twitch.tv"].includes(
      url.hostname.toLowerCase()
    ) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }

  const match = url.pathname.match(
    /^\/([a-zA-Z0-9_]{1,25})\/?$/
  );

  if (!match) {
    return null;
  }

  return match[1].toLowerCase();
}

async function verifyChannel(login, config) {
  const token = await getAppAccessToken(config);

  const response = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
    {
      headers: {
        "Client-Id": config.clientId,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    throw new Error("No se pudo consultar el canal en Twitch.");
  }

  const data = await response.json();
  const user = data.data?.[0];

  if (!user) {
    return { found: false };
  }

  return {
    found: true,
    channel: {
      login: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      channelUrl: `https://www.twitch.tv/${user.login}`,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        return res.status(413).json({
          error: "La petición es demasiado grande.",
        });
      }

      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: "La petición no contiene JSON válido.",
        });
      }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        error: "Datos de la petición no válidos.",
      });
    }

    const login = extractChannelLogin(body.channelUrl);

    if (!login) {
      return res.status(400).json({
        error: "Introduce la URL de un canal válido de Twitch.",
      });
    }

    const config = getTwitchConfig();

    if (!config) {
      return res.status(500).json({
        error: "La verificación de Twitch no está configurada en el servidor.",
      });
    }

    const result = await verifyChannel(login, config);

    if (!result.found) {
      return res.status(404).json({
        found: false,
        error: "No hemos encontrado ese canal en Twitch. Comprueba el enlace.",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Error en /api/verify-streamer:",
      error.name ?? "Error"
    );

    return res.status(502).json({
      error: "Twitch no está disponible para verificar el canal ahora mismo. Inténtalo de nuevo.",
    });
  }
}
