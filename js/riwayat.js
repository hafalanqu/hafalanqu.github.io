// js/riwayat.js

window.renderRiwayatList = function() {
    const listEl = document.getElementById('riwayat-list');
    if (!listEl) return;

    const ITEMS_PER_PAGE = 36;
    const filterClassEl = document.getElementById('riwayat-filter-class');
    const searchStudentEl = document.getElementById('riwayat-search-student');
    
    const filterClassId = filterClassEl ? filterClassEl.value : '';
    const searchTerm = searchStudentEl ? searchStudentEl.value.toLowerCase() : '';
    
    let filteredHafalan = [...window.appState.allHafalan];

    const studentMap = new Map(window.appState.allStudents.map(s => [s.id, s]));
    const classMap = new Map(window.appState.allClasses.map(c => [c.id, c.name]));
    const userMap = new Map(window.appState.allUsers.map(u => [u.id, u.namaLengkap || u.email]));
    const surahNameMap = new Map(window.surahList.map(s => [s.no, s.nama]));
    
    const kualitasDisplayMap = { 
        'sangat-lancar': 'Sangat Baik', 
        'lancar': 'Baik',
        'cukup-lancar': 'Cukup', 
        'tidak-lancar': 'Kurang',
        'sangat-tidak-lancar': 'Tidak Bisa'
    };

    if (filterClassId) {
        const studentIdsInClass = new Set(
            window.appState.allStudents
                .filter(s => s.classId === filterClassId)
                .map(s => s.id)
        );
        filteredHafalan = filteredHafalan.filter(h => studentIdsInClass.has(h.studentId));
    }

    if (searchTerm) {
        filteredHafalan = filteredHafalan.filter(h => {
            const student = studentMap.get(h.studentId);
            return student && student.name.toLowerCase().includes(searchTerm);
        });
    }

    filteredHafalan.sort((a, b) => b.timestamp - a.timestamp);

    const currentPage = window.appState.currentPageRiwayat;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedHafalan = filteredHafalan.slice(startIndex, endIndex);

    listEl.innerHTML = '';
    
    const fragment = document.createDocumentFragment();

    paginatedHafalan.forEach(entry => {
        const student = studentMap.get(entry.studentId);
        if (!student) return;

        const className = classMap.get(student.classId) || 'Tanpa Kelas';
        const surahName = surahNameMap.get(entry.surahNo) || `Surah ${entry.surahNo}`;
        const kualitasText = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
        
        const date = new Date(entry.timestamp).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        
        const guruName = entry.guruId ? userMap.get(entry.guruId) : null;
        const guruNameHTML = guruName ? `<span class="text-slate-400 mx-1">•</span><span class="text-slate-500 italic">${guruName}</span>` : '';

        let detailHafalanHTML = '';
        let jenisLabel = '';
        let jenisColor = '';

        if (entry.jenis === 'tes') {
            jenisLabel = 'Tes Hafalan';
            jenisColor = 'text-purple-600';

            const testTypeDisplayMap = {
                'continue-verse': 'Sambung Ayat Setelahnya',
                'previous-verse': 'Sambung Ayat Sebelumnya',
                'reorder-verses': 'Menyusun Ulang Ayat',
                'guess-surah': 'Menebak Surah'
            };
            const testTypeText = testTypeDisplayMap[entry.testType] || 'Ujian';

            detailHafalanHTML = `
                <span>${entry.catatan || 'Hasil Tes'}</span>
                <span class="text-slate-400 mx-1">•</span>
                <span>${testTypeText}</span>
            `;
        } else {
            jenisLabel = entry.jenis === 'ziyadah' ? 'Ziyadah' : 'Muraja\'ah';
            jenisColor = entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600';
            detailHafalanHTML = `
                <span>${surahName} ${entry.ayatDari}-${entry.ayatSampai}</span>
                <span class="text-slate-400 mx-1">•</span>
                <span>${kualitasText}</span>
            `;
        }

        const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');
        const deleteButtonHTML = role === 'guru'
            ? `<button data-action="delete-riwayat" data-id="${entry.id}" class="delete-riwayat-btn text-slate-400 hover:text-red-600 p-1.5 rounded-full mt-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>`
            : '';

        const item = document.createElement('div');
        item.className = 'riwayat-item flex items-start justify-between p-3.5 bg-white border border-slate-100 shadow-sm rounded-lg gap-4 mb-2.5';
        
        item.innerHTML = `
            <div class="flex-grow">
                <p class="font-bold text-slate-700">${student.name}</p>
                <p class="text-xs text-slate-500 font-medium">${className}</p>
                <div class="mt-2 text-sm text-slate-600">
                    <span class="font-bold ${jenisColor}">${jenisLabel}:</span>
                    ${detailHafalanHTML}
                    ${entry.jenis !== 'tes' ? guruNameHTML : ''} 
                </div>
            </div>
            <div class="text-right flex-shrink-0 flex flex-col items-end">
                <p class="text-xs text-slate-400 font-medium">${date}</p>
                ${deleteButtonHTML}
            </div>
        `;

        fragment.appendChild(item);
    });

    listEl.innerHTML = '';
    listEl.appendChild(fragment);
    window.renderRiwayatPagination(filteredHafalan.length);
};

