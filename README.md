# Keuangan KDMP Baleharjo

Aplikasi laporan keuangan Koperasi Desa Merah Putih Baleharjo.

```
gas/   Kode Google Apps Script (Code.gs, index.html, appsscript.json)  -> logika & data (spreadsheet)
web/   Halaman Vercel yang hanya menampilkan Web App GAS lewat iframe
```

Semua perubahan fitur dan data dilakukan di **gas/**. Folder **web/** hanya perlu diubah sekali (mengisi URL Web App).

## 1. Push ke GitHub (pertama kali)

```bash
git init
git add .
git commit -m "Awal: aplikasi keuangan KDMP Baleharjo"
git branch -M main
git remote add origin https://github.com/USERNAME/kdmp-baleharjo.git
git push -u origin main
```

## 2. Deploy tampilan ke Vercel

1. vercel.com -> **Add New -> Project** -> import repo `kdmp-baleharjo`.
2. **Root Directory**: `web` | **Framework Preset**: `Other` | kosongkan Build Command.
3. **Deploy**.

Sebelum itu, isi `GAS_URL` di `web/index.html` dengan URL Web App (akhiran `/exec`).

## 3. Alur update harian

**Cara A - edit di editor Apps Script (paling mudah)**
1. Edit kode di editor Apps Script, simpan, lalu **Terapkan -> Kelola deployment -> Versi baru**.
2. Tampilan di Vercel otomatis ikut berubah (URL tetap sama, tidak perlu deploy ulang Vercel).
3. Simpan ke GitHub: `clasp pull` lalu `git add . && git commit -m "pesan" && git push`.

**Cara B - edit di komputer lalu push dengan clasp**
```bash
npm i -g @google/clasp
clasp login                       # sekali saja
clasp push                        # kirim gas/ ke Apps Script
clasp deployments                 # lihat ID deployment
clasp deploy -i <DEPLOYMENT_ID> -d "keterangan"   # perbarui deployment yang sama
git add . && git commit -m "keterangan" && git push
```
Aktifkan dulu Apps Script API di https://script.google.com/home/usersettings dan isi `scriptId` di `.clasp.json`
(Apps Script -> Pengaturan proyek -> ID Skrip).

## Catatan keamanan
- Jangan pernah commit `~/.clasprc.json` (token login clasp).
- Agar bisa tampil di iframe, deployment GAS harus berakses **Anyone**. Artinya siapa pun yang tahu URL dapat membuka
  dan mengubah data. Sebaiknya tambahkan PIN/kata sandi di aplikasi.
