import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './worker.mjs';

const request = (origin = 'https://blog.example') => new Request('https://worker.example/now-playing', { headers: { Origin: origin } });
function environment() {
  const store = new Map();
  return {
    SPOTIFY_CLIENT_ID: 'private-client', SPOTIFY_CLIENT_SECRET: 'private-secret',
    SPOTIFY_REFRESH_TOKEN: 'private-refresh', ALLOWED_ORIGINS: 'https://blog.example',
    SPOTIFY_TOKENS: { get: async key => store.get(key), put: async (key, value) => store.set(key, value) },
  };
}
const tokenResponse = () => Response.json({ access_token: 'private-access', expires_in: 3600, refresh_token: 'rotated-refresh' });
const track = {
  is_playing: true, currently_playing_type: 'track',
  item: { name: 'A song', artists: [{ name: 'An artist' }], album: { name: 'An album', images: [{ width: 300, url: 'https://i.scdn.co/image/abc' }] }, external_urls: { spotify: 'https://open.spotify.com/track/abc123' } },
};

test('returns only public metadata, rotates tokens, and caches requests', async t => {
  const env = environment();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    if (url.includes('/api/token')) {
      assert.equal(options.body.get('refresh_token'), 'private-refresh');
      return tokenResponse();
    }
    assert.equal(options.headers.Authorization, 'Bearer private-access');
    return Response.json(track);
  });
  const worker = createWorker();
  const response = await worker.fetch(request(), env);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://blog.example');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const text = await response.text();
  assert.equal(JSON.parse(text).status, 'playing');
  assert.ok(!text.includes('private-'));
  assert.equal(await env.SPOTIFY_TOKENS.get('refresh_token'), 'rotated-refresh');
  await worker.fetch(request(), env);
  assert.equal(calls, 2);
});

test('rejects unapproved origins and missing configuration without contacting Spotify', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected request'); });
  assert.equal((await createWorker().fetch(request('https://other.example'), environment())).status, 403);
  assert.equal((await createWorker().fetch(request(), { ALLOWED_ORIGINS: 'https://blog.example' })).status, 503);
});

for (const [name, playback] of [
  ['no active device', null], ['paused', { ...track, is_playing: false }],
  ['no track', { is_playing: true, item: null }],
  ['local file', { ...track, item: { ...track.item, is_local: true } }],
]) {
  test(name + ' returns idle', async t => {
    t.mock.method(globalThis, 'fetch', async url => url.includes('/api/token') ? tokenResponse() :
      playback ? Response.json(playback) : new Response(null, { status: 204 }));
    assert.deepEqual(await (await createWorker().fetch(request(), environment())).json(), { status: 'idle' });
  });
}

test('expired authorization returns generic unavailable without token leakage', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'invalid_grant', details: 'private-secret' }, { status: 400 }));
  const response = await createWorker().fetch(request(), environment());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

test('honors Spotify rate limit before retrying upstream', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    calls++;
    return url.includes('/api/token') ? tokenResponse() : new Response(null, { status: 429, headers: { 'Retry-After': '120' } });
  });
  const worker = createWorker();
  assert.equal((await worker.fetch(request(), environment())).status, 503);
  assert.equal((await worker.fetch(request(), environment())).status, 503);
  assert.equal(calls, 2);
});
