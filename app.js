// Configuration
const SHEET_ID = '1hmmqizw7JrHuQDTcU_icl_Y4ZoyOgxWpuvNz2yWftAs';
const DATA_SHEET_NAME = 'DATA';
const TEACHER_SHEET_NAME = 'GURU';

// Global Variables
let allData = [];
let filteredData = [];
let allTeachers = [];
let currentTeacher = '';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    loadSettings();
    await loadTeachers();
    populateTeacherDropdown();
    hideLoading();
}

// Setup Event Listeners
function setupEventListeners() {
    // Teacher filter
    document.getElementById('teacherFilter').addEventListener('change', handleTeacherFilter);

    // Matikan event listener *change* agar wajib klik tombol Terapkan Filter
    // document.getElementById('teacherFilter').addEventListener('change', handleTeacherFilter);

    // Apply Filter Button terpusat
    const applyBtn = document.getElementById('applyFilterBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            const selectedTeacher = document.getElementById('teacherFilter').value;
            if (!selectedTeacher) {
                clearTable();
                return;
            }
            currentTeacher = selectedTeacher;
            await loadData(selectedTeacher);
        });
    }

    // Date filters (REMOVE auto apply on change)
    // document.getElementById('dateFrom').addEventListener('change', () => applyFilters());
    // document.getElementById('dateTo').addEventListener('change', () => applyFilters());

    // Export PDF
    document.getElementById('exportPdfBtn').addEventListener('click', handleExportPDF);

    // Toggle view with password
    document.getElementById('toggleViewBtn').addEventListener('click', handleToggleView);

    // User View Tabs
    const userTabs = document.querySelectorAll('.user-tab-btn');
    userTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            userTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const target = e.currentTarget.getAttribute('data-tab');
            document.querySelectorAll('.user-tab-content').forEach(c => {
                c.style.display = 'none';
            });
            document.getElementById(target).style.display = 'block';
        });
    });
}

// Handle Toggle View with Password
function handleToggleView() {
    const userView = document.getElementById('userView');
    const adminView = document.getElementById('adminView');
    const toggleBtn = document.getElementById('toggleViewBtn');
    const toggleText = document.getElementById('toggleViewText');

    if (userView.classList.contains('active')) {
        // Switching to admin - ask for password
        const password = prompt('Masukkan password admin:');

        // Default password: admin123 (can be changed in localStorage)
        const savedPassword = localStorage.getItem('adminPassword') || 'admin123';

        if (password === savedPassword) {
            userView.classList.remove('active');
            adminView.classList.add('active');
            toggleText.textContent = 'Tampilan User';
        } else if (password !== null) {
            showToast('Password salah!', 'error');
        }
    } else {
        // Switching back to user view
        adminView.classList.remove('active');
        userView.classList.add('active');
        toggleText.textContent = 'Admin';
    }
}

// Load Settings
function loadSettings() {
    const settings = getSettings();
    document.getElementById('schoolName').textContent = settings.schoolName;
    document.getElementById('academicYear').textContent = `Tahun Pelajaran ${settings.academicYear}`;

    if (settings.logo) {
        document.getElementById('schoolLogo').src = settings.logo;
    }
}

