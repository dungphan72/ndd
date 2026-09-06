// Firebase Configuration & Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCbnuruybHIx3NMb4blrfcEtIi8gShICo",
  authDomain: "ndd1-b7e7e.firebaseapp.com",
  projectId: "ndd1-b7e7e",
  storageBucket: "ndd1-b7e7e.firebasestorage.app",
  messagingSenderId: "502060090254",
  appId: "1:502060090254:web:6e30346ff472fa1f0c5adf",
  measurementId: "G-3PCB30C2Y7"
};

// Initialize Firebase App, Analytics, Firestore Database & Authentication
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Expose globally for application use
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firestoreHelpers = { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, startAt, endAt, onSnapshot };
window.firebaseAuthHelpers = {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
};

console.log("🔥 Firebase App, Analytics, Firestore Database & Authentication initialized for ndd1-b7e7e");

