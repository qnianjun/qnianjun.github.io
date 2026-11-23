(() => {
  const card = document.querySelector('[data-now-playing]');
  if (!card) return;
  const get = name => card.querySelector('[data-music-' + name + ']');
  const POLL = 60000;
  let pending = false;
  let timer;
  let ticker;
  // Track timing, anchored to the moment the response arrived.
  let timing = null;

  const clock = ms => {
    const total = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  };
  const elapsed = () => Math.min(timing.duration, timing.progress + (Date.now() - timing.receivedAt));

  function paintProgress() {
    if (!timing) return;
    const now = elapsed();
    get('bar').style.transform = `scaleX(${now / timing.duration})`;
    get('elapsed').textContent = clock(now);
  }

  function setTiming(data, playing) {
    clearInterval(ticker);
    const valid = playing && Number.isFinite(data.duration) && data.duration > 0 &&
      Number.isFinite(data.progress) && data.progress >= 0;
    timing = valid ? { duration: data.duration, progress: Math.min(data.progress, data.duration), receivedAt: Date.now() } : null;
    get('progress').hidden = !timing;
    if (!timing) return;
    get('duration').textContent = clock(timing.duration);
    paintProgress();
    ticker = setInterval(paintProgress, 1000);
  }

  function render(data) {
    const playing = data.status === 'playing' && typeof data.title === 'string' &&
      /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(data.url || '');
    card.classList.toggle('is-playing', playing);
    get('status').textContent = playing ? '正在聽' : data.status === 'idle' ? 'idle' : 'offline';
    get('title').textContent = playing ? data.title : data.status === 'idle' ? '現在沒在聽' : '讀不到播放狀態';
    get('artist').textContent = playing ? data.artist : '';
    get('link').href = playing ? data.url : 'https://open.spotify.com/';
    const image = get('image');
    const imageURL = playing && /^https:\/\/i\.scdn\.co\//.test(data.image || '') ? data.image : '';
    image.hidden = !imageURL;
    if (imageURL) image.src = imageURL;
    else image.removeAttribute('src');
    setTiming(data, playing);
  }

  // Poll every minute, or right after the current song should end.
  function nextDelay() {
    if (!timing) return POLL;
    const remaining = timing.duration - elapsed();
    return remaining > 0 ? Math.min(POLL, remaining + 2000) : 15000;
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
      if (!document.hidden) timer = setTimeout(update, nextDelay());
    }
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (document.hidden) clearInterval(ticker);
    else update();
  });
  update();
})();
