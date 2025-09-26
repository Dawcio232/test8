(function(){
  const POSTS_KEY = 'sf_posts_v1';
  const LINKS_KEY = 'sf_links_v1';
  const CONTACT_KEY = 'sf_contacts_v1';
  const BOOKS_KEY = 'sf_books_v1'; // new (ensure this exists in your file)

  // helpers
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6) }
  function get(key){ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]} }
  function save(key,v){ localStorage.setItem(key, JSON.stringify(v)) }
  function esc(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  // Seed minimal data if empty
  if(!get(POSTS_KEY).length){
    save(POSTS_KEY, [{id:uid(),author:'System',content:'Welcome — this project is managed via Admin.',created:Date.now(),approved:true}]);
  }

  // Render counts on hub (if present)
  function renderStats(){
    const posts = get(POSTS_KEY).filter(p=>p.approved);
    const links = get(LINKS_KEY).filter(l=>l.approved);
    const msgs = get(CONTACT_KEY).filter(m=>!m.read);
    const elPosts = document.getElementById('statPosts');
    const elLinks = document.getElementById('statLinks');
    const elMsgs = document.getElementById('statMessages');
    if(elPosts) elPosts.textContent = posts.length;
    if(elLinks) elLinks.textContent = links.length;
    if(elMsgs) elMsgs.textContent = msgs.length;
  }

  // Render recent approved posts for hub page
  function renderRecent(){
    const recent = document.getElementById('recent');
    if(!recent) return;
    recent.innerHTML = '';
    const posts = get(POSTS_KEY).filter(p=>p.approved).sort((a,b)=>b.created-a.created).slice(0,6);
    if(!posts.length){ recent.innerHTML = '<div class="card">No posts yet</div>'; return; }
    posts.forEach(p=>{
      const d = document.createElement('div'); d.className='card';
      d.innerHTML = `<a href="#" class="open-item" data-open-type="post" data-id="${p.id}" style="color:inherit;text-decoration:none;display:block;">
                       <div class="meta">${esc(p.author)} • ${new Date(p.created).toLocaleString()}</div>
                       <div style="margin-top:6px">${esc(p.content.length>180 ? p.content.slice(0,180)+'…' : p.content)}</div>
                     </a>`;
      recent.appendChild(d);
    });
  }

  // Forum page: render feed and handle create (if elements present)
  function renderForum(){
    const feed = document.getElementById('feed');
    if(!feed) return;
    feed.innerHTML = '';
    const posts = get(POSTS_KEY).filter(p=>p.approved).sort((a,b)=>b.created-a.created);
    if(!posts.length){ feed.innerHTML = '<div class="card">No approved posts yet. Create the first!</div>'; return; }
    posts.forEach(p=>{
      const el = document.createElement('div'); el.className='card';
      el.innerHTML = `<a href="#" class="open-item" data-open-type="post" data-id="${p.id}" style="color:inherit;text-decoration:none;display:block;">
                        <div class="meta">${esc(p.author)} • ${new Date(p.created).toLocaleString()}</div>
                        <div>${esc(p.content.length>300 ? p.content.slice(0,300)+'…' : p.content)}</div>
                      </a>`;
      feed.appendChild(el);
    });
  }
  // handle new post form (forum.html)
  const postForm = document.getElementById('newPostForm');
  if(postForm){
    postForm.addEventListener('submit', e=>{
      e.preventDefault();
      const author = (postForm.querySelector('[name=author]').value||'Anonymous').trim();
      const content = (postForm.querySelector('[name=content]').value||'').trim();
      if(!content){ alert('Enter message'); return; }
      const posts = get(POSTS_KEY);
      posts.push({id:uid(),author,content,created:Date.now(),approved:false});
      save(POSTS_KEY, posts);
      alert('Post submitted for admin approval.');
      postForm.reset();
      renderForum();
      renderStats();
    });
  }

  // Links page: render approved links
  function renderLinks(){
    const wrap = document.getElementById('linksList');
    if(!wrap) return;
    wrap.innerHTML = '';
    const links = get(LINKS_KEY).filter(l=>l.approved).sort((a,b)=>b.created-a.created);
    if(!links.length){ wrap.innerHTML = '<div class="card">No links yet</div>'; return; }
    links.forEach(l=>{
      const el = document.createElement('div'); el.className='card';
      el.innerHTML = `<div class="meta">${esc(l.title)} • ${new Date(l.created).toLocaleDateString()}</div><div><a href="${esc(l.url)}" target="_blank">${esc(l.url)}</a></div>`;
      wrap.appendChild(el);
    });
  }

  // Contact page: handle form
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', e=>{
      e.preventDefault();
      const name = (contactForm.querySelector('[name=name]').value||'Anonymous').trim();
      const email = (contactForm.querySelector('[name=email]').value||'').trim();
      const msg = (contactForm.querySelector('[name=message]').value||'').trim();
      if(!msg){ alert('Enter a message'); return; }
      const list = get(CONTACT_KEY);
      list.push({id:uid(),name,email,message:msg,created:Date.now(),read:false});
      save(CONTACT_KEY, list);
      alert('Message sent — admin will review.');
      contactForm.reset();
    });
  }

  // Render archive (books) on archive.html
  function renderArchive(){
    const wrap = document.getElementById('booksList');
    if(!wrap) return;
    wrap.innerHTML = '';
    const books = get(BOOKS_KEY).filter(b=>b.approved).sort((a,b)=>b.created-a.created);
    if(!books.length){ wrap.innerHTML = '<div class="card">No books in archive</div>'; return; }
    books.forEach(b=>{
      const el = document.createElement('div'); el.className='card';
      el.innerHTML = `<a href="#" class="open-item" data-open-type="book" data-id="${b.id}" style="color:inherit;text-decoration:none;display:block;">
                        <div class="meta">${esc(b.title)} • ${esc(b.author||'unknown')} • ${new Date(b.created).toLocaleDateString()}</div>
                        <div style="margin-top:8px">${esc(b.desc.length>200 ? b.desc.slice(0,200)+'…' : b.desc)}</div>
                      </a>`;
      wrap.appendChild(el);
    });
  }

  // create a reusable detail modal if not present
  function ensureDetailModal(){
    if(document.getElementById('detailModal')) return;
    const modal = document.createElement('div');
    modal.id = 'detailModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `<div class="modal-content">
        <button id="closeDetail" class="close">&times;</button>
        <h3 id="detailTitle"></h3>
        <div id="detailMeta" class="meta" style="margin-bottom:12px"></div>
        <div id="detailBody"></div>
      </div>`;
    document.body.appendChild(modal);

    // handlers
    modal.addEventListener('click', (e)=>{
      if(e.target === modal) closeDetail();
    });
    document.getElementById('closeDetail').addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDetail(); });
  }

  function openDetail(type, id){
    ensureDetailModal();
    const modal = document.getElementById('detailModal');
    const titleEl = document.getElementById('detailTitle');
    const metaEl = document.getElementById('detailMeta');
    const bodyEl = document.getElementById('detailBody');

    let item;
    if(type === 'post'){
      item = get(POSTS_KEY).find(x=>x.id===id);
      if(!item) return alert('Post not found');
      titleEl.textContent = item.author || 'Anonymous';
      metaEl.textContent = `${new Date(item.created).toLocaleString()} • ${item.approved ? 'Approved' : 'Pending'}`;
      bodyEl.innerHTML = `<div style="white-space:pre-wrap">${esc(item.content)}</div>`;
    } else if(type === 'book'){
      item = get(BOOKS_KEY).find(x=>x.id===id);
      if(!item) return alert('Book not found');
      titleEl.textContent = item.title || '(untitled)';
      metaEl.textContent = `${esc(item.author || 'unknown')} • ${item.approved ? 'Approved' : 'Pending'}`;
      bodyEl.innerHTML = `<div style="margin-top:8px;white-space:pre-wrap">${esc(item.desc || '')}</div>`;
    } else {
      return;
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  function closeDetail(){
    const modal = document.getElementById('detailModal');
    if(!modal) return;
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }

  // delegate clicks for openable items
  document.body.addEventListener('click', (e)=>{
    const a = e.target.closest && e.target.closest('.open-item');
    if(!a) return;
    e.preventDefault();
    const type = a.getAttribute('data-open-type');
    const id = a.getAttribute('data-id');
    if(type && id) openDetail(type, id);
  });

  // Run page renders (ensure modal exists for initial use)
  ensureDetailModal();
  renderStats();
  renderRecent();
  renderForum();
  renderLinks();
  renderArchive();

  // ensure global glitch mode is applied on load
  try{
    const glitch = localStorage.getItem('sf_glitch') === '1';
    if(glitch) document.body.classList.add('glitch');
    else document.body.classList.remove('glitch');
  }catch(e){}
})();
