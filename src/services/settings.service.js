// src/services/settings.service.js
import {
  doc, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

export function subscribeOrgName(orgId, callback) {
  if (!orgId) return () => {};
  return onSnapshot(doc(db, 'organizations', orgId), (snap) => {
    if (snap.exists()) callback(snap.data().name || '');
  });
}

export async function getSystemConfig(orgId) {
  const snap = await getDoc(doc(db, 'organizations', orgId, 'settings', 'system'));
  return snap.exists() ? snap.data() : {};
}

export async function updateSystemConfig(orgId, data) {
  return setDoc(
    doc(db, 'organizations', orgId, 'settings', 'system'),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getOrgProfile(orgId) {
  const snap = await getDoc(doc(db, 'organizations', orgId));
  return snap.exists() ? snap.data() : {};
}

export async function updateOrgProfile(userId, orgId, data) {
  await setDoc(doc(db, 'organizations', orgId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  if (data.name) {
    const globalRef = doc(db, 'global_users', userId);
    const gSnap = await getDoc(globalRef);
    if (gSnap.exists()) {
      const gData = gSnap.data();
      const newOrgs = (gData.orgs || []).map(o => {
        if (o.id === orgId) return { ...o, name: data.name };
        return o;
      });
      await updateDoc(globalRef, { orgs: newOrgs });
    }
  }
}
