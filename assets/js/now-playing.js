(() => {
  const card = document.querySelector('[data-now-playing]');
  if (!card) return;
  const get = name => card.querySelector('[data-music-' + name + ']');
  let pending = false;
  let timer;
  function render(data) {
    const playing = data.status === 'playing' && typeof data.title === 'string' &&
      /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(data.url || '');
    card.classList.toggle('is-playing', playing);
    get('status').textContent = playing ? '正在聽 · Spotify' : 'Spotify';
    get('title').textContent = playing ? data.title : data.status === 'idle' ? '耳機休息中' : '音樂動態暫時離線';
    get('artist').textContent = playing ? data.artist : data.status === 'idle' ? '下一首好歌，待續。' : '稍後再回來聽聽。';
    get('link').href = playing ? data.url : 'https://open.spotify.com/';
    const image = get('image');
    const imageURL = playing && /^https:\/\/i\.scdn\.co\//.test(data.image || '') ? data.image : '';
    image.hidden = !imageURL;
    if (imageURL) image.src = imageURL;
    else image.removeAttribute('src');
  }
  get('image').addEventListener('error', () => { get('image').hidden = true; });
  async function update() {
    if (pending || document.hidden) return;
    clearTimeout(timer);
    pending = true;
    try {
      const response = await fetch(card.dataset.endpoint, { signal: AbortSignal.timeout(12000), credentials: 'omit' });
      if (!response.ok) throw new Error('unavailable');
      render(await response.json());
    } catch (_) {
      render({ status: 'unavailable' });
    } finally {
      pending = false;
      if (!document.hidden) timer = setTimeout(update, 60000);
    }
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) update();
  });
  update();
})();
