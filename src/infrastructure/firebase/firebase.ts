import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { isSupported, getAnalytics } from 'firebase/analytics';
import appletConfig from '../../../firebase-applet-config.json';

// Configuration provided by the user for Firebase Hosting (easy-english-4c948)
export const easyEnglishFirebaseConfig = {
  apiKey: "AIzaSyACiYLFSmyHlGHADc6ippiJJScR7Et0t_0",
  authDomain: "easy-english-4c948.firebaseapp.com",
  projectId: "easy-english-4c948",
  storageBucket: "easy-english-4c948.firebasestorage.app",
  messagingSenderId: "223346557736",
  appId: "1:223346557736:web:0e58c62ad5f6c3f65cc61d",
  measurementId: "G-08NCRN4WLR"
};

// Use the Easy English project on its production domain and local development hosts.
const isCustomHosting =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('easy-english') ||
    window.location.hostname.includes('web.app') ||
    window.location.hostname.includes('firebaseapp.com') ||
    localStorage.getItem('FORCE_EASY_ENGLISH_FIREBASE') === 'true');

// Select active config
export const activeFirebaseConfig = isCustomHosting
  ? easyEnglishFirebaseConfig
  : (appletConfig || easyEnglishFirebaseConfig);

// Initialize Firebase
export const app = initializeApp(activeFirebaseConfig);
export const auth = getAuth(app);

// Use specific database ID if provisioned by AI Studio, or default if running on standard Firebase
export const db = (activeFirebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (activeFirebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);

// Initialize Analytics when supported in the browser
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported && activeFirebaseConfig.measurementId) {
        getAnalytics(app);
      }
    })
    .catch(() => {});
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection check: client offline or database warming up.');
    }
    return false;
  }
}
