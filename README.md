# شبكة وعلوم — منصة تعليم علوم الحاسب والشبكات

منصة تعليمية باللهجة المصرية تشرح علوم الحاسب والشبكات من الأساسيات لحد الاحتراف.

- **الموقع:** https://computer-science-learning-site.vercel.app/
- **المستودع:** https://github.com/ts643104-bot/computer-science-learning-site/
- **قناة واتساب:** https://whatsapp.com/channel/029Vb7vDQeFSAt3D2GnJH0T
- **الإيميل:** ts643104@gmail.com

---

## نظرة سريعة

المشروع الآن يعتمد على **Firebase** (Firebase Auth + Cloud Firestore) بدلاً من Google Sheets / Apps Script.

```
المتصفح  →  api-client.js  →  Firebase SDK  →  Cloud Firestore
```

**الميزات:**

- بيانات حقيقية ومركزية في Cloud Firestore.
- مصادقة موحّدة عبر Firebase Auth (بريد/باسورد مشتق من رقم الهاتف).
- قواعد أمن Firestore لتقييد الوصول.
- لا سيرفر، لا SQLite، لا Apps Script. كله Static على Vercel + Firebase.

---

## المكوّنات

| الملف | الوصف |
|---|---|
| `firebase-config.js` | إعدادات Firebase (تحمّل أولاً كـ `<script>` عادي) |
| `api-client.js` | طبقة التواصل مع Firebase (التسجيل، الدخول، التقدم، التعليقات، لوحة الأدمن) |
| `login-app.js` | منطق شاشة تسجيل الدخول / إنشاء حساب الطلاب |
| `admin-app.js` | منطق لوحة تحكم الأدمن مع نظام الحظر |
| `login.html` | صفحة تسجيل الدخول للطلاب |
| `admin.html` | لوحة تحكم الأدمن |
| `index.html` | الموقع الرئيسي |

---

## الإعداد

### 1. أنشئ مشروع Firebase

1. افتح [Firebase Console](https://console.firebase.google.com/).
2. أنشئ مشروع (استخدم `computer-science-learning-site`).
3. فعّل **Authentication** ← **Sign-in method** ← فعل `Email/Password`.
4. فعّل **Firestore Database** وأنشئ قاعدة بيانات في وضع الاختبار (ثم انتقل للإنتاج).
5. افتح **Project settings** ← **Your apps** ← أضف تطبيق ويب.
6. انسخ إعدادات Firebase وضعها في `firebase-config.js`.

### 2. قواعد أمن Firestore

في **Firestore → Rules**، الصق القواعد التالية:

```javascript
rules_version = '2';
service cloud.firestore('databases/{database}/documents') {
  match /databases/{database}/resources/users/{userId} {
    allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
    allow create: if request.auth != null;
    allow update, delete: if request.auth.uid == userId || isAdmin();
  }

  match /databases/{database}/resources/whitelist/{phone} {
    allow read: if true;
    allow create, update, delete: if isAdmin();
  }

  match /databases/{database}/resources/comments/{commentId} {
    allow read: if true;
    allow create: if request.auth != null || request.resource.data.uid == 'guest';
  }

  match /databases/{database}/resources/progress/{progressId} {
    allow read, create, update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
  }

  function isAdmin() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
  }
}
```

### 3. أنشئ حساب الأدمن الأول

بعد ربط التطبيق بـ Firebase:

1. افتح لوحة الأدمن (`admin.html`).
2. سجّل الدخول بالواتساب وطلب تفعية الحساب الأول.
3. استخدم **Firebase Console → Firestore → users** لتعديل حسابك:
   - ضع `role: "admin"`.

بديل: استخدم Firebase CLI لتشغيل سكريبت seed لإنشاء الأدمن.

---

## المتطلبات

- حساب Firebase (مجاني على مستوى Spark).
- رفع الملفات إلى Vercel أو أي CDN.
- تحديث `firebase-config.js` بإعدادات مشروعك.

---

## الصفحات

| الرابط | الوصف |
|---|---|
| `/` | الموقع الرئيسي |
| `/login.html` | تسجيل دخول الطلاب / إنشاء حساب |
| `/admin.html` | لوحة تحكم الأدمن |

---

## الأمان

- الباسوردات مُدارة عبر Firebase Auth (bcrypt على مستوى Firebase).
- **التسجيل مقفول:** لازم رقمك يكون مضاف في مجموعة `whitelist` في Firestore أول.
- الأدمن بس هو اللي يوصل لعمليات `admin*`.
- **نظام قفل الأدمن:** محاولتان فقط، أولاً يُغلق لمدة ٢٤ ساعة، ثانيته يُقفل بشكل دائم على الجهاز.

---

## تشغيل الموقع محليًا

```bash
npx serve .
```

الموقع يعمل من `http://` لا `file://` بسب ES Modules.

---

**تصميم المهندس طه سلطان / タハ A3**