// src/services/attendance.service.js
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, setDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ── Employees ────────────────────────────────────────────────────────────────

export function subscribeEmployees(orgId, callback) {
  return onSnapshot(
    collection(db, 'organizations', orgId, 'employees'),
    (snap) => {
      const emps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      emps.sort((a, b) => {
        const snoA = parseInt(a.sno, 10);
        const snoB = parseInt(b.sno, 10);
        const numA = isNaN(snoA) ? 999999 : snoA;
        const numB = isNaN(snoB) ? 999999 : snoB;
        if (numA !== numB) return numA - numB;
        return (a.name || '').localeCompare(b.name || '');
      });
      callback(emps);
    },
    (err) => console.error('subscribeEmployees:', err)
  );
}

export async function addEmployee(orgId, data) {
  return addDoc(collection(db, 'organizations', orgId, 'employees'), {
    ...data,
    isActive: true, // We use soft delete to preserve them in past months if needed, though name is embedded in attendance docs too
  });
}

export async function updateEmployee(orgId, empId, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'employees', empId), data);
}

export async function removeEmployee(orgId, empId) {
  // Hard delete is fine because attendance docs embed the employee name
  return deleteDoc(doc(db, 'organizations', orgId, 'employees', empId));
}

// ── Attendance Records ───────────────────────────────────────────────────────

/**
 * Month is formatted as "YYYY-MM"
 */
export function subscribeAttendanceMonth(orgId, monthStr, callback) {
  return onSnapshot(
    doc(db, 'organizations', orgId, 'attendance', monthStr),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().records || {});
      } else {
        callback({});
      }
    },
    (err) => console.error('subscribeAttendanceMonth:', err)
  );
}

export async function getAttendanceMonths(orgId, monthStrs) {
  const promises = monthStrs.map(async (monthStr) => {
    const docSnap = await getDoc(doc(db, 'organizations', orgId, 'attendance', monthStr));
    return { monthStr, records: docSnap.exists() ? docSnap.data().records : {} };
  });
  return Promise.all(promises);
}

/**
 * Updates a specific employee's attendance record for a specific day in a month.
 * Also embeds the employee name so if they are deleted, history is preserved.
 * records: {
 *   [empId]: {
 *     name: "John",
 *     days: { "1": "P", "2": "A" }
 *   }
 * }
 */
export async function updateAttendanceDay(orgId, monthStr, empId, empName, day, status) {
  const docRef = doc(db, 'organizations', orgId, 'attendance', monthStr);
  
  // 1. Ensure the document and the basic structure exists. 
  // We use merge: true with an empty records object so we don't accidentally overwrite anything.
  await setDoc(docRef, { }, { merge: true });

  // 2. Safely update only the specific nested fields using dot-notation.
  // This guarantees that no other employees or days are touched.
  const updatePayload = {};
  updatePayload[`records.${empId}.name`] = empName;
  updatePayload[`records.${empId}.days.${day}`] = status;

  await updateDoc(docRef, updatePayload);
}
