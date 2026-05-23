// js/tes.js

// Fetch verses for test (from Cache or Quran API)
window.fetchVersesForTest = async function({ mode, scopes, juzDari, juzSampai, rangeSurahDari, rangeSurahSampai }) {
    let allVerses = [];
    
    const getVersesBySurah = async (surahNo) => {
        if (window.quranCache[surahNo]) {
            return window.quranCache[surahNo];
        }
        const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahNo}?per_page=300&fields=text_uthmani`;
        try {
            const res = await fetch(url);
            const json = await res.json();
            const verses = json.verses || [];
            window.quranCache[surahNo] = verses;
            return verses;
        } catch (error) {
            console.error(`Gagal ambil surah ${surahNo}:`, error);
            throw new Error(`Gagal memuat data Surah ${surahNo}. Periksa koneksi internet.`);
        }
    };

    if (mode === 'juz') {
        if (!juzDari || !juzSampai) throw new Error("Pilih rentang juz.");
        const urls = [];
        for (let i = parseInt(juzDari); i <= parseInt(juzSampai); i++) {
             urls.push(`https://api.quran.com/api/v4/verses/by_juz/${i}?per_page=300&fields=text_uthmani`);
        }
        const responses = await Promise.all(urls.map(url => fetch(url)));
        const data = await Promise.all(responses.map(res => res.json()));
        allVerses = data.flatMap(d => d.verses || []);

    } else if (mode === 'surah-range') {
        if (!rangeSurahDari || !rangeSurahSampai) throw new Error("Pilih rentang surah.");
        
        let start = parseInt(rangeSurahDari);
        let end = parseInt(rangeSurahSampai);
        if (start > end) [start, end] = [end, start];

        const promises = [];
        for (let i = start; i <= end; i++) {
            promises.push(getVersesBySurah(i));
        }
        const results = await Promise.all(promises);
        allVerses = results.flat();

    } else {
        if (!scopes || scopes.length === 0) throw new Error("Belum ada hafalan yang dipilih.");
        
        const uniqueSurahs = [...new Set(scopes.map(s => s.surahNo))];
        const surahCacheLocal = {};
        const promises = uniqueSurahs.map(async (surahNo) => {
            surahCacheLocal[surahNo] = await getVersesBySurah(surahNo);
        });
        await Promise.all(promises);

        scopes.forEach(scope => {
            const fullSurahVerses = surahCacheLocal[scope.surahNo];
            if (fullSurahVerses) {
                const sliced = fullSurahVerses.slice(scope.start - 1, scope.end);
                allVerses = allVerses.concat(sliced);
            }
        });
    }

    return allVerses;
};

