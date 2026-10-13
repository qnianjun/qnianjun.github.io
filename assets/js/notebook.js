(() => {
  const script = document.currentScript;
  const searchURL = script?.dataset.searchUrl;
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.defaultPrevented || event.isComposing || target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
    const shortcut = (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) ||
      (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey);
    if (!shortcut || !searchURL) return;
    event.preventDefault();
    const input = document.getElementById('searchInput');
    if (input) input.focus();
    else window.location.assign(searchURL);
  });

  document.querySelectorAll('[data-random-posts]').forEach(link => {
    let posts;
    try { posts = JSON.parse(link.dataset.randomPosts); } catch (_) { return; }
    if (!Array.isArray(posts) || !posts.length) return;
    // Update the actual href so keyboard, middle click, and open-in-new-tab all work.
    link.href = posts[Math.floor(Math.random() * posts.length)];
    link.addEventListener('pointerenter', () => { link.href = posts[Math.floor(Math.random() * posts.length)]; });
  });

  const progress = document.querySelector('[data-reading-progress]');
  const content = document.querySelector('.post-single .post-content');
  if (progress && content) {
    progress.hidden = false;
    let scheduled = false;
    const update = () => {
      const rect = content.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const distance = Math.max(1, content.scrollHeight - window.innerHeight);
      const value = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
      progress.firstElementChild.style.transform = `scaleX(${value})`;
      progress.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      scheduled = false;
    };
    const queueUpdate = () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    new ResizeObserver(queueUpdate).observe(content);
    update();
  }

  const copy = document.querySelector('[data-copy-article]');
  const status = document.querySelector('[data-copy-status]');
  if (copy && navigator.clipboard?.writeText) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        const url = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0];
        await navigator.clipboard.writeText(url);
        status.textContent = '連結已複製！';
      } catch (_) {
        status.textContent = '無法自動複製，請複製網址列的連結。';
      }
    });
  }
})();
