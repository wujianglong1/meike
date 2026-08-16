(() => {
  const themes = ['light', 'peach', 'sea', 'forest', 'ink', 'night'];
  const names = {
    light: '香草奶油',
    peach: '蜜桃乳酪',
    sea: '薄荷糖',
    forest: '开心果',
    ink: '蓝莓牛奶',
    night: '香芋慕斯'
  };

  const button = document.querySelector('#theme');
  if (!button) return;

  button.onclick = () => {
    const current = S.settings.theme === 'dark' ? 'night' : (S.settings.theme || 'light');
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    S.settings.theme = next;
    paint();
    save();
    styleChoices();
    toast(`已切换为「${names[next]}」`);
  };
})();