// Generates specific types of tahfidz test questions
window.generateQuestions = function(verses, testType, totalQuestions = 10) {
    let questions = [];

    if (testType === 'all-types') {
        const orderedTypes = ['continue-verse', 'previous-verse', 'guess-surah', 'reorder-verses'];
        const countPerType = Math.ceil(totalQuestions / orderedTypes.length);
        let finalQuestions = [];

        for (const type of orderedTypes) {
            let typeQuestions = window.generateQuestions(verses, type, countPerType + 5);
            typeQuestions.sort(() => Math.random() - 0.5);
            const slicedQuestions = typeQuestions.slice(0, countPerType);
            finalQuestions = finalQuestions.concat(slicedQuestions);
        }
        return finalQuestions.slice(0, totalQuestions);
    }

    if (testType === 'continue-verse') {
        const possibleQuestionIndices = [];
        if (verses.length > 1) {
            for (let i = 0; i < verses.length - 1; i++) {
                if (verses[i].text_uthmani && verses[i+1].text_uthmani) {
                    possibleQuestionIndices.push(i);
                }
            }
        }

        if (possibleQuestionIndices.length < 4) {
            window.showToast("Tidak cukup materi ayat berurutan untuk membuat tes.", "info");
            return [];
        }

        if (possibleQuestionIndices.length < totalQuestions) {
            totalQuestions = possibleQuestionIndices.length;
        }

        const selectedIndices = new Set();
        while(selectedIndices.size < totalQuestions) {
            const randomIndex = Math.floor(Math.random() * possibleQuestionIndices.length);
            selectedIndices.add(possibleQuestionIndices[randomIndex]);
        }

        for (const index of selectedIndices) {
            const questionVerse = verses[index];
            const correctAnswerVerse = verses[index + 1];

            const [s1, a1] = questionVerse.verse_key.split(':');
            const [s2, a2] = correctAnswerVerse.verse_key.split(':');

            if (s1 !== s2 || parseInt(a2) !== parseInt(a1) + 1) {
                continue; 
            }

            const questionText = questionVerse.text_uthmani;
            const correctAnswerText = correctAnswerVerse.text_uthmani;
            
            let wrongAnswers = [];
            let otherVerseIndices = verses.map((_, i) => i).filter(i => i !== index && i !== (index + 1));

            otherVerseIndices.sort(() => Math.random() - 0.5);
            
            for (const otherIndex of otherVerseIndices) {
                if (wrongAnswers.length >= 3) break;
                if (verses[otherIndex].text_uthmani) {
                    wrongAnswers.push(verses[otherIndex].text_uthmani);
                }
            }

            questions.push({
                type: 'continue-verse',
                instruction: 'Lanjutkan ayat berikut ini:', 
                question: questionText,                     
                options: [correctAnswerText, ...wrongAnswers].sort(() => Math.random() - 0.5),
                answer: correctAnswerText,                  
                isAnswered: false,
                userAnswer: null,
                isCorrect: null
            });
        }
        
    } else if (testType === 'previous-verse') {
        if (verses.length < 4) {
            window.showToast("Tidak cukup materi ayat untuk membuat tes.", "info");
            return [];
        }
        
        const possibleQuestionIndices = [];
        for (let i = 1; i < verses.length; i++) {
            possibleQuestionIndices.push(i);
        }

        if (possibleQuestionIndices.length < totalQuestions) {
            totalQuestions = possibleQuestionIndices.length;
        }
        
        const questionIndices = new Set();
        while(questionIndices.size < totalQuestions) {
            const randomIndex = Math.floor(Math.random() * possibleQuestionIndices.length);
            questionIndices.add(possibleQuestionIndices[randomIndex]);
        }

        for (const index of questionIndices) {
            const questionVerse = verses[index];
            const correctVerse = verses[index - 1]; 

            const questionText = questionVerse.text_uthmani;
            const correctAnswerText = correctVerse.text_uthmani;
            
            let wrongAnswers = [];
            let allOtherVerseIndices = verses.map((_, i) => i).filter(i => i !== index && i !== (index - 1));
            allOtherVerseIndices.sort(() => Math.random() - 0.5);
            
            for (const otherIndex of allOtherVerseIndices) {
                if (wrongAnswers.length >= 3) break;
                wrongAnswers.push(verses[otherIndex].text_uthmani);
            }

            questions.push({
                type: 'previous-verse',
                instruction: 'Sebutkan ayat sebelum ayat berikut:',
                question: questionText,
                options: [correctAnswerText, ...wrongAnswers].sort(() => Math.random() - 0.5),
                answer: correctAnswerText,
                isAnswered: false,
                userAnswer: null,
                isCorrect: null
            });
        }

    } else if (testType === 'reorder-verses') {
        let validChunks = [];
        const isSequential = (arr) => {
            for (let k = 0; k < arr.length - 1; k++) {
                const [s1, a1] = arr[k].verse_key.split(':');
                const [s2, a2] = arr[k+1].verse_key.split(':');
                if (s1 !== s2 || parseInt(a2) !== parseInt(a1) + 1) {
                    return false;
                }
            }
            return true;
        };

        for (let i = 0; i < verses.length; i++) {
            if (i + 4 <= verses.length) {
                const chunk4 = verses.slice(i, i + 4);
                if (isSequential(chunk4)) validChunks.push(chunk4);
            }
            if (i + 5 <= verses.length) {
                const chunk5 = verses.slice(i, i + 5);
                if (isSequential(chunk5)) validChunks.push(chunk5);
            }
        }

        if (validChunks.length === 0) {
            if (testType !== 'all-types') {
                window.showToast("Tidak ditemukan 4 ayat berurutan di lingkup ini.", "info");
            }
            return [];
        }

        if (validChunks.length < totalQuestions) {
            totalQuestions = validChunks.length;
        }

        const selectedChunks = validChunks.sort(() => Math.random() - 0.5).slice(0, totalQuestions);

        for (const chunk of selectedChunks) {
            let segments = chunk.map((v, i) => ({
                realOrder: i + 1, 
                text: v.text_uthmani
            }));

            const shuffledSegments = [...segments].sort(() => Math.random() - 0.5);

            const segmentLength = chunk.length;
            const correctSequence = [];
            for (let i = 1; i <= segmentLength; i++) {
                const displayIndex = shuffledSegments.findIndex(s => s.realOrder === i);
                correctSequence.push(displayIndex + 1); 
            }
            const answerKey = correctSequence.join('-');

            const optionsSet = new Set();
            optionsSet.add(answerKey);

            while (optionsSet.size < 4) {
                const nums = Array.from({length: segmentLength}, (_, k) => k + 1);
                const randomSeq = nums.sort(() => Math.random() - 0.5).join('-');
                optionsSet.add(randomSeq);
            }
            const finalOptions = Array.from(optionsSet).sort(() => Math.random() - 0.5);

            const firstVerse = chunk[0];
            const lastVerse = chunk[chunk.length - 1];
            const [surahNo, ayatStart] = firstVerse.verse_key.split(':');
            const [_, ayatEnd] = lastVerse.verse_key.split(':');
            
            const surahInfo = window.surahList.find(s => s.no == surahNo);
            const surahName = surahInfo ? surahInfo.nama : surahNo;
            const contextTitle = `(QS. ${surahName}: ${ayatStart}-${ayatEnd})`;

            questions.push({
                type: 'reorder-verses',
                instruction: 'Perhatikan kalimat berikut.',
                question: contextTitle,
                segments: shuffledSegments.map(s => s.text),
                options: finalOptions,
                answer: answerKey,
                isAnswered: false,
                userAnswer: null,
                isCorrect: null
            });
        }

    } else if (testType === 'guess-surah') {
        let eligibleVerses = verses.filter(v => v.text_uthmani);

        eligibleVerses = eligibleVerses.filter(v => {
            const [sNoStr, aNoStr] = v.verse_key.split(':');
            const sNo = parseInt(sNoStr);
            const aNo = parseInt(aNoStr);
            const juz = window.getJuzForAyat(sNo, aNo);
            const surahsInThatJuz = window.juzToSurahMap.get(juz); 
            return (surahsInThatJuz && surahsInThatJuz.length >= 10);
        });

        if (eligibleVerses.length === 0) {
            if (testType !== 'all-types') { 
                window.showToast("Tebak Surat hanya tersedia untuk Juz pendek (misal: Juz 30).", "info");
            }
            return [];
        }

        const uniqueSurahIdsInRange = [...new Set(eligibleVerses.map(v => {
            const [sNo] = v.verse_key.split(':');
            return parseInt(sNo);
        }))];

        if (eligibleVerses.length < totalQuestions) {
            totalQuestions = eligibleVerses.length;
        }
        
        const selectedIndices = new Set();
        while(selectedIndices.size < totalQuestions) {
            const randomIndex = Math.floor(Math.random() * eligibleVerses.length);
            selectedIndices.add(randomIndex);
        }

        for (const index of selectedIndices) {
            const verse = eligibleVerses[index];
            const questionText = verse.text_uthmani;
            const [surahNoStr] = verse.verse_key.split(':');
            const surahNo = parseInt(surahNoStr);

            const correctSurahObj = window.surahList.find(s => s.no === surahNo);
            const correctAnswerText = correctSurahObj ? correctSurahObj.nama : `Surah ${surahNo}`;

            let candidateIds = uniqueSurahIdsInRange.filter(id => id !== surahNo);

            if (candidateIds.length < 3) {
                const juz30Surahs = window.juzToSurahMap.get(30).map(s => s.surahNo);
                const globalCandidates = juz30Surahs.filter(id => id !== surahNo && !candidateIds.includes(id));
                const needed = 3 - candidateIds.length;
                const randomGlobal = globalCandidates.sort(() => Math.random() - 0.5).slice(0, needed);
                candidateIds = [...candidateIds, ...randomGlobal];
            }

            const shuffledCandidates = candidateIds.sort(() => Math.random() - 0.5).slice(0, 3);
            const wrongAnswers = shuffledCandidates.map(id => {
                const sObj = window.surahList.find(s => s.no === id);
                return sObj ? sObj.nama : `Surah ${id}`;
            });

            questions.push({
                type: 'guess-surah',
                instruction: 'Potongan ayat berikut terdapat dalam surah...',
                question: questionText,
                options: [correctAnswerText, ...wrongAnswers].sort(() => Math.random() - 0.5),
                answer: correctAnswerText,
                isAnswered: false,
                userAnswer: null,
                isCorrect: null
            });
        }
    }
    return questions;
};

