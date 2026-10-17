
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 4096;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return { url, key };
}

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(
    `${config.url}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    const error = new Error(`Supabase HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function readBody(req) {
  // En Vercel, el cuerpo JSON normalmente ya está disponible.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;

    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) {
        throw Object.assign(new Error('Cuerpo demasiado grande'), {
          status: 413,
        });
      }

      try {
        return JSON.parse(req.body);
      } catch {
        throw Object.assign(new Error('JSON no válido'), {
          status: 400,
        });
      }
    }
  }

  // Compatibilidad con peticiones Node sin cuerpo previamente parseado.
  let body = '';
  let bytes = 0;

  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);

    if (bytes > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Cuerpo demasiado grande'), {
        status: 413,
      });
    }

    body += chunk.toString();
  }

  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error('JSON no válido'), {
      status: 400,
    });
  }
}

function isPollOpen(poll, now = Date.now()) {
  if (poll.status !== 'active') return false;

  if (
    poll.starts_at &&
    Date.parse(poll.starts_at) > now
  ) return false;

  if (
    poll.ends_at &&
    Date.parse(poll.ends_at) <= now
  ) return false;

  return true;
}

async function getVoteCount(config, pollId, optionId) {
  const path =
    `poll_votes?select=id` +
    `&poll_id=eq.${encodeURIComponent(pollId)}` +
    `&option_id=eq.${encodeURIComponent(optionId)}`;

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: 'HEAD',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Error consultando votos: HTTP ${response.status}`);
  }

  const contentRange = response.headers.get('content-range');
  const match = contentRange?.match(/\/(\d+)$/);

  return match ? Number(match[1]) : 0;
}

async function getActivePoll(config) {
  const polls = await supabaseRequest(
    config,
    'polls?select=id,question,status,starts_at,ends_at,created_at' +
      '&status=eq.active&limit=1'
  );

  const poll = polls?.[0];

  if (!poll || !isPollOpen(poll)) {
    return { poll: null };
  }

  const options = await supabaseRequest(
    config,
    `poll_options?select=id,option_text,position` +
      `&poll_id=eq.${encodeURIComponent(poll.id)}` +
      '&order=position.asc'
  );

  const results = await Promise.all(
    (options ?? []).map(async (option) => ({
      id: option.id,
      text: option.option_text,
      position: option.position,
      votes: await getVoteCount(config, poll.id, option.id),
    }))
  );

  return {
    poll: {
      id: poll.id,
      question: poll.question,
      startsAt: poll.starts_at,
      endsAt: poll.ends_at,
      options: results,
      totalVotes: results.reduce((sum, option) => sum + option.votes, 0),
    },
  };
}

async function getWeeklyHistory(config) {
  const entries = await supabaseRequest(
    config,
    'weekly_streamers?select=' +
      'week_start,week_end,twitch_user_id,login,display_name,' +
      'language,game_name,representative_viewers,observations_count,' +
      'selection_criterion,source_note,created_at' +
      '&order=week_start.desc&limit=52'
  );

  return { streamers: entries ?? [] };
}

async function registerVote(config, body) {
  const { pollId, optionId, browserId } = body ?? {};

  if (
    typeof pollId !== 'string' ||
    !UUID_PATTERN.test(pollId) ||
    typeof optionId !== 'string' ||
    !UUID_PATTERN.test(optionId) ||
    typeof browserId !== 'string' ||
    !UUID_PATTERN.test(browserId)
  ) {
    return {
      status: 400,
      data: { error: 'Datos de participación no válidos.' },
    };
  }

  const now = new Date();
  const nowMs = now.getTime();

  // La encuesta debe estar activa y dentro de su periodo.
  const polls = await supabaseRequest(
    config,
    `polls?select=id,question,status,starts_at,ends_at` +
      `&id=eq.${encodeURIComponent(pollId)}&limit=1`
  );

  const poll = polls?.[0];

  if (!poll || !isPollOpen(poll, nowMs)) {
    return {
      status: 409,
      data: { error: 'Esta encuesta no está abierta.' },
    };
  }

  // Comprobar que la opción pertenece a esa misma encuesta.
  const options = await supabaseRequest(
    config,
    `poll_options?select=id` +
      `&id=eq.${encodeURIComponent(optionId)}` +
      `&poll_id=eq.${encodeURIComponent(pollId)}&limit=1`
  );

  if (!options?.length) {
    return {
      status: 400,
      data: { error: 'La opción seleccionada no es válida.' },
    };
  }

  // Una participación por navegador y encuesta cada 24 horas.
  const cutoff = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const previousVotes = await supabaseRequest(
    config,
    `poll_votes?select=id` +
      `&poll_id=eq.${encodeURIComponent(pollId)}` +
      `&browser_id=eq.${encodeURIComponent(browserId)}` +
      `&created_at=gte.${encodeURIComponent(cutoff)}` +
      '&limit=1'
  );

  if (previousVotes?.length) {
    return {
      status: 429,
      data: {
        error: 'Ya has participado en esta encuesta durante las últimas 24 horas.',
      },
    };
  }

  await supabaseRequest(config, 'poll_votes', {
    method: 'POST',
    headers: {
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      poll_id: pollId,
      option_id: optionId,
      browser_id: browserId,
    }),
  });

  return {
    status: 201,
    data: { success: true, message: 'Participación registrada.' },
  };
}

export default async function handler(req, res) {
  try {
    const config = getSupabaseConfig();

    if (!config) {
      return res.status(500).json({
        error: 'La conexión con Supabase no está configurada en el servidor.',
      });
    }

    if (req.method === 'GET') {
      const type = req.query?.type;

      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      if (type === 'weekly') {
        return res.status(200).json(
          await getWeeklyHistory(config)
        );
      }

      return res.status(200).json(
        await getActivePoll(config)
      );
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const result = await registerVote(config, body);

      res.setHeader('Cache-Control', 'no-store');

      return res.status(result.status).json(result.data);
    }

    res.setHeader('Allow', 'GET, POST');

    return res.status(405).json({
      error: 'Método no permitido.',
    });
  } catch (error) {
    // No registrar claves, tokens ni cuerpos de las peticiones.
    console.error('Error en /api/polls:', error.status ?? error.name);

    if (error.status === 413 || error.status === 400) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    return res.status(502).json({
      error: 'No se ha podido completar la operación de Comunidad.',
    });
  }
}
