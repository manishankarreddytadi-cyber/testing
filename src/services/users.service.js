// src/services/users.service.js
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
  onSnapshot, serverTimestamp, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Users ────────────────────────────────────────────────────────────────────

export function subscribeUsers(orgId, callback) {
  return onSnapshot(
    collection(db, 'organizations', orgId, 'users'),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeUsers error:', err)
  );
}

export async function addUser(orgId, userData) {
  return addDoc(collection(db, 'organizations', orgId, 'users'), {
    ...userData,
    createdAt: serverTimestamp(),
  });
}

export async function updateUser(orgId, userId, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'users', userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserPermissions(orgId, userId, modulePermissions) {
  return updateDoc(doc(db, 'organizations', orgId, 'users', userId), {
    modulePermissions,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUser(orgId, userId) {
  // Remove from org's users subcollection
  await deleteDoc(doc(db, 'organizations', orgId, 'users', userId));
  // Also remove this org from the user's global_users doc so the
  // app doesn't get stuck in "Loading Workspace..." for the removed user
  try {
    const globalRef = doc(db, 'global_users', userId);
    const gSnap = await getDoc(globalRef);
    if (gSnap.exists()) {
      const data = gSnap.data();
      const filteredOrgs = (data.orgs || []).filter(o => o.id !== orgId);
      await updateDoc(globalRef, { orgs: filteredOrgs });
    }
  } catch (e) {
    console.error('deleteUser: failed to update global_users', e);
  }
}

// ─── Organisations & Invite Codes ─────────────────────────────────────────────

export function subscribeOrganisation(orgId, callback) {
  return onSnapshot(
    doc(db, 'organizations', orgId),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => console.error('subscribeOrganisation error:', err)
  );
}

export async function createOrganisation(userId, userEmail, userName, orgName) {
  // Generate random 6-char code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const orgRef = doc(collection(db, 'organizations'));
  const orgId = orgRef.id;

  // Create top-level organization document
  await setDoc(orgRef, {
    name: orgName,
    inviteCode: code,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  // Map code to orgId globally
  await setDoc(doc(db, 'invite_codes', code), {
    orgId,
    orgName,
    createdAt: serverTimestamp(),
  });

  // Add user to the org's users subcollection as Admin
  await setDoc(doc(db, 'organizations', orgId, 'users', userId), {
    name: userName || (userEmail ? userEmail.split('@')[0] : 'Unknown'),
    email: userEmail || 'unknown@example.com',
    role: 'Admin',
    status: 'active',
    modulePermissions: {},
    createdAt: serverTimestamp(),
  });

  // Update global_users to include this new org
  const globalRef = doc(db, 'global_users', userId);
  const gSnap = await getDoc(globalRef);
  
  const newOrgObj = { id: orgId, name: orgName, role: 'Admin' };
  
  if (gSnap.exists()) {
    const data = gSnap.data();
    await updateDoc(globalRef, { orgs: [...(data.orgs || []), newOrgObj] });
  } else {
    await setDoc(globalRef, { email: userEmail, orgs: [newOrgObj] });
  }
  
  return { ...newOrgObj, inviteCode: code };
}

export async function joinOrganisation(userId, userEmail, userName, code) {
  const upperCode = code.toUpperCase().trim();
  const codeSnap = await getDoc(doc(db, 'invite_codes', upperCode));
  if (!codeSnap.exists()) {
    throw new Error('Invalid invite code');
  }

  const { orgId, orgName } = codeSnap.data();

  // Update global_users first to check if they already exist
  const globalRef = doc(db, 'global_users', userId);
  const gSnap = await getDoc(globalRef);
  const newOrgObj = { id: orgId, name: orgName, role: 'Viewer' };
  
  if (gSnap.exists()) {
    const data = gSnap.data();
    const existingOrgs = data.orgs || [];
    if (existingOrgs.find(o => o.id === orgId)) {
      throw new Error('You are already a member of this organisation.');
    }
    await updateDoc(globalRef, { orgs: [...existingOrgs, newOrgObj] });
  } else {
    await setDoc(globalRef, { email: userEmail, orgs: [newOrgObj] });
  }

  // Add user to org's users subcollection as Viewer
  await setDoc(doc(db, 'organizations', orgId, 'users', userId), {
    name: userName || (userEmail ? userEmail.split('@')[0] : 'Unknown'),
    email: userEmail || 'unknown@example.com',
    role: 'Viewer',
    status: 'active',
    modulePermissions: {},
    createdAt: serverTimestamp(),
  });

  return newOrgObj;
}