// Start a new tahfidz test session
window.startTest = async function(event) {
    if (event) event.preventDefault();

    const testTypeSelect = document.getElementById('test-type-select');
    const questionCountSelect = document.getElementById('test-question-count-select');
    const startBtn = document.getElementById('start-test-btn');
    
    if (!testTypeSelect || !questionCountSelect || !startBtn) return;

    const testType = testTypeSelect.value;
    const totalQuestions = parseInt(questionCountSelect.value);
    
    const mode = window.appState.activeTestMode || 'surah-range';
    const scopes = window.appState.testScopes;
    
    const juzDariSelect = document.getElementById('test-juz-select-dari');
    const juzSampaiSelect = document.getElementById('test-juz-select-sampai');
    const juzDari = juzDariSelect ? juzDariSelect.value : '';
    const juzSampai = juzSampaiSelect ? juzSampaiSelect.value : '';
    
    const rangeSurahDariSelect = document.getElementById('test-range-surah-dari');
    const rangeSurahSampaiSelect = document.getElementById('test-range-surah-sampai');
    const rangeSurahDari = rangeSurahDariSelect ? rangeSurahDariSelect.value : '';
    const rangeSurahSampai = rangeSurahSampaiSelect ? rangeSurahSampaiSelect.value : '';

    if (mode === 'surah' && scopes.length === 0) {
        window.showToast("Belum ada hafalan yang dipilih.", "error"); return;
    }
    if (mode === 'juz' && (!juzDari || !juzSampai)) {
        window.showToast("Pilih rentang juz terlebih dahulu.", "error"); return;
    }
    if (mode === 'surah-range' && (!rangeSurahDari || !rangeSurahSampai)) {
        window.showToast("Pilih rentang surah terlebih dahulu.", "error"); return;
    }

    startBtn.disabled = true;
    startBtn.textContent = 'Memuat Ayat...';

    try {
        const verses = await window.fetchVersesForTest({ mode, scopes, juzDari, juzSampai, rangeSurahDari, rangeSurahSampai });
        
        if (!verses || verses.length === 0) {
            window.showToast("Tidak ada ayat yang ditemukan.", "error"); return;
        }

        const questions = window.generateQuestions(verses, testType, totalQuestions);
        if (questions.length === 0) return;
        
        Object.assign(window.appState.currentTest, {
            isActive: true,
            questions: questions,
            currentQuestionIndex: 0,
            score: 0,
            settings: { mode, scopes, juzDari, juzSampai, rangeSurahDari, rangeSurahSampai, testType }
        });
        
        // Save to session storage
        sessionStorage.setItem('activeTestState', JSON.stringify(window.appState.currentTest));

        document.getElementById('test-step-2-scope')?.classList.add('hidden');
        document.getElementById('test-progress-view')?.classList.remove('hidden');
        
        window.displayCurrentQuestion();

    } catch (error) {
        console.error("Gagal memulai tes:", error);
        window.showToast(error.message, "error");
    } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Mulai Tes';
    }
};

// Render current question block in active test session
window.displayCurrentQuestion = function() {
    const test = window.appState.currentTest;
    const qNumEl = document.getElementById('current-question-number');
    const tQuesEl = document.getElementById('total-questions');
    const curScoreEl = document.getElementById('current-score');
    const qInstEl = document.getElementById('question-instruction');
    const qTextEl = document.getElementById('test-question-text');
    const ansOptsEl = document.getElementById('test-answer-options');
    const fbEl = document.getElementById('test-feedback');
    const prevBtn = document.getElementById('previous-question-btn');
    const nextBtn = document.getElementById('next-question-btn');

    if (!test.isActive || test.currentQuestionIndex >= test.questions.length) {
        window.endTest();
        return;
    }

    const q = test.questions[test.currentQuestionIndex];
    
    if (qNumEl) qNumEl.textContent = test.currentQuestionIndex + 1;
    if (tQuesEl) tQuesEl.textContent = test.questions.length;
    if (curScoreEl) curScoreEl.textContent = Math.round(test.score);
    if (qInstEl) qInstEl.textContent = q.instruction;
    
    if (qTextEl) {
        if (q.type === 'reorder-verses' && q.segments) {
            qTextEl.className = "w-full mb-6"; 
            let listHTML = `<div class="mb-4 mx-auto max-w-2xl space-y-2">`;
            q.segments.forEach((segment, i) => {
                listHTML += `
                    <div class="flex items-start justify-end gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p class="font-lateef text-2xl text-right font-normal leading-loose text-slate-800 flex-grow" dir="rtl">
                            ${segment}
                        </p>
                        <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold text-sm text-teal-600 bg-teal-50 rounded-full">
                            ${i + 1}
                        </div>
                    </div>
                `;
            });
            listHTML += `</div>`;
            listHTML += `<p class="text-sm text-slate-500 font-semibold mt-4 text-center">Susunan paling tepat pada potongan di atas adalah...</p>`;
            qTextEl.innerHTML = listHTML; 
        } else {
            qTextEl.className = "text-3xl font-lateef leading-relaxed text-slate-800 mb-6";
            qTextEl.textContent = q.question;
            qTextEl.dir = 'rtl';
        }
    }

    if (ansOptsEl) {
        ansOptsEl.innerHTML = '';
        q.options.forEach((option) => {
            const button = document.createElement('button');
            button.innerHTML = option;
            button.disabled = q.isAnswered;
            button.className = 'btn btn-secondary w-full py-3 px-4 rounded-xl text-center transition-all duration-200 border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50'; 
            
            const isArabicOption = (q.type === 'continue-verse' || q.type === 'previous-verse');
            if (isArabicOption) {
                button.classList.add('font-lateef', 'text-2xl');
                button.dir = 'rtl'; 
            } else {
                button.classList.add('text-base', 'font-medium');
                button.dir = 'ltr';
            }

            if (!q.isAnswered) {
                button.onclick = () => window.checkAnswer(option, q.answer);
            } else {
                if (option === q.answer) {
                    button.className = 'btn w-full py-3 px-4 rounded-xl text-center border bg-teal-100 text-teal-800 border-teal-500 font-bold';
                } else if (option === q.userAnswer && !q.isCorrect) {
                    button.className = 'btn w-full py-3 px-4 rounded-xl text-center border bg-red-100 text-red-800 border-red-500 font-bold';
                } else {
                    button.classList.add('opacity-40');
                }
                if (isArabicOption) button.classList.add('font-lateef', 'text-2xl');
            }
            ansOptsEl.appendChild(button);
        });
    }

    if (fbEl) {
        if (q.isAnswered) {
            fbEl.textContent = q.isCorrect ? "Benar!" : "Kurang Tepat";
            fbEl.className = `mt-4 text-center font-bold text-lg ${q.isCorrect ? 'text-teal-600' : 'text-red-600'}`;
            fbEl.classList.remove('hidden');
        } else {
            fbEl.classList.add('hidden');
        }
    }

    if (prevBtn) prevBtn.disabled = (test.currentQuestionIndex === 0);
    if (nextBtn) nextBtn.disabled = (test.currentQuestionIndex === test.questions.length - 1);
};

