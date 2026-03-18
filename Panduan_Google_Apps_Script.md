Buka Google Sheets data jurnal Anda (spreadsheet yang terdapat sheet bernama "DATA").

Sistem ini akan mencari file tersebut dengan menebak namanya (tanpa menyertakan `JURNAL_Images/`) dan memakai fungsi pencarian tercerdas Google Drive (termasuk mencari per kata).

1. Di menu bagian atas Google Sheets, klik **Extensions** (Ekstensi) > **Apps Script** (Skrip Apps).
2. Hapus semua kode, lalu *copy* dan *paste* kode super otomatis di bawah ini:

```javascript
const NAMA_SHEET = "DATA"; 

// ==============================================
// 1. BAGIAN OTOMATIS (TIMER)
// ==============================================
function MULAI_ROBOT_OTOMATIS() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ScriptApp.newTrigger('updateDriveLinksOtomatis')
           .timeBased()
           .everyMinutes(1)
           .create();
  
  ScriptApp.newTrigger('updateDriveLinksOtomatis')
           .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
           .onChange()
           .create();
           
  Browser.msgBox("Robot Otomatis Aktif!\\n\\nScript di bawah akan mencari secara ganas ke semua sudut Drive Anda tiap 1 Menit.");
}

// ==============================================
// 2. METODE LAMA PEMBURU FOTO (DIPERKUAT)
// ==============================================
function updateDriveLinksOtomatis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_SHEET);
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const docColIndex = headers.findIndex(h => h.toString().toUpperCase().includes("DOKUMENTASI"));
  if (docColIndex === -1) return;
  
  let idColIndex = headers.findIndex(h => h.toString().toUpperCase() === "FILE ID DRIVE");
  if (idColIndex === -1) {
    idColIndex = headers.length;
    sheet.getRange(1, idColIndex + 1).setValue("FILE ID DRIVE");
  }
  
  let ubatHitung = 0;
  let adaDiproses = false;
  
  for (let i = 1; i < data.length; i++) {
    const docValue = data[i][docColIndex] ? data[i][docColIndex].toString() : "";
    const idValue = data[i][idColIndex] ? data[i][idColIndex].toString() : "";
    
    // Proses jika Dokumentasi terisi, TAPI kolom ID-nya kosong atau gagal ketemu (NOT FOUND)
    if (docValue !== "" && (idValue === "" || idValue === "NOT FOUND")) {
      adaDiproses = true;
      try {
        let fileId = "NOT FOUND";
        // PARSING NAMA: 
        // Jika awalnya "JURNAL_Images/f58d196d.FOTO KEGIATAN.031517.jpg"
        // Menjadi "f58d196d.FOTO KEGIATAN.031517.jpg" (JURNAL_Images HILANG SEPENUHNYA)
        let fileName = docValue;
        if (fileName.indexOf('/') > -1) {
          fileName = fileName.split('/').pop();
        }

        // TUGAS 1: Cari tepat persis (di 2 Folder AppSheet yang dibagikan)
        const folderIds = ["1liTSb2FqBjOskIsnUMcFS-DUrZx6u5sj", "1An-zzmmtv9NqHK7O6OQd8Xxx-ivUT9LR"];
        for (let f = 0; f < folderIds.length; f++) {
           try {
              const folder = DriveApp.getFolderById(folderIds[f]);
              const filesFolder = folder.searchFiles('title = "' + fileName + '"');
              if (filesFolder.hasNext()) { fileId = filesFolder.next().getId(); break; }
           } catch(e) {}
        }
        
        // TUGAS 2: Jika belum ketemu, cari ke Seluruh Drive secara Global (Persis nama)
        if (fileId === "NOT FOUND") {
          const filesGlobal = DriveApp.searchFiles('title = "' + fileName + '"');
          if (filesGlobal.hasNext()) { fileId = filesGlobal.next().getId(); }
        }

        // TUGAS 3: Jika MASIH belum ketemu (Mungkin Google spasi berubah), cari potongan ID-nya saja (misal "f58d196d")
        if (fileId === "NOT FOUND") {
          let kataKunci = fileName.split('.')[0]; // Akan mengambil "f58d196d"
          if (kataKunci && kataKunci.length >= 5) {
             const filesPartial = DriveApp.searchFiles('title contains "' + kataKunci + '"');
             if (filesPartial.hasNext()) { fileId = filesPartial.next().getId(); }
          }
        }
        
        // Simpan File ID-nya
        sheet.getRange(i + 1, idColIndex + 1).setValue(fileId);
        
      } catch (e) {}
      
      ubatHitung++;
      
      // Amankan dari limit Time-out Google Server
      if (ubatHitung >= 120) {
        return; 
      }
    }
  }
  
  if (!adaDiproses) {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'updateDriveLinksOtomatis' && triggers[i].getEventType() === ScriptApp.EventType.CLOCK) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  }
}
```

3. Klik Ikon **Save**.
4. Di bagian opsi *Dropdown* sebelah *tombol Debug*, pastikan terpilih: **MULAI_ROBOT_OTOMATIS**
5. Klik **Run** (Jalankan). 
6. Hapus isi kolom "FILE ID DRIVE" di spreadsheet yang sebelumnya *"NOT FOUND"* agar semuanya bersih (kosong melompong).
7. Selesai! Tunggu satu menit untuk melihat Google beraksi mengisi otomatis ID-nya, menutupi area yang kosong/tertinggal.
