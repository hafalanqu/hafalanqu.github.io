// js/hafalan.js

window.quranCache = {};

window.getQuranScope = function() {
    return window.appState.pengaturan.lingkupHafalan || 'full';
};

window.isToday = function(timestamp) {
    const today = new Date();
    const someDate = new Date(timestamp);
    return someDate.getDate() === today.getDate() &&
           someDate.getMonth() === today.getMonth() &&
           someDate.getFullYear() === today.getFullYear();
};

window.populateAyatDropdowns = async function(surahElement, ayatDariSelect, ayatSampaiSelect) {
    if (!surahElement || !ayatDariSelect || !ayatSampaiSelect) return;
    
    const selectedOption = surahElement.options[surahElement.selectedIndex];
    if (!selectedOption) return;
    
    const surahNo = selectedOption.value;
    const maxAyat = parseInt(selectedOption.dataset.maxAyat);

    ayatDariSelect.innerHTML = '<option>Memuat...</option>';
    ayatSampaiSelect.innerHTML = '<option>Memuat...</option>';
    ayatDariSelect.disabled = true;
    ayatSampaiSelect.disabled = true;

    try {
        let verses = window.quranCache[surahNo];
        if (!verses) {
            const response = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNo}?fields=text_uthmani&per_page=300`);
            if (!response.ok) throw new Error('Gagal memuat.');
            const data = await response.json();
            verses = data.verses;
            window.quranCache[surahNo] = verses;
        }

        ayatDariSelect.innerHTML = '';
        ayatSampaiSelect.innerHTML = '';

        if (!verses || verses.length === 0) throw new Error('Data kosong.');

        verses.forEach((verse, index) => {
            const ayatNumber = index + 1;
            const textPreview = verse.text_uthmani.split(' ').slice(0, 4).join(' ');
            
            const simpleText = ayatNumber.toString();
            const fullText = `${ayatNumber} - ${textPreview}`;
            
            const option = new Option(simpleText, ayatNumber);
            option.dataset.simpleText = simpleText;
            option.dataset.fullText = fullText;
            
            ayatDariSelect.appendChild(option.cloneNode(true));
            ayatSampaiSelect.appendChild(option.cloneNode(true));
        });

    } catch (error) {
        console.error("Gagal mengambil teks ayat:", error);
        ayatDariSelect.innerHTML = '';
        ayatSampaiSelect.innerHTML = '';
        for (let i = 1; i <= maxAyat; i++) {
            const option = new Option(i, i);
            ayatDariSelect.appendChild(option.cloneNode(true));
            ayatSampaiSelect.appendChild(option.cloneNode(true));
        }
        window.showToast("Gagal memuat teks ayat, menampilkan nomor saja.", "error");
    } finally {
        ayatDariSelect.disabled = false;
        ayatSampaiSelect.disabled = false;
    }
};

window.updateAyatDropdownText = function(selectElement, mode) {
    if (!selectElement) return;
    for (const option of selectElement.options) {
        if (mode === 'full') {
            option.textContent = option.dataset.fullText || option.value;
        } else {
            option.textContent = option.dataset.simpleText || option.value;
        }
    }
};

// Render student list for setoran input page
window.renderStudentList = async function() {
    const studentListEl = document.getElementById('student-list');
    if (!studentListEl) return;

    const openFormsState = new Map();
    const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');

    if (role !== 'siswa') {
        studentListEl.querySelectorAll('.student-item').forEach(item => {
            const formContainer = item.querySelector('.hafalan-form-container');
            if (formContainer && !formContainer.classList.contains('hidden')) {
                const studentId = item.dataset.studentId;
                const form = item.querySelector('form');
                const isJuzAmma = window.getQuranScope() === 'juz30';
                const surahSampaiSelect = form.querySelector('.surah-sampai-select'); 

                const state = {
                    surah: form.surah.value,
                    kualitas: form.kualitas.value,
                    ayatDari: !isJuzAmma ? form.ayatDari?.value : null,
                    ayatSampai: !isJuzAmma ? form.ayatSampai?.value : null,
                    surahSampai: (isJuzAmma && surahSampaiSelect) ? surahSampaiSelect.value : null
                };
                openFormsState.set(studentId, state);
            }
        });
    }

    const SISWA_PER_PAGE = 36;
    let paginatedStudents = [];
    let totalFilteredStudents = 0;

    if (role === 'siswa') {
        const currentUserUID = window.appState.currentUserUID || sessionStorage.getItem('currentUserUID');
        const student = window.appState.allStudents.find(s => s.userId === currentUserUID);
        
        if (student) {
            paginatedStudents = [student];
        }
        totalFilteredStudents = paginatedStudents.length;
        
        const paginationContainer = document.getElementById('student-pagination-controls');
        if (paginationContainer) paginationContainer.innerHTML = '';
    } else {
        const openStudentIds = new Set();
        studentListEl.querySelectorAll('.student-item').forEach(item => {
            const form = item.querySelector('.hafalan-form-container');
            if (form && !form.classList.contains('hidden')) {
                openStudentIds.add(item.dataset.studentId);
            }
        });
        if (window.appState.lastSubmittedStudentId) {
            openStudentIds.add(window.appState.lastSubmittedStudentId);
            window.appState.lastSubmittedStudentId = null;
        }

        const filterClassEl = document.getElementById('student-filter-class');
        const filterId = filterClassEl ? filterClassEl.value : '';
        const searchInputEl = document.getElementById('siswa-search-student');
        const searchTerm = searchInputEl ? searchInputEl.value.toLowerCase() : '';

        let filteredStudents = filterId ? window.appState.allStudents.filter(s => s.classId === filterId) : [...window.appState.allStudents];
        if (searchTerm) {
            filteredStudents = filteredStudents.filter(s => s.name.toLowerCase().includes(searchTerm));
        }
        filteredStudents.sort((a, b) => a.name.localeCompare(b.name));

        totalFilteredStudents = filteredStudents.length;
        
        const currentPage = window.appState.currentPageSiswa;
        const startIndex = (currentPage - 1) * SISWA_PER_PAGE;
        const endIndex = startIndex + SISWA_PER_PAGE;
        paginatedStudents = filteredStudents.slice(startIndex, endIndex);
    }
    
    studentListEl.innerHTML = '';
    
    const quranScope = window.getQuranScope();
    const isJuzAmma = quranScope === 'juz30';
    let surahsForForm;
    const pilihanSurahNumbers = [18, 36, 55, 56, 67];

    if (quranScope === 'juz30') { 
        surahsForForm = window.surahList.filter(s => s.no >= 78); 
    } else if (quranScope === 'pilihan') { 
        surahsForForm = window.surahList.filter(s => pilihanSurahNumbers.includes(s.no)); 
    } else { 
        surahsForForm = window.surahList; 
    }

    const surahOptionsHTML = surahsForForm.map(s => `<option value="${s.no}" data-max-ayat="${s.ayat}">${s.no}. ${s.nama}</option>`).join('');

    const ayatInputsHTML = isJuzAmma 
        ? `<div>
            <label class="block text-sm font-medium mb-1">Sampai Surah</label>
            <select name="surahSampai" class="form-select surah-sampai-select" required>${surahOptionsHTML}</select>
        </div>`
        : `<div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium mb-1">Dari Ayat</label><select name="ayatDari" class="form-select ayat-dari-select" required></select></div>
            <div><label class="block text-sm font-medium mb-1">Sampai Ayat</label><select name="ayatSampai" class="form-select ayat-sampai-select" required></select></div>
        </div>`;
    
    const kualitasInputsHTML = `
    <div>
        <label class="block text-sm font-medium mb-1">Kualitas Hafalan</label>
        <select name="kualitas" class="form-select">
            <option value="sangat-lancar" selected>Sangat Baik</option>
            <option value="lancar">Baik</option>
            <option value="cukup-lancar">Cukup</option>
            <option value="tidak-lancar">Kurang</option>
            <option value="sangat-tidak-lancar">Tidak Bisa</option>
        </select>
    </div>
    `;

    const pinInputHTML = (role === 'siswa')
        ? `
        <div>
            <label class="block text-sm font-medium mb-1">PIN Guru</label>
            <div class="relative">
                <input type="password" name="pin" class="form-input pr-10" placeholder="Masukkan 6 Digit" required pattern="\\d{6}" maxlength="6" autocomplete="one-time-code">
                <button type="button" class="toggle-pin-btn absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none">
                    <svg class="eye-icon h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg class="eye-off-icon h-5 w-5 hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                </button>
            </div>
        </div>
        `
        : '';

    if (paginatedStudents.length === 0) {
        let message = '';
        if (role === 'siswa') {
            message = `<p class="text-center text-sm text-slate-400 p-4">Profil siswa Anda tidak ditemukan atau belum ditautkan.</p>`;
        } else {
            message = totalFilteredStudents > 0 ? `<p class="text-center text-sm text-slate-400 p-4">Tidak ada siswa di halaman ini.</p>` : `<p class="text-center text-sm text-slate-400 p-4">Tidak ada siswa di kelas ini.</p>`;
        }
        studentListEl.innerHTML = message;
        
        if (role !== 'siswa') {
            window.renderSiswaPagination(totalFilteredStudents);
        }
        return;
    }

    const pad = (num) => num.toString().padStart(2, '0');
    const getLocalISOString = (date) => {
        const y = date.getFullYear();
        const M = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const h = pad(date.getHours());
        const m = pad(date.getMinutes());
        const s = pad(date.getSeconds());
        return `${y}-${M}-${d}T${h}:${m}:${s}`;
    };

    for (const student of paginatedStudents) {
        const studentHafalan = window.appState.allHafalan.filter(h => h.studentId === student.id);
        const hasSubmitted = studentHafalan.some(h => window.isToday(h.timestamp) && h.jenis !== 'tes');
        
        const item = document.createElement('div');
        item.className = 'student-item bg-white shadow-sm border border-slate-100 rounded-lg p-3 space-y-3';
        item.dataset.studentId = student.id;
        
        const defaultTimestamp = getLocalISOString(new Date());
        const uniqueToggleId = `toggle-live-${student.id}`; 

        const dateTimeInputHTML = `
        <div>
            <div class="flex justify-between items-center mb-1">
                <label class="block text-sm font-medium text-slate-600">Tanggal & Waktu Setoran</label>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-400">Live Waktu</span>
                    <div class="relative">
                        <input type="checkbox" id="${uniqueToggleId}" class="toggle-checkbox live-clock-toggle" checked>
                        <label for="${uniqueToggleId}" class="toggle-label">
                            <span class="toggle-circle"></span>
                        </label>
                    </div>
                </div>
            </div>
            <input type="datetime-local" name="hafalan-timestamp" class="form-input live-timestamp-input text-slate-600" value="${defaultTimestamp}" required step="1">
        </div>
        `;
        
        const deleteButtonHTML = (role !== 'siswa')
            ? `<button data-action="delete-student" class="delete-student-btn text-slate-400 hover:text-red-600 p-1.5 rounded-full flex-shrink-0 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>`
            : '';

        const recentHafalan = studentHafalan
            .filter(entry => entry.jenis !== 'tes')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);
        
        const kualitasDisplayMap = { 
            'sangat-lancar': 'Sangat Baik', 
            'lancar': 'Baik',
            'cukup-lancar': 'Cukup', 
            'tidak-lancar': 'Kurang',
            'sangat-tidak-lancar': 'Tidak Bisa'
        };
        
        let historyHTML = '';
        if (recentHafalan.length > 0) {
            historyHTML = recentHafalan.map(entry => {
                const surahInfo = window.surahList.find(s => s.no == entry.surahNo);
                const surahName = surahInfo ? surahInfo.nama : `Surah ${entry.surahNo}`;
                const date = new Date(entry.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short'});
                const jenisLabel = entry.jenis.charAt(0).toUpperCase() + entry.jenis.slice(1);
                const kualitasText = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
                const jenisColor = entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600';
                
                const historyDeleteBtn = (role !== 'siswa')
                    ? `<button data-action="delete-inline-riwayat" data-id="${entry.id}" class="delete-inline-riwayat-btn text-slate-300 hover:text-red-600 p-0.5 rounded transition-colors ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>`
                    : '';
                return `
                    <div class="text-xs text-slate-500 flex justify-between items-center bg-slate-50 border border-slate-100 p-2 rounded group">
                        <div class="flex-grow">
                            <span class="font-bold ${jenisColor}">${jenisLabel}:</span>
                            <span class="font-semibold text-slate-700">${surahName} ${entry.ayatDari}-${entry.ayatSampai}</span>
                            <span class="italic">(${kualitasText})</span>
                        </div>
                        <div class="flex items-center flex-shrink-0">
                            <span class="font-medium">${date}</span>
                            ${historyDeleteBtn}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            historyHTML = '<p class="text-xs text-slate-400 text-center py-2">Belum ada riwayat setoran.</p>';
        }

        item.innerHTML = `
            <div class="student-header flex items-center justify-between p-1 cursor-pointer hover:bg-slate-50 rounded transition-colors ${role === 'siswa' ? 'hidden' : ''}">
                <div class="flex items-center flex-grow">
                    <span class="font-bold text-slate-700 text-base">${student.name}</span>
                    <span class="ml-2.5 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full ${hasSubmitted ? '' : 'hidden'}">Sudah Setor Hari Ini</span>
                </div>
                ${deleteButtonHTML}
            </div>
            <div class="hafalan-form-container ${role === 'siswa' ? '' : 'hidden border-t border-slate-100 pt-3'}">
                <form class="hafalan-form space-y-3">
                    <input type="hidden" name="studentId" value="${student.id}">
                    ${dateTimeInputHTML} 
                    <div class="${isJuzAmma ? 'grid grid-cols-2 gap-4' : ''}">
                        <div>
                            <label class="block text-sm font-medium text-slate-600 mb-1">${isJuzAmma ? 'Dari Surah' : 'Surah'}</label>
                            <select name="surah" class="form-select surah-select" required>${surahOptionsHTML}</select>
                        </div>
                        ${isJuzAmma ? ayatInputsHTML : ''}
                    </div>
                    ${!isJuzAmma ? ayatInputsHTML : ''}
                    ${kualitasInputsHTML} 
                    ${pinInputHTML}
                    <button type="submit" class="btn btn-primary w-full shadow-sm py-2">Simpan Setoran Hafalan</button>
                </form>
                <div class="mt-4 pt-3 border-t border-slate-100">
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Riwayat Setoran Terbaru</h4>
                    <div class="student-history-list space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        ${historyHTML}
                    </div>
                </div>
            </div>
        `;
        studentListEl.appendChild(item);

        const actualHafalanEntries = studentHafalan.filter(h => h.jenis !== 'tes');
        let lastEntry = null;
        if (actualHafalanEntries.length > 0) { 
            lastEntry = actualHafalanEntries.sort((a, b) => b.timestamp - a.timestamp)[0]; 
        }

        const form = item.querySelector('.hafalan-form');
        const surahSelect = form.querySelector('.surah-select');
        const ayatDariSelect = form.querySelector('.ayat-dari-select');
        const ayatSampaiSelect = form.querySelector('.ayat-sampai-select');
        
        const setKualitasDropdown = (kualitasValue) => {
            const kualitasSelect = form.querySelector('select[name="kualitas"]');
            if (kualitasSelect) {
                kualitasSelect.value = kualitasValue;
            }
        };

        const previouslyOpenState = openFormsState.get(student.id);

        if (previouslyOpenState) {
            setKualitasDropdown(previouslyOpenState.kualitas);
            surahSelect.value = previouslyOpenState.surah;
            if (!isJuzAmma && ayatDariSelect && ayatSampaiSelect) {
                await window.populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                ayatDariSelect.value = previouslyOpenState.ayatDari;
                ayatSampaiSelect.value = previouslyOpenState.ayatSampai;
            } else if (isJuzAmma) {
                const surahSampaiSelect = form.querySelector('.surah-sampai-select');
                if (surahSampaiSelect) {
                    surahSampaiSelect.value = previouslyOpenState.surahSampai;
                }
            }
        } else if (lastEntry) {
            setKualitasDropdown(lastEntry.kualitas);
            surahSelect.value = lastEntry.surahNo;
            if (ayatDariSelect && ayatSampaiSelect) {
                await window.populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                ayatDariSelect.value = lastEntry.ayatDari;
                ayatSampaiSelect.value = lastEntry.ayatSampai;
            }
        } else {
            if (!isJuzAmma) {
                window.populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
            }
        }
    }

    if (role !== 'siswa') {
        window.renderSiswaPagination(totalFilteredStudents);

        openFormsState.forEach((state, studentId) => {
            const studentItem = studentListEl.querySelector(`.student-item[data-student-id="${studentId}"]`);
            if (studentItem) {
                const formContainer = studentItem.querySelector('.hafalan-form-container');
                if (formContainer) {
                    formContainer.classList.remove('hidden');
                }
            }
        });
    }
};

// Render Pagination for setoran page student card listing
window.renderSiswaPagination = function(totalStudents) {
    const paginationContainer = document.getElementById('student-pagination-controls');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const SISWA_PER_PAGE = 36;
    const totalPages = Math.ceil(totalStudents / SISWA_PER_PAGE);

    if (totalPages <= 1) return;

    const currentPage = window.appState.currentPageSiswa;

    const createButton = (text, page, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.disabled = isDisabled;
        button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
        if (!isDisabled && page) {
            button.onclick = () => {
                window.appState.currentPageSiswa = page;
                window.renderStudentList();
                const listEl = document.getElementById('student-list');
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

// Populates mass/bulk setoran surah elements
window.populateBulkHafalanSurah = function() {
    const quranScope = window.getQuranScope();
    const surahSelectLabel = document.querySelector('label[for="bulk-surah-select"]');
    const ayatContainer = document.getElementById('bulk-ayat-inputs-container');
    const surahSampaiContainer = document.getElementById('bulk-surah-sampai-container');
    const surahSampaiSelect = document.getElementById('bulk-surah-sampai-select');
    
    const bulkSurahSelect = document.getElementById('bulk-surah-select');
    const bulkAyatDariSelect = document.getElementById('bulk-ayat-dari-select');
    const bulkAyatSampaiSelect = document.getElementById('bulk-ayat-sampai-select');

    let surahsForForm;
    const pilihanSurahNumbers = [18, 36, 55, 56, 67];

    if (quranScope === 'juz30') {
        surahsForForm = window.surahList.filter(s => s.no >= 78);
        if (ayatContainer) ayatContainer.classList.add('hidden');
        if (surahSampaiContainer) surahSampaiContainer.classList.remove('hidden');
        if (surahSampaiSelect) surahSampaiSelect.required = true;
        if (bulkAyatDariSelect) bulkAyatDariSelect.required = false;
        if (bulkAyatSampaiSelect) bulkAyatSampaiSelect.required = false;
        
        if (surahSelectLabel) surahSelectLabel.textContent = 'Dari Surah';

        const surahOptionsHTML_Juz30 = surahsForForm.map(s => `<option value="${s.no}" data-max-ayat="${s.ayat}">${s.no}. ${s.nama}</option>`).join('');
        if (bulkSurahSelect) bulkSurahSelect.innerHTML = surahOptionsHTML_Juz30;
        if (surahSampaiSelect) surahSampaiSelect.innerHTML = surahOptionsHTML_Juz30;

    } else {
        if (quranScope === 'pilihan') {
            surahsForForm = window.surahList.filter(s => pilihanSurahNumbers.includes(s.no));
        } else {
            surahsForForm = window.surahList;
        }
        
        if (ayatContainer) ayatContainer.classList.remove('hidden');
        if (surahSampaiContainer) surahSampaiContainer.classList.add('hidden');
        if (surahSampaiSelect) surahSampaiSelect.required = false;
        if (bulkAyatDariSelect) bulkAyatDariSelect.required = true;
        if (bulkAyatSampaiSelect) bulkAyatSampaiSelect.required = true;

        if (surahSelectLabel) surahSelectLabel.textContent = 'Surah';

        const surahOptionsHTML_Full = surahsForForm.map(s => `<option value="${s.no}" data-max-ayat="${s.ayat}">${s.no}. ${s.nama}</option>`).join('');
        if (bulkSurahSelect) bulkSurahSelect.innerHTML = surahOptionsHTML_Full;
        
        if (bulkSurahSelect && bulkAyatDariSelect && bulkAyatSampaiSelect) {
            window.populateAyatDropdowns(bulkSurahSelect, bulkAyatDariSelect, bulkAyatSampaiSelect);
        }
    }
};

// Renders the tags of selected students and their latest history inside bulk setoran modal
window.renderSelectedStudentsForBulkHafalan = function() {
    const tagList = document.getElementById('bulk-selected-students-list');
    const historyContainer = document.getElementById('bulk-history-container');
    const historyList = document.getElementById('bulk-selected-students-history-list');
    
    if (!tagList || !historyContainer || !historyList) return;

    tagList.innerHTML = '';
    historyList.innerHTML = '';
    
    const selectedIds = window.appState.bulkHafalanStudentIds;

    if (selectedIds.length === 0) {
        historyContainer.classList.add('hidden');
        return;
    }

    const surahNameMap = new Map(window.surahList.map(s => [s.no, s.nama]));
    const kualitasDisplayMap = { 
        'sangat-lancar': 'Sangat Baik', 
        'lancar': 'Baik',
        'cukup-lancar': 'Cukup', 
        'tidak-lancar': 'Kurang',
        'sangat-tidak-lancar': 'Tidak Bisa'
    };

    let combinedHistoryEntries = [];

    selectedIds.forEach(studentId => {
        const student = window.appState.allStudents.find(s => s.id === studentId);
        if (student) {
            const tag = document.createElement('div');
            tag.className = 'inline-flex items-center gap-1.5 bg-teal-50 border border-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full';
            tag.innerHTML = `
                <span>${student.name}</span>
                <button type="button" data-action="remove-student-bulk" data-id="${student.id}" class="text-teal-500 hover:text-teal-700 font-bold ml-1 text-sm leading-none">&times;</button>
            `;
            tagList.appendChild(tag);

            const studentHistory = window.appState.allHafalan
                .filter(h => h.studentId === studentId && (h.jenis === 'ziyadah' || h.jenis === 'murajaah'))
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 2)
                .map(entry => ({ ...entry, studentName: student.name })); 
            
            combinedHistoryEntries.push(...studentHistory);
        }
    });

    combinedHistoryEntries.sort((a, b) => b.timestamp - a.timestamp);

    if (combinedHistoryEntries.length > 0) {
        combinedHistoryEntries.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short'});
            const surahName = surahNameMap.get(entry.surahNo) || `Surah ${entry.surahNo}`;
            const kualitasText = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
            const jenisLabel = entry.jenis === 'ziyadah' ? 'Ziyadah' : 'Muraja\'ah';
            const jenisColor = entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600';

            const item = document.createElement('div');
            item.className = 'text-xs text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded';
            
            item.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-slate-700">${entry.studentName}</span>
                    <span class="font-medium">${date}</span>
                </div>
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-bold ${jenisColor}">${jenisLabel}:</span>
                        <span class="font-semibold text-slate-600">${surahName} ${entry.ayatDari}-${entry.ayatSampai}</span>
                        <span class="italic">(${kualitasText})</span>
                    </div>
                </div>
            `;
            historyList.appendChild(item);
        });
        historyContainer.classList.remove('hidden');
    } else {
        historyList.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">Belum ada riwayat setoran untuk siswa yang dipilih.</p>`;
        historyContainer.classList.remove('hidden');
    }
};

window.searchStudentsForBulkHafalan = function() {
    const searchInput = document.getElementById('bulk-student-search-input');
    const resultsContainer = document.getElementById('bulk-student-search-results');
    if (!searchInput || !resultsContainer) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    resultsContainer.innerHTML = '';

    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }

    const selectedIds = window.appState.bulkHafalanStudentIds;
    const matchingStudents = window.appState.allStudents
        .filter(s => 
            !selectedIds.includes(s.id) && 
            s.name.toLowerCase().includes(searchTerm)
        )
        .slice(0, 10); 

    if (matchingStudents.length > 0) {
        matchingStudents.forEach(student => {
            const studentClass = window.appState.allClasses.find(c => c.id === student.classId);
            const item = document.createElement('div');
            item.className = 'p-2.5 hover:bg-slate-50 border-b border-slate-100 cursor-pointer';
            item.innerHTML = `<p class="font-bold text-slate-700 text-sm">${student.name}</p><p class="text-xs text-slate-500">${studentClass ? studentClass.name : 'Tanpa Kelas'}</p>`;
            item.dataset.studentId = student.id;
            resultsContainer.appendChild(item);
        });
        resultsContainer.classList.remove('hidden');
    } else {
        resultsContainer.classList.add('hidden');
    }
};

