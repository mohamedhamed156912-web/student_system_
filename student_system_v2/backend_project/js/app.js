// js/app.js
import { authAPI, getToken, setToken, clearToken } from './api.js';

// Global App State
window.app = {
    currentUser: null,

    init: async function () {
        const sessionUser = sessionStorage.getItem('currentUser');
        const token = getToken();

        if (sessionUser && token) {
            this.currentUser = JSON.parse(sessionUser);
            authAPI.getMe()
                .then(freshUser => {
                    this.currentUser = freshUser;
                    sessionStorage.setItem('currentUser', JSON.stringify(freshUser));
                    this.updateNav(true);
                })
                .catch(() => { this.logout(); });
        }

        this.setupEventListeners();
        this.route();
    },

    route: function () {
        if (!this.currentUser) {
            this.navigate('view-landing');
            this.updateNav(false);
            return;
        }
        this.updateNav(true);
        if (this.currentUser.role === 'admin') {
            this.navigate('view-admin');
            document.dispatchEvent(new CustomEvent('renderAdminDashboard'));
        } else {
            this.navigate('view-student');
            document.dispatchEvent(new CustomEvent('renderStudentDashboard'));
        }
    },

    navigate: function (viewId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        else console.error(`View ${viewId} not found!`);
    },

    updateNav: function (isLoggedIn) {
        const authButtons = document.getElementById('auth-buttons');
        if (!isLoggedIn) {
            authButtons.innerHTML = `
                <button class="text-slate-600 hover:text-primary font-semibold text-sm cursor-pointer" id="nav-login">تسجيل الدخول</button>
                <button class="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer" id="nav-signup">حساب جديد</button>
            `;
            document.getElementById('nav-login')?.addEventListener('click', () => this.navigate('view-login'));
            document.getElementById('nav-signup')?.addEventListener('click', () => this.navigate('view-signup'));
        } else {
            authButtons.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold text-slate-700 hidden sm:block">مرحباً، ${this.currentUser.name}</span>
                    <button class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer" id="nav-logout">تسجيل الخروج</button>
                </div>
            `;
            document.getElementById('nav-logout')?.addEventListener('click', () => this.logout());
        }
    },

    loginUser: function (token, userData) {
        setToken(token);
        this.currentUser = userData;
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        this.route();
    },

    logout: function () {
        this.currentUser = null;
        clearToken();
        sessionStorage.removeItem('currentUser');
        this.route();
    },

    setupEventListeners: function () {
        document.getElementById('logo-btn').addEventListener('click', () => this.route());
        document.getElementById('btn-landing-login')?.addEventListener('click', () => this.navigate('view-login'));
        document.getElementById('btn-landing-signup')?.addEventListener('click', () => this.navigate('view-signup'));
        document.getElementById('link-to-signup')?.addEventListener('click', () => this.navigate('view-signup'));
        document.getElementById('link-to-login')?.addEventListener('click', () => this.navigate('view-login'));
    }
};

document.addEventListener('DOMContentLoaded', () => { window.app.init(); });
