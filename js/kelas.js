// js/kelas.js

window.renderClassList = function() {
    // Hide class filters if logged-in user is a student
    const filterKelasEl = document.getElementById('hadir-filter-kelas');
    const role = window.appState.loggedInRole || sessionStorage.getItem('loggedInRole');

    if (filterKelasEl) {
        if (role === 'siswa') {
            filterKelasEl.style.display = 'none'; 
            filterKelasEl.classList.add('hidden'); 
        } else {
            filterKelasEl.style.display = ''; 
            filterKelasEl.classList.remove('hidden');
        }
    }

    const filtersToUpdate = [
        { el: document.getElementById('student-filter-class'), defaultText: 'Filter: Semua Kelas' },
        { el: document.getElementById('summary-rank-filter-class'), defaultText: 'Hasil: Semua Kelas' },
        { el: document.getElementById('riwayat-filter-class'), defaultText: 'Filter: Semua Kelas' },
        { el: document.getElementById('akun-filter-kelas'), defaultText: 'Filter: Semua Kelas' },
        { el: document.getElementById('hadir-filter-kelas'), defaultText: 'Filter: Semua Kelas' }
    ];
    
    const selectsToUpdate = [
        { el: document.getElementById('new-student-class'), defaultText: '-- Pilih Kelas --' }
    ];

    const currentValues = [
        ...filtersToUpdate.map(f => f.el ? f.el.value : null),
        ...selectsToUpdate.map(s => s.el ? s.el.value : null)
    ];

    const classListEl = document.getElementById('class-list');
    if (classListEl) classListEl.innerHTML = '';
    
    filtersToUpdate.forEach(f => { 
        if (f.el) f.el.innerHTML = `<option value="">${f.defaultText}</option>`; 
    });
    
    selectsToUpdate.forEach(s => { 
        if (s.el) s.el.innerHTML = `<option value="">${s.defaultText}</option>`; 
    });

    const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    
    window.appState.allClasses.sort((a,b) => a.name.localeCompare(b.name)).forEach(cls => {
        const studentCount = window.appState.allStudents.filter(s => s.classId === cls.id).length;
        const item = document.createElement('div');
        item.className = 'class-item p-3 border border-slate-100 bg-white shadow-sm rounded-lg mb-2 flex flex-col transition-colors';
        item.dataset.classId = cls.id;
        item.innerHTML = `
            <div class="class-display flex items-center justify-between">
                <div class="flex-grow mr-2">
                    <h3 class="font-bold text-teal-700 break-all text-sm leading-snug">${cls.name}</h3>
                    <p class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">${studentCount} siswa</p>
                </div>
                <div class="flex items-center space-x-1.5 flex-shrink-0">
                    <button type="button" data-action="edit-class" title="Ubah Nama Kelas" class="inline-flex items-center justify-center rounded-lg p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">${editIcon}</button>
                    <button type="button" data-action="delete-class" title="Hapus Kelas" class="inline-flex items-center justify-center rounded-lg p-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">${deleteIcon}</button>
                </div>
            </div>
            <div class="class-edit-form hidden mt-2">
                <input type="text" value="${cls.name}" class="form-input mb-2 text-sm text-slate-700" required>
                <div class="flex space-x-2">
                    <button type="button" data-action="cancel-edit" class="btn btn-sm btn-secondary flex-1 py-1.5">Batal</button>
                    <button type="button" data-action="save-class" class="btn btn-sm btn-primary flex-1 py-1.5">Simpan</button>
                </div>
            </div>
        `;

        if (classListEl) classListEl.appendChild(item);
        
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = cls.name;
        
        filtersToUpdate.forEach(f => { if(f.el) f.el.appendChild(option.cloneNode(true)); });
        selectsToUpdate.forEach(s => { if(s.el) s.el.appendChild(option.cloneNode(true)); });
    });
    
    filtersToUpdate.forEach((f, i) => { if(f.el) f.el.value = currentValues[i]; });
    selectsToUpdate.forEach((s, i) => { if(s.el) s.el.value = currentValues[filtersToUpdate.length + i]; });
};

