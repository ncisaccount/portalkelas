# Cara Deploy PortalKelas Digital

## Struktur berkas (letakkan semua di ROOT repo, jangan pakai folder css/js)
```
index.html
style.css
app.js
manifest.json
sw.js
icon-192.png   ← siapkan sendiri, 192x192 px
icon-512.png   ← siapkan sendiri, 512x512 px
```

## 1) Isi URL backend
Buka `app.js`, baris pertama konfigurasi:
```js
const GAS_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT_ANDA/exec';
```
Ganti dengan URL **Deploy → Web app** dari project `Kode.gs` (harus berakhiran `/exec`).
Wajib dilakukan **sebelum** push pertama kali.

## 2) Buat repo GitHub
- Buat repository baru, **Public**, tanpa README/.gitignore otomatis.

## 3) Push lewat terminal (bukan "Upload files" di web — struktur folder bisa rata)
```bash
git init
git add .
git commit -m "Deploy PortalKelas Digital v1"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA_REPO.git
git push -u origin main
```
Jika diminta password dan gagal → gunakan **Personal Access Token** GitHub sebagai pengganti password.

## 4) Aktifkan GitHub Pages
Settings → Pages → Build and deployment:
- Source: `Deploy from a branch`
- Branch: `main` / folder `/ (root)` → **Save**

Tunggu 1–2 menit → situs aktif di `https://USERNAME.github.io/NAMA_REPO/`.

## 5) Cek PWA
Buka situs di Chrome → F12 → tab **Application** → pastikan **Manifest** dan **Service Workers** hijau/terdaftar. Di HP, buka menu browser → "Tambahkan ke layar Utama".

## Setiap kali mengubah Kode.gs
Apps Script editor → **Deploy → Manage deployments** → ikon pensil → Version: **New version** → **Deploy**. URL `/exec` tetap sama, tidak perlu ubah `app.js` lagi.
