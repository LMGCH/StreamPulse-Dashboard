
import { timingSafeEqual } from 'node:crypto';

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

function secretsMatch(received, expected) {
  if (!received || !expected) return false;

  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  return a.length === b.length && timingSafeEqual(a, b);
}

function getSupabaseBaseUrl(value) {
  return value
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'Método no permitido');
  }

  const captureSecret = process.env.CAPTURE_SECRET;
  const authorization = req.headers?.authorization ?? '';
  const receivedSecret = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!captureSecret) {
    return jsonError(res, 500, 'La captura no está configurada en el servidor.');
  }

  if (!secretsMatch(receivedSecret, captureSecret)) {
    return jsonError(res, 401, 'No autorizado.');
  }

  const clientId =
    process.env.TWITCH_CLIENT_ID ||
    process.env.VITE_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    console.error('Captura: faltan variables de entorno necesarias.');
    return jsonError(res, 500, 'La captura no está configurada por completo.');
  }

  try {
    // 1. Obtener un token de aplicación de Twitch.
    const tokenResponse = await fetch(
      'https://id.twitch.tv/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!tokenResponse.ok) {
      console.error('Twitch token respondió HTTP', tokenResponse.status);
      return jsonError(res, 502, 'No se pudo autenticar con Twitch.');
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return jsonError(res, 502, 'Twitch no devolvió un token válido.');
    }

    // 2. Consultar los directos globales observados en esta captura.
    const streamsResponse = await fetch(
      'https://api.twitch.tv/helix/streams?first=100',
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!streamsResponse.ok) {
      console.error('Twitch streams respondió HTTP', streamsResponse.status);
      return jsonError(res, 502, 'No se pudieron consultar los directos.');
    }

    const streamsData = await streamsResponse.json();
    const streams = streamsData.data ?? [];

    if (streams.length === 0) {
      return res.status(200).json({
        ok: true,
        observed: 0,
        observationHour: null,
        message: 'Twitch no devolvió directos para esta captura.',
      });
    }

    // La misma hora UTC permite evitar duplicados si se repite la ejecución.
    const observationHour = new Date();
    observationHour.setUTCMinutes(0, 0, 0);
    const hourIso = observationHour.toISOString();

    const observations = streams.map((stream) => ({
      twitch_user_id: stream.user_id,
      login: stream.user_login,
      display_name: stream.user_name,
      language: stream.language || null,
      game_name: stream.game_name || null,
      viewer_count: stream.viewer_count,
      stream_started_at: stream.started_at || null,
      observation_hour: hourIso,
    }));

    // 3. Insertar en Supabase. Si el canal ya tiene observación
    // en esta hora UTC, la restricción única evita duplicarla.
    const baseUrl = getSupabaseBaseUrl(supabaseUrl);
    const insertUrl = new URL(
      '/rest/v1/streamer_observations',
      `${baseUrl}/`
    );
    insertUrl.searchParams.set(
      'on_conflict',
      'twitch_user_id,observation_hour'
    );

    const insertResponse = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(observations),
      signal: AbortSignal.timeout(15000),
    });

    if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        
        console.error(
            'Supabase insert respondió HTTP',
            insertResponse.status,
            errorText.slice(0, 1000)
        );
        
        return jsonError(res, 502, 'No se pudieron guardar las observaciones.');
    }

    return res.status(200).json({
      ok: true,
      observed: observations.length,
      observationHour: hourIso,
      message:
        'Captura guardada. El número indica canales procesados, ' +
        'no necesariamente filas nuevas.',
    });
  } catch (error) {
    console.error('Error en la captura:', error.name || 'Error');
    return jsonError(res, 502, 'Error de conexión durante la captura.');
  }
}