// Check interactive question answer
window.checkAnswer = function(selectedOption, correctAnswer) {
    const test = window.appState.currentTest;
    const q = test.questions[test.currentQuestionIndex];
    
    if (q.isAnswered) return; 

    const isCorrect = selectedOption === correctAnswer;
    q.isAnswered = true;
    q.userAnswer = selectedOption;
    q.isCorrect = isCorrect;

    const pointsPerQuestion = 100 / test.questions.length;
    test.score = test.questions.reduce((total, question) => {
        return total + (question.isCorrect ? pointsPerQuestion : 0);
    }, 0);
    
    sessionStorage.setItem('activeTestState', JSON.stringify(test));
    window.displayCurrentQuestion(); 
};

// Ends the test session, saves score grades to database and resets test state
window.endTest = async function() {
    const test = window.appState.currentTest;
    const finalRoundedScore = Math.round(test.score);

    const progressView = document.getElementById('test-progress-view');
    const resultView = document.getElementById('test-result-view');
    const finalScoreEl = document.getElementById('final-score');

    if (progressView) progressView.classList.add('hidden');
    if (resultView) resultView.classList.remove('hidden');
    if (finalScoreEl) finalScoreEl.textContent = finalRoundedScore;

    if (test.studentIds.length > 0) {
        const savePromises = test.studentIds.map(studentId => {
            let kualitas;
            if (finalRoundedScore >= 90) kualitas = 'sangat-lancar';
            else if (finalRoundedScore >= 70) kualitas = 'lancar';
            else if (finalRoundedScore >= 50) kualitas = 'cukup-lancar';
            else if (finalRoundedScore >= 30) kualitas = 'tidak-lancar';
            else kualitas = 'sangat-tidak-lancar';
            
            const { mode, scopes, juzDari, juzSampai, rangeSurahDari, rangeSurahSampai, testType } = test.settings;
            let materi = 'Materi Pilihan';

            if (mode === 'surah' && scopes && scopes.length > 0) {
                if (scopes.length === 1) {
                    materi = `${scopes[0].surahName} (${scopes[0].start}-${scopes[0].end})`;
                } else {
                    materi = `${scopes.length} Surah Pilihan`;
                }
            } else if (mode === 'juz' && juzDari) {
                materi = (juzDari === juzSampai) ? `Juz ${juzDari}` : `Juz ${juzDari} - ${juzSampai}`;
            } else if (mode === 'surah-range' && rangeSurahDari) {
                const n1 = window.surahList.find(s => s.no == rangeSurahDari)?.nama;
                const n2 = window.surahList.find(s => s.no == rangeSurahSampai)?.nama;
                materi = `Rentang: ${n1} s.d. ${n2}`;
            }

            const newEntry = {
                studentId: studentId,
                jenis: 'tes', 
                kualitas: kualitas,
                surahNo: 0, 
                ayatDari: 0, 
                ayatSampai: 0,
                catatan: `Skor: ${finalRoundedScore} dari ${test.questions.length} Soal | Materi: ${materi}`,
                testType: testType, 
                timestamp: Date.now(),
                lembagaId: window.appState.lembagaId || sessionStorage.getItem('lembagaId'),
                guruId: window.appState.currentUserUID || sessionStorage.getItem('currentUserUID')
            };

            return window.db.collection('hafalan').add(newEntry);
        });

        try {
            await Promise.all(savePromises);
            window.showToast("Hasil tes berhasil disimpan ke riwayat.", "success");
        } catch (error) {
            console.error("Gagal menyimpan hasil tes:", error);
            window.showToast("Gagal menyimpan hasil tes.", "error");
        }
    }
    window.appState.currentTest.isActive = false;
    sessionStorage.removeItem('activeTestState');
};

window.restartTest = function() {
    document.getElementById('test-result-view')?.classList.add('hidden');
    document.getElementById('test-progress-view')?.classList.add('hidden');
    document.getElementById('test-step-2-scope')?.classList.add('hidden');
    document.getElementById('test-step-1-type')?.classList.remove('hidden');

    const selectDari = document.getElementById('test-surah-select-dari');
    const selectSampai = document.getElementById('test-surah-select-sampai');
    const juzDari = document.getElementById('test-juz-select-dari');
    const juzSampai = document.getElementById('test-juz-select-sampai');
    
    if (selectDari) selectDari.value = '';
    if (selectSampai) selectSampai.value = '';
    if (juzDari) juzDari.value = '';
    if (juzSampai) juzSampai.value = '';
    
    window.appState.currentTest.studentIds = [];
    window.renderSelectedStudentsForTest();
    sessionStorage.removeItem('activeTestState');
};

