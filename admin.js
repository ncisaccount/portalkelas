/* ==========================================================================
   PortalKelas Digital — admin.js (Fase 4, panel admin, GitHub Pages statis)
   ========================================================================== */
const GAS_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT_ANDA/exec';

// ---------------------------------------------------------------------------
// API & Sesi admin (token terpisah dari sesi member → pk_admin_token)
// ---------------------------------------------------------------------------
const AApi = {
  async post(action, data) {
    const res = await fetch(GAS_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: ASesi.token(), data: data || {} })
    });
    const j = await res.json();
    if (!j.success && (j.code === 'AUTH_REQUIRED' || j.code === 'FORBIDDEN')) { ASesi.keluar(); location.hash = '#/login'; }
    return j;
  },
  async get(action, params) {
    const qs = new URLSearchParams(Object.assign({ action }, params || {}));
    return (await fetch(`${GAS_URL}?${qs.toString()}`)).json();
  }
};
const ASesi = {
  token: () => localStorage.getItem('pk_admin_token') || '',
  profil: () => { try { return JSON.parse(localStorage.getItem('pk_admin_profil') || 'null'); } catch (e) { return null; } },
  masuk(t, p) { localStorage.setItem('pk_admin_token', t); localStorage.setItem('pk_admin_profil', JSON.stringify(p)); },
  keluar() { localStorage.removeItem('pk_admin_token'); localStorage.removeItem('pk_admin_profil'); },
  login: () => !!ASesi.token(),
  superadmin: () => (ASesi.profil() || {}).role === 'superadmin'
};