document.addEventListener('DOMContentLoaded', () => {
    
    // Add Class Form submission
    const addClassForm = document.getElementById('add-class-form');
    const addClassBtn = document.getElementById('add-class-btn');
    const classNameInput = document.getElementById('class-name');

    if (addClassForm && addClassBtn && classNameInput) {
        addClassForm.addEventListener('submit', async e => { 
            e.preventDefault(); 
            const name = classNameInput.value.trim(); 
            if (name) { 
                addClassBtn.disabled = true;
                addClassBtn.textContent = 'Membuat...';

                try {
                    await window.db.collection('classes').add({ name, lembagaId: window.appState.lembagaId || sessionStorage.getItem('lembagaId') }); 
                    classNameInput.value = ''; 
                    window.showToast(`Kelas "${name}" berhasil dibuat.`, "success");
                } catch (error) {
                    console.error("Gagal menambahkan kelas:", error);
                    window.showToast("Gagal membuat kelas.", "error");
                } finally {
                    addClassBtn.disabled = false;
                    addClassBtn.textContent = 'Tambah Kelas';
                }
            } 
        });
    }

    // Add Student Form submission
    const addStudentForm = document.getElementById('add-student-form');
    const addStudentSubmitBtn = document.getElementById('add-student-submit-btn');

    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async e => { 
            e.preventDefault(); 
            const name = document.getElementById('new-student-name').value.trim(); 
            const classId = document.getElementById('new-student-class').value; 
            
            if (name && classId) { 
                if (addStudentSubmitBtn) {
                    addStudentSubmitBtn.disabled = true;
                    addStudentSubmitBtn.textContent = 'Menyimpan...';
                }

                try {
                    await window.db.collection('students').add({ 
                        name, 
                        classId, 
                        lembagaId: window.appState.lembagaId || sessionStorage.getItem('lembagaId') 
                    }); 
                    
                    document.getElementById('new-student-name').value = ''; 
                    document.getElementById('new-student-class').value = '';
                    window.showToast(`Siswa "${name}" berhasil didaftarkan.`, "success");
                    
                    const addStudentModal = document.getElementById('add-student-modal');
                    if (addStudentModal) window.hideModal(addStudentModal);

                } catch (error) {
                    console.error("Gagal menambahkan siswa:", error);
                    window.showToast("Gagal mendaftarkan siswa.", "error");
                } finally {
                    if (addStudentSubmitBtn) {
                        addStudentSubmitBtn.disabled = false;
                        addStudentSubmitBtn.textContent = 'Daftarkan Siswa';
                    }
                }
            } 
        });
    }

    // Delete Student button clicks (from student list on setoran page)
    const studentListEl = document.getElementById('student-list');
    if (studentListEl) {
        studentListEl.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('[data-action="delete-student"]');
            if (deleteBtn) {
                e.stopPropagation();
                const item = deleteBtn.closest('.student-item');
                const studentId = item ? item.dataset.studentId : null;
                const student = studentId ? window.appState.allStudents.find(s => s.id === studentId) : null;

                if (student) {
                    window.showConfirmModal({
                        title: `Hapus Siswa?`,
                        message: `Yakin hapus siswa "${student.name}"? Semua riwayat setorannya juga akan terhapus secara permanen.`,
                        okText: "Ya, Hapus",
                        onConfirm: async () => {
                            try {
                                const hafalanToDelete = window.appState.allHafalan.filter(h => h.studentId === studentId);
                                const batch = window.db.batch();
                                
                                hafalanToDelete.forEach(hafalan => {
                                    const ref = window.db.collection('hafalan').doc(hafalan.id);
                                    batch.delete(ref);
                                });
                                
                                const studentRef = window.db.collection('students').doc(studentId);
                                batch.delete(studentRef);
                                
                                await batch.commit();
                                window.showToast(`Siswa "${student.name}" berhasil dihapus.`, "success");
                            } catch (error) {
                                console.error("Gagal menghapus siswa:", error);
                                window.showToast("Gagal menghapus data siswa.", "error");
                            }
                        }
                    });
                }
            }
        });
    }

    // Class Item actions delegation
    const classListEl = document.getElementById('class-list');
    if (classListEl) {
        classListEl.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const classItem = e.target.closest('.class-item');
            if (!classItem) return;
            const classId = classItem.dataset.classId;

            if (button) {
                const action = button.dataset.action;
                switch(action) {
                    case 'delete-class': {
                        const cls = window.appState.allClasses.find(c => c.id === classId);
                        if (!cls) return;

                        window.showConfirmModal({
                            title: `Hapus Kelas ${cls.name}?`,
                            message: `Yakin ingin hapus kelas "${cls.name}"? SEMUA data siswa dan riwayat setoran di dalamnya akan terhapus permanen.`, 
                            okText: "Ya, Hapus",
                            onConfirm: async () => {
                                try {
                                    const studentsInClass = window.appState.allStudents.filter(s => s.classId === classId);
                                    const batch = window.db.batch();
                                    
                                    studentsInClass.forEach(student => {
                                        const hafalanToDelete = window.appState.allHafalan.filter(h => h.studentId === student.id);
                                        hafalanToDelete.forEach(hafalan => {
                                            batch.delete(window.db.collection('hafalan').doc(hafalan.id));
                                        });
                                        batch.delete(window.db.collection('students').doc(student.id));
                                    });
                                    
                                    batch.delete(window.db.collection('classes').doc(classId));
                                    await batch.commit();
                                    window.showToast(`Kelas "${cls.name}" berhasil dihapus.`, "success");
                                } catch (error) {
                                    console.error("Gagal menghapus kelas:", error);
                                    window.showToast("Gagal menghapus kelas.", "error");
                                }
                            }
                        });
                        break;
                    }
                    case 'edit-class': {
                        classItem.querySelector('.class-display').classList.add('hidden');
                        classItem.querySelector('.class-edit-form').classList.remove('hidden');
                        classItem.querySelector('.class-edit-form input').focus();
                        break;
                    }
                    case 'cancel-edit': {
                        classItem.querySelector('.class-display').classList.remove('hidden');
                        classItem.querySelector('.class-edit-form').classList.add('hidden');
                        break;
                    }
                    case 'save-class': {
                        const input = classItem.querySelector('.class-edit-form input');
                        const newName = input.value.trim();
                        if (newName) {
                            try {
                                await window.db.collection('classes').doc(classId).update({ name: newName });
                                window.showToast("Nama kelas berhasil diperbarui.", "success");
                            } catch (error) {
                                console.error("Gagal memperbarui kelas:", error);
                                window.showToast("Gagal menyimpan nama kelas.", "error");
                            }
                        }
                        classItem.querySelector('.class-display').classList.remove('hidden');
                        classItem.querySelector('.class-edit-form').classList.add('hidden');
                        break;
                    }
                }
            }
        });
    }
});
