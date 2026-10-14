/**
 * KEUANGAN KDMP BALEHARJO - Backend Google Apps Script
 * Data disimpan di spreadsheet (sheet DB_ANGGOTA, DB_SIMPANAN, DB_TRANSAKSI).
 * Sheet lama (HOME, REKAP, MEI, dst.) tidak diubah.
 */
const SS_ID = '1OIMqZ8UhSAPl3xTHCaNDSX0UGkgr2ohMGGJtjx4128w';

const HEAD = {
  ANGGOTA:   ['ID', 'NAMA', 'KETERANGAN'],
  SIMPANAN:  ['ID', 'TAHUN', 'BULAN', 'ANGGOTA_ID', 'JENIS', 'JUMLAH', 'TANGGAL'],
  TRANSAKSI: ['ID', 'TANGGAL', 'URAIAN', 'JENIS', 'JUMLAH', 'KATEGORI']
};
const TEXT_COL = { SIMPANAN: 'G:G', TRANSAKSI: 'B:B' }; // kolom tanggal disimpan sebagai teks yyyy-mm-dd

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Keuangan KDMP Baleharjo')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Jalankan sekali dari editor (opsional) untuk membuat sheet + data 2025. */
function setupAwal() { seed_(); }

/* ---------- API untuk index.html (semua mengembalikan data terbaru) ---------- */
function getData() {
  seed_();
  return { anggota: rd_('ANGGOTA'), simpanan: rd_('SIMPANAN'), transaksi: rd_('TRANSAKSI') };
}

function simpanAnggota(o) {
  return lock_(() => {
    if (!String(o.nama || '').trim()) throw new Error('Nama wajib diisi');
    up_('ANGGOTA', [o.id || 'A' + Utilities.getUuid().slice(0, 6), String(o.nama).trim(), o.keterangan || '']);
  });
}

function hapusAnggota(id) {
  return lock_(() => {
    if (rd_('SIMPANAN').some(s => s.anggota_id === id))
      throw new Error('Anggota masih punya data simpanan, tidak bisa dihapus.');
    del_('ANGGOTA', id);
  });
}

/** Set simpanan untuk 1 atau banyak anggota. jumlah<=0 = hapus. Pokok: 1 data per anggota per tahun. */
function setSimpanan(tahun, bulan, ids, jenis, jumlah, tanggal) {
  return lock_(() => {
    tahun = +tahun; bulan = +bulan; jumlah = +jumlah;
    if (!['Pokok', 'Wajib'].includes(jenis)) throw new Error('Jenis tidak valid');
    const s = sh_('SIMPANAN');
    let rows = s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, 7).getValues().filter(r => r[0] !== '') : [];
    rows.forEach(r => r[6] = ds_(r[6]));
    ids.forEach(aid => {
      const i = rows.findIndex(r => +r[1] === tahun && r[3] === aid && r[4] === jenis && (jenis === 'Pokok' || +r[2] === bulan));
      if (jumlah > 0) {
        if (i >= 0) { rows[i][5] = jumlah; rows[i][6] = tanggal; if (jenis === 'Pokok') rows[i][2] = bulan; }
        else rows.push(['S' + Utilities.getUuid().slice(0, 8), tahun, bulan, aid, jenis, jumlah, tanggal]);
      } else if (i >= 0) rows.splice(i, 1);
    });
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, 7).clearContent();
    if (rows.length) s.getRange(2, 1, rows.length, 7).setValues(rows);
  });
}

function simpanTransaksi(o) {
  return lock_(() => {
    if (!['Masuk', 'Keluar'].includes(o.jenis)) throw new Error('Jenis tidak valid');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)) throw new Error('Tanggal tidak valid');
    if (!(+o.jumlah > 0)) throw new Error('Jumlah harus lebih dari 0');
    if (!String(o.uraian || '').trim()) throw new Error('Uraian wajib diisi');
    up_('TRANSAKSI', [o.id || 'T' + Utilities.getUuid().slice(0, 8), o.tanggal, String(o.uraian).trim(), o.jenis, +o.jumlah, o.kategori || '']);
  });
}

function hapusTransaksi(id) { return lock_(() => del_('TRANSAKSI', id)); }

/* ---------- Helper ---------- */
function lock_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(20000);
  try { fn(); SpreadsheetApp.flush(); return getData(); } finally { l.releaseLock(); }
}

