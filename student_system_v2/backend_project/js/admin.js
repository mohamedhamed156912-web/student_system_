// js/admin.js
import { examsAPI, adminUsersAPI, resultsAPI, adminCreateStudent } from './api.js';

// ─── State ─────────────────────────────────────────────────────────────────────
let allStudents = []; // cached for search
let searchDebounceTimer = null;

document.addEventListener('renderAdminDashboard', () => {
    initAdminDashboard();
});

function initAdminDashboard() {
    setupAdminTabs();
    loadAdminExamsList();
    loadAdminStudentsList();
    setupAddStudentModal();
    setupSearch();
}

// ─── Tab Navigation ────────────────────────────────────────────────────────────
function setupAdminTabs() {
    const tabExams    = document.getElementById('tab-manage-exams');
    const tabStudents = document.getElementById('tab-manage-students');
    const tabSystem   = document.getElementById('tab-manage-system');
    const viewExams    = document.getElementById('admin-subview-exams');
    const viewStudents = document.getElementById('admin-subview-students');
    const viewSystem   = document.getElementById('admin-subview-system');
    const activeClass   = "bg-primary text-white px-4 py-2 rounded shadow text-sm font-semibold";
    const inactiveClass = "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded shadow-sm text-sm font-semibold";

    const activate = (activeTab, activeView) => {
        [tabExams, tabStudents, tabSystem].forEach(t => t.className = inactiveClass);
        [viewExams, viewStudents, viewSystem].forEach(v => v.classList.add('hidden'));
        activeTab.className = activeClass;
        activeView.classList.remove('hidden');
    };

    tabExams.addEventListener('click',    () => activate(tabExams, viewExams));
    tabStudents.addEventListener('click', () => activate(tabStudents, viewStudents));
    tabSystem.addEventListener('click',   () => activate(tabSystem, viewSystem));
}

// ─── Search ────────────────────────────────────────────────────────────────────
function setupSearch() {
    const searchInput = document.getElementById('search-students');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const q = searchInput.value.trim().toLowerCase();
            if (!q) {
                renderStudentsList(allStudents);
            } else {
                const filtered = allStudents.filter(s =>
                    s.name.toLowerCase().includes(q) ||
                    s.email.toLowerCase().includes(q) ||
                    (s.department || '').toLowerCase().includes(q)
                );
                renderStudentsList(filtered, q);
            }
        }, 250);
    });
}

// ─── Add Student Modal ────────────────────────────────────────────────────────
function setupAddStudentModal() {
    const modal      = document.getElementById('modal-add-student');
    const form       = document.getElementById('form-add-student');
    const errorEl    = document.getElementById('add-student-error');
    const pwInput    = document.getElementById('add-student-password');
    const pwHint     = document.getElementById('add-student-pw-hint');
    const btnOpen    = document.getElementById('btn-open-add-student');
    const btnClose   = document.getElementById('btn-close-add-student');
    const btnCancel  = document.getElementById('btn-cancel-add-student');
    const btnSubmit  = document.getElementById('btn-submit-add-student');

    const openModal = () => {
        form.reset();
        errorEl.classList.add('hidden');
        pwHint.innerHTML = '';
        modal.classList.remove('hidden');
    };
    const closeModal = () => modal.classList.add('hidden');

    btnOpen?.addEventListener('click', openModal);
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Password strength hint
    pwInput?.addEventListener('input', () => {
        const pw = pwInput.value;
        const rules = [
            { test: pw.length >= 8,     label: '8 أحرف على الأقل' },
            { test: /[A-Z]/.test(pw),   label: 'حرف كبير (A-Z)' },
            { test: /[a-z]/.test(pw),   label: 'حرف صغير (a-z)' },
            { test: /[0-9]/.test(pw),   label: 'رقم (0-9)' },
        ];
        pwHint.innerHTML = rules.map(r => `
            <div class="flex items-center gap-1 ${r.test ? 'text-emerald-600' : 'text-slate-400'}">
                <span>${r.test ? '✓' : '○'}</span><span>${r.label}</span>
            </div>
        `).join('');
    });

    // Submit
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.classList.add('hidden');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'جاري الإضافة...';

        const name     = document.getElementById('add-student-name').value.trim();
        const email    = document.getElementById('add-student-email').value.trim();
        const password = document.getElementById('add-student-password').value;
        const dept     = document.getElementById('add-student-dept').value || null;

        try {
            await adminCreateStudent(name, email, password, dept);
            closeModal();
            await loadAdminStudentsList();
            // Show success flash
            showToast(`✅ تم إضافة الطالب "${name}" بنجاح`);
        } catch (err) {
            errorEl.textContent = err.message || 'فشل إضافة الطالب';
            errorEl.classList.remove('hidden');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'إضافة الطالب';
        }
    });
}

