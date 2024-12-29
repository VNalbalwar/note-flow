import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCNCiQItOfyvYmb0gezwrxe60p_qRAbIFI",
    authDomain: "notion-clone-8c3d5.firebaseapp.com",
    projectId: "notion-clone-8c3d5",
    storageBucket: "notion-clone-8c3d5.firebasestorage.app",
    messagingSenderId: "413348360803",
    appId: "1:413348360803:web:a48f6f396e03705edafe56",
    measurementId: "G-W11JP62P24"
  };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };