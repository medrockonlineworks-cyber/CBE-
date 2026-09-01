import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId || undefined,
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const targetDbId =
  firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
    ? firebaseConfigJson.firestoreDatabaseId
    : undefined;

// Target designated Firestore database ID safely
let firestoreDb: Firestore | null = null;
try {
  if (targetDbId) {
    try {
      firestoreDb = initializeFirestore(app, {}, targetDbId);
    } catch {
      firestoreDb = getFirestore(app, targetDbId);
    }
  } else {
    try {
      firestoreDb = initializeFirestore(app, {});
    } catch {
      firestoreDb = getFirestore(app);
    }
  }
} catch (err) {
  console.warn('Firestore initialization notice (operating in local offline mode):', err);
  firestoreDb = null;
}

export const db = firestoreDb as Firestore;

let firebaseAuth: any = null;
try {
  firebaseAuth = getAuth(app);
} catch (authErr) {
  console.warn('Firebase Auth initialization notice:', authErr);
  firebaseAuth = null;
}
export const auth = firebaseAuth;

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firestoreDb);


