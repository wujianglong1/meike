(() => {
  const passwordKey = 'meike-secret-lock';
  const artKey = 'meike-secret-art';
  const hotspotKey = 'meike-secret-hotspot';
  const secret = document.getElementById('secret');
  const nav = document.querySelector('.nav[data-view="secret"]');
  const editor = document.getElementById('secretEditor');
  const list = document.getElementById('secretList');
  const head = secret?.querySelector('.secret-head');
  if (!secret || !nav || !editor || !list || !head) return;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || ''); } catch { return fallback; }
  };
  const hash = async value => {
    const data = new TextEncoder().encode(value);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
  };
  const position = () => {
    const value = read(hotspotKey, { x: 50, y: 53 });
    return { x: Math.max(8, Math.min(92, Number(value.x) || 50)), y: Math.max(8, Math.min(92, Number(value.y) || 53)) };
  };
  const sceneMarkup = `<div class="secret-scene-window"><i></i><b></b><em></em></div><div class="secret-scene-shelf"><i></i><i></i><i></i></div><div class="secret-scene-plant"><i></i><i></i><i></i><b></b></div><div class="secret-scene-lamp"><i></i><b></b></div><div class="secret-scene-table"></div><div class="secret-art-door"><div class="secret-art-star">✦</div><button id="secretHotspot" type="button" aria-label="打开秘密簿"><span></span></button></div>`;

  const applyScene = (scene, art, point) => {
    scene.classList.toggle('has-custom-art', Boolean(art));
    scene.style.backgroundImage = art ? `url(${art})` : '';
    scene.style.setProperty('--hotspot-x', `${point.x}%`);
    scene.style.setProperty('--hotspot-y', `${point.y}%`);
  };

  const hide = () => {
    editor.hidden = true;
    list.hidden = true;
    document.getElementById('secretLock')?.remove();
    const configured = Boolean(localStorage.getItem(passwordKey));
    const art = localStorage.getItem(artKey) || '';
    const point = position();
    const lock = document.createElement('div');
    lock.id = 'secretLock';
    lock.className = 'secret-lock card';
    lock.innerHTML = `<div class="secret-art"><div id="secretArtScene" class="secret-art-scene">${sceneMarkup}</div></div><div id="secretPrompt" class="secret-prompt" hidden><em>私密空间</em><h2>${configured ? '输入密码以打开秘密簿' : '为秘密簿设置密码'}</h2>${configured && art ? '' : '<div class="secret-art-setup"><label class="secret-art-upload">选择一张插图<input id="secretArtFile" type="file" accept="image/*"></label><div id="secretArtPreview" class="secret-art-preview"><div class="secret-preview-scene"></div><button id="secretPreviewHotspot" type="button" aria-label="设置隐藏入口位置"><span></span></button></div><small>点击预览图设置隐藏入口位置</small></div>'}<input id="secretPassword" name="secret-pass-${Date.now()}" type="password" minlength="4" autocomplete="new-password" readonly placeholder="至少 4 位密码"><input id="secretPasswordConfirm" name="secret-confirm-${Date.now()}" type="password" minlength="4" autocomplete="new-password" readonly placeholder="再次输入密码" ${configured ? 'hidden' : ''}><button type="button" id="unlockSecret">${configured ? '打开秘密簿' : '设置并打开'}</button><p id="secretLockMessage"></p></div>`;
    head.after(lock);
    const scene = lock.querySelector('#secretArtScene');
    scene.innerHTML = sceneMarkup;
    applyScene(scene, art, point);
    const prompt = lock.querySelector('#secretPrompt');
    const passInput = lock.querySelector('#secretPassword');
    const confirmInput = lock.querySelector('#secretPasswordConfirm');
    const showPrompt = () => {
      prompt.hidden = false;
      passInput.readOnly = false;
      if (confirmInput) confirmInput.readOnly = false;
      passInput.value = '';
      if (confirmInput) confirmInput.value = '';
      passInput.focus();
    };
    scene.querySelector('#secretHotspot').onclick = showPrompt;

    if (!configured || !art) {
      let chosenArt = art;
      let chosenPoint = { ...point };
      const preview = lock.querySelector('#secretArtPreview');
      const previewScene = lock.querySelector('.secret-preview-scene');
      const marker = lock.querySelector('#secretPreviewHotspot');
      const paintPreview = () => {
        preview.classList.toggle('has-custom-art', Boolean(chosenArt));
        preview.style.backgroundImage = chosenArt ? `url(${chosenArt})` : '';
        marker.style.left = `${chosenPoint.x}%`;
        marker.style.top = `${chosenPoint.y}%`;
        previewScene.hidden = Boolean(chosenArt);
      };
      paintPreview();
      preview.onclick = event => {
        const rect = preview.getBoundingClientRect();
        chosenPoint = { x: Math.round((event.clientX - rect.left) / rect.width * 100), y: Math.round((event.clientY - rect.top) / rect.height * 100) };
        chosenPoint.x = Math.max(5, Math.min(95, chosenPoint.x));
        chosenPoint.y = Math.max(5, Math.min(95, chosenPoint.y));
        paintPreview();
      };
      lock.querySelector('#secretArtFile').onchange = event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 1800000) {
          lock.querySelector('#secretLockMessage').textContent = '插图请控制在 1.8MB 以内。';
          event.target.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => { chosenArt = String(reader.result || ''); paintPreview(); };
        reader.readAsDataURL(file);
      };
      lock.querySelector('#secretHotspot').onclick = showPrompt;
      lock.querySelector('#secretPreviewHotspot').onclick = event => event.stopPropagation();
      lock.querySelector('#unlockSecret').onclick = async () => {
        const pass = passInput.value;
        const confirmPass = confirmInput?.value || '';
        const message = lock.querySelector('#secretLockMessage');
        if (pass.length < 4) { message.textContent = '密码至少需要 4 位。'; return; }
        const value = await hash(pass);
        if (configured && value !== localStorage.getItem(passwordKey)) { message.textContent = '密码不正确。'; return; }
        if (!configured && pass !== confirmPass) { message.textContent = '两次输入的密码不一致。'; return; }
        if (!configured) localStorage.setItem(passwordKey, value);
        if (chosenArt) localStorage.setItem(artKey, chosenArt); else localStorage.removeItem(artKey);
        localStorage.setItem(hotspotKey, JSON.stringify(chosenPoint));
        lock.remove(); editor.hidden = false; list.hidden = false;
      };
      return;
    }

    lock.querySelector('#unlockSecret').onclick = async () => {
      const message = lock.querySelector('#secretLockMessage');
      const value = await hash(passInput.value);
      if (passInput.value.length < 4) { message.textContent = '密码至少需要 4 位。'; return; }
      if (value !== localStorage.getItem(passwordKey)) { message.textContent = '密码不正确。'; return; }
      passInput.value = '';
      lock.remove(); editor.hidden = false; list.hidden = false;
    };
  };

  nav.addEventListener('click', hide);
  hide();
})();
