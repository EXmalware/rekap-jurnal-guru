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

    // Date filters
    document.getElementById('dateFrom').addEventListener('change', () => applyFilters());
    document.getElementById('dateTo').addEventListener('change', () => applyFilters());

    // Export PDF
    document.getElementById('exportPdfBtn').addEventListener('click', handleExportPDF);

    // Toggle view with password
    document.getElementById('toggleViewBtn').addEventListener('click', handleToggleView);
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

// Handle Teacher Filter Change
async function handleTeacherFilter(event) {
    const selectedTeacher = event.target.value;

    if (!selectedTeacher) {
        clearTable();
        return;
    }

    currentTeacher = selectedTeacher;
    await loadData(selectedTeacher);
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

        allData = rows.slice(1).map(row => ({
            tanggal: row[0] || '',
            hari: row[1] || '',
            jamKe: row[2] || '',
            namaGuru: row[3] || '',
            kelas: row[4] || '',
            ruang: row[5] || '',
            jumlahSiswa: row[6] || '',
            mapel: row[7] || '',
            materi: row[8] || '',
            siswaHadir: row[9] || '',
            siswaAlpha: row[10] || '',
            siswaIzin: row[11] || '',
            siswaSakit: row[12] || '',
            siswaTidakHadir: row[13] || ''
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
        return;
    }

    dataTable.style.display = 'table';
    noDataMessage.style.display = 'none';

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

    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';

    document.getElementById('exportPdfBtn').disabled = true;
    filteredData = [];
}

// Handle Export PDF
function handleExportPDF() {
    if (filteredData.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'error');
        return;
    }

    generatePDF(filteredData, currentTeacher);
}

// Show Loading
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

// Hide Loading
function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
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
