// js/dashboard.js

// Retrieve the date filtered hafalan records
window.getFilteredHafalanByDate = function() {
    const dateStartEl = document.getElementById('summary-filter-date-start');
    const dateEndEl = document.getElementById('summary-filter-date-end');
    
    const dateStart = dateStartEl ? dateStartEl.value : '';
    const dateEnd = dateEndEl ? dateEndEl.value : '';

    if (!dateStart && !dateEnd) {
        return window.appState.allHafalan;
    }

    const startTimestamp = dateStart ? new Date(dateStart + 'T00:00:00').getTime() : 0;
    const endTimestamp = dateEnd ? new Date(dateEnd + 'T23:59:59').getTime() : Infinity;

    return window.appState.allHafalan.filter(h => {
        const timestamp = h.timestamp;
        return timestamp >= startTimestamp && timestamp <= endTimestamp;
    });
};

// SheetJS column auto-sizing formatter
window.getWorksheetCols = function(data) {
    if (!data || data.length === 0) return [];
    const headers = Object.keys(data[0]);
    let cols = headers.map(header => {
        return { wch: header.toString().length };
    });

    data.forEach(row => {
        headers.forEach((key, i) => {
            const value = row[key] ? row[key].toString() : '';
            const length = value.length;
            if (length > cols[i].wch) {
                cols[i].wch = length;
            }
        });
    });
    return cols;
};

// Export all students' history and test records to a multi-sheet Excel workbook
window.exportAllData = function() {
    try {
        const { allStudents, allClasses, allHafalan, allUsers } = window.appState;
        const filteredHafalan = window.getFilteredHafalanByDate();
        const userMap = new Map(allUsers.map(u => [u.id, u.namaLengkap || u.email]));

        const kualitasDisplayMap = { 
            'sangat-lancar': 'Sangat Baik', 
            'lancar': 'Baik',
            'cukup-lancar': 'Cukup', 
            'tidak-lancar': 'Kurang',
            'sangat-tidak-lancar': 'Tidak Bisa'
        };
        const testTypeDisplayMap = {
            'continue-verse': 'Sambung Ayat',
            'previous-verse': 'Sambung Ayat Sebelumnya',
            'reorder-verses': 'Susun Ulang',
            'guess-surah': 'Tebak Surah'
        };

        const workbook = XLSX.utils.book_new();
        const filterSelect = document.getElementById('summary-rank-filter-class');
        const selectedClassId = filterSelect ? filterSelect.value : '';

        let classesToExport = selectedClassId 
            ? allClasses.filter(c => c.id === selectedClassId)
            : [...allClasses];

        classesToExport.sort((a, b) => a.name.localeCompare(b.name));

        for (const cls of classesToExport) {
            let dataForSheet = [];
            let studentNumber = 0;

            const studentsInClass = allStudents.filter(s => s.classId === cls.id);
            if (studentsInClass.length === 0) continue;

            const sortedStudents = studentsInClass.sort((a, b) => a.name.localeCompare(b.name));

            sortedStudents.forEach(student => {
                studentNumber++;
                const studentEntries = filteredHafalan.filter(h => h.studentId === student.id).sort((a, b) => b.timestamp - a.timestamp);
                let isFirstRowForStudent = true;

                if (studentEntries.length > 0) {
                    studentEntries.forEach(entry => {
                        const date = new Date(entry.timestamp);
                        const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' };
                        const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' };
                        const formattedDate = date.toLocaleDateString('id-ID', optionsDate);
                        const formattedTime = date.toLocaleTimeString('id-ID', optionsTime);

                        let rowData = {
                            "No": isFirstRowForStudent ? studentNumber : "",
                            "Nama": isFirstRowForStudent ? student.name : "",
                            "Hafalan": "",  
                            "Kualitas": "", 
                            "Tes": "",      
                            "Skor": "",     
                            "Nama Guru": "",
                            "Waktu": formattedTime,
                            "Tanggal": formattedDate,
                        };

                        if (entry.jenis === 'tes') {
                            const scoreMatch = entry.catatan.match(/Skor:\s*(\d+)/);
                            let materiTes = "-";
                            if (entry.catatan && entry.catatan.includes('| Materi:')) {
                                materiTes = entry.catatan.split('| Materi:')[1].trim();
                            }
                            const jenisTes = testTypeDisplayMap[entry.testType] || 'Ujian';
                            
                            rowData["Hafalan"] = "-";
                            rowData["Kualitas"] = "-";
                            rowData["Tes"] = `${jenisTes}: ${materiTes}`; 
                            rowData["Skor"] = scoreMatch ? scoreMatch[1] : "0"; 
                            rowData["Nama Guru"] = "-"; 
                        } else {
                            const surahInfo = window.surahList.find(s => s.no == entry.surahNo);
                            const namaSurah = surahInfo ? surahInfo.nama : `Surah ${entry.surahNo}`;
                            const guruName = entry.guruId ? userMap.get(entry.guruId) : '-';

                            rowData["Hafalan"] = `${namaSurah} Ayat ${entry.ayatDari}-${entry.ayatSampai}`;
                            rowData["Kualitas"] = kualitasDisplayMap[entry.kualitas] || entry.kualitas;
                            rowData["Tes"] = "-";
                            rowData["Skor"] = "-";
                            rowData["Nama Guru"] = guruName;
                        }

                        dataForSheet.push(rowData);
                        isFirstRowForStudent = false;
                    });
                } else {
                    dataForSheet.push({
                        "No": studentNumber, 
                        "Nama": student.name, 
                        "Hafalan": "-", 
                        "Kualitas": "-", 
                        "Tes": "-", 
                        "Skor": "-", 
                        "Nama Guru": "-", 
                        "Waktu": "-", 
                        "Tanggal": "-",
                    });
                }
            }); 

            if (dataForSheet.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
                const cols = window.getWorksheetCols(dataForSheet); 
                worksheet['!cols'] = cols;

                const sheetName = cls.name.replace(/[\/\\?*\[\]]/g, '').substring(0, 31);
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            }
        } 

        if (workbook.SheetNames.length === 0) {
            window.showToast("Tidak ada data siswa untuk diekspor.", "info");
            return;
        }

        const date = new Date().toISOString().slice(0, 10);
        let fileName = `laporan_hafalan_lengkap_${date}.xlsx`;

        if (selectedClassId) {
            const selectedClass = allClasses.find(c => c.id === selectedClassId);
            if (selectedClass) {
                const classNameSafe = selectedClass.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                fileName = `laporan_hafalan_${classNameSafe}_${date}.xlsx`;
            }
        }

        XLSX.writeFile(workbook, fileName);
        window.showToast("Data berhasil diekspor!", "success");

    } catch (error) {
        console.error("Excel Export error:", error);
        window.showToast("Gagal mengekspor data.", "error");
    }
};