// ─── Toast notification ────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold text-sm transition-all
        ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
}

// ─── Manage Exams ──────────────────────────────────────────────────────────────
const isMainCheck       = document.getElementById('new-exam-main');
const targetDeptContainer = document.getElementById('target-dept-container');
const targetDeptSelect  = document.getElementById('new-exam-dept');

if (isMainCheck) {
    isMainCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            targetDeptContainer.classList.add('opacity-50', 'pointer-events-none');
            targetDeptSelect.value = "";
        } else {
            targetDeptContainer.classList.remove('opacity-50', 'pointer-events-none');
        }
    });
}

const formCreateExam = document.getElementById('form-create-exam');
if (formCreateExam) {
    formCreateExam.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title   = document.getElementById('new-exam-title').value.trim();
        const isMain  = document.getElementById('new-exam-main').checked;
        const targetDept = document.getElementById('new-exam-dept').value || null;
        try {
            await examsAPI.adminCreate({ title, isMainPlacement: isMain, targetDepartment: isMain ? null : targetDept, questions: [] });
            formCreateExam.reset();
            targetDeptContainer.classList.remove('opacity-50', 'pointer-events-none');
            showToast('✅ تم إضافة الاختبار بنجاح');
            loadAdminExamsList();
        } catch (error) {
            alert("فشل إضافة الاختبار! " + error.message);
        }
    });
}

