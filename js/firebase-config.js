// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCbnuruybHIx3NMb4blrfcEtIi8gShICo",
  authDomain: "ndd1-b7e7e.firebaseapp.com",
  projectId: "ndd1-b7e7e",
  storageBucket: "ndd1-b7e7e.firebasestorage.app",
  messagingSenderId: "502060090254",
  appId: "1:502060090254:web:6e30346ff472fa1f0c5adf",
  measurementId: "G-3PCB30C2Y7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Expose globally for convenience
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
console.log("🔥 Firebase & Analytics initialized for ndd1-b7e7e");
