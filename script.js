// Hitam adalah tema bawaan. Penyimpanan opsional: tetap berfungsi di preview sandbox.
    try {
      document.documentElement.dataset.theme = localStorage.getItem('noex_glass_theme') === 'graphite' ? 'graphite' : 'dark';
      if (localStorage.getItem('noex_glass_motion') === 'off') document.documentElement.dataset.motion = 'off';
    } catch (_) {}

'use strict';
// NOEX / LIQUID GLASS — front-end demo; API hanya melalui proxy same-origin.
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const memory = new Map();
const storage = {
  get(key, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key) ?? memory.get(key) ?? null; } catch (_) { return memory.get(key) ?? null; } },
  set(key, value, session = false) { memory.set(key, value); try { (session ? sessionStorage : localStorage).setItem(key, value); return true; } catch (_) { return false; } },
  remove(key, session = false) { memory.delete(key); try { (session ? sessionStorage : localStorage).removeItem(key); } catch (_) {} }
};
const jsonRead = (key, fallback, session = false) => { try { return JSON.parse(storage.get(key, session)) ?? fallback; } catch (_) { return fallback; } };
let uidCount = 0;
const uid = () => 'nx_' + Date.now().toString(36) + '_' + (++uidCount).toString(36) + Math.random().toString(36).slice(2, 6);
const validID = value => typeof value === 'string' && /^[a-z0-9_-]{1,100}$/i.test(value);
const SESSION_KEY = 'noex_user';
const SETTINGS_KEY = 'noex_glass_settings';
const USER = { name: 'Dimas Pratama', first: 'Dimas', email: '', plan: 'Paket Gratis' };
let chats = [], current = null, attachments = [], editNode = null, activeRun = null;
let toastTimer, authBusy = false, authTimer = null, runtimeKey = '', pendingAction = null;
let fileEpoch = 0, readingFiles = 0, queuedRender = false, storageWarned = false;
const input = $('input');
const DEFAULT_SETTINGS = { base: 'https://api.openai.com/v1', persona: 'default', sysprompt: '', models: { cepat: 'gpt-4o-mini', pro: 'gpt-4o', nalar: 'o3-mini' } };
let SERVER_CFG = { hasServerKey: false, defaultBase: DEFAULT_SETTINGS.base, fetched: false, checked: false };
let configPromise = null;

const PERSONAS = [
  { id:'default', name:'NoeX Standar', sys:'Kamu adalah NoeX, asisten AI berbahasa Indonesia yang ramah, jelas, dan efektif. Jawab dengan bahasa Indonesia yang natural kecuali diminta bahasa lain.' },
  { id:'writer', name:'Penulis', sys:'Kamu adalah penulis profesional berbahasa Indonesia. Fokus pada struktur yang rapi, gaya yang mengalir, dan kata yang tepat. Tawarkan versi alternatif bila diminta.' },
  { id:'coder', name:'Programmer', sys:'Kamu adalah software engineer senior. Jawab dengan kode yang benar dan bisa dijalankan, penjelasan singkat, serta edge case dan pertimbangan keamanan bila relevan.' },
  { id:'teacher', name:'Guru', sys:'Kamu adalah guru yang sabar. Jelaskan konsep dari dasar dengan analogi sederhana. Hindari jargon tanpa penjelasan. Tutup dengan ringkasan atau pertanyaan pemahaman.' },
  { id:'business', name:'Bisnis', sys:'Kamu adalah konsultan bisnis praktis. Berikan analisis jelas dan rekomendasi yang bisa dieksekusi. Nyatakan asumsi dalam perkiraan angka.' },
  { id:'creative', name:'Kreatif', sys:'Kamu adalah partner brainstorming yang berani dan playful. Utamakan ide orisinal dan kombinasi tak terduga. Berikan beberapa opsi sebelum menyempit ke satu arah.' },
  { id:'custom', name:'Kustom', sys:'' }
];
const TEMPLATES = [
  {cat:'Menulis',t:'Email penawaran singkat',p:'Bantu aku menulis email penawaran jasa ke calon klien. Konteks: [jelaskan jasa & klien]. Gaya: sopan, singkat, fokus pada manfaat, tutup dengan call to action yang halus.'},
  {cat:'Menulis',t:'Perbaiki & rapikan tulisan',p:'Perbaiki tata bahasa, ejaan, dan alur tulisan berikut tanpa mengubah makna:\n\n[tempel tulisan]'},
  {cat:'Menulis',t:'Ringkas jadi 3 poin',p:'Rangkum teks berikut menjadi maksimal 3 poin utama, langsung ke inti:\n\n[tempel teks]'},
  {cat:'Kerja',t:'Rencana kerja 1 minggu',p:'Buatkan rencana kerja untuk 1 minggu ke depan dengan prioritas tinggi/sedang/rendah, estimasi waktu tiap tugas, dan hasil yang diharapkan. Konteks pekerjaanku: [isi]'},
  {cat:'Kerja',t:'Bahan presentasi',p:'Buat kerangka presentasi 10 slide tentang [topik] untuk audiens [audiens]. Sertakan judul slide, 3 poin utama per slide, dan catatan pembicara singkat.'},
  {cat:'Kerja',t:'Balas email sulit',p:'Tulis balasan email yang profesional namun tegas untuk situasi berikut: [jelaskan situasi]. Tujuan: [tolak dengan sopan / negosiasi / minta waktu]'},
  {cat:'Coding',t:'Jelaskan error',p:'Jelaskan error berikut: apa penyebabnya, kenapa terjadi, dan cara memperbaikinya dengan contoh kode:\n\n[tempel error + kode]'},
  {cat:'Coding',t:'Review kode',p:'Review kode berikut: temukan bug, masalah keamanan, dan peluang refactor. Urutkan dari paling penting, sertakan perbaikannya:\n\n[tempel kode]'},
  {cat:'Coding',t:'Buat fungsi dari spesifikasi',p:'Buatkan fungsi dengan spesifikasi berikut (bahasa: [JS/Python/dll]):\n- Input: \n- Output: \n- Edge case: \nSertakan contoh pemakaian dan unit test singkat.'},
  {cat:'Belajar',t:'Rencana belajar 4 minggu',p:'Buatkan rencana belajar 4 minggu untuk [topik] dengan level [pemula/menengah]. Susun per minggu: materi, praktik, dan mini-proyek. Alokasikan waktu harian yang realistis.'},
  {cat:'Belajar',t:'Jelaskan sederhana',p:'Jelaskan [konsep] seolah-olah aku baru pertama kali mendengarnya. Gunakan analogi kehidupan sehari-hari, lalu tutup dengan 2 pertanyaan untuk menguji pemahamanku.'},
  {cat:'Belajar',t:'Kuis pemahaman',p:'Buatkan 5 pertanyaan kuis (pilihan ganda + jawaban + penjelasan) tentang [topik] untuk mengukur pemahamanku di level [tingkat].'}
];
const SUGGEST = [
  {icon:'mail',t:'Tulis email penawaran',sub:'Kata yang tepat, kesan yang baik.',p:'Bantu aku menulis email penawaran jasa yang singkat dan sopan untuk calon klien baru.'},
  {icon:'bulb',t:'Jelaskan dengan sederhana',sub:'Ubah yang rumit jadi mudah.',p:'Jelaskan cara kerja blockchain seolah-olah aku baru pertama kali mendengarnya.'},
  {icon:'calendar',t:'Rencana belajar 4 minggu',sub:'Langkah kecil, kemajuan nyata.',p:'Buatkan rencana belajar 4 minggu untuk dasar-dasar desain UI.'},
  {icon:'list',t:'Rapikan catatan rapat',sub:'Dari banyak ide ke aksi nyata.',p:'Ubah catatan rapat berantakan menjadi poin tindak lanjut yang jelas.'}
];

