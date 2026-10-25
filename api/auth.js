// API بسيط على Vercel — بيرد على /api/auth/login ويقفل التسجيل
export default function handler(req, res) {
  res.status(410).json({
    error: 'التسجيل والدخول مقفولين — الموقع مفتوح بدون حسابات',
    code: 'AUTH_DISABLED',
  })
}