// Get Settings from localStorage
function getSettings() {
    const defaultSettings = {
        schoolName: 'SMK Negeri 1 Bumijawa',
        academicYear: '2025/2026',
        principalName: 'NUR KHIKMAH, S.Pd., M.Pd.',
        principalNIP: '',
        curriculumName: 'ILHAM SUSILO BAKTI, M.Kom',
        curriculumNIP: '',
        logo: 'default-logo.svg'
    };

    const saved = localStorage.getItem('schoolSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
}

// Save Settings to localStorage
function saveSettings(settings) {
    localStorage.setItem('schoolSettings', JSON.stringify(settings));
}

// Get Signatures from localStorage
function getSignatures() {
    const saved = localStorage.getItem('signatures');
    return saved ? JSON.parse(saved) : { principal: null, curriculum: null, teacher: null };
}

// Save Signatures to localStorage
function saveSignatures(signatures) {
    localStorage.setItem('signatures', JSON.stringify(signatures));
}

// Load Teachers from Google Sheets
async function loadTeachers() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${TEACHER_SHEET_NAME}`;

        const response = await fetch(url);
        const csvText = await response.text();

        const rows = parseCSV(csvText);

        allTeachers = rows.slice(1).map(row => ({
            name: row[0] || '',
            nip: row[1] || '',
            rank: row[2] || '',
            status: row[3] || '',
            subject: row[4] || '',
            code: row[5] || ''
        })).filter(teacher => teacher.name.trim() !== '');

        // Auto-detect Kepala Sekolah and Wakil Kurikulum from status column
        const principal = allTeachers.find(t => {
            const status = t.status.toUpperCase().trim();
            return status.includes('KEPALA SEKOLAH') || status.includes('KEPALA');
        });

        const curriculum = allTeachers.find(t => {
            const status = t.status.toUpperCase().trim();
            return status.includes('WAKIL') && status.includes('KURIKULUM');
        });

        // Update settings with auto-detected data
        if (principal || curriculum) {
            const currentSettings = getSettings();
            const updatedSettings = { ...currentSettings };

            if (principal) {
                updatedSettings.principalName = principal.name;
                updatedSettings.principalNIP = principal.nip;
            }

            if (curriculum) {
                updatedSettings.curriculumName = curriculum.name;
                updatedSettings.curriculumNIP = curriculum.nip;
            }

            saveSettings(updatedSettings);
        }

        // Save to localStorage
        localStorage.setItem('teachers', JSON.stringify(allTeachers));

        return allTeachers;
    } catch (error) {
        console.error('Error loading teachers:', error);

        // Try to load from localStorage
        const saved = localStorage.getItem('teachers');
        if (saved) {
            allTeachers = JSON.parse(saved);
        }

        return allTeachers;
    }
}

// Parse CSV
function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField);
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentField);
            if (currentRow.length > 0) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
            if (nextChar === '\r') i++;
        } else if (char === '\r' && !inQuotes) {
            // Skip carriage return
        } else {
            currentField += char;
        }
    }

    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    return rows;
}

// Populate Teacher Dropdown
function populateTeacherDropdown() {
    const select = document.getElementById('teacherFilter');

    while (select.options.length > 2) {
        select.remove(2);
    }

    allTeachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.name;
        option.textContent = teacher.name;
        select.appendChild(option);
    });
}

// Handle Teacher Filter Change (Sudah tidak dipanggil langsung oleh elemen Select)
async function handleTeacherFilter(event) {
    // Fungsi ini dinonaktifkan asalnya karena trigger "Terapkan Filter" yang sekarang menangani semuanya
}

// Apply all filters (teacher + date range)
function applyFilters() {
    if (!currentTeacher || allData.length === 0) {
        return;
    }

    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    let filtered = currentTeacher === 'all'
        ? allData
        : allData.filter(row => row.namaGuru.trim().toLowerCase() === currentTeacher.trim().toLowerCase());

    if (dateFrom || dateTo) {
        filtered = filtered.filter(row => {
            const rowDate = parseDateString(row.tanggal);
            if (!rowDate) return false;

            rowDate.setHours(0, 0, 0, 0);

            let fromDate = null;
            let toDate = null;

            if (dateFrom) {
                fromDate = new Date(dateFrom);
                fromDate.setHours(0, 0, 0, 0);
            }

            if (dateTo) {
                toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
            }

            if (fromDate && toDate) {
                return rowDate >= fromDate && rowDate <= toDate;
            } else if (fromDate) {
                return rowDate >= fromDate;
            } else if (toDate) {
                return rowDate <= toDate;
            }

            return true;
        });
    }

    filteredData = filtered;
    displayData();
}

// Parse date string
function parseDateString(dateStr) {
    if (!dateStr) return null;

    const cleaned = dateStr.trim();

    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        const year = parseInt(isoMatch[1]);
        const month = parseInt(isoMatch[2]) - 1;
        const day = parseInt(isoMatch[3]);
        return new Date(year, month, day);
    }

    const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
        const day = parseInt(ddmmyyyyMatch[1]);
        const month = parseInt(ddmmyyyyMatch[2]) - 1;
        const year = parseInt(ddmmyyyyMatch[3]);
        return new Date(year, month, day);
    }

    const date = new Date(cleaned);
    return isNaN(date.getTime()) ? null : date;
}

// Load Data from Google Sheets
async function loadData(teacherName) {
    try {
        showLoading();

        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${DATA_SHEET_NAME}`;

        const response = await fetch(url);
        const csvText = await response.text();

        const rows = parseCSV(csvText);

        const headers = rows[0] ? rows[0].map(h => typeof h === 'string' ? h.trim().toUpperCase() : '') : [];

        const idxTanggal = headers.indexOf('TANGGAL') > -1 ? headers.indexOf('TANGGAL') : 0;
        const idxHari = headers.indexOf('HARI') > -1 ? headers.indexOf('HARI') : 1;
        const idxJam = headers.indexOf('JAM KE') > -1 ? headers.indexOf('JAM KE') : 2;
        const idxGuru = headers.indexOf('NAMA GURU') > -1 ? headers.indexOf('NAMA GURU') : 3;
        const idxKelas = headers.indexOf('KELAS') > -1 ? headers.indexOf('KELAS') : 4;
        const idxRuang = headers.indexOf('RUANG') > -1 ? headers.indexOf('RUANG') : 5;
        const idxJmlSiswa = headers.indexOf('JUMLAH SISWA') > -1 ? headers.indexOf('JUMLAH SISWA') : 6;
        const idxMapel = headers.indexOf('MAPEL') > -1 ? headers.indexOf('MAPEL') : 7;
        const idxMateri = headers.indexOf('MATERI PEMBELAJARAN') > -1 ? headers.indexOf('MATERI PEMBELAJARAN') : headers.findIndex(h => h.includes('MATERI')) > -1 ? headers.findIndex(h => h.includes('MATERI')) : 8;
        const idxHadir = headers.findIndex(h => h === 'HADIR') > -1 ? headers.findIndex(h => h === 'HADIR') : 9;
        const idxAlpha = headers.findIndex(h => h.includes('ALPHA')) > -1 ? headers.findIndex(h => h.includes('ALPHA')) : 10;
        const idxIzin = headers.findIndex(h => h.includes('IZIN')) > -1 ? headers.findIndex(h => h.includes('IZIN')) : 11;
        const idxSakit = headers.findIndex(h => h.includes('SAKIT')) > -1 ? headers.findIndex(h => h.includes('SAKIT')) : 12;
        const idxTidakHadir = headers.findIndex(h => h.includes('TIDAK HADIR')) > -1 ? headers.findIndex(h => h.includes('TIDAK HADIR')) : 13;
        const idxDokumentasi = headers.findIndex(h => h.includes('DOKUMENTASI'));
        const idxFileIdDrive = headers.findIndex(h => h.toUpperCase() === 'FILE ID DRIVE');

        allData = rows.slice(1).map(row => ({
            tanggal: row[idxTanggal] || '',
            hari: row[idxHari] || '',
            jamKe: row[idxJam] || '',
            namaGuru: row[idxGuru] || '',
            kelas: row[idxKelas] || '',
            ruang: row[idxRuang] || '',
            jumlahSiswa: row[idxJmlSiswa] || '',
            mapel: row[idxMapel] || '',
            materi: row[idxMateri] || '',
            siswaHadir: row[idxHadir] || '',
            siswaAlpha: row[idxAlpha] || '',
            siswaIzin: row[idxIzin] || '',
            siswaSakit: row[idxSakit] || '',
            siswaTidakHadir: row[idxTidakHadir] || '',
            dokumentasi: idxDokumentasi > -1 ? row[idxDokumentasi] || '' : (row.length > 14 ? row[row.length - 1] || '' : ''),
            fileIdDrive: idxFileIdDrive > -1 ? row[idxFileIdDrive] || '' : ''
        }));

        if (teacherName === 'all') {
            filteredData = allData;
        } else {
            filteredData = allData.filter(row =>
                row.namaGuru.trim().toLowerCase() === teacherName.trim().toLowerCase()
            );
        }

        applyFilters();
        displayData();

        document.getElementById('exportPdfBtn').disabled = false;

        hideLoading();
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoading();
        showToast('Gagal memuat data pembelajaran', 'error');
    }
}

// Display Data in Table
function displayData() {
    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable');
    const noDataMessage = document.getElementById('noDataMessage');

    tableBody.innerHTML = '';

    if (filteredData.length === 0) {
        dataTable.style.display = 'none';
        noDataMessage.style.display = 'block';
        noDataMessage.querySelector('h3').textContent = 'Tidak Ada Data';
        noDataMessage.querySelector('p').textContent = 'Tidak ada data untuk filter yang dipilih';

        const docContainer = document.getElementById('docContainer');
        if (docContainer) {
            docContainer.innerHTML = '<div class="no-data-message" style="grid-column: 1 / -1; display: block; margin-top: 20px;"><h3>Tidak Ada Dokumentasi</h3><p>Tidak ada data untuk filter yang dipilih</p></div>';
        }

        const dashboard = document.getElementById('statsDashboard');
        if (dashboard) dashboard.style.display = 'none';

        return;
    }

    dataTable.style.display = 'table';
    noDataMessage.style.display = 'none';

    // Kalkulasi Data Dashboard Mini
    const dashboard = document.getElementById('statsDashboard');
    if (dashboard) {
        dashboard.style.display = 'grid'; // Tampilkan Dasbor
        let totalHadir = 0, totalAlfa = 0, totalSakitIzin = 0;

        filteredData.forEach(row => {
            totalHadir += parseInt(row.siswaHadir) || 0;
            totalAlfa += (parseInt(row.siswaAlpha) || 0) + (parseInt(row.siswaTidakHadir) || 0);
            totalSakitIzin += (parseInt(row.siswaIzin) || 0) + (parseInt(row.siswaSakit) || 0);
        });

        const totalKehadiranSiswa = totalHadir + totalAlfa + totalSakitIzin;
        const persentase = totalKehadiranSiswa > 0 ? Math.round((totalHadir / totalKehadiranSiswa) * 100) : 0;
        const totalTidakHadir = totalAlfa + totalSakitIzin;

        document.getElementById('statTotalJam').textContent = filteredData.length + ' Kali';
        document.getElementById('statHadir').textContent = persentase + '%';

        const elTidakHadir = document.getElementById('statTidakHadir');
        if (elTidakHadir) elTidakHadir.textContent = totalTidakHadir;

        const elKetTidakHadir = document.getElementById('statKeteranganTidakHadir');
        if (elKetTidakHadir) elKetTidakHadir.textContent = 'dalam ' + filteredData.length + ' Pertemuan';
    }

    filteredData.forEach((row, index) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${row.tanggal}</td>
            <td>${row.hari}</td>
            <td>${row.jamKe}</td>
            <td>${row.namaGuru}</td>
            <td>${row.kelas}</td>
            <td>${row.ruang}</td>
            <td>${row.jumlahSiswa}</td>
            <td>${row.mapel}</td>
            <td>${row.materi}</td>
            <td>${row.siswaHadir}</td>
            <td>${row.siswaAlpha}</td>
            <td>${row.siswaIzin}</td>
            <td>${row.siswaSakit}</td>
            <td>${row.siswaTidakHadir}</td>
        `;

        tableBody.appendChild(tr);
    });

    displayDokumentasi();
}

// Display Dokumentasi
function displayDokumentasi() {
    const docContainer = document.getElementById('docContainer');
    const docBulkActions = document.getElementById('docBulkActions');
    const selectAllCheckbox = document.getElementById('selectAllDocs');
    const selectedCountSpan = document.getElementById('selectedCount');
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    const refreshDocsBtn = document.getElementById('refreshDocsBtn');

    if (!docContainer) return;

    docContainer.innerHTML = '';
    // Reset Data Label Print
    const printTeacherName = document.getElementById('printTeacherName');
    const printDocCount = document.getElementById('printDocCount');
    if (printTeacherName) {
        printTeacherName.textContent = `Nama Guru: ${currentTeacher || '-'}`;
    }

    if (refreshDocsBtn) {
        refreshDocsBtn.onclick = () => {
            showToast('Memuat ulang gambar...', 'success');
            displayDokumentasi();
        };
    }

    const docsWithImages = filteredData.filter(row => row.dokumentasi && row.dokumentasi.trim() !== '');

    if (printDocCount) {
        printDocCount.textContent = `Jumlah Laporan: ${docsWithImages.length} dokumentasi`;
    }

    if (docsWithImages.length === 0) {
        if (docBulkActions) docBulkActions.style.display = 'none';
        docContainer.innerHTML = '<div class="no-data-message" style="grid-column: 1 / -1; display: block; margin-top: 20px;"><h3>Tidak Ada Dokumentasi</h3><p>Data yang difilter tidak memiliki dokumen/foto</p></div>';
        return;
    }

    if (docBulkActions) docBulkActions.style.display = 'flex';

    docsWithImages.forEach((row, index) => {
        const card = document.createElement('div');
        card.className = 'doc-card';

        let displayUrl = '';
        let fileName = row.dokumentasi;
        let fileId = null;

        // Jika Google Apps Script sudah mengisi FILE ID DRIVE untuk baris ini
        if (row.fileIdDrive && row.fileIdDrive !== "NOT FOUND" && row.fileIdDrive.trim() !== "") {
            fileId = row.fileIdDrive.trim();
            fileName = row.dokumentasi.includes('/') ? row.dokumentasi.split('/').pop() : row.dokumentasi;
            displayUrl = `https://drive.google.com/file/d/${fileId}/view`;
        } else {
            // Logika Fallback (Jika data baru masuk dan Script belum sempat dijalankan)
            if (row.dokumentasi.includes('/')) {
                fileName = row.dokumentasi.split('/').pop();
            }

            if (row.dokumentasi.startsWith('http')) {
                displayUrl = row.dokumentasi;
                const idMatch = row.dokumentasi.match(/[-\w]{25,}/);
                if (idMatch) fileId = idMatch[0];
            } else {
                displayUrl = `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(fileName)}`;
            }
        }

        // Tautan Download Langsung
        let downloadUrl = '';
        let thumbnailUrl = 'default-logo.svg';
        let fallbackUrl = ''; // URL lapis kedua

        if (fileId) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            // Prioritas: LH3 CDN Google (Langsung foto murni beresolusi w600)
            thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}=w600`;
            // Fallback: Jika LH3 tertutup akses public, pakai thumbnail api
            fallbackUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
        } else {
            downloadUrl = displayUrl;
            fallbackUrl = displayUrl;
        }
        // Fungsi Helper untuk Format Tanggal DD MMM YYYY (ID)
        function formatTanggalIndo(dateString) {
            if (!dateString) return '-';
            let date = new Date(dateString);

            // Jika parsing standard gagal atau menghasilkan format aneh, coba pisahkan manual
            if (isNaN(date.getTime()) || dateString.includes('/')) {
                const parts = dateString.split(/[\/\-]/);
                // Umumnya format lokal adakah DD/MM/YYYY
                if (parts.length === 3) {
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
            // Jika masih gagal
            if (isNaN(date.getTime())) return dateString;

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
            const d = date.getDate().toString().padStart(2, '0');
            return `${d} ${months[date.getMonth()]} ${date.getFullYear()}`;
        }

        card.innerHTML = `
            <div class="doc-thumbnail-container" style="position: relative; background: var(--bg-secondary);">
                <!-- Skeleton Placeholder -->
                <div class="skeleton" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1;"></div>
                
                <a class="doc-img-link" href="${displayUrl}" target="_blank" title="Buka Gambar" style="position: relative; z-index: 2; display: block; height: 100%;">
                    <img src="${thumbnailUrl}" data-fallback="${fallbackUrl}" alt="Thumbnail ${fileName}" class="doc-thumbnail" style="opacity: 0; transition: opacity 0.4s ease;" 
                         onload="this.style.opacity='1'; this.parentElement.previousElementSibling.style.display='none';" 
                         onerror="if(this.dataset.fallback && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.onerror=null; this.src='default-logo.svg'; this.style.opacity='0.5'; this.style.padding='40px'; this.parentElement.previousElementSibling.style.display='none'; }">
                </a>
            </div>
            <div class="doc-card-header">
                <h4>${formatTanggalIndo(row.tanggal)}</h4>
                <div style="display: flex; gap: 5px;">
                    <span class="doc-badge">${row.kelas}</span>
                    <span class="doc-badge" style="background: var(--primary-light); color: var(--primary-color);">${row.ruang || '-'}</span>
                </div>
            </div>
            <div class="doc-card-body">
                <p><strong>Mapel:</strong> <span class="truncate-text" title="${row.mapel}">${row.mapel || '-'}</span></p>
                <p><strong>Materi:</strong> <span class="truncate-text" title="${row.materi}">${row.materi || '-'}</span></p>
                <p><strong>Siswa Hadir:</strong> ${row.siswaHadir ? row.siswaHadir + ' Orang' : '-'}</p>
                
                <div class="doc-file" style="justify-content: flex-end; margin-top: 10px;">
                    <button class="doc-download-btn" onclick="downloadSingleFile('${downloadUrl}', '${row.tanggal}_${row.kelas}_${fileName}', ${fileId !== null})" title="Unduh Gambar Asli" style="${!fileId ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${!fileId ? 'disabled' : ''}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        docContainer.appendChild(card);
    });
}

