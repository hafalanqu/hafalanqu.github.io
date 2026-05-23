// js/hadir.js

window.populateBulanTahunFilters = function() {
    const bulanSelect = document.getElementById('hadir-filter-bulan');
    const tahunSelect = document.getElementById('hadir-filter-tahun');
    if (!bulanSelect || !tahunSelect) return;

    const bulanIni = new Date().getMonth(); 
    const tahunIni = new Date().getFullYear();

    bulanSelect.innerHTML = '';
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    namaBulan.forEach((nama, index) => {
        const option = new Option(nama, index); 
        bulanSelect.appendChild(option);
    });
    bulanSelect.value = bulanIni;

    tahunSelect.innerHTML = '';
    const yearsInHafalan = new Set(window.appState.allHafalan.map(h => new Date(h.timestamp).getFullYear()));
    yearsInHafalan.add(tahunIni); 

    Array.from(yearsInHafalan).sort((a,b) => b-a).forEach(tahun => {
        const option = new Option(tahun, tahun);
        tahunSelect.appendChild(option);
    });
    tahunSelect.value = tahunIni;
};

window.renderDaftarHadirRoster = function() {
    const container = document.getElementById('daftar-hadir-container');
    const filterKelasEl = document.getElementById('hadir-filter-kelas');
    const filterBulanEl = document.getElementById('hadir-filter-bulan');
    const filterTahunEl = document.getElementById('hadir-filter-tahun');

    if (!container || !filterKelasEl || !filterBulanEl || !filterTahunEl) return;

    let classId = filterKelasEl.value; 
    const month = parseInt(filterBulanEl.value, 10);
    const year = parseInt(filterTahunEl.value, 10);

    const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');
    if (role === 'siswa') {
        const currentUserUID = window.appState.currentUserUID || sessionStorage.getItem('currentUserUID');
        const currentStudent = window.appState.allStudents.find(s => s.userId === currentUserUID);
        if (currentStudent) {
            classId = currentStudent.classId; 
        }
    }

    if (!classId) {
        container.innerHTML = `<p class="text-center text-slate-500 py-4">
            ${role === 'siswa' ? 'Memuat data kelas...' : 'Pilih kelas untuk menampilkan data absensi.'}
        </p>`;
        return;
    }

    const studentsInClass = window.appState.allStudents
        .filter(s => s.classId === classId)
        .sort((a, b) => a.name.localeCompare(b.name));

    const hafalanInMonthForClass = window.appState.allHafalan.filter(h => {
        if (h.studentId && !studentsInClass.find(s => s.id === h.studentId)) {
            return false; 
        }
        const t = new Date(h.timestamp);
        return t.getMonth() === month && t.getFullYear() === year;
    });

    const attendanceMap = new Map(); 
    const uniqueDateTimestamps = new Set();

    hafalanInMonthForClass.forEach(h => {
        const d = new Date(h.timestamp);
        d.setHours(0, 0, 0, 0);
        const normalizedTimestamp = d.getTime();
        uniqueDateTimestamps.add(normalizedTimestamp);

        if (!attendanceMap.has(h.studentId)) {
            attendanceMap.set(h.studentId, new Set());
        }
        attendanceMap.get(h.studentId).add(normalizedTimestamp);
    });

    const sortedDates = Array.from(uniqueDateTimestamps).sort((a, b) => a - b);

    let tableHTML = '<table class="min-w-full border-collapse border border-slate-200 bg-white text-left text-sm" style="border-spacing: 0;">';
    const cellStyle = 'border: 1px solid #e2e8f0;'; 

    tableHTML += '<thead class="bg-slate-50">';
    tableHTML += '<tr>';
    tableHTML += `<th class="px-4 py-3 text-slate-500 font-bold sticky left-0 bg-slate-50 z-20" style="${cellStyle}">No</th>`;
    tableHTML += `<th class="px-4 py-3 text-slate-500 font-bold sticky left-10 bg-slate-50 z-20" style="min-width: 180px; ${cellStyle}">Nama Siswa</th>`;
    
    if (sortedDates.length === 0) {
        tableHTML += `<th class="px-4 py-3 text-center text-slate-400 font-semibold" style="${cellStyle}">Belum Ada Setoran Bulan Ini</th>`;
    } else {
        sortedDates.forEach(timestamp => {
            const tgl = new Date(timestamp).toLocaleDateString('id-ID', {
                day: '2-digit', month: '2-digit'
            });
            tableHTML += `<th class="w-20 px-2 py-3 text-center text-slate-500 font-bold" style="${cellStyle}">${tgl}</th>`;
        });
    }
    tableHTML += '</tr></thead>';

    tableHTML += '<tbody class="divide-y divide-slate-100">';
    if (studentsInClass.length === 0) {
        tableHTML += `<tr><td colspan="${sortedDates.length + 2}" class="text-center p-4 text-slate-400" style="${cellStyle}">Tidak ada siswa di kelas ini.</td></tr>`;
    } else {
        studentsInClass.forEach((student, index) => {
            tableHTML += '<tr class="hover:bg-slate-50 transition-colors">';
            tableHTML += `<td class="px-4 py-2.5 text-slate-500 sticky left-0 bg-white z-10" style="${cellStyle}">${index + 1}</td>`;
            tableHTML += `<td class="px-4 py-2.5 font-bold text-slate-700 sticky left-10 bg-white z-10" style="${cellStyle}">${student.name}</td>`;

            const presentDates = attendanceMap.get(student.id) || new Set();

            if (sortedDates.length === 0) {
                tableHTML += `<td class="px-4 py-2.5 text-center text-slate-300" style="${cellStyle}">-</td>`;
            } else {
                sortedDates.forEach(timestamp => {
                    let cellContent = '<span class="font-extrabold text-red-500 text-base">X</span>'; 
                    if (presentDates.has(timestamp)) {
                        cellContent = '<span class="font-extrabold text-teal-600 text-base">✔</span>'; 
                    }
                    tableHTML += `<td class="px-2 py-2.5 text-center" style="${cellStyle}">${cellContent}</td>`;
                });
            }
            tableHTML += '</tr>';
        });
    }
    tableHTML += '</tbody></table>';

    container.innerHTML = tableHTML;
};

document.addEventListener('DOMContentLoaded', () => {
    const filterKelas = document.getElementById('hadir-filter-kelas');
    const filterBulan = document.getElementById('hadir-filter-bulan');
    const filterTahun = document.getElementById('hadir-filter-tahun');

    if (filterKelas) {
        filterKelas.addEventListener('change', () => {
            window.renderDaftarHadirRoster();
        });
    }

    if (filterBulan) {
        filterBulan.addEventListener('change', () => {
            window.renderDaftarHadirRoster();
        });
    }

    if (filterTahun) {
        filterTahun.addEventListener('change', () => {
            window.renderDaftarHadirRoster();
        });
    }
});
