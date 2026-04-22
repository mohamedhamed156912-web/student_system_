// js/student.js
import { examsAPI, resultsAPI, profileAPI, authAPI } from './api.js';

let currentExamData = null;
let currentQuestions = [];

document.addEventListener('renderStudentDashboard', () => {
    initStudentDashboard();
});

async function initStudentDashboard() {
    const user = window.app.currentUser;
    if (!user) return;

    document.getElementById('student-name').textContent = user.name;
    document.getElementById('student-email').textContent = user.email;

    const deptEl = document.getElementById('student-department');
    if (user.department) {
        deptEl.textContent = `القسم: ${user.department}`;
        deptEl.className = "inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-semibold";
    } else {
        deptEl.textContent = "القسم: غير محدد";
        deptEl.className = "inline-block bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-full font-semibold";
    }

    const preview = document.getElementById('profile-pic-preview');
    const placeholder = document.getElementById('profile-pic-placeholder');
    if (user.profilePicBase64) {
        preview.src = user.profilePicBase64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }

    await loadStudentExams();
    await loadStudentExamResults();
    loadStudentAnnualResults(user.annualResults);
}

// Profile Picture Upload
const profileUpload = document.getElementById('profile-pic-upload');
if (profileUpload) {
    profileUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function () {
            const base64String = reader.result;
            const preview = document.getElementById('profile-pic-preview');
            const placeholder = document.getElementById('profile-pic-placeholder');

            preview.src = base64String;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');

            try {
                await profileAPI.updatePic(base64String);
                const user = window.app.currentUser;
                user.profilePicBase64 = base64String;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            } catch (err) {
                console.error('Failed to save profile picture:', err);
            }
        };
        reader.readAsDataURL(file);
    });
}

// Password Change
const changePwForm = document.getElementById('form-change-password');
if (changePwForm) {
    // Add password strength hint to change-password field
    const newPwInput = document.getElementById('new-password');
    if (newPwInput) {
        newPwInput.addEventListener('input', () => {
            let hintEl = document.getElementById('pw-hint-change');
            if (!hintEl) {
                hintEl = document.createElement('div');
                hintEl.id = 'pw-hint-change';
                hintEl.className = 'mt-1 text-xs space-y-1';
                newPwInput.parentNode.appendChild(hintEl);
            }
            const pw = newPwInput.value;
            const rules = [
                { test: pw.length >= 8,     label: '8 أحرف على الأقل' },
                { test: /[A-Z]/.test(pw),   label: 'حرف كبير (A-Z)' },
                { test: /[a-z]/.test(pw),   label: 'حرف صغير (a-z)' },
                { test: /[0-9]/.test(pw),   label: 'رقم (0-9)' },
            ];
            hintEl.innerHTML = rules.map(r => `
                <div class="flex items-center gap-1 ${r.test ? 'text-emerald-600' : 'text-slate-400'}">
                    <span>${r.test ? '✓' : '○'}</span><span>${r.label}</span>
                </div>
            `).join('');
        });
    }

    changePwForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPw = document.getElementById('new-password').value;
        const msg = document.getElementById('pw-update-msg');

        try {
            await authAPI.changePassword(newPw);
            msg.textContent = "تم التحديث بنجاح";
            msg.className = "text-xs font-semibold text-center mt-2 text-emerald-600";
            changePwForm.reset();
            const hintEl = document.getElementById('pw-hint-change');
            if (hintEl) hintEl.innerHTML = '';
            setTimeout(() => { msg.textContent = ""; }, 3000);
        } catch (error) {
            msg.textContent = error.message || "فشل التحديث";
            msg.className = "text-xs font-semibold text-center mt-2 text-red-600";
        }
    });
}

// Load Exams
async function loadStudentExams() {
    const listContainer = document.getElementById('student-exams-list');
    listContainer.innerHTML = '<div class="text-slate-500 text-sm py-2">جاري تحميل الاختبارات...</div>';

    try {
        const [examsToShow, takenResults] = await Promise.all([
            examsAPI.getMyExams(),
            resultsAPI.getMy()
        ]);

        const takenExamIds = takenResults.map(r => r.examId);
        renderExamsList(examsToShow, takenExamIds, takenResults);
    } catch (error) {
        console.error("Error loading exams:", error);
        listContainer.innerHTML = '<div class="text-red-500 text-sm">حدث خطأ أثناء تحميل الاختبارات.</div>';
    }
}

