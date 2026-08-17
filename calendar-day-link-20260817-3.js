(() => {
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dateFromKey = value => new Date(`${value}T12:00:00`);
  const offsetDate = (value, amount) => {
    const date = dateFromKey(value);
    date.setDate(date.getDate() + amount);
    return date;
  };
  const label = date => `· ${date.getMonth() + 1}月${date.getDate()}日`;
  const isCurrentDay = () => active === key();
  const ensureDay = value => S.days[value] || (S.days[value] = fresh());

  function paintPlanDates() {
    const selected = dateFromKey(active);
    const tomorrow = offsetDate(active, 1);
    const todayLabel = document.getElementById('todayPlanDate');
    const tomorrowLabel = document.getElementById('tomorrowPlanDate');
    if (todayLabel) todayLabel.textContent = label(selected);
    if (tomorrowLabel) tomorrowLabel.textContent = label(tomorrow);
  }

  function renderTomorrow() {
    if (!isCurrentDay()) return;
    const tomorrowDate = offsetDate(key(), 1);
    const tomorrowKey = dateKey(tomorrowDate);
    const day = ensureDay(tomorrowKey);
    const list = day.todayList || (day.todayList = []);
    const box = document.getElementById('nextList');
    if (!box) return;
    box.innerHTML = '';
    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = `task tomorrow-task${item.starred ? ' is-starred' : ''}`;
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = !!item.checked;
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'task-star';
      star.setAttribute('aria-label', item.starred ? '取消重要标记' : '标记为重要');
      star.textContent = item.starred ? '★' : '☆';
      const main = document.createElement('div');
      main.className = 'task-main';
      const text = document.createElement('input');
      text.type = 'text';
      text.placeholder = '写下明天要做的事';
      text.value = item.text || '';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-task';
      remove.setAttribute('aria-label', '删除事项');
      remove.textContent = '×';
      check.onchange = () => { item.checked = check.checked; change(); };
      star.onclick = () => { item.starred = !item.starred; renderTomorrow(); change(); };
      text.oninput = () => { item.text = text.value; change(); };
      remove.onclick = () => { list.splice(index, 1); save(); renderTomorrow(); };
      main.append(text);
      row.append(check, star, main, remove);
      box.append(row);
    });
  }

  const originalToday = today;
  today = function () {
    originalToday();
    paintPlanDates();
    renderTomorrow();
  };

  const addTomorrow = document.querySelector('[data-section="tomorrow-tasks"] .add');
  addTomorrow?.addEventListener('click', event => {
    if (!isCurrentDay()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const tomorrowKey = dateKey(offsetDate(key(), 1));
    const day = ensureDay(tomorrowKey);
    (day.todayList || (day.todayList = [])).push({ text: '', checked: false });
    save();
    renderTomorrow();
    requestAnimationFrame(() => document.querySelector('#nextList .task:last-child input[type="text"]')?.focus());
  }, true);

  document.querySelector('.nav[data-view="today"]')?.addEventListener('click', () => {
    active = key();
    requestAnimationFrame(today);
  });

  today();
})();
