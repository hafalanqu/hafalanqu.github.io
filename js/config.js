// js/config.js
// Global application state
window.appState = {
    allClasses: [],
    allStudents: [],
    allHafalan: [],
    allUsers: [],
    testScopes: [],
    activeTestMode: 'surah-range', 
    pengaturan: { 
        skorMutqin: { 
            'sangat-lancar': 100, 'lancar': 90, 'cukup-lancar': 70, 
            'tidak-lancar': 50, 'sangat-tidak-lancar': 30
        },
        lingkupHafalan: 'full'
    },
    currentTest: {
        isActive: false,
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        settings: {},
        studentIds: [],
    },
    currentPageSiswa: 1,
    currentPagePencapaian: 1,
    currentPageRiwayat: 1,
    currentPageDaftarHadir: 1,
    loggedInRole: null,
    lastSubmittedStudentId: null,
    hafalanSubmissionData: null, // To temporarily hold form data for PIN verification
    bulkHafalanStudentIds: [],
    currentDetailStudentId: null,
    currentDetailHistoryView: 'setoran',
    currentDetailHistoryPage: 1,
    currentDetailJuzView: 1,
    adminAkunFilterClassId: null
};

window.activeDBListeners = [];

window.surahList = [
    { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 2, nama: "Al-Baqarah", ayat: 286 }, { no: 3, nama: "Ali 'Imran", ayat: 200 }, { no: 4, nama: "An-Nisa'", ayat: 176 }, { no: 5, nama: "Al-Ma'idah", ayat: 120 }, { no: 6, nama: "Al-An'am", ayat: 165 }, { no: 7, nama: "Al-A'raf", ayat: 206 }, { no: 8, nama: "Al-Anfal", ayat: 75 }, { no: 9, nama: "At-Taubah", ayat: 129 }, { no: 10, nama: "Yunus", ayat: 109 }, { no: 11, nama: "Hud", ayat: 123 }, { no: 12, nama: "Yusuf", ayat: 111 }, { no: 13, nama: "Ar-Ra'd", ayat: 43 }, { no: 14, nama: "Ibrahim", ayat: 52 }, { no: 15, nama: "Al-Hijr", ayat: 99 }, { no: 16, nama: "An-Nahl", ayat: 128 }, { no: 17, nama: "Al-Isra'", ayat: 111 }, { no: 18, nama: "Al-Kahf", ayat: 110 }, { no: 19, nama: "Maryam", ayat: 98 }, { no: 20, nama: "Taha", ayat: 135 }, { no: 21, nama: "Al-Anbiya'", ayat: 112 }, { no: 22, nama: "Al-Hajj", ayat: 78 }, { no: 23, nama: "Al-Mu'minun", ayat: 118 }, { no: 24, nama: "An-Nur", ayat: 64 }, { no: 25, nama: "Al-Furqan", ayat: 77 }, { no: 26, nama: "Asy-Syu'ara'", ayat: 227 }, { no: 27, nama: "An-Naml", ayat: 93 }, { no: 28, nama: "Al-Qasas", ayat: 88 }, { no: 29, nama: "Al-'Ankabut", ayat: 69 }, { no: 30, nama: "Ar-Rum", ayat: 60 }, { no: 31, nama: "Luqman", ayat: 34 }, { no: 32, nama: "As-Sajdah", ayat: 30 }, { no: 33, nama: "Al-Ahzab", ayat: 73 }, { no: 34, nama: "Saba'", ayat: 54 }, { no: 35, nama: "Fatir", ayat: 45 }, { no: 36, nama: "Yasin", ayat: 83 }, { no: 37, nama: "As-Saffat", ayat: 182 }, { no: 38, nama: "Sad", ayat: 88 }, { no: 39, nama: "Az-Zumar", ayat: 75 }, { no: 40, nama: "Ghafir", ayat: 85 }, { no: 41, nama: "Fussilat", ayat: 54 }, { no: 42, nama: "Asy-Syura", ayat: 53 }, { no: 43, nama: "Az-Zukhruf", ayat: 89 }, { no: 44, nama: "Ad-Dukhan", ayat: 59 }, { no: 45, nama: "Al-Jasiyah", ayat: 37 }, { no: 46, nama: "Al-Ahqaf", ayat: 35 }, { no: 47, nama: "Muhammad", ayat: 38 }, { no: 48, nama: "Al-Fath", ayat: 29 }, { no: 49, nama: "Al-Hujurat", ayat: 18 }, { no: 50, nama: "Qaf", ayat: 45 }, { no: 51, nama: "Az-Zariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }, { no: 58, nama: "Al-Mujadalah", ayat: 22 }, { no: 59, nama: "Al-Hasyr", ayat: 24 }, { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 }, { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Tagabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 }, { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 }, { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddassir", ayat: 56 }, { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 }, { no: 78, nama: "An-Naba'", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, "nama": "'Abasa", ayat: 42 }, { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 }, { no: 84, nama: "Al-Insyiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, nama: "At-Tariq", ayat: 17 }, { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Gasyiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 }, { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Asy-Syams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 }, { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Asy-Syarh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 }, { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 }, { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 }, { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 }, { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraisy", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 }, { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 }, { no: 111, nama: "Al-Masad", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 }
];

