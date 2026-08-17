(() => {
  const nav = document.querySelector('.nav[data-view="secret"]');
  const secret = document.getElementById('secret');
  if (!nav || !secret) return;
  let timer;
  const lock = () => {
    const editor = document.getElementById('secretEditor');
    const list = document.getElementById('secretList');
    if (!editor || !list || editor.hidden) return;
    location.reload();
  };
  const arm = () => { clearTimeout(timer); timer = setTimeout(lock, 10 * 60 * 1000); };
  ['pointerdown', 'keydown', 'input'].forEach(type => secret.addEventListener(type, arm, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) lock(); else arm(); });
  arm();
})();