window.addStudentToBulkHafalan = function(studentId) {
    const { bulkHafalanStudentIds } = window.appState;
    if (!bulkHafalanStudentIds.includes(studentId)) {
        bulkHafalanStudentIds.push(studentId);
        window.renderSelectedStudentsForBulkHafalan();
    }
    const searchInput = document.getElementById('bulk-student-search-input');
    const resultsContainer = document.getElementById('bulk-student-search-results');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.classList.add('hidden');
};

window.removeStudentFromBulkHafalan = function(studentId) {
    window.appState.bulkHafalanStudentIds = window.appState.bulkHafalanStudentIds.filter(id => id !== studentId);
    window.renderSelectedStudentsForBulkHafalan();
};

window.downloadTemplate = function() {
    const templateData = [
        { No: 1, Nama: "NAMA SISWA CONTOH 1", Kelas: "NAMA KELAS" },
        { No: 2, Nama: "NAMA SISWA CONTOH 2", Kelas: "NAMA KELAS" },
        { No: 3, Nama: "NAMA SISWA CONTOH 3", Kelas: "NAMA KELAS" },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "template_import_siswa.xlsx");
};

window.handleImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.disabled = true;
        importBtn.textContent = 'Memproses...';
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData.length || !jsonData[0].hasOwnProperty('Nama') || !jsonData[0].hasOwnProperty('Kelas')) {
                window.showToast("Format template tidak sesuai. Pastikan ada kolom 'Nama' dan 'Kelas'.", "error");
                if (importBtn) {
                    importBtn.disabled = false;
                    importBtn.textContent = 'Impor';
                }
                return;
            }

            const batches = [];
            let currentBatch = window.db.batch();
            batches.push(currentBatch);
            let operationCount = 0;

            let newStudentsCount = 0;
            let newClassesCount = 0;
            let migratedCount = 0; 
            let skippedCount = 0; 
            let ambiguousCount = 0; 

            const classMap = new Map(window.appState.allClasses.map(c => [c.name.toLowerCase().trim(), c.id]));

            const studentMapByName = new Map();
            const ambiguousNames = new Set();

            for (const student of window.appState.allStudents) {
                const studentKey = (student.name || '').toLowerCase().trim();
                if (!studentKey) continue;

                if (studentMapByName.has(studentKey)) {
                    ambiguousNames.add(studentKey);
                }
                studentMapByName.set(studentKey, student);
            }

            const processedNamesInFile = new Set();

            for (const row of jsonData) {
                if (operationCount >= 490) { 
                    currentBatch = window.db.batch();
                    batches.push(currentBatch);
                    operationCount = 0;
                }

                const studentName = row.Nama?.toString().trim();
                const className = row.Kelas?.toString().trim();
                if (!studentName || !className) continue; 

                const studentKey = studentName.toLowerCase();

                if (processedNamesInFile.has(studentKey)) {
                    skippedCount++;
                    continue;
                }
                processedNamesInFile.add(studentKey);

                if (ambiguousNames.has(studentKey)) {
                    ambiguousCount++;
                    continue; 
                }

                let classId = classMap.get(className.toLowerCase());
                if (!classId) {
                    const newClassRef = window.db.collection('classes').doc();
                    currentBatch.set(newClassRef, { name: className, lembagaId: window.appState.lembagaId });
                    operationCount++;
                    classId = newClassRef.id;
                    classMap.set(className.toLowerCase(), classId);
                    newClassesCount++;
                }

                const existingStudent = studentMapByName.get(studentKey);

                if (existingStudent) {
                    const studentRef = window.db.collection('students').doc(existingStudent.id);
                    let updates = {};

                    if (existingStudent.classId !== classId) {
                        updates.classId = classId;
                    }
                    if (existingStudent.name !== studentName) {
                        updates.name = studentName;
                    }

                    if (Object.keys(updates).length > 0) {
                        currentBatch.update(studentRef, updates);
                        operationCount++;
                        migratedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    const newStudentRef = window.db.collection('students').doc();
                    currentBatch.set(newStudentRef, { name: studentName, classId, lembagaId: window.appState.lembagaId });
                    operationCount++;
                    newStudentsCount++;
                }
            }

            if (batches.length > 0 && (operationCount > 0 || newClassesCount > 0)) {
                await Promise.all(batches.map(batch => batch.commit()));
            }

            // Close modal by query selector
            const addStudentModal = document.getElementById('add-student-modal');
            if (addStudentModal) addStudentModal.classList.add('hidden');

            let message = `${newStudentsCount} siswa baru ditambahkan.`;
            if (migratedCount > 0) message += ` ${migratedCount} siswa diperbarui.`;
            if (newClassesCount > 0) message += ` ${newClassesCount} kelas baru dibuat.`;
            if (skippedCount > 0) message += ` ${skippedCount} data duplikat dilewati.`;
            if (ambiguousCount > 0) message += ` ${ambiguousCount} nama ambigu dilewati.`;

            window.showToast(message, 'success');

        } catch (error) {
            console.error("Import Error:", error);
            window.showToast("Terjadi kesalahan saat memproses file. " + error.message, "error");
        } finally {
            if (importBtn) {
                importBtn.disabled = false;
                importBtn.textContent = 'Impor';
            }
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};

