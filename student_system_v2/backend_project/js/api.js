// js/api.js
// API Client - يتكلم مع السيرفر بدل Dexie/IndexedDB مباشرة

const API_BASE = '/api';

// ─── Token Management ─────────────────────────────────────────────────────────
export function getToken() {
    return sessionStorage.getItem('authToken');
}

export function setToken(token) {
    sessionStorage.setItem('authToken', token);
}

export function clearToken() {
    sessionStorage.removeItem('authToken');
}

// ─── Core Fetch Helper ────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ في الاتصال بالسيرفر');
    }

    return data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (email, password) =>
        apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),

    signup: (name, email, password) =>
        apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        }),

    changePassword: (newPassword) =>
        apiFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ newPassword })
        }),

    getMe: () => apiFetch('/users/me')
};

// ─── Admin Users API ──────────────────────────────────────────────────────────
export const adminUsersAPI = {
    getAll: () => apiFetch('/admin/users'),

    setDepartment: (userId, department) =>
        apiFetch(`/admin/users/${userId}/department`, {
            method: 'PUT',
            body: JSON.stringify({ department })
        }),

    setAnnualResults: (userId, annualResults) =>
        apiFetch(`/admin/users/${userId}/annual-results`, {
            method: 'PUT',
            body: JSON.stringify({ annualResults })
        }),

    delete: (userId) =>
        apiFetch(`/admin/users/${userId}`, { method: 'DELETE' })
};

// ─── Profile API ──────────────────────────────────────────────────────────────
export const profileAPI = {
    updatePic: (profilePicBase64) =>
        apiFetch('/users/profile-pic', {
            method: 'PUT',
            body: JSON.stringify({ profilePicBase64 })
        })
};

// ─── Exams API ────────────────────────────────────────────────────────────────
export const examsAPI = {
    // Student: get my relevant exams
    getMyExams: () => apiFetch('/exams'),

    // Get questions for an exam
    getQuestions: (examId) => apiFetch(`/exams/${examId}/questions`),

    // Admin: get all exams with questions
    adminGetAll: () => apiFetch('/admin/exams'),

    // Admin: create exam
    adminCreate: (examData) =>
        apiFetch('/admin/exams', {
            method: 'POST',
            body: JSON.stringify(examData)
        }),

    // Admin: update exam
    adminUpdate: (examId, examData) =>
        apiFetch(`/admin/exams/${examId}`, {
            method: 'PUT',
            body: JSON.stringify(examData)
        }),

    // Admin: delete exam
    adminDelete: (examId) =>
        apiFetch(`/admin/exams/${examId}`, { method: 'DELETE' })
};

// ─── Exam Results API ─────────────────────────────────────────────────────────
export const resultsAPI = {
    submit: (examId, examName, answers) =>
        apiFetch('/exam-results', {
            method: 'POST',
            body: JSON.stringify({ examId, examName, answers })
        }),

    // Student: get my results
    getMy: () => apiFetch('/exam-results/my'),

    // Admin: get student results
    adminGetStudentResults: (studentId) =>
        apiFetch(`/admin/exam-results/${studentId}`)
};

// ─── Admin: Create Student ────────────────────────────────────────────────────
export const adminCreateStudent = (name, email, password, department) =>
    apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, department })
    });
