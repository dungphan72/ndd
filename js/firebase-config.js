// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCbnuruybHIx3NMb4blrfcEtIi8gShICo",
  authDomain: "ndd1-b7e7e.firebaseapp.com",
  projectId: "ndd1-b7e7e",
  storageBucket: "ndd1-b7e7e.firebasestorage.app",
  messagingSenderId: "502060090254",
  appId: "1:502060090254:web:6e30346ff472fa1f0c5adf",
  measurementId: "G-3PCB30C2Y7"
};

// Initialize Firebase App, Analytics & Firestore Database
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Expose globally for application use
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.firebaseDb = db;
window.firestoreHelpers = { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot };

console.log("🔥 Firebase App, Analytics & Firestore Database initialized for ndd1-b7e7e");

