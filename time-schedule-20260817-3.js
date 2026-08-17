(() => {
  const box = document.getElementById('timeSchedule');
  const mergeButton = document.getElementById('mergeSchedule');
  if (!box || !mergeButton) return;
  let selected = new Set();
  const hourLabel = hour => `${String(hour).padStart(2, '0')}:00`;
  function ranges(day) {
    const saved = Array.isArray(day.hourlyMerges) ? day.hourlyMerges : [], occupied = new Set();
    return saved.filter(range => Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end < 24 && range.end > range.start && ![...Array(range.end - range.start + 1)].some((_, i) => occupied.has(range.start + i))).map(range => { for (let hour = range.start; hour <= range.end; hour++) occupied.add(hour); return range; }).sort((a, b) => a.start - b.start);
  }
  function updateMergeButton() { mergeButton.disabled = selected.size < 2; }
  function renderSchedule() {
    const day = S.days[active] || (S.days[active] = fresh());
    const entries = Array.isArray(day.hourlySchedule) ? day.hourlySchedule : (day.hourlySchedule = Array(24).fill(''));
    while (entries.length < 24) entries.push('');
    const merged = ranges(day); day.hourlyMerges = merged;
    const mergedAt = new Map(merged.map(range => [range.start, range]));
    box.replaceChildren();
    for (let hour = 0; hour < 24;) {
      const range = mergedAt.get(hour);
      if (range) {
        const row = document.createElement('label'), time = document.createElement('time'), input = document.createElement('input'), split = document.createElement('button');
        row.className = 'time-slot is-merged'; time.textContent = `${hourLabel(range.start)} - ${hourLabel(range.end + 1)}`;
        input.type = 'text'; input.value = entries[range.start] || ''; input.placeholder = '这一时段做了什么';
        input.addEventListener('input', () => { for (let item = range.start; item <= range.end; item++) entries[item] = input.value; change(); });
        split.type = 'button'; split.className = 'schedule-split'; split.textContent = '拆分'; split.title = '恢复逐小时编辑';
        split.addEventListener('click', event => { event.preventDefault(); day.hourlyMerges = day.hourlyMerges.filter(item => item !== range); selected.clear(); save(); renderSchedule(); });
        row.append(time, input, split); box.append(row); hour = range.end + 1; continue;
      }
      const row = document.createElement('label'), choose = document.createElement('input'), time = document.createElement('time'), input = document.createElement('input');
      row.className = 'time-slot'; choose.type = 'checkbox'; choose.className = 'schedule-select'; choose.checked = selected.has(hour); choose.title = `选择 ${hourLabel(hour)} 时段`;
      choose.addEventListener('change', () => { if (choose.checked) selected.add(hour); else selected.delete(hour); updateMergeButton(); });
      time.textContent = hourLabel(hour); input.type = 'text'; input.value = entries[hour] || '';
      input.addEventListener('input', () => { entries[hour] = input.value; change(); });
      row.append(choose, time, input); box.append(row); hour++;
    }
    updateMergeButton();
  }
  mergeButton.addEventListener('click', () => {
    const hours = [...selected].sort((a, b) => a - b);
    if (hours.length < 2) return;
    const day = S.days[active] || (S.days[active] = fresh());
    const start = hours[0], end = hours.at(-1), source = entriesForDay(day).find(value => value.trim());
    day.hourlyMerges = [...ranges(day), { start, end }];
    if (source) for (let hour = start; hour <= end; hour++) day.hourlySchedule[hour] = source;
    selected.clear(); save(); renderSchedule();
  });
  function entriesForDay(day) { return Array.isArray(day.hourlySchedule) ? day.hourlySchedule.map(value => String(value || '')) : []; }
  const previousToday = today;
  today = function () { previousToday(); selected.clear(); renderSchedule(); };
  renderSchedule();
})();
