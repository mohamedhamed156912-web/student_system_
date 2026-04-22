# 🌐 رفع الموقع على الإنترنت — دليل شامل

## ✅ المنصة المقترحة: Railway (مجاني + سهل)
رابط: https://railway.app

---

## 📋 الخطوات (من الصفر للإنترنت في 10 دقائق)

### المرحلة 1 — تجهيز GitHub

1. اذهب إلى **https://github.com** وسجل دخول (أو أنشئ حساب مجاني)
2. اضغط **New Repository**
3. اسمه: `student-system` — اضغط **Create repository**
4. افتح Terminal في مجلد المشروع وشغّل:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/student-system.git
git push -u origin main
```

> ⚠️ استبدل `YOUR_USERNAME` باسم حسابك على GitHub

---

### المرحلة 2 — النشر على Railway

1. اذهب إلى **https://railway.app**
2. اضغط **Login with GitHub** (سجل بحساب GitHub مباشرة)
3. اضغط **New Project**
4. اختر **Deploy from GitHub repo**
5. اختر مشروع `student-system`
6. Railway سيكتشف تلقائياً إنه Node.js ويشغله ✅

---

### المرحلة 3 — الحصول على الرابط

1. في صفحة المشروع على Railway، اضغط على **Settings**
2. في قسم **Networking** اضغط **Generate Domain**
3. ستحصل على رابط مثل: `https://student-system-abc123.up.railway.app`

**هذا هو رابط موقعك على الإنترنت! 🎉**

---

## 🔧 إعدادات اختيارية في Railway

في صفحة المشروع → **Variables** يمكنك إضافة:

| المتغير | القيمة |
|---------|--------|
| `JWT_SECRET` | أي نص سري طويل (مثل: `my_super_secret_key_delta_2024`) |
| `NODE_ENV` | `production` |

---

## 💾 ملاحظة عن قاعدة البيانات

Railway يدعم SQLite لكن الملف يُمسح عند كل deploy جديد.

**للبيانات الدائمة** (موصى به للإنتاج):
- استخدم **Railway PostgreSQL** أو **PlanetScale MySQL** (مجاني)
- أو استخدم **Railway Volume** (قرص دائم) من Settings → Volumes

للاستخدام العادي والتعليمي، SQLite كافٍ تماماً.

---

## 🔄 تحديث الموقع لاحقاً

كل ما تعدل كود وترفعه لـ GitHub، Railway يتحدث تلقائياً:

```bash
git add .
git commit -m "تحديث الكود"
git push
```

---

## 🛠️ بدائل لـ Railway

| المنصة | المجانية | السهولة |
|--------|---------|--------|
| **Railway** ⭐ | $5 credit/شهر | ⭐⭐⭐ سهل جداً |
| **Render** | 750 ساعة/شهر | ⭐⭐⭐ سهل |
| **Fly.io** | 3 VMs مجانية | ⭐⭐ متوسط |
| **Glitch** | مجاني لكن بطيء | ⭐⭐⭐ سهل |

---

## 🏃 التشغيل المحلي (للتطوير)

```bash
npm install
npm start
# افتح: http://localhost:3000
```

---

## 🔑 بيانات الدخول الافتراضية
- **البريد:** `admin@system.com`
- **كلمة المرور:** `admin123`