async function loadAdminExamsList(maintainScroll = false) {
    const listContainer = document.getElementById('admin-exams-list');
    const scrollPos = window.scrollY;
    if (!maintainScroll) listContainer.innerHTML = '<div class="text-slate-500 text-sm py-2">جاري التحميل...</div>';

    try {
        const exams = await examsAPI.adminGetAll();
        if (exams.length === 0) {
            listContainer.innerHTML = '<div class="text-slate-500 text-sm py-2 italic">لا توجد اختبارات. أضف واحداً الآن.</div>';
            return;
        }

        listContainer.innerHTML = exams.map(exam => {
            const qCount = exam.questions ? exam.questions.length : 0;
            const deptText = exam.isMainPlacement
                ? '<span class="text-primary">اختبار تحديد مستوى عام</span>'
                : `قسم مخصص: <strong>${exam.targetDepartment || 'الكل'}</strong>`;
            const questionsHTML = (exam.questions || []).map(q => `
                <div class="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-sm">
                    <div>
                        <span class="font-semibold text-slate-700">${q.questionText}</span>
                        <span class="text-xs mx-2 ${q.isTrue ? 'text-emerald-600' : 'text-red-500'} font-bold">(${q.isTrue ? 'صح' : 'خطأ'})</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.adminOpenEditQuestionModal(${q.id}, ${exam.id}, '${q.questionText.replace(/'/g, "\\'")}', ${q.isTrue})" class="text-blue-500 hover:text-blue-700 font-semibold text-xs py-1 px-2">تعديل</button>
                        <button onclick="window.adminDeleteQuestion(${q.id}, ${exam.id})" class="text-red-500 hover:text-red-700 font-semibold text-xs py-1 px-2">حذف</button>
                    </div>
                </div>
            `).join('');

            return `
                <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div class="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                        <div>
                            <h4 class="font-bold text-slate-800 text-lg">${exam.title}</h4>
                            <div class="text-xs text-slate-500 mt-1">${deptText} | عدد الأسئلة: ${qCount}</div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="window.adminOpenEditExamModal(${exam.id}, '${exam.title.replace(/'/g, "\\'")}', ${exam.isMainPlacement ? 1 : 0}, '${exam.targetDepartment || ''}')" class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded transition-colors">تعديل الاختبار</button>
                            <button onclick="window.adminDeleteExam(${exam.id})" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1.5 rounded transition-colors">حذف الاختبار</button>
                        </div>
                    </div>
                    <div class="mb-4 space-y-2">${questionsHTML}</div>
                    <form class="flex flex-col md:flex-row gap-3 items-end" onsubmit="window.adminAddQuestion(event, ${exam.id})">
                        <div class="flex-grow w-full">
                            <label class="block text-xs font-semibold mb-1">نص السؤال التعريفي (صح/خطأ)</label>
                            <input type="text" id="q-text-${exam.id}" required class="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-emerald-500">
                        </div>
                        <div class="w-full md:w-32">
                            <label class="block text-xs font-semibold mb-1">الإجابة الصحيحة</label>
                            <select id="q-ans-${exam.id}" class="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-emerald-500">
                                <option value="1">صح (True)</option>
                                <option value="0">خطأ (False)</option>
                            </select>
                        </div>
                        <button type="submit" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors w-full md:w-auto">إضافة سؤال</button>
                    </form>
                </div>
            `;
        }).join('');

        if (maintainScroll) window.scrollTo(0, scrollPos);
    } catch (e) {
        listContainer.innerHTML = '<div class="text-red-500 text-sm">خطأ في تحميل الاختبارات</div>';
    }
}

window.adminDeleteExam = async function (examId) {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار بالكامل؟')) return;
    try {
        await examsAPI.adminDelete(examId);
        showToast('✅ تم حذف الاختبار');
        loadAdminExamsList();
    } catch (e) { alert("فشل الحذف! " + e.message); }
};

window.adminDeleteQuestion = async function (qId, examId) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
        const exams = await examsAPI.adminGetAll();
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;
        await examsAPI.adminUpdate(examId, { ...exam, questions: exam.questions.filter(q => q.id !== qId) });
        showToast('✅ تم حذف السؤال وإعادة حساب الدرجات');
        loadAdminExamsList(true);
    } catch (e) { alert("فشل الحذف! " + e.message); }
};

window.adminAddQuestion = async function (event, examId) {
    event.preventDefault();
    const textInput = document.getElementById(`q-text-${examId}`);
    const ansInput  = document.getElementById(`q-ans-${examId}`);
    if (!textInput.value.trim()) return;
    try {
        const exams = await examsAPI.adminGetAll();
        const exam = exams.find(e => e.id === examId);
        if (!exam) return;
        await examsAPI.adminUpdate(examId, {
            ...exam,
            questions: [...(exam.questions || []), { questionText: textInput.value.trim(), isTrue: parseInt(ansInput.value) }]
        });
        textInput.value = ''; ansInput.value = '1';
        loadAdminExamsList(true);
    } catch (e) { alert("خطأ أثناء إضافة السؤال: " + e.message); }
};

// ─── Edit Exam Modal ───────────────────────────────────────────────────────────
const modalEditExam = document.getElementById('modal-edit-exam');
const formEditExam  = document.getElementById('form-edit-exam');

window.adminOpenEditExamModal = function (id, title, isMain, targetDept) {
    document.getElementById('edit-exam-id').value = id;
    document.getElementById('edit-exam-title').value = title;
    const isMainCb = document.getElementById('edit-exam-main');
    isMainCb.checked = !!isMain;
    const tdc = document.getElementById('edit-target-dept-container');
    const ds  = document.getElementById('edit-exam-dept');
    if (isMain) { tdc.classList.add('opacity-50','pointer-events-none'); ds.value = ""; }
    else        { tdc.classList.remove('opacity-50','pointer-events-none'); ds.value = targetDept || ""; }
    modalEditExam.classList.remove('hidden');
};

