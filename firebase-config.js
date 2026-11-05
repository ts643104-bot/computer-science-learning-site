import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyANt1mK-RmRNWHEJ0LoLDVXMFbGaFOWrQk",
  authDomain: "computer-science-learning-site.firebaseapp.com",
  projectId: "computer-science-learning-site",
  storageBucket: "computer-science-learning-site.firebasestorage.app",
  messagingSenderId: "107894672121",
  appId: "1:107894672121:web:e9b7045307fc6a4aeaf028",
  measurementId: "G-BQ3SLEX0SW"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const ADMIN_UID = "llwV6o2SGjUunVyphHBKiVMszX63"
export const persistAuthSession = () => setPersistence(auth, browserLocalPersistence)
export { app }