// Document-level delegation listeners
document.addEventListener('DOMContentLoaded', () => {
    
    // Bind search and filter events for setoran page listing
    const searchInput = document.getElementById('siswa-search-student');
    const filterClass = document.getElementById('student-filter-class');

    if (searchInput) {
        searchInput.addEventListener('input', window.debounce(() => {
            window.appState.currentPageSiswa = 1;
            window.renderStudentList();
        }, 150));
    }

    if (filterClass) {
        filterClass.addEventListener('change', () => {
            window.appState.currentPageSiswa = 1;
            window.renderStudentList();
        });
    }

    // Bind bulk template download & import buttons
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('import-file-input');

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', window.downloadTemplate);
    }
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', window.handleImport);
    }

    // Toggle password/PIN view helpers
    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.toggle-pin-btn');
        if (toggleBtn) {
            e.preventDefault(); 
            const relativeWrapper = toggleBtn.closest('.relative');
            if (relativeWrapper) {
                const input = relativeWrapper.querySelector('input');
                const eyeIcon = toggleBtn.querySelector('.eye-icon');
                const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');

                if (input && eyeIcon && eyeOffIcon) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    eyeIcon.classList.toggle('hidden', isPassword);
                    eyeOffIcon.classList.toggle('hidden', !isPassword);
                }
            }
        }
    });

    // Individual Student Card Header Accordion Click (toggles setoran form visibility)
    const studentListEl = document.getElementById('student-list');
    if (studentListEl) {
        studentListEl.addEventListener('click', (e) => {
            const header = e.target.closest('.student-header');
            if (header) {
                const item = header.closest('.student-item');
                const formContainer = item ? item.querySelector('.hafalan-form-container') : null;
                if (formContainer) {
                    formContainer.classList.toggle('hidden');
                }
            }
        });
    }

    // Individual Setoran Form Submission
    if (studentListEl) {
        studentListEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target.closest('.hafalan-form');
            if (!form) return;

            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Memproses...';
            }

            try {
                const formData = new FormData(form);
                const quranScope = window.getQuranScope();
                const surahSelect = form.querySelector('.surah-select');
                const selectedOption = surahSelect.options[surahSelect.selectedIndex];
                const maxAyat = parseInt(selectedOption.dataset.maxAyat);
                                
                let entriesToSave = [];
                let teacherId = window.appState.currentUserUID || sessionStorage.getItem('currentUserUID');
                const studentId = formData.get('studentId');
                const kualitas = formData.get('kualitas');
                const timestampString = formData.get('hafalan-timestamp');
                
                if (!timestampString) {
                    throw new Error("Tanggal dan waktu setoran tidak valid.");
                }
                const timestamp = new Date(timestampString).getTime();
                const lembagaId = window.appState.lembagaId || sessionStorage.getItem('lembagaId');
                
                const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');

                if (role === 'siswa') {
                    const enteredPin = formData.get('pin');
                    if (!enteredPin || !/^\d{6}$/.test(enteredPin)) {
                        throw new Error("PIN Guru harus diisi dengan 6 digit angka.");
                    }
                    const teachers = window.appState.allUsers.filter(u => u.role === 'guru');
                    const verifyingTeacher = teachers.find(t => t.pin === enteredPin);

                    if (!verifyingTeacher) {
                        throw new Error("PIN Guru salah atau tidak ditemukan.");
                    }
                    teacherId = verifyingTeacher.id;
                }
                
                if (quranScope === 'juz30') {
                    const surahDariNo = parseInt(formData.get('surah'));
                    const surahSampaiNo = parseInt(formData.get('surahSampai'));
                    let i = 0; 
                    
                    const commonLogic = (sNo) => {
                        const surahInfo = window.surahList.find(s => s.no === sNo);
                        if (!surahInfo) return; 
                        
                        const ayatDari = 1;
                        const ayatSampai = surahInfo.ayat;
                        const surahNo = sNo;
                        const jenis = window.checkZiyadahOrMurajaah(studentId, surahNo, ayatDari, ayatSampai);

                        entriesToSave.push({
                            studentId, jenis, kualitas, surahNo, ayatDari, ayatSampai,
                            catatan: '', 
                            timestamp: timestamp + i++, 
                            lembagaId, guruId: teacherId
                        });
                    };

                    if (surahDariNo > surahSampaiNo) {
                        for (let sNo = surahDariNo; sNo >= surahSampaiNo; sNo--) {
                            commonLogic(sNo);
                        }
                    } else {
                        for (let sNo = surahDariNo; sNo <= surahSampaiNo; sNo++) {
                            commonLogic(sNo);
                        }
                    }

                } else {
                    const surahNo = parseInt(formData.get('surah'));
                    const ayatDari = parseInt(formData.get('ayatDari'));
                    const ayatSampai = parseInt(formData.get('ayatSampai'));
                    if (isNaN(ayatDari) || isNaN(ayatSampai)) throw new Error("Ayat harus berupa angka.");

                    const [minAyat, maxAyatRange] = [Math.min(ayatDari, ayatSampai), Math.max(ayatDari, ayatSampai)];
                    if (maxAyatRange > maxAyat || minAyat < 1) throw new Error(`Ayat tidak valid. Surah ini memiliki 1-${maxAyat} ayat.`);

                    const jenis = window.checkZiyadahOrMurajaah(studentId, surahNo, minAyat, maxAyatRange);

                    entriesToSave.push({
                        studentId, jenis, kualitas, surahNo, 
                        ayatDari, 
                        ayatSampai, 
                        catatan: '', timestamp, lembagaId, guruId: teacherId
                    });
                }
                
                const batch = window.db.batch();
                entriesToSave.forEach(entry => {
                    const newDocRef = window.db.collection('hafalan').doc();
                    batch.set(newDocRef, entry);
                });
                await batch.commit();

                window.showToast(`Setoran (${entriesToSave.length} entri) berhasil disimpan!`, "success");
                window.appState.lastSubmittedStudentId = studentId;

            } catch (error) {
                console.error(error);
                window.showToast(error.message, "error");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Simpan Setoran';
                }
            }
        });
    }

    // Setoran change surah auto ayat populate
    if (studentListEl) {
        studentListEl.addEventListener('change', async (e) => {
            const surahSelect = e.target.closest('.surah-select');
            if (surahSelect) {
                const form = surahSelect.closest('form');
                const ayatDariSelect = form.querySelector('.ayat-dari-select');
                const ayatSampaiSelect = form.querySelector('.ayat-sampai-select');
                if (ayatDariSelect && ayatSampaiSelect) {
                    await window.populateAyatDropdowns(surahSelect, ayatDariSelect, ayatSampaiSelect);
                }
            }
        });
    }

    // Bulk setoran trigger modal setup
    const addBulkHafalanBtn = document.getElementById('add-bulk-hafalan-btn');
    const bulkHafalanModalEl = document.getElementById('bulk-hafalan-modal');
    const cancelBulkBtn = document.getElementById('cancel-bulk-hafalan-btn');

    if (addBulkHafalanBtn && bulkHafalanModalEl) {
        addBulkHafalanBtn.addEventListener('click', () => {
            window.appState.bulkHafalanStudentIds = [];
            window.renderSelectedStudentsForBulkHafalan();
            
            const bulkForm = document.getElementById('bulk-hafalan-form');
            if (bulkForm) bulkForm.reset();

            const bulkTimestampInput = document.getElementById('bulk-hafalan-timestamp');
            if (bulkTimestampInput && typeof getLocalISOString === 'function') {
                bulkTimestampInput.value = getLocalISOString(new Date());
            }

            window.populateBulkHafalanSurah();
            bulkHafalanModalEl.classList.remove('hidden');
        });
    }

    if (cancelBulkBtn && bulkHafalanModalEl) {
        cancelBulkBtn.addEventListener('click', () => {
            bulkHafalanModalEl.classList.add('hidden');
        });
    }

    // Bulk student searches
    const bulkSearchInput = document.getElementById('bulk-student-search-input');
    if (bulkSearchInput) {
        bulkSearchInput.addEventListener('input', window.searchStudentsForBulkHafalan);
        bulkSearchInput.addEventListener('focus', window.searchStudentsForBulkHafalan);
    }

    const bulkSearchResults = document.getElementById('bulk-student-search-results');
    if (bulkSearchResults) {
        bulkSearchResults.addEventListener('click', (e) => {
            const item = e.target.closest('div[data-student-id]');
            if (item) {
                window.addStudentToBulkHafalan(item.dataset.studentId);
            }
        });
    }

    const bulkSelectedList = document.getElementById('bulk-selected-students-list');
    if (bulkSelectedList) {
        bulkSelectedList.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('button[data-action="remove-student-bulk"]');
            if (removeBtn) {
                window.removeStudentFromBulkHafalan(removeBtn.dataset.id);
            }
        });
    }

    // Bulk surah change
    const bulkSurahSelect = document.getElementById('bulk-surah-select');
    if (bulkSurahSelect) {
        bulkSurahSelect.addEventListener('change', async (e) => {
            if (window.getQuranScope() !== 'juz30') {
                const bulkAyatDariSelect = document.getElementById('bulk-ayat-dari-select');
                const bulkAyatSampaiSelect = document.getElementById('bulk-ayat-sampai-select');
                await window.populateAyatDropdowns(e.target, bulkAyatDariSelect, bulkAyatSampaiSelect);
            }
        });
    }

    // Bulk Form Submission
    const bulkForm = document.getElementById('bulk-hafalan-form');
    if (bulkForm) {
        bulkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedStudentIds = window.appState.bulkHafalanStudentIds;
            if (selectedStudentIds.length === 0) {
                window.showToast("Pilih minimal satu siswa.", "error");
                return;
            }

            const submitBtn = bulkForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Memproses...';
            }

            try {
                const formData = new FormData(bulkForm);
                const quranScope = window.getQuranScope();
                const kualitas = formData.get('kualitas');
                const timestampString = formData.get('hafalan-timestamp');
                if (!timestampString) throw new Error("Tanggal dan waktu setoran tidak valid.");
                
                const timestamp = new Date(timestampString).getTime();
                const guruId = window.appState.currentUserUID || sessionStorage.getItem('currentUserUID');
                const lembagaId = window.appState.lembagaId || sessionStorage.getItem('lembagaId');
                const batch = window.db.batch();
                let totalEntries = 0;

                if (quranScope === 'juz30') {
                    const surahDariNo = parseInt(formData.get('surah'));
                    const surahSampaiNo = parseInt(formData.get('surahSampai')); 
                    
                    const commonLogic = (studentId, sNo, increment) => {
                        const surahInfo = window.surahList.find(s => s.no === sNo);
                        if (!surahInfo) return;
                        
                        const ayatDari = 1;
                        const ayatSampai = surahInfo.ayat;
                        const surahNo = sNo;
                        const jenis = window.checkZiyadahOrMurajaah(studentId, surahNo, ayatDari, ayatSampai);

                        const newEntry = { 
                            studentId, jenis, kualitas, surahNo, ayatDari, ayatSampai, 
                            catatan: '', 
                            timestamp: timestamp + increment, 
                            lembagaId, guruId 
                        };
                        const newDocRef = window.db.collection('hafalan').doc();
                        batch.set(newDocRef, newEntry);
                        totalEntries++;
                    };

                    for (const studentId of selectedStudentIds) {
                        let i = 0; 
                        if (surahDariNo > surahSampaiNo) {
                            for (let sNo = surahDariNo; sNo >= surahSampaiNo; sNo--) {
                                commonLogic(studentId, sNo, i++);
                            }
                        } else {
                            for (let sNo = surahDariNo; sNo <= surahSampaiNo; sNo++) {
                                commonLogic(studentId, sNo, i++);
                            }
                        }
                    }
                } else {
                    const surahNo = parseInt(formData.get('surah'));
                    const ayatDari = parseInt(formData.get('ayatDari'));
                    const ayatSampai = parseInt(formData.get('ayatSampai'));
                    if (isNaN(ayatDari) || isNaN(ayatSampai)) throw new Error("Ayat harus berupa angka.");

                    const [minAyat, maxAyatRange] = [Math.min(ayatDari, ayatSampai), Math.max(ayatDari, ayatSampai)];
                    if (maxAyatRange > maxAyat || minAyat < 1) throw new Error(`Ayat tidak valid. Surah ini memiliki 1-${maxAyat} ayat.`);

                    for (const studentId of selectedStudentIds) {
                        const jenis = window.checkZiyadahOrMurajaah(studentId, surahNo, minAyat, maxAyatRange);
                        const newEntry = { 
                            studentId, jenis, kualitas, surahNo, 
                            ayatDari, 
                            ayatSampai, 
                            catatan: '', timestamp, lembagaId, guruId 
                        };
                        const newDocRef = window.db.collection('hafalan').doc();
                        batch.set(newDocRef, newEntry);
                        totalEntries++;
                    }
                }

                await batch.commit();
                window.showToast(`Setoran (${totalEntries} entri) berhasil disimpan untuk ${selectedStudentIds.length} siswa.`, "success");
                
                const bulkTimestampInput = document.getElementById('bulk-hafalan-timestamp');
                if (bulkTimestampInput && typeof getLocalISOString === 'function') {
                    bulkTimestampInput.value = getLocalISOString(new Date());
                }

                window.renderSelectedStudentsForBulkHafalan();
                if (bulkHafalanModalEl) bulkHafalanModalEl.classList.add('hidden');

            } catch (error) {
                console.error(error);
                window.showToast(error.message, "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Simpan Setoran Massal';
                }
            }
        });
    }

    // Detail Student Page Juz and History changes
    const detailJuzFilter = document.getElementById('detail-juz-filter');
    if (detailJuzFilter) {
        detailJuzFilter.addEventListener('change', (e) => {
            window.appState.currentDetailJuzView = parseInt(e.target.value);
            if (typeof window.renderStudentJuzDetails === 'function') {
                window.renderStudentJuzDetails();
            }
        });
    }

    const detailHistoryFilter = document.getElementById('detail-history-filter');
    if (detailHistoryFilter) {
        detailHistoryFilter.addEventListener('change', (e) => {
            window.appState.currentDetailHistoryView = e.target.value;
            window.appState.currentDetailHistoryPage = 1;
            if (typeof window.renderStudentDetailHistoryList === 'function') {
                window.renderStudentDetailHistoryList();
            }
        });
    }
});

