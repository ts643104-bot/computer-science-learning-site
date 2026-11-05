# شبكة وعلوم — منصة تعليم علوم الحاسب والشبكات

منصة تعليمية باللهجة المصرية تشرح علوم الحاسب والشبكات من الأساسيات لحد الاحتراف.

- **الموقع:** https://computer-science-learning-site.vercel.app/
- **المستودع:** https://github.com/ts643104-bot/computer-science-learning-site/
- **قناة واتساب:** https://whatsapp.com/channel/029Vb7vDQeFSAt3D2GnJH0T
- **الإيميل:** ts643104@gmail.com

---

## نظرة سريعة

المشروع يستخدم **Firebase Authentication** لتسجيل الطلاب والأدمن، و**Cloud Firestore** لطلبات التسجيل وبيانات المستخدمين ولوحة التحكم.

```
المتصفح  →  Firebase Authentication + Cloud Firestore
```

**الميزات:**

- بيانات حقيقية ومركزية في Cloud Firestore.
- تسجيل الطلاب والأدمن بالبريد الإلكتروني وكلمة المرور.
- قواعد أمن Firestore لتقييد الوصول.
- الموقع ثابت على Vercel، والبيانات في Firebase.

**إتاحة الدروس:** روابط الدروس الأربعين مفتوحة للطلاب المسجلين. الدروس التي لم يُكتب شرحها التفصيلي بعد تعرض صفحة تمهيدية توضح ذلك بدلًا من منع فتح الدرس.

---

## المكوّنات

| الملف | الوصف |
|---|---|
| `firebase-config.js` | إعدادات Firebase ومُعرّف حساب الأدمن المسموح |
| `app.js` | تسجيل الطلاب والتحقق من الموافقة |
| `firebase-api.js` | ربط واجهة الدروس المبنية مع تقدم الطالب ونتائج الاختبارات في Firestore |
| `login-app.js` | تسجيل الدخول / إنشاء حساب الطلاب |
| `admin-app.js` | تسجيل دخول الأدمن ولوحة التحكم |
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

انسخ محتوى [`firestore.rules`](./firestore.rules) إلى **Firebase Console → Firestore → Rules** ثم انشره. القواعد تحصر صلاحيات الأدمن في UID المعتمد، وتمنع إنشاء أدمن من واجهة عامة. يجب استخدام أحدث نسخة؛ الدالة `ownUser(userId)` تستقبل معرّف المستخدم صراحةً حتى تكون قواعد Firestore صالحة للنشر.

إذا نجح دخول الأدمن لكن ظهرت رسالة رفض صلاحيات في اللوحة، فتأكد من نشر أحدث نسخة من `firestore.rules` إلى مشروع Firebase نفسه المستخدم في `firebase-config.js`.

### 3. إعداد حساب الأدمن

فعّل **Email/Password** في Firebase Authentication، ثم سجّل الدخول من `/admin.html` باستخدام بيانات حساب Firebase الموجود الذي يطابق UID المعرّف في `firebase-config.js`. لا توجد شاشة لإنشاء أول أدمن؛ يجب أن يكون الحساب موجودًا مسبقًا في Firebase Authentication.

فعّل **Authentication → Settings → Authorized domains** للنطاق المحلي ولنطاق Vercel قبل الاختبار.

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
- **التسجيل مقفول:** يجب موافقة الأدمن وإضافة البريد إلى مجموعة `whitelist` في Firestore.
- قواعد Firestore هي مرجع الصلاحيات؛ فحص الواجهة وحده لا يمنح صلاحية أدمن.
- قفل المحاولات في المتصفح لتحسين تجربة الاستخدام، وليس بديلًا عن حماية Firebase.

---

## تشغيل الموقع محليًا

```bash
npx serve .
```

الموقع يعمل من `http://` لا `file://` بسب ES Modules.

---

**تصميم المهندس طه سلطان / タハ A3**