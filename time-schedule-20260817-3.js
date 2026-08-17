(() => {
  const box = document.getElementById('timeSchedule');
  const mergeButton = document.getElementById('mergeSchedule');
  if (!box || !mergeButton) return;
  let selected = new Set();
  const hourLabel = hour => `${String(hour).padStart(2, '0')}:00`;
  function ranges(day) {
    const saved = Array.isArray(day.hourlyMerges) ? day.hourlyMerges : [], occupied = new Set();
    return saved.map((group, index) => {
      const hours = Array.isArray(group.hours) ? group.hours : (Number.isInteger(group.start) && Number.isInteger(group.end) ? Array.from({length: group.end - group.start + 1}, (_, i) => group.start + i) : []);
      const clean = hours.filter(hour => Number.isInteger(hour) && hour >= 0 && hour < 24 && !occupied.has(hour));
      clean.forEach(hour => occupied.add(hour));
      return {hours: clean.sort((a, b) => a - b), color: Number.isInteger(group.color) ? group.color : index};
    }).filter(group => group.hours.length > 1);
  }
  function updateMergeButton() { mergeButton.disabled = selected.size < 2; }
  function renderSchedule() {
    const day = S.days[active] || (S.days[active] = fresh());
    const entries = Array.isArray(day.hourlySchedule) ? day.hourlySchedule : (day.hourlySchedule = Array(24).fill(''));
    while (entries.length < 24) entries.push('');
    const merged = ranges(day); day.hourlyMerges = merged;
    const mergedAt = new Map(); merged.forEach(group => group.hours.forEach(hour => mergedAt.set(hour, group)));
    box.replaceChildren();
    for (let hour = 0; hour < 24; hour++) {
      const group = mergedAt.get(hour);
      const row = document.createElement('label'), choose = document.createElement('input'), time = document.createElement('time'), input = document.createElement('input');
      row.className = `time-slot${group ? ` is-merged merge-color-${group.color % 5}` : ''}`; choose.type = 'checkbox'; choose.className = 'schedule-select'; choose.checked = selected.has(hour); choose.title = `选择 ${hourLabel(hour)} 时段`;
      choose.addEventListener('change', () => { if (choose.checked) selected.add(hour); else selected.delete(hour); updateMergeButton(); });
      time.textContent = hourLabel(hour); input.type = 'text'; input.value = entries[hour] || '';
      input.addEventListener('input', () => { entries[hour] = input.value; change(); });
      row.append(choose, time, input);
      if (group && group.hours[0] === hour) { const split = document.createElement('button'); split.type = 'button'; split.className = 'schedule-split'; split.textContent = '拆分'; split.title = '取消色块合并'; split.addEventListener('click', event => { event.preventDefault(); day.hourlyMerges = day.hourlyMerges.filter(item => item.hours?.[0] !== group.hours[0]); selected.clear(); save(); renderSchedule(); }); row.append(split); }
      box.append(row);
    }
    updateMergeButton();
  }
  mergeButton.addEventListener('click', () => {
    const hours = [...selected].sort((a, b) => a - b);
    if (hours.length < 2) return;
    const day = S.days[active] || (S.days[active] = fresh());
    const source = entriesForDay(day).find(value => value.trim());
    day.hourlyMerges = [...ranges(day), { hours, color: day.hourlyMerges?.length || 0 }];
    if (source) hours.forEach(hour => { day.hourlySchedule[hour] = source; });
    selected.clear(); save(); renderSchedule();
  });
  function entriesForDay(day) { return Array.isArray(day.hourlySchedule) ? day.hourlySchedule.map(value => String(value || '')) : []; }
  const previousToday = today;
  today = function () { previousToday(); selected.clear(); renderSchedule(); };
  renderSchedule();
})();