// Detailed Student Page rendering dispatcher methods
window.renderStudentDetailPage = function() { 
    const studentId = window.appState.currentDetailStudentId || sessionStorage.getItem('currentDetailStudentId');
    const pageContainer = document.getElementById('detail_siswa-page');

    if (!pageContainer) return; 

    if (!studentId) {
        window.showToast("Gagal memuat detail, silakan kembali.", "error"); 
        window.navigate('/dashboard');
        return;
    }

    const student = window.appState.allStudents.find(s => s.id === studentId); 
    if (!student) {
        console.warn("renderStudentDetailPage: Data siswa belum siap...");
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = "Memuat Detail Siswa...";
        return; 
    }
    
    const studentClass = window.appState.allClasses.find(c => c.id === student.classId);
    const className = studentClass ? studentClass.name : 'Tanpa Kelas';
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = `${student.name} (${className})`;
    document.title = `${student.name} (${className}) - HafalanQu`;

    window.appState.currentDetailHistoryView = 'setoran';
    window.appState.currentDetailHistoryPage = 1;
    const historyFilter = document.getElementById('detail-history-filter');
    if (historyFilter) {
        historyFilter.value = 'setoran';
    }

    let defaultJuz = 1; 
    const lastDeposit = window.appState.allHafalan
        .filter(h => h.studentId === studentId && (h.jenis === 'ziyadah' || h.jenis === 'murajaah'))
        .sort((a, b) => b.timestamp - a.timestamp)[0]; 

    if (lastDeposit) {
        const surahNo = parseInt(lastDeposit.surahNo);
        const ayatNo = parseInt(lastDeposit.ayatDari); 
        
        if (!isNaN(surahNo) && !isNaN(ayatNo)) {
            const calculatedJuz = window.getJuzForAyat(surahNo, ayatNo); 
            if (calculatedJuz >= 1 && calculatedJuz <= 30) {
                defaultJuz = calculatedJuz;
            }
        }
    }
    
    window.appState.currentDetailJuzView = defaultJuz;
    
    // Fill Juz Select element options
    const select = document.getElementById('detail-juz-filter');
    if (select) {
        select.innerHTML = '';
        for (let i = 1; i <= 30; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Juz ${i}`;
            select.appendChild(option);
        }
        select.value = defaultJuz;
    }

    if (typeof window.renderStudentDetailStats === 'function') window.renderStudentDetailStats(studentId);
    if (typeof window.renderStudentJuzDetails === 'function') window.renderStudentJuzDetails();
    if (typeof window.renderStudentDetailHistoryList === 'function') window.renderStudentDetailHistoryList();
    if (typeof window.renderStudentQualitySummary === 'function') window.renderStudentQualitySummary(studentId);
};

window.renderStudentDetailStats = function(studentId) {
    const container = document.getElementById('detail-stats-container');
    if (!container) return;

    const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
    const studentHafalan = window.appState.allHafalan.filter(h => 
        h.studentId === studentId && h.timestamp >= thirtyDaysAgo
    );

    let ziyadahAyat = 0;
    let murajaahAyat = 0;
    let totalTes = 0;
    let totalSkorTes = 0;

    studentHafalan.forEach(h => {
        if (h.jenis === 'ziyadah') {
            ziyadahAyat += (Math.abs(parseInt(h.ayatSampai) - parseInt(h.ayatDari)) + 1);
        } else if (h.jenis === 'murajaah') {
            murajaahAyat += (Math.abs(parseInt(h.ayatSampai) - parseInt(h.ayatDari)) + 1);
        } else if (h.jenis === 'tes') {
            totalTes++;
            const scoreMatch = h.catatan.match(/Skor:\s*(\d+)/);
            if (scoreMatch) {
                totalSkorTes += parseInt(scoreMatch[1], 10);
            }
        }
    });

    const avgTes = totalTes > 0 ? Math.round(totalSkorTes / totalTes) : 0;

    container.innerHTML = `
        <div class="card p-3 bg-teal-50 text-center rounded-lg border border-teal-100">
            <p class="text-2xl font-bold text-teal-700">${ziyadahAyat}</p>
            <p class="text-sm text-teal-600">Ayat Ziyadah</p>
        </div>
        <div class="card p-3 bg-sky-50 text-center rounded-lg border border-sky-100">
            <p class="text-2xl font-bold text-sky-700">${murajaahAyat}</p>
            <p class="text-sm text-sky-600">Ayat Muraja'ah</p>
        </div>
        <div class="card p-3 bg-purple-50 text-center rounded-lg border border-purple-100">
            <p class="text-2xl font-bold text-purple-700">${totalTes}</p>
            <p class="text-sm text-purple-600">Kali Tes</p>
        </div>
        <div class="card p-3 bg-amber-50 text-center rounded-lg border border-amber-100">
            <p class="text-2xl font-bold text-amber-700">${avgTes}%</p>
            <p class="text-sm text-amber-600">Rata-rata Tes</p>
        </div>
    `;
};

window.renderStudentDetailHistoryPagination = function(totalItems, itemsPerPage) {
    const paginationContainer = document.getElementById('detail-history-pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return;

    const currentPage = window.appState.currentDetailHistoryPage;

    const createButton = (text, page, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.disabled = isDisabled;
        button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
        if (!isDisabled && page) {
            button.onclick = () => {
                window.appState.currentDetailHistoryPage = page;
                window.renderStudentDetailHistoryList();
                const listEl = document.getElementById('detail-history-list');
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

window.renderStudentDetailHistoryList = function() {
    const studentId = window.appState.currentDetailStudentId || sessionStorage.getItem('currentDetailStudentId');
    const historyList = document.getElementById('detail-history-list');
    if (!historyList || !studentId) return;

    const view = window.appState.currentDetailHistoryView; 
    const currentPage = window.appState.currentDetailHistoryPage;
    const ITEMS_PER_PAGE = 50; 

    const allStudentHafalan = window.appState.allHafalan.filter(h => h.studentId === studentId);

    let filteredEntries;
    if (view === 'setoran') {
        filteredEntries = allStudentHafalan.filter(h => h.jenis === 'ziyadah' || h.jenis === 'murajaah');
    } else { 
        filteredEntries = allStudentHafalan.filter(h => h.jenis === 'tes');
    }

    filteredEntries.sort((a, b) => b.timestamp - a.timestamp);

    const totalItems = filteredEntries.length;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filteredEntries.slice(startIndex, endIndex);

    historyList.innerHTML = '';

    const surahNameMap = new Map(window.surahList.map(s => [s.no, s.nama]));
    const kualitasDisplayMap = { 
        'sangat-lancar': 'Sangat Baik', 
        'lancar': 'Baik',
        'cukup-lancar': 'Cukup', 
        'tidak-lancar': 'Kurang',
        'sangat-tidak-lancar': 'Tidak Bisa'
    };

    if (paginatedItems.length === 0) {
        const message = view === 'setoran' ? 'Belum ada riwayat setoran.' : 'Belum ada riwayat tes.';
        historyList.innerHTML = `<p class="text-sm text-slate-400 text-center p-4">${message}</p>`;
    } else {
        paginatedItems.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            const item = document.createElement('div');
            item.className = 'text-sm p-3 bg-white border border-slate-100 shadow-sm rounded-lg mb-2 flex flex-col justify-between';

            if (entry.jenis === 'tes') {
                item.innerHTML = `
                    <p class="font-bold text-purple-700 text-sm mb-1">${entry.catatan}</p>
                    <p class="text-xs text-slate-400">${date}</p>
                `;
            } else {
                const surahName = surahNameMap.get(entry.surahNo) || `Surah ${entry.surahNo}`;
                const kualitasText = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
                const jenisLabel = entry.jenis === 'ziyadah' ? 'Ziyadah' : 'Muraja\'ah';
                const jenisColor = entry.jenis === 'ziyadah' ? 'text-teal-600' : 'text-sky-600';

                item.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold ${jenisColor} text-xs uppercase tracking-wider">${jenisLabel}</span>
                        <span class="text-xs text-slate-400 font-medium">${date}</span>
                    </div>
                    <p class="font-bold text-slate-700 text-sm">${surahName} Ayat ${entry.ayatDari}-${entry.ayatSampai}</p>
                    <p class="text-xs text-slate-400 mt-0.5 italic">Kualitas: ${kualitasText}</p>
                `;
            }
            historyList.appendChild(item);
        });
    }

    window.renderStudentDetailHistoryPagination(totalItems, ITEMS_PER_PAGE);
};

