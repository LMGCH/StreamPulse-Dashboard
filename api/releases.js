
function getLocalDateMadrid(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Método no permitido',
    });
  }

  const apiKey = process.env.RAWG_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'La API de RAWG no está configurada en el servidor.',
    });
  }

  const today = getLocalDateMadrid();
  const endDate = addDays(today, 30);

  const params = new URLSearchParams({
    key: apiKey,
    dates: `${today},${endDate}`,
    ordering: 'released',
    page_size: '40',
    page: '1',
  });

  try {
    const response = await fetch(
      `https://api.rawg.io/api/games?${params.toString()}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.error('RAWG respondió con HTTP', response.status);

      return res.status(502).json({
        error: 'No se pudieron consultar los lanzamientos.',
      });
    }

    const data = await response.json();

    const games = (data.results ?? [])
      .filter((game) => {
        if (!game.released) return false;
        return game.released >= today && game.released <= endDate;
      })
      .map((game) => ({
        id: game.id,
        name: game.name,
        slug: game.slug,
        released: game.released,
        tba: Boolean(game.tba),
        backgroundImage: game.background_image ?? null,
        platforms: (game.platforms ?? [])
          .map((item) => item.platform?.name)
          .filter(Boolean),
        rawgUrl: `https://rawg.io/games/${game.slug}`,
      }));

    res.setHeader(
      'Cache-Control',
      's-maxage=3600, stale-while-revalidate=86400'
    );

    return res.status(200).json({
      source: 'RAWG',
      attribution: 'Game data provided by RAWG',
      range: { from: today, to: endDate },
      count: games.length,
      totalAvailable: data.count ?? 0,
      games,
    });
  } catch (error) {
    console.error('Error consultando RAWG:', error.name);

    return res.status(502).json({
      error: 'Error de conexión con el catálogo de videojuegos.',
    });
  }
}