window.renderRiwayatPagination = function(totalItems) {
    const paginationContainer = document.getElementById('riwayat-pagination-controls');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const ITEMS_PER_PAGE = 36;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    const currentPage = window.appState.currentPageRiwayat;

    const createButton = (text, page, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.disabled = isDisabled;
        button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
        if (!isDisabled && page) {
            button.onclick = () => {
                window.appState.currentPageRiwayat = page;
                window.renderRiwayatList();
                const listEl = document.getElementById('riwayat-list');
                if (listEl) listEl.scrollIntoView({ behavior: 'smooth' });
            };
        }
        return button;
    };
    
    const createEllipsis = () => {
        const span = document.createElement('span');
        span.textContent = '...';
        span.className = 'flex items-center justify-center px-2 py-1 text-slate-500 font-bold';
        return span;
    };

    paginationContainer.appendChild(createButton('‹', currentPage - 1, currentPage === 1));

    const pagesToShow = new Set();
    pagesToShow.add(1);
    pagesToShow.add(totalPages);
    if (currentPage > 2) pagesToShow.add(currentPage - 1);
    pagesToShow.add(currentPage);
    if (currentPage < totalPages - 1) pagesToShow.add(currentPage + 1);

    const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
    let lastPage = 0;

    for (const page of sortedPages) {
        if (page > lastPage + 1) {
            paginationContainer.appendChild(createEllipsis());
        }
        paginationContainer.appendChild(createButton(page, page, false, page === currentPage));
        lastPage = page;
    }

    paginationContainer.appendChild(createButton('›', currentPage + 1, currentPage === totalPages));
};

document.addEventListener('DOMContentLoaded', () => {
    const searchRiwayat = document.getElementById('riwayat-search-student');
    const filterClass = document.getElementById('riwayat-filter-class');

    if (searchRiwayat) {
        searchRiwayat.addEventListener('input', window.debounce(() => {
            window.appState.currentPageRiwayat = 1;
            window.renderRiwayatList();
        }, 150));
    }

    if (filterClass) {
        filterClass.addEventListener('change', () => {
            window.appState.currentPageRiwayat = 1;
            window.renderRiwayatList();
        });
    }

    // Bind riwayat delete button clicks
    const riwayatListEl = document.getElementById('riwayat-list');
    if (riwayatListEl) {
        riwayatListEl.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('[data-action="delete-riwayat"]');
            if (deleteBtn) {
                e.stopPropagation();
                const hafalanId = deleteBtn.dataset.id;
                if (!hafalanId) return;

                window.showConfirmModal({
                    title: "Hapus Riwayat?",
                    message: "Apakah Anda yakin ingin menghapus data setoran ini secara permanen?",
                    okText: "Ya, Hapus",
                    onConfirm: async () => {
                        try {
                            await window.db.collection('hafalan').doc(hafalanId).delete();
                            window.showToast("Riwayat setoran berhasil dihapus.", "success");
                        } catch (error) {
                            console.error("Gagal menghapus riwayat:", error);
                            window.showToast("Gagal menghapus data.", "error");
                        }
                    }
                });
            }
        });
    }

    // Inline history delete button clicks (on setoran page recent history list)
    const studentListEl = document.getElementById('student-list');
    if (studentListEl) {
        studentListEl.addEventListener('click', (e) => {
            const deleteRiwayatBtn = e.target.closest('[data-action="delete-inline-riwayat"]');
            if (deleteRiwayatBtn) {
                e.stopPropagation(); 
                const hafalanId = deleteRiwayatBtn.dataset.id;
                if (!hafalanId) return;

                window.showConfirmModal({
                    title: "Hapus Riwayat?",
                    message: "Apakah Anda yakin ingin menghapus data setoran ini secara permanen?",
                    okText: "Ya, Hapus",
                    onConfirm: async () => {
                        try {
                            await window.db.collection('hafalan').doc(hafalanId).delete();
                            window.showToast("Riwayat setoran berhasil dihapus.", "success");
                        } catch (error) {
                            console.error("Gagal menghapus riwayat:", error);
                            window.showToast("Gagal menghapus data.", "error");
                        }
                    }
                });
            }
        });
    }
});
