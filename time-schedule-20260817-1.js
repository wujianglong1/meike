(() => {
  const box = document.getElementById('timeSchedule');
  if (!box) return;

  function renderSchedule() {
    const day = S.days[active] || (S.days[active] = fresh());
    const entries = Array.isArray(day.hourlySchedule)
      ? day.hourlySchedule
      : (day.hourlySchedule = Array(24).fill(''));

    while (entries.length < 24) entries.push('');
    box.replaceChildren();

    entries.slice(0, 24).forEach((value, hour) => {
      const row = document.createElement('label');
      row.className = 'time-slot';
      const time = document.createElement('time');
      time.textContent = `${String(hour).padStart(2, '0')}:00`;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value || '';
      input.addEventListener('input', () => {
        entries[hour] = input.value;
        change();
      });
      row.append(time, input);
      box.append(row);
    });
  }

  const previousToday = today;
  today = function () {
    previousToday();
    renderSchedule();
  };

  renderSchedule();
})();
