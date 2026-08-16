(() => {
  const key='daymark-v1',today=document.querySelector('#today'),panel=document.querySelector('#modulePanel'),choices=document.querySelector('#moduleChoices'),manager=document.querySelector('#moduleManager');
  if(!today||!panel||!choices||!manager)return;
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null')||{settings:{},goals:{year:[''],month:[''],notDoing:''},days:{}}}catch{return{settings:{},goals:{year:[''],month:[''],notDoing:''},days:{}}}};
  const write=data=>localStorage.setItem(key,JSON.stringify(data));
  const labels={'habits':'今日习惯','calendar':'日历','weather':'天气','mood':'心情与能量','today-tasks':'今日行动','review':'今日复盘','tomorrow-tasks':'明日计划','metrics':'生活刻度','overview':'今日总览'};
  const sections=()=>[...today.querySelectorAll(':scope>[data-section]')];
  const sectionName=section=>labels[section.dataset.section]||section.querySelector('h2')?.textContent.trim()||section.querySelector('em')?.textContent.trim()||'模块';
  function settings(){const data=read();data.settings=data.settings||{};data.settings.hiddenSections=data.settings.hiddenSections||[];data.settings.collapsedSections=data.settings.collapsedSections||[];return data}
  function saveList(name,list){const data=settings();data.settings[name]=list;write(data)}
  function apply(){const data=settings(),hidden=data.settings.hiddenSections,collapsed=data.settings.collapsedSections;sections().forEach(section=>{const id=section.dataset.section;section.classList.toggle('module-hidden',hidden.includes(id));section.classList.toggle('is-collapsed',collapsed.includes(id));const button=section.querySelector(':scope>.section-collapse');if(button){button.textContent=collapsed.includes(id)?'＋':'−';button.title=collapsed.includes(id)?'展开模块':'折叠模块'}});renderChoices()}
  function renderChoices(){const hidden=settings().settings.hiddenSections;choices.innerHTML='';sections().forEach(section=>{const id=section.dataset.section,label=document.createElement('label');label.innerHTML=`<input type="checkbox" ${hidden.includes(id)?'':'checked'}><span>${sectionName(section)}</span>`;label.querySelector('input').onchange=event=>{const list=settings().settings.hiddenSections.filter(value=>value!==id);if(!event.target.checked)list.push(id);saveList('hiddenSections',list);apply()};choices.append(label)})}
  function install(){sections().forEach(section=>{if(section.querySelector(':scope>.section-collapse'))return;const button=document.createElement('button');button.type='button';button.className='section-collapse';button.setAttribute('aria-label',`折叠${sectionName(section)}`);button.onclick=()=>{const id=section.dataset.section,data=settings(),list=data.settings.collapsedSections.filter(value=>value!==id);if(!data.settings.collapsedSections.includes(id))list.push(id);saveList('collapsedSections',list);apply()};section.prepend(button)});apply()}
  manager.onclick=()=>panel.classList.toggle('open');document.querySelector('#showAllModules').onclick=()=>{saveList('hiddenSections',[]);apply()};
  requestAnimationFrame(install);
})();