window.juzBoundaries = [
    { juz: 1, start: { s: 1, a: 1 } },   { juz: 2, start: { s: 2, a: 142 } }, { juz: 3, start: { s: 2, a: 253 } },
    { juz: 4, start: { s: 3, a: 93 } },  { juz: 5, start: { s: 4, a: 24 } },  { juz: 6, start: { s: 4, a: 148 } },
    { juz: 7, start: { s: 5, a: 82 } },  { juz: 8, start: { s: 6, a: 111 } }, { juz: 9, start: { s: 7, a: 88 } },
    { juz: 10, start: { s: 8, a: 41 } }, { juz: 11, start: { s: 9, a: 93 } }, { juz: 12, start: { s: 11, a: 6 } },
    { juz: 13, start: { s: 12, a: 53 } },{ juz: 14, start: { s: 15, a: 1 } }, { juz: 15, start: { s: 17, a: 1 } },
    { juz: 16, start: { s: 18, a: 75 } },{ juz: 17, start: { s: 21, a: 1 } }, { juz: 18, start: { s: 23, a: 1 } },
    { juz: 19, start: { s: 25, a: 21 } },{ juz: 20, start: { s: 27, a: 56 } },{ juz: 21, start: { s: 29, a: 46 } },
    { juz: 22, start: { s: 33, a: 31 } },{ juz: 23, start: { s: 36, a: 28 } },{ juz: 24, start: { s: 39, a: 32 } },
    { juz: 25, start: { s: 41, a: 47 } },{ juz: 26, start: { s: 46, a: 1 } },  { juz: 27, start: { s: 51, a: 31 } },
    { juz: 28, start: { s: 58, a: 1 } },  { juz: 29, start: { s: 67, a: 1 } }, { juz: 30, start: { s: 78, a: 1 } }
];

window.getJuzForAyat = function(surahNo, ayatNo) {
    for (let i = window.juzBoundaries.length - 1; i >= 0; i--) {
        if (surahNo > window.juzBoundaries[i].start.s || (surahNo === window.juzBoundaries[i].start.s && ayatNo >= window.juzBoundaries[i].start.a)) {
            return window.juzBoundaries[i].juz;
        }
    }
    return 0; // Should not happen
}

window.juzToSurahMap = new Map();
for (let juz = 1; juz <= 30; juz++) {
    window.juzToSurahMap.set(juz, []);
}

window.surahList.forEach(surah => {
    for (let ayat = 1; ayat <= surah.ayat; ayat++) {
        let juz = window.getJuzForAyat(surah.no, ayat);
        if (juz > 0) {
            let surahInJuzList = window.juzToSurahMap.get(juz);
            let surahEntry = surahInJuzList.find(s => s.surahNo === surah.no);

            if (!surahEntry) {
                surahEntry = { 
                    surahNo: surah.no, 
                    nama: surah.nama, 
                    totalAyatSurah: surah.ayat, 
                    ayatDari: ayat, 
                    ayatSampai: ayat 
                };
                surahInJuzList.push(surahEntry);
            } else {
                surahEntry.ayatSampai = ayat;
            }
        }
    }
});

