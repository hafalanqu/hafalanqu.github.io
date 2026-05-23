// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    // --- LOGIN FORM SUBMIT ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginError = document.getElementById('login-error');
            const submitButton = e.target.querySelector('button[type="submit"]');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Memproses...';
            loginError?.classList.add('hidden');

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                const userDocRef = db.collection('users').doc(user.uid);
                const userDoc = await userDocRef.get();

                let userData;

                if (!userDoc.exists) {
                    console.log(`User document ${user.uid} not found, initializing...`);
                    const newUserPayload = {
                        email: user.email,
                        role: "guru",
                        lembagaId: "man2brebes",
                        namaLengkap: user.email.split('@')[0], 
                        ttl: "", 
                        fotoProfilUrl: "",
                        pin: ""
                    };
                    await userDocRef.set(newUserPayload);
                    userData = newUserPayload;
                    showToast("Selamat datang! Akun Anda telah disiapkan.", "success");
                } else {
                    userData = userDoc.data();
                }

                const role = userData.role;
                const lembagaId = userData.lembagaId;

                if (role && lembagaId && (role === 'guru' || role === 'siswa' || role === 'admin_lembaga')) {
                    sessionStorage.setItem('loggedInRole', role);
                    sessionStorage.setItem('lembagaId', lembagaId);
                    sessionStorage.setItem('currentUserUID', user.uid);
                    window.appState.loggedInRole = role;
                    window.appState.lembagaId = lembagaId;
                    window.appState.currentUserUID = user.uid;

                    loginForm.reset();
                    startApp(role, lembagaId, user.uid);
                } else {
                    throw new Error("Peran atau ID Lembaga tidak diatur di database.");
                }

            } catch (error) {
                console.error("Login Error:", error);
                let message = 'Terjadi kesalahan. Coba lagi.';
                if (error.code) {
                    switch (error.code) {
                        case 'auth/user-not-found': message = 'Email tidak ditemukan.'; break;
                        case 'auth/wrong-password': message = 'Password salah.'; break;
                        case 'auth/invalid-email': message = 'Format email tidak valid.'; break;
                    }
                } else {
                    message = error.message;
                }
                if (loginError) {
                    loginError.textContent = message;
                    loginError.classList.remove('hidden');
                }
                auth.signOut();
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Masuk';
            }
        });
    }

    // --- REGISTER GURU (USTADZ) ---
    const registerGuruForm = document.getElementById('register-guru-form');
    if (registerGuruForm) {
        registerGuruForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const messageEl = document.getElementById('register-guru-message');
            if (messageEl) {
                messageEl.textContent = '';
                messageEl.className = 'text-sm text-center mb-4';
            }

            const email = document.getElementById('register-guru-email').value;
            const password = document.getElementById('register-guru-password').value;
            const lembagaId = document.getElementById('register-guru-lembagaId').value;

            if (!email || password.length < 6) {
                if (messageEl) {
                    messageEl.textContent = 'Pastikan email valid dan password minimal 6 karakter.';
                    messageEl.classList.add('text-red-600');
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';

            let tempAuthApp = null;
            try {
                // Initialize temporary Firebase app instance to avoid logging out active session
                tempAuthApp = firebase.initializeApp(window.firebaseConfig, 'tempGuruApp');
                const userCredential = await tempAuthApp.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await user.sendEmailVerification();

                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: "guru",
                    lembagaId: lembagaId,
                    namaLengkap: "",
                    ttl: "",
                    fotoProfilUrl: "",
                    pin: ""
                });

                if (messageEl) {
                    messageEl.textContent = 'Pendaftaran berhasil! Silakan periksa email Anda untuk mengaktifkan akun.';
                    messageEl.className = 'text-sm text-center mb-4 text-green-600';
                }
                
                registerGuruForm.reset();
                submitBtn.textContent = 'Berhasil Terdaftar';
                
                await tempAuthApp.auth().signOut();
                await tempAuthApp.delete();

                setTimeout(() => {
                    window.navigate('/login');
                }, 4000);

            } catch (error) {
                console.error("Register Guru Error:", error);
                let message = 'Terjadi kesalahan. Coba lagi.';
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use': message = 'Email ini sudah terdaftar.'; break;
                        case 'auth/weak-password': message = 'Password terlalu lemah.'; break;
                        case 'auth/invalid-email': message = 'Format email tidak valid.'; break;
                    }
                }
                if (messageEl) {
                    messageEl.textContent = message;
                    messageEl.classList.add('text-red-600');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Daftar';
                if (tempAuthApp) await tempAuthApp.delete();
            }
        });
    }

    // --- REGISTER SISWA (SANTRI) ---
    const registerSiswaForm = document.getElementById('register-siswa-form');
    if (registerSiswaForm) {
        registerSiswaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const messageEl = document.getElementById('register-siswa-message');
            if (messageEl) {
                messageEl.textContent = '';
                messageEl.className = 'text-sm text-center mb-4';
            }

            const email = document.getElementById('register-siswa-email').value;
            const namaLengkap = document.getElementById('register-siswa-namaLengkap').value;
            const password = document.getElementById('register-siswa-password').value;
            const lembagaId = document.getElementById('register-siswa-lembagaId').value;

            if (!email || !namaLengkap || !lembagaId || password.length < 6) {
                if (messageEl) {
                    messageEl.textContent = 'Pastikan semua kolom terisi dan password minimal 6 karakter.';
                    messageEl.classList.add('text-red-600');
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';

            let tempAuthApp = null;
            try {
                tempAuthApp = firebase.initializeApp(window.firebaseConfig, 'tempSiswaApp');
                const userCredential = await tempAuthApp.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await user.sendEmailVerification();

                // Save to users collection
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    namaLengkap: namaLengkap,
                    role: "siswa",
                    lembagaId: lembagaId,
                    studentId: user.uid
                });

                // Auto create student profile inside the students list of the school
                await db.collection('students').add({
                    name: namaLengkap,
                    classId: "", // unassigned, teacher will place them
                    userId: user.uid,
                    lembagaId: lembagaId
                });

                if (messageEl) {
                    messageEl.textContent = 'Pendaftaran berhasil! Silakan periksa email Anda untuk mengaktifkan akun.';
                    messageEl.className = 'text-sm text-center mb-4 text-green-600';
                }
                
                registerSiswaForm.reset();
                submitBtn.textContent = 'Berhasil Terdaftar';
                
                await tempAuthApp.auth().signOut();
                await tempAuthApp.delete();

                setTimeout(() => {
                    window.navigate('/login');
                }, 4000);

            } catch (error) {
                console.error("Register Siswa Error:", error);
                let message = 'Terjadi kesalahan. Coba lagi.';
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use': message = 'Email ini sudah terdaftar.'; break;
                        case 'auth/weak-password': message = 'Password terlalu lemah.'; break;
                        case 'auth/invalid-email': message = 'Format email tidak valid.'; break;
                    }
                }
                if (messageEl) {
                    messageEl.textContent = message;
                    messageEl.classList.add('text-red-600');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Daftar';
                if (tempAuthApp) await tempAuthApp.delete();
            }
        });
    }

    // --- REGISTER ADMIN ---
    const registerAdminForm = document.getElementById('register-admin-form');
    if (registerAdminForm) {
        registerAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const messageEl = document.getElementById('register-admin-message');
            if (messageEl) {
                messageEl.textContent = '';
                messageEl.className = 'text-sm text-center mb-4';
            }

            const email = document.getElementById('register-admin-email').value;
            const password = document.getElementById('register-admin-password').value;
            const lembagaId = document.getElementById('register-admin-lembagaId').value;

            if (!email || password.length < 6) {
                if (messageEl) {
                    messageEl.textContent = 'Pastikan email valid dan password minimal 6 karakter.';
                    messageEl.classList.add('text-red-600');
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';

            let tempAuthApp = null;
            try {
                tempAuthApp = firebase.initializeApp(window.firebaseConfig, 'tempAdminApp');
                const userCredential = await tempAuthApp.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await user.sendEmailVerification();

                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: "admin_lembaga",
                    lembagaId: lembagaId,
                    namaLengkap: "",
                    ttl: "",
                    fotoProfilUrl: ""
                });

                if (messageEl) {
                    messageEl.textContent = 'Pendaftaran berhasil! Silakan periksa email Anda untuk mengaktifkan akun.';
                    messageEl.className = 'text-sm text-center mb-4 text-green-600';
                }
                
                registerAdminForm.reset();
                submitBtn.textContent = 'Berhasil Terdaftar';
                
                await tempAuthApp.auth().signOut();
                await tempAuthApp.delete();

                setTimeout(() => {
                    window.navigate('/login');
                }, 4000);

            } catch (error) {
                console.error("Register Admin Error:", error);
                let message = 'Terjadi kesalahan. Coba lagi.';
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use': message = 'Email ini sudah terdaftar.'; break;
                        case 'auth/weak-password': message = 'Password terlalu lemah.'; break;
                        case 'auth/invalid-email': message = 'Format email tidak valid.'; break;
                    }
                }
                if (messageEl) {
                    messageEl.textContent = message;
                    messageEl.classList.add('text-red-600');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Daftar';
                if (tempAuthApp) await tempAuthApp.delete();
            }
        });
    }

    // --- MAIN LOGIN RESET PASSWORD MODAL ---
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const resetPasswordModal = document.getElementById('reset-password-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetMessageEl = document.getElementById('reset-message');

    if (forgotPasswordLink && resetPasswordModal) {
        forgotPasswordLink.addEventListener('click', () => {
            resetPasswordModal.classList.remove('hidden');
        });
    }

    const hideResetModal = () => {
        resetPasswordModal?.classList.add('hidden');
        if (resetMessageEl) resetMessageEl.textContent = ''; 
        resetPasswordForm?.reset(); 
    };

    closeModalBtn?.addEventListener('click', hideResetModal);
    resetPasswordModal?.addEventListener('click', (e) => {
        if (e.target === resetPasswordModal) hideResetModal();
    });

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const submitButton = e.target.querySelector('button[type="submit"]');
            
            submitButton.disabled = true;
            submitButton.textContent = 'Mengirim...';
            if (resetMessageEl) {
                resetMessageEl.textContent = '';
                resetMessageEl.className = 'text-sm text-center mb-4';
            }

            try {
                await auth.sendPasswordResetEmail(email);
                if (resetMessageEl) {
                    resetMessageEl.textContent = 'Tautan reset password telah dikirim ke email Anda. Silakan periksa kotak masuk.';
                    resetMessageEl.classList.add('text-green-600');
                }
            } catch (error) {
                let message = 'Gagal mengirim email. Coba lagi.';
                if (error.code === 'auth/user-not-found') message = 'Email tidak terdaftar.';
                if (resetMessageEl) {
                    resetMessageEl.textContent = message;
                    resetMessageEl.classList.add('text-red-600');
                }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Kirim Tautan Reset';
            }
        });
    }

    // Toggle main login screen password
    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const eyeIcon = document.getElementById('eye-icon');
            const eyeOffIcon = document.getElementById('eye-off-icon');
            
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            eyeIcon.classList.toggle('hidden', isPassword);
            eyeOffIcon.classList.toggle('hidden', !isPassword);
        });
    }

    // Toggle other password components
    window.setupPasswordToggle = function(buttonId, inputId, eyeIconId, eyeOffIconId) {
        const toggleBtn = document.getElementById(buttonId);
        const input = document.getElementById(inputId);
        const eyeIcon = document.getElementById(eyeIconId);
        const eyeOffIcon = document.getElementById(eyeOffIconId);

        if (toggleBtn && input && eyeIcon && eyeOffIcon) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                eyeIcon.classList.toggle('hidden', isPassword);
                eyeOffIcon.classList.toggle('hidden', !isPassword);
            });
        }
    }
});

