import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AuthRequiredError,
  getAccessTokenFromUrl,
  getStoredAccessToken,
  redirectToTwitchAuth,
  twitchService,
} from '../services/twitchApi';

export const useTwitch = (language = 'global') => {
  const [topGames, setTopGames] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const requestId = useRef(0);

  const fetchDashboardData = useCallback(async (tokenOverride, languageOverride = language) => {
    const token = tokenOverride || accessToken || getStoredAccessToken();
    if (!token) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const [gamesResponse, streamsResponse] = await Promise.all([
        twitchService.getTopGames(token),
        twitchService.getLiveStreams(token, languageOverride),
      ]);
      if (currentRequestId !== requestId.current) return;
      setTopGames(Array.isArray(gamesResponse?.data) ? gamesResponse.data : []);
      setLiveStreams(Array.isArray(streamsResponse?.data) ? streamsResponse.data : []);
      setAuthRequired(false);
    } catch (err) {
      if (currentRequestId !== requestId.current) return;
      if (err instanceof AuthRequiredError) {
        setAccessToken(null);
        setAuthRequired(true);
      }
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos de Twitch.');
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [accessToken, language]);

  useEffect(() => {
    let token = null;
    try {
      token = getAccessTokenFromUrl() || getStoredAccessToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la autorización de Twitch.');
    }

    if (token) {
      setAccessToken(token);
      setAuthRequired(false);

    } else {
      setAuthRequired(true);
      setLoading(false);
    }
  // Solo inicializamos la sesión una vez; la función recibe el token explícitamente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!accessToken || authRequired) return undefined;
    void fetchDashboardData(accessToken, language);
    const intervalId = window.setInterval(() => {
      void fetchDashboardData(accessToken, language);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [accessToken, authRequired, language, fetchDashboardData]);

  const connect = useCallback(() => {
    try {
      redirectToTwitchAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la conexión con Twitch.');
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('streampulse_twitch_access_token');
    setAccessToken(null);
    setAuthRequired(true);
    setTopGames([]);
    setLiveStreams([]);
    setError(null);
  }, []);

  return { topGames, liveStreams, loading, error, authRequired, connect, disconnect, refetch: () => fetchDashboardData() };
};