function toast(message) {
  $('toast-text').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3600);
}
function openModal(id) { const modal = $(id); if (!modal.open) modal.showModal(); }
function closeModal(id) { $(id).close(); }
function switchTab(tab, focus = false) {
  if (authBusy) return;
  const login = tab !== 'register';
  $('form-login').hidden = !login; $('form-register').hidden = login;
  for (const id of ['login','register']) {
    const chosen = login === (id === 'login');
    $('tab-' + id).setAttribute('aria-selected', String(chosen));
    $('tab-' + id).tabIndex = chosen ? 0 : -1;
  }
  document.querySelector('.auth-tabs').classList.toggle('register', !login);
  $('auth-heading').textContent = login ? 'Selamat datang kembali.' : 'Ide besar dimulai di sini.';
  $('auth-subheading').textContent = login ? 'Masuk dan lanjutkan hal-hal hebatmu.' : 'Buat ruangmu. Mulai sesuatu yang berarti.';
  if (focus) $(login ? 'tab-login' : 'tab-register').focus();
  hideAlert();
}
function togglePassword(id, button) {
  const field = $(id), show = field.type === 'password', label = id === 'set-key' ? 'API key' : 'kata sandi';
  field.type = show ? 'text' : 'password';
  button.innerHTML = icon(show ? 'eye-off' : 'eye');
  button.setAttribute('aria-label', (show ? 'Sembunyikan ' : 'Tampilkan ') + label);
  button.setAttribute('aria-pressed', String(show));
}
function showAlert(message) { $('alert-msg').textContent = message; $('auth-alert').hidden = false; }
function hideAlert() { $('auth-alert').hidden = true; }
function handleForgotPassword() {
  if (!$('login-email').value || !$('login-email').checkValidity()) { showAlert('Isi alamat email yang valid terlebih dahulu.'); $('login-email').focus(); return; }
  showAlert('Ini demo tampilan. Email reset belum dikirim karena layanan autentikasi belum terhubung.');
}
function nameFromEmail(email) { return email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Pengguna'; }
function setAuthBusy(value) {
  authBusy = value;
  document.querySelectorAll('.auth-content button:not(.inline-link)').forEach(el => { el.disabled = value; });
}
function submitAuth(btnId, user, busyLabel) {
  if (authBusy) return;
  const button = $(btnId), label = button?.querySelector('span'), old = label?.textContent;
  setAuthBusy(true); if (label) label.textContent = busyLabel;
  authTimer = setTimeout(() => {
    setAuthBusy(false); if (label) label.textContent = old;
    $('login-password').value = ''; $('reg-password').value = '';
    enterApp(user);
  }, 550);
}
function handleLogin(event) { event.preventDefault(); const email = $('login-email').value.trim().toLowerCase(); submitAuth('btn-login', {name:nameFromEmail(email),email}, 'Membuka ruangmu…'); }
function handleRegister(event) { event.preventDefault(); submitAuth('btn-register', {name:$('reg-name').value.trim() || 'Pengguna',email:$('reg-email').value.trim().toLowerCase()}, 'Menyiapkan ruangmu…'); }
function loginWithOAuth(provider) {
  if (authBusy) return;
  showAlert('Demo ' + provider + ' — tidak terhubung ke akun asli. Membuka ruang percakapan…');
  submitAuth(null, {name:'Dimas Pratama',email:provider.toLowerCase()+'@demo.noex.local'}, '');
}
function enterApp(user) {
  USER.name = String(user.name || 'Pengguna').trim().slice(0,80) || 'Pengguna';
  USER.first = USER.name.split(/\s+/)[0]; USER.email = String(user.email || '').slice(0,200);
  USER.plan = user.plan === 'Paket Pro' ? 'Paket Pro' : 'Paket Gratis';
  $('user-name').textContent = USER.name;
  $('user-avatar').textContent = USER.name.split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
  storage.set(SESSION_KEY, JSON.stringify(USER), true);
  applyPlan(); hideAlert();
  $('view-auth').hidden = true; $('view-app').hidden = false;
  document.title = 'Chat · NoeX.ai';
  storageWarned = false;
  const saved = jsonRead(chatKey(), null);
  chats = Array.isArray(saved) ? saved.map(normalizeChat).filter(Boolean) : seedChats();
  current = null; editNode = null; clearComposer();
  if (!Array.isArray(saved)) saveChats();
  closeMobileSidebar(); renderAll(true); input.focus({preventScroll:true});
}
function logout() {
  stopResponse(); saveChats(); closePay();
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  storage.remove(SESSION_KEY, true); runtimeKey = ''; chats = []; current = null;
  clearComposer(); $('form-login').reset(); $('form-register').reset();
  for (const id of ['login-password','reg-password']) {
    $(id).type = 'password'; const btn = $(id).nextElementSibling; btn.innerHTML = icon('eye'); btn.setAttribute('aria-label','Tampilkan kata sandi');
  }
  $('view-app').hidden = true; $('view-auth').hidden = false;
  document.title = 'Masuk ke NoeX.ai'; switchTab('login'); $('login-email').focus();
}
function openLegal(which) {
  $('info-title').textContent = which === 'terms' ? 'Tentang demo NoeX.ai' : 'Privasi di demo ini';
  $('info-body').innerHTML = which === 'terms'
    ? '<p>Ini adalah prototipe antarmuka, bukan layanan akun atau pembayaran sungguhan. Login, OAuth, reset kata sandi, dan paket Pro hanya untuk demonstrasi.</p><p>Jangan memasukkan kata sandi atau data pembayaran asli. Jawaban AI berupa simulasi sampai proxy dan API model terkonfigurasi.</p>'
    : '<p>Percakapan, lampiran, dan preferensi disimpan di browser ini bila penyimpanan tersedia. Tidak ada sinkronisasi akun atau klaim enkripsi end-to-end.</p><p>Kata sandi demo tidak disimpan. API key BYOK hanya berada di memori tab. Jika mode API diaktifkan, pesan serta gambar atau teks lampiran dikirim melalui proxy ke penyedia model yang dikonfigurasi.</p><p>Di preview yang memblokir penyimpanan, data hanya bertahan selama halaman terbuka. Hapus percakapan dari menu atau bersihkan data situs untuk menghapus data lokal.</p>';
  openModal('info-modal');
}

// Tema hitam obsidian / graphite; keduanya tetap monokrom.
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const graphite = theme === 'graphite';
  document.querySelectorAll('.theme-toggle').forEach(button => {
    const label = graphite ? 'Beralih ke hitam obsidian' : 'Beralih ke tema graphite';
    button.innerHTML = icon(graphite ? 'moon' : 'sun'); button.setAttribute('aria-label',label); button.title = label; button.setAttribute('aria-pressed',String(graphite));
  });
  document.querySelector('meta[name="theme-color"]').content = graphite ? '#161616' : '#080808';
}
function toggleTheme() { const theme = document.documentElement.dataset.theme === 'dark' ? 'graphite' : 'dark'; applyTheme(theme); storage.set('noex_glass_theme',theme); }
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function motionEnabled() { return !reducedMotion.matches && document.documentElement.dataset.motion !== 'off'; }
function syncMotion() {
  document.querySelectorAll('.motion-toggle').forEach(button => {
    button.setAttribute('aria-pressed',String(motionEnabled()));
    button.querySelector('.motion-label').textContent = reducedMotion.matches ? 'Gerakan dikurangi' : motionEnabled() ? 'Efek hidup aktif' : 'Efek hidup dijeda';
  });
}
function toggleMotion() {
  if (reducedMotion.matches) { toast('Animasi mengikuti pengaturan reduced motion pada perangkatmu.'); return; }
  const off = motionEnabled(); document.documentElement.dataset.motion = off ? 'off' : 'on';
  storage.set('noex_glass_motion',off ? 'off' : 'on'); syncMotion();
}
reducedMotion.addEventListener('change',syncMotion);
let pointerFrame = null, pointerX = 0, pointerY = 0, pointerSurface = null;
document.addEventListener('pointermove', event => {
  if (!motionEnabled() || event.pointerType === 'touch') return;
  pointerX = event.clientX; pointerY = event.clientY; pointerSurface = event.target.closest('[data-reactive]');
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = null;
    $('cursor-light').style.transform = `translate3d(${pointerX-350}px,${pointerY-350}px,0)`;
    if (!pointerSurface) return;
    const r = pointerSurface.getBoundingClientRect();
    const x = (pointerX-r.left)/r.width, y = (pointerY-r.top)/r.height;
    pointerSurface.style.setProperty('--gx', `${x*100}%`); pointerSurface.style.setProperty('--gy',`${y*100}%`);
    if (pointerSurface.classList.contains('auth-card')) {
      document.querySelector('.art-parallax').style.setProperty('--rx', `${(y-.5)*-5}deg`);
      document.querySelector('.art-parallax').style.setProperty('--ry', `${(x-.5)*7}deg`);
    }
  });
}, {passive:true});
document.addEventListener('pointerdown',event => {
  const button = event.target.closest('.btn, .suggestion');
  if (!button || button.disabled || !motionEnabled()) return;
  const r = button.getBoundingClientRect(), size = Math.max(r.width,r.height), ripple = document.createElement('span');
  ripple.className = 'ripple'; ripple.setAttribute('aria-hidden','true');
  Object.assign(ripple.style,{width:size+'px',height:size+'px',left:(event.clientX-r.left-size/2)+'px',top:(event.clientY-r.top-size/2)+'px'});
  button.appendChild(ripple); setTimeout(()=>ripple.remove(),700);
}, {passive:true});