// --- NEW TEACHER/USER PROFILE SETUP MODAL SUBMIT ---
window.checkUserProfileCompletion = function() {
    const currentUserUID = window.appState.currentUserUID;
    const role = window.appState.loggedInRole;
    if (!currentUserUID || !role) return;

    const user = window.appState.allUsers.find(u => u.id === currentUserUID);
    if (!user) return;

    const isProfileIncomplete = !user.namaLengkap || !user.ttl;
    const isPinMissingForGuru = (role === 'guru' && !user.pin);
    const modalEl = document.getElementById('profile-setup-modal');
    
    if (isProfileIncomplete || isPinMissingForGuru) {
        document.getElementById('setup-nama-lengkap').value = user.namaLengkap || '';
        document.getElementById('setup-ttl').value = user.ttl || '';

        const pinContainer = document.getElementById('setup-pin-container');
        const pinInput = document.getElementById('setup-pin');

        if (role === 'guru') {
            pinContainer?.classList.remove('hidden');
            if (pinInput) pinInput.required = true;
        } else {
            pinContainer?.classList.add('hidden');
            if (pinInput) pinInput.required = false;
        }

        modalEl?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modalEl?.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

const setupProfileForm = document.getElementById('profile-setup-form');
if (setupProfileForm) {
    setupProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = window.appState.loggedInRole;
        const uid = window.appState.currentUserUID;
        const submitBtn = document.getElementById('profile-setup-submit-btn');
        
        window.setButtonLoading(submitBtn, true);

        const updatedData = {
            namaLengkap: document.getElementById('setup-nama-lengkap').value.trim(),
            ttl: document.getElementById('setup-ttl').value.trim()
        };

        if (role === 'guru') {
            const pin = document.getElementById('setup-pin').value;
            if (!/^\d{6}$/.test(pin)) {
                showToast("PIN harus terdiri dari 6 digit angka.", "error");
                window.setButtonLoading(submitBtn, false);
                return;
            }
            updatedData.pin = pin;
        }

        try {
            await db.collection('users').doc(uid).update(updatedData);
            showToast("Profil berhasil disimpan.", "success");
            document.getElementById('profile-setup-modal')?.classList.add('hidden');
            document.body.style.overflow = '';
        } catch (error) {
            console.error("Setup Profile Error:", error);
            showToast("Gagal menyimpan perubahan.", "error");
        } finally {
            window.setButtonLoading(submitBtn, false);
        }
    });
}

// --- LOGOUT HANDLER ---
window.handleLogout = function() {
    window.activeDBListeners.forEach(unsubscribe => unsubscribe());
    window.activeDBListeners = [];

    auth.signOut().then(() => {
        sessionStorage.clear();
        window.appState.loggedInRole = null;
        window.appState.lembagaId = null;
        window.appState.currentUserUID = null;
        window.navigate('/login');
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }).catch(error => {
        console.error("Logout Gagal:", error);
        sessionStorage.clear();
        window.navigate('/login');
        setTimeout(() => {
            window.location.reload();
        }, 100);
    });
};
