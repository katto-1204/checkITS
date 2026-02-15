import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD6W1u_O__r25W09Y6y0NhD7JSN7MBetzM",
    authDomain: "its-attend.firebaseapp.com",
    projectId: "its-attend",
    storageBucket: "its-attend.firebasestorage.app",
    messagingSenderId: "938478643858",
    appId: "1:938478643858:web:0ec562833c23cfbe67944b",
    measurementId: "G-SZZ3NZ7BMQ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