window.getMutqinScores = function() {
    return window.appState.pengaturan.skorMutqin;
}

// --- PWA Setup Helpers ---
window.showToast = function(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    toastMessage.textContent = message;
    toast.className = 'fixed top-5 right-5 text-white py-3 px-5 rounded-lg shadow-lg z-50'; // Reset
    toast.classList.add('show', type);
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

window.animateCountUp = function(el, target, duration = 1000, isFloat = false) {
    if (!el) return;

    let start;
    if (isFloat) {
        start = parseFloat(el.textContent.replace(/[^0-9,-]/g, '').replace(',', '.')) || 0;
    } else {
        start = parseInt(el.textContent.replace(/[^0-9-]/g, ''), 10) || 0;
    }

    if (isNaN(start)) {
        start = 0;
    }

    if (start === target) {
        el.textContent = isFloat ? target.toString().replace('.', ',') : target;
        return;
    }

    let startTime = null;

    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOut

        let current;
        if (isFloat) {
            current = (easedProgress * (target - start) + start);
            el.textContent = current.toFixed(1).replace('.', ',');
        } else {
            current = Math.floor(easedProgress * (target - start) + start);
            el.textContent = current;
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = isFloat ? target.toFixed(1).replace('.', ',') : target;
        }
    };

    requestAnimationFrame(step);
}

let debounceTimeout;
window.debounce = function(func, delay = 100) {
    return function(...args) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

window.checkZiyadahOrMurajaah = function(studentId, surahNo, ayatDari, ayatSampai) {
    if (!window.appState.allHafalan) return 'ziyadah'; 

    const previousZiyadah = window.appState.allHafalan.filter(h => 
        h.studentId === studentId && 
        h.jenis === 'ziyadah' &&
        String(h.surahNo) === String(surahNo)
    );

    const memorizedVerses = new Set();
    previousZiyadah.forEach(entry => {
        const [start, end] = [parseInt(entry.ayatDari), parseInt(entry.ayatSampai)];
        const [minDB, maxDB] = [Math.min(start, end), Math.max(start, end)];
        for (let i = minDB; i <= maxDB; i++) {
            memorizedVerses.add(i);
        }
    });

    const [startInput, endInput] = [parseInt(ayatDari), parseInt(ayatSampai)];
    const [minInput, maxInput] = [Math.min(startInput, endInput), Math.max(startInput, endInput)];

    let isAllRepeated = true;
    for (let i = minInput; i <= maxInput; i++) {
        if (!memorizedVerses.has(i)) {
            isAllRepeated = false;
            break;
        }
    }
    return isAllRepeated ? 'murajaah' : 'ziyadah';
}

// --- Firebase Configuration ---
window.firebaseConfig = {
    apiKey: "AIzaSyB4zxl2TCsevr7KKfdpIQYE3VRyfr-rLOY",
    authDomain: "hafalanqu-app.firebaseapp.com",
    projectId: "hafalanqu-app",
    storageBucket: "hafalanqu-app.appspot.com",
    messagingSenderId: "1032716870319",
    appId: "1:1032716870319:web:30bd0e7353ae806f676a5a"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
}
window.db = firebase.firestore();
window.auth = firebase.auth();
window.storage = firebase.storage();

// --- Global Modal Helpers ---
window.showModal = function(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
};

window.hideModal = function(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('hidden');
    document.body.style.overflow = ''; 
};

window.showConfirmModal = function({ title, message, okText, onConfirm }) {
    const el = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const textEl = document.getElementById('confirm-modal-text');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    if (!el || !titleEl || !textEl || !okBtn || !cancelBtn) return;

    titleEl.textContent = title || 'Konfirmasi';
    textEl.textContent = message;
    okBtn.textContent = okText || 'Ya, Hapus';
    
    window.showModal(el);

    const closeAndCleanup = () => {
        window.hideModal(el);
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', closeAndCleanup);
    };

    const handleOk = () => {
        onConfirm();
        closeAndCleanup();
    };
    
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', closeAndCleanup);
};