window.renderStudentJuzDetails = function() {
    const studentId = window.appState.currentDetailStudentId || sessionStorage.getItem('currentDetailStudentId');
    const selectedJuz = parseInt(window.appState.currentDetailJuzView);

    const container = document.getElementById('detail-juz-surah-list');
    const summaryLabel = document.getElementById('detail-juz-summary-label');
    const summaryPercentageEl = document.getElementById('detail-juz-summary-percentage');
    const summaryBar = document.getElementById('detail-juz-summary-bar');

    if (!container || !studentId || !summaryLabel || !summaryBar || !summaryPercentageEl) {
        return;
    }

    const ziyadahEntries = window.appState.allHafalan.filter(h => 
        h.studentId === studentId && h.jenis === 'ziyadah'
    );

    const memorizedVersesMap = new Map();
    ziyadahEntries.forEach(h => {
        const surahNo = parseInt(h.surahNo);
        const ayatDari = parseInt(h.ayatDari);
        const ayatSampai = parseInt(h.ayatSampai);

        if (isNaN(surahNo) || isNaN(ayatDari) || isNaN(ayatSampai)) return;

        if (!memorizedVersesMap.has(surahNo)) {
            memorizedVersesMap.set(surahNo, new Set());
        }
        const surahSet = memorizedVersesMap.get(surahNo);
        const [start, end] = [Math.min(ayatDari, ayatSampai), Math.max(ayatDari, ayatSampai)];
        for (let i = start; i <= end; i++) {
            surahSet.add(i);
        }
    });

    const surahsInJuz = window.juzToSurahMap.get(selectedJuz);
    if (!surahsInJuz || surahsInJuz.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-400">Tidak ada data surah untuk juz ${selectedJuz}.</p>`;
        return;
    }

    let totalAyatInJuz = 0;
    let totalMemorizedInJuz = 0;
    const bubbleHTML = [];
    const bubbleClass = "inline-block text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm mb-2 mr-2";

    for (const surah of surahsInJuz) {
        const memorizedSet = memorizedVersesMap.get(surah.surahNo);
        const ayatCountInJuz = (surah.ayatSampai - surah.ayatDari + 1);
        totalAyatInJuz += ayatCountInJuz;

        let memorizedCountInJuz = 0;
        if (memorizedSet) {
            for (let ayat = surah.ayatDari; ayat <= surah.ayatSampai; ayat++) {
                if (memorizedSet.has(ayat)) {
                    memorizedCountInJuz++;
                }
            }
        }
        totalMemorizedInJuz += memorizedCountInJuz;

        let percentage = (ayatCountInJuz > 0) ? (memorizedCountInJuz / ayatCountInJuz) * 100 : 0;
        let bubble = '';
        const bubbleText = `${surah.nama} (${memorizedCountInJuz}/${ayatCountInJuz})`;

        if (percentage === 1) {
            bubble = `<span class="${bubbleClass} bg-red-100 text-red-700">${bubbleText}</span>`;
        } else if (percentage >= 100) {
            bubble = `<span class="${bubbleClass} bg-teal-100 text-teal-800">${bubbleText}</span>`;
        } else {
            const gradientStyle = `background: linear-gradient(to right, #a7f3d0 ${percentage}%, #fee2e2 ${percentage}%); color: #334155; border: 1px solid #e2e8f0;`;
            bubble = `<span class="${bubbleClass}" style="${gradientStyle}">${bubbleText}</span>`;
        }
        bubbleHTML.push(bubble);
    }

    const juzPercentage = (totalAyatInJuz > 0) ? (totalMemorizedInJuz / totalAyatInJuz) * 100 : 0;
    summaryLabel.textContent = `Juz ${selectedJuz} (${totalMemorizedInJuz} / ${totalAyatInJuz} ayat)`;
    summaryPercentageEl.textContent = `${juzPercentage.toFixed(0)}%`;
    summaryBar.style.width = `${juzPercentage}%`;

    container.innerHTML = bubbleHTML.join(' ');
};

