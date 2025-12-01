// PDF Generator using jsPDF

function generatePDF(data, teacherName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

    const settings = getSettings();
    const signatures = getSignatures();

    // Get teachers data to find NIP
    const teachers = JSON.parse(localStorage.getItem('teachers') || '[]');
    let teacherNIP = '';

    if (teacherName !== 'all') {
        const teacher = teachers.find(t => t.name === teacherName);
        if (teacher) {
            teacherNIP = teacher.nip;
        }
    }

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Add logo
    try {
        const logo = settings.logo;
        if (logo && !logo.includes('default-logo.svg')) {
            const format = logo.includes('data:image/png') ? 'PNG' :
                logo.includes('data:image/jpeg') ? 'JPEG' : 'PNG';
            doc.addImage(logo, format, margin, margin, 20, 20);
        }
    } catch (error) {
        console.log('Could not add logo to PDF', error);
    }

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REKAP DATA JURNAL MENGAJAR GURU', pageWidth / 2, margin + 8, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`TAHUN AJARAN ${settings.academicYear}`, pageWidth / 2, margin + 14, { align: 'center' });
    doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, margin + 20, { align: 'center' });

    // Teacher info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const teacherInfo = teacherName === 'all' ? 'Semua Guru' : teacherName;
    doc.text(`Guru: ${teacherInfo}`, margin, margin + 30);

    // Current date
    const currentDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    doc.text(`Tanggal Cetak: ${currentDate}`, pageWidth - margin, margin + 30, { align: 'right' });

    // Prepare table data
    const tableData = data.map((row, index) => [
        index + 1,
        row.tanggal,
        row.hari,
        row.jamKe,
        row.namaGuru,
        row.kelas,
        row.ruang,
        row.jumlahSiswa,
        row.mapel,
        row.materi,
        row.siswaHadir,
        row.siswaAlpha,
        row.siswaIzin,
        row.siswaSakit,
        row.siswaTidakHadir
    ]);

    // Table headers
    const headers = [
        'No',
        'Tanggal',
        'Hari',
        'Jam',
        'Nama Guru',
        'Kelas',
        'Rng',
        'Jml',
        'Mapel',
        'Materi',
        'H',
        'A',
        'I',
        'S',
        'TH'
    ];

    // Generate table
    doc.autoTable({
        head: [headers],
        body: tableData,
        startY: margin + 35,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 7,
            cellPadding: 1.5,
            overflow: 'linebreak',
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        headStyles: {
            fillColor: [102, 126, 234],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 8 },  // No
            1: { cellWidth: 16 }, // Tanggal (narrowed from 18)
            2: { cellWidth: 14 }, // Hari (widened from 12)
            3: { cellWidth: 10 }, // Jam
            4: { cellWidth: 35, halign: 'left' }, // Nama Guru
            5: { cellWidth: 12 }, // Kelas
            6: { cellWidth: 10 }, // Ruang
            7: { cellWidth: 10 }, // Jml Siswa
            8: { cellWidth: 25, halign: 'left' }, // Mapel
            9: { cellWidth: 40, halign: 'left' }, // Materi
            10: { cellWidth: 10 }, // Hadir
            11: { cellWidth: 25, halign: 'left' }, // Alpha
            12: { cellWidth: 25, halign: 'left' }, // Izin
            13: { cellWidth: 25, halign: 'left' }, // Sakit
            14: { cellWidth: 10, halign: 'center' } // Tidak Hadir
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250]
        },
        didDrawPage: function (data) {
            const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `${currentPage}`,
                pageWidth - margin - 5,
                pageHeight - 8,
                { align: 'right' }
            );
        }
    });

    // Get final Y position after table
    const finalY = doc.lastAutoTable.finalY;

    // Check if there's enough space for signatures
    let signatureY = finalY + 10;

    // If not enough space, add new page
    if (signatureY + 45 > pageHeight - margin) {
        doc.addPage();
        signatureY = margin + 10;
    }

    // Summary
    const totalRecords = data.length;
    const uniqueSubjects = [...new Set(data.map(row => row.mapel))].filter(s => s).join(', ');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    // Split the summary into two parts to handle long subject lists
    const summaryPrefix = `Total Data: ${totalRecords} | Mata Pelajaran: `;
    const maxWidth = pageWidth - (margin * 2);

    // Draw the prefix
    doc.text(summaryPrefix, margin, signatureY);

    // Calculate remaining width for subjects
    const prefixWidth = doc.getTextWidth(summaryPrefix);
    const subjectsMaxWidth = maxWidth - prefixWidth;

    // Split subjects text if too long
    const subjectsText = uniqueSubjects || '-';
    const subjectsLines = doc.splitTextToSize(subjectsText, subjectsMaxWidth);

    // Draw first line of subjects next to prefix
    if (subjectsLines.length > 0) {
        doc.text(subjectsLines[0], margin + prefixWidth, signatureY);
    }

    // Draw remaining lines below if any
    if (subjectsLines.length > 1) {
        for (let i = 1; i < subjectsLines.length; i++) {
            signatureY += 4; // Line height
            doc.text(subjectsLines[i], margin + prefixWidth, signatureY);
        }
    }

    signatureY += 8;

    // Signatures section
    const signatureWidth = 60;
    const signatureHeight = 25;
    const signatureSpacing = (pageWidth - 2 * margin - 3 * signatureWidth) / 2;

    // Calculate positions for 3 signatures
    const sig1X = margin;
    const sig2X = margin + signatureWidth + signatureSpacing;
    const sig3X = margin + 2 * (signatureWidth + signatureSpacing);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Kepala Sekolah
    doc.text('Mengetahui,', sig1X + signatureWidth / 2, signatureY, { align: 'center' });
    doc.text(`Kepala ${settings.schoolName}`, sig1X + signatureWidth / 2, signatureY + 4, { align: 'center' });

    if (signatures.principal) {
        try {
            doc.addImage(signatures.principal, 'PNG', sig1X + 10, signatureY + 6, 40, 18);
        } catch (error) {
            console.log('Could not add principal signature');
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.text(settings.principalName, sig1X + signatureWidth / 2, signatureY + signatureHeight + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.principalNIP || '-'}`, sig1X + signatureWidth / 2, signatureY + signatureHeight + 8, { align: 'center' });

    // Wakil Kurikulum
    doc.text('Wakil Kepala Sekolah', sig2X + signatureWidth / 2, signatureY, { align: 'center' });
    doc.text('Bidang Kurikulum', sig2X + signatureWidth / 2, signatureY + 4, { align: 'center' });

    if (signatures.curriculum) {
        try {
            doc.addImage(signatures.curriculum, 'PNG', sig2X + 10, signatureY + 6, 40, 18);
        } catch (error) {
            console.log('Could not add curriculum signature');
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.text(settings.curriculumName, sig2X + signatureWidth / 2, signatureY + signatureHeight + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.curriculumNIP || '-'}`, sig2X + signatureWidth / 2, signatureY + signatureHeight + 8, { align: 'center' });

    // Guru Mapel
    doc.text('Bumijawa, ' + currentDate, sig3X + signatureWidth / 2, signatureY, { align: 'center' });
    doc.text('Guru Mata Pelajaran', sig3X + signatureWidth / 2, signatureY + 4, { align: 'center' });

    if (signatures.teacher) {
        try {
            doc.addImage(signatures.teacher, 'PNG', sig3X + 10, signatureY + 6, 40, 18);
        } catch (error) {
            console.log('Could not add teacher signature');
        }
    }

    doc.setFont('helvetica', 'bold');
    const teacherNameForSignature = teacherName === 'all' ? '____________________' : teacherName;
    doc.text(teacherNameForSignature, sig3X + signatureWidth / 2, signatureY + signatureHeight + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    // Display NIP - show '-' if empty or less than 15 digits
    let nipDisplay;
    if (teacherName === 'all') {
        nipDisplay = 'NIP. ____________________';
    } else if (!teacherNIP || teacherNIP.length < 15) {
        nipDisplay = 'NIP. -';
    } else {
        nipDisplay = `NIP. ${teacherNIP}`;
    }
    doc.text(nipDisplay, sig3X + signatureWidth / 2, signatureY + signatureHeight + 8, { align: 'center' });

    // Generate filename
    const filename = `Rekap_Jurnal_Mengajar_${teacherInfo.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;

    // Save PDF
    doc.save(filename);

    showToast('PDF berhasil diunduh', 'success');
}
