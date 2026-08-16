(() => {
  const calendar=document.getElementById('calendar'), goals=document.getElementById('goals'), grid=goals?.querySelector('.grid');
  if(!calendar||!goals||!grid)return;
  calendar.classList.remove('view','today-calendar');
  calendar.classList.add('planning-calendar');
  grid.after(calendar);
  const weekly=document.createElement('article');
  weekly.className='card weekly-plan';
  weekly.innerHTML='<div><em>这一周</em><h2 id="weekPlanTitle">本周的关键推进</h2><p>日历中的每日事项会自动成为这周计划的执行记录。</p></div><textarea id="weekPlanText" rows="3" placeholder="这一周最想推进什么？例如：完成报告初稿、安排两次运动……"></textarea>';
  calendar.before(weekly);
  const title=weekly.querySelector('#weekPlanTitle'), input=weekly.querySelector('#weekPlanText');
  const weekKey=date=>{let d=new Date(date);d.setHours(12,0,0,0);let day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d.toISOString().slice(0,10)};
  const read=()=>{try{return JSON.parse(localStorage.getItem('daymark-v1')||'{}')}catch{return{}}};
  const render=date=>{let d=new Date(date),start=weekKey(d),end=new Date(start+'T12:00:00');end.setDate(end.getDate()+6);title.textContent=`${start.slice(5).replace('-',' 月 ')} 日 - ${String(end.getMonth()+1)} 月 ${end.getDate()} 日的关键推进`;let data=read();input.value=data.settings?.weeklyPlans?.[start]||'';input.dataset.week=start};
  input.oninput=()=>{let data=read();data.settings=data.settings||{};data.settings.weeklyPlans=data.settings.weeklyPlans||{};data.settings.weeklyPlans[input.dataset.week]=input.value;localStorage.setItem('daymark-v1',JSON.stringify(data));window.dispatchEvent(new Event('meike-local-data-changed'))};
  document.getElementById('calendarGrid').addEventListener('click',event=>{let day=event.target.closest('.calendar-day');if(!day||day.classList.contains('empty-day'))return;let n=day.querySelector('.calendar-date')?.textContent,month=document.getElementById('calendarMonth').textContent.match(/(\d+) 年 (\d+) 月/);if(n&&month)render(new Date(+month[1],+month[2]-1,+n));});
  render(new Date());
})();
