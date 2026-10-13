// Deploy separately from Hugo. Only public track metadata leaves this Worker.
export function createWorker() {
  let token = null;
  let tokenUntil = 0;
  let snapshot = null;
  let snapshotUntil = 0;
  let pending = null;
  let retryUntil = 0;
  let authorizationBlocked = false;

  async function spotifyFetch(url, options) {
    return fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  }

  async function accessToken(env) {
    if (authorizationBlocked) throw new Error('authorization_unavailable');
    if (token && Date.now() < tokenUntil) return token;
    const refresh = await env.SPOTIFY_TOKENS.get('refresh_token') || env.SPOTIFY_REFRESH_TOKEN;
    const response = await spotifyFetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
    });
    if (!response.ok) {
      if (response.status === 400) {
        const error = await response.json();
        authorizationBlocked = error.error === 'invalid_grant';
      }
      throw new Error('authorization_unavailable');
    }
    const data = await response.json();
    if (!data.access_token) throw new Error('authorization_unavailable');
    if (data.refresh_token && data.refresh_token !== refresh) {
      await env.SPOTIFY_TOKENS.put('refresh_token', data.refresh_token);
    }
    token = data.access_token;
    tokenUntil = Date.now() + Math.max(0, (Number(data.expires_in) || 3600) - 60) * 1000;
    return token;
  }

  async function readPlayback(env) {
    if (Date.now() < retryUntil) throw new Error('temporarily_unavailable');
    const response = await spotifyFetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: 'Bearer ' + await accessToken(env) },
    });
    if (response.status === 204) return { status: 'idle' };
    if (response.status === 401) { token = null; tokenUntil = 0; }
    if (response.status === 429) {
      retryUntil = Date.now() + Math.max(30, Number(response.headers.get('Retry-After')) || 60) * 1000;
    }
    if (!response.ok) throw new Error('playback_unavailable');
    const data = await response.json();
    const item = data.item;
    if (!data.is_playing || !item || item.is_local || data.currently_playing_type !== 'track') {
      return { status: 'idle' };
    }
    const url = item.external_urls?.spotify;
    if (!/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(url || '')) {
      return { status: 'idle' };
    }
    const image = item.album?.images?.find(image => image.width >= 160)?.url || '';
    return {
      status: 'playing',
      title: item.name,
      artist: (item.artists || []).map(artist => artist.name).join(', '),
      album: item.album?.name || '',
      image: /^https:\/\/i\.scdn\.co\//.test(image) ? image : '',
      url,
    };
  }

  return {
    async fetch(request, env) {
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Origin',
      };
      const origin = request.headers.get('Origin');
      const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
      if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
      const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
      if (origin && !allowed.includes(origin)) return json({ status: 'unavailable' }, 403);
      if (new URL(request.url).pathname !== '/now-playing') return json({ status: 'not_found' }, 404);
      if (request.method !== 'GET') return json({ status: 'method_not_allowed' }, 405);
      if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN || !env.SPOTIFY_TOKENS) {
        return json({ status: 'unavailable' }, 503);
      }
      try {
        if (!snapshot || Date.now() >= snapshotUntil) {
          if (!pending) {
            pending = readPlayback(env).then(data => {
              snapshot = data;
              snapshotUntil = Date.now() + 30000;
            }).finally(() => { pending = null; });
          }
          await pending;
        }
        return json(snapshot);
      } catch (_) {
        retryUntil = Math.max(retryUntil, Date.now() + 60000);
        // Do not expose Spotify responses, credentials, or a stale playing state.
        return json({ status: 'unavailable' }, 503);
      }
    },
  };
}

export default createWorker();
