// js/profile-settings.js
// Profile & Settings handlers

window.setButtonLoading = function(button, isLoading) {
    if (!button) return;
    const span = button.querySelector('span');
    const text = span ? span.textContent : '';

    if (isLoading) {
        button.disabled = true;
        if (!button.dataset.originalContent) {
            button.dataset.originalContent = button.innerHTML;
        }
        button.innerHTML = `<span class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white mr-2"></span><span>Memproses...</span>`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalContent || button.innerHTML;
    }
};

window.populateProfileForm = function() {
    const currentUserUID = window.appState.currentUserUID;
    const userProfile = window.appState.allUsers.find(u => u.id === currentUserUID);

    const previewEl = document.getElementById('profile-picture-preview'); 
    if (!previewEl) return;

    // URL Placeholder default
    let placeholder = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

    if (userProfile) {
        if (userProfile.namaLengkap && userProfile.namaLengkap.length > 0) {
            const firstLetter = userProfile.namaLengkap.charAt(0).toUpperCase();
            if (firstLetter.match(/[A-Z]/i)) { 
                placeholder = `https://placehold.co/128x128/e2e8f0/94a3b8?text=${firstLetter}`;
            }
        }

        const fullNameInput = document.getElementById('profile-fullname');
        const pobInput = document.getElementById('profile-pob');
        
        if (fullNameInput) fullNameInput.value = userProfile.namaLengkap || '';
        if (pobInput) pobInput.value = userProfile.ttl || '';

        const iconData = userProfile.fotoProfilUrl;

        previewEl.onerror = function() {
            previewEl.src = placeholder;
        };

        if (iconData && (iconData.startsWith('http') || iconData.startsWith('https:'))) {
            previewEl.src = iconData; 
        } else { 
            previewEl.src = placeholder;
        }

        const role = window.appState.loggedInRole;
        if (fullNameInput) {
            if (role === 'admin_lembaga') {
                fullNameInput.disabled = false;
                fullNameInput.placeholder = "Masukkan nama lengkap Anda";
            } else {
                fullNameInput.disabled = true;
                fullNameInput.placeholder = "Nama diatur oleh Admin";
            }
        }
    } else {
        previewEl.onerror = function() { /* do nothing */ };
        previewEl.src = placeholder;
    }
};

window.populateSettingsForms = function() {
    const quranScopeForm = document.getElementById('quran-scope-form');
    const lingkupCard = quranScopeForm ? quranScopeForm.closest('.card') : null;
    const pinCard = document.getElementById('guru-pin-settings-card');
    const mutqinCard = document.getElementById('mutqin-settings-card');
    const backupCard = document.getElementById('backup-db-btn') ? document.getElementById('backup-db-btn').closest('.card') : null;

    const role = window.appState.loggedInRole;

    if (role === 'guru') {
        if (lingkupCard) lingkupCard.classList.remove('hidden');
        if (pinCard) pinCard.classList.remove('hidden');
        if (mutqinCard) mutqinCard.classList.remove('hidden');
        if (backupCard) backupCard.classList.remove('hidden');
    } else if (role === 'siswa') {
        if (lingkupCard) lingkupCard.classList.remove('hidden');
        if (pinCard) pinCard.classList.add('hidden');
        if (mutqinCard) mutqinCard.classList.add('hidden');
        if (backupCard) backupCard.classList.add('hidden');
    } else if (role === 'admin_lembaga') {
        if (lingkupCard) lingkupCard.classList.add('hidden');
        if (pinCard) pinCard.classList.add('hidden');
        if (mutqinCard) mutqinCard.classList.add('hidden');
        if (backupCard) backupCard.classList.remove('hidden');
    }

    const quranScopeSelect = document.getElementById('quran-scope-setting');
    if (quranScopeSelect) {
        quranScopeSelect.value = window.appState.pengaturan.lingkupHafalan || 'full';
    }

    if (role === 'guru') {
        const scores = window.getMutqinScores();
        const scoreSangatLancar = document.getElementById('score-sangat-lancar');
        const scoreLancar = document.getElementById('score-lancar');
        const scoreCukupLancar = document.getElementById('score-cukup-lancar');
        const scoreTidakLancar = document.getElementById('score-tidak-lancar');
        const scoreSangatTidakLancar = document.getElementById('score-sangat-tidak-lancar');

        if (scoreSangatLancar) scoreSangatLancar.value = scores['sangat-lancar'] !== undefined ? scores['sangat-lancar'] : 100;
        if (scoreLancar) scoreLancar.value = scores['lancar'] !== undefined ? scores['lancar'] : 90;
        if (scoreCukupLancar) scoreCukupLancar.value = scores['cukup-lancar'] !== undefined ? scores['cukup-lancar'] : 70;
        if (scoreTidakLancar) scoreTidakLancar.value = scores['tidak-lancar'] !== undefined ? scores['tidak-lancar'] : 50;
        if (scoreSangatTidakLancar) scoreSangatTidakLancar.value = scores['sangat-tidak-lancar'] !== undefined ? scores['sangat-tidak-lancar'] : 30;

        const currentUser = window.appState.allUsers.find(u => u.id === window.appState.currentUserUID);
        const pinInput = document.getElementById('guru-pin-input');
        if (currentUser && currentUser.pin && pinInput) {
            pinInput.value = currentUser.pin;
        }
    }
};