function downloadSingleFile(url, fileName, hasValidId) {
    if (!url) return;

    if (!hasValidId) {
        showToast('Download tidak didukung untuk tipe file ini, silakan gunakan tombol "Cari Ke Drive"', 'warning');
        return;
    }

    // Pendekatan iframes untuk mencoba menginisiasi unduhan latar belakang agar halaman tidak berpindah
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 5000);
}

// Terkait Cetak Laporan dari Layar (Native Browser Print)
// Cepat, Instan, Bebas Bug 972 Halaman.
function cetakLaporanDariLayar() {
    const docsWithImages = filteredData.filter(row => row.dokumentasi && row.dokumentasi.trim() !== '');

    if (docsWithImages.length === 0) {
        showToast('Tidak ada data dokumentasi untuk dicetak.', 'warning');
        return;
    }

    // Memastikan seluruh kartu bisa dicetak tanpa batasan
    const allCards = document.querySelectorAll('.doc-card');
    allCards.forEach(card => card.classList.remove('hide-on-print'));

    showToast(`Membuka jendela cetak untuk ${docsWithImages.length} laporan dokumentasi...`, 'success');

    // Set delay tipis agar Toast notifikasi hilang atau browser siap
    setTimeout(() => {
        window.print();
    }, 500);
}


// Clear Table
function clearTable() {
    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable');
    const noDataMessage = document.getElementById('noDataMessage');

    tableBody.innerHTML = '';
    dataTable.style.display = 'none';
    noDataMessage.style.display = 'block';
    noDataMessage.querySelector('h3').textContent = 'Pilih Guru untuk Menampilkan Data';
    noDataMessage.querySelector('p').textContent = 'Silakan pilih guru dari dropdown di atas untuk melihat data pembelajaran';

    const docContainer = document.getElementById('docContainer');
    if (docContainer) docContainer.innerHTML = '';

    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';

    document.getElementById('exportPdfBtn').disabled = true;
    filteredData = [];

    // Hide Dashboard
    const dashboard = document.getElementById('statsDashboard');
    if (dashboard) dashboard.style.display = 'none';
}

