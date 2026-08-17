(() => {
  const storageKey='meike-bookshelf-v1', wisdomKey='meike-wisdom-v1';
  const $=selector=>document.querySelector(selector);
  const wisdom=[
    ['孔融让梨','孔融年幼时，家中分梨，他主动挑了最小的一个，把大的留给兄长。有人问他为什么这样做，他说：“我年纪小，应当拿小的。”谦让不是退缩，而是心里装得下别人。','《后汉书》'],
    ['曾子杀彘','曾子的妻子为了哄孩子，随口答应回来后杀猪给他吃。她回来后，曾子果真杀猪兑现诺言。他说，不能用欺骗教孩子，更不能让孩子学会失信。','《韩非子》'],
    ['愚公移山','愚公家门前有两座大山，出行很不方便。他带着家人年复一年挖山，邻人嘲笑他，他却说子子孙孙无穷尽，而山不会增加。持之以恒，终能改变眼前的阻碍。','《列子》'],
    ['凿壁借光','匡衡家贫买不起蜡烛，便凿开墙壁借邻家的光读书。微小的光也能照亮求知的路，重要的是愿意为想做的事寻找办法。','《西京杂记》'],
    ['卧冰求鲤','王祥冬日想为继母求鱼，卧在冰上，冰面忽然融开，跃出鲤鱼。故事未必需要当作事实，却提醒人们：孝心贵在真诚，行动胜过空谈。','《晋书》'],
    ['一饭千金','韩信落魄时曾受漂母一饭之恩，后来功成名就，便以千金回报。受人帮助要记在心上，得志之后也不要忘记曾经扶过自己的人。','《史记》'],
    ['悬梁刺股','孙敬用绳子把头发系在屋梁上，苏秦读书疲倦时用锥刺股，他们用极端方式提醒自己保持勤奋。真正值得学习的，是专注和自我约束的精神。','《战国策》'],
    ['画龙点睛','张僧繇画龙，最后点上眼睛，画龙便仿佛要飞走。做事要抓住关键处，恰到好处的一笔，常常能让平凡的积累焕发生命力。','《历代名画记》']
  ];
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return[]}};
  const save=books=>localStorage.setItem(storageKey,JSON.stringify(books));
  const esc=text=>String(text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const today=()=>new Date().toISOString().slice(0,10);
  function wisdomIndex(){const day=today();let stored;try{stored=JSON.parse(localStorage.getItem(wisdomKey)||'null')}catch{}if(!stored||stored.date!==day){stored={date:day,index:Math.floor(Math.random()*wisdom.length)};localStorage.setItem(wisdomKey,JSON.stringify(stored))}return stored.index%wisdom.length}
  function renderWisdom(index=wisdomIndex()){const item=wisdom[index];$('#wisdomTitle').textContent=item[0];$('#wisdomStory').textContent=item[1];$('#wisdomSource').textContent=`出处：${item[2]}`}
  function renderBooks(){const box=$('#bookList'),books=read();box.innerHTML='';if(!books.length){box.innerHTML='<div class="book-empty">书架还是空的，先放一本到手边吧。</div>';return}books.forEach((book,index)=>{const card=document.createElement('article');card.className='card book-card';card.innerHTML=`<div class="book-card-main"><span class="book-mark">▤</span><div><h3>${esc(book.title)}</h3><small>${esc(book.author||'作者未填写')}</small>${book.note?`<p>${esc(book.note)}</p>`:''}</div></div><div class="book-card-actions">${book.url?`<a href="${esc(book.url)}" target="_blank" rel="noopener">在线阅读 ↗</a>`:''}<button type="button" class="book-delete" aria-label="删除书籍">×</button></div>`;card.querySelector('.book-delete').onclick=()=>{books.splice(index,1);save(books);renderBooks()};box.append(card)})}
  function addBook(){const title=$('#bookTitle').value.trim(),author=$('#bookAuthor').value.trim(),url=$('#bookUrl').value.trim(),note=$('#bookNote').value.trim();if(!title){$('#bookTitle').focus();return}if(url&&!/^https?:\/\//i.test(url)){alert('网址请以 http:// 或 https:// 开头');return}const books=read();books.unshift({id:Date.now(),title,author,url,note});save(books);['bookTitle','bookAuthor','bookUrl','bookNote'].forEach(id=>$('#'+id).value='');renderBooks()}
  const originalView=window.view;
  if(typeof originalView==='function')window.view=viewName=>{originalView(viewName);if(viewName==='bookshelf'){$('#title').textContent='书页有光，故事未完。';renderWisdom();renderBooks()}};
  $('#wisdomNext')?.addEventListener('click',()=>{let index=(wisdomIndex()+1)%wisdom.length;localStorage.setItem(wisdomKey,JSON.stringify({date:today(),index}));renderWisdom(index)});
  $('#saveBook')?.addEventListener('click',addBook);$('#bookUrl')?.addEventListener('keydown',event=>{if(event.key==='Enter')addBook()});
  if(document.querySelector('.nav[data-view="bookshelf"]')?.classList.contains('active')){renderWisdom();renderBooks()}
})();