function sh_(n) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let s = ss.getSheetByName('DB_' + n);
  if (!s) {
    s = ss.insertSheet('DB_' + n);
    s.getRange(1, 1, 1, HEAD[n].length).setValues([HEAD[n]]).setFontWeight('bold').setBackground('#C8102E').setFontColor('#ffffff');
    s.setFrozenRows(1);
    if (TEXT_COL[n]) s.getRange(TEXT_COL[n]).setNumberFormat('@');
  }
  return s;
}

function ds_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd') : v; }

function rd_(n) {
  const v = sh_(n).getDataRange().getValues();
  const H = v.shift().map(h => String(h).toLowerCase());
  return v.filter(r => r[0] !== '').map(r => { const o = {}; H.forEach((h, i) => o[h] = ds_(r[i])); return o; });
}

function up_(n, row) {
  const s = sh_(n);
  const ids = s.getRange(1, 1, s.getLastRow(), 1).getValues().flat();
  const i = ids.indexOf(row[0]);
  if (i > 0) s.getRange(i + 1, 1, 1, row.length).setValues([row]); else s.appendRow(row);
}

function del_(n, id) {
  const s = sh_(n);
  const i = s.getRange(1, 1, s.getLastRow(), 1).getValues().flat().indexOf(id);
  if (i > 0) s.deleteRow(i + 1);
}

/* ---------- Data awal 2025 (dari LAPORAN_KEUANGAN_KDMP_BALEHARJO.xlsx) ---------- */
function seed_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('seeded')) return;
  const l = LockService.getScriptLock(); l.waitLock(20000);
  try {
    if (P.getProperty('seeded')) return;
    const nama = ['Sawiyo', 'Yanto', 'Bambang', 'Danang', 'Redi', 'Jayanto', 'Sutomo', 'Triyono', 'Nuryatin', 'Andi Affendi', 'Budi', 'Suradi',
      'Winarno', 'Suwarto', 'Zaenab', 'Ika Fajar', 'Harjanti', 'Eko', 'Gunawan', 'Supardi', 'Riyanto', 'Jumadi', 'Giyanto', 'Suyatno'];
    const ang = nama.map((n, i) => ['A' + String(i + 1).padStart(2, '0'), n, '']);
    const sim = [];
    ang.forEach(a => {
      sim.push(['SP' + a[0], 2025, 5, a[0], 'Pokok', 100000, '2025-05-02']);
      for (let m = 5; m <= 12; m++)
        sim.push(['SW' + a[0] + m, 2025, m, a[0], 'Wajib', 10000, '2025-' + String(m).padStart(2, '0') + '-02']);
    });
    const trx = [
      ['2025-06-18', 'Buka rekening Bank Jateng', 'Keluar', 100000, 'Administrasi'],
      ['2025-09-17', 'Kulak Minyak Kita dan Fortune', 'Keluar', 2492000, 'Usaha'],
      ['2025-09-23', 'Bagi hasil petik melon KMP', 'Masuk', 16000, 'Bagi Hasil'],
      ['2025-09-30', 'Laba Minyak bulan September', 'Masuk', 74672, 'Laba Usaha'],
      ['2025-10-31', 'Balik modal minyak goreng', 'Masuk', 2492000, 'Modal Kembali'],
      ['2025-10-31', 'Laba minyak goreng', 'Masuk', 94328, 'Laba Usaha'],
      ['2025-12-02', 'Kulak minyak goreng', 'Keluar', 1162000, 'Usaha'],
      ['2025-12-31', 'Laba Minyak goreng', 'Masuk', 38000, 'Laba Usaha'],
      ['2025-12-31', 'Balik modal minyak goreng', 'Masuk', 1162000, 'Modal Kembali']
    ].map((t, i) => ['T2025' + String(i + 1).padStart(2, '0'), t[0], t[1], t[2], t[3], t[4]]);
    const put = (n, rows) => { const s = sh_(n); if (s.getLastRow() < 2 && rows.length) s.getRange(2, 1, rows.length, rows[0].length).setValues(rows); };
    put('ANGGOTA', ang); put('SIMPANAN', sim); put('TRANSAKSI', trx);
    P.setProperty('seeded', '1');
  } finally { l.releaseLock(); }
}