async function saveMutqinScores(scores) {
    const currentUserUID = window.appState.currentUserUID;
    if (!currentUserUID) return showToast("Error: User tidak teridentifikasi.", "error");

    try {
        const snapshot = await db.collection('pengaturan')
            .where('nama', '==', 'skorMutqin')
            .where('userId', '==', currentUserUID)
            .get();

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await db.collection('pengaturan').doc(docId).update({ scores });
        } else {
            await db.collection('pengaturan').add({
                nama: 'skorMutqin',
                scores: scores,
                userId: currentUserUID
            });
        }
        window.appState.pengaturan.skorMutqin = scores;
        showToast("Pengaturan skor pribadi berhasil disimpan.");
        if (typeof renderAll === 'function') renderAll();
    } catch (e) { 
        console.error("Error saat menyimpan skor: ", e);
        showToast("Terjadi kesalahan saat menyimpan.", "error");
    }
}

async function saveQuranScope(scope) {
    const currentUserUID = window.appState.currentUserUID;
    if (!currentUserUID) return showToast("Error: User tidak teridentifikasi.", "error");

    try {
        const snapshot = await db.collection('pengaturan')
            .where('nama', '==', 'lingkupHafalan')
            .where('userId', '==', currentUserUID)
            .get();

        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await db.collection('pengaturan').doc(docId).update({ scope });
        } else {
            await db.collection('pengaturan').add({
                nama: 'lingkupHafalan',
                scope: scope,
                userId: currentUserUID
            });
        }
        window.appState.pengaturan.lingkupHafalan = scope;
        showToast("Pengaturan lingkup pribadi berhasil disimpan.");
        if (typeof renderAll === 'function') renderAll();
    } catch(e) { 
        console.error("Error saat menyimpan lingkup: ", e);
        showToast("Terjadi kesalahan saat menyimpan.", "error");
    }
}

