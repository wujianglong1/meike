(() => {
  const key = 'meike-secret-lock';
  const secret = document.getElementById('secret');
  const nav = document.querySelector('.nav[data-view="secret"]');
  const editor = document.getElementById('secretEditor');
  const list = document.getElementById('secretList');
  const head = secret?.querySelector('.secret-head');
  if (!secret || !nav || !editor || !list || !head) return;

  const hash = async value => {
    const data = new TextEncoder().encode(value);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const hide = () => {
    editor.hidden = true;
    list.hidden = true;
    document.getElementById('secretLock')?.remove();

    const lock = document.createElement('div');
    lock.id = 'secretLock';
    lock.className = 'secret-lock card';
    const configured = Boolean(localStorage.getItem(key));
    lock.innerHTML = `<div class="secret-art" aria-hidden="true"><div class="secret-art-door"><div class="secret-art-star">✦</div><div class="secret-art-glow"></div><button id="secretHotspot" type="button" aria-label="打开秘密簿"><span></span></button></div></div><div id="secretPrompt" class="secret-prompt" hidden><em>私密空间</em><h2>${configured ? '输入密码以打开秘密簿' : '为秘密簿设置密码'}</h2><input id="secretPassword" name="secret-pass-${Date.now()}" type="password" minlength="4" autocomplete="new-password" readonly placeholder="至少 4 位密码"><input id="secretPasswordConfirm" name="secret-confirm-${Date.now()}" type="password" minlength="4" autocomplete="new-password" readonly placeholder="再次输入密码" ${configured ? 'hidden' : ''}><button type="button" id="unlockSecret">${configured ? '打开秘密簿' : '设置并打开'}</button><p id="secretLockMessage"></p></div>`;
    head.after(lock);

    const prompt = lock.querySelector('#secretPrompt');
    const passInput = lock.querySelector('#secretPassword');
    const confirmInput = lock.querySelector('#secretPasswordConfirm');
    lock.querySelector('#secretHotspot').onclick = () => {
      prompt.hidden = false;
      passInput.readOnly = false;
      if (confirmInput) confirmInput.readOnly = false;
      passInput.value = '';
      if (confirmInput) confirmInput.value = '';
      passInput.focus();
    };
    lock.querySelector('#unlockSecret').onclick = async () => {
      const pass = passInput.value;
      const confirmPass = confirmInput?.value || '';
      const message = lock.querySelector('#secretLockMessage');
      if (pass.length < 4) {
        message.textContent = '密码至少需要 4 位。';
        return;
      }
      const value = await hash(pass);
      if (!configured) {
        if (pass !== confirmPass) {
          message.textContent = '两次输入的密码不一致。';
          return;
        }
        localStorage.setItem(key, value);
      } else if (value !== localStorage.getItem(key)) {
        message.textContent = '密码不正确。';
        return;
      }
      passInput.value = '';
      if (confirmInput) confirmInput.value = '';
      lock.remove();
      editor.hidden = false;
      list.hidden = false;
    };
  };

  nav.addEventListener('click', hide);
  hide();
})();
