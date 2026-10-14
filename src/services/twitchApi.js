const API_BASE_URL = 'https://api.twitch.tv/helix';
const AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID?.trim();
const TOKEN_KEY = 'streampulse_twitch_access_token';
const STATE_KEY = 'streampulse_oauth_state';

// Caché de carátulas consultadas por nombre para evitar repetir peticiones.
const categoryBoxArtCache = new Map();

const normalizeCategoryName = (name = '') => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

export class AuthRequiredError extends Error {
  constructor(message = 'Conecta con Twitch para cargar datos reales.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export const getStoredAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const getAccessTokenFromUrl = () => {
  if (!window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('access_token');
  const returnedState = params.get('state');
  const oauthError = params.get('error');
  const oauthErrorDescription = params.get('error_description');

  if (oauthError) {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    throw new Error(oauthErrorDescription || 'Twitch ha rechazado la autorización.');
  }
  if (!token) return null;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expectedState || !returnedState || returnedState !== expectedState) {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    throw new Error('No se pudo validar la respuesta de autorización. Vuelve a conectar con Twitch.');
  }

  localStorage.setItem(TOKEN_KEY, token);
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return token;
};

export const redirectToTwitchAuth = () => {
  if (!CLIENT_ID) {
    throw new Error('Falta VITE_TWITCH_CLIENT_ID. Configúrala en el archivo .env local.');
  }

  const stateBytes = new Uint8Array(24);
  window.crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem(STATE_KEY, state);

  const redirectUri = `${window.location.origin}/`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    state,
  });
  window.location.assign(`${AUTH_URL}?${params.toString()}`);
};

const fetchFromTwitch = async (endpoint, token) => {
  if (!CLIENT_ID) {
    throw new Error('Falta VITE_TWITCH_CLIENT_ID. Configúrala en el archivo .env local.');
  }
  if (!token) throw new AuthRequiredError();

  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    headers: {
      'Client-ID': CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    throw new AuthRequiredError('La sesión de Twitch ha caducado. Vuelve a conectar.');
  }
  if (response.status === 403) {
    throw new Error('Twitch ha denegado la petición. Comprueba la configuración de la aplicación.');
  }
  if (response.status === 429) {
    throw new Error('Se ha alcanzado el límite temporal de peticiones de Twitch. Espera un momento.');
  }
  if (!response.ok) {
    throw new Error(`Twitch respondió con el error HTTP ${response.status}.`);
  }
  return response.json();
};


export const twitchService = {
  getTopGames: (token) => fetchFromTwitch('games/top?first=12', token),

  getLiveStreams: (token, language = 'global') => {
    const params = new URLSearchParams({ first: '100' });
    if (language && language !== 'global') params.set('language', language);
    return fetchFromTwitch(`streams?${params.toString()}`, token);
  },

  searchCategories: (token, query) => {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) return Promise.resolve({ data: [] });

    const params = new URLSearchParams({
      query: normalizedQuery,
      first: '20',
    });

    return fetchFromTwitch(
      `search/categories?${params.toString()}`,
      token
    );
  },

  // Resuelve la carátula mediante el título del juego, no mediante su ID.
  getCategoryBoxArtByName: (token, gameName) => {
    const query = gameName?.trim();
    const cacheKey = normalizeCategoryName(query || '');
    if (!cacheKey) return Promise.resolve(null);

    if (categoryBoxArtCache.has(cacheKey)) {
      return categoryBoxArtCache.get(cacheKey);
    }

    const request = twitchService.searchCategories(token, query)
      .then((response) => {
        const expectedName = normalizeCategoryName(query);
        const match = (response?.data || []).find(
          (category) => normalizeCategoryName(category?.name || '') === expectedName
        );
        return match?.box_art_url || null;
      })
      .catch((error) => {
        // Los fallos temporales no se guardan: podrán reintentarse más adelante.
        categoryBoxArtCache.delete(cacheKey);
        throw error;
      });

    categoryBoxArtCache.set(cacheKey, request);
    return request;
  },

  searchChannels: (token, query) => {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) return Promise.resolve({ data: [] });

    const params = new URLSearchParams({
      query: normalizedQuery,
      first: '20',
    });

    return fetchFromTwitch(
      `search/channels?${params.toString()}`,
      token
    );
  },
};

