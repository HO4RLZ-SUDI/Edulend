    const firebaseConfig = {
      apiKey: "AIzaSyBu5LbP8UGn1tjE150edwV2aEu9e_AnRS8",
      authDomain: "edulend-cd310.firebaseapp.com",
      projectId: "edulend-cd310",
      storageBucket: "edulend-cd310.firebasestorage.app",
      messagingSenderId: "331898077255",
      appId: "1:331898077255:web:a798da458709379117f162",
      measurementId: "G-FF4NNTFF"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();
  

    const ADMIN_EMAIL = "thanaphoom40852@gmail.com";

    // State
    let currentUser = null;
    let currentView = "dashboard";
    let search = "";
    let sortBy = "name";
    let sortDir = "asc";
    let page = 1;
    let pageSize = 10;
    let selected = new Set();

    const mock = {
      categories: {
        electronics: 'อุปกรณ์อิเล็กทรอนิกส์',
        science: 'อุปกรณ์วิทยาศาสตร์',
        sports: 'อุปกรณ์กีฬา',
        books: 'หนังสือและเอกสาร',
        art: 'อุปกรณ์ศิลปะ'
      },
      items: {},
      loans: {},
      users: {},
      settings: {
        defaultLoanDays: 7, maxLoansPerUser: 5, autoApprove: false
      },
      notifications: []
    };
    const LS = "edulend_pro_v1";

    function id(){ return 'id_' + Math.random().toString(36).slice(2,10); }
    function notify(msg,type='info',undo){
      const host = document.getElementById('toastHost');
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `<strong>${msg}</strong>${undo?` <button class="btn btn-ghost btn-small" id="undoBtn">เลิกทำ</button>`:''}`;
      host.appendChild(el);
      if(undo){
        el.querySelector('#undoBtn').onclick = ()=>{ undo(); el.remove(); };
      }
      setTimeout(()=> el.remove(), 4000);
    }
    function save(){
      const data = JSON.stringify(mock, (k,v)=> v instanceof Date ? {__dt:v.toISOString()} : v);
      localStorage.setItem(LS, data);
    }
    function load(){
      const raw = localStorage.getItem(LS);
      if(!raw) return;
      const parsed = JSON.parse(raw, (k,v)=> v && v.__dt ? new Date(v.__dt) : v);
      Object.assign(mock, parsed);
    }
    function fmt(d){ if(!d) return '-'; return new Date(d).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric'}); }

    // Seed sample on first run
    function seedIfEmpty(){
      if(Object.keys(mock.items).length>0) return;
      const seed = [
        ['เครื่องคิดเลขวิทยาศาสตร์','electronics','เครื่องคิดเลขสำหรับคำนวณทางวิทยาศาสตร์',20,15,'ห้องคลังพัสดุ A'],
        ['แล็ปท็อป HP EliteBook','electronics','คอมพิวเตอร์แล็ปท็อปสำหรับการเรียนการสอน',10,3,'ห้องคอมพิวเตอร์'],
        ['กล้องดิจิทัล Canon','electronics','กล้องถ่ายรูปสำหรับบันทึกกิจกรรม',5,0,'ห้องสื่อการเรียน'],
        ['เครื่องฉายภาพ Projector','electronics','เครื่องฉายภาพสำหรับการนำเสนอ',8,6,'ห้องประชุม'],
        ['แท็บเล็ต iPad','electronics','แท็บเล็ตสำหรับการเรียนรู้ดิจิทัล',15,12,'ห้องคลังพัสดุ B'],
        ['กล้องจุลทรรศน์','science','กล้องจุลทรรศน์สำหรับชีววิทยา',12,8,'ห้องปฏิบัติการ'],
        ['ลูกฟุตบอล','sports','ลูกฟุตบอลมาตรฐาน',30,25,'โรงยิม'],
        ['หนังสือคู่มือวิทยาศาสตร์','books','คู่มือการทดลองวิทยาศาสตร์',50,45,'ห้องสมุด']
      ];
      seed.forEach(s=>{
        const i = {id:id(), name:s[0], category:s[1], description:s[2], total:s[3], available:s[4], location:s[5], addedAt:new Date()};
        mock.items[i.id]=i;
      });
    }

    // Auth
    function renderHeader(){
      const pill = document.getElementById('userPill');
      if(currentUser){
        pill.innerHTML = `
          <span class="role ${currentUser.role==='admin'?'role-admin':'role-student'}">${currentUser.role==='admin'?'ผู้ดูแล':'นักเรียน'}</span>
          <span>${currentUser.name||currentUser.email}</span>
          <button class="btn btn-secondary btn-small" onclick="logout()"><i data-lucide='log-out'></i> ออกจากระบบ</button>`;
      }else{
        pill.innerHTML = `<button class="google-btn" onclick="loginWithGoogle()">
          <img class="google-logo" alt="G" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" />
          เข้าสู่ระบบด้วย Google
        </button>`;
      }
      lucide.createIcons();
    }

    async function loginWithGoogle(){
      try{
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const role = (user.email && user.email.toLowerCase()===ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';
        currentUser = { id:user.uid, email:user.email||'', name:user.displayName||user.email||'ผู้ใช้', role };
        mock.users[currentUser.id] = { email: currentUser.email, role: currentUser.role, name: currentUser.name };
        document.getElementById('navTabs').classList.remove('hidden');
        if(role==='admin') document.getElementById('fabAdd').classList.remove('hidden');
        renderHeader(); renderNav(); render();
        notify(`ยินดีต้อนรับ ${currentUser.name}`,'success');
      }catch(e){
        alert('เข้าสู่ระบบไม่สำเร็จ: '+e.message);
      }
    }
    function logout(){
      auth.signOut().finally(()=>{
        currentUser=null; selected.clear();
        document.getElementById('navTabs').classList.add('hidden');
        document.getElementById('fabAdd').classList.add('hidden');
        renderHeader(); render();
        notify('ออกจากระบบแล้ว');
      });
    }
    auth.onAuthStateChanged(u=>{
      load();
      if(u){
        const role = (u.email && u.email.toLowerCase()===ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'student';
        currentUser = { id:u.uid, email:u.email||'', name:u.displayName||u.email||'ผู้ใช้', role };
        mock.users[currentUser.id] = { email: currentUser.email, role: currentUser.role, name: currentUser.name };
        document.getElementById('navTabs').classList.remove('hidden');
        if(role==='admin') document.getElementById('fabAdd').classList.remove('hidden');
      }else{
        currentUser=null;
        document.getElementById('navTabs').classList.add('hidden');
        document.getElementById('fabAdd').classList.add('hidden');
      }
      seedIfEmpty();
      renderHeader(); renderNav(); render();
    });

    // Navigation
    function renderNav(){
      const nav = document.getElementById('navTabs');
      if(!currentUser){ nav.innerHTML=''; return; }
      const admin = currentUser.role==='admin';
      const tabs = [
        admin?['dashboard','แดชบอร์ด']:['home','รายการ'],
        admin?['manage','จัดการอุปกรณ์']:['my','การยืมของฉัน'],
        admin?['requests','คำขอ']:['notifications','การแจ้งเตือน'],
        admin?['reports','รายงาน']:null,
        admin?['settings','ตั้งค่า']:null
      ].filter(Boolean);
      nav.innerHTML = tabs.map(([key,label])=>`<button class="tab ${currentView===key?'active':''}" onclick="goto('${key}')">${label}</button>`).join('');
    }
    function goto(view){ currentView=view; page=1; selected.clear(); renderNav(); render(); }

    // Rendering
    function render(){
      const main = document.getElementById('main');
      if(!currentUser){
        main.innerHTML = `<div class="empty"><i data-lucide="book-open"></i><h2>ยินดีต้อนรับสู่ Edulend</h2><p>กรุณาเข้าสู่ระบบด้วย Google เพื่อเริ่มใช้งาน</p></div>`;
        lucide.createIcons(); return;
      }
      const admin = currentUser.role==='admin';
      if(admin){
        if(currentView==='dashboard') return renderDash();
        if(currentView==='manage') return renderManage();
        if(currentView==='requests') return renderRequests();
        if(currentView==='reports') return renderReports();
        if(currentView==='settings') return renderSettings();
      }else{
        if(currentView==='home') return renderHome();
        if(currentView==='my') return renderMy();
        if(currentView==='notifications') return renderNoti();
      }
    }

    // Views (admin)
    function renderDash(){
      const items = Object.values(mock.items);
      const borrowed = Object.values(mock.loans).filter(l=>l.status==='borrowed');
      const pending = Object.values(mock.loans).filter(l=>l.status==='requested');
      const overdue = borrowed.filter(l=> new Date()>new Date(l.dueAt||0));
      document.getElementById('main').innerHTML = `
        <h2>แดชบอร์ด</h2>
        <div class="divider"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:8px">
          ${cardStat('อุปกรณ์ทั้งหมด', items.length)}
          ${cardStat('กำลังยืม', borrowed.length)}
          ${cardStat('รออนุมัติ', pending.length)}
          ${cardStat('เกินกำหนด', overdue.length)}
        </div>
        <p class="hint">คีย์ลัด: <kbd>n</kbd> เพิ่มอุปกรณ์, <kbd>/</kbd> ค้นหา, <kbd>g</kbd> แล้ว <kbd>m</kbd> ไปที่จัดการอุปกรณ์</p>
      `;
    }
    function cardStat(label,val){
      return `<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px">
        <div style="opacity:.8">${label}</div>
        <div style="font-size:2rem;font-weight:800">${val}</div>
      </div>`;
    }

    function renderManage(){
      const main = document.getElementById('main');
      const q = search.toLowerCase();
      let items = Object.values(mock.items).filter(i=> i.name.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
      items.sort((a,b)=>{
        const va = (''+a[sortBy]).toLowerCase();
        const vb = (''+b[sortBy]).toLowerCase();
        return sortDir==='asc' ? (va>vb?1:va<vb?-1:0) : (va<vb?1:va>vb?-1:0);
      });
      const total = items.length;
      const maxPage = Math.max(1, Math.ceil(total/pageSize));
      page = Math.min(page, maxPage);
      const start = (page-1)*pageSize;
      items = items.slice(start, start+pageSize);

      main.innerHTML = `
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:8px">
          <h2>จัดการอุปกรณ์</h2>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-secondary btn-small" onclick="bulkDelete()" ${selected.size?'':'disabled'}><i data-lucide="trash-2"></i> ลบรายการที่เลือก</button>
            <select class="select" style="padding:.4rem .6rem" onchange="pageSize=parseInt(this.value);page=1;render()">
              ${[10,20,50].map(ps=>`<option ${pageSize===ps?'selected':''}>${ps}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:36px"><label class="chk" title="เลือกทั้งหมด"><input type="checkbox" onchange="toggleAll(this.checked)"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></label></th>
                ${thSort('name','ชื่ออุปกรณ์')}
                <th>หมวดหมู่</th>
                ${thSort('total','ทั้งหมด')}
                <th>ว่าง</th>
                <th>กำลังยืม</th>
                <th>สถานที่</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row=>{
                const checked = selected.has(row.id) ? 'checked' : '';
                const borrowed = row.total - row.available;
                return `<tr>
                  <td><label class="chk"><input type="checkbox" ${checked} onchange="toggleOne('${row.id}',this.checked)"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></label></td>
                  <td><strong style="cursor:pointer" onclick="openItemModal('${row.id}')">${row.name}</strong><div class="hint">${(row.description||'').slice(0,80)}</div></td>
                  <td><span class="badge">${mock.categories[row.category]||row.category}</span></td>
                  <td>${row.total}</td>
                  <td>${row.available>0?`<span class="available">${row.available}</span>`:`<span class="unavailable">${row.available}</span>`}</td>
                  <td>${borrowed}</td>
                  <td>${row.location||'-'}</td>
                  <td><button class="btn btn-secondary btn-small" onclick="openItemModal('${row.id}')"><i data-lucide="edit"></i> แก้ไข</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="ghost">ทั้งหมด ${total} รายการ</span>
          <button class="btn btn-secondary btn-small" onclick="page=Math.max(1,page-1);render()" ${page<=1?'disabled':''}><i data-lucide="chevron-left"></i></button>
          <span>หน้า ${page}/${maxPage}</span>
          <button class="btn btn-secondary btn-small" onclick="page=Math.min(${maxPage},page+1);render()" ${page>=maxPage?'disabled':''}><i data-lucide="chevron-right"></i></button>
        </div>
      `;
      lucide.createIcons();
    }
    function thSort(field,label){
      const active = sortBy===field;
      const icon = active ? (sortDir==='asc'?'arrow-up':'arrow-down') : 'arrow-up-down';
      return `<th style="cursor:pointer" onclick="toggleSort('${field}')">${label} <i data-lucide="${icon}"></i></th>`;
    }
    function toggleSort(field){
      if(sortBy===field){ sortDir = (sortDir==='asc'?'desc':'asc'); }
      else{ sortBy=field; sortDir='asc'; }
      render();
    }
    function toggleOne(id,checked){ if(checked) selected.add(id); else selected.delete(id); render(); }
    function toggleAll(on){
      const q = search.toLowerCase();
      let items = Object.values(mock.items).filter(i=> i.name.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
      items.forEach(i=> on ? selected.add(i.id) : selected.delete(i.id));
      render();
    }
    function bulkDelete(){
      if(!selected.size) return;
      const toDelete = Array.from(selected).filter(id=> (mock.items[id].total - mock.items[id].available)===0);
      const backup = toDelete.map(id=> mock.items[id]);
      toDelete.forEach(id=> delete mock.items[id]);
      selected.clear();
      save(); render();
      notify(`ลบ ${toDelete.length} รายการ`, 'info', ()=>{
        backup.forEach(it=> mock.items[it.id]=it);
        save(); render();
      });
    }

    function renderRequests(){
      const pending = Object.values(mock.loans).filter(l=>l.status==='requested').sort((a,b)=> new Date(a.requestedAt)-new Date(b.requestedAt));
      document.getElementById('main').innerHTML = pending.length?`
        <h2>คำขอรออนุมัติ</h2>
        <div class="divider"></div>
        <table>
          <thead><tr><th>อุปกรณ์</th><th>ผู้ขอ</th><th>วันที่ขอ</th><th>การดำเนินการ</th></tr></thead>
          <tbody>
            ${pending.map(l=>{
              const it = mock.items[l.itemId]||{}; const u = mock.users[l.borrowerUid]||{};
              return `<tr>
                <td>${it.name||'-'}</td>
                <td>${u.name||u.email||'-'}</td>
                <td>${fmt(l.requestedAt)}</td>
                <td>
                  <button class="btn btn-primary btn-small" onclick="approve('${l.id}')"><i data-lucide='check'></i> อนุมัติ</button>
                  <button class="btn btn-secondary btn-small" onclick="rejectReq('${l.id}')"><i data-lucide='x'></i> ปฏิเสธ</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `:`<div class="empty"><i data-lucide="check-circle-2"></i><h3>ไม่มีคำขอค้างอยู่</h3></div>`;
      lucide.createIcons();
    }
    function approve(id){
      const l = mock.loans[id]; if(!l) return;
      const it = mock.items[l.itemId]; if(!it || it.available<=0){ notify('อุปกรณ์ไม่ว่าง','error'); return; }
      l.status='borrowed'; l.approvedAt=new Date(); l.dueAt=new Date(Date.now()+mock.settings.defaultLoanDays*86400000);
      it.available -= 1; save(); renderRequests(); notify('อนุมัติแล้ว','success');
    }
    function rejectReq(id){ const l=mock.loans[id]; if(!l) return; l.status='rejected'; l.rejectedAt=new Date(); save(); renderRequests(); notify('ปฏิเสธคำขอแล้ว'); }

    function renderReports(){
      const loans = Object.values(mock.loans);
      const total = loans.length;
      const returned = loans.filter(l=>l.status==='returned').length;
      const rate = total? (returned/total*100).toFixed(1) : '0.0';
      document.getElementById('main').innerHTML = `
        <h2>รายงาน</h2>
        <div class="divider"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:8px">
          ${cardStat('การยืมทั้งหมด', total)}
          ${cardStat('อัตราการคืน (%)', rate)}
        </div>
        <p class="hint">จะเพิ่มการส่งออก CSV และกราฟได้อีก บอกผมได้เลย</p>
      `;
    }
    function renderSettings(){
      document.getElementById('main').innerHTML = `
        <h2>ตั้งค่า</h2>
        <div class="divider"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:760px">
          <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px">
            <label>จำนวนวันยืมเริ่มต้น</label>
            <input class="input" type="number" min="1" max="30" value="${mock.settings.defaultLoanDays}" onchange="mock.settings.defaultLoanDays=parseInt(this.value); save(); notify('บันทึกแล้ว')">
          </div>
          <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px">
            <label>จำนวนการยืมสูงสุดต่อคน</label>
            <input class="input" type="number" min="1" max="10" value="${mock.settings.maxLoansPerUser}" onchange="mock.settings.maxLoansPerUser=parseInt(this.value); save(); notify('บันทึกแล้ว')">
          </div>
          <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px" class="full">
            <label><input type="checkbox" ${mock.settings.autoApprove?'checked':''} onchange="mock.settings.autoApprove=this.checked; save(); notify('บันทึกแล้ว')"> อนุมัติอัตโนมัติ</label>
          </div>
        </div>
      `;
    }

    // Views (student)
    function renderHome(){
      const q = search.toLowerCase();
      const list = Object.values(mock.items).filter(i=> i.name.toLowerCase().includes(q) || (i.description||'').toLowerCase().includes(q));
      document.getElementById('main').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h2>อุปกรณ์ที่มีให้ยืม</h2>
          <span class="hint">${list.length} รายการ</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
          ${list.map(i=>`
            <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px">
              <div style="display:flex;justify-content:space-between"><strong>${i.name}</strong><span class="badge">${mock.categories[i.category]||i.category}</span></div>
              <div class="hint">${i.description||''}</div>
              <div style="margin:6px 0">ว่าง: ${i.available>0?`<span class="available">${i.available}</span>`:`<span class="unavailable">${i.available}</span>`}/${i.total}</div>
              <button class="btn btn-primary btn-small" ${i.available>0?'':'disabled'} onclick="requestBorrow('${i.id}')"><i data-lucide="plus"></i> ขอใช้</button>
            </div>
          `).join('')}
        </div>
      `;
      lucide.createIcons();
    }
    function renderMy(){
      const my = Object.values(mock.loans).filter(l=> l.borrowerUid===currentUser.id).sort((a,b)=> new Date(b.requestedAt)-new Date(a.requestedAt));
      document.getElementById('main').innerHTML = my.length?`
        <h2>การยืมของฉัน</h2>
        <div class="divider"></div>
        <table>
          <thead><tr><th>อุปกรณ์</th><th>สถานะ</th><th>วันที่ขอ</th><th>กำหนดคืน</th></tr></thead>
          <tbody>${my.map(l=>{
            const it = mock.items[l.itemId]||{};
            const status = l.status==='requested'?'status-req':(l.status==='borrowed'?'status-bor':(l.status==='returned'?'status-ret':'status-ovd'));
            const txt = l.status==='requested'?'รออนุมัติ':(l.status==='borrowed'?'กำลังยืม':(l.status==='returned'?'คืนแล้ว':'ถูกปฏิเสธ'));
            return `<tr><td>${it.name||'-'}</td><td><span class="badge ${status}">${txt}</span></td><td>${fmt(l.requestedAt)}</td><td>${fmt(l.dueAt)}</td></tr>`;
          }).join('')}</tbody>
        </table>
      `:`<div class="empty"><i data-lucide="inbox"></i><h3>ยังไม่มีการยืม</h3></div>`;
      lucide.createIcons();
    }
    function renderNoti(){
      document.getElementById('main').innerHTML = `<div class="empty"><i data-lucide="bell"></i><h3>ยังไม่มีการแจ้งเตือน</h3></div>`;
      lucide.createIcons();
    }

    // Borrow flow
    function requestBorrow(itemId){
      const it = mock.items[itemId];
      if(!it || it.available<=0){ notify('อุปกรณ์ไม่ว่าง','error'); return; }
      // check limit
      const active = Object.values(mock.loans).filter(l=> l.borrowerUid===currentUser.id && (l.status==='requested'||l.status==='borrowed')).length;
      if(active >= mock.settings.maxLoansPerUser){ notify(`ยืมได้สูงสุด ${mock.settings.maxLoansPerUser} รายการ`,'error'); return; }

      const loanId = id();
      const auto = mock.settings.autoApprove && it.available>0;
      mock.loans[loanId] = {
        id:loanId,itemId,borrowerUid:currentUser.id,
        status:auto?'borrowed':'requested',
        requestedAt:new Date(),
        approvedAt: auto?new Date():null,
        dueAt: auto? new Date(Date.now()+mock.settings.defaultLoanDays*86400000) : null,
      };
      if(auto){ it.available -= 1; }
      save(); renderHome();
      notify(auto?`ยืม "${it.name}" สำเร็จ`:`ส่งคำขอแล้ว: ${it.name}`,'success');
    }

    // Item modal
    function openItemModal(id=null){
      const isEdit = !!id;
      const item = isEdit? mock.items[id] : { name:'',category:'electronics',description:'',total:1,available:1,location:'' };
      const cats = Object.entries(mock.categories).map(([k,v])=>`<option value="${k}" ${item.category===k?'selected':''}>${v}</option>`).join('');
      const host = document.createElement('div');
      host.className='backdrop'; host.id='modalHost';
      host.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <h3>${isEdit?'แก้ไขอุปกรณ์':'เพิ่มอุปกรณ์'}</h3>
          <div class="grid">
            <div class="field">
              <label>ชื่ออุปกรณ์</label>
              <input id="m_name" class="input" value="${escape(item.name)}" placeholder="เช่น กล้องจุลทรรศน์" />
              <div id="e_name" class="error hidden">กรุณากรอกชื่อ</div>
            </div>
            <div class="field">
              <label>หมวดหมู่</label>
              <select id="m_cat" class="select">${cats}</select>
            </div>
            <div class="field full">
              <label>รายละเอียด</label>
              <textarea id="m_desc" class="textarea" placeholder="คำอธิบายการใช้งาน">${escape(item.description||'')}</textarea>
            </div>
            <div class="field">
              <label>ทั้งหมด</label>
              <input id="m_total" type="number" min="0" class="input" value="${item.total||0}" />
            </div>
            <div class="field">
              <label>ว่าง</label>
              <input id="m_avail" type="number" min="0" class="input" value="${item.available||0}" />
              <div id="e_avail" class="error hidden">ว่างต้องไม่มากกว่าทั้งหมด</div>
            </div>
            <div class="field full">
              <label>สถานที่</label>
              <input id="m_loc" class="input" value="${escape(item.location||'')}" placeholder="เช่น ห้องปฏิบัติการ A" />
            </div>
          </div>
          <div class="actions">
            ${isEdit?`<button class="btn btn-secondary btn-small" onclick="delItem('${id}')"><i data-lucide='trash-2'></i> ลบ</button>`:''}
            <button class="btn btn-secondary btn-small" onclick="closeModal()">ยกเลิก (Esc)</button>
            <button class="btn btn-primary btn-small" onclick="saveItem('${id||''}')"><i data-lucide='check'></i> บันทึก (Enter)</button>
          </div>
        </div>`;
      document.body.appendChild(host);
      lucide.createIcons();
      document.getElementById('m_name').focus();

      // keyboard
      host.onkeydown = (e)=>{
        if(e.key==='Escape'){ closeModal(); }
        if(e.key==='Enter'){ saveItem(id||''); }
      };
      host.addEventListener('click',e=>{ if(e.target===host) closeModal(); });
    }
    function closeModal(){ const m=document.getElementById('modalHost'); if(m) m.remove(); }
    function escape(s){ return (s||'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }
    function saveItem(id){
      const name = document.getElementById('m_name').value.trim();
      const category = document.getElementById('m_cat').value;
      const description = document.getElementById('m_desc').value.trim();
      const total = Math.max(0, parseInt(document.getElementById('m_total').value||'0'));
      const available = Math.max(0, parseInt(document.getElementById('m_avail').value||'0'));
      const location = document.getElementById('m_loc').value.trim();
      document.getElementById('e_name').classList.toggle('hidden', !!name);
      document.getElementById('e_avail').classList.toggle('hidden', available<=total);
      if(!name || available>total) return;

      if(id){
        const old = mock.items[id];
        const borrowed = old.total - old.available;
        const minAvail = Math.max(0, total - borrowed);
        const finalAvail = Math.max(minAvail, available);
        mock.items[id] = { ...old, name, category, description, total, available: finalAvail, location };
        notify('บันทึกการแก้ไขแล้ว','success');
      }else{
        const nid = idGen();
        mock.items[nid] = { id:nid,name,category,description,total,available,location,addedAt:new Date() };
        notify('เพิ่มอุปกรณ์แล้ว','success');
      }
      save(); closeModal(); render();
    }
    function idGen(){ return 'i_' + Math.random().toString(36).slice(2,9); }
    function delItem(id){
      const it = mock.items[id];
      const borrowed = it.total - it.available;
      if(borrowed>0){ notify(`ไม่สามารถลบได้ มีการยืมอยู่ ${borrowed} รายการ`,'error'); return; }
      const backup = {...it};
      delete mock.items[id];
      save(); closeModal(); render();
      notify(`ลบ "${it.name}" แล้ว`,'info', ()=>{ mock.items[id]=backup; save(); render(); });
    }

    // Global search and shortcuts
    document.getElementById('globalSearch').addEventListener('input', e=>{ search=e.target.value; render(); });
    window.addEventListener('keydown', e=>{
      if(e.key==='/'){ e.preventDefault(); document.getElementById('globalSearch').focus(); }
      if(!currentUser) return;
      if(e.key==='n' && currentUser.role==='admin'){ openItemModal(); }
      if(e.key==='g'){ window._gPressed = true; setTimeout(()=> window._gPressed=false, 600); }
      if(window._gPressed && e.key==='m'){ goto('manage'); }
      if(window._gPressed && e.key==='d'){ goto('dashboard'); }
    });
    document.getElementById('fabAdd').onclick = ()=> openItemModal();

    // Init icons
    if(typeof lucide!=='undefined'){ lucide.createIcons(); }
  
