// src/services/inventory.service.js
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, where
} from 'firebase/firestore';
import { db } from '../firebase';

// No base function needed, use direct subcollections

// ── Master Lists ───────────────────────────────────────────────────────────────

export function subscribeItems(orgId, callback) {
  return onSnapshot(
    collection(db, 'organizations', orgId, 'inventory_items'),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

export async function addItem(orgId, data) {
  return addDoc(collection(db, 'organizations', orgId, 'inventory_items'), data);
}

export async function updateItem(orgId, itemId, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'inventory_items', itemId), data);
}

export async function deleteItem(orgId, itemId) {
  const q1 = query(collection(db, 'organizations', orgId, 'inventory_purchases'), where('itemId', '==', itemId));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) throw new Error("Cannot delete Item: It is currently used in purchases.");

  const q2 = query(collection(db, 'organizations', orgId, 'inventory_usage'), where('itemId', '==', itemId));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) throw new Error("Cannot delete Item: It is currently used in usage history.");

  return deleteDoc(doc(db, 'organizations', orgId, 'inventory_items', itemId));
}

// ── Default categories seeded for every new org ──────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Feed', isFeedCategory: true, isSystem: true },
  { name: 'Mineral', isFeedCategory: false, isSystem: true },
  { name: 'Medicine', isFeedCategory: false, isSystem: true },
];

/**
 * Seeds default categories and deduplicates on every call.
 * - Adds any missing defaults (checked by name, case-insensitive).
 * - Removes duplicate documents for the same category name (keeps oldest).
 */
export async function seedDefaultCategories(orgId) {
  const ref = collection(db, 'organizations', orgId, 'inventory_categories');
  const snap = await getDocs(ref);
  const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // ── 1. Deduplicate: for each name keep the first doc, delete the rest ────
  const seenNames = {};
  const deletePromises = [];
  for (const d of allDocs) {
    const key = (d.name || '').toLowerCase().trim();
    if (seenNames[key]) {
      // Duplicate — remove it
      deletePromises.push(deleteDoc(doc(ref, d.id)));
    } else {
      seenNames[key] = d.id;
    }
  }
  await Promise.all(deletePromises);

  // ── 2. Add any default that is still missing ──────────────────────────────
  const addPromises = DEFAULT_CATEGORIES
    .filter(cat => !seenNames[cat.name.toLowerCase()])
    .map(cat => addDoc(ref, { ...cat, createdAt: serverTimestamp() }));
  await Promise.all(addPromises);
}

export function subscribeCategories(orgId, callback) {
  // Deduplicate + seed on every subscription mount
  seedDefaultCategories(orgId).catch(console.error);
  return onSnapshot(
    collection(db, 'organizations', orgId, 'inventory_categories'),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

export async function addCategory(orgId, data) {
  return addDoc(collection(db, 'organizations', orgId, 'inventory_categories'), data);
}

export async function updateCategory(orgId, id, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'inventory_categories', id), data);
}

export async function deleteCategory(orgId, id) {
  // Prevent deletion of system categories
  const catSnap = await getDoc(doc(db, 'organizations', orgId, 'inventory_categories', id));
  if (catSnap.exists() && catSnap.data()?.isSystem) {
    throw new Error(`"${catSnap.data().name}" is a system category and cannot be deleted.`);
  }

  const q1 = query(collection(db, 'organizations', orgId, 'inventory_items'), where('categoryId', '==', id));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) throw new Error("Cannot delete Category: It is currently used by items.");

  const q2 = query(collection(db, 'organizations', orgId, 'inventory_purchases'), where('categoryId', '==', id));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) throw new Error("Cannot delete Category: It is currently used in purchases.");

  const q3 = query(collection(db, 'organizations', orgId, 'inventory_usage'), where('categoryId', '==', id));
  const snap3 = await getDocs(q3);
  if (!snap3.empty) throw new Error("Cannot delete Category: It is currently used in usage history.");

  return deleteDoc(doc(db, 'organizations', orgId, 'inventory_categories', id));
}

export function subscribeStores(orgId, callback) {
  return onSnapshot(
    collection(db, 'organizations', orgId, 'inventory_stores'),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

export async function addStore(orgId, data) {
  return addDoc(collection(db, 'organizations', orgId, 'inventory_stores'), data);
}

export async function updateStore(orgId, id, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'inventory_stores', id), data);
}