window.searchStudentsForTest = function() {
    const searchInput = document.getElementById('test-student-search-input');
    const resultsContainer = document.getElementById('test-student-search-results');
    if (!searchInput || !resultsContainer) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    resultsContainer.innerHTML = '';

    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }

    const selectedIds = window.appState.currentTest.studentIds;
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
            item.className = 'p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer';
            item.innerHTML = `<p class="font-bold text-slate-700 text-sm">${student.name}</p><p class="text-xs text-slate-500">${studentClass ? studentClass.name : 'Tanpa Kelas'}</p>`;
            item.dataset.studentId = student.id;
            resultsContainer.appendChild(item);
        });
        resultsContainer.classList.remove('hidden');
    } else {
        resultsContainer.classList.add('hidden');
    }
};

window.renderSelectedStudentsForTest = function() {
    const listEl = document.getElementById('test-selected-students-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const selectedIds = window.appState.currentTest.studentIds;

    selectedIds.forEach(studentId => {
        const student = window.appState.allStudents.find(s => s.id === studentId);
        if (student) {
            const tag = document.createElement('div');
            tag.className = 'flex items-center gap-1.5 bg-teal-50 border border-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full';
            tag.innerHTML = `
                <span>${student.name}</span>
                <button type="button" data-action="remove-student" data-id="${student.id}" class="text-teal-500 hover:text-teal-700 font-bold ml-1 text-sm leading-none">&times;</button>
            `;
            listEl.appendChild(tag);
        }
    });
};

window.addStudentToTest = function(studentId) {
    const { studentIds } = window.appState.currentTest;
    if (!studentIds.includes(studentId)) {
        studentIds.push(studentId);
        window.renderSelectedStudentsForTest();
    }
    const searchInput = document.getElementById('test-student-search-input');
    const resultsContainer = document.getElementById('test-student-search-results');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.classList.add('hidden');
};

window.removeStudentFromTest = function(studentId) {
    window.appState.currentTest.studentIds = window.appState.currentTest.studentIds.filter(id => id !== studentId);
    window.renderSelectedStudentsForTest();
};

// Word STS Document Generator called from click events
window.handleDownloadWord = async function(e) {
    if (e) e.preventDefault();
    
    const testTypeSelect = document.getElementById('test-type-select');
    const questionCountSelect = document.getElementById('test-question-count-select');
    const downloadWordBtn = document.getElementById('download-word-btn');
    
    if (!testTypeSelect || !questionCountSelect || !downloadWordBtn) return;

    const testType = testTypeSelect.value;
    const totalQuestions = parseInt(questionCountSelect.value);
    
    const mode = window.appState.activeTestMode || 'surah-range';
    const scopes = window.appState.testScopes;
    
    const juzDariSelect = document.getElementById('test-juz-select-dari');
    const juzSampaiSelect = document.getElementById('test-juz-select-sampai');
    const juzDari = juzDariSelect ? juzDariSelect.value : '';
    const juzSampai = juzSampaiSelect ? juzSampaiSelect.value : '';

    const rangeSurahDariSelect = document.getElementById('test-range-surah-dari');
    const rangeSurahSampaiSelect = document.getElementById('test-range-surah-sampai');
    const rangeSurahDari = rangeSurahDariSelect ? rangeSurahDariSelect.value : '';
    const rangeSurahSampai = rangeSurahSampaiSelect ? rangeSurahSampaiSelect.value : '';

    if (mode === 'surah' && scopes.length === 0) {
        window.showToast("Belum ada hafalan yang dipilih.", "error"); return;
    }
    if (mode === 'juz') {
        if (!juzDari || !juzSampai) { window.showToast("Pilih rentang juz dulu.", "error"); return; }
    }
    if (mode === 'surah-range' && (!rangeSurahDari || !rangeSurahSampai)) {
        window.showToast("Pilih rentang surah terlebih dahulu.", "error"); return;
    }

    downloadWordBtn.disabled = true;
    downloadWordBtn.textContent = 'Mengekspor...';

    try {
        const verses = await window.fetchVersesForTest({ 
            mode, scopes, juzDari, juzSampai, rangeSurahDari, rangeSurahSampai 
        });

        if (!verses || verses.length === 0) throw new Error("Tidak ada ayat ditemukan.");

        const questions = window.generateQuestions(verses, testType, totalQuestions);
        if (!questions.length) throw new Error("Gagal membuat soal.");

        const contentHTML = window.generateWordContent(questions, testType);

        const converted = htmlDocx.asBlob(contentHTML, {
            orientation: 'portrait',
            margins: { top: 720, right: 720, bottom: 720, left: 720 }
        });

        saveAs(converted, `Soal_Tahfidz_${testType}_${new Date().toISOString().slice(0,10)}.docx`);
        window.showToast("Soal berhasil diunduh!", "success");

    } catch (error) {
        console.error(error);
        window.showToast("Gagal: " + error.message, "error");
    } finally {
        downloadWordBtn.disabled = false;
        downloadWordBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Ekspor Word (STS)</span>`;
    }
};

window.generateWordContent = function(questions, testType) {
    const tahunAjaran = "2025/2026";
    let instruksiUmum = "Pilihlah jawaban yang benar dengan mengisi huruf kapital (A,B,C atau D) pada lembar jawaban yang sudah disediakan!";
    
    if (testType === 'reorder-verses') {
        instruksiUmum = "Susunan paling tepat pada kalimat di atas adalah...";
    }

    const sReset = "margin: 0pt; padding: 0pt; font-size: 12pt; line-height: 14pt; mso-line-height-rule: exactly; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; font-family: 'Times New Roman', serif;";
    const sBold = `font-weight: bold; ${sReset}`;
    const sTable = `width: 100%; border-collapse: collapse; border: none; ${sReset}`;
    const sTdContent = `vertical-align: top; width: 47%; padding: 0pt; ${sReset}`;
    const sTdSpacer = `width: 6%; padding: 0pt; ${sReset}`;

    const sFooterTable = `width: auto; margin: 0 auto; border-collapse: collapse; border: 1px solid black; text-align: center; ${sReset}`;
    const sFooterCellHead = `width: 0.9cm; border: 1px solid black; font-weight: bold; vertical-align: middle; height: 14pt; ${sReset}`;
    const sFooterCellEmpty = `width: 0.9cm; border: 1px solid black; vertical-align: middle; height: 20pt; ${sReset}`;
    const sLabelInfo = `width: 15%; ${sReset}`;
    const sSepInfo = `width: 1%; text-align: center; ${sReset}`;
    const sValInfo = `width: 34%; border-bottom: 1px dotted #999; ${sReset}`;

    const css = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Lateef:wght@400;700&display=swap');
            @page { 
                size: 21cm 29.7cm; 
                margin: 1.0cm;
                mso-page-orientation: portrait;
                mso-footer: f1; 
            }
            body { margin: 0; padding: 0; }
            * { margin: 0; padding: 0; text-indent: 0; }
            .lateef-regular { font-family: "Lateef", serif; font-weight: 400; }
            p.MsoFooter {
                margin: 0cm; font-size: 10.0pt; font-family: "Times New Roman", serif; text-align: right;
            }
        </style>
    `;

    const COLS_PER_ROW = 20; 
    let answerGridHTML = '';
    const totalQs = questions.length;

    for (let start = 0; start < totalQs; start += COLS_PER_ROW) {
        const end = Math.min(start + COLS_PER_ROW, totalQs);
        let headerRow = '';
        for (let k = start; k < end; k++) headerRow += `<td style="${sFooterCellHead}">${k + 1}</td>`;
        for (let k = end; k < start + COLS_PER_ROW; k++) headerRow += `<td style="${sFooterCellHead} background-color: #eee;"></td>`;

        let answerRow = '';
        for (let k = start; k < end; k++) answerRow += `<td style="${sFooterCellEmpty}"></td>`;
        for (let k = end; k < start + COLS_PER_ROW; k++) answerRow += `<td style="${sFooterCellEmpty} background-color: #eee;"></td>`;

        answerGridHTML += `<table border="1" cellspacing="0" cellpadding="0" style="${sFooterTable} margin-bottom: 10pt;"><tr>${headerRow}</tr><tr>${answerRow}</tr></table>`;
    }

    const lembarJawabanBlock = `
        <div style="${sReset} border: 1px solid #000; padding: 10pt; margin-bottom: 0pt;">
            <div style="text-align: center; ${sBold} text-decoration: underline;">LEMBAR JAWABAN MAPEL TAHFIDZ</div>
            <div style="${sReset} height: 10pt;"></div>
            <table style="${sTable} margin-bottom: 10pt;">
                <tr>
                    <td style="${sLabelInfo}">NAMA</td><td style="${sSepInfo}">:</td><td style="${sValInfo}">&nbsp;</td>
                    <td style="width: 5%;">&nbsp;</td>
                    <td style="${sLabelInfo}">HARI/TANGGAL</td><td style="${sSepInfo}">:</td><td style="${sValInfo}">&nbsp;</td>
                </tr>
                <tr style="height: 5pt;"></tr>
                <tr>
                    <td style="${sLabelInfo}">KELAS</td><td style="${sSepInfo}">:</td><td style="${sValInfo}">&nbsp;</td>
                    <td>&nbsp;</td>
                    <td style="${sLabelInfo}">WAKTU</td><td style="${sSepInfo}">:</td><td style="${sValInfo}">&nbsp;</td>
                </tr>
            </table>
            <div style="${sBold}">PILIHAN GANDA</div>
            <div style="${sReset} height: 5pt;"></div>
            ${answerGridHTML}
        </div>
    `;

    let content = `
        <div style="text-align: center; font-size: 14pt; text-transform: uppercase; ${sBold}">SUMATIF TENGAH SEMESTER (STS) TAHUN PELAJARAN ${tahunAjaran}</div>
        <div style="${sReset} height: 20pt;"></div> 
        ${lembarJawabanBlock}
        <div style="${sReset} height: 20pt;"></div>
        <div style="${sBold}">A. ${instruksiUmum}</div>
        <div style="${sReset} height: 10pt;"></div>
    `;

    const half = Math.ceil(questions.length / 2);
    let leftColumnHTML = "";
    for (let i = 0; i < half; i++) {
        if (i < questions.length) {
            leftColumnHTML += window.buildQuestionBlock(questions[i], i, sReset);
            leftColumnHTML += `<div style="${sReset} height: 10pt;"></div>`; 
        }
    }

    let rightColumnHTML = "";
    for (let i = half; i < questions.length; i++) {
        rightColumnHTML += window.buildQuestionBlock(questions[i], i, sReset);
        rightColumnHTML += `<div style="${sReset} height: 10pt;"></div>`;
    }

    content += `<table style="${sTable}" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td style="${sTdContent}">${leftColumnHTML}</td>
            <td style="${sTdSpacer}">&nbsp;</td>
            <td style="${sTdContent}">${rightColumnHTML}</td>
        </tr>
    </table>`;

    let keyContent = `<div style="page-break-before: always; clear: both;"></div>`;
    keyContent += `<div style="text-align: center; font-size: 14pt; text-transform: uppercase; ${sBold} margin-bottom: 15pt;">KUNCI JAWABAN</div>`;
    const COLS_KEY = 5; 
    keyContent += `<table style="${sTable} width: 100%; border: 1px solid black;">`;
    for (let i = 0; i < questions.length; i += COLS_KEY) {
        keyContent += `<tr>`;
        for (let j = 0; j < COLS_KEY; j++) {
            const qIndex = i + j;
            if (qIndex < questions.length) {
                const q = questions[qIndex];
                const ansIndex = q.options.indexOf(q.answer);
                const ansLetter = (ansIndex !== -1) ? String.fromCharCode(65 + ansIndex) : '?';
                keyContent += `<td style="${sReset} border: 1px solid black; padding: 5pt;"><span style="font-weight:bold;">${qIndex + 1}.</span> ${ansLetter}</td>`;
            } else {
                keyContent += `<td style="${sReset} border: 1px solid black;"></td>`;
            }
        }
        keyContent += `</tr>`;
    }
    keyContent += `</table>`;
    content += keyContent;

    const pageNumberFooter = `<div style="mso-element:footer" id="f1"><p class="MsoFooter"><span style='mso-field-code: " PAGE "'></span></p></div>`;

    return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">${css}</head><body style="margin:0; padding:0;">${content}${pageNumberFooter}</body></html>`;
};

window.buildQuestionBlock = function(q, index, sReset) {
    const LRM = '\u200E'; 
    let promptText = "";
    if (q.type === 'continue-verse') promptText = "Kalimat setelahnya adalah …."; 
    else if (q.type === 'previous-verse') promptText = "Kalimat sebelumnya adalah ….";
    else if (q.type === 'guess-surah') promptText = "Ayat tersebut terdapat dalam surah ….";
    else if (q.type === 'reorder-verses') promptText = "Susunan paling tepat pada kalimat di atas adalah...";

    promptText = LRM + promptText + LRM;

    if (!sReset) sReset = "margin: 0pt; padding: 0pt; font-size: 12pt; line-height: 14pt; mso-line-height-rule: exactly; mso-margin-top-alt: 0pt; mso-margin-bottom-alt: 0pt; font-family: 'Times New Roman', serif;";

    const sArab = `font-family: 'Lateef', serif; font-size: 14pt; font-weight: 400; direction: rtl; text-align: right; margin: 0pt; padding: 0pt; line-height: 14pt; mso-line-height-rule: exactly;`;
    const sLatinDiv = `${sReset} text-align: left; direction: ltr; unicode-bidi: embed;`;

    let html = `<table cellpadding="0" cellspacing="0" style="width: 100%; border: none; border-spacing: 0; ${sReset}"><tr>`;
    html += `<td valign="top" width="20" style="${sReset}">${index + 1}.</td>`;
    html += `<td valign="top" style="padding: 0; margin: 0;">`;
    
    if (q.type !== 'reorder-verses') {
        html += `<div style="${sArab} padding-right: 3pt;">${q.question}</div>`;
        html += `<div lang="id-ID" style="${sLatinDiv}">${promptText}</div>`;
        
        const isOptionLatin = (q.type === 'guess-surah');
        const optionStyle = isOptionLatin ? `${sReset}` : `${sArab} padding-right: 5pt;`;
        
        html += `<table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 0pt; border-spacing: 0; ${sReset}">`;
        q.options.forEach((opt, i) => {
            const label = String.fromCharCode(65 + i);
            html += `<tr style="${sReset}">
                <td width="18" valign="top" style="${sReset}">${label}.</td>
                <td valign="top" style="${optionStyle}">${opt}</td>
            </tr>`;
        });
        html += `</table>`;

    } else {
        html += `<div lang="id-ID" style="${sLatinDiv}">Perhatikan kalimat berikut.</div>`;
        html += `<table cellpadding="0" cellspacing="0" style="width: 100%; border-spacing: 0; border-collapse: collapse; margin-top: 0pt; ${sReset}">`;
        const segmentsToRender = q.segments || q.options;
        segmentsToRender.forEach((text, i) => {
            html += `<tr style="${sReset}">
                <td width="15" valign="middle" style="${sReset}">${i+1}.</td>
                <td style="${sArab} padding-right: 5pt;">${text}</td>
            </tr>`;
        });
        html += `</table>`;
        html += `<div lang="id-ID" style="${sLatinDiv} margin-top: 2pt;">${promptText}</div>`;
        
        html += `<table cellpadding="0" cellspacing="0" style="width: 100%; border-spacing: 0; margin-top: 0pt; ${sReset}">`;
        q.options.forEach((opt, i) => {
             const label = String.fromCharCode(65 + i);
             html += `<tr style="${sReset}">
                <td width="20" style="${sReset}">${label}.</td>
                <td style="${sReset}">${opt}</td>
             </tr>`;
        });
        html += `</table>`;
    }

    html += `</td></tr></table>`;
    return html;
};

// Document-level listeners
document.addEventListener('DOMContentLoaded', () => {
    // Populate test selectors on load
    const flexSelect = document.getElementById('test-flex-surah-select');
    if (flexSelect) {
        const surahOptions = '<option value="">-- Pilih Surah --</option>' + window.surahList.map(s => `<option value="${s.no}" data-ayat="${s.ayat}">${s.no}. ${s.nama} (${s.ayat} ayat)</option>`).join('');
        flexSelect.innerHTML = surahOptions;
        
        const dariSelect = document.getElementById('test-range-surah-dari');
        const sampaiSelect = document.getElementById('test-range-surah-sampai');
        if (dariSelect) dariSelect.innerHTML = surahOptions.replace('-- Pilih Surah --', '-- Dari Surah --');
        if (sampaiSelect) sampaiSelect.innerHTML = surahOptions.replace('-- Pilih Surah --', '-- Sampai Surah --');

        const juzDariSelect = document.getElementById('test-juz-select-dari');
        const juzSampaiSelect = document.getElementById('test-juz-select-sampai');
        const juzOptions = '<option value="">-- Dari Juz --</option>' + Array.from({length: 30}, (_, i) => `<option value="${i + 1}">Juz ${i + 1}</option>`).join('');
        if (juzDariSelect) juzDariSelect.innerHTML = juzOptions;
        if (juzSampaiSelect) juzSampaiSelect.innerHTML = juzOptions.replace('-- Dari Juz --', '-- Sampai Juz --');
    }

    // Tab swapper triggers
    const applyTabStyles = (activeTab, allTabs) => {
        allTabs.forEach(tab => {
            if (tab === activeTab) {
                tab.style.backgroundColor = '#14b8a6'; 
                tab.style.color = '#ffffff';           
                tab.style.fontWeight = 'bold';
                tab.classList.add('shadow-md');
            } else {
                tab.style.backgroundColor = 'transparent';
                tab.style.color = '#64748b';           
                tab.style.fontWeight = '500';
                tab.classList.remove('shadow-md');
            }
        });
    };

    const tabSurah = document.getElementById('tab-mode-surah');
    const tabSurahRange = document.getElementById('tab-mode-surah-range');
    const tabJuz = document.getElementById('tab-mode-juz');
    
    const panelSurah = document.getElementById('panel-mode-surah');
    const panelSurahRange = document.getElementById('panel-mode-surah-range');
    const panelJuz = document.getElementById('panel-mode-juz');

    const switchTab = (mode) => {
        window.appState.activeTestMode = mode;
        if (panelSurah) panelSurah.classList.add('hidden');
        if (panelSurahRange) panelSurahRange.classList.add('hidden');
        if (panelJuz) panelJuz.classList.add('hidden');

        if (mode === 'surah') {
            if (panelSurah) panelSurah.classList.remove('hidden');
            applyTabStyles(tabSurah, [tabSurah, tabSurahRange, tabJuz]);
        } else if (mode === 'surah-range') {
            if (panelSurahRange) panelSurahRange.classList.remove('hidden');
            applyTabStyles(tabSurahRange, [tabSurah, tabSurahRange, tabJuz]);
        } else if (mode === 'juz') {
            if (panelJuz) panelJuz.classList.remove('hidden');
            applyTabStyles(tabJuz, [tabSurah, tabSurahRange, tabJuz]);
        }
    };

    if (tabSurah) tabSurah.addEventListener('click', () => switchTab('surah'));
    if (tabSurahRange) tabSurahRange.addEventListener('click', () => switchTab('surah-range'));
    if (tabJuz) tabJuz.addEventListener('click', () => switchTab('juz'));

    // Step navigation buttons
    const nextStepBtn = document.getElementById('test-next-step-btn');
    const backStepBtn = document.getElementById('test-back-step-btn');
    const step1View = document.getElementById('test-step-1-type');
    const step2View = document.getElementById('test-step-2-scope');

    if (nextStepBtn && step1View && step2View) {
        nextStepBtn.addEventListener('click', () => {
            const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');
            if (role === 'siswa') {
                const currentUserUID = window.appState.currentUserUID || sessionStorage.getItem('currentUserUID');
                const student = window.appState.allStudents.find(s => s.userId === currentUserUID);
                if (student) {
                    window.appState.currentTest.studentIds = [student.id];
                } else {
                    window.showToast("Gagal menemukan profil siswa Anda.", "error");
                    return; 
                }
            }
            step1View.classList.add('hidden');
            step2View.classList.remove('hidden');
        });
    }

    if (backStepBtn && step1View && step2View) {
        backStepBtn.addEventListener('click', () => {
            step2View.classList.add('hidden');
            step1View.classList.remove('hidden');
        });
    }

    // Student selection inside test setup
    const testSearchInput = document.getElementById('test-student-search-input');
    if (testSearchInput) {
        testSearchInput.addEventListener('input', window.searchStudentsForTest);
        testSearchInput.addEventListener('focus', window.searchStudentsForTest);
    }

    const testSearchResults = document.getElementById('test-student-search-results');
    if (testSearchResults) {
        testSearchResults.addEventListener('click', (e) => {
            const item = e.target.closest('div[data-student-id]');
            if (item) {
                window.addStudentToTest(item.dataset.studentId);
            }
        });
    }

    const selectedStudentsList = document.getElementById('test-selected-students-list');
    if (selectedStudentsList) {
        selectedStudentsList.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('button[data-id]');
            if (removeBtn) {
                window.removeStudentFromTest(removeBtn.dataset.id);
            }
        });
    }

    // Flexible custom scopes tambah button
    const btnAddScope = document.getElementById('btn-add-scope');
    const scopeListContainer = document.getElementById('test-scope-list');
    const emptyScopeMsg = document.getElementById('empty-scope-msg');

    if (btnAddScope && scopeListContainer) {
        btnAddScope.addEventListener('click', () => {
            const flexSurahSelect = document.getElementById('test-flex-surah-select');
            if (!flexSurahSelect) return;

            const surahNo = parseInt(flexSurahSelect.value);
            if (!surahNo) return window.showToast("Pilih surah terlebih dahulu.", "error");

            const selectedOption = flexSurahSelect.options[flexSurahSelect.selectedIndex];
            const surahName = selectedOption.text.split('(')[0].trim();
            const maxAyat = parseInt(selectedOption.dataset.ayat);
            
            const startInput = document.getElementById('test-flex-ayat-start');
            const endInput = document.getElementById('test-flex-ayat-end');
            
            let start = startInput ? parseInt(startInput.value) || 1 : 1;
            let end = endInput ? parseInt(endInput.value) || maxAyat : maxAyat;

            if (start < 1) start = 1;
            if (end > maxAyat) end = maxAyat;
            if (start > end) [start, end] = [end, start];

            const scopeKey = `${surahNo}_${start}_${end}`;
            if (window.appState.testScopes.some(s => s.key === scopeKey)) {
                return window.showToast("Scope ini sudah ditambahkan.", "error");
            }

            const newScope = { key: scopeKey, surahNo, surahName, start, end };
            window.appState.testScopes.push(newScope);

            if (emptyScopeMsg) emptyScopeMsg.classList.add('hidden');

            const tag = document.createElement('div');
            tag.className = 'inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full';
            tag.dataset.key = scopeKey;
            tag.innerHTML = `
                <span>${surahName}: ${start}-${end}</span>
                <button type="button" class="remove-scope-btn text-slate-400 hover:text-red-500 font-bold ml-1 text-sm leading-none">&times;</button>
            `;
            scopeListContainer.appendChild(tag);

            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
        });
    }

    if (scopeListContainer) {
        scopeListContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-scope-btn');
            if (removeBtn) {
                const tag = removeBtn.closest('div');
                const key = tag.dataset.key;
                window.appState.testScopes = window.appState.testScopes.filter(s => s.key !== key);
                tag.remove();

                if (window.appState.testScopes.length === 0 && emptyScopeMsg) {
                    emptyScopeMsg.classList.remove('hidden');
                }
            }
        });
    }

    // Start Test, Word download, End, and Restart buttons binding
    const startTestBtn = document.getElementById('start-test-btn');
    if (startTestBtn) startTestBtn.addEventListener('click', window.startTest);

    const downloadWordBtn = document.getElementById('download-word-btn');
    if (downloadWordBtn) downloadWordBtn.addEventListener('click', window.handleDownloadWord);

    const endTestBtn = document.getElementById('end-test-btn');
    if (endTestBtn) endTestBtn.addEventListener('click', window.endTest);

    const restartTestBtn = document.getElementById('restart-test-btn');
    if (restartTestBtn) restartTestBtn.addEventListener('click', window.restartTest);

    // Prev / Next question navigation
    const prevQBtn = document.getElementById('previous-question-btn');
    if (prevQBtn) {
        prevQBtn.addEventListener('click', () => {
            const test = window.appState.currentTest;
            if (test.currentQuestionIndex > 0) {
                test.currentQuestionIndex--;
                sessionStorage.setItem('activeTestState', JSON.stringify(test));
                window.displayCurrentQuestion();
            }
        });
    }

    const nextQBtn = document.getElementById('next-question-btn');
    if (nextQBtn) {
        nextQBtn.addEventListener('click', () => {
            const test = window.appState.currentTest;
            if (test.currentQuestionIndex < test.questions.length - 1) {
                test.currentQuestionIndex++;
                sessionStorage.setItem('activeTestState', JSON.stringify(test));
                window.displayCurrentQuestion();
            }
        });
    }
});
