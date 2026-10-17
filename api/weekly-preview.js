
import { timingSafeEqual } from 'node:crypto';

const WINDOW_DAYS = 7;
const MIN_OBSERVATIONS = 12;
const MIN_ACTIVE_DAYS = 3;
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const MAX_RETURNED_CANDIDATES = 30;

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
  return value.trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

async function readObservations(baseUrl, key, cutoff) {
  const url = new URL(
    '/rest/v1/streamer_observations',
    `${baseUrl}/`
  );

  url.searchParams.set(
    'select',
    'twitch_user_id,login,display_name,language,game_name,' +
      'viewer_count,observed_at,observation_hour'
  );
  url.searchParams.set('observed_at', `gte.${cutoff}`);
  url.searchParams.set('language', 'eq.es');
  url.searchParams.set('order', 'observed_at.desc');

  const observations = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${start}-${end}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Supabase HTTP ${response.status}`);
    }

    const batch = await response.json();

    if (!Array.isArray(batch)) {
      throw new Error('Respuesta inesperada de Supabase');
    }

    observations.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return {
        observations,
        truncated: false,
      };
    }
  }

  return {
    observations,
    truncated: true,
  };
}

function classifyCandidates(observations) {
  const groups = new Map();

  for (const observation of observations) {
    if (!observation.twitch_user_id) continue;

    const id = observation.twitch_user_id;

    if (!groups.has(id)) {
      groups.set(id, {
        twitchUserId: id,
        login: observation.login,
        displayName: observation.display_name || observation.login,
        language: observation.language || null,
        gameName: observation.game_name || null,
        viewerTotal: 0,
        maxViewers: 0,
        observationsCount: 0,
        days: new Set(),
        firstObservedAt: observation.observed_at,
        lastObservedAt: observation.observed_at,
      });
    }

    const candidate = groups.get(id);
    const viewers = Number(observation.viewer_count);
    const timestamp = Date.parse(observation.observed_at);

    if (!Number.isFinite(viewers) || !Number.isFinite(timestamp)) {
      continue;
    }

    candidate.viewerTotal += viewers;
    candidate.maxViewers = Math.max(candidate.maxViewers, viewers);
    candidate.observationsCount += 1;
    candidate.days.add(
      new Date(timestamp).toISOString().slice(0, 10)
    );

    if (timestamp < Date.parse(candidate.firstObservedAt)) {
      candidate.firstObservedAt = observation.observed_at;
    }

    if (timestamp > Date.parse(candidate.lastObservedAt)) {
      candidate.lastObservedAt = observation.observed_at;
      candidate.displayName =
        observation.display_name || candidate.displayName;
      candidate.gameName =
        observation.game_name || candidate.gameName;
    }
  }

  return [...groups.values()]
    .map((candidate) => {
      const activeDays = candidate.days.size;
      const count = candidate.observationsCount;

      return {
        twitchUserId: candidate.twitchUserId,
        login: candidate.login,
        displayName: candidate.displayName,
        language: candidate.language,
        gameName: candidate.gameName,
        observationsCount: count,
        activeDays,
        averageViewers: Math.round(
          candidate.viewerTotal / count
        ),
        maxObservedViewers: candidate.maxViewers,
        firstObservedAt: candidate.firstObservedAt,
        lastObservedAt: candidate.lastObservedAt,
        eligibleForFurtherEvaluation:
          count >= MIN_OBSERVATIONS &&
          activeDays >= MIN_ACTIVE_DAYS,
      };
    })
    .sort((a, b) =>
      Number(b.eligibleForFurtherEvaluation) -
        Number(a.eligibleForFurtherEvaluation) ||
      b.activeDays - a.activeDays ||
      b.observationsCount - a.observationsCount ||
      b.averageViewers - a.averageViewers
    );
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'Método no permitido.');
  }

  const previewSecret = process.env.WEEKLY_PREVIEW_SECRET;
  const authorization = req.headers?.authorization ?? '';
  const receivedSecret = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!previewSecret) {
    return jsonError(
      res,
      500,
      'La vista previa no está configurada en el servidor.'
    );
  }

  if (!secretsMatch(receivedSecret, previewSecret)) {
    return jsonError(res, 401, 'No autorizado.');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return jsonError(
      res,
      500,
      'La conexión de lectura no está configurada.'
    );
  }

  try {
    const now = new Date();
    const cutoffDate = new Date(
      now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const { observations, truncated } = await readObservations(
      getSupabaseBaseUrl(supabaseUrl),
      supabaseKey,
      cutoffDate.toISOString()
    );

    const candidates = classifyCandidates(observations);
    const eligibleCount = candidates.filter(
      (candidate) => candidate.eligibleForFurtherEvaluation
    ).length;

    return res.status(200).json({
      ok: true,
      mode: 'preview',
      officialSelectionCreated: false,
      windowDays: WINDOW_DAYS,
      minimumObservations: MIN_OBSERVATIONS,
      minimumActiveDays: MIN_ACTIVE_DAYS,
      observationsRead: observations.length,
      distinctStreamers: candidates.length,
      eligibleCandidates: eligibleCount,
      dataMayBeTruncated: truncated,
      preliminaryOnly: true,
      message: truncated
        ? 'Muestra limitada al máximo de lectura. Los resultados son provisionales.'
        : eligibleCount === 0
          ? 'Todavía no hay candidatos con suficiente historial para una evaluación posterior.'
          : 'Candidatos preparados para una evaluación posterior. No constituyen una selección oficial.',
      candidates: candidates.slice(0, MAX_RETURNED_CANDIDATES),
    });
  } catch (error) {
    console.error(
      'Error en weekly-preview:',
      error.status ?? error.name ?? 'Error'
    );

    return jsonError(
      res,
      502,
      'No se pudieron consultar las observaciones para la simulación.'
    );
  }
}