document.getElementById('edit-exam-main')?.addEventListener('change', (e) => {
    const tdc = document.getElementById('edit-target-dept-container');
    const ds  = document.getElementById('edit-exam-dept');
    if (e.target.checked) { tdc.classList.add('opacity-50','pointer-events-none'); ds.value = ""; }
    else                  { tdc.classList.remove('opacity-50','pointer-events-none'); }
});

document.getElementById('btn-close-edit-exam')?.addEventListener('click', () => modalEditExam.classList.add('hidden'));

if (formEditExam) {
    formEditExam.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id       = parseInt(document.getElementById('edit-exam-id').value);
        const title    = document.getElementById('edit-exam-title').value.trim();
        const isMain   = document.getElementById('edit-exam-main').checked;
        const targetDept = document.getElementById('edit-exam-dept').value || null;
        try {
            const exams = await examsAPI.adminGetAll();
            const exam  = exams.find(ex => ex.id === id);
            await examsAPI.adminUpdate(id, { ...exam, title, isMainPlacement: isMain, targetDepartment: isMain ? null : targetDept });
            modalEditExam.classList.add('hidden');
            showToast('✅ تم تعديل الاختبار');
            loadAdminExamsList();
        } catch (error) { alert("فشل التعديل! " + error.message); }
    });
}

// ─── Edit Question Modal ───────────────────────────────────────────────────────
const modalEditQuestion = document.getElementById('modal-edit-question');
const formEditQuestion  = document.getElementById('form-edit-question');

window.adminOpenEditQuestionModal = function (qId, examId, text, isTrue) {
    document.getElementById('edit-question-id').value = qId;
    document.getElementById('edit-question-exam-id').value = examId;
    document.getElementById('edit-question-text').value = text;
    document.getElementById('edit-question-ans').value = isTrue ? '1' : '0';
    modalEditQuestion.classList.remove('hidden');
};

document.getElementById('btn-close-edit-question')?.addEventListener('click', () => modalEditQuestion.classList.add('hidden'));

if (formEditQuestion) {
    formEditQuestion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const qId    = parseInt(document.getElementById('edit-question-id').value);
        const examId = parseInt(document.getElementById('edit-question-exam-id').value);
        const text   = document.getElementById('edit-question-text').value.trim();
        const isTrue = parseInt(document.getElementById('edit-question-ans').value);
        try {
            const exams = await examsAPI.adminGetAll();
            const exam  = exams.find(ex => ex.id === examId);
            await examsAPI.adminUpdate(examId, {
                ...exam,
                questions: exam.questions.map(q => q.id === qId ? { ...q, questionText: text, isTrue } : q)
            });
            modalEditQuestion.classList.add('hidden');
            showToast('✅ تم تعديل السؤال وإعادة حساب الدرجات');
            loadAdminExamsList();
        } catch (error) { alert("فشل التعديل! " + error.message); }
    });
}

// ─── Students List ─────────────────────────────────────────────────────────────
async function loadAdminStudentsList() {
    const listContainer = document.getElementById('admin-students-list');
    listContainer.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400 text-sm">جاري تحميل الطلاب...</td></tr>`;
    try {
        allStudents = await adminUsersAPI.getAll();
        renderStudentsList(allStudents);
    } catch (e) {
        listContainer.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-red-500 text-sm">خطأ في تحميل بيانات الطلاب</td></tr>';
    }
}