// Penyimpanan pesan berbentuk pohon: mengedit/regenerasi tidak menimpa cabang lama.
function chatKey() { return 'noex_glass_chats_' + encodeURIComponent((USER.email || USER.name || 'demo').toLowerCase()); }
function makeChat(title, at = Date.now()) { return {id:uid(),title,createdAt:at,updatedAt:at,persona:getSettings().persona,model:$('model').value || 'pro',pinned:false,nodes:[],choices:{}}; }
function addNode(chat, role, text, parent = null, files = []) {
  const node = {id:uid(),parent,r:role,t:String(text || ''),files,at:Date.now()};
  chat.nodes.push(node); chat.choices[parent || 'root'] = node.id; return node;
}
function pathFor(chat) {
  if (!chat) return [];
  const result = [], seen = new Set(); let parent = null;
  while (result.length < 1000) {
    const children = chat.nodes.filter(n => n.parent === parent); if (!children.length) break;
    const node = children.find(n => n.id === chat.choices[parent || 'root']) || children[0];
    if (seen.has(node.id)) break;
    seen.add(node.id); result.push(node); parent = node.id;
  }
  return result;
}
function normalizeChat(chat) {
  if (!chat || typeof chat.title !== 'string' || !Array.isArray(chat.nodes)) return null;
  const normalized = { ...makeChat(chat.title.slice(0,100)), ...chat, id:validID(chat.id) ? chat.id : uid(), choices:chat.choices && typeof chat.choices === 'object' ? chat.choices : {} };
  normalized.nodes = chat.nodes.filter(n => n && validID(n.id) && (n.parent === null || validID(n.parent)) && ['a','u'].includes(n.r)).map(n => ({...n,t:String(n.t || ''),streaming:false,files:Array.isArray(n.files) ? n.files.filter(f => f && typeof f.name === 'string' && typeof f.url === 'string' && f.url.startsWith('data:')) : []}));
  normalized.persona = PERSONAS.some(p=>p.id===chat.persona) ? chat.persona : 'default';
  normalized.model = ['cepat','pro','nalar'].includes(chat.model) ? chat.model : 'pro';
  return normalized;
}
function seedChats() {
  const seeds = [
    ['Ide nama brand kopi lokal',0,'Bantu aku cari nama brand untuk kedai kopi yang memakai biji lokal.','Beberapa arah nama yang bisa kamu pertimbangkan:\n\n- **Lereng Kopi** — mengingatkan pada kebun di lereng gunung.\n- **Biji Tanah** — hangat dan membumi.\n- **Seduh Pelan** — santai dan mudah diingat.\n\nMau saya kembangkan salah satunya, lengkap dengan tagline dan gaya visual?'],
    ['Ringkasan rapat mingguan',0,'Rangkum catatan rapat ini jadi 3 poin tindak lanjut.','Tempel catatan rapatnya di sini. Saya ubah jadi tiga poin tindak lanjut, lengkap dengan penanggung jawab dan tenggat.'],
    ['Debug fungsi login JavaScript',1,'Kenapa tombol "Lupa kata sandi" tidak jalan?','Cek argumen yang dikirim ke fungsinya. Kalau ada typo pada `event`, browser bisa melempar `ReferenceError` dan handler berhenti sebelum notifikasi muncul.'],
    ['Rencana konten Instagram',4,'Buatkan kerangka konten Instagram untuk satu minggu.','Kerangka sederhana:\n\n- **Senin:** tips singkat\n- **Rabu:** di balik layar\n- **Jumat:** cerita pelanggan\n\nSaya bisa lengkapi dengan ide caption untuk tiap hari.']
  ];
  return seeds.map(([title,days,question,answer]) => {
    const chat = makeChat(title,Date.now()-days*86400000); const u = addNode(chat,'u',question); const a = addNode(chat,'a',answer,u.id); a.demo = true; return chat;
  });
}
function saveChats() {
  const persisted = storage.set(chatKey(), JSON.stringify(chats));
  if (!persisted && !storageWarned && chats.some(c=>c.nodes.some(n=>n.files?.length))) { storageWarned = true; toast('Penyimpanan tidak tersedia/penuh. Lampiran hanya tersimpan di memori tab ini.'); }
}
function groupFor(chat) {
  const now = new Date(); now.setHours(0,0,0,0); const at = new Date(chat.updatedAt || chat.createdAt || Date.now()); at.setHours(0,0,0,0);
  const days = Math.round((now-at)/86400000);
  return days <= 0 ? 'Hari ini' : days === 1 ? 'Kemarin' : days < 7 ? '7 hari terakhir' : 'Sebelumnya';
}
function renderHistory() {
  const q = $('search').value.trim().toLowerCase();
  const list = chats.filter(c => c.title.toLowerCase().includes(q) || (q && pathFor(c).some(m => m.t.toLowerCase().includes(q))));
  if (!list.length) { $('history').innerHTML = `<p class="history-empty">${q ? 'Tidak ada percakapan yang cocok.' : 'Ruang baru, ide baru.<br>Mulai percakapan pertamamu.'}</p>`; return; }
  const item = chat => `<div class="history-item ${chat === current ? 'active' : ''}"><button type="button" class="history-open" onclick="openChat('${chat.id}')" ${chat === current ? 'aria-current="true"' : ''}>${icon(chat.pinned?'pin':'chat')}<span>${esc(chat.title)}</span></button><span class="history-controls"><button class="mini-btn" type="button" onclick="togglePinById('${chat.id}')" title="${chat.pinned?'Lepas sematan':'Sematkan'}" aria-label="${chat.pinned?'Lepas sematan':'Sematkan'} percakapan ${esc(chat.title)}" aria-pressed="${!!chat.pinned}">${icon('pin')}</button><button class="mini-btn" type="button" onclick="deleteChatById('${chat.id}')" aria-label="Hapus percakapan ${esc(chat.title)}" title="Hapus percakapan">${icon('x')}</button></span></div>`;
  const groups = ['Disematkan','Hari ini','Kemarin','7 hari terakhir','Sebelumnya'];
  $('history').innerHTML = groups.map(group => {
    const rows = list.filter(c => group === 'Disematkan' ? c.pinned : !c.pinned && groupFor(c) === group).sort((a,b)=>b.updatedAt-a.updatedAt);
    return rows.length ? `<p class="history-group">${group}</p>` + rows.map(item).join('') : '';
  }).join('');
}
function welcome() {
  return `<div class="welcome"><div class="welcome-kicker reveal">${icon('spark')} SATU RUANG. BANYAK KEMUNGKINAN.</div><div class="welcome-brand reveal">${icon('mark')}</div><h2 class="reveal">Halo, ${esc(USER.first)}.<span>Mau mulai dari mana?</span></h2><p class="reveal">Tanya apa saja. Tulis, jelajahi, atau wujudkan ide berikutnya.</p><div class="suggestions reveal delay-one">${SUGGEST.map((s,i)=>`<button type="button" class="suggestion" onclick="send(SUGGEST[${i}].p)"><span class="suggestion-icon">${icon(s.icon)}</span><span class="suggestion-text"><strong>${s.t}</strong><small>${s.sub}</small></span>${icon('arrow-up-right')}</button>`).join('')}</div><div class="welcome-note">${icon('flask')} ${SERVER_CFG.hasServerKey || runtimeKey ? 'Mode API · permintaan melalui proxy server.' : 'Mode simulasi aktif. Hubungkan API untuk jawaban AI sungguhan.'}</div></div>`;
}
function inlineMarkdown(text) {
  // Escape lebih dulu; raw HTML tidak pernah dieksekusi.
  const codes = [];
  let safe = esc(text).replace(/`([^`]+)`/g, (_, code) => { codes.push(`<code>${code}</code>`); return '\u0000'+(codes.length-1)+'\u0000'; });
  safe = safe.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return safe.replace(/\u0000(\d+)\u0000/g,(_,i)=>codes[Number(i)] || '');
}
function fmt(source) {
  let html = '', listType = '', list = [], code = [], inCode = false, language = '';
  const flushList = () => { if (listType) html += `<${listType}>`+list.map(x=>`<li>${inlineMarkdown(x)}</li>`).join('')+`</${listType}>`; listType=''; list=[]; };
  const flushCode = () => { html += `<div class="code-block"><span class="code-label">${esc(language || 'kode')}</span><pre>${esc(code.join('\n'))}</pre></div>`; code=[]; inCode=false; };
  for (const line of String(source || '').split('\n')) {
    if (line.trim().startsWith('```')) { if (inCode) flushCode(); else {flushList();inCode=true;language=line.trim().slice(3).slice(0,30);} continue; }
    if (inCode) {code.push(line);continue;}
    const heading = line.match(/^(#{1,4})\s+(.*)$/), ul = line.match(/^\s*[-*+]\s+(.*)$/), ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (heading) { flushList(); const level=heading[1].length+1; html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`; continue; }
    if (ul || ol) { const type=ul?'ul':'ol';if(listType!==type){flushList();listType=type;}list.push((ul||ol)[1]);continue; }
    flushList(); if (!line.trim()) continue;
    if (/^\s*>/.test(line)) html += `<blockquote>${inlineMarkdown(line.replace(/^\s*>\s?/,''))}</blockquote>`;
    else html += `<p>${inlineMarkdown(line)}</p>`;
  }
  flushList(); if (inCode) flushCode(); return html;
}
function branchNav(node) {
  const siblings=current.nodes.filter(n=>n.parent===node.parent && n.r===node.r);
  if(siblings.length<2) return '';
  const index=siblings.findIndex(n=>n.id===node.id);
  return `<span class="branch-nav"><button type="button" class="mini-btn" onclick="switchBranch('${node.id}',-1)" aria-label="Cabang sebelumnya" ${index===0||activeRun?'disabled':''}>${icon('chevron-left')}</button><span aria-label="Cabang ${index+1} dari ${siblings.length}">${index+1}/${siblings.length}</span><button type="button" class="mini-btn" onclick="switchBranch('${node.id}',1)" aria-label="Cabang berikutnya" ${index===siblings.length-1||activeRun?'disabled':''}>${icon('chevron-right')}</button></span>`;
}
const safeImageURL = url => /^data:image\/(png|jpe?g|gif|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(url) ? url : '';
function fileHTML(node) {
  if (!node.files?.length) return '';
  return '<div class="file-thumbs">'+node.files.map((file,i) => file.isImage && safeImageURL(file.url) ? `<button type="button" class="file-image-btn" onclick="previewImage('${node.id}',${i})" aria-label="Lihat ${esc(file.name)}"><img src="${safeImageURL(file.url)}" alt="${esc(file.name)}"></button>` : `<span class="file-chip">${icon('file')}<span>${esc(file.name)}</span></span>`).join('')+'</div>';
}
function row(node) {
  if (node.r === 'u') {
    if (editNode === node.id) return `<div class="message-user"><div class="edit-box"><textarea id="edit-input" aria-label="Edit pesan" rows="3" onkeydown="editKeydown(event)">${esc(node.t)}</textarea><div class="edit-actions"><span>Enter simpan · Esc batal</span><button type="button" class="btn btn-glass" onclick="cancelEditMsg()">Batal</button><button type="button" class="btn btn-primary" onclick="saveEditMsg()">Simpan & kirim ulang</button></div></div></div>`;
    return `<div class="message-user"><div class="user-bubble">${fileHTML(node)}${node.t?`<div class="user-text">${esc(node.t)}</div>`:''}</div><div class="message-actions">${branchNav(node)}${!node.files?.length ? `<button type="button" class="action-btn" onclick="startEditMsg('${node.id}')" ${activeRun?'disabled':''}>${icon('edit')}Edit</button>`:''}</div></div>`;
  }
  return `<div class="message-assistant ${node.streaming?'streaming':''}"><div class="assistant-mark">${icon('mark')}</div><div class="assistant-content"><div class="assistant-name">NoeX<span class="model-tag">${node.demo?'SIMULASI':esc(node.modelLabel || 'AI')}</span></div>${node.streaming && !node.t ? '<div class="typing" aria-label="NoeX sedang mengetik"><i></i><i></i><i></i></div>' : `<div class="prose">${fmt(node.t)}</div>`}${!node.streaming ? `<div class="message-actions">${branchNav(node)}<button type="button" class="action-btn" onclick="copyMsg('${node.id}',this)">${icon('copy')}Salin</button><button type="button" class="action-btn" onclick="regenerateMsg('${node.id}')" ${activeRun?'disabled':''}>${icon('refresh')}Coba lagi</button><button type="button" class="action-btn" onclick="feedbackMsg('${node.id}','like')" aria-label="Suka respons" aria-pressed="${node.feedback==='like'}">${icon('thumb-up')}</button><button type="button" class="action-btn" onclick="feedbackMsg('${node.id}','dislike')" aria-label="Tidak suka respons" aria-pressed="${node.feedback==='dislike'}">${icon('thumb-down')}</button></div>` : ''}</div></div>`;
}
function renderMessages(forceScroll = false) {
  const box=$('messages'), oldTop=box.scrollTop, atBottom=box.scrollHeight-box.clientHeight-oldTop<100;
  box.innerHTML=current ? '<div class="message-stack">'+pathFor(current).map(row).join('')+'</div>' : welcome();
  if (current && (forceScroll || atBottom)) box.scrollTop=box.scrollHeight; else box.scrollTop=current?oldTop:0;
}
function renderAll(forceScroll = false) {
  renderHistory(); $('chat-title').textContent=current?current.title:'Percakapan baru';
  syncPersonaSelect(); if(current) $('model').value=current.model || 'pro'; renderMessages(forceScroll); syncSend(); updateConnectionLabel();
}
function scheduleRender(chat) {
  if (chat !== current || queuedRender) return;
  queuedRender=true; requestAnimationFrame(()=>{queuedRender=false;if(chat===current)renderMessages();});
}
function clearComposer() { input.value=''; attachments=[]; fileEpoch++; readingFiles=0; editNode=null; renderAttachments(); autosize(); syncSend(); }
function newChat() { stopResponse();current=null;editNode=null;clearComposer();renderAll();closeMobileSidebar();input.focus({preventScroll:true}); }
function openChat(id) { const next=chats.find(c=>c.id===id);if(!next)return; if(current!==next)stopResponse();current=next;clearComposer();renderAll(true);closeMobileSidebar();input.focus({preventScroll:true}); }
function autosize() { input.style.height='auto'; input.style.height=Math.min(input.scrollHeight || 37,160)+'px'; }
function syncSend() {
  const button=$('send');button.disabled=!activeRun && ((!input.value.trim() && !attachments.length) || readingFiles>0);
  button.classList.toggle('stopping',!!activeRun);button.innerHTML=icon(activeRun?'stop':'arrow-up');
  const label=activeRun?'Hentikan respons':readingFiles?'Membaca berkas…':'Kirim pesan';button.setAttribute('aria-label',label);button.title=label;
}
function handleSendClick() { activeRun ? stopResponse() : send(); }
function send(text) {
  const value=String(text ?? input.value).trim();
  if(activeRun || readingFiles || (!value && !attachments.length))return;
  if(!current){const title=value || 'Berkas: '+attachments[0].name;current=makeChat(title.length>36?title.slice(0,36)+'…':title);chats.unshift(current);}
  const chat=current, path=pathFor(chat), node=addNode(chat,'u',value,path.at(-1)?.id || null,attachments.slice());
  chat.updatedAt=Date.now();editNode=null;input.value='';attachments=[];renderAttachments();autosize();saveChats();
  runAssistant(chat,toHist(pathFor(chat),chat.persona),node.id);
}
function feedbackMsg(id,type){const node=current?.nodes.find(n=>n.id===id);if(!node)return;node.feedback=node.feedback===type?null:type;saveChats();renderMessages();toast(node.feedback?'Masukan disimpan di perangkat ini.':'Masukan dihapus.');}
async function copyMsg(id,button) {
  const text=current?.nodes.find(n=>n.id===id)?.t;if(text===undefined)return;
  try {
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);button.innerHTML=icon('check')+'Tersalin';setTimeout(()=>{if(button.isConnected)button.innerHTML=icon('copy')+'Salin';},1600);
  } catch (_) {
    const temp=document.createElement('textarea');temp.value=text;temp.style.cssText='position:fixed;opacity:0;left:-9999px';document.body.appendChild(temp);temp.select();
    let ok=false;try{ok=document.execCommand('copy');}catch(_){}temp.remove();
    if(ok)toast('Pesan tersalin.');else{ $('info-title').textContent='Salin pesan';$('info-body').innerHTML='<p>Clipboard dibatasi oleh preview. Pilih lalu salin teks berikut.</p><textarea rows="8" aria-label="Teks untuk disalin">'+esc(text)+'</textarea>';openModal('info-modal');$('info-body').querySelector('textarea').select(); }
  }
}
function startEditMsg(id) { if(activeRun)return;const node=current?.nodes.find(n=>n.id===id);if(!node || node.r!=='u'||node.files?.length)return;editNode=id;renderMessages();const el=$('edit-input');el.focus();el.setSelectionRange(el.value.length,el.value.length); }
function cancelEditMsg(){editNode=null;renderMessages();}
function editKeydown(event){if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();saveEditMsg();}else if(event.key==='Escape'){event.preventDefault();cancelEditMsg();}}
function saveEditMsg(){if(!editNode || !current || activeRun)return;const old=current.nodes.find(n=>n.id===editNode),value=$('edit-input').value.trim();editNode=null;if(!value||value===old.t){renderMessages();return;}const node=addNode(current,'u',value,old.parent);current.updatedAt=Date.now();saveChats();toast('Versi lama tetap tersimpan sebagai cabang.');runAssistant(current,toHist(pathFor(current),current.persona),node.id);}
function switchBranch(id,direction){if(activeRun||!current)return;const node=current.nodes.find(n=>n.id===id);if(!node)return;const siblings=current.nodes.filter(n=>n.parent===node.parent&&n.r===node.r), next=siblings[siblings.findIndex(n=>n.id===id)+direction];if(!next)return;current.choices[node.parent||'root']=next.id;editNode=null;saveChats();renderAll();}
function regenerateMsg(id){if(activeRun||!current)return;const path=pathFor(current),index=path.findIndex(n=>n.id===id);if(index<0||path[index].r!=='a')return;const node=path[index];runAssistant(current,toHist(path.slice(0,index),current.persona),node.parent);}
function togglePinById(id){const chat=chats.find(c=>c.id===id);if(!chat)return;chat.pinned=!chat.pinned;saveChats();renderHistory();toast(chat.pinned?'Percakapan disematkan.':'Sematan dilepas.');}

