/* ==========================================================================
   PortalKelas Digital — app.js (Fase 3, frontend statis GitHub Pages)
   Backend: Google Apps Script REST API murni (Kode.gs, Fase 1).
   ========================================================================== */

// >>> GANTI dengan URL Web App hasil Deploy (berakhiran /exec) <<<
const GAS_URL = 'https://script.google.com/macros/s/AKfycbySF5hLqGEFwWm9RyhTIiwiqK4OhAHK6Vy4qCHNaF69m9atcTbvlw1MyrDmEBbiPMLk/exec';

// ---------------------------------------------------------------------------
// 1. LAPISAN API
//    GET  → query string biasa (data publik, aman di-cache browser/CDN).
//    POST → WAJIB Content-Type 'text/plain;charset=utf-8' agar TIDAK memicu
//    preflight OPTIONS (yang otomatis ditolak oleh Apps Script). Token sesi
//    dikirim di body, BUKAN di header Authorization.
// ---------------------------------------------------------------------------
const Api = {
  async get(action, params) {
    const qs = new URLSearchParams(Object.assign({ action }, params || {}));
    const res = await fetch(`${GAS_URL}?${qs.toString()}`);
    return res.json();
  },
  async post(action, data) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: Sesi.token(), data: data || {} })
    });
    const j = await res.json();
    if (!j.success && j.code === 'AUTH_REQUIRED') { Sesi.keluar(); nav('#/login'); }
    return j;
  }
};

// ---------------------------------------------------------------------------
// 2. SESI (token di localStorage — per perangkat, bukan data bersama)
// ---------------------------------------------------------------------------
const Sesi = {
  token: () => localStorage.getItem('pk_token') || '',
  profil: () => { try { return JSON.parse(localStorage.getItem('pk_profil') || 'null'); } catch (e) { return null; } },
  masuk(token, profil) { localStorage.setItem('pk_token', token); localStorage.setItem('pk_profil', JSON.stringify(profil)); },
  keluar() { localStorage.removeItem('pk_token'); localStorage.removeItem('pk_profil'); },
  login() { return !!Sesi.token(); }
};