function renderStudentsList(students, searchQuery = '') {
    const listContainer   = document.getElementById('admin-students-list');
    const countLabel      = document.getElementById('students-count-label');

    if (countLabel) {
        countLabel.textContent = searchQuery
            ? `نتائج البحث: ${students.length} طالب`
            : `إجمالي الطلاب: ${students.length}`;
    }

    if (students.length === 0) {
        listContainer.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400 text-sm italic">
            ${searchQuery ? `لا يوجد طلاب يطابقون "${searchQuery}"` : 'لا يوجد طلاب مسجلين بعد.'}
        </td></tr>`;
        return;
    }

    // Highlight matching text
    const highlight = (text, query) => {
        if (!query || !text) return text || '';
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
    };

    listContainer.innerHTML = students.map(s => {
        const annualListHTML = s.annualResults && s.annualResults.length > 0
            ? s.annualResults.map((ar, index) => `
                <div class="flex justify-between items-center text-xs mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span class="truncate w-3/4">${ar.label}: ${ar.score}</span>
                    <div class="flex gap-1 shrink-0">
                        <button onclick="window.adminEditAnnualResult(${s.id}, ${index}, '${(ar.label||'').replace(/'/g,"\\'")}', '${(ar.score||'').toString().replace(/'/g,"\\'")}' )" class="text-blue-500 hover:text-blue-700 mx-1">تعديل</button>
                        <button onclick="window.adminDeleteAnnualResult(${s.id}, ${index})" class="text-red-500 hover:text-red-700">حذف</button>
                    </div>
                </div>
            `).join('')
            : '<div class="text-xs text-slate-400 italic mt-1">لا توجد نتائج</div>';

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                <td class="py-3 px-4">
                    <div class="text-slate-800 font-semibold">${highlight(s.name, searchQuery)}</div>
                    <div class="mt-2 text-xs font-semibold text-slate-500 border-b pb-1 mb-1">النتائج السنوية:</div>
                    <div class="max-h-24 overflow-y-auto pr-1">${annualListHTML}</div>
                </td>
                <td class="py-3 px-4 text-slate-600 text-sm">${highlight(s.email, searchQuery)}</td>
                <td class="py-3 px-4">
                    <span class="${s.department ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} text-xs px-2 py-1 rounded-full font-bold">
                        ${highlight(s.department || 'غير محدد', searchQuery)}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.adminOpenAnnualModal(${s.id}, '${s.name.replace(/'/g, "\\'")}')" class="bg-blue-50 text-primary hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded text-xs font-bold transition-colors">إضافة نتيجة</button>
                        <button onclick="window.adminOpenHistoryModal(${s.id}, '${s.name.replace(/'/g, "\\'")}')" class="bg-slate-50 text-slate-700 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded text-xs font-bold transition-colors">نتائج الاختبارات</button>
                        <button onclick="window.adminDeleteStudent(${s.id})" class="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded text-xs font-bold transition-colors">حذف</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.adminDeleteStudent = async function (studentId) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب نهائياً؟')) return;
    try {
        await adminUsersAPI.delete(studentId);
        showToast('✅ تم حذف الطالب');
        loadAdminStudentsList();
    } catch (e) { alert("فشل الحذف! " + e.message); }
};

// ─── Annual Result Modal ───────────────────────────────────────────────────────
const modal     = document.getElementById('modal-annual-result');
const formAnnual = document.getElementById('form-annual-result');

window.adminOpenAnnualModal = async function (studentId, studentName) {
    const students = await adminUsersAPI.getAll();
    const student  = students.find(s => s.id === studentId);
    document.getElementById('annual-modal-title').textContent = 'إضافة نتيجة سنوية للطالب';
    document.getElementById('modal-student-id').value = studentId;
    document.getElementById('modal-annual-edit-index').value = "-1";
    document.getElementById('modal-student-name').textContent = `الطالب: ${studentName}`;
    document.getElementById('annual-year-title').value = '';
    document.getElementById('annual-result-text').value = '';
    modal.classList.remove('hidden');
};

window.adminEditAnnualResult = async function (studentId, index, label, score) {
    document.getElementById('annual-modal-title').textContent = 'تعديل النتيجة السنوية';
    document.getElementById('modal-student-id').value = studentId;
    document.getElementById('modal-annual-edit-index').value = index.toString();
    document.getElementById('modal-student-name').textContent = '';
    document.getElementById('annual-year-title').value = label;
    document.getElementById('annual-result-text').value = score;
    modal.classList.remove('hidden');
};

window.adminDeleteAnnualResult = async function (studentId, index) {
    if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟')) return;
    try {
        const students = await adminUsersAPI.getAll();
        const student  = students.find(s => s.id === studentId);
        if (!student) return;
        const updated = [...(student.annualResults || [])];
        updated.splice(index, 1);
        await adminUsersAPI.setAnnualResults(studentId, updated);
        loadAdminStudentsList();
    } catch (error) { alert('فشل الحذف!'); }
};

document.getElementById('btn-close-annual-modal')?.addEventListener('click', () => {
    modal.classList.add('hidden'); formAnnual.reset();
});

if (formAnnual) {
    formAnnual.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = parseInt(document.getElementById('modal-student-id').value);
        const editIndex = parseInt(document.getElementById('modal-annual-edit-index').value);
        const label     = document.getElementById('annual-year-title').value.trim();
        const score     = document.getElementById('annual-result-text').value.trim();
        try {
            const students = await adminUsersAPI.getAll();
            const student  = students.find(s => s.id === studentId);
            const updated  = student ? [...(student.annualResults || [])] : [];
            if (editIndex === -1) updated.push({ label, score });
            else                  updated[editIndex] = { label, score };
            await adminUsersAPI.setAnnualResults(studentId, updated);
            modal.classList.add('hidden');
            formAnnual.reset();
            showToast('✅ تم حفظ النتيجة السنوية');
            loadAdminStudentsList();
        } catch (error) { alert("فشل الحفظ! " + error.message); }
    });
}

// ─── History Modal ─────────────────────────────────────────────────────────────
const historyModal = document.getElementById('modal-view-history');

window.adminOpenHistoryModal = async function (studentId, studentName) {
    document.getElementById('history-modal-student-name').textContent = `الطالب: ${studentName}`;
    const container = document.getElementById('history-results-container');
    container.innerHTML = '<div class="text-slate-500 text-sm py-4 text-center">جاري جلب النتائج...</div>';
    historyModal.classList.remove('hidden');
    try {
        const results = await resultsAPI.adminGetStudentResults(studentId);
        if (results.length === 0) {
            container.innerHTML = '<div class="text-slate-500 text-sm py-4 text-center italic mt-4 bg-slate-50 rounded border border-slate-100">لا توجد نتائج اختبارات مسجلة لهذا الطالب حتى الآن.</div>';
            return;
        }
        container.innerHTML = `
            <table class="w-full text-right border-collapse text-sm mt-4">
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                        <th class="py-2 px-3 font-bold text-slate-700">اسم الاختبار</th>
                        <th class="py-2 px-3 font-bold text-slate-700 w-24">النتيجة</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr class="border-b border-slate-100 hover:bg-slate-50">
                            <td class="py-2 px-3 text-slate-800 font-semibold">${r.examName}</td>
                            <td class="py-2 px-3 font-bold ${r.score >= 50 ? 'text-emerald-600' : 'text-red-500'}">${r.score}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        container.innerHTML = '<div class="text-red-500 text-sm py-4 text-center">حدث خطأ أثناء جلب النتائج.</div>';
    }
};

document.getElementById('btn-close-history-modal')?.addEventListener('click', () => historyModal.classList.add('hidden'));

// ─── Export ────────────────────────────────────────────────────────────────────
const btnExport = document.getElementById('btn-export-db');
if (btnExport) {
    btnExport.addEventListener('click', async () => {
        try {
            const [students, exams] = await Promise.all([adminUsersAPI.getAll(), examsAPI.adminGetAll()]);
            const data = { students, exams, exportDate: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (error) { alert("حدث خطأ أثناء تصدير البيانات."); }
    });
}
