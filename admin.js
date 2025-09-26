(function(){
  document.addEventListener('DOMContentLoaded', ()=>{

    const PASS = 'starfish-admin'; // change in production
    const POSTS_KEY = 'sf_posts_v1';
    const LINKS_KEY = 'sf_links_v1';
    const CONTACT_KEY = 'sf_contacts_v1';
    const BOOKS_KEY = 'sf_books_v1'; // new

    // small helpers
    function get(k){ try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]} }
    function save(k,v){ localStorage.setItem(k, JSON.stringify(v)) }
    function esc(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
    function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6) }

    const loginPanel = document.getElementById('loginPanel');
    const dashboard = document.getElementById('dashboard');

    // ensure hidden at start: prefer class toggles so CSS .hidden is respected
    if (loginPanel) { loginPanel.classList.remove('hidden'); loginPanel.style.display = ''; }
    if (dashboard)  { dashboard.classList.add('hidden'); dashboard.style.display = 'none'; }

    // Seed some "dark side of starfish" links if none exist so Test8 has cool sites
    function seedLinksIfEmpty(){
      try{
        const existing = get(LINKS_KEY);
        if(existing && existing.length) return;
        const now = Date.now();
        const samples = [
          { id: uid(), title: 'Dark Starfish Archive', url: 'https://darkstarfish.example.com/archive', created: now, approved: true },
          { id: uid(), title: 'Bioluminescent Reef Hub', url: 'https://biolumreef.example.com', created: now+1, approved: true },
          { id: uid(), title: 'Deep Sea Observers', url: 'https://deepsea-observers.example.com', created: now+2, approved: true },
          { id: uid(), title: 'Starfish Mods & Tools', url: 'https://starfish-tools.example.com', created: now+3, approved: true },
          { id: uid(), title: 'The Abyssal Journal', url: 'https://abyssal-journal.example.com', created: now+4, approved: true },
          { id: uid(), title: 'Dark Side Collections', url: 'https://dark-collections.example.com', created: now+5, approved: true }
        ];
        save(LINKS_KEY, samples);
      }catch(e){
        console.warn('Seeding links failed', e);
      }
    }

    // Seed some sample books for the archive if empty
    function seedBooksIfEmpty(){
      try{
        const existing = get(BOOKS_KEY);
        if(existing && existing.length) return;
        const now = Date.now();
        const books = [
          { id: uid(), title: 'Abyssal Catalog', author: 'M. K. Tidal', desc: 'An illustrated compendium of strange starfish variants.', created: now, approved: true },
          { id: uid(), title: 'Noctiluca: Light in Darkness', author: 'R. Lumen', desc: 'Essays on bioluminescence and deep reefs.', created: now+1, approved: true },
          { id: uid(), title: 'Coral & Cold', author: 'A. Marrow', desc: 'Field notes from the coldest plains of the sea.', created: now+2, approved: false }
        ];
        save(BOOKS_KEY, books);
      }catch(e){
        console.warn('Seeding books failed', e);
      }
    }

    seedLinksIfEmpty();
    seedBooksIfEmpty();

    // attach login handler safely
    const doLoginBtn = document.getElementById('doLogin');
    if(doLoginBtn){
      doLoginBtn.addEventListener('click', ()=>{
        const passEl = document.getElementById('adminPass');
        const val = passEl ? (passEl.value || '').trim() : '';

        // moderator passphrases (both variants)
        if(val === 'starfish-admin' || val === 'starfish-minda'){
          try{ localStorage.setItem('sf_role_pending','moderator'); }catch(e){}
          // redirect moderators to the funky moderator page
          window.location.href = 'moderator_funk.html';
          return;
        }

        // admin passphrase
        if(val === 'starfish-nimda'){
          try{ sessionStorage.setItem('sf_role','admin'); }catch(e){}
          // hide login panel and show dashboard using class toggles (overrides .hidden !important)
          if (loginPanel)  { loginPanel.classList.add('hidden'); loginPanel.style.display = 'none'; }
          if (dashboard)   { dashboard.classList.remove('hidden'); dashboard.style.display = ''; }

          // apply glitch state site-wide immediately
          try{
            if(localStorage.getItem('sf_glitch') === '1') document.body.classList.add('glitch');
            else document.body.classList.remove('glitch');
          }catch(e){}

          renderAll();
          // initialize glitch toggle UI from storage
          const t = document.getElementById('glitchToggle');
          try{ if(t) t.checked = localStorage.getItem('sf_glitch') === '1' }catch(e){}
          return;
        }

        // fallback: show incorrect message
        const msgEl = document.getElementById('loginMsg');
        if(msgEl) msgEl.textContent = 'Incorrect passphrase.';
      });
    }

    // Glitch toggle handler
    const glitchToggle = document.getElementById('glitchToggle');
    if(glitchToggle){
      glitchToggle.addEventListener('change', e=>{
        try{
          if(e.target.checked) localStorage.setItem('sf_glitch','1');
          else localStorage.removeItem('sf_glitch');
          // apply immediately to this admin page
          if(e.target.checked) document.body.classList.add('glitch'); else document.body.classList.remove('glitch');
          // inform user
          alert('Glitch mode ' + (e.target.checked ? 'enabled' : 'disabled') + '. It will apply across the site.');
        }catch(err){ console.warn(err) }
      });
    }

    // Panic button: clear community data (posts, links, contacts, books). Confirm first.
    const panicBtn = document.getElementById('panicBtn');
    if(panicBtn){
      panicBtn.addEventListener('click', ()=>{
        if(!confirm('Panic will permanently remove posts, links, books and messages from this browser. Proceed?')) return;
        try{
          localStorage.removeItem(POSTS_KEY);
          localStorage.removeItem(LINKS_KEY);
          localStorage.removeItem(CONTACT_KEY);
          localStorage.removeItem(BOOKS_KEY);
          alert('Community data cleared. Reloading.');
          location.reload();
        }catch(e){ alert('Failed to clear storage.'); }
      });
    }

    function renderAll(){ renderPending(); renderLinksManage(); renderContacts(); renderBooksManage(); }

    // Pending posts
    function renderPending(){
      const out = document.getElementById('pendingList'); out.innerHTML='';
      const posts = get(POSTS_KEY).filter(p=>!p.approved).sort((a,b)=>b.created-a.created);
      if(!posts.length){ out.innerHTML = '<div class="card">No pending posts</div>'; return; }
      posts.forEach(p=>{
        const el = document.createElement('div'); el.className='card';
        // improved approve button with icon and extra class for styling
        let controls = '';
        if(isAdmin()){
          controls = `<div style="display:flex;gap:8px">
                      <button data-id="${p.id}" class="approve btn-approve"><span class="icon">⚡</span> Approve</button>
                      <button data-id="${p.id}" class="delete">Delete</button>
                    </div>`;
        } else {
          controls = `<div style="color:var(--muted);font-size:13px">Pending approval by Administrator</div>`;
        }
        el.innerHTML = `<div class="meta">${esc(p.author)} • ${new Date(p.created).toLocaleString()}</div>
          <div style="margin:8px 0">${esc(p.content)}</div>
          ${controls}`;
        out.appendChild(el);
      });
      out.querySelectorAll('.approve').forEach(b=>b.addEventListener('click', e=>{ approvePost(e.target.closest('[data-id]').dataset.id) }));
      out.querySelectorAll('.delete').forEach(b=>b.addEventListener('click', e=>{ deletePost(e.target.dataset.id) }));
    }
    function approvePost(id){
      const list = get(POSTS_KEY).map(p=> p.id===id ? {...p,approved:true} : p);
      save(POSTS_KEY,list); renderAll(); alert('Post approved.');
    }
    function deletePost(id){
      const list = get(POSTS_KEY).filter(p=>p.id!==id);
      save(POSTS_KEY,list); renderAll();
    }

    // Links management
    const addLinkForm = document.getElementById('addLinkForm');
    if(addLinkForm){
      addLinkForm.addEventListener('submit', e=>{
        e.preventDefault();
        const title = addLinkForm.querySelector('[name=title]').value.trim();
        const url = addLinkForm.querySelector('[name=url]').value.trim();
        if(!title||!url){ alert('Provide title and url'); return; }
        const list = get(LINKS_KEY);
        list.push({id:uid(),title, url, created:Date.now(), approved:false});
        save(LINKS_KEY,list); addLinkForm.reset(); renderLinksManage();
      });
    }
    function renderLinksManage(){
      const out = document.getElementById('linksManage'); if(!out) return; out.innerHTML='';
      const links = get(LINKS_KEY).sort((a,b)=>b.created-a.created);
      if(!links.length){ out.innerHTML = '<div class="card">No links</div>'; return; }
      links.forEach(l=>{
        const el = document.createElement('div'); el.className='card';
        el.innerHTML = `<div class="meta">${esc(l.title)} • ${l.approved? 'Approved':'Pending'}</div>
          <div style="display:flex;gap:8px">
            <button data-id="${l.id}" class="toggle">${l.approved? 'Unapprove':'Approve'}</button>
            <button data-id="${l.id}" class="remove">Delete</button>
          </div>`;
        out.appendChild(el);
      });
      out.querySelectorAll('.toggle').forEach(b=>b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        const list = get(LINKS_KEY).map(x=> x.id===id ? {...x,approved: !x.approved} : x);
        save(LINKS_KEY,list); renderLinksManage();
      }));
      out.querySelectorAll('.remove').forEach(b=>b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        save(LINKS_KEY, get(LINKS_KEY).filter(x=>x.id!==id));
        renderLinksManage();
      }));
    }

    // Books (Archive) management - new
    const addBookForm = document.getElementById('addBookForm');
    if(addBookForm){
      addBookForm.addEventListener('submit', e=>{
        e.preventDefault();
        const title = addBookForm.querySelector('[name=title]').value.trim();
        const author = addBookForm.querySelector('[name=author]').value.trim();
        const desc = addBookForm.querySelector('[name=desc]').value.trim();
        if(!title){ alert('Provide a title'); return; }
        const list = get(BOOKS_KEY);
        list.push({id:uid(),title, author, desc, created:Date.now(), approved:false});
        save(BOOKS_KEY,list); addBookForm.reset(); renderBooksManage();
      });
    }

    function renderBooksManage(){
      const out = document.getElementById('booksManage'); if(!out) return; out.innerHTML='';
      const books = get(BOOKS_KEY).sort((a,b)=>b.created-a.created);
      if(!books.length){ out.innerHTML = '<div class="card">No books</div>'; return; }
      books.forEach(bk=>{
        const el = document.createElement('div'); el.className='card';
        el.innerHTML = `<div class="meta">${esc(bk.title)} • ${esc(bk.author || 'unknown')} • ${bk.approved? 'Approved':'Pending'}</div>
          <div style="margin:8px 0">${esc(bk.desc||'')}</div>
          <div style="display:flex;gap:8px">
            <button data-id="${bk.id}" class="toggleBook">${bk.approved? 'Unapprove':'Approve'}</button>
            <button data-id="${bk.id}" class="removeBook">Delete</button>
          </div>`;
        out.appendChild(el);
      });
      out.querySelectorAll('.toggleBook').forEach(b=>b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        const list = get(BOOKS_KEY).map(x=> x.id===id ? {...x,approved: !x.approved} : x);
        save(BOOKS_KEY,list); renderBooksManage();
      }));
      out.querySelectorAll('.removeBook').forEach(b=>b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        save(BOOKS_KEY, get(BOOKS_KEY).filter(x=>x.id!==id));
        renderBooksManage();
      }));
    }

    // Contact messages
    function renderContacts(){
      const out = document.getElementById('contactsList'); if(!out) return; out.innerHTML='';
      const msgs = get(CONTACT_KEY).sort((a,b)=>b.created-a.created);
      if(!msgs.length){ out.innerHTML = '<div class="card">No messages</div>'; return; }
      msgs.forEach(m=>{
        const el = document.createElement('div'); el.className='card';
        el.innerHTML = `<div class="meta">${esc(m.name)} • ${new Date(m.created).toLocaleString()}</div>
          <div style="margin-bottom:6px">
            <strong>Email:</strong> ${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : '<em>none</em>'}
          </div>
          <div style="margin:8px 0">${esc(m.message)}</div>
          <div style="display:flex;gap:8px">
            <button data-id="${m.id}" class="mark">${m.read? 'Mark Unread':'Mark Read'}</button>
            <button data-id="${m.id}" class="del">Delete</button>
          </div>`;
        if(!m.read) el.style.borderLeft = '4px solid var(--accent)';
        out.appendChild(el);
      });
      out.querySelectorAll('.mark').forEach(b=>b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        const list = get(CONTACT_KEY).map(x=> x.id===id ? {...x, read: !x.read} : x);
        save(CONTACT_KEY, list); renderContacts();
      }));
      out.querySelectorAll('.del').forEach(b=>b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        save(CONTACT_KEY, get(CONTACT_KEY).filter(x=>x.id!==id));
        renderContacts();
      }));
    }

    // role helpers (updated to accept transient role from localStorage)
    function setRole(r){
      try{ sessionStorage.setItem('sf_role', r); }catch(e){}
      updateRoleUI();
    }
    function getRole(){
      try{
        const s = sessionStorage.getItem('sf_role');
        if(s) return s;
        // fallback: check transient role set by auth script (then migrate it)
        const pending = localStorage.getItem('sf_role_pending') || localStorage.getItem('sf_role');
        if(pending){
          // migrate to session and remove persistent pending flag
          try{ sessionStorage.setItem('sf_role', pending); localStorage.removeItem('sf_role_pending'); }catch(e){}
          return pending;
        }
      }catch(e){}
      return '';
    }
    function isAdmin(){ return getRole() === 'admin' }
    function isMod(){ return getRole() === 'moderator' }
    function updateRoleUI(){
      const r = getRole();
      if(roleIndicator){
        if(r === 'admin') roleIndicator.textContent = 'Signed in as: Administrator';
        else if(r === 'moderator') roleIndicator.textContent = 'Signed in as: Moderator (can create items)';
        else roleIndicator.textContent = '';
      }
    }

    // if a transient role was set before redirect, ensure UI shows it immediately
    updateRoleUI();

    // initial render if admin already logged-in via some UI (rare)
    // renderAll(); // kept commented to avoid auto-showing dashboard

  }); // DOMContentLoaded
})();