export async function deleteStore(orgId, id) {
  const q = query(collection(db, 'organizations', orgId, 'inventory_purchases'), where('storeId', '==', id));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error("Cannot delete Store: It is currently used in purchases.");

  return deleteDoc(doc(db, 'organizations', orgId, 'inventory_stores', id));
}

// ── Purchases ──────────────────────────────────────────────────────────────────

export function subscribePurchases(orgId, callback) {
  return onSnapshot(
    query(collection(db, 'organizations', orgId, 'inventory_purchases'), orderBy('date', 'desc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

export async function addPurchase(orgId, rows) {
  const results = [];
  for (const row of rows) {
    results.push(
      await addDoc(collection(db, 'organizations', orgId, 'inventory_purchases'), {
        ...row,
        recordedAt: serverTimestamp(),
      })
    );
  }
  return results;
}

export async function deletePurchase(orgId, id) {
  return deleteDoc(doc(db, 'organizations', orgId, 'inventory_purchases', id));
}

export async function updatePurchase(orgId, id, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'inventory_purchases', id), data);
}

// ── Usage / Stock ──────────────────────────────────────────────────────────────

export function subscribeUsage(orgId, callback) {
  return onSnapshot(
    query(collection(db, 'organizations', orgId, 'inventory_usage'), orderBy('date', 'desc')),
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Firestore sorts by date desc, but we add a secondary sort by pond asc
      data.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        
        const pondA = a.pond || '';
        const pondB = b.pond || '';
        return pondA.localeCompare(pondB);
      });
      callback(data);
    }
  );
}

export async function recordUsage(orgId, rows) {
  const results = [];
  for (const row of rows) {
    results.push(
      await addDoc(collection(db, 'organizations', orgId, 'inventory_usage'), {
        ...row,
        recordedAt: serverTimestamp(),
      })
    );
  }
  return results;
}

export async function deleteUsage(orgId, id) {
  const usageRef = doc(db, 'organizations', orgId, 'inventory_usage', id);
  const usageSnap = await getDoc(usageRef);

  if (usageSnap.exists()) {
    const data = usageSnap.data();
    if (data.farmId && data.pondId && data.cycleId && data.date && data.itemId) {
      const collName = data.type === 'feed' ? 'feeding' : 'consumables';
      
      // Try to find by usageId first, fallback to date/itemId
      let pondSnaps;
      const qUsageId = query(
        collection(db, 'organizations', orgId, 'farms', data.farmId, 'ponds', data.pondId, 'cycles', data.cycleId, collName),
        where('usageId', '==', id)
      );
      pondSnaps = await getDocs(qUsageId);
      
      if (pondSnaps.empty) {
        const qDateItem = query(
          collection(db, 'organizations', orgId, 'farms', data.farmId, 'ponds', data.pondId, 'cycles', data.cycleId, collName),
          where('date', '==', data.date),
          where('itemId', '==', data.itemId)
        );
        pondSnaps = await getDocs(qDateItem);
      }
      
      for (const d of pondSnaps.docs) {
        await deleteDoc(d.ref);
      }
    }
  }

  return deleteDoc(usageRef);
}

