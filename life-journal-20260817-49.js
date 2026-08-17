(() => {
  const dbName='daymark-life-journal',storeName='entries',backupKey='daymark-last-full-backup',$=s=>document.querySelector(s);
  const composer=$('#lifeComposer'),entriesBox=$('#lifeEntries');
  if(!composer||!entriesBox||!window.indexedDB)return;
  let selectedImages=[],selectedFiles=[],editingId=null,objectUrls=[],searchText='',sortMode='newest';
  const openDb=()=>new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,1);request.onupgradeneeded=()=>request.result.createObjectStore(storeName,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const run=async(mode,action)=>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,mode),request=action(tx.objectStore(storeName));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close()})};
  const all=()=>run('readonly',store=>store.getAll()),put=entry=>run('readwrite',store=>store.put(entry)),remove=id=>run('readwrite',store=>store.delete(id));
  const esc=text=>String(text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clearUrls=()=>{objectUrls.forEach(URL.revokeObjectURL);objectUrls=[]},urlFor=blob=>{const url=URL.createObjectURL(blob);objectUrls.push(url);return url};
  const localDate=()=>{const now=new Date(),offset=now.getTimezoneOffset()*60000;return new Date(now-offset).toISOString().slice(0,10)};
  const normalizedImages=entry=>(entry.images||[]).map(image=>image?.blob?image:{blob:image,caption:''}).filter(image=>image.blob instanceof Blob);
  const normalizedFiles=entry=>(entry.attachments||[]).map(file=>file?.blob?file:{blob:file,name:'附件',type:file?.type||''}).filter(file=>file.blob instanceof Blob);

  async function compressImage(file){
    if(!file.type.startsWith('image/'))return file;
    const bitmap=await createImageBitmap(file),maximum=1920,ratio=Math.min(1,maximum/Math.max(bitmap.width,bitmap.height));
    if(ratio===1&&file.size<900000){bitmap.close();return file}
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
    canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob||file),'image/jpeg',.84));
  }
  const blobToDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
  const dataUrlToBlob=async value=>(await fetch(value)).blob();

  async function updateIndex(entries){
    localStorage.setItem('daymark-life-date-index',JSON.stringify([...new Set(entries.map(entry=>entry.date))]));
    window.dispatchEvent(new CustomEvent('daymark-life-index-updated'));
  }
  async function updateStorage(entries){
    entries=entries||await all();
    const bytes=entries.flatMap(entry=>[...normalizedImages(entry),...normalizedFiles(entry)]).reduce((sum,file)=>sum+(file.blob.size||0),0),estimate=navigator.storage?.estimate?await navigator.storage.estimate():null;
    const format=value=>value<1048576?`${Math.max(0,Math.round(value/1024))} KB`:`${(value/1048576).toFixed(1)} MB`;
    $('#lifeStorageValue').textContent=`${format(bytes)} · ${entries.length} 条记录`;
    const ratio=estimate?.quota?Math.min(100,(estimate.usage||bytes)/estimate.quota*100):0;$('#lifeStorageBar').style.width=`${Math.max(ratio,bytes?2:0)}%`;
    const saved=localStorage.getItem(backupKey);$('#lifeBackupStatus').textContent=saved?`上次完整备份：${new Date(saved).toLocaleDateString('zh-CN')}`:'尚未进行完整备份';
  }
  async function exportFullBackup(){
    const button=$('#export');button.disabled=true;button.textContent='正在整理图片…';
    try{const records=await all(),life=[];for(const entry of records)life.push({...entry,images:await Promise.all(normalizedImages(entry).map(async image=>({data:await blobToDataUrl(image.blob),caption:image.caption||''}))),attachments:await Promise.all(normalizedFiles(entry).map(async file=>({data:await blobToDataUrl(file.blob),name:file.name||'附件',type:file.blob.type||file.type||''})))});
      let daymark=null;try{daymark=JSON.parse(localStorage.getItem('daymark-v1')||'null')}catch{}
      const payload={format:'daymark-full-backup',version:3,exportedAt:new Date().toISOString(),daymark,life},url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'})),link=document.createElement('a');
      link.href=url;link.download=`明日完整备份-${localDate()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);localStorage.setItem(backupKey,new Date().toISOString());updateStorage(records);
    }finally{button.disabled=false;button.textContent='导出备份'}
  }
  async function importFullBackup(file){
    const data=JSON.parse(await file.text());
    if(data.format!=='daymark-full-backup'){if(!data.days||!data.goals)throw new Error('invalid');if(!confirm(`这是旧版文字备份，将恢复 ${Object.keys(data.days).length} 天记录，不包含生活照片。继续吗？`))return;localStorage.setItem('daymark-v1',JSON.stringify(data));location.reload();return}
    const dayCount=Object.keys(data.daymark?.days||{}).length,lifeCount=data.life?.length||0;if(!confirm(`备份中包含 ${dayCount} 天计划和 ${lifeCount} 条生活记录。恢复会替换当前数据，是否继续？`))return;
    for(const entry of await all())await remove(entry.id);
    for(const entry of data.life||[]){const images=await Promise.all((entry.images||[]).map(async image=>typeof image==='string'?{blob:await dataUrlToBlob(image),caption:''}:{blob:await dataUrlToBlob(image.data),caption:image.caption||''}));const attachments=await Promise.all((entry.attachments||[]).map(async file=>({blob:await dataUrlToBlob(file.data),name:file.name||'附件',type:file.type||''})));await put({...entry,images,attachments})}
    if(data.daymark)localStorage.setItem('daymark-v1',JSON.stringify(data.daymark));location.reload();
  }
  function resetForm(){editingId=null;selectedImages=[];selectedFiles=[];composer.classList.remove('open');$('#lifeTitle').value='';$('#lifeNote').value='';$('#lifeTags').value='';$('#lifeImages').value='';$('#lifeDate').value=localDate();$('#lifePreview').innerHTML='';$('#saveLifeEntry').textContent='保存记录'}
  function renderPreview(){
    $('#lifePreview').innerHTML='';selectedImages.forEach((image,index)=>{const item=document.createElement('div');item.className='life-preview-item';item.innerHTML='<img alt="待添加图片"><input class="life-preview-caption" maxlength="80" placeholder="给这张图写一句说明"><button type="button" aria-label="移除图片">×</button>';
      item.querySelector('img').src=URL.createObjectURL(image.blob);item.querySelector('input').value=image.caption||'';item.querySelector('input').oninput=event=>{image.caption=event.target.value};item.querySelector('button').onclick=()=>{selectedImages.splice(index,1);renderPreview()};$('#lifePreview').append(item)})
    selectedFiles.forEach((file,index)=>{const item=document.createElement('div');item.className='life-file-preview';item.innerHTML=`<span>📎 ${esc(file.name||'附件')}</span><small>${Math.max(1,Math.round((file.blob.size||0)/1024))} KB</small><button type="button" aria-label="移除附件">×</button>`;item.querySelector('button').onclick=()=>{selectedFiles.splice(index,1);renderPreview()};$('#lifePreview').append(item)});
  }
  function showImage(blob){const box=document.createElement('div');box.className='life-lightbox';const url=URL.createObjectURL(blob);box.innerHTML='<img alt="生活照片"><button type="button" aria-label="关闭">×</button>';box.querySelector('img').src=url;const close=()=>{URL.revokeObjectURL(url);box.remove()};box.onclick=event=>{if(event.target===box)close()};box.querySelector('button').onclick=close;document.addEventListener('keydown',function escape(event){if(event.key==='Escape'){document.removeEventListener('keydown',escape);close()}});document.body.append(box)}
  async function render(){
    clearUrls();const complete=await all();await updateIndex(complete);let entries=[...complete],query=searchText.toLowerCase();
    if(query)entries=entries.filter(entry=>[entry.title,entry.note,...(entry.tags||[]),...normalizedImages(entry).map(image=>image.caption),...normalizedFiles(entry).map(file=>file.name)].join(' ').toLowerCase().includes(query));
    entries.sort((a,b)=>sortMode==='oldest'?(a.date+a.id).localeCompare(b.date+b.id):sortMode==='updated'?(b.updatedAt||0)-(a.updatedAt||0):(b.date+b.id).localeCompare(a.date+a.id));entriesBox.innerHTML='';
    if(!entries.length){entriesBox.innerHTML=`<div class="life-empty">${query?'没有找到相符的生活记录。':'还没有生活记录。<br>从一张照片或一句话开始。'}</div>`;updateStorage(complete);return}
    entries.forEach(entry=>{const card=document.createElement('article');card.className='card life-entry';const images=normalizedImages(entry),files=normalizedFiles(entry),cover=images[0],tags=entry.tags||[];
      card.innerHTML=`${cover?'<img class="life-entry-cover" alt="生活照片">'+(cover.caption?`<small class="life-photo-caption">${esc(cover.caption)}</small>`:''):''}<div class="life-entry-body"><span class="life-entry-date">${esc(entry.date)}</span><h3>${esc(entry.title||'没有标题的一天')}</h3><p>${esc(entry.note)}</p>${tags.length?`<div class="life-tags">${tags.map(tag=>`<span># ${esc(tag)}</span>`).join('')}</div>`:''}${files.length?'<div class="life-attachments"></div>':''}</div>${images.length>1?'<div class="life-entry-thumbs"></div>':''}<div class="life-entry-actions"><button class="life-edit" type="button">编辑</button><button class="life-delete" type="button">删除</button></div>`;
      if(cover){const image=card.querySelector('.life-entry-cover');image.src=urlFor(cover.blob);image.onclick=()=>showImage(cover.blob)}
      const thumbs=card.querySelector('.life-entry-thumbs');if(thumbs)images.slice(1).forEach(image=>{const element=document.createElement('img');element.src=urlFor(image.blob);element.alt=image.caption||'生活照片';element.title=image.caption||'';element.onclick=()=>showImage(image.blob);thumbs.append(element)});
      const attachments=card.querySelector('.life-attachments');if(attachments)files.forEach(file=>{const link=document.createElement('a');link.href=urlFor(file.blob);link.download=file.name||'附件';link.target='_blank';link.textContent=`📎 ${file.name||'附件'}`;attachments.append(link)});
      card.querySelector('.life-delete').onclick=async()=>{if(confirm('删除这条生活记录？')){await remove(entry.id);render()}};
      card.querySelector('.life-edit').onclick=()=>{editingId=entry.id;selectedImages=images.map(image=>({...image}));selectedFiles=files.map(file=>({...file}));$('#lifeDate').value=entry.date;$('#lifeTitle').value=entry.title||'';$('#lifeNote').value=entry.note||'';$('#lifeTags').value=tags.join('、');$('#saveLifeEntry').textContent='保存修改';composer.classList.add('open');renderPreview();composer.scrollIntoView({behavior:'smooth',block:'start'})};entriesBox.append(card)});updateStorage(complete);
  }
  $('#newLifeEntry').onclick=()=>{resetForm();composer.classList.add('open');$('#lifeTitle').focus()};$('#cancelLifeEntry').onclick=resetForm;
  async function addFiles(files){files=[...files].filter(file=>file instanceof File);if(!files.length)return;$('#saveLifeEntry').disabled=true;$('#saveLifeEntry').textContent='正在处理文件…';try{const images=files.filter(file=>file.type.startsWith('image/')),attachments=files.filter(file=>!file.type.startsWith('image/'));selectedImages.push(...(await Promise.all(images.map(compressImage))).map(blob=>({blob,caption:''})));selectedFiles.push(...attachments.map(file=>({blob:file,name:file.name,type:file.type})));renderPreview()}finally{$('#saveLifeEntry').disabled=false;$('#saveLifeEntry').textContent=editingId?'保存修改':'保存记录'}}
  $('#lifeImages').onchange=async event=>{const input=event.target;await addFiles(input.files);input.value=''};
  const uploadZone=$('#lifeUpload');['dragenter','dragover'].forEach(type=>uploadZone.addEventListener(type,event=>{event.preventDefault();event.stopPropagation();uploadZone.classList.add('is-dragging')}));['dragleave','drop'].forEach(type=>uploadZone.addEventListener(type,event=>{event.preventDefault();event.stopPropagation();if(type==='dragleave'&&!uploadZone.contains(event.relatedTarget))uploadZone.classList.remove('is-dragging');if(type==='drop'){uploadZone.classList.remove('is-dragging');addFiles(event.dataTransfer.files)}}));
  $('#saveLifeEntry').onclick=async()=>{const title=$('#lifeTitle').value.trim(),note=$('#lifeNote').value.trim();if(!title&&!note&&!selectedImages.length&&!selectedFiles.length)return $('#lifeTitle').focus();const tags=$('#lifeTags').value.split(/[，,、]/).map(tag=>tag.trim()).filter(Boolean);await put({id:editingId||`${Date.now()}-${Math.random().toString(16).slice(2)}`,date:$('#lifeDate').value||localDate(),title,note,tags:[...new Set(tags)],images:selectedImages,attachments:selectedFiles,updatedAt:Date.now()});resetForm();render()};
  $('#lifeSearch').oninput=event=>{searchText=event.target.value.trim();render()};$('#lifeSort').onchange=event=>{sortMode=event.target.value;render()};$('#export').onclick=exportFullBackup;
  $('#import').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{await importFullBackup(file)}catch{alert('无法识别这个备份文件')}finally{event.target.value=''}};resetForm();render();
})();