// Lampiran: gambar & TXT masuk ke model; PDF/DOC hanya metadata (tanpa parser dokumen).
function readFile(file,mode='data'){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Berkas tidak bisa dibaca.'));mode==='text'?reader.readAsText(file):reader.readAsDataURL(file);});}
async function handleFileSelect(event){
  const files=Array.from(event.target.files || []), epoch=fileEpoch;event.target.value='';
  for(const file of files){
    if(epoch!==fileEpoch)break;
    if(attachments.length>=6){toast('Maksimal 6 lampiran dalam satu pesan.');break;}
    if(file.size>2*1024*1024){toast('“'+file.name+'” melebihi batas 2 MB.');continue;}
    const image=/^image\/(png|jpeg|webp|gif)$/.test(file.type),txt=/\.txt$/i.test(file.name),doc=/\.(pdf|docx?)$/i.test(file.name);
    if(!image&&!txt&&!doc){toast('Format tidak didukung. Gunakan PNG, JPG, WebP, GIF, TXT, PDF, atau DOCX.');continue;}
    readingFiles++;syncSend();
    try{
      const url=await readFile(file),content=txt?(await readFile(file,'text')).slice(0,40000):'';
      if(epoch===fileEpoch){attachments.push({name:file.name,type:file.type,size:file.size,url,isImage:image,text:content});renderAttachments();if(doc)toast('Dokumen dilampirkan. Demo ini hanya mengirim nama dokumen, bukan isinya.');}
    }catch(error){toast(error.message);}finally{if(epoch===fileEpoch){readingFiles=Math.max(0,readingFiles-1);syncSend();}}
  }
}
function removeAttachment(index){attachments.splice(index,1);renderAttachments();syncSend();}
function renderAttachments(){const box=$('attachment-preview');box.hidden=!attachments.length;box.innerHTML=attachments.map((file,i)=>`<div class="attachment-pill">${file.isImage&&safeImageURL(file.url)?`<img src="${safeImageURL(file.url)}" alt="Pratinjau ${esc(file.name)}">`:icon('file')}<span title="${esc(file.name)}">${esc(file.name)}</span><button type="button" class="mini-btn" onclick="removeAttachment(${i})" aria-label="Hapus lampiran ${esc(file.name)}">${icon('x')}</button></div>`).join('');}
function previewImage(id,index){const file=current?.nodes.find(n=>n.id===id)?.files?.[index];if(!file||!safeImageURL(file.url))return;$('image-full').src=safeImageURL(file.url);$('image-full').alt=file.name;$('image-name').textContent=file.name;openModal('image-modal');}

// Menu percakapan — dialog native, aman untuk iframe yang memblokir prompt/confirm.
function toggleChatMenu(force){const menu=$('chat-menu'),open=force??menu.hidden;$('menu-pin-label').textContent=current?.pinned?'Lepas sematan':'Sematkan percakapan';menu.hidden=!open;$('chat-menu-btn').setAttribute('aria-expanded',String(open));if(open)menu.querySelector('button').focus();}
function menuAction(action){toggleChatMenu(false);if(!current){toast('Mulai atau pilih percakapan dulu.');return;}if(action==='rename')renameChat();else if(action==='pin')togglePinById(current.id);else if(action==='export')exportChat();else deleteChatById(current.id);}
function renameChat(){const chat=current;if(!chat)return;$('action-title').textContent='Ganti nama percakapan';$('action-description').textContent='Beri nama yang mudah kamu temukan kembali.';$('action-input').hidden=false;$('action-input').required=true;$('action-input').value=chat.title;$('action-confirm').textContent='Simpan nama';$('action-confirm').className='btn btn-primary';pendingAction=()=>{const title=$('action-input').value.trim();if(!title)return false;chat.title=title;saveChats();renderAll();toast('Nama percakapan diperbarui.');return true;};openModal('action-modal');$('action-input').focus();$('action-input').select();}
function deleteChatById(id){const chat=chats.find(c=>c.id===id);if(!chat)return;$('action-title').textContent='Hapus percakapan?';$('action-description').textContent='“'+chat.title+'” beserta semua cabangnya akan dihapus dari perangkat ini. Tindakan ini tidak bisa dibatalkan.';$('action-input').hidden=true;$('action-input').required=false;$('action-confirm').textContent='Hapus percakapan';$('action-confirm').className='btn btn-danger';pendingAction=()=>{if(activeRun?.chat===chat)stopResponse();chats=chats.filter(c=>c!==chat);if(current===chat){current=null;editNode=null;clearComposer();}saveChats();renderAll();toast('Percakapan dihapus.');return true;};openModal('action-modal');}
function exportChat(){if(!current)return;if(activeRun){toast('Tunggu atau hentikan respons terlebih dahulu.');return;}const text='# '+current.title+'\n\n'+pathFor(current).map(n=>(n.r==='u'?'**Kamu**':'**NoeX**')+':\n\n'+n.t+(n.files?.length?'\n\n_Lampiran: '+n.files.map(f=>f.name).join(', ')+'_':'')).join('\n\n---\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=(current.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'percakapan')+'.md';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Ekspor .md dimulai. Jika preview memblokir unduhan, buka file HTML di browser.');}
$('action-form').addEventListener('submit',event=>{event.preventDefault();if(pendingAction?.())closeModal('action-modal');});
document.addEventListener('click',event=>{if(!event.target.closest('#chat-menu-wrap'))toggleChatMenu(false);});
$('chat-menu').addEventListener('keydown',event=>{const items=Array.from($('chat-menu').querySelectorAll('button')),i=items.indexOf(document.activeElement);let next;if(event.key==='ArrowDown')next=(i+1)%items.length;if(event.key==='ArrowUp')next=(i-1+items.length)%items.length;if(event.key==='Home')next=0;if(event.key==='End')next=items.length-1;if(next!==undefined){event.preventDefault();items[next].focus();}});

// Sidebar mobile/desktop.
const DESK=matchMedia('(min-width: 1024px)');
let deskOpen=storage.get('noex_sidebar')!=='closed',mobOpen=false;
function renderSidebar(){const open=DESK.matches?deskOpen:mobOpen;$('view-app').classList.toggle('desktop-closed',DESK.matches&&!deskOpen);$('sidebar').classList.toggle('mobile-open',!DESK.matches&&mobOpen);$('sidebar').inert=!open;$('scrim').hidden=DESK.matches||!mobOpen;$('sb-open').hidden=open;$('sb-open').setAttribute('aria-expanded',String(open));$('sb-close').setAttribute('aria-expanded',String(open));$('chat-main').inert=!DESK.matches&&mobOpen;}
function toggleSidebar(open){if(DESK.matches){deskOpen=open;storage.set('noex_sidebar',open?'open':'closed');}else mobOpen=open;renderSidebar();(open?$('sb-close'):$('sb-open')).focus({preventScroll:true});}
function closeMobileSidebar(){mobOpen=false;renderSidebar();}
DESK.addEventListener('change',closeMobileSidebar);

// Pengaturan API. Tidak ada key dalam file atau localStorage.
function getSettings(){const raw=jsonRead(SETTINGS_KEY,{});return{base:typeof raw.base==='string'?raw.base:DEFAULT_SETTINGS.base,persona:PERSONAS.some(p=>p.id===raw.persona)?raw.persona:'default',sysprompt:typeof raw.sysprompt==='string'?raw.sysprompt:'',models:{...DEFAULT_SETTINGS.models,...(raw.models||{})},key:runtimeKey};}
function personaName(id){return PERSONAS.find(p=>p.id===id)?.name || 'NoeX Standar';}
function sysPromptFor(id){return id==='custom'?(getSettings().sysprompt.trim() || PERSONAS[0].sys):(PERSONAS.find(p=>p.id===id)?.sys || PERSONAS[0].sys);}
function initPersonaSelects(){const options=PERSONAS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');for(const id of ['persona','set-persona','set-current-persona'])$(id).innerHTML=options;syncPersonaSelect();}
function syncPersonaSelect(){$('persona').value=current?.persona || getSettings().persona;}
function onPersonaChange(){const value=$('persona').value;if(current){current.persona=value;saveChats();toast('Persona percakapan: '+personaName(value));}else{const s=getSettings();delete s.key;s.persona=value;storage.set(SETTINGS_KEY,JSON.stringify(s));toast('Persona bawaan: '+personaName(value));}}
function onModelChange(){if(current){current.model=$('model').value;saveChats();}toast('Model dipilih: '+$('model').selectedOptions[0].textContent);}
function updateConnectionLabel(){const real=SERVER_CFG.hasServerKey||!!runtimeKey;$('connection-label').innerHTML='<span class="status-dot"></span>'+ (real?'Mode API · via proxy':'Mode simulasi · tersimpan lokal');}
async function fetchServerConfig(){
  if(configPromise)return configPromise;
  configPromise=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);
    try{if(!/^https?:$/.test(location.protocol))throw new Error('Static');const response=await fetch('/api/config',{cache:'no-store',signal:controller.signal});if(response.ok){const j=await response.json();SERVER_CFG={hasServerKey:!!j.hasServerKey,defaultBase:typeof j.defaultBase==='string'?j.defaultBase:DEFAULT_SETTINGS.base,fetched:true,checked:true};}}
    catch(_){}finally{clearTimeout(timer);SERVER_CFG.checked=true;renderServerStatus();configPromise=null;}
    return SERVER_CFG;
  })();return configPromise;
}
function renderServerStatus(){let text;if(SERVER_CFG.hasServerKey)text='Proxy terhubung. API key tersedia di server; kolom key boleh kosong.';else if(SERVER_CFG.fetched)text='Proxy terhubung tanpa key. Isi BYOK atau lanjutkan simulasi.';else text='Mode statis / proxy belum terhubung. Chat simulasi tetap bisa digunakan.';if(SERVER_CFG.hasServerKey)text='Proxy terhubung. API key tersedia di server; kolom key boleh kosong.';$('server-status-text').textContent=text;updateConnectionLabel();}
function fillSettings(){const s=getSettings();$('set-base').value=s.base;$('set-key').value=runtimeKey;$('set-fast').value=s.models.cepat;$('set-pro').value=s.models.pro;$('set-nalar').value=s.models.nalar;$('set-persona').value=s.persona;$('set-current-persona').value=current?.persona||s.persona;$('set-model').value=current?.model||$('model').value;$('set-sysprompt').value=s.sysprompt;renderServerStatus();}
function openSettings(){fillSettings();fetchServerConfig();openModal('settings-modal');}
function saveSettings(event){event.preventDefault();let base=$('set-base').value.trim()||SERVER_CFG.defaultBase;try{const url=new URL(base);if(url.protocol!=='https:'||url.username||url.password)throw new Error();base=url.href.replace(/\/+$/,'');}catch(_){toast('Gunakan base URL HTTPS yang valid, tanpa kredensial di URL.');$('set-base').focus();return;}const s={base,persona:$('set-persona').value,sysprompt:$('set-sysprompt').value.trim(),models:{cepat:$('set-fast').value.trim()||DEFAULT_SETTINGS.models.cepat,pro:$('set-pro').value.trim()||DEFAULT_SETTINGS.models.pro,nalar:$('set-nalar').value.trim()||DEFAULT_SETTINGS.models.nalar}};runtimeKey=$('set-key').value.trim();storage.set(SETTINGS_KEY,JSON.stringify(s));$('model').value=$('set-model').value;if(current){current.model=$('set-model').value;current.persona=$('set-current-persona').value;saveChats();}syncPersonaSelect();closeModal('settings-modal');renderAll();toast(s.persona==='custom'&&!s.sysprompt?'Persona Kustom kosong — gaya standar digunakan.':runtimeKey||SERVER_CFG.hasServerKey?'Pengaturan tersimpan. Mode API memerlukan proxy yang aktif.':'Pengaturan tersimpan. Mode simulasi aktif.');}
function clearSettings(){storage.remove(SETTINGS_KEY);runtimeKey='';if(current)current.persona='default';saveChats();fillSettings();syncPersonaSelect();updateConnectionLabel();toast('Pengaturan lokal direset.');}
function toHist(nodes,persona){const messages=nodes.filter(n=>!n.streaming&&!n.error).map(n=>{
  if(n.r!=='u')return{role:'assistant',content:n.t};
  let text=n.t;const photos=[];
  for(const f of n.files||[]){if(f.isImage&&safeImageURL(f.url))photos.push({type:'image_url',image_url:{url:safeImageURL(f.url)}});else if(f.text)text+='\n\nLampiran teks '+f.name+':\n'+f.text;else text+='\n[Lampiran: '+f.name+'; konten dokumen belum tersedia]';}
  return{role:'user',content:photos.length?[{type:'text',text:text||'Perhatikan gambar terlampir.'},...photos]:text};
}).filter(m=>m.content);return[{role:'system',content:sysPromptFor(persona)},...messages];}
async function streamAI(settings,history,run,onChunk){
  const payload={base:settings.base,model:settings.models[run.chat.model]||settings.models.pro,messages:history,stream:true,apiKey:SERVER_CFG.hasServerKey?undefined:(settings.key||undefined)};
  if(run.chat.model!=='nalar')payload.temperature=.7;
  const response=await fetch('/api/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:run.controller.signal});
  if(response.status===401&&response.headers.get('x-noex-error')==='no-key'){const error=new Error('NO_KEY');error.code='NO_KEY';throw error;}
  if(!response.ok){let message='';try{const data=await response.json();message=data.error?.message||data.error||data.message||'';}catch(_){}throw new Error('HTTP '+response.status+(message?' — '+String(message).slice(0,180):'. Periksa proxy, API key, dan nama model.'));}
  if((response.headers.get('content-type')||'').includes('application/json')){const data=await response.json();if(data.error)throw new Error(data.error.message||'API mengembalikan error.');onChunk(data.choices?.[0]?.message?.content||'Tidak ada teks dalam respons API.');return;}
  if(!response.body)throw new Error('Browser tidak mendukung respons streaming.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done=false;
  const consume=line=>{if(!line.startsWith('data:'))return;const text=line.slice(5).trim();if(text==='[DONE]'){done=true;return;}let data;try{data=JSON.parse(text);}catch(_){return;}if(data.error)throw new Error(data.error.message||'Kesalahan streaming API.');const chunk=data.choices?.[0]?.delta?.content;if(typeof chunk==='string')onChunk(chunk);};
  try{while(!done){const result=await reader.read();if(result.done){buffer+=decoder.decode();if(buffer.trim())consume(buffer.trim());break;}buffer+=decoder.decode(result.value,{stream:true});let nl;while((nl=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,nl).trim());buffer=buffer.slice(nl+1);if(done)break;}}}finally{try{await reader.cancel();}catch(_){}reader.releaseLock();}
}
function delay(ms,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(new DOMException('Aborted','AbortError'));return;}const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});}
function simText(history){const last=history.at(-1),text=typeof last?.content==='string'?last.content:last?.content?.find(p=>p.type==='text')?.text||'';return 'Ini adalah **jawaban contoh**, bukan respons model AI. Mode simulasi aktif agar kamu bisa mencoba percakapan dan efek antarmukanya.\n\n**Pesanmu:**\n'+text.slice(0,1200)+'\n\nHubungkan API melalui **Pengaturan AI** untuk jawaban sungguhan. Kamu juga bisa mengedit pesan, membuat cabang, atau mencoba template prompt.';}
async function simulate(history,run,onChunk){run.node.demo=true;for(const chunk of simText(history).split(/(\s+)/)){await delay(21,run.controller.signal);if(run.settled)return;onChunk(chunk);}}
async function runAssistant(chat,history,parent){
  const node=addNode(chat,'a','',parent);node.streaming=true;
  const run={chat,node,controller:new AbortController(),settled:false};activeRun=run;renderAll(true);$('chat-announcer').textContent='NoeX sedang menyiapkan respons.';
  const append=chunk=>{if(!run.settled){node.t+=chunk;scheduleRender(chat);}};
  try{
    if(!SERVER_CFG.checked)await fetchServerConfig();if(run.settled)return;
    const settings=getSettings();
    if(SERVER_CFG.hasServerKey||settings.key){node.modelLabel={cepat:'CEPAT',pro:'PRO',nalar:'NALAR'}[chat.model];await streamAI(settings,history,run,append);}else await simulate(history,run,append);
    finishRun(run);
  }catch(error){if(run.settled)return;if(error.name==='AbortError'){node.t+='\n\n*Respons dihentikan.*';finishRun(run);}else if(error.code==='NO_KEY'){SERVER_CFG.hasServerKey=false;renderServerStatus();node.t='';try{await simulate(history,run,append);}catch(e){if(!run.settled)node.t+='\n\n*Respons dihentikan.*';}finishRun(run);}else{node.error=true;const safeMessage=String(error.message||error).replaceAll(runtimeKey||'\u0001','[key disembunyikan]');node.t='**Model belum dapat dihubungi.**\n\n'+safeMessage+'\n\nPastikan server proxy `/api/chat/completions` berjalan. Periksa base URL, API key, dan nama model di Pengaturan AI. Hapus key untuk kembali ke mode simulasi.';finishRun(run);}}
}
function finishRun(run){if(run.settled)return;run.settled=true;run.node.streaming=false;if(activeRun===run)activeRun=null;saveChats();syncSend();if(current===run.chat)renderAll();$('chat-announcer').textContent='Respons selesai.';}
function stopResponse(){const run=activeRun;if(!run)return;run.controller.abort();run.node.t+='\n\n*Respons dihentikan oleh pengguna.*';finishRun(run);}