// Database Backup (JSON Export)
window.exportDatabaseBackup = function() {
    const data = {
        version: "1.0",
        timestamp: Date.now(),
        allClasses: window.appState.allClasses,
        allStudents: window.appState.allStudents,
        allHafalan: window.appState.allHafalan,
        allUsers: window.appState.allUsers
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hafalanqu_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup database berhasil diunduh.");
};

// Database Restore (JSON Import)
window.importDatabaseBackup = async function(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.allClasses || !data.allStudents || !data.allHafalan) {
                showToast("Format file backup tidak valid.", "error");
                return;
            }
            
            showConfirmModal({
                title: "Pulihkan Database",
                message: "Apakah Anda yakin ingin memulihkan database dari file backup? Ini akan menggabungkan atau menimpa data yang memiliki ID sama.",
                okText: "Ya, Pulihkan",
                onConfirm: async () => {
                    showToast("Sedang memulihkan data...", "info");
                    
                    const batchSet = async (collectionName, items) => {
                        if (!items || !items.length) return;
                        for (const item of items) {
                            if (!item.id) continue;
                            const docData = { ...item };
                            delete docData.id; 
                            await db.collection(collectionName).doc(item.id).set(docData, { merge: true });
                        }
                    };
                    
                    try {
                        await batchSet('classes', data.allClasses);
                        await batchSet('students', data.allStudents);
                        await batchSet('hafalan', data.allHafalan);
                        if (data.allUsers) {
                            await batchSet('users', data.allUsers);
                        }
                        showToast("Pemulihan database berhasil diselesaikan!", "success");
                        if (typeof renderAll === 'function') renderAll();
                    } catch (err) {
                        console.error("Gagal memulihkan database:", err);
                        showToast("Gagal memulihkan sebagian data.", "error");
                    }
                }
            });
        } catch (err) {
            console.error("Gagal membaca file backup:", err);
            showToast("File backup rusak atau tidak valid.", "error");
        }
    };
    reader.readAsText(file);
};

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // --- Profile Form Submit ---
    const profileForm = document.getElementById('profile-form');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUserUID = window.appState.currentUserUID;
            if (!currentUserUID) return showToast("Gagal menyimpan, user tidak ditemukan.", "error");

            window.setButtonLoading(saveProfileBtn, true);
            const fullNameInput = document.getElementById('profile-fullname');
            const pobInput = document.getElementById('profile-pob');

            const updatedData = {
                ttl: pobInput ? pobInput.value.trim() : "",
            };

            if (window.appState.loggedInRole === 'admin_lembaga') {
                updatedData.namaLengkap = fullNameInput ? fullNameInput.value.trim() : "";
            }

            try {
                await db.collection('users').doc(currentUserUID).update(updatedData);
                showToast("Profil berhasil diperbarui.", "success");
            } catch (error) {
                console.error("Gagal update profil:", error);
                showToast("Gagal menyimpan perubahan.", "error");
            } finally {
                window.setButtonLoading(saveProfileBtn, false);
            }
        });
    }

    // --- Profile Photo Upload ---
    const pictureInput = document.getElementById('profile-picture-input');
    const picturePreview = document.getElementById('profile-picture-preview');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress');

    if (pictureInput) {
        pictureInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { 
                showToast("Ukuran file terlalu besar. Maksimal 2MB.", "error");
                return;
            }

            const currentUserUID = window.appState.currentUserUID;
            const filePath = `profile_pictures/${currentUserUID}/${file.name}`;
            const fileRef = storage.ref(filePath);
            const uploadTask = fileRef.put(file);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressContainer) progressContainer.classList.remove('hidden');
                    if (progressBar) progressBar.value = progress;
                }, 
                (error) => {
                    console.error("Upload failed:", error);
                    showToast("Gagal mengunggah foto.", "error");
                    if (progressContainer) progressContainer.classList.add('hidden');
                }, 
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        await db.collection('users').doc(currentUserUID).update({
                            fotoProfilUrl: downloadURL
                        });
                        if (picturePreview) picturePreview.src = downloadURL;
                        if (progressContainer) progressContainer.classList.add('hidden');
                        showToast("Foto profil berhasil diperbarui.", "success");
                    } catch (err) {
                        console.error("Error updating user image URL:", err);
                        showToast("Gagal memperbarui URL foto profil.", "error");
                    }
                }
            );
        });
    }

    // --- Mutqin Settings Form Submit ---
    const mutqinForm = document.getElementById('mutqin-settings-form');
    if (mutqinForm) {
        mutqinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            window.setButtonLoading(submitBtn, true);
            const newScores = {
                'sangat-lancar': parseInt(document.getElementById('score-sangat-lancar').value) || 100,
                'lancar': parseInt(document.getElementById('score-lancar').value) || 90,
                'cukup-lancar': parseInt(document.getElementById('score-cukup-lancar').value) || 70,
                'tidak-lancar': parseInt(document.getElementById('score-tidak-lancar').value) || 50,
                'sangat-tidak-lancar': parseInt(document.getElementById('score-sangat-tidak-lancar').value) || 30
            };
            await saveMutqinScores(newScores);
            window.setButtonLoading(submitBtn, false);
        });
    }

    // --- Quran Scope Form Submit ---
    const quranScopeForm = document.getElementById('quran-scope-form');
    if (quranScopeForm) {
        quranScopeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const quranScopeSelect = document.getElementById('quran-scope-setting');
            if (!quranScopeSelect) return;
            const newScope = quranScopeSelect.value;
            const submitBtn = e.target.querySelector('button[type="submit"]');

            window.setButtonLoading(submitBtn, true);
            window.appState.pengaturan.lingkupHafalan = newScope;
            if (typeof renderAll === 'function') renderAll();
            if (typeof populateBulkHafalanSurah === 'function') populateBulkHafalanSurah(); 
            await saveQuranScope(newScope);
            window.setButtonLoading(submitBtn, false);
        });
    }

    // --- Teacher PIN Settings Form Submit ---
    const guruPinForm = document.getElementById('guru-pin-form');
    if (guruPinForm) {
        guruPinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pinInput = document.getElementById('guru-pin-input');
            if (!pinInput) return;
            const pin = pinInput.value;
            if (!/^\d{6}$/.test(pin)) {
                showToast("PIN harus terdiri dari 6 digit angka.", "error");
                return;
            }
            
            const currentUserUID = window.appState.currentUserUID;
            const saveButton = e.target.querySelector('button[type="submit"]');
            window.setButtonLoading(saveButton, true);
            try {
                await db.collection('users').doc(currentUserUID).update({ pin: pin });
                showToast("PIN berhasil disimpan.", "success");
            } catch (error) {
                console.error("Gagal simpan PIN:", error);
                showToast("Gagal menyimpan PIN.", "error");
            } finally {
                window.setButtonLoading(saveButton, false);
            }
        });
    }

    // --- PIN Visibility Toggle ---
    const toggleGuruPin = document.getElementById('toggle-guru-pin');
    if (toggleGuruPin) {
        toggleGuruPin.addEventListener('click', () => {
            const pinInput = document.getElementById('guru-pin-input');
            const eyeIcon = document.getElementById('guru-pin-eye-icon');
            const eyeOffIcon = document.getElementById('guru-pin-eye-off-icon');
            if (pinInput && eyeIcon && eyeOffIcon) {
                const isPassword = pinInput.type === 'password';
                pinInput.type = isPassword ? 'text' : 'password';
                eyeIcon.classList.toggle('hidden', isPassword);
                eyeOffIcon.classList.toggle('hidden', !isPassword);
            }
        });
    }

    // --- Database Backup Trigger ---
    const backupBtn = document.getElementById('backup-db-btn');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            window.exportDatabaseBackup();
        });
    }

    // --- Database Restore Trigger ---
    const restoreTriggerBtn = document.getElementById('restore-db-btn-trigger');
    const restoreFileInput = document.getElementById('restore-db-file-input');
    if (restoreTriggerBtn && restoreFileInput) {
        restoreTriggerBtn.addEventListener('click', () => {
            restoreFileInput.click();
        });
        restoreFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                window.importDatabaseBackup(file);
                restoreFileInput.value = ''; // Reset
            }
        });
    }

    // --- Settings Logout Button ---
    const settingsLogoutBtn = document.getElementById('settings-logout-btn');
    if (settingsLogoutBtn) {
        settingsLogoutBtn.addEventListener('click', () => {
            if (typeof handleLogout === 'function') {
                handleLogout();
            } else {
                console.error("handleLogout function is not defined.");
            }
        });
    }
});
