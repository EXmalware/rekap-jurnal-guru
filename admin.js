// Admin Panel Functionality

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', () => {
    setupAdminEventListeners();
    loadAdminSettings();
    loadTeachersList();
});

// Setup Admin Event Listeners
function setupAdminEventListeners() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSchoolSettings);
    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);

    // Teachers
    document.getElementById('importTeachersBtn').addEventListener('click', importTeachersFromSheets);

    // Signatures
    document.getElementById('principalSignature').addEventListener('change', (e) => handleSignatureUpload(e, 'principal'));
    document.getElementById('curriculumSignature').addEventListener('change', (e) => handleSignatureUpload(e, 'curriculum'));
    document.getElementById('teacherSignature').addEventListener('change', (e) => handleSignatureUpload(e, 'teacher'));
    document.getElementById('saveSignaturesBtn').addEventListener('click', saveSignaturesData);

    // Delete Signatures
    document.getElementById('deletePrincipalSig').addEventListener('click', () => deleteSignature('principal'));
    document.getElementById('deleteCurriculumSig').addEventListener('click', () => deleteSignature('curriculum'));
    document.getElementById('deleteTeacherSig').addEventListener('click', () => deleteSignature('teacher'));
}

// Switch Tab
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Load Admin Settings
function loadAdminSettings() {
    const settings = getSettings();

    document.getElementById('schoolNameInput').value = settings.schoolName;
    document.getElementById('academicYearInput').value = settings.academicYear;
    document.getElementById('principalNameInput').value = settings.principalName;
    document.getElementById('principalNIPInput').value = settings.principalNIP || '';
    document.getElementById('curriculumNameInput').value = settings.curriculumName;
    document.getElementById('curriculumNIPInput').value = settings.curriculumNIP || '';

    // Load logo preview
    if (settings.logo && settings.logo !== 'default-logo.svg') {
        const preview = document.getElementById('logoPreview');
        preview.innerHTML = `<img src="${settings.logo}" alt="Logo Preview">`;
    }

    // Load signatures
    const signatures = getSignatures();
    if (signatures.principal) {
        document.getElementById('principalSigPreview').innerHTML = `<img src="${signatures.principal}" alt="Tanda Tangan Kepala Sekolah">`;
        document.getElementById('deletePrincipalSig').style.display = 'inline-block';
    }
    if (signatures.curriculum) {
        document.getElementById('curriculumSigPreview').innerHTML = `<img src="${signatures.curriculum}" alt="Tanda Tangan Kurikulum">`;
        document.getElementById('deleteCurriculumSig').style.display = 'inline-block';
    }
    if (signatures.teacher) {
        document.getElementById('teacherSigPreview').innerHTML = `<img src="${signatures.teacher}" alt="Tanda Tangan Guru">`;
        document.getElementById('deleteTeacherSig').style.display = 'inline-block';
    }
}

// Save School Settings
function saveSchoolSettings() {
    const settings = {
        schoolName: document.getElementById('schoolNameInput').value,
        academicYear: document.getElementById('academicYearInput').value,
        principalName: document.getElementById('principalNameInput').value,
        principalNIP: document.getElementById('principalNIPInput').value,
        curriculumName: document.getElementById('curriculumNameInput').value,
        curriculumNIP: document.getElementById('curriculumNIPInput').value,
        logo: document.getElementById('schoolLogo').src
    };

    saveSettings(settings);

    // Update UI
    document.getElementById('schoolName').textContent = settings.schoolName;
    document.getElementById('academicYear').textContent = `Tahun Pelajaran ${settings.academicYear}`;

    showToast('Pengaturan berhasil disimpan', 'success');
}

// Handle Logo Upload
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar', 'error');
        return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file maksimal 2MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const logoData = e.target.result;

        // Update preview
        const preview = document.getElementById('logoPreview');
        preview.innerHTML = `<img src="${logoData}" alt="Logo Preview">`;

        // Update main logo
        document.getElementById('schoolLogo').src = logoData;
    };
    reader.readAsDataURL(file);
}