// Template prompt.
function openTemplates(){$('tpl-search').value='';renderTemplates();openModal('prompt-modal');$('tpl-search').focus();}
function renderTemplates(){const query=$('tpl-search').value.trim().toLowerCase();const list=TEMPLATES.map((t,i)=>({...t,i})).filter(t=>(t.t+' '+t.p+' '+t.cat).toLowerCase().includes(query));if(!list.length){$('tpl-list').innerHTML='<p class="empty-result">Tidak ada template yang cocok.</p>';return;}$('tpl-list').innerHTML=[...new Set(list.map(t=>t.cat))].map(cat=>`<p class="template-category">${esc(cat)}</p>`+list.filter(t=>t.cat===cat).map(t=>`<button type="button" class="template-item" onclick="useTemplate(${t.i})"><span class="template-item-icon">${icon(cat==='Coding'?'code':cat==='Belajar'?'bulb':cat==='Menulis'?'edit':'list')}</span><span class="template-item-text"><strong>${esc(t.t)}</strong><small>${esc(t.p.replace(/\n/g,' '))}</small></span>${icon('chevron-right')}</button>`).join('')).join('');}
function useTemplate(index){input.value=TEMPLATES[index].p;closeModal('prompt-modal');autosize();syncSend();input.focus();toast('Template dimuat. Sesuaikan bagian dalam [kurung] lalu kirim.');}