// Render Dashboard Counters (Total Students, Total Classes, Ziyadah/Murajaah stats and trends)
window.renderSummary = function() {
    const totalSiswaEl = document.getElementById('summary-total-siswa');
    const totalKelasEl = document.getElementById('summary-total-kelas');
    
    if (totalSiswaEl) {
        window.animateCountUp(totalSiswaEl, window.appState.allStudents.length, 1000);
    }
    if (totalKelasEl) {
        window.animateCountUp(totalKelasEl, window.appState.allClasses.length, 1000);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    let ziyadahMonth = 0, ziyadahLastMonth = 0;
    let murajaahMonth = 0, murajaahLastMonth = 0;

    window.appState.allHafalan.forEach(h => {
        const ayatDari = parseInt(h.ayatDari);
        const ayatSampai = parseInt(h.ayatSampai);
        
        if (isNaN(ayatDari) || isNaN(ayatSampai)) return; 
        
        const ayatCount = Math.abs(ayatSampai - ayatDari) + 1;
        const timestamp = h.timestamp;
        
        const updateCounters = (type) => {
            if (timestamp >= monthStart) {
                if (type === 'ziyadah') ziyadahMonth += ayatCount; else murajaahMonth += ayatCount;
            } else if (timestamp >= lastMonthStart && timestamp < monthStart) {
                if (type === 'ziyadah') ziyadahLastMonth += ayatCount; else ziyadahLastMonth += ayatCount;
            }
        };

        if (h.jenis === 'ziyadah') updateCounters('ziyadah');
        else if (h.jenis === 'murajaah') updateCounters('murajaah');
    });
    
    let totalMutqinScore = 0;
    const scoreMap = window.getMutqinScores();

    if (window.appState.allHafalan.length > 0) {
        const totalScore = window.appState.allHafalan.reduce((sum, entry) => {
            return sum + (scoreMap[entry.kualitas] || 0);
        }, 0);
        totalMutqinScore = Math.round(totalScore / window.appState.allHafalan.length);
    }
    
    const mutqinCountEl = document.getElementById('summary-mutqin-count');
    if (mutqinCountEl) {
        window.animateCountUp(mutqinCountEl, totalMutqinScore, 1000);
    }

    const calculateTrend = (current, previous) => {
        if (previous > 0) return Math.round(((current - previous) / previous) * 100);
        if (current > 0) return 100;
        return 0;
    };
    
    const ziyadahTrend = calculateTrend(ziyadahMonth, ziyadahLastMonth);
    const murajaahTrend = calculateTrend(murajaahMonth, murajaahLastMonth);

    const renderTrendAnimation = (trendValue, containerId, signId, numberId) => {
        const containerEl = document.getElementById(containerId);
        const signEl = document.getElementById(signId);
        const numberEl = document.getElementById(numberId);

        if (!containerEl || !signEl || !numberEl) return;

        let colorClass = 'text-slate-500'; 
        let signText = '';

        if (trendValue > 0) {
            colorClass = 'text-green-500';
            signText = '+'; 
        } else if (trendValue < 0) {
            colorClass = 'text-red-500';
        }

        containerEl.className = `inline-block font-medium ${colorClass}`;
        signEl.textContent = signText;
        window.animateCountUp(numberEl, trendValue, 1000, false);
    };

    const ziyadahCountEl = document.getElementById('summary-ziyadah-count');
    if (ziyadahCountEl) {
        window.animateCountUp(ziyadahCountEl, ziyadahMonth, 1000);
    }
    renderTrendAnimation(
        ziyadahTrend,
        'summary-ziyadah-trend-container',
        'summary-ziyadah-trend-sign',
        'summary-ziyadah-trend-number'
    );

    const murajaahCountEl = document.getElementById('summary-murajaah-count');
    if (murajaahCountEl) {
        window.animateCountUp(murajaahCountEl, murajaahMonth, 1000);
    }
    renderTrendAnimation(
        murajaahTrend,
        'summary-murajaah-trend-container',
        'summary-murajaah-trend-sign',
        'summary-murajaah-trend-number'
    );
};

// Render Pagination Controls for Achievements table
window.renderPencapaianPagination = function(totalItems) {
    const paginationContainer = document.getElementById('pencapaian-pagination-controls');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const ITEMS_PER_PAGE = 36;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) return; 

    const currentPage = window.appState.currentPagePencapaian;

    const createButton = (text, page, isDisabled = false, isActive = false) => {
        const button = document.createElement('button');
        button.innerHTML = text;
        button.disabled = isDisabled;
        button.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`;
        if (!isDisabled && page) {
            button.onclick = () => {
                window.appState.currentPagePencapaian = page;
                window.renderStudentProgressList();
                const listEl = document.getElementById('student-progress-list');
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

// Render Achievements/Progress of all Students
window.renderStudentProgressList = function() {
    const progressListEl = document.getElementById('student-progress-list');
    if (!progressListEl) return;

    const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');
    const currentUserUID = window.appState.currentUserUID || sessionStorage.getItem('currentUserUID');
    const currentStudent = (role === 'siswa') ? window.appState.allStudents.find(s => s.userId === currentUserUID) : null;
    const currentStudentId = currentStudent ? currentStudent.id : null;

    const filteredHafalan = window.getFilteredHafalanByDate();

    // Setup total verses structure for Juz calculations
    const totalAyatPerJuz = Array(31).fill(0);
    window.surahList.forEach(surah => { 
        for (let ayat = 1; ayat <= surah.ayat; ayat++) { 
            let juz = window.getJuzForAyat(surah.no, ayat);
            if (juz > 0) totalAyatPerJuz[juz]++; 
        } 
    });

    const ITEMS_PER_PAGE = 36;
    const filterClassEl = document.getElementById('summary-rank-filter-class');
    const searchStudentEl = document.getElementById('summary-search-student');
    
    const filterClassId = filterClassEl ? filterClassEl.value : '';
    const searchTerm = searchStudentEl ? searchStudentEl.value.toLowerCase() : '';
    
    let studentsToRank = filterClassId ? window.appState.allStudents.filter(s => s.classId === filterClassId) : [...window.appState.allStudents];
    if (searchTerm) { 
        studentsToRank = studentsToRank.filter(s => s.name.toLowerCase().includes(searchTerm)); 
    }

    const calculateTrend = (current, previous) => {
        if (previous > 0) return Math.round(((current - previous) / previous) * 100);
        if (current > 0) return 100;
        return 0;
    };

    const renderStudentTrend = (trend) => {
        if (trend === 0) {
            return `<div class="text-xs text-slate-400 flex items-center justify-end gap-1 mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Tidak ada perubahan</span></div>`;
        }
        const colorClass = trend > 0 ? 'text-green-500' : 'text-red-500';
        const icon = trend > 0 
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><polyline points="17 11 12 6 7 11"></polyline><line x1="12" y1="18" x2="12" y2="6"></line></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><polyline points="7 13 12 18 17 13"></polyline><line x1="12" y1="6" x2="12" y2="18"></line></svg>`;
        return `<div class="text-xs font-semibold ${colorClass} flex items-center justify-end gap-1 mt-1">${icon}<span>${Math.abs(trend)}% 7 hari terakhir</span></div>`;
    };

    const studentScores = studentsToRank.map(student => {
        const studentHafalan = window.appState.allHafalan.filter(h => h.studentId === student.id);
        const studentClass = window.appState.allClasses.find(c => c.id === student.classId);
        
        // Ziyadah / Juz memorized calculation
        const ziyadahEntries = studentHafalan.filter(h => h.jenis === 'ziyadah');
        const memorizedVersesBySurah = new Map();
        
        ziyadahEntries.forEach(entry => { 
            const surahNo = parseInt(entry.surahNo); 
            const dari = parseInt(entry.ayatDari); 
            const sampai = parseInt(entry.ayatSampai); 
            if (isNaN(surahNo) || isNaN(dari) || isNaN(sampai)) return; 
            
            if (!memorizedVersesBySurah.has(surahNo)) { 
                memorizedVersesBySurah.set(surahNo, new Set()); 
            } 
            const surahSet = memorizedVersesBySurah.get(surahNo); 
            const [start, end] = [Math.min(dari, sampai), Math.max(dari, sampai)]; 
            for (let i = start; i <= end; i++) { 
                surahSet.add(i); 
            } 
        });

        const memorizedCountPerJuz = Array(31).fill(0);
        memorizedVersesBySurah.forEach((ayatSet, surahNo) => { 
            ayatSet.forEach(ayatNo => { 
                let juz = window.getJuzForAyat(surahNo, ayatNo);
                if (juz > 0) memorizedCountPerJuz[juz]++; 
            }); 
        });

        let totalJuz = 0;
        for (let i = 1; i <= 30; i++) { 
            if (memorizedCountPerJuz[i] > 0 && totalAyatPerJuz[i] > 0) { 
                totalJuz += (memorizedCountPerJuz[i] / totalAyatPerJuz[i]); 
            } 
        }
        const totalJuzFormatted = totalJuz.toFixed(1).replace('.', ',');

        // Test average scores
        const testEntries = studentHafalan.filter(h => h.jenis === 'tes');
        let averageTestScore = 0;
        if (testEntries.length > 0) { 
            const totalTestScore = testEntries.reduce((sum, entry) => { 
                const scoreMatch = entry.catatan.match(/Skor:\s*(\d+)/); 
                const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0; 
                return sum + score; 
            }, 0); 
            averageTestScore = Math.round(totalTestScore / testEntries.length); 
        }

        // Mutqin Score calculation
        let mutqinScore = 0;
        const scoreMap = window.getMutqinScores();
        if (studentHafalan.length > 0) { 
            const totalScore = studentHafalan.reduce((sum, entry) => sum + (scoreMap[entry.kualitas] || 0), 0); 
            mutqinScore = Math.round(totalScore / studentHafalan.length); 
        }

        // Last 7 days vs previous 7 days trend
        const now = new Date().getTime();
        const sevenDaysAgo = now - 7 * 86400000;
        const fourteenDaysAgo = now - 14 * 86400000;
        let last7DaysTotal = 0, previous7DaysTotal = 0;
        
        studentHafalan.forEach(h => { 
            const ayatCount = Math.abs(parseInt(h.ayatSampai) - parseInt(h.ayatDari)) + 1; 
            if (h.timestamp >= sevenDaysAgo) last7DaysTotal += ayatCount; 
            else if (h.timestamp >= fourteenDaysAgo) previous7DaysTotal += ayatCount; 
        });

        return { 
            id: student.id, 
            name: student.name, 
            className: studentClass ? studentClass.name : 'Tanpa Kelas', 
            totalJuz: totalJuz, 
            totalJuzFormatted: totalJuzFormatted, 
            testScore: averageTestScore, 
            mutqinScore, 
            trend: calculateTrend(last7DaysTotal, previous7DaysTotal) 
        };
    });

    const totalMutqinKeseluruhan = filteredHafalan.length;

    // 1. Establish ranking
    studentScores.sort((a, b) => {
        if (totalMutqinKeseluruhan === 0) return a.name.localeCompare(b.name);
        if (b.totalJuz !== a.totalJuz) return b.totalJuz - a.totalJuz;
        if (b.mutqinScore !== a.mutqinScore) return b.mutqinScore - a.mutqinScore;
        return a.name.localeCompare(b.name);
    });

    // 2. Assign absolute rank index
    studentScores.forEach((student, index) => {
        student.rank = index + 1;
    });

    // 3. For student role, float their own row to the top
    if (role === 'siswa' && currentStudentId) {
        studentScores.sort((a, b) => {
            if (a.id === currentStudentId) return -1;
            if (b.id === currentStudentId) return 1;
            return 0; 
        });
    }

    // 4. Paginate elements
    const currentPage = window.appState.currentPagePencapaian;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedScores = studentScores.slice(startIndex, endIndex);

    if (studentScores.length === 0) {
        progressListEl.innerHTML = `<p class="text-center text-slate-500 py-4">Belum ada data siswa.</p>`;
        const paginationControls = document.getElementById('pencapaian-pagination-controls');
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }
    
    const existingItems = new Map();
    progressListEl.querySelectorAll('.student-progress-item').forEach(item => { 
        existingItems.set(item.dataset.studentId, item); 
    });
    
    const fragment = document.createDocumentFragment();
    const currentItemIds = new Set();

    paginatedScores.forEach((student) => {
        const rank = student.rank; 
        const studentId = student.id;
        currentItemIds.add(studentId);

        const isOwner = (role === 'siswa' && student.id === currentStudentId);
        const trendHTML = renderStudentTrend(student.trend);
        
        let rankDisplay = `<span class="font-bold text-slate-500 text-lg w-6 text-center">-</span>`;
        let rankClass = 'bg-slate-50';
        
        if (totalMutqinKeseluruhan > 0) {
            rankDisplay = `<span class="font-bold text-slate-500 text-lg w-6 text-center">${rank}</span>`;
            if (rank === 1) rankClass = 'bg-teal-100';
            else if (rank === 2) rankClass = 'bg-sky-100';
            else if (rank === 3) rankClass = 'bg-orange-100';
        }
        
        if (isOwner) {
            rankClass = 'bg-teal-50 border border-teal-200';
        }

        const item = existingItems.get(studentId) || document.createElement('div');
        item.dataset.studentId = student.id;

        if (role === 'siswa' && !isOwner) {
            item.className = `student-progress-item flex items-center justify-between p-3 rounded-lg transition-colors opacity-60 pointer-events-none ${rankClass}`;
        } else {
            item.className = `student-progress-item flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer hover:bg-slate-100 ${rankClass}`;
            
            // Onclick redirects to detailed page
            item.onclick = () => {
                window.appState.currentDetailStudentId = student.id;
                sessionStorage.setItem('currentDetailStudentId', student.id);
                window.navigate('/detailsiswa');
            };
        }

        if (existingItems.has(studentId)) {
            const rankEl = item.querySelector('[data-target="rank"]');
            if (rankEl) rankEl.innerHTML = rankDisplay;
            window.animateCountUp(item.querySelector('[data-target="juz"]'), student.totalJuz, 800, true);
            window.animateCountUp(item.querySelector('[data-target="tes"]'), student.testScore, 800, false);
            window.animateCountUp(item.querySelector('[data-target="mutqin"]'), student.mutqinScore, 800, false);
            const trendEl = item.querySelector('[data-target="trend"]');
            if (trendEl && trendEl.innerHTML !== trendHTML) { trendEl.innerHTML = trendHTML; }
            const nameEl = item.querySelector('[data-target="name"]');
            if (nameEl && nameEl.textContent !== student.name) nameEl.textContent = student.name;
            const classEl = item.querySelector('[data-target="class"]');
            if (classEl && classEl.textContent !== student.className) classEl.textContent = student.className;
            fragment.appendChild(item);
        } else {
            item.innerHTML = `<div class="flex items-center space-x-4"><span data-target="rank">${rankDisplay}</span><div><p data-target="name" class="font-semibold text-slate-700">${student.name}</p><p data-target="class" class="text-sm text-slate-500">${student.className}</p></div></div><div class="text-right"><div class="flex justify-end gap-3 sm:gap-4 text-center"><div><p class="font-bold text-teal-600"><span data-target="juz">0,0</span></p><p class="text-xs text-slate-500">Juz</p></div><div><p class="font-bold text-teal-600"><span data-target="tes">0</span></p><p class="text-xs text-slate-500">Tes</p></div><div><p class="font-bold text-teal-600"><span data-target="mutqin">0</span>%</p><p class="text-xs text-slate-500">Mutqin</p></div></div><div data-target="trend">${trendHTML}</div></div>`;
            fragment.appendChild(item);
            window.animateCountUp(item.querySelector('[data-target="juz"]'), student.totalJuz, 1200, true);
            window.animateCountUp(item.querySelector('[data-target="tes"]'), student.testScore, 1200, false);
            window.animateCountUp(item.querySelector('[data-target="mutqin"]'), student.mutqinScore, 1200, false);
        }
        
        if (role === 'siswa' && isOwner && paginatedScores.length > 1) {
            const separator = document.createElement('div');
            separator.className = 'list-separator text-center my-2 text-xs font-semibold text-slate-400 uppercase tracking-wider';
            separator.innerHTML = `<span>Peringkat Siswa Lain</span>`;
            fragment.appendChild(separator);
        }
    });

    existingItems.forEach((item, id) => { 
        if (!currentItemIds.has(id)) { item.remove(); } 
    });
    
    progressListEl.innerHTML = ''; 
    progressListEl.appendChild(fragment);
    
    window.renderPencapaianPagination(studentScores.length);
};

// Document binding for search & filters inputs
document.addEventListener('DOMContentLoaded', () => {
    const searchStudent = document.getElementById('summary-search-student');
    const rankFilterClass = document.getElementById('summary-rank-filter-class');
    const filterDateStart = document.getElementById('summary-filter-date-start');
    const filterDateEnd = document.getElementById('summary-filter-date-end');

    if (searchStudent) {
        searchStudent.addEventListener('input', window.debounce(() => {
            window.appState.currentPagePencapaian = 1;
            window.renderStudentProgressList();
        }, 150));
    }

    if (rankFilterClass) {
        rankFilterClass.addEventListener('change', () => {
            window.appState.currentPagePencapaian = 1;
            window.renderStudentProgressList();
        });
    }

    if (filterDateStart) {
        filterDateStart.addEventListener('change', () => {
            window.appState.currentPagePencapaian = 1;
            window.renderSummary();
            window.renderStudentProgressList();
        });
    }

    if (filterDateEnd) {
        filterDateEnd.addEventListener('change', () => {
            window.appState.currentPagePencapaian = 1;
            window.renderSummary();
            window.renderStudentProgressList();
        });
    }
});