// ---------------------------------------------------------------------------
// Util UI (toast, modal, tabel, format)
// ---------------------------------------------------------------------------
function toast(msg, jenis) {
  const el = document.createElement('div'); el.className = 'toast' + (jenis ? ' ' + jenis : ''); el.textContent = msg;
  document.getElementById('toasts').appendChild(el); setTimeout(() => el.remove(), 3200);
}
function rupiah(n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function tgl(d) { if (!d) return '-'; const t = new Date(d); return isNaN(t) ? String(d) : t.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }

function openModal(titleHtml, bodyHtml) {
  document.getElementById('modals').innerHTML = `<div class="modal-box"><div class="h2">${titleHtml}</div>${bodyHtml}</div>`;
  document.getElementById('modals').classList.add('show');
  document.getElementById('scrim').classList.add('show');
}
function closeModal() { document.getElementById('modals').classList.remove('show'); document.getElementById('scrim').classList.remove('show'); document.getElementById('modals').innerHTML = ''; }
document.addEventListener('DOMContentLoaded', () => { document.getElementById('scrim').addEventListener('click', closeModal); });

function renderTable(headers, rows) {
  if (!rows.length) return `<div class="empty">Belum ada data.</div>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function badge(status) {
  const m = { Aktif: 'badge-ok', Terverifikasi: 'badge-ok', Menunggu: 'badge-warn', Ditolak: 'badge-err', Nonaktif: 'badge-err', Gagal: 'badge-err', Draf: 'badge-warn', Publik: 'badge-ok' };
  return `<span class="badge ${m[status] || ''}">${esc(status || '-')}</span>`;
}

// ---------------------------------------------------------------------------
// ROUTER
// ---------------------------------------------------------------------------
const MENU = [
  { grp: 'Utama', items: [['ringkasan', '📊', 'Ringkasan']] },
  { grp: 'Konten', items: [['produk', '🛒', 'Produk'], ['kurikulum', '📚', 'Kurikulum'], ['materi', '🎬', 'Materi'], ['promo', '🏷️', 'Kode Promo']] },
  { grp: 'Penjualan', items: [['transaksi', '💳', 'Transaksi'], ['member', '👥', 'Member']] },
  { grp: 'CRM & Notifikasi', items: [['crm', '🗂️', 'CRM'], ['broadcast', '📣', 'Broadcast']] },
  { grp: 'Sistem', items: [['pengaturan', '⚙️', 'Pengaturan']] }
];
const aViews = document.getElementById('aViews');
window.addEventListener('hashchange', renderARoute);
window.addEventListener('DOMContentLoaded', renderARoute);

function renderAside() {
  const page = (location.hash || '#/login').slice(2).split('/')[0];
  document.getElementById('aside').innerHTML = `
    <div class="brand"><span class="dot"></span> Admin PortalKelas</div>
    <nav>${MENU.map(g => `<div class="grp">${g.grp}</div>` + g.items.map(([p, ic, lbl]) =>
      `<a href="#/${p}" class="${page === p ? 'active' : ''}">${ic} ${lbl}</a>`).join('')).join('')}
      <a href="#" onclick="ASesi.keluar(); location.hash='#/login'; return false;" style="margin-top:14px">🚪 Keluar</a>
    </nav>`;
}
async function renderARoute() {
  const page = (location.hash || '#/login').slice(2).split('/')[0] || 'login';
  if (page !== 'login' && !ASesi.login()) { location.hash = '#/login'; return; }
  if (page === 'login') { document.getElementById('aside').innerHTML = ''; return viewLogin(); }
  renderAside();
  const peta = { ringkasan: viewRingkasan, produk: viewProduk, kurikulum: viewKurikulum, materi: viewMateri, promo: viewPromo, transaksi: viewTransaksi, member: viewMember, crm: viewCrm, broadcast: viewBroadcast, pengaturan: viewPengaturan };
  (peta[page] || viewRingkasan)();
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
function viewLogin() {
  aViews.innerHTML = `
    <div class="center" style="min-height:100vh">
      <div class="card" style="max-width:380px;width:100%">
        <div class="h2">Masuk Panel Admin</div>
        <form id="fLoginA">
          <div class="field"><label class="lbl">Email</label><input class="input" type="email" name="email" required></div>
          <div class="field"><label class="lbl">Sandi</label><input class="input" type="password" name="sandi" required></div>
          <button class="btn btn-primary btn-block" type="submit">Masuk</button>
        </form>
      </div>
    </div>`;
  document.getElementById('fLoginA').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('auth.loginAdmin', Object.fromEntries(new FormData(e.target).entries()));
    if (!j.success) return toast(j.message, 'err');
    ASesi.masuk(j.token, j.profil);
    location.hash = '#/ringkasan';
  });
}

// ---------------------------------------------------------------------------
// RINGKASAN / LAPORAN
// ---------------------------------------------------------------------------
async function viewRingkasan() {
  aViews.innerHTML = `<div class="h1">Ringkasan</div><div class="kpi-grid">${'<div class="sk" style="height:90px"></div>'.repeat(4)}</div>`;
  const j = await AApi.post('admin.laporan.ringkasan', {});
  if (!j.success) return (aViews.innerHTML = `<div class="empty">${esc(j.message)}</div>`);
  const bulan = Object.keys(j.pendapatanPerBulan).sort();
  const maxP = Math.max(1, ...bulan.map(b => j.pendapatanPerBulan[b]));
  aViews.innerHTML = `
    <div class="h1">Ringkasan</div>
    <div class="kpi-grid">
      ${kpi('👥', j.totalMember, 'Total Member')}
      ${kpi('💰', rupiah(j.totalPendapatan), 'Total Pendapatan')}
      ${kpi('🧭', j.funnel.leads, 'Leads')}
      ${kpi('✅', j.funnel.aktif, 'Member Aktif')}
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="h2">Pendapatan per Bulan</div>
      <div class="bar-chart">${bulan.map(b => `<div class="b" style="height:${Math.max(4, j.pendapatanPerBulan[b] / maxP * 150)}px"><span>${rupiah(j.pendapatanPerBulan[b])}</span></div>`).join('') || '<div class="muted">Belum ada data.</div>'}</div>
      <div class="row between muted" style="margin-top:6px">${bulan.map(b => `<span>${b}</span>`).join('')}</div>
    </div>
    <div class="card">
      <div class="h2">Funnel Konversi</div>
      <div class="kpi-grid">${kpi('🧲', j.funnel.leads, 'Leads')}${kpi('🧾', j.funnel.order, 'Order Dibuat')}${kpi('💳', j.funnel.bayar, 'Dibayar')}${kpi('🎓', j.funnel.aktif, 'Aktif Belajar')}</div>
    </div>`;
}
function kpi(ic, val, lbl) { return `<div class="card col g8"><span style="font-size:22px">${ic}</span><b style="font-size:19px">${val}</b><span class="muted">${lbl}</span></div>`; }

// ---------------------------------------------------------------------------
// PRODUK
// ---------------------------------------------------------------------------
async function viewProduk() {
  aViews.innerHTML = `<div class="toolbar between"><div class="h1" style="margin:0">Produk / Kelas</div><button class="btn btn-primary" onclick="formProduk()">+ Tambah Produk</button></div><div id="tblProduk">${'<div class="sk" style="height:200px"></div>'}</div>`;
  const j = await AApi.post('admin.produk.list', {});
  const rows = (j.produk || []).map(p => `<tr>
    <td><b>${esc(p.Nama)}</b><div class="muted">${esc(p.Slug)}</div></td>
    <td>${esc(p.Kategori || '-')}</td><td>${rupiah(p.Harga)}</td><td>${badge(p.Status)}</td>
    <td class="row g8"><button class="btn btn-ghost btn-sm" onclick='formProduk(${JSON.stringify(p)})'>Edit</button>
    <button class="btn btn-danger btn-sm" onclick="hapusItem('admin.produk.hapus','${p.ID_Produk}','produk')">Hapus</button></td></tr>`);
  document.getElementById('tblProduk').innerHTML = renderTable(['Nama', 'Kategori', 'Harga', 'Status', ''], rows);
}
function formProduk(p) {
  p = p || {};
  openModal(p.ID_Produk ? 'Edit Produk' : 'Tambah Produk', `
    <form id="fProduk">
      <input type="hidden" name="ID_Produk" value="${esc(p.ID_Produk || '')}">
      <div class="field"><label class="lbl">Nama</label><input class="input" name="Nama" value="${esc(p.Nama || '')}" required></div>
      <div class="field"><label class="lbl">Slug (URL)</label><input class="input" name="Slug" value="${esc(p.Slug || '')}" required></div>
      <div class="field"><label class="lbl">Deskripsi</label><textarea class="input" name="Deskripsi" rows="3">${esc(p.Deskripsi || '')}</textarea></div>
      <div class="row g12"><div class="field" style="flex:1"><label class="lbl">Harga</label><input class="input" type="number" name="Harga" value="${p.Harga || ''}" required></div>
      <div class="field" style="flex:1"><label class="lbl">Harga Coret</label><input class="input" type="number" name="Harga_Coret" value="${p.Harga_Coret || ''}"></div></div>
      <div class="row g12"><div class="field" style="flex:1"><label class="lbl">Kategori</label><input class="input" name="Kategori" value="${esc(p.Kategori || '')}"></div>
      <div class="field" style="flex:1"><label class="lbl">Instruktur</label><input class="input" name="Instruktur" value="${esc(p.Instruktur || '')}"></div></div>
      <div class="field"><label class="lbl">Thumbnail URL</label><input class="input" name="Thumbnail_URL" value="${esc(p.Thumbnail_URL || '')}"></div>
      <div class="row g12"><div class="field" style="flex:1"><label class="lbl">Durasi Akses (hari)</label><input class="input" type="number" name="Durasi_Akses_Hari" value="${p.Durasi_Akses_Hari || 365}"></div>
      <div class="field" style="flex:1"><label class="lbl">Status</label><select class="input" name="Status"><option value="Draf" ${p.Status === 'Draf' ? 'selected' : ''}>Draf</option><option value="Publik" ${p.Status === 'Publik' ? 'selected' : ''}>Publik</option></select></div></div>
      <div class="row g8" style="margin-top:8px"><button class="btn btn-primary" type="submit">Simpan</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button></div>
    </form>`);
  document.getElementById('fProduk').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('admin.produk.simpan', Object.fromEntries(new FormData(e.target).entries()));
    if (!j.success) return toast(j.message, 'err');
    toast('Produk tersimpan', 'ok'); closeModal(); viewProduk();
  });
}
async function hapusItem(action, id, label) {
  if (!confirm(`Hapus ${label} ini? Tindakan tidak bisa dibatalkan.`)) return;
  const j = await AApi.post(action, { id });
  toast(j.success ? 'Berhasil dihapus' : j.message, j.success ? 'ok' : 'err');
  renderARoute();
}

// ---------------------------------------------------------------------------
// KURIKULUM (per produk)
// ---------------------------------------------------------------------------
async function viewKurikulum() {
  const produkRes = await AApi.post('admin.produk.list', {});
  const opsi = (produkRes.produk || []).map(p => `<option value="${p.ID_Produk}">${esc(p.Nama)}</option>`).join('');
  aViews.innerHTML = `
    <div class="toolbar between"><div class="h1" style="margin:0">Kurikulum</div><button class="btn btn-primary" id="btnTambahModul">+ Tambah Modul</button></div>
    <div class="toolbar"><select class="input" id="selProduk" style="max-width:320px"><option value="">— Pilih produk —</option>${opsi}</select></div>
    <div id="tblModul"></div>`;
  document.getElementById('selProduk').addEventListener('change', muatModul);
  document.getElementById('btnTambahModul').addEventListener('click', () => formKurikulum(null, document.getElementById('selProduk').value));
}
async function muatModul() {
  const idProduk = document.getElementById('selProduk').value;
  const box = document.getElementById('tblModul');
  if (!idProduk) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="sk" style="height:140px"></div>';
  const j = await AApi.post('admin.kurikulum.list', { idProduk });
  const rows = (j.kurikulum || []).sort((a, b) => a.Urutan - b.Urutan).map(m => `<tr>
    <td>${m.Urutan}</td><td><b>${esc(m.Judul_Modul)}</b></td><td>${badge(m.Status)}</td>
    <td class="row g8"><button class="btn btn-ghost btn-sm" onclick='formKurikulum(${JSON.stringify(m)},"${idProduk}")'>Edit</button>
    <button class="btn btn-danger btn-sm" onclick="hapusItem('admin.kurikulum.hapus','${m.ID_Modul}','modul')">Hapus</button></td></tr>`);
  box.innerHTML = renderTable(['Urutan', 'Judul Modul', 'Status', ''], rows);
}
function formKurikulum(m, idProduk) {
  m = m || {};
  openModal(m.ID_Modul ? 'Edit Modul' : 'Tambah Modul', `
    <form id="fModul">
      <input type="hidden" name="ID_Modul" value="${esc(m.ID_Modul || '')}"><input type="hidden" name="ID_Produk" value="${esc(idProduk)}">
      <div class="field"><label class="lbl">Judul Modul</label><input class="input" name="Judul_Modul" value="${esc(m.Judul_Modul || '')}" required></div>
      <div class="field"><label class="lbl">Urutan</label><input class="input" type="number" name="Urutan" value="${m.Urutan || 1}" required></div>
      <div class="field"><label class="lbl">Deskripsi</label><textarea class="input" name="Deskripsi" rows="2">${esc(m.Deskripsi || '')}</textarea></div>
      <div class="field"><label class="lbl">Status</label><select class="input" name="Status"><option value="Draf" ${m.Status === 'Draf' ? 'selected' : ''}>Draf</option><option value="Tayang" ${m.Status === 'Tayang' ? 'selected' : ''}>Tayang</option></select></div>
      <div class="row g8" style="margin-top:8px"><button class="btn btn-primary" type="submit">Simpan</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button></div>
    </form>`);
  document.getElementById('fModul').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('admin.kurikulum.simpan', Object.fromEntries(new FormData(e.target).entries()));
    if (!j.success) return toast(j.message, 'err');
    toast('Modul tersimpan', 'ok'); closeModal(); muatModul();
  });
}

// ---------------------------------------------------------------------------
// MATERI (per modul, dipilih lewat produk→modul berjenjang)
// ---------------------------------------------------------------------------
async function viewMateri() {
  const produkRes = await AApi.post('admin.produk.list', {});
  const opsi = (produkRes.produk || []).map(p => `<option value="${p.ID_Produk}">${esc(p.Nama)}</option>`).join('');
  aViews.innerHTML = `
    <div class="toolbar between"><div class="h1" style="margin:0">Materi</div><button class="btn btn-primary" id="btnTambahMateri" disabled>+ Tambah Materi</button></div>
    <div class="toolbar"><select class="input" id="selProdukM" style="max-width:260px"><option value="">— Pilih produk —</option>${opsi}</select>
    <select class="input" id="selModulM" style="max-width:260px" disabled><option value="">— Pilih modul —</option></select></div>
    <div id="tblMateri"></div>`;
  document.getElementById('selProdukM').addEventListener('change', async (e) => {
    const sel = document.getElementById('selModulM');
    sel.disabled = true; sel.innerHTML = '<option value="">Memuat...</option>';
    const j = await AApi.post('admin.kurikulum.list', { idProduk: e.target.value });
    sel.innerHTML = '<option value="">— Pilih modul —</option>' + (j.kurikulum || []).sort((a, b) => a.Urutan - b.Urutan).map(m => `<option value="${m.ID_Modul}">${esc(m.Judul_Modul)}</option>`).join('');
    sel.disabled = false;
  });
  document.getElementById('selModulM').addEventListener('change', muatMateri);
  document.getElementById('btnTambahMateri').addEventListener('click', () => formMateri(null, document.getElementById('selModulM').value));
}
async function muatMateri() {
  const idModul = document.getElementById('selModulM').value;
  document.getElementById('btnTambahMateri').disabled = !idModul;
  const box = document.getElementById('tblMateri');
  if (!idModul) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="sk" style="height:140px"></div>';
  const j = await AApi.post('admin.materi.list', { idModul });
  const rows = (j.materi || []).sort((a, b) => a.Urutan - b.Urutan).map(m => `<tr>
    <td>${m.Urutan}</td><td><b>${esc(m.Judul)}</b></td><td>${esc(m.Tipe)}</td><td>${m.Durasi_Menit || 0} mnt</td>
    <td class="row g8"><button class="btn btn-ghost btn-sm" onclick='formMateri(${JSON.stringify(m)},"${idModul}")'>Edit</button>
    <button class="btn btn-danger btn-sm" onclick="hapusItem('admin.materi.hapus','${m.ID_Materi}','materi')">Hapus</button></td></tr>`);
  box.innerHTML = renderTable(['Urutan', 'Judul', 'Tipe', 'Durasi', ''], rows);
}
function formMateri(m, idModul) {
  m = m || {};
  openModal(m.ID_Materi ? 'Edit Materi' : 'Tambah Materi', `
    <form id="fMateri">
      <input type="hidden" name="ID_Materi" value="${esc(m.ID_Materi || '')}"><input type="hidden" name="ID_Modul" value="${esc(idModul)}">
      <div class="field"><label class="lbl">Judul</label><input class="input" name="Judul" value="${esc(m.Judul || '')}" required></div>
      <div class="row g12"><div class="field" style="flex:1"><label class="lbl">Tipe</label>
        <select class="input" name="Tipe"><option ${m.Tipe === 'Video' ? 'selected' : ''}>Video</option><option ${m.Tipe === 'PDF' ? 'selected' : ''}>PDF</option><option ${m.Tipe === 'Kuis' ? 'selected' : ''}>Kuis</option><option ${m.Tipe === 'Teks' ? 'selected' : ''}>Teks</option></select></div>
      <div class="field" style="flex:1"><label class="lbl">Urutan</label><input class="input" type="number" name="Urutan" value="${m.Urutan || 1}" required></div></div>
      <div class="field"><label class="lbl">URL / File ID Drive</label><input class="input" name="URL_atau_FileID" value="${esc(m.URL_atau_FileID || '')}"></div>
      <div class="field"><label class="lbl">Durasi (menit)</label><input class="input" type="number" name="Durasi_Menit" value="${m.Durasi_Menit || 0}"></div>
      <div class="row g8" style="margin-top:8px"><button class="btn btn-primary" type="submit">Simpan</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button></div>
    </form>`);
  document.getElementById('fMateri').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('admin.materi.simpan', Object.fromEntries(new FormData(e.target).entries()));
    if (!j.success) return toast(j.message, 'err');
    toast('Materi tersimpan', 'ok'); closeModal(); muatMateri();
  });
}

// ---------------------------------------------------------------------------
// PROMO
// ---------------------------------------------------------------------------
async function viewPromo() {
  aViews.innerHTML = `<div class="toolbar between"><div class="h1" style="margin:0">Kode Promo</div><button class="btn btn-primary" onclick="formPromo()">+ Tambah Kode</button></div><div id="tblPromo">${'<div class="sk" style="height:160px"></div>'}</div>`;
  const j = await AApi.post('admin.promo.list', {});
  const rows = (j.promo || []).map(p => `<tr><td><b>${esc(p.Kode)}</b></td><td>${esc(p.Jenis)}</td><td>${p.Jenis === 'Persen' ? p.Nilai + '%' : rupiah(p.Nilai)}</td><td>${p.Terpakai || 0}/${p.Kuota || '∞'}</td><td>${badge(p.Status)}</td>
    <td><button class="btn btn-ghost btn-sm" onclick='formPromo(${JSON.stringify(p)})'>Edit</button></td></tr>`);
  document.getElementById('tblPromo').innerHTML = renderTable(['Kode', 'Jenis', 'Nilai', 'Terpakai', 'Status', ''], rows);
}
function formPromo(p) {
  p = p || {};
  openModal(p.Kode ? 'Edit Kode Promo' : 'Tambah Kode Promo', `
    <form id="fPromo">
      <div class="field"><label class="lbl">Kode</label><input class="input" name="Kode" value="${esc(p.Kode || '')}" ${p.Kode ? 'readonly' : ''} required style="text-transform:uppercase"></div>
      <div class="row g12"><div class="field" style="flex:1"><label class="lbl">Jenis</label><select class="input" name="Jenis"><option value="Persen" ${p.Jenis === 'Persen' ? 'selected' : ''}>Persen (%)</option><option value="Nominal" ${p.Jenis === 'Nominal' ? 'selected' : ''}>Nominal (Rp)</option></select></div>
      <div class="field" style="flex:1"><label class="lbl">Nilai</label><input class="input" type="number" name="Nilai" value="${p.Nilai || ''}" required></div></div>
      <div class="field"><label class="lbl">Kuota (kosongkan = tanpa batas)</label><input class="input" type="number" name="Kuota" value="${p.Kuota || ''}"></div>
      <div class="field"><label class="lbl">Berlaku Sampai</label><input class="input" type="date" name="Berlaku_Sampai" value="${p.Berlaku_Sampai ? String(p.Berlaku_Sampai).slice(0, 10) : ''}"></div>
      <div class="field"><label class="lbl">Status</label><select class="input" name="Status"><option value="Aktif" ${p.Status === 'Aktif' ? 'selected' : ''}>Aktif</option><option value="Nonaktif" ${p.Status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div>
      <div class="row g8" style="margin-top:8px"><button class="btn btn-primary" type="submit">Simpan</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button></div>
    </form>`);
  document.getElementById('fPromo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('admin.promo.simpan', Object.fromEntries(new FormData(e.target).entries()));
    if (!j.success) return toast(j.message, 'err');
    toast('Kode promo tersimpan', 'ok'); closeModal(); viewPromo();
  });
}

// ---------------------------------------------------------------------------
// TRANSAKSI — verifikasi pembayaran (FR-18/19)
// ---------------------------------------------------------------------------
async function viewTransaksi() {
  aViews.innerHTML = `<div class="h1">Transaksi</div><div class="toolbar"><select class="input" id="filterStatus" style="max-width:200px"><option value="">Semua Status</option><option>Menunggu</option><option>Terverifikasi</option><option>Ditolak</option></select></div><div id="tblTrx">${'<div class="sk" style="height:240px"></div>'}</div>`;
  const j = await AApi.post('admin.transaksi.list', {});
  const semua = j.transaksi || [];
  function render() {
    const f = document.getElementById('filterStatus').value;
    const rows = semua.filter(t => !f || t.Status_Verifikasi === f).map(t => `<tr>
      <td><b>${esc(t.ID_Order)}</b><div class="muted">${tgl(t.Batas_Bayar)}</div></td>
      <td>${esc(t.ID_Member)}</td><td>${rupiah(t.Nominal)}${t.Potongan ? `<div class="muted">potongan ${rupiah(t.Potongan)}</div>` : ''}</td>
      <td>${badge(t.Status_Verifikasi)}</td>
      <td class="row g8">${t.Status_Verifikasi === 'Menunggu' ? `
        <button class="btn btn-primary btn-sm" onclick="verifikasiTrx('${t.ID_Order}',true)">Setujui</button>
        <button class="btn btn-danger btn-sm" onclick="verifikasiTrx('${t.ID_Order}',false)">Tolak</button>` : '<span class="muted">—</span>'}</td></tr>`);
    document.getElementById('tblTrx').innerHTML = renderTable(['Order', 'Member', 'Nominal', 'Status', ''], rows);
  }
  document.getElementById('filterStatus').addEventListener('change', render);
  render();
}
async function verifikasiTrx(idOrder, setuju) {
  if (!confirm(setuju ? 'Setujui transaksi ini & berikan akses kelas?' : 'Tolak transaksi ini?')) return;
  const j = await AApi.post('admin.transaksi.verifikasi', { idOrder, setuju });
  toast(j.success ? 'Berhasil diproses' : j.message, j.success ? 'ok' : 'err');
  viewTransaksi();
}

// ---------------------------------------------------------------------------
// MEMBER
// ---------------------------------------------------------------------------
async function viewMember() {
  aViews.innerHTML = `<div class="h1">Member</div><div class="toolbar"><input class="input" id="cariMember" placeholder="Cari nama/email..."></div><div id="tblMember">${'<div class="sk" style="height:240px"></div>'}</div>`;
  const j = await AApi.post('admin.member.list', {});
  const semua = j.member || [];
  function render() {
    const c = (document.getElementById('cariMember').value || '').toLowerCase();
    const rows = semua.filter(m => (m.Nama + m.Email).toLowerCase().includes(c)).map(m => `<tr>
      <td><b>${esc(m.Nama)}</b><div class="muted">${esc(m.Email)}</div></td><td>${esc(m.No_WhatsApp || '-')}</td>
      <td>${badge(m.Label_CRM)}</td><td>${badge(m.Status_Akun)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="document.location.hash='#/crm/${m.ID_Member}'">Buka CRM</button></td></tr>`);
    document.getElementById('tblMember').innerHTML = renderTable(['Nama', 'WhatsApp', 'Label', 'Status', ''], rows);
  }
  document.getElementById('cariMember').addEventListener('input', render);
  render();
}

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
async function viewCrm() {
  aViews.innerHTML = `<div class="h1">CRM</div><div class="toolbar"><input class="input" id="cariCrm" placeholder="Cari member..."></div><div id="tblCrm">${'<div class="sk" style="height:240px"></div>'}</div>`;
  const j = await AApi.post('admin.member.list', {});
  const semua = j.member || [];
  function render() {
    const c = (document.getElementById('cariCrm').value || '').toLowerCase();
    const rows = semua.filter(m => (m.Nama + m.Email).toLowerCase().includes(c)).map(m => `<tr>
      <td><b>${esc(m.Nama)}</b><div class="muted">${esc(m.Email)}</div></td><td>${badge(m.Label_CRM)}</td>
      <td class="row g8">
        <select class="input btn-sm" style="width:auto" onchange="ubahLabel('${m.ID_Member}',this.value)">
          ${['Leads', 'Member Aktif', 'Member Pasif', 'VIP'].map(l => `<option ${m.Label_CRM === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="tambahCatatan('${m.ID_Member}','${esc(m.Nama)}')">+ Catatan</button>
      </td></tr>`);
    document.getElementById('tblCrm').innerHTML = renderTable(['Member', 'Label', ''], rows);
  }
  document.getElementById('cariCrm').addEventListener('input', render);
  render();
}
async function ubahLabel(idMember, label) {
  const j = await AApi.post('admin.crm.label.ubah', { idMember, label });
  toast(j.success ? 'Label diperbarui' : j.message, j.success ? 'ok' : 'err');
}
async function tambahCatatan(idMember, nama) {
  const riwayat = await AApi.post('admin.crm.catatan.list', { idMember });
  openModal(`Catatan — ${esc(nama)}`, `
    <div class="col g8" style="max-height:220px;overflow-y:auto;margin-bottom:14px">
      ${(riwayat.catatan || []).map(c => `<div class="materi-row"><div class="muted">${tgl(c.Waktu)} · ${esc(c.Penulis)}</div>${esc(c.Catatan)}</div>`).join('') || '<div class="muted">Belum ada catatan.</div>'}
    </div>
    <form id="fCatatan"><textarea class="input" name="catatan" rows="3" placeholder="Tulis catatan baru..." required></textarea>
      <div class="row g8" style="margin-top:10px"><button class="btn btn-primary" type="submit">Simpan Catatan</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>
    </form>`);
  document.getElementById('fCatatan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('admin.crm.catatan.tambah', { idMember, catatan: e.target.catatan.value });
    if (!j.success) return toast(j.message, 'err');
    toast('Catatan ditambahkan', 'ok'); closeModal();
  });
}

// ---------------------------------------------------------------------------
// BROADCAST
// ---------------------------------------------------------------------------
async function viewBroadcast() {
  aViews.innerHTML = `
    <div class="h1">Broadcast</div>
    <div class="card" style="max-width:520px;margin-bottom:20px">
      <form id="fBroadcast">
        <div class="field"><label class="lbl">Judul Kampanye</label><input class="input" name="judul" required></div>
        <div class="row g12"><div class="field" style="flex:1"><label class="lbl">Kanal</label><select class="input" name="kanal"><option value="WA">WhatsApp</option><option value="Email">Email</option></select></div>
        <div class="field" style="flex:1"><label class="lbl">Segmen Label (opsional)</label><select class="input" name="label"><option value="">Semua Member</option><option>Leads</option><option>Member Aktif</option><option>Member Pasif</option><option>VIP</option></select></div></div>
        <div class="field"><label class="lbl">Isi Pesan</label><textarea class="input" name="isiPesan" rows="4" required></textarea></div>
        <button class="btn btn-primary" type="submit">Masukkan ke Antrean Kirim</button>
      </form>
    </div>
    <div class="h2">Riwayat Broadcast</div>
    <div id="tblBroadcast">${'<div class="sk" style="height:160px"></div>'}</div>`;
  document.getElementById('fBroadcast').addEventListener('submit', async (e) => {
    e.preventDefault();
    const j = await AApi.post('admin.broadcast.kirim', Object.fromEntries(new FormData(e.target).entries()));
    if (!j.success) return toast(j.message, 'err');
    toast(`Terjadwal untuk ${j.dimasukkan} penerima (${j.dilewatiTanpaOptIn} dilewati karena belum opt-in)`, 'ok');
    e.target.reset(); muatRiwayatBroadcast();
  });
  muatRiwayatBroadcast();
}
async function muatRiwayatBroadcast() {
  const j = await AApi.post('admin.broadcast.list', {});
  const rows = (j.broadcast || []).slice().reverse().map(b => `<tr><td><b>${esc(b.Judul)}</b><div class="muted">${tgl(b.Dibuat_Pada)}</div></td><td>${esc(b.Kanal)}</td><td>${b.Total_Penerima}</td><td>${b.Dilewati_Tanpa_OptIn}</td><td>${badge(b.Status)}</td></tr>`);
  document.getElementById('tblBroadcast').innerHTML = renderTable(['Judul', 'Kanal', 'Penerima', 'Dilewati', 'Status'], rows);
}

// ---------------------------------------------------------------------------
// PENGATURAN & RAHASIA
// ---------------------------------------------------------------------------
async function viewPengaturan() {
  aViews.innerHTML = `<div class="h1">Pengaturan</div><div id="boxPengaturan">${'<div class="sk" style="height:300px"></div>'}</div>`;
  const j = await AApi.post('admin.pengaturan.list', {});
  const get = (k) => ((j.pengaturan || []).find(p => p.Kunci === k) || {}).Nilai || '';
  const fonnte = (j.rahasia || []).find(r => r.kunci === 'FONNTE_TOKEN') || {};
  document.getElementById('boxPengaturan').innerHTML = `
    <div class="card" style="max-width:520px;margin-bottom:18px">
      <div class="h2">Pengaturan Umum</div>
      <form id="fPengaturan">
        <div class="field"><label class="lbl">Nama Portal</label><input class="input" name="NAMA_PORTAL" value="${esc(get('NAMA_PORTAL'))}"></div>
        <div class="field"><label class="lbl">Warna Primer</label><input class="input" type="color" name="WARNA_PRIMER" value="${esc(get('WARNA_PRIMER') || '#6C3CE9')}" style="height:42px"></div>
        <div class="field"><label class="lbl">Rekening Bank (untuk instruksi transfer)</label><input class="input" name="REKENING_BANK" value="${esc(get('REKENING_BANK'))}"></div>
        <div class="field"><label class="lbl">Nomor WA Admin</label><input class="input" name="WA_ADMIN" value="${esc(get('WA_ADMIN'))}"></div>
        <button class="btn btn-primary" type="submit">Simpan Pengaturan</button>
      </form>
    </div>
    <div class="card" style="max-width:520px">
      <div class="h2">🔒 Kredensial (Script Properties)</div>
      <p class="muted" style="margin-bottom:12px">Token Fonnte tersimpan di Script Properties, tidak pernah ditampilkan utuh di sini.</p>
      <form id="fRahasia">
        <div class="field"><label class="lbl">Token Fonnte (WhatsApp) — saat ini: <code>${esc(fonnte.nilaiSamar || 'belum diatur')}</code></label>
        <input class="input" name="nilai" placeholder="Masukkan token baru untuk mengganti"></div>
        <button class="btn btn-primary" type="submit">Simpan Token</button>
      </form>
    </div>`;
  document.getElementById('fPengaturan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    for (const kunci of Object.keys(data)) await AApi.post('admin.pengaturan.simpan', { kunci, nilai: data[kunci] });
    toast('Pengaturan tersimpan', 'ok');
  });
  document.getElementById('fRahasia').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nilai = e.target.nilai.value;
    if (!nilai) return toast('Isi token terlebih dahulu', 'err');
    const j2 = await AApi.post('admin.rahasia.simpan', { kunci: 'FONNTE_TOKEN', nilai });
    toast(j2.success ? 'Token tersimpan: ' + j2.tersimpan : j2.message, j2.success ? 'ok' : 'err');
    viewPengaturan();
  });
}