// Checkout sepenuhnya simulasi. Tidak ada nomor kartu/telepon asli yang dikumpulkan.
const PRICE=49000, rupiah=n=>'Rp '+n.toLocaleString('id-ID');
const METHODS=[
  {id:'qris',g:'QRIS',label:'QRIS',sub:'Semua e-wallet & mobile banking',ab:'QR',type:'qr'},
  {id:'gopay',g:'E-wallet',label:'GoPay',ab:'GP',type:'wallet'}, {id:'dana',label:'DANA',ab:'DA',type:'wallet'}, {id:'ovo',label:'OVO',ab:'OV',type:'wallet'}, {id:'shopeepay',label:'ShopeePay',ab:'SP',type:'wallet'}, {id:'linkaja',label:'LinkAja',ab:'LA',type:'wallet'},
  {id:'livin',g:'Mobile banking',label:"Livin’ by Mandiri",ab:'Li',type:'mbank'}, {id:'brimo',label:'BRImo',ab:'BR',type:'mbank'},
  {id:'va',g:'Transfer bank',label:'Virtual Account',sub:'BCA, Mandiri, BNI, BRI, Permata, CIMB Niaga',ab:'VA',type:'va'},
  {id:'indomaret',g:'Gerai retail',label:'Indomaret',ab:'IM',type:'store'}, {id:'alfamart',label:'Alfamart',ab:'AM',type:'store'},
  {id:'card',g:'Kartu',label:'Kartu Kredit / Debit',sub:'Visa, Mastercard, JCB',ab:'CC',type:'card'}
];
let pay={step:'plan',method:'qris',bank:'BCA'}, payTimer=null;
function applyPlan(){const pro=USER.plan==='Paket Pro';$('user-plan').textContent=pro?'Paket Pro · demo':'Paket Gratis';$('upgrade-card').hidden=pro;}
function setPlan(){USER.plan='Paket Pro';storage.set(SESSION_KEY,JSON.stringify(USER),true);applyPlan();}
function qrSvg(){let cells='';for(let y=0;y<21;y++)for(let x=0;x<21;x++){const bx=x<7?0:x>13?14:-1,by=y<7?0:y>13?14:-1;let on;if(bx>=0&&by>=0&&!(bx===14&&by===14)){const a=x-bx,b=y-by;on=a===0||a===6||b===0||b===6||(a>1&&a<5&&b>1&&b<5);}else on=((x*17+y*31+x*y)%7)<3;if(on)cells+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;}return `<svg viewBox="0 0 21 21" fill="currentColor" shape-rendering="crispEdges" aria-label="Ilustrasi QR simulasi, bukan kode pembayaran" role="img">${cells}</svg>`;}
const methodBadge=m=>`<span class="method-badge">${m.ab}</span>`;
const codeBox=(label,value)=>`<div class="code-box"><span>${label}</span><strong>${value}</strong></div>`;
function payDetail(method){
  if(method.type==='qr')return `<div class="qr-wrap">${qrSvg()}<span class="qr-demo">DEMO</span></div><p class="pay-note" style="text-align:center">Ilustrasi QR saja — tidak dapat digunakan untuk membayar.</p>`;
  if(method.type==='wallet')return `<label for="pay-phone">Nomor demo ${method.label}</label><input id="pay-phone" value="0812 0000 0000" readonly aria-describedby="wallet-note"><p id="wallet-note" class="pay-note">Nomor contoh. Tidak ada permintaan yang dikirim ke aplikasi ${method.label}.</p>`;
  if(method.type==='va')return `<label for="pay-bank">Pilih bank</label><select id="pay-bank" onchange="setBank(this.value)">${['BCA','Mandiri','BNI','BRI','Permata','CIMB Niaga'].map(b=>`<option ${pay.bank===b?'selected':''}>${b}</option>`).join('')}</select>`+codeBox('Contoh virtual account '+pay.bank,'DEMO · 8808 0000 0000');
  if(method.type==='mbank'||method.type==='store')return `<p class="pay-note">Pratinjau instruksi pembayaran ${method.label}. Jangan melakukan transfer atau membayar ke kasir.</p>`+codeBox('Kode contoh, tidak berlaku','DEMO · 0000 0000');
  return `<div class="field"><label for="demo-card-name">Nama di kartu (data demo)</label><input id="demo-card-name" value="NOEX DEMO" readonly></div><div class="field"><label for="demo-card-number">Nomor kartu uji</label><input id="demo-card-number" value="4242 4242 4242 4242" readonly></div><div class="two-columns"><div class="field"><label for="demo-card-expiry">Masa berlaku demo</label><input id="demo-card-expiry" value="12/30" readonly></div><div class="field"><label for="demo-card-cvv">CVV demo</label><input id="demo-card-cvv" value="123" readonly></div></div>`;
}
function renderPay(){
  const body=$('pay-body'),method=METHODS.find(m=>m.id===pay.method)||METHODS[0];$('pay-back').hidden=!['method','pay'].includes(pay.step);$('pay-back').disabled=!!pay.processing;
  if(pay.step==='plan'){$('pay-title').textContent='Langganan NoeX Pro';body.innerHTML=`<div class="plan-card"><div class="plan-top"><h3>NoeX Pro</h3><span class="tiny-badge">LEVEL BERIKUTNYA</span></div><p class="plan-price"><b>${rupiah(PRICE)}</b> / bulan</p><ul class="plan-features">${['Pesan tanpa batas','Akses model NoeX Nalar','Respons prioritas','Riwayat percakapan tak terbatas'].map(t=>`<li>${icon('check')}${t}</li>`).join('')}</ul></div><p class="pay-note">Simulasi saja. Harga dan fitur adalah contoh; tidak ada tagihan atau perubahan akses model sungguhan.</p><button type="button" data-main class="btn btn-primary btn-full pay-main-btn" onclick="payStep('method')">Jelajahi metode pembayaran${icon('arrow-right')}</button>`;}
  else if(pay.step==='method'){$('pay-title').textContent='Metode pembayaran';body.innerHTML=`<div class="pay-summary"><span>NoeX Pro · 1 bulan · demo</span><b>${rupiah(PRICE)}</b></div>`+METHODS.map((m,i)=>(m.g?`<p class="pay-category">${m.g}</p>`:'')+`<button type="button" class="pay-method" ${i===0?'data-main':''} onclick="selectMethod('${m.id}')">${methodBadge(m)}<span><strong>${m.label}</strong>${m.sub?`<small>${m.sub}</small>`:''}</span>${icon('chevron-right')}</button>`).join('');}
  else if(pay.step==='pay'){$('pay-title').textContent=method.label;body.innerHTML=`<form onsubmit="payNow(event)"><div class="pay-summary">${methodBadge(method)}<span>NoeX Pro · 1 bulan</span><b>${rupiah(PRICE)}</b></div><div class="pay-detail">${payDetail(method)}</div><p class="pay-note">Mode simulasi. Jangan gunakan data pembayaran asli.</p><button type="submit" data-main id="pay-submit" class="btn btn-primary btn-full pay-main-btn">Simulasikan pembayaran${icon('arrow-right')}</button></form>`;}
  else{$('pay-title').textContent='Simulasi berhasil';body.innerHTML=`<div class="pay-success"><div class="success-icon">${icon('check')}</div><span class="tiny-badge">PAKET PRO · DEMO</span><h3>Lebih banyak ruang.<br>Lebih banyak kemungkinan.</h3><p>Simulasi ${method.label} selesai. Tidak ada uang yang ditagih.<br>Pesanan demo: <b>${esc(pay.order)}</b>.</p><button type="button" data-main class="btn btn-primary btn-full pay-main-btn" onclick="closePay()">Kembali ke ruang ide${icon('arrow-right')}</button></div>`;}
}
function focusPay(){$('pay-body').querySelector('[data-main]')?.focus({preventScroll:true});}
function openPay(){clearTimeout(payTimer);pay={step:'plan',method:'qris',bank:'BCA',order:null,processing:false};closeMobileSidebar();renderPay();openModal('pay-modal');focusPay();}
function closePay(){clearTimeout(payTimer);pay.processing=false;$('pay-modal').close();}
function payStep(step){if(pay.processing)return;pay.step=step;renderPay();$('pay-body').scrollTop=0;focusPay();}
function payBack(){payStep(pay.step==='pay'?'method':'plan');}
function selectMethod(method){pay.method=method;payStep('pay');}
function setBank(bank){pay.bank=bank;renderPay();$('pay-bank').focus();}
function payNow(event){event.preventDefault();if(pay.processing)return;pay.processing=true;$('pay-submit').disabled=true;$('pay-submit').textContent='Menyimulasikan pembayaran…';$('pay-back').disabled=true;payTimer=setTimeout(()=>{if(!$('pay-modal').open)return;pay.processing=false;pay.order='NX-DEMO-'+Date.now().toString(36).slice(-6).toUpperCase();setPlan();pay.step='done';renderPay();focusPay();},1100);}

// Aksesibilitas dan inisialisasi.
input.addEventListener('input',()=>{autosize();syncSend();});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();send();}});
document.querySelector('.auth-tabs').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const register=event.key==='End'||(event.key!=='Home'&&$('tab-login').getAttribute('aria-selected')==='true');switchTab(register?'register':'login',true);}});
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){dialog.id==='pay-modal'?closePay():dialog.close();}});
  dialog.addEventListener('close',()=>{if(dialog.id==='pay-modal'){clearTimeout(payTimer);pay.processing=false;}if(dialog.id==='action-modal')pendingAction=null;});
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    if(!$('chat-menu').hidden){toggleChatMenu(false);$('chat-menu-btn').focus();}
    if(mobOpen)toggleSidebar(false);
  }
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!$('view-app').hidden&&!document.querySelector('dialog[open]')){event.preventDefault();newChat();}
  if(event.key==='Tab'&&mobOpen&&!DESK.matches&&!document.querySelector('dialog[open]')){
    const elements=Array.from($('sidebar').querySelectorAll('button:not([disabled]),input,a')).filter(el=>el.offsetParent!==null),first=elements[0],last=elements.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
applyTheme(document.documentElement.dataset.theme || 'dark');syncMotion();initPersonaSelects();renderSidebar();syncSend();renderAll();fetchServerConfig();
const savedSession=jsonRead(SESSION_KEY,null,true);if(savedSession&&typeof savedSession.name==='string')enterApp(savedSession);