function renderExamsList(exams, takenIds, resultsArr) {
    const container = document.getElementById('student-exams-list');
    container.innerHTML = '';

    if (exams.length === 0) {
        container.innerHTML = '<div class="text-slate-500 text-sm py-2 px-3 bg-slate-50 rounded italic">لا يوجد اختبارات متوفرة لك حالياً.</div>';
        return;
    }

    exams.forEach(exam => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100";

        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <div class="font-bold text-slate-700">${exam.title}</div>
            <div class="text-xs text-slate-500 mt-1">${exam.isMainPlacement ? 'اختبار تحديد مستوى' : 'اختبار قسم'}</div>
        `;

        const actionDiv = document.createElement('div');

        if (takenIds.includes(exam.id)) {
            const res = resultsArr.find(r => r.examId === exam.id);
            actionDiv.innerHTML = `<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200">أُنجِز (النتيجة: ${res.score}%)</span>`;
        } else {
            const btn = document.createElement('button');
            btn.className = "bg-primary hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors";
            btn.textContent = "بدء الاختبار";
            btn.addEventListener('click', () => startExam(exam));
            actionDiv.appendChild(btn);
        }

        div.appendChild(infoDiv);
        div.appendChild(actionDiv);
        container.appendChild(div);
    });
}

async function startExam(exam) {
    currentExamData = exam;

    try {
        currentQuestions = await examsAPI.getQuestions(exam.id);
    } catch (e) {
        alert('فشل تحميل أسئلة الاختبار');
        return;
    }

    if (currentQuestions.length === 0) {
        alert("هذا الاختبار لا يحتوي على أسئلة بعد.");
        return;
    }

    window.app.navigate('view-take-exam');
    document.getElementById('exam-title-display').textContent = exam.title;

    const container = document.getElementById('exam-questions-container');
    container.innerHTML = '';

    currentQuestions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.className = "bg-slate-50 p-5 rounded-lg border border-slate-200";
        qDiv.innerHTML = `
            <div class="font-bold mb-4 text-slate-800"><span class="text-primary ml-1">${index + 1}.</span> ${q.questionText}</div>
            <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="q-${q.id}" value="1" required class="w-4 h-4 text-primary focus:ring-primary border-slate-300">
                    <span class="group-hover:text-primary font-semibold">صح (True)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="q-${q.id}" value="0" class="w-4 h-4 text-primary focus:ring-primary border-slate-300">
                    <span class="group-hover:text-primary font-semibold">خطأ (False)</span>
                </label>
            </div>
        `;
        container.appendChild(qDiv);
    });
}

document.getElementById('btn-cancel-exam')?.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من الإلغاء؟ لن يتم حفظ إجاباتك.')) {
        currentExamData = null;
        currentQuestions = [];
        window.app.navigate('view-student');
    }
});

const examForm = document.getElementById('form-take-exam');
if (examForm) {
    examForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect answers as array of 1/0
        const answers = currentQuestions.map(q => {
            const selected = document.querySelector(`input[name="q-${q.id}"]:checked`);
            return selected ? parseInt(selected.value) : 0;
        });

        try {
            const result = await resultsAPI.submit(currentExamData.id, currentExamData.title, answers);

            if (result.department) {
                // Update user session with new department
                const user = window.app.currentUser;
                user.department = result.department;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                window.app.currentUser = user;
                alert(`تم إنهاء الاختبار. نتيجتك: ${result.score}%. تم توزيعك تلقائياً إلى: ${result.department}`);
            } else {
                alert(`تم إنهاء الاختبار بنجاح. نتيجتك هي: ${result.score}%`);
            }
        } catch (err) {
            alert(err.message || 'حدث خطأ أثناء تسليم الاختبار');
            return;
        }

        examForm.reset();
        currentExamData = null;
        currentQuestions = [];
        window.app.navigate('view-student');
        initStudentDashboard();
    });
}

async function loadStudentExamResults() {
    const listContainer = document.getElementById('student-exam-results');
    try {
        const results = await resultsAPI.getMy();

        if (results.length === 0) {
            listContainer.innerHTML = '<div class="text-slate-500 text-sm italic">لم تقم بأي اختبارات بعد.</div>';
            return;
        }

        listContainer.innerHTML = results.reverse().map(r => `
            <div class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-slate-700">
                <span>${r.examName}</span>
                <span class="${r.score >= 50 ? 'text-emerald-600' : 'text-red-500'} font-bold">${r.score}%</span>
            </div>
        `).join('');
    } catch (e) {
        listContainer.innerHTML = '<div class="text-red-500 text-sm">خطأ في التحميل ...</div>';
    }
}

function loadStudentAnnualResults(resultsArray) {
    const listContainer = document.getElementById('student-annual-results');
    if (!resultsArray || resultsArray.length === 0) {
        listContainer.innerHTML = '<div class="text-slate-500 text-sm italic">لا توجد نتائج سنوية مسجلة لك بعد.</div>';
        return;
    }

    listContainer.innerHTML = resultsArray.map(r => `
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
            <h4 class="font-bold text-primary mb-1">${r.label || r.yearTitle || ''}</h4>
            <p class="text-slate-700 text-sm">${r.score || r.resultText || ''}</p>
        </div>
    `).join('');
}
