// src/firebase.js
// Single Firebase integration point.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from 'firebase/firestore';

// In Capacitor WebView the hostname is always 'localhost' or a capacitor:// scheme.
// Firebase auth MUST use the real deployed domain for OAuth redirects to work.
const PROD_DOMAIN = 'erp.aquanubandh.com';

import { Capacitor } from '@capacitor/core';

// Detect Capacitor correctly using the official core library
const isCapacitorNative = Capacitor.isNativePlatform();

const firebaseConfig = {
  apiKey:            'AIzaSyBTXW7N8odwAf9P-REI79Asx9zg04Yllh8',
  authDomain:        isCapacitorNative
    ? PROD_DOMAIN
    : (window.location.hostname === 'localhost'
        ? 'erp.aquanubandh.com'
        : window.location.hostname),
  projectId:         'aquanubandh-erp',
  storageBucket:     'aquanubandh-erp.firebasestorage.app',
  messagingSenderId: '487594447922',
  appId:             '1:487594447922:web:f9e06ef25c61a662aa582b',
  measurementId:     'G-F85FHSYFVH',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: isCapacitorNative ? persistentSingleTabManager() : persistentMultipleTabManager()
  })
});
export default app;
