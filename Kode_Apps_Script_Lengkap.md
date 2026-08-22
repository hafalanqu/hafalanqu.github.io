# KODE FULL APPS SCRIPT HAFALANQU (VERSI HTML DASHBOARD)

Ikuti langkah ini untuk memperbarui sistem Anda agar memiliki Dashboard HTML murni dan Database tanpa rumus sama sekali:

1. Buka editor **Apps Script** Anda.
2. Buka file **Kode.gs**, hapus semua isinya (Ctrl+A lalu Delete).
3. **Copy (Salin) seluruh kode di bawah ini**, dan **Paste** ke editor Apps Script:

```javascript
// ==========================================
// KODE BACKEND: FORM HTML & DASHBOARD ROUTER
// ==========================================

const sheetName = 'Database';
const scriptProp = PropertiesService.getScriptProperties();

function initialSetup () {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty('key', activeSpreadsheet.getId());
}

function doPost (e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    const sheet = doc.getSheetByName(sheetName);

    // Hitung selisih ayat otomatis
    let aMulai = parseInt(e.parameter.ayatMulai) || 0;
    let aSampai = parseInt(e.parameter.ayatSampai) || 0;
    const totalAyat = (aSampai > 0 && aMulai > 0) ? (aSampai - aMulai + 1) : 0;
    
    // Tambahkan baris baru di posisi 2 (di bawah header)
    sheet.insertRowBefore(2);
    
    // Ambil tanggal dari form (atau gunakan waktu saat ini jika kosong)
    const inputTanggal = e.parameter.tanggal;
    const tanggalSetoran = inputTanggal ? new Date(inputTanggal) : new Date();
    
    const dataRow = [
      tanggalSetoran, // Timestamp (Tanggal)
      e.parameter.kelas || '',
      e.parameter.namaLengkap || '',
      e.parameter.jenisSetoran || '',
      e.parameter.surat || '',
      e.parameter.ayatMulai || '',
      e.parameter.ayatSampai || '',
      e.parameter.nilai || '',
      e.parameter.catatan || '',
      totalAyat // Total Ayat murni data numerik
    ];
    
    // Masukkan data ke baris 2 (Hanya data murni, tanpa rumus K dan L!)
    sheet.getRange(2, 1, 1, dataRow.length).setValues([dataRow]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': 2 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    // ROUTING 1: Permintaan Data History (Dipanggil oleh Form)
    if (e.parameter.action === 'getHistory') {
      return getHistoryData(e.parameter.nama);
    }
    
    // ROUTING 2: Permintaan Semua Data Database (Dipanggil oleh Dashboard HTML)
    // Walaupun tanpa parameter, kita bisa jadikan ini default response agar API mudah diakses
    return getAllDataJSON();

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// FUNGSI PENGAMBILAN DATA (API JSON)
// ==========================================

// Fungsi untuk Form: Mengambil 3 riwayat terakhir
function getHistoryData(namaLengkap) {
  const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
  const sheet = doc.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  let history = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === namaLengkap) {
      let tgl = data[i][0];
      let formattedDate = "";
      if(tgl instanceof Date) {
        formattedDate = tgl.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'});
      } else {
        formattedDate = String(tgl).split('T')[0];
      }

      history.push({
        tanggal: formattedDate,
        jenisSetoran: data[i][3],
        surat: data[i][4],
        ayatMulai: data[i][5],
        ayatSampai: data[i][6],
        nilai: data[i][7]
      });
      if (history.length === 3) break;
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success', data: history }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi untuk Dashboard: Mengambil SELURUH data baris-berbaris
function getAllDataJSON() {
  const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
  const sheet = doc.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  let database = [];
  
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (row[2] && row[2] !== '') { // Jika kolom Nama tidak kosong
      let rawDate = row[0];
      let isoDate = "";
      let simpleDate = "";
      if (rawDate instanceof Date) {
        isoDate = rawDate.toISOString(); // Untuk disortir komputer
        simpleDate = rawDate.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}); // Untuk dibaca manusia
      } else {
        isoDate = rawDate;
        simpleDate = String(rawDate).split('T')[0];
      }

      database.push({
        tanggalRaw: isoDate,
        tanggal: simpleDate,
        kelas: row[1],
        nama: row[2],
        jenis: row[3],
        surat: row[4],
        ayatMulai: row[5],
        ayatSampai: row[6],
        nilai: row[7],
        catatan: row[8],
        totalAyat: parseInt(row[9]) || 0
      });
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success', data: database }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Klik tombol **Save (Simpan)**.
5. Sekarang, Anda dapat **Menghapus Sheet `Dashboard` dan `Rekap Absensi` lama secara permanen** dari Google Spreadsheet Anda. Biarkan hanya tersisa sheet `Database` agar Spreadsheet super ringan. Anda juga boleh menghapus kolom J, K, dan L jika ada sisa tulisan `#ERROR!` di sana, karena sekarang kita hanya butuh Kolom A sampai J (Total Ayat) saja!

*(Langkah pembuatan halaman Dashboard HTML ada di file terpisah).*
