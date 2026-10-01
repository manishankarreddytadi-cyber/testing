// src/services/auth.service.js
// Google Sign-In only — no email/password.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const isCapacitorNative = Capacitor.isNativePlatform();

  if (isCapacitorNative) {
    // Native mobile login (bypasses browser Custom Tab issues)
    const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    return signInWithCredential(auth, credential);
  }

  // Web login
  const isMobileWeb = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobileWeb) {
    return signInWithRedirect(auth, provider);
  } else {
    return signInWithPopup(auth, provider);
  }
}

export async function signOut() {
  const isCapacitorNative = Capacitor.isNativePlatform();

  if (isCapacitorNative) {
    await FirebaseAuthentication.signOut();
  }
  return firebaseSignOut(auth);
}