export async function updateUsage(orgId, id, data) {
  const usageRef = doc(db, 'organizations', orgId, 'inventory_usage', id);
  const usageSnap = await getDoc(usageRef);

  if (usageSnap.exists()) {
    const oldData = usageSnap.data();
    if (oldData.farmId && oldData.pondId && oldData.cycleId && oldData.date && oldData.itemId) {
      const collName = oldData.type === 'feed' ? 'feeding' : 'consumables';
      
      let pondSnaps;
      const qUsageId = query(
        collection(db, 'organizations', orgId, 'farms', oldData.farmId, 'ponds', oldData.pondId, 'cycles', oldData.cycleId, collName),
        where('usageId', '==', id)
      );
      pondSnaps = await getDocs(qUsageId);
      
      if (pondSnaps.empty) {
        const qDateItem = query(
          collection(db, 'organizations', orgId, 'farms', oldData.farmId, 'ponds', oldData.pondId, 'cycles', oldData.cycleId, collName),
          where('date', '==', oldData.date),
          where('itemId', '==', oldData.itemId)
        );
        pondSnaps = await getDocs(qDateItem);
      }

      for (const d of pondSnaps.docs) {
        const pondUpdateData = {};
        if (data.date !== undefined) pondUpdateData.date = data.date;
        if (data.itemId !== undefined) pondUpdateData.itemId = data.itemId;
        if (data.itemName !== undefined) pondUpdateData.item = data.itemName;
        if (data.categoryId !== undefined) pondUpdateData.categoryId = data.categoryId;
        if (data.category !== undefined) pondUpdateData.category = data.category;

        if (oldData.type === 'feed') {
          if (data.qty !== undefined) {
            pondUpdateData.manualTotal = parseFloat(data.qty) || 0;
            const currentData = d.data();
            for (const key of Object.keys(currentData)) {
              if (key !== 'date' && key !== 'item' && key !== 'itemId' && key !== 'manualTotal' && key !== 'id') {
                pondUpdateData[key] = 0;
              }
            }
          }
        } else {
          if (data.qty !== undefined) pondUpdateData.qty = parseFloat(data.qty) || 0;
          if (data.unit !== undefined) pondUpdateData.unit = data.unit;
        }

        if (Object.keys(pondUpdateData).length > 0) {
          await updateDoc(d.ref, pondUpdateData);
        }
      }
    }
  }

  return updateDoc(usageRef, data);
}

// ── Current Stock (derived — computed client-side from purchases - usage) ───────
// For a real production app, use Cloud Functions to maintain a stock counter doc.
export async function getCurrentStock(orgId) {
  const [purchasesSnap, usageSnap] = await Promise.all([
    getDocs(query(collection(db, 'organizations', orgId, 'inventory_purchases'), orderBy('date', 'asc'))),
    getDocs(query(collection(db, 'organizations', orgId, 'inventory_usage'), orderBy('date', 'asc'))),
  ]);

  const stock = {};

  // Normalise key: always prefer itemId (UUID), only fall back to itemName if itemId is absent
  function stockKey(data) {
    const id = (data.itemId || '').trim();
    return id !== '' ? id : (data.itemName || '').trim();
  }

  // 1. Process Purchases into Lots
  purchasesSnap.docs.forEach((d) => {
    const data = d.data();
    const key = stockKey(data);
    if (!key) return;
    if (!stock[key]) {
      stock[key] = {
        itemId: data.itemId || '', itemName: data.itemName || 'Unknown Item',
        categoryId: data.categoryId, category: data.category,
        storeId: data.storeId, store: data.store,
        unit: data.unit, qty: 0, lastPurchase: null, lots: []
      };
    }
    const lotQty = Number(data.qty) || 0;
    stock[key].qty += lotQty;
    stock[key].lastPurchase = data.date;
    stock[key].lots.push({ id: d.id, price: Number(data.price) || 0, qty: lotQty, date: data.date });
  });

  // 2. Process Usage (FIFO)
  usageSnap.docs.forEach((d) => {
    const data = d.data();
    const key = stockKey(data);
    if (!key) return;

    if (!stock[key]) {
      stock[key] = {
        itemId: data.itemId || '', itemName: data.itemName || 'Unknown Item',
        categoryId: data.categoryId, category: data.category,
        storeId: '', store: '',
        unit: data.unit, qty: 0, lastPurchase: null, lots: []
      };
    }
    const usedQty = Number(data.qty) || Number(data.total) || 0;
    stock[key].qty -= usedQty;

    // Deduct from lots (oldest first)
    let remainingUsage = usedQty;
    for (const lot of stock[key].lots) {
      if (remainingUsage <= 0) break;
      if (lot.qty > 0) {
        if (lot.qty >= remainingUsage) {
          lot.qty -= remainingUsage;
          remainingUsage = 0;
        } else {
          remainingUsage -= lot.qty;
          lot.qty = 0;
        }
      }
    }
  });

  return Object.entries(stock)
    .filter(([id]) => id.trim() !== '')
    .map(([id, v]) => {
      // Filter out lots that have been fully exhausted and round to avoid float glitches
      const activeLots = v.lots.filter(l => l.qty > 0).map(l => ({ ...l, qty: Math.round(l.qty * 100) / 100 }));
      return { id, ...v, qty: Math.round(v.qty * 100) / 100, activeLots };
    });
}