// Import Teachers from Google Sheets
async function importTeachersFromSheets() {
    try {
        showLoading();
        await loadTeachers();
        loadTeachersList();
        showToast('Data guru berhasil diimport', 'success');
    } catch (error) {
        showToast('Gagal mengimport data guru', 'error');
    } finally {
        hideLoading();
    }
}

// Load Teachers List in Admin Panel
function loadTeachersList() {
    const container = document.getElementById('teachersList');

    if (allTeachers.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Belum ada data guru. Klik "Import dari Google Sheets" untuk memuat data.</p>';
        return;
    }

    container.innerHTML = '';

    allTeachers.forEach((teacher, index) => {
        const item = document.createElement('div');
        item.className = 'teacher-item';
        item.innerHTML = `
            <div class="teacher-info">
                <h4>${teacher.name}</h4>
                <p>NIP: ${teacher.nip} | ${teacher.subject} | ${teacher.status}</p>
            </div>
            <div class="teacher-actions">
                <button class="btn-icon" onclick="deleteTeacher(${index})" title="Hapus">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Delete Teacher
function deleteTeacher(index) {
    if (!confirm('Apakah Anda yakin ingin menghapus guru ini?')) {
        return;
    }

    allTeachers.splice(index, 1);

    // Save to localStorage
    localStorage.setItem('teachers', JSON.stringify(allTeachers));

    // Update UI
    populateTeacherDropdown();
    loadTeachersList();

    showToast('Guru berhasil dihapus', 'success');
}

// Handle Signature Upload
function handleSignatureUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar', 'error');
        return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
        showToast('Ukuran file maksimal 1MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const signatureData = e.target.result;

        // Update preview
        const previewId = `${type}SigPreview`;
        const preview = document.getElementById(previewId);
        preview.innerHTML = `<img src="${signatureData}" alt="Tanda Tangan">`;

        // Store temporarily (will be saved when user clicks save button)
        preview.dataset.signature = signatureData;

        // Show delete button
        const deleteBtnId = type === 'principal' ? 'deletePrincipalSig' :
            type === 'curriculum' ? 'deleteCurriculumSig' : 'deleteTeacherSig';
        document.getElementById(deleteBtnId).style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

// Save Signatures Data
function saveSignaturesData() {
    const signatures = getSignatures();

    // Get data from previews
    const principalPreview = document.getElementById('principalSigPreview');
    const curriculumPreview = document.getElementById('curriculumSigPreview');
    const teacherPreview = document.getElementById('teacherSigPreview');

    if (principalPreview.dataset.signature) {
        signatures.principal = principalPreview.dataset.signature;
    }
    if (curriculumPreview.dataset.signature) {
        signatures.curriculum = curriculumPreview.dataset.signature;
    }
    if (teacherPreview.dataset.signature) {
        signatures.teacher = teacherPreview.dataset.signature;
    }

    saveSignatures(signatures);

    showToast('Tanda tangan berhasil disimpan', 'success');
}

// Delete Signature
function deleteSignature(type) {
    if (!confirm('Apakah Anda yakin ingin menghapus tanda tangan ini?')) return;

    const signatures = getSignatures();
    signatures[type] = null;
    saveSignatures(signatures);

    // Update UI
    const previewId = type === 'principal' ? 'principalSigPreview' :
        type === 'curriculum' ? 'curriculumSigPreview' : 'teacherSigPreview';
    const deleteBtnId = type === 'principal' ? 'deletePrincipalSig' :
        type === 'curriculum' ? 'deleteCurriculumSig' : 'deleteTeacherSig';
    const inputId = type === 'principal' ? 'principalSignature' :
        type === 'curriculum' ? 'curriculumSignature' : 'teacherSignature';

    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    delete preview.dataset.signature;

    document.getElementById(deleteBtnId).style.display = 'none';
    document.getElementById(inputId).value = '';

    showToast('Tanda tangan berhasil dihapus', 'success');
}
