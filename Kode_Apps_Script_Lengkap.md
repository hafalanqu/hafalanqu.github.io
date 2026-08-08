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
    
    const action = e.parameter.action || 'submit';

    // ----------------------------------------
    // FITUR: HAPUS DATA
    // ----------------------------------------
    if (action === 'delete') {
      const timestampId = e.parameter.timestampId;
      const nama = e.parameter.namaLengkap;
      
      const data = sheet.getDataRange().getValues();
      let deleted = false;
      for (let i = 1; i < data.length; i++) {
        let rawDate = data[i][0];
        let isoDate = (rawDate instanceof Date) ? rawDate.toISOString() : String(rawDate);
        if (isoDate === timestampId && data[i][2] === nama) {
          sheet.deleteRow(i + 1); // +1 karena array 0-indexed dan baris sheet 1-indexed
          deleted = true;
          break;
        }
      }
      
      if (deleted) {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'message': 'Data dihapus' })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Data tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Hitung selisih ayat otomatis
    let aMulai = parseInt(e.parameter.ayatMulai) || 0;
    let aSampai = parseInt(e.parameter.ayatSampai) || 0;
    const totalAyat = (aSampai > 0 && aMulai > 0) ? (aSampai - aMulai + 1) : 0;
    
    const namaLengkap = e.parameter.namaLengkap || '';
    const surat = e.parameter.surat || '';
    
    // ----------------------------------------
    // FITUR: DETEKSI ZIYADAH / MURAJA'AH CERDAS
    // ----------------------------------------
    let jenisSetoran = 'Ziyadah'; // Default
    const data = sheet.getDataRange().getValues();
    
    let timestampIdToEdit = e.parameter.timestampId;
    let editRowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      let rawDate = data[i][0];
      let isoDate = (rawDate instanceof Date) ? rawDate.toISOString() : String(rawDate);
      
      // Jika mode edit, kita abaikan baris yang sedang diedit agar tidak membandingkan dengan dirinya sendiri
      if (action === 'edit' && isoDate === timestampIdToEdit && data[i][2] === namaLengkap) {
        editRowIndex = i + 1;
        continue; 
      }

      // Jika murid dan surat sama
      if (data[i][2] === namaLengkap && data[i][4] === surat) {
        // Jika ayat mulai dan ayat sampai persis sama, maka ini Muraja'ah
        if (data[i][5] == aMulai && data[i][6] == aSampai) {
          jenisSetoran = 'Muraja\'ah';
        }
      }
    }

    // ----------------------------------------
    // FITUR: EDIT DATA
    // ----------------------------------------
    if (action === 'edit') {
      if (editRowIndex !== -1) {
        // Pertahankan timestamp asli agar ID unik tidak berubah
        let tglAsli = sheet.getRange(editRowIndex, 1).getValue();
        
        const dataRow = [
          tglAsli, 
          e.parameter.kelas || '',
          namaLengkap,
          jenisSetoran, // Dihitung otomatis
          surat,
          e.parameter.ayatMulai || '',
          e.parameter.ayatSampai || '',
          e.parameter.nilai || '',
          e.parameter.catatan || '',
          totalAyat
        ];
        
        sheet.getRange(editRowIndex, 1, 1, dataRow.length).setValues([dataRow]);
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': editRowIndex })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Data edit tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ----------------------------------------
    // FITUR: TAMBAH DATA (SUBMIT BARU)
    // ----------------------------------------
    sheet.insertRowBefore(2);
    const inputTanggal = e.parameter.tanggal;
    const tanggalSetoran = inputTanggal ? new Date(inputTanggal) : new Date();
    
    const dataRow = [
      tanggalSetoran,
      e.parameter.kelas || '',
      namaLengkap,
      jenisSetoran, // Dihitung otomatis
      surat,
      e.parameter.ayatMulai || '',
      e.parameter.ayatSampai || '',
      e.parameter.nilai || '',
      e.parameter.catatan || '',
      totalAyat
    ];
    
    sheet.getRange(2, 1, 1, dataRow.length).setValues([dataRow]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': 2 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
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
      let isoDate = "";
      let sortableDate = 0;
      if(tgl instanceof Date) {
        isoDate = tgl.toISOString();
        formattedDate = tgl.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'});
        sortableDate = tgl.getTime();
      } else {
        isoDate = String(tgl);
        formattedDate = String(tgl).split('T')[0];
        sortableDate = new Date(tgl).getTime() || 0;
      }

      history.push({
        id: isoDate, // Digunakan untuk unik ID hapus/edit
        tanggal: formattedDate,
        sortableDate: sortableDate,
        kelas: data[i][1],
        jenisSetoran: data[i][3],
        surat: data[i][4],
        ayatMulai: data[i][5],
        ayatSampai: data[i][6],
        nilai: data[i][7],
        catatan: data[i][8]
      });
    }
  }
  
  // Urutkan berdasarkan tanggal (terbaru di atas)
  history.sort((a, b) => b.sortableDate - a.sortableDate);
  
  // Ambil maksimal 3 riwayat terakhir
  let topHistory = history.slice(0, 3);
  
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success', data: topHistory }))
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