// Handle Export PDF
function handleExportPDF() {
    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'error');
        return;
    }

    generatePDF(filteredData, currentTeacher);
}

// Show Loading - Dirombak jadi Skeleton
function showLoading() {
    // Mematikan Overlay bawaan
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';

    // Munculkan Tabel Kerangka (Tabel Skeleton)
    const tableBody = document.getElementById('tableBody');
    const dataTable = document.getElementById('dataTable');
    const noDataMessage = document.getElementById('noDataMessage');

    if (noDataMessage) noDataMessage.style.display = 'none';
    if (dataTable) dataTable.style.display = 'table';

    let skeletonRows = '';
    for (let i = 0; i < 6; i++) {
        skeletonRows += `<tr><td colspan="15"><div class="skeleton skeleton-text" style="width: 100%; height: 20px; margin: 0;"></div></td></tr>`;
    }
    if (tableBody) tableBody.innerHTML = skeletonRows;

    // Munculkan Kotak Kerangka (Grid Skeleton Foto)
    const docContainer = document.getElementById('docContainer');
    if (docContainer) {
        let skeletonCards = '';
        for (let i = 0; i < 6; i++) {
            skeletonCards += `
            <div class="skeleton-card">
                <div class="skeleton-box skeleton"></div>
                <div style="padding: 15px;">
                    <div class="skeleton skeleton-text" style="width: 60%"></div>
                    <div class="skeleton skeleton-text" style="width: 40%"></div>
                    <div class="skeleton skeleton-text" style="width: 80%; margin-top: 20px;"></div>
                </div>
            </div>`;
        }
        docContainer.innerHTML = skeletonCards;
    }

    // Sembunyikan Dasbor dan Aksi massal ketika memuat
    const dashboard = document.getElementById('statsDashboard');
    if (dashboard) dashboard.style.display = 'none';
    const docBulkActions = document.getElementById('docBulkActions');
    if (docBulkActions) docBulkActions.style.display = 'none';
}

// Hide Loading
function hideLoading() {
    // Tidak berbuat banyak, karena akan ketiban oleh rendering HTML asli di displayData() & displayDokumentasi()
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
