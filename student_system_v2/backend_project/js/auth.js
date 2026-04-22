// js/auth.js
import { authAPI } from './api.js';

// ─── شروط كلمة المرور ─────────────────────────────────────────────────────────
function validatePassword(password) {
    const errors = [];
    if (!password || password.length < 8)
        errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (!/[A-Z]/.test(password))
        errors.push('يجب أن تحتوي على حرف كبير (A-Z)');
    if (!/[a-z]/.test(password))
        errors.push('يجب أن تحتوي على حرف صغير (a-z)');
    if (!/[0-9]/.test(password))
        errors.push('يجب أن تحتوي على رقم (0-9)');
    return errors;
}

// ─── Password Strength Indicator ─────────────────────────────────────────────
function showPasswordHint(inputEl, hintContainerId) {
    let hintEl = document.getElementById(hintContainerId);
    if (!hintEl) {
        hintEl = document.createElement('div');
        hintEl.id = hintContainerId;
        hintEl.className = 'mt-1 text-xs space-y-1';
        inputEl.parentNode.appendChild(hintEl);
    }

    const pw = inputEl.value;
    const rules = [
        { test: pw.length >= 8,      label: '8 أحرف على الأقل' },
        { test: /[A-Z]/.test(pw),    label: 'حرف كبير (A-Z)' },
        { test: /[a-z]/.test(pw),    label: 'حرف صغير (a-z)' },
        { test: /[0-9]/.test(pw),    label: 'رقم (0-9)' },
    ];

    hintEl.innerHTML = rules.map(r => `
        <div class="flex items-center gap-1 ${r.test ? 'text-emerald-600' : 'text-slate-400'}">
            <span>${r.test ? '✓' : '○'}</span>
            <span>${r.label}</span>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('form-login');
    const signupForm = document.getElementById('form-signup');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    // ─── Password strength indicator on signup ────────────────────────────────
    const signupPasswordInput = document.getElementById('signup-password');
    if (signupPasswordInput) {
        signupPasswordInput.addEventListener('input', () => {
            showPasswordHint(signupPasswordInput, 'pw-hint-signup');
        });
    }

    // ─── Login Handler ────────────────────────────────────────────────────────
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            loginError.classList.add('hidden');

            try {
                const { token, user } = await authAPI.login(email, password);
                loginForm.reset();
                window.app.loginUser(token, user);
            } catch (error) {
                loginError.textContent = error.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                loginError.classList.remove('hidden');
            }
        });
    }

    // ─── Signup Handler ───────────────────────────────────────────────────────
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim().toLowerCase();
            const password = document.getElementById('signup-password').value;

            signupError.classList.add('hidden');

            // Client-side password validation
            const pwErrors = validatePassword(password);
            if (pwErrors.length > 0) {
                signupError.textContent = pwErrors.join(' | ');
                signupError.classList.remove('hidden');
                return;
            }

            try {
                const { token, user } = await authAPI.signup(name, email, password);
                signupForm.reset();
                const hintEl = document.getElementById('pw-hint-signup');
                if (hintEl) hintEl.innerHTML = '';
                window.app.loginUser(token, user);
            } catch (error) {
                signupError.textContent = error.message || 'حدث خطأ أثناء إنشاء الحساب.';
                signupError.classList.remove('hidden');
            }
        });
    }
});
