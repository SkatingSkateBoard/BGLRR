// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAo3L411yKVCdJAyWd7E3Kx4hA0LlkaeC4",
  authDomain: "bglrr-emergency-system.firebaseapp.com",
  projectId: "bglrr-emergency-system",
  storageBucket: "bglrr-emergency-system.firebasestorage.app",
  messagingSenderId: "987503906442",
  appId: "1:987503906442:web:c07fda82e20b5e67982773",
  measurementId: "G-24WCJN4GW9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