// ---------------------------------------------------------------------------
// 3. UTIL UI
// ---------------------------------------------------------------------------
function toast(msg, jenis) {
  const el = document.createElement('div');
  el.className = 'toast' + (jenis ? ' ' + jenis : '');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function rupiah(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function skeleton(n) { return `<div class="course-grid">${Array(n).fill('<div class="sk" style="height:220px"></div>').join('')}</div>`; }
function setBusy(btn, busy, labelBusy, labelNormal) {
  btn.disabled = busy;
  btn.innerHTML = busy ? `<span class="spin"></span> ${labelBusy}` : labelNormal;
}

// ---------------------------------------------------------------------------
// 4. ROUTER HASH — #/katalog, #/produk/:slug, #/checkout/:id, #/login,
//    #/aktivasi, #/dashboard, #/kelas/:id, #/modul/:id, #/profil, #/riwayat
// ---------------------------------------------------------------------------
const views = document.getElementById('views');
function nav(hash) { if (location.hash === hash) renderRoute(); else location.hash = hash; }
window.addEventListener('hashchange', renderRoute);
window.addEventListener('DOMContentLoaded', () => { renderChrome(); renderRoute(); registerSW(); setupInstallPrompt(); });

function parseHash() {
  const parts = (location.hash || '#/katalog').slice(2).split('/').filter(Boolean);
  return { page: parts[0] || 'katalog', id: parts[1] || '' };
}
async function renderRoute() {
  const { page, id } = parseHash();
  renderChrome();
  document.getElementById('boot-sk') && (document.getElementById('boot-sk').style.display = 'none');
  const butuhLogin = ['dashboard', 'kelas', 'modul', 'profil', 'riwayat'].indexOf(page) > -1;
  if (butuhLogin && !Sesi.login()) { toast('Silakan masuk terlebih dahulu', 'err'); return nav('#/login'); }
  const peta = {
    katalog: viewKatalog, produk: () => viewProdukDetail(id), checkout: () => viewCheckout(id),
    login: viewLogin, aktivasi: viewAktivasi, dashboard: viewDashboard,
    kelas: () => viewKelas(id), modul: () => viewModul(id), profil: viewProfil, riwayat: viewRiwayat
  };
  (peta[page] || viewKatalog)();
  window.scrollTo(0, 0);
}
function renderChrome() {
  const masuk = Sesi.login();
  document.getElementById('topbar').innerHTML = `
    <a href="#/katalog" class="brand"><span class="dot"></span> PortalKelas</a>
    <div class="row g12">
      ${masuk
        ? `<a href="#/dashboard" class="btn btn-ghost">Dasbor Saya</a>`
        : `<a href="#/login" class="btn btn-ghost">Masuk</a>`}
      <button id="btnTema" class="btn btn-ghost" title="Ganti tema" aria-label="Ganti tema">🌓</button>
    </div>`;
  document.getElementById('btnTema').onclick = toggleTema;
  document.getElementById('bnav').innerHTML = [
    ['katalog', '🏠', 'Katalog'], ['dashboard', '🎓', 'Kelas Saya'], ['riwayat', '🧾', 'Transaksi'], ['profil', '👤', 'Profil']
  ].map(([p, ic, lbl]) => `<a href="#/${p}" class="${parseHash().page === p ? 'active' : ''}"><span class="ic">${ic}</span>${lbl}</a>`).join('');
}
function toggleTema() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : (cur === 'light' ? null : 'dark');
  if (next) { document.documentElement.setAttribute('data-theme', next); localStorage.setItem('pk_theme', JSON.stringify(next)); }
  else { document.documentElement.removeAttribute('data-theme'); localStorage.removeItem('pk_theme'); }
}

// ---------------------------------------------------------------------------
// 5. VIEW: KATALOG (publik)
// ---------------------------------------------------------------------------
async function viewKatalog() {
  views.innerHTML = `
    <div class="card col g16" style="margin-bottom:18px">
      <div class="h1">Belajar skill baru, kapan saja 🎓</div>
      <div class="muted">Pilih kelas, bayar, dan mulai belajar langsung dari dasbor Anda.</div>
      <input class="input" id="cari" placeholder="Cari kelas atau instruktur...">
    </div>
    <div id="hasil">${skeleton(6)}</div>`;
  document.getElementById('cari').addEventListener('input', debounce(muatKatalog, 350));
  muatKatalog();
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
async function muatKatalog() {
  const cari = document.getElementById('cari')?.value || '';
  const hasil = document.getElementById('hasil');
  const j = await Api.get('katalog', { cari });
  if (!j.success) { hasil.innerHTML = `<div class="empty">Gagal memuat katalog: ${escapeHtml(j.message)}</div>`; return; }
  if (!j.produk.length) { hasil.innerHTML = `<div class="empty">Belum ada kelas yang cocok.</div>`; return; }
  hasil.innerHTML = `<div class="course-grid">${j.produk.map(p => `
    <a href="#/produk/${encodeURIComponent(p.Slug)}" class="course-card">
      <div class="thumb" style="background-image:url('${escapeHtml(p.Thumbnail_URL || '')}')"></div>
      <div class="body col g8">
        <span class="badge">${escapeHtml(p.Kategori || 'Kelas')}</span>
        <div class="nm">${escapeHtml(p.Nama)}</div>
        <div class="muted">oleh ${escapeHtml(p.Instruktur || '-')}</div>
        <div>${p.Harga_Coret ? `<span class="price-old">${rupiah(p.Harga_Coret)}</span>` : ''}<span class="price">${rupiah(p.Harga)}</span></div>
      </div>
    </a>`).join('')}</div>`;
}

// ---------------------------------------------------------------------------
// 6. VIEW: DETAIL PRODUK (publik)
// ---------------------------------------------------------------------------
async function viewProdukDetail(slug) {
  views.innerHTML = skeleton(1);
  const j = await Api.get('produkDetail', { slug });
  if (!j.success || !j.produk) { views.innerHTML = `<div class="empty">Kelas tidak ditemukan.</div>`; return; }
  const p = j.produk;
  views.innerHTML = `
    <div class="card col g16">
      <div class="thumb" style="aspect-ratio:21/9;border-radius:var(--r-md);background:var(--lav) center/cover url('${escapeHtml(p.Thumbnail_URL || '')}')"></div>
      <div class="h1">${escapeHtml(p.Nama)}</div>
      <div class="muted">oleh ${escapeHtml(p.Instruktur || '-')} · ⭐ ${p.Rating || '-'} (${p.Jumlah_Ulasan || 0} ulasan)</div>
      <p>${escapeHtml(p.Deskripsi || '')}</p>
      <div class="h2">Silabus</div>
      ${(p.Silabus || []).map((m, i) => `<div class="modul-row">${i + 1}. ${escapeHtml(m.Judul_Modul)}</div>`).join('') || '<div class="muted">Silabus menyusul.</div>'}
      <div class="row between" style="position:sticky;bottom:0;background:var(--card);padding-top:10px">
        <div>${p.Harga_Coret ? `<span class="price-old">${rupiah(p.Harga_Coret)}</span>` : ''}<span class="price" style="font-size:20px">${rupiah(p.Harga)}</span></div>
        <a href="#/checkout/${p.ID_Produk}" class="btn btn-primary">Daftar Sekarang</a>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// 7. VIEW: CHECKOUT (FR-01..FR-06)
// ---------------------------------------------------------------------------
async function viewCheckout(idProduk) {
  views.innerHTML = `
    <div class="card" style="max-width:480px;margin:0 auto">
      <div class="h2">Lengkapi Data Pendaftaran</div>
      <form id="fCheckout">
        <div class="field"><label class="lbl">Nama Lengkap</label><input class="input" name="nama" required></div>
        <div class="field"><label class="lbl">Email</label><input class="input" type="email" name="email" required></div>
        <div class="field"><label class="lbl">No. WhatsApp</label><input class="input" name="whatsapp" placeholder="08xxxxxxxxxx" required></div>
        <div class="field"><label class="lbl">Kode Promo (opsional)</label><input class="input" name="kodePromo" placeholder="Kosongkan jika tidak ada"></div>
        <div class="field row g8"><input type="checkbox" name="izinPromoWA" id="izWA"><label for="izWA" class="muted">Saya setuju menerima info promo via WhatsApp</label></div>
        <div class="field row g8"><input type="checkbox" name="izinPromoEmail" id="izEm"><label for="izEm" class="muted">Saya setuju menerima info promo via Email</label></div>
        <button class="btn btn-primary btn-block" type="submit">Buat Pesanan</button>
      </form>
    </div>`;
  document.getElementById('fCheckout').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setBusy(btn, true, 'Memproses...', 'Buat Pesanan');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.idProduk = idProduk; data.izinPromoWA = fd.has('izinPromoWA'); data.izinPromoEmail = fd.has('izinPromoEmail');
    const j = await Api.post('auth.checkout', data);
    setBusy(btn, false, '', 'Buat Pesanan');
    if (!j.success) return toast(j.message, 'err');
    views.innerHTML = `
      <div class="card col g16 center" style="text-align:center">
        <div class="h1">🎉 Pesanan dibuat!</div>
        <p>Order <b>${j.order.ID_Order}</b> — total <b>${rupiah(j.order.Nominal)}</b>.<br>
        Silakan transfer dan unggah bukti pembayaran. Instruksi lengkap &amp; token aktivasi akun sudah dikirim ke WhatsApp/Email Anda.</p>
        <a href="#/aktivasi" class="btn btn-primary">Aktivasi Akun Setelah Bayar</a>
      </div>`;
  });
}

// ---------------------------------------------------------------------------
// 8. VIEW: AKTIVASI & LOGIN
// ---------------------------------------------------------------------------
function viewAktivasi() {
  views.innerHTML = `
    <div class="card" style="max-width:420px;margin:0 auto">
      <div class="h2">Aktivasi Akun</div>
      <p class="muted">Masukkan token aktivasi yang dikirim ke WhatsApp/Email Anda untuk membuat sandi.</p>
      <form id="fAktivasi">
        <div class="field"><label class="lbl">Email</label><input class="input" type="email" name="email" required></div>
        <div class="field"><label class="lbl">Token Aktivasi</label><input class="input" name="tokenAktivasi" required></div>
        <div class="field"><label class="lbl">Buat Sandi</label><input class="input" type="password" name="sandiBaru" minlength="6" required></div>
        <button class="btn btn-primary btn-block" type="submit">Aktifkan &amp; Masuk</button>
      </form>
    </div>`;
  document.getElementById('fAktivasi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const j = await Api.post('auth.aktivasi', data);
    if (!j.success) return toast(j.message, 'err');
    toast('Akun aktif! Silakan masuk.', 'ok');
    nav('#/login');
  });
}
function viewLogin() {
  views.innerHTML = `
    <div class="card" style="max-width:380px;margin:0 auto">
      <div class="h2">Masuk ke Akun</div>
      <form id="fLogin">
        <div class="field"><label class="lbl">Email</label><input class="input" type="email" name="email" required></div>
        <div class="field"><label class="lbl">Sandi</label><input class="input" type="password" name="sandi" required></div>
        <button class="btn btn-primary btn-block" type="submit">Masuk</button>
      </form>
      <p class="muted" style="margin-top:14px">Baru bayar? <a href="#/aktivasi" style="color:var(--primary)">Aktivasi akun di sini</a>.</p>
    </div>`;
  document.getElementById('fLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setBusy(btn, true, 'Memeriksa...', 'Masuk');
    const data = Object.fromEntries(new FormData(e.target).entries());
    const j = await Api.post('auth.login', data);
    setBusy(btn, false, '', 'Masuk');
    if (!j.success) return toast(j.message, 'err');
    Sesi.masuk(j.token, j.profil);
    toast(`Selamat datang, ${j.profil.nama}!`, 'ok');
    nav('#/dashboard');
  });
}

// ---------------------------------------------------------------------------
// 9. VIEW: DASHBOARD MEMBER (FR-07..FR-10)
// ---------------------------------------------------------------------------
async function viewDashboard() {
  views.innerHTML = skeleton(4);
  const j = await Api.post('member.boot', {});
  if (!j.success) return (views.innerHTML = `<div class="empty">${escapeHtml(j.message)}</div>`);
  const r = j.ringkasan;
  views.innerHTML = `
    <div class="course-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:18px">
      ${kpi('🎓', r.totalKelas, 'Total Kelas')}${kpi('🔥', r.kelasBerjalan, 'Sedang Berjalan')}
      ${kpi('✅', r.kelasSelesai, 'Selesai')}${kpi('⏱️', r.totalJamBelajar, 'Jam Belajar')}
    </div>
    <div class="h2">Kelas Saya</div>
    <div class="course-grid">${j.myCourses.map(c => `
      <a href="#/kelas/${c.produk.ID_Produk}" class="course-card">
        <div class="thumb" style="background-image:url('${escapeHtml(c.produk.Thumbnail_URL || '')}')"></div>
        <div class="body col g8">
          <div class="nm">${escapeHtml(c.produk.Nama)}</div>
          <div class="bar"><i style="width:${c.progresPersen}%"></i></div>
          <div class="muted">${c.progresPersen}% selesai</div>
        </div>
      </a>`).join('') || '<div class="empty">Anda belum memiliki kelas. <a href="#/katalog" style="color:var(--primary)">Jelajahi katalog</a>.</div>'}
    </div>`;
}
function kpi(ic, val, lbl) { return `<div class="card col g8"><span style="font-size:22px">${ic}</span><b style="font-size:20px">${val}</b><span class="muted">${lbl}</span></div>`; }

// ---------------------------------------------------------------------------
// 10. VIEW: LEARNING PATH & MATERI (FR-11..FR-13, modul terkunci berurutan)
// ---------------------------------------------------------------------------
async function viewKelas(idProduk) {
  views.innerHTML = skeleton(1);
  const j = await Api.post('member.learningPath', { idProduk });
  if (!j.success) return (views.innerHTML = `<div class="empty">${escapeHtml(j.message)}</div>`);
  views.innerHTML = `<div class="h2">Learning Path</div>` + j.modul.map((m, i) => `
    <div class="modul-row row between ${m.terkunci ? 'locked' : ''}" ${m.terkunci ? '' : `onclick="nav('#/modul/${m.ID_Modul}')"`}>
      <div><b>${i + 1}. ${escapeHtml(m.Judul_Modul)}</b><div class="muted">${escapeHtml(m.Deskripsi || '')}</div></div>
      <div>${m.selesai ? '✅' : (m.terkunci ? '🔒' : '▶️')}</div>
    </div>`).join('');
}
async function viewModul(idModul) {
  views.innerHTML = skeleton(1);
  const j = await Api.post('member.materi', { idModul });
  if (!j.success) return (views.innerHTML = `<div class="empty">${escapeHtml(j.message)}</div>`);
  views.innerHTML = `<div class="h2">Materi</div>` + j.materi.map(m => `
    <div class="materi-row row between" id="m_${m.ID_Materi}">
      <div><b>${escapeHtml(m.Judul)}</b><div class="muted">${escapeHtml(m.Tipe)} · ${m.Durasi_Menit || 0} mnt</div></div>
      <button class="btn btn-ghost" onclick="selesaikanMateri('${m.ID_Materi}')">Tandai Selesai</button>
    </div>`).join('');
}
async function selesaikanMateri(idMateri) {
  const j = await Api.post('member.tandaiSelesai', { idMateri });
  if (!j.success) return toast(j.message, 'err');
  document.getElementById('m_' + idMateri).classList.add('selesai');
  toast('Materi ditandai selesai ✅', 'ok');
}

// ---------------------------------------------------------------------------
// 11. VIEW: PROFIL & RIWAYAT
// ---------------------------------------------------------------------------
function viewProfil() {
  const p = Sesi.profil() || {};
  views.innerHTML = `
    <div class="card" style="max-width:460px">
      <div class="h2">Profil Saya</div>
      <form id="fProfil">
        <div class="field"><label class="lbl">Nama</label><input class="input" name="nama" value="${escapeHtml(p.nama || '')}"></div>
        <div class="field"><label class="lbl">No. WhatsApp</label><input class="input" name="whatsapp" placeholder="08xxxxxxxxxx"></div>
        <button class="btn btn-primary" type="submit">Simpan</button>
      </form>
      <hr style="border-color:var(--line);margin:18px 0">
      <button class="btn btn-ghost btn-block" onclick="Sesi.keluar(); nav('#/katalog')">Keluar</button>
    </div>`;
  document.getElementById('fProfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await Api.post('member.profil.update', Object.fromEntries(new FormData(e.target).entries()));
    toast(j.success ? 'Profil tersimpan' : j.message, j.success ? 'ok' : 'err');
  });
}
async function viewRiwayat() {
  views.innerHTML = skeleton(1);
  const j = await Api.post('member.riwayat', {});
  if (!j.success) return (views.innerHTML = `<div class="empty">${escapeHtml(j.message)}</div>`);
  views.innerHTML = `<div class="h2">Riwayat Transaksi</div>` + (j.transaksi.map(t => `
    <div class="materi-row row between">
      <div><b>${escapeHtml(t.ID_Order)}</b><div class="muted">${rupiah(t.Nominal)}</div></div>
      <span class="badge">${escapeHtml(t.Status_Verifikasi)}</span>
    </div>`).join('') || '<div class="empty">Belum ada transaksi.</div>');
}

// ---------------------------------------------------------------------------
// 12. PWA: registrasi Service Worker + tombol "Pasang Aplikasi"
// ---------------------------------------------------------------------------
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}
function setupInstallPrompt() {
  let prompt;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); prompt = e; toast('Tekan "Bagikan/Menu" lalu "Pasang Aplikasi" untuk akses lebih cepat.', ''); });
  window.installApp = async () => { if (prompt) { prompt.prompt(); await prompt.userChoice; prompt = null; } };
}
