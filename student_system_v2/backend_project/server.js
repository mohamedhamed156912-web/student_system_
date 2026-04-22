// server.js - Backend Server for Student System
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'student_system_secret_2024_delta';

// ─── Database Setup ───────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    department TEXT,
    profilePicBase64 TEXT
  );

  CREATE TABLE IF NOT EXISTS annual_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    label TEXT NOT NULL,
    score TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    isMainPlacement INTEGER NOT NULL DEFAULT 0,
    targetDepartment TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    examId INTEGER NOT NULL,
    questionText TEXT NOT NULL,
    isTrue INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId INTEGER NOT NULL,
    examId INTEGER NOT NULL,
    examName TEXT NOT NULL,
    score REAL NOT NULL,
    answers TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE CASCADE
  );
`);

// Seed Admin
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const hashedPw = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, 'admin')")
    .run('admin@system.com', hashedPw, 'مدير النظام');
  console.log('✅ Admin created: admin@system.com / admin123');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'الجلسة منتهية، سجل الدخول مجددًا' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'غير مسموح' });
  next();
}

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

function getUserWithAnnual(id) {
  const user = db.prepare('SELECT id, email, name, role, department, profilePicBase64 FROM users WHERE id = ?').get(id);
  if (user) user.annualResults = db.prepare('SELECT label, score FROM annual_results WHERE userId = ?').all(id);
  return user;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });

  const { password: _, ...safe } = user;
  safe.annualResults = db.prepare('SELECT label, score FROM annual_results WHERE userId = ?').all(user.id);
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: safe });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

  const pwErrors = validatePassword(password);
  if (pwErrors.length > 0) return res.status(400).json({ error: pwErrors.join(' | ') });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

  const hashedPw = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, 'student')")
    .run(email.toLowerCase().trim(), hashedPw, name.trim());

  const newUser = getUserWithAnnual(result.lastInsertRowid);
  const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '8h' });
  res.status(201).json({ token, user: newUser });
});

app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { newPassword } = req.body;
  const pwErrors = validatePassword(newPassword);
  if (pwErrors.length > 0) return res.status(400).json({ error: pwErrors.join(' | ') });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ success: true });
});

// ─── USER ─────────────────────────────────────────────────────────────────────
app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = getUserWithAnnual(req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(user);
});

app.put('/api/users/profile-pic', authMiddleware, (req, res) => {
  db.prepare('UPDATE users SET profilePicBase64 = ? WHERE id = ?').run(req.body.profilePicBase64, req.user.id);
  res.json({ success: true });
});

// ─── ADMIN USERS ──────────────────────────────────────────────────────────────

// GET all students (supports ?search=query)
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : null;
  let users;
  if (search) {
    users = db.prepare(
      "SELECT id, email, name, role, department, profilePicBase64 FROM users WHERE role = 'student' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)"
    ).all(search, search, search);
  } else {
    users = db.prepare("SELECT id, email, name, role, department, profilePicBase64 FROM users WHERE role = 'student'").all();
  }
  users.forEach(u => { u.annualResults = db.prepare('SELECT label, score FROM annual_results WHERE userId = ?').all(u.id); });
  res.json(users);
});

// POST /api/admin/users — Admin creates a new student account
app.post('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const { name, email, password, department } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' });

  const pwErrors = validatePassword(password);
  if (pwErrors.length > 0) return res.status(400).json({ error: pwErrors.join(' | ') });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

  const hashedPw = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (email, password, name, role, department) VALUES (?, ?, ?, 'student', ?)")
    .run(email.toLowerCase().trim(), hashedPw, name.trim(), department || null);

  const newUser = getUserWithAnnual(result.lastInsertRowid);
  res.status(201).json(newUser);
});

app.put('/api/admin/users/:id/department', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('UPDATE users SET department = ? WHERE id = ?').run(req.body.department, req.params.id);
  res.json(getUserWithAnnual(parseInt(req.params.id)));
});

app.put('/api/admin/users/:id/annual-results', authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  db.prepare('DELETE FROM annual_results WHERE userId = ?').run(userId);
  const insert = db.prepare('INSERT INTO annual_results (userId, label, score) VALUES (?, ?, ?)');
  for (const r of req.body.annualResults) insert.run(userId, r.label, r.score);
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── EXAMS ────────────────────────────────────────────────────────────────────
app.get('/api/exams', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  let exams;
  if (req.user.role === 'admin') {
    exams = db.prepare('SELECT * FROM exams').all();
  } else if (!user.department) {
    exams = db.prepare('SELECT * FROM exams WHERE isMainPlacement = 1').all();
  } else {
    exams = db.prepare("SELECT * FROM exams WHERE isMainPlacement = 0 AND (targetDepartment = ? OR targetDepartment IS NULL OR targetDepartment = '')").all(user.department);
  }
  res.json(exams);
});

app.get('/api/exams/:id/questions', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM questions WHERE examId = ?').all(req.params.id));
});

app.get('/api/admin/exams', authMiddleware, adminMiddleware, (req, res) => {
  const exams = db.prepare('SELECT * FROM exams').all();
  exams.forEach(e => { e.questions = db.prepare('SELECT * FROM questions WHERE examId = ?').all(e.id); });
  res.json(exams);
});

app.post('/api/admin/exams', authMiddleware, adminMiddleware, (req, res) => {
  const { title, isMainPlacement, targetDepartment, questions } = req.body;
  const r = db.prepare('INSERT INTO exams (title, isMainPlacement, targetDepartment) VALUES (?, ?, ?)')
    .run(title, isMainPlacement ? 1 : 0, targetDepartment || null);
  const insertQ = db.prepare('INSERT INTO questions (examId, questionText, isTrue) VALUES (?, ?, ?)');
  for (const q of (questions || [])) insertQ.run(r.lastInsertRowid, q.questionText, q.isTrue ? 1 : 0);
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(r.lastInsertRowid);
  exam.questions = db.prepare('SELECT * FROM questions WHERE examId = ?').all(r.lastInsertRowid);
  res.status(201).json(exam);
});

app.put('/api/admin/exams/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { title, isMainPlacement, targetDepartment, questions } = req.body;
  const examId = req.params.id;
  db.prepare('UPDATE exams SET title = ?, isMainPlacement = ?, targetDepartment = ? WHERE id = ?')
    .run(title, isMainPlacement ? 1 : 0, targetDepartment || null, examId);
  if (questions && Array.isArray(questions)) {
    db.prepare('DELETE FROM questions WHERE examId = ?').run(examId);
    const insertQ = db.prepare('INSERT INTO questions (examId, questionText, isTrue) VALUES (?, ?, ?)');
    for (const q of questions) insertQ.run(examId, q.questionText, q.isTrue ? 1 : 0);
    const newQs = db.prepare('SELECT * FROM questions WHERE examId = ?').all(examId);
    const results = db.prepare('SELECT * FROM exam_results WHERE examId = ?').all(examId);
    for (const result of results) {
      const answers = JSON.parse(result.answers || '[]');
      let correct = 0;
      newQs.forEach((q, idx) => { if (answers[idx] !== undefined && answers[idx] == q.isTrue) correct++; });
      db.prepare('UPDATE exam_results SET score = ? WHERE id = ?')
        .run(newQs.length > 0 ? Math.round((correct / newQs.length) * 100) : 0, result.id);
    }
  }
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  exam.questions = db.prepare('SELECT * FROM questions WHERE examId = ?').all(examId);
  res.json(exam);
});

app.delete('/api/admin/exams/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── EXAM RESULTS ─────────────────────────────────────────────────────────────
app.post('/api/exam-results', authMiddleware, (req, res) => {
  const { examId, examName, answers } = req.body;
  const studentId = req.user.id;
  const questions = db.prepare('SELECT * FROM questions WHERE examId = ?').all(examId);
  if (questions.length === 0) return res.status(400).json({ error: 'الامتحان لا يحتوي على أسئلة' });

  let correct = 0;
  questions.forEach((q, idx) => { if (answers[idx] !== undefined && answers[idx] == q.isTrue) correct++; });
  const score = Math.round((correct / questions.length) * 100);

  const existing = db.prepare('SELECT id FROM exam_results WHERE studentId = ? AND examId = ?').get(studentId, examId);
  if (existing) {
    db.prepare('UPDATE exam_results SET score = ?, answers = ? WHERE id = ?').run(score, JSON.stringify(answers), existing.id);
  } else {
    db.prepare('INSERT INTO exam_results (studentId, examId, examName, score, answers) VALUES (?, ?, ?, ?, ?)')
      .run(studentId, examId, examName, score, JSON.stringify(answers));
  }

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (exam?.isMainPlacement) {
    const department = score >= 70 ? 'قسم أ' : 'قسم ب';
    db.prepare('UPDATE users SET department = ? WHERE id = ?').run(department, studentId);
    return res.json({ score, department, user: getUserWithAnnual(studentId) });
  }
  res.json({ score });
});

app.get('/api/exam-results/my', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, examId, examName, score FROM exam_results WHERE studentId = ?').all(req.user.id));
});

app.get('/api/admin/exam-results/:studentId', authMiddleware, adminMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, examId, examName, score FROM exam_results WHERE studentId = ?').all(req.params.studentId));
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📧 Admin: admin@system.com / admin123\n`);
});