window.renderStudentQualitySummary = function(studentId) {
    const container = document.getElementById('detail-kualitas-summary-card');
    if (!container) return;

    const studentHafalan = window.appState.allHafalan.filter(h => 
        h.studentId === studentId && (h.jenis === 'ziyadah' || h.jenis === 'murajaah')
    );

    if (studentHafalan.length < 5) {
        container.innerHTML = `
            <h3 class="text-base font-bold text-slate-800">Analisis Kualitas Hafalan</h3>
            <p class="text-sm text-slate-500 mt-2">Belum cukup data (minimal 5 setoran) untuk memberikan analisis kualitas hafalan siswa ini.</p>
        `;
        return;
    }

    const qualityCounts = {
        'sangat-lancar': 0, 'lancar': 0, 'cukup-lancar': 0,
        'tidak-lancar': 0, 'sangat-tidak-lancar': 0
    };
    let totalScore = 0;
    const scoreMap = window.getMutqinScores();

    studentHafalan.forEach(h => {
        if (qualityCounts.hasOwnProperty(h.kualitas)) {
            qualityCounts[h.kualitas]++;
        }
        totalScore += (scoreMap[h.kualitas] || 0);
    });

    const averageScore = Math.round(totalScore / studentHafalan.length);

    let modeQuality = '';
    let maxCount = 0;
    for (const [quality, count] of Object.entries(qualityCounts)) {
        if (count > maxCount) {
            maxCount = count;
            modeQuality = quality;
        }
    }
    
    const kualitasDisplayMap = { 
        'sangat-lancar': 'Sangat Baik', 
        'lancar': 'Baik',
        'cukup-lancar': 'Cukup', 
        'tidak-lancar': 'Kurang',
        'sangat-tidak-lancar': 'Tidak Bisa'
    };
    const modeQualityText = kualitasDisplayMap[modeQuality] || modeQuality;

    let title = '';
    let description = '';

    if (averageScore >= 90) {
        title = 'Kualitas Hafalan Sangat Istimewa';
        description = `Siswa ini menunjukkan konsistensi yang luar biasa dalam menjaga kualitas hafalannya. Sebagian besar setorannya dinilai <strong>"${modeQualityText}"</strong>. Pertahankan mutu dan fokus pada kelancaran di setiap setoran berikutnya.`;
    } else if (averageScore >= 75) {
        title = 'Baik dan Konsisten';
        description = `Secara umum, kualitas hafalan siswa ini tergolong baik dan cukup konsisten. Kualitas yang paling sering muncul adalah <strong>"${modeQualityText}"</strong>. Ada sedikit catatan pada setoran yang berkualitas di bawah 'Baik', namun jumlahnya tidak signifikan. Dorong siswa untuk terus berlatih agar lebih stabil.`;
    } else if (averageScore >= 60) {
        title = 'Cukup Baik Namun Perlu Peningkatan';
        description = `Kualitas hafalan siswa ini berada di level yang cukup, namun terlihat adanya inkonsistensi. Kualitas <strong>"${modeQualityText}"</strong> menjadi yang paling dominan. Perlu perhatian lebih pada setoran-setoran yang dinilai 'Kurang' agar tidak menjadi kebiasaan. Fokus pada muraja'ah sebelum ziyadah bisa menjadi solusi.`;
    } else if (averageScore >= 40) {
        title = 'Perlu Perhatian pada Kualitas';
        description = `Siswa ini menunjukkan tantangan dalam menjaga kualitas hafalan. Cukup banyak setoran yang dinilai 'Kurang' atau bahkan 'Tidak Bisa'. Kualitas paling sering adalah <strong>"${modeQualityText}"</strong>. Sangat disarankan untuk memperbanyak sesi muraja'ah (pengulangan) sebelum menambah hafalan baru.`;
    } else {
        title = 'Membutuhkan Bimbingan Intensif';
        description = `Kualitas hafalan siswa ini memerlukan perhatian dan bimbingan khusus. Mayoritas setoran berada di level 'Kurang' atau di bawahnya. Sebaiknya fokus penuh pada penguatan hafalan yang sudah ada (muraja'ah) sebelum melanjutkan ke hafalan baru (ziyadah).`;
    }

    container.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h3 class="text-base font-bold text-slate-800">${title}</h3>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">Kesimpulan</span>
        </div>
        <p class="text-sm text-slate-600 leading-relaxed">${description}</p>
        <div class="mt-4 pt-3 border-t border-slate-150 text-xs text-slate-500 space-y-1">
            <p><strong>Skor Rata-rata Mutqin:</strong> <span class="font-bold text-sm text-teal-600">${averageScore}%</span></p>
            <p><strong>Kualitas Paling Sering:</strong> <span class="font-semibold text-slate-700">${modeQualityText}</span> (${maxCount} dari ${studentHafalan.length} setoran)</p>
        </div>
    `;
};
