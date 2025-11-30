# Rekap Data Jurnal Mengajar Guru - SMK Negeri 1 Bumijawa

Aplikasi web sederhana untuk merekap dan mengelola data jurnal mengajar guru di SMK Negeri 1 Bumijawa. Aplikasi ini memungkinkan admin untuk mengelola data guru, pengaturan sekolah, dan tanda tangan, serta memungkinkan pengguna untuk memfilter dan mengekspor laporan kehadiran dalam format PDF.

## Fitur Utama

*   **Dashboard Publik**:
    *   Filter data berdasarkan Guru dan Rentang Tanggal.
    *   Tabel data kehadiran yang responsif.
    *   **Ekspor PDF**: Cetak laporan kehadiran siap tanda tangan dengan kop sekolah resmi.

*   **Panel Admin** (Password Default: `admin123`):
    *   **Pengaturan Sekolah**: Ubah nama sekolah, tahun ajaran, kepala sekolah, dan logo.
    *   **Manajemen Guru**: Import data guru dari Google Sheets (CSV) atau kelola secara manual.
    *   **Manajemen Tanda Tangan**: Upload tanda tangan Kepala Sekolah, Wakil Kurikulum, dan Guru untuk otomatisasi PDF.
    *   **Persistensi Data**: Semua data disimpan di browser (LocalStorage), sehingga tidak hilang saat di-refresh.

## Cara Penggunaan

1.  Buka aplikasi di browser.
2.  **Untuk Guru**:
    *   Pilih nama Anda dari dropdown "Pilih Guru".
    *   Tentukan rentang tanggal yang diinginkan.
    *   Klik "Ekspor ke PDF" untuk mengunduh laporan.
3.  **Untuk Admin**:
    *   Klik tombol "Admin" di pojok kanan atas.
    *   Masukkan password.
    *   Lakukan pengaturan data sekolah, guru, dan tanda tangan sesuai kebutuhan.

## Teknologi

*   HTML5, CSS3, Vanilla JavaScript
*   [jsPDF](https://github.com/parallax/jsPDF) & [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) untuk generasi PDF.
*   LocalStorage untuk penyimpanan data.

## Cara Install / Menjalankan

Cukup buka file `index.html` di browser modern apa saja. Tidak memerlukan server backend khusus.

## Lisensi

SMK Negeri 1 Bumijawa
