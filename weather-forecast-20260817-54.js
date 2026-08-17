(() => {
  const locationKey = 'daymark-weather-location';
  const cacheKey = 'daymark-weather-cache-v4';
  const qweatherKey = 'b4db888b1d6a4a90b7fbf1765776b046';
  const status = document.querySelector('#weatherStatus');
  const title = document.querySelector('#weatherTitle');
  const currentBox = document.querySelector('#weatherCurrent');
  const weekBox = document.querySelector('#weatherWeek');
  const hourlyBox = document.querySelector('#weatherHourly');
  const cityInput = document.querySelector('#weatherCity');
  if (!status || !weekBox) return;

  const weatherMap = code => {
    if (code === 0) return ['☀️', '晴'];
    if ([1, 2].includes(code)) return ['🌤️', '多云'];
    if (code === 3) return ['☁️', '阴'];
    if ([45, 48].includes(code)) return ['🌫️', '雾'];
    if ([51, 53, 55, 56, 57].includes(code)) return ['🌦️', '毛毛雨'];
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ['🌧️', '雨'];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ['🌨️', '雪'];
    if ([95, 96, 99].includes(code)) return ['⛈️', '雷雨'];
    return ['🌥️', '天气'];
  };
  const qweatherIcon = text => {
    if (/晴/.test(text)) return '☀️';
    if (/雷/.test(text)) return '⛈️';
    if (/雪|冰雹/.test(text)) return '🌨️';
    if (/雨/.test(text)) return '🌧️';
    if (/雾|霾|沙/.test(text)) return '🌫️';
    if (/阴/.test(text)) return '☁️';
    return '🌤️';
  };

  const dayName = (iso, index) => index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(`${iso}T12:00:00`));
  const readJson = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };

  function renderHourly(data, dayIndex) {
    const date = data.daily.time[dayIndex];
    const points = data.minutely_15.time.map((time, index) => ({ time, index })).filter(item => item.time.startsWith(date) && Number(item.time.slice(14, 16)) % 30 === 0);
    document.querySelectorAll('.weather-day').forEach((button, index) => button.classList.toggle('expanded', index === dayIndex));
    hourlyBox.classList.add('show');
    hourlyBox.innerHTML = `<div class="weather-hourly-head"><strong>${dayName(date, dayIndex)} · 分时天气</strong><small>每30分钟</small></div><div class="weather-hourly-list">${points.map(item => {
      const weather = weatherMap(data.minutely_15.weather_code[item.index]);
      const rain = data.minutely_15.precipitation_probability[item.index] ?? 0;
      return `<div class="weather-hour"><time>${item.time.slice(11, 16)}</time><i>${weather[0]}</i><b>${Math.round(data.minutely_15.temperature_2m[item.index])}°</b><span>降水 ${rain}%</span></div>`;
    }).join('')}</div>`;
  }

  function render(data, location, updatedAt = Date.now(), qweather = null) {
    const daily = data.daily;
    const now = qweather?.now ? [qweatherIcon(qweather.now.text), qweather.now.text] : weatherMap(data.current.weather_code);
    title.textContent = location.name || '当前位置';
    status.classList.remove('weather-status-cache');
    status.textContent = `${qweather ? '和风天气' : '模型预报'} · 更新于 ${new Date(updatedAt).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour: '2-digit', minute: '2-digit' })}`;
    currentBox.classList.add('show');
    currentBox.innerHTML = `<span class="weather-now-icon">${now[0]}</span><strong>${Math.round(qweather?.now?.temp ?? data.current.temperature_2m)}°</strong><span>${now[1]} · 体感 ${Math.round(qweather?.now?.feelsLike ?? data.current.apparent_temperature)}°</span>`;
    weekBox.innerHTML = daily.time.map((date, index) => {
      const qday = qweather?.daily?.[index];
      const weather = weatherMap(daily.weather_code[index]);
      const rain = daily.precipitation_probability_max[index] ?? 0;
      const label = qday?.textDay || weather[1];
      const precipitation = qday ? `降水 ${qday.precip || 0} mm` : `降水 ${rain}%`;
      return `<button type="button" class="weather-day ${index === 0 ? 'today' : ''}" data-day-index="${index}"><small>${dayName(date, index)}</small><i>${qday ? qweatherIcon(label) : weather[0]}</i><b>${Math.round(qday?.tempMax ?? daily.temperature_2m_max[index])}° / ${Math.round(qday?.tempMin ?? daily.temperature_2m_min[index])}°</b><span>${label} · ${precipitation}</span></button>`;
    }).join('');
    weekBox.querySelectorAll('.weather-day').forEach(button => button.onclick = () => renderHourly(data, Number(button.dataset.dayIndex)));
    renderHourly(data, 0);
  }

  async function fetchQWeather(location) {
    const query = new URLSearchParams({ location: `${location.longitude},${location.latitude}`, key: qweatherKey, lang: 'zh' });
    const [nowResponse, dailyResponse] = await Promise.all([
      fetch(`https://devapi.qweather.com/v7/weather/now?${query}`),
      fetch(`https://devapi.qweather.com/v7/weather/7d?${query}`)
    ]);
    const [nowData, dailyData] = await Promise.all([nowResponse.json(), dailyResponse.json()]);
    if (nowData.code !== '200' || dailyData.code !== '200') throw new Error('qweather');
    return { now: nowData.now, daily: dailyData.daily };
  }

  async function fetchWeather(location, force = false) {
    const cached = readJson(cacheKey);
    if (!force && cached && Date.now() - cached.savedAt < 10 * 60 * 1000 && cached.location.latitude === location.latitude && cached.location.longitude === location.longitude) {
      render(cached.data, cached.location, cached.savedAt, cached.qweather);
      return;
    }
    status.textContent = '正在更新天气……';
    try {
      const params = new URLSearchParams({
        latitude: location.latitude,
        longitude: location.longitude,
        current: 'temperature_2m,apparent_temperature,weather_code',
        minutely_15: 'temperature_2m,weather_code,precipitation_probability',
        forecast_minutely_15: '672',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: '7'
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error('weather');
      const data = await response.json();
      const savedAt = Date.now();
      let qweather = null;
      try { qweather = await fetchQWeather(location); } catch {}
      localStorage.setItem(locationKey, JSON.stringify(location));
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt, location, data, qweather }));
      render(data, location, savedAt, qweather);
    } catch {
      if (cached?.data) {
        render(cached.data, cached.location, cached.savedAt, cached.qweather);
        status.classList.add('weather-status-cache');
        status.textContent = `网络不可用 · 显示 ${new Date(cached.savedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 的缓存`;
      } else status.textContent = '天气更新失败，请检查网络后重试';
    }
  }

  async function resolveLocationName(location) {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: location.latitude,
        lon: location.longitude,
        zoom: '14',
        addressdetails: '1',
        'accept-language': 'zh-CN'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      if (!response.ok) throw new Error('reverse');
      const data = await response.json();
      const address = data.address || {};
      const city = address.city || address.municipality || address.town || address.state || address.province;
      const district = address.city_district || address.district || address.suburb || address.county || address.borough || address.quarter;
      const parts = [city, district].filter((value, index, array) => value && array.indexOf(value) === index);
      return { ...location, name: parts.join(' · ') || data.name || '当前位置' };
    } catch {
      return { ...location, name: location.name || '当前位置' };
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      status.textContent = '当前浏览器不支持定位，请输入城市查询';
      return;
    }
    status.textContent = '正在请求位置权限……';
    navigator.geolocation.getCurrentPosition(
      async pos => {
        status.textContent = '正在识别所在区……';
        const location = await resolveLocationName({ latitude: +pos.coords.latitude.toFixed(5), longitude: +pos.coords.longitude.toFixed(5), name: '当前位置' });
        fetchWeather(location, true);
      },
      () => { const saved = readJson(locationKey); if (saved) { status.textContent = '定位未更新，显示上次位置的天气'; fetchWeather(saved, true); } else status.textContent = '未获得定位权限，请输入城市查询'; },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  }

  async function searchCity() {
    const name = cityInput.value.trim();
    if (!name) return cityInput.focus();
    status.textContent = `正在查找“${name}”……`;
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`);
      const data = await response.json();
      const result = data.results?.[0];
      if (!result) throw new Error('city');
      const displayName = [result.name, result.admin1].filter(Boolean).join(' · ');
      await fetchWeather({ latitude: result.latitude, longitude: result.longitude, name: displayName }, true);
    } catch {
      status.textContent = '没有找到这个城市，请换一个名称';
    }
  }

  document.querySelector('#weatherLocate').onclick = locate;
  document.querySelector('#weatherSearch').onclick = searchCity;
  cityInput.onkeydown = event => { if (event.key === 'Enter') searchCity(); };
  document.querySelector('#weatherRefresh').onclick = locate;

  locate();
})();
