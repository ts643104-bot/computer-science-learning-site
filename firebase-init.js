import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js'
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js'

const config = window.FIREBASE_CONFIG || {}
const configured = Boolean(config.apiKey && config.projectId && config.appId)

if (!configured) {
  window.firebaseReady = Promise.resolve(null)
} else {
  const app = initializeApp(config)

  window.firebaseReady = isSupported()
    .then((supported) => (supported ? getAnalytics(app) : null))
    .catch(() => null)

  window.firebaseApp = app
}
