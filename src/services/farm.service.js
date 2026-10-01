// src/services/farm.service.js
// All Firestore read/write operations for the Farm module.
// Returns plain JS objects — no React, no UI code.
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Farms ─────────────────────────────────────────────────────────────────────

export function subscribeFarms(orgId, callback) {
  return onSnapshot(
    query(collection(db, 'organizations', orgId, 'farms'), orderBy('name', 'asc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeFarms:', err)
  );
}

export async function addFarm(orgId, data) {
  return addDoc(collection(db, 'organizations', orgId, 'farms'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateFarm(orgId, farmId, data) {
  return updateDoc(doc(db, 'organizations', orgId, 'farms', farmId), data);
}

export async function deleteFarm(orgId, farmId) {
  return deleteDoc(doc(db, 'organizations', orgId, 'farms', farmId));
}

// ── Ponds ──────────────────────────────────────────────────────────────────────

export function subscribePonds(orgId, farmId, callback) {
  return onSnapshot(
    query(collection(db, 'organizations', orgId, 'farms', farmId, 'ponds'), orderBy('name', 'asc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribePonds:', err)
  );
}

export async function addPond(orgId, farmId, data) {
  return addDoc(collection(db, 'organizations', orgId, 'farms', farmId, 'ponds'), data);
}

export async function updatePond(orgId, farmId, pondId, data) {
  return updateDoc(
    doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId),
    data
  );
}

export async function deletePond(orgId, farmId, pondId) {
  return deleteDoc(doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId));
}

// ── Cycles ─────────────────────────────────────────────────────────────────────

export async function startCycle(orgId, farmId, pondId, cycleData) {
  const cycleRef = doc(collection(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles'));
  
  await Promise.all([
    setDoc(cycleRef, { ...cycleData, status: 'active', startedAt: serverTimestamp() }),
    updatePond(orgId, farmId, pondId, { 
      status: 'active', 
      activeCycleId: cycleRef.id,
      activeCycleStockDate: cycleData.stockDate || null
    })
  ]);
  
  return cycleRef;
}

export async function updateCycle(orgId, farmId, pondId, cycleId, cycleData) {
  const cycleRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId);
  await updateDoc(cycleRef, cycleData);
  // Also sync the stock date if it was updated
  if (cycleData.stockDate !== undefined) {
    await updatePond(orgId, farmId, pondId, { activeCycleStockDate: cycleData.stockDate || null });
  }
}

export async function endCycle(orgId, farmId, pondId, cycleId, harvestData) {
  const cycleRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId);
  const writes = [
    updateDoc(cycleRef, { status: 'completed', endedAt: serverTimestamp() }),
    updatePond(orgId, farmId, pondId, { status: 'inactive', activeCycleId: null })
  ];

  if (harvestData?.length) {
    for (const harvest of harvestData) {
      const hRef = doc(collection(cycleRef, 'harvests'));
      writes.push(setDoc(hRef, { ...harvest, type: 'final', recordedAt: serverTimestamp() }));
    }
  }

  await Promise.all(writes);
}

export async function addPartialHarvest(orgId, farmId, pondId, cycleId, harvestData) {
  const cycleRef = doc(
    db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId
  );
  return addDoc(collection(cycleRef, 'harvests'), {
    ...harvestData,
    type: 'partial',
    recordedAt: serverTimestamp(),
  });
}

// ── Feeding Chart ──────────────────────────────────────────────────────────────

export function subscribeFeeding(orgId, farmId, pondId, cycleId, callback) {
  return onSnapshot(
    query(
      collection(
        db, 'organizations', orgId, 'farms', farmId,
        'ponds', pondId, 'cycles', cycleId, 'feeding'
      ),
      orderBy('date', 'asc')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeFeeding:', err)
  );
}

export async function addFeedEntry(orgId, farmId, pondId, cycleId, entry) {
  return addDoc(
    collection(
      db, 'organizations', orgId, 'farms', farmId,
      'ponds', pondId, 'cycles', cycleId, 'feeding'
    ),
    { ...entry, recordedAt: serverTimestamp() }
  );
}

export async function updateFeedEntry(orgId, farmId, pondId, cycleId, entryId, data) {
  const docRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId, 'feeding', entryId);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    const oldData = snap.data();
    if (oldData.usageId) {
      // Calculate new total to sync to inventory_usage
      let newTotal = 0;
      if (data.manualTotal !== undefined) {
        newTotal = data.manualTotal || 0;
      } else {
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(data)]);
        for (const key of allKeys) {
           if (key !== 'date' && key !== 'manualTotal' && key !== 'usageId' && key !== 'itemId' && key !== 'item' && key !== 'recordedAt' && key !== 'id') {
              newTotal += (data[key] !== undefined && data[key] !== '' ? parseFloat(data[key]) || 0 : parseFloat(oldData[key]) || 0);
           }
        }
      }
      
      const usageUpdate = {};
      if (data.date !== undefined) usageUpdate.date = data.date;
      if (data.manualTotal !== undefined || Object.keys(data).some(k => k.includes('AM') || k.includes('PM'))) {
         usageUpdate.qty = data.manualTotal !== undefined && data.manualTotal !== null ? parseFloat(data.manualTotal) : newTotal;
      }
      
      if (Object.keys(usageUpdate).length > 0) {
        await updateDoc(doc(db, 'organizations', orgId, 'inventory_usage', oldData.usageId), usageUpdate);
      }
    }
  }

  return updateDoc(docRef, data);
}

export async function deleteFeedEntry(orgId, farmId, pondId, cycleId, entryId) {
  const docRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId, 'feeding', entryId);
  const snap = await getDoc(docRef);
  if (snap.exists() && snap.data().usageId) {
    await deleteDoc(doc(db, 'organizations', orgId, 'inventory_usage', snap.data().usageId));
  }
  return deleteDoc(docRef);
}

// ── Consumables ────────────────────────────────────────────────────────────────

export function subscribeConsumables(orgId, farmId, pondId, cycleId, callback) {
  return onSnapshot(
    query(
      collection(
        db, 'organizations', orgId, 'farms', farmId,
        'ponds', pondId, 'cycles', cycleId, 'consumables'
      ),
      orderBy('date', 'asc')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeConsumables:', err)
  );
}

export async function addConsumable(orgId, farmId, pondId, cycleId, data) {
  return addDoc(
    collection(
      db, 'organizations', orgId, 'farms', farmId,
      'ponds', pondId, 'cycles', cycleId, 'consumables'
    ),
    { ...data, recordedAt: serverTimestamp() }
  );
}

export async function updateConsumable(orgId, farmId, pondId, cycleId, id, data) {
  const docRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId, 'consumables', id);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    const oldData = snap.data();
    if (oldData.usageId) {
      const usageUpdate = {};
      if (data.date !== undefined) usageUpdate.date = data.date;
      if (data.qty !== undefined) usageUpdate.qty = parseFloat(data.qty) || 0;
      if (data.unit !== undefined) usageUpdate.unit = data.unit;
      
      if (Object.keys(usageUpdate).length > 0) {
        await updateDoc(doc(db, 'organizations', orgId, 'inventory_usage', oldData.usageId), usageUpdate);
      }
    }
  }

  return updateDoc(docRef, data);
}

export async function deleteConsumable(orgId, farmId, pondId, cycleId, id) {
  const docRef = doc(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondId, 'cycles', cycleId, 'consumables', id);
  const snap = await getDoc(docRef);
  if (snap.exists() && snap.data().usageId) {
    await deleteDoc(doc(db, 'organizations', orgId, 'inventory_usage', snap.data().usageId));
  }
  return deleteDoc(docRef);
}

// ── Sampling ───────────────────────────────────────────────────────────────────

export function subscribeSampling(orgId, farmId, pondId, cycleId, callback) {
  return onSnapshot(
    query(
      collection(
        db, 'organizations', orgId, 'farms', farmId,
        'ponds', pondId, 'cycles', cycleId, 'sampling'
      ),
      orderBy('date', 'asc')
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeSampling:', err)
  );
}

export async function addSampling(orgId, farmId, pondId, cycleId, data) {
  return addDoc(
    collection(
      db, 'organizations', orgId, 'farms', farmId,
      'ponds', pondId, 'cycles', cycleId, 'sampling'
    ),
    { ...data, recordedAt: serverTimestamp() }
  );
}

export async function updateSampling(orgId, farmId, pondId, cycleId, samplingId, data) {
  return updateDoc(
    doc(
      db, 'organizations', orgId, 'farms', farmId,
      'ponds', pondId, 'cycles', cycleId, 'sampling', samplingId
    ),
    data
  );
}

export async function deleteSampling(orgId, farmId, pondId, cycleId, id) {
  return deleteDoc(
    doc(
      db, 'organizations', orgId, 'farms', farmId,
      'ponds', pondId, 'cycles', cycleId, 'sampling', id
    )
  );
}

// ── History (all cycles for all ponds in a farm) ───────────────────────────────

export async function getFarmHistory(orgId, farmId) {
  const pondsSnap = await getDocs(
    collection(db, 'organizations', orgId, 'farms', farmId, 'ponds')
  );
  const result = [];
  for (const pondDoc of pondsSnap.docs) {
    const cyclesSnap = await getDocs(
      collection(db, 'organizations', orgId, 'farms', farmId, 'ponds', pondDoc.id, 'cycles')
    );
    const cycles = [];
    for (const cycleDoc of cyclesSnap.docs) {
      const harvestsSnap = await getDocs(
        collection(
          db, 'organizations', orgId, 'farms', farmId,
          'ponds', pondDoc.id, 'cycles', cycleDoc.id, 'harvests'
        )
      );
      cycles.push({
        id: cycleDoc.id,
        ...cycleDoc.data(),
        harvests: harvestsSnap.docs.map((h) => ({ id: h.id, ...h.data() })),
      });
    }
    result.push({ id: pondDoc.id, ...pondDoc.data(), cycles });
  }
  return result;
}

// ── Feed Slots (Time Settings) ─────────────────────────────────────────────────

export async function updateFeedSlots(orgId, slots) {
  return updateDoc(doc(db, 'organizations', orgId, 'settings', 'system'), {
    feedSlots: slots,
  });
}

export async function getFeedingOverview(orgId, farms, ponds) {
  const overviewData = {};

  for (const farm of farms) {
    const farmPonds = ponds[farm.id] || [];
    for (const pond of farmPonds) {
      if (pond.status === 'active' && pond.activeCycleId) {
        const snap = await getDocs(
          query(
            collection(db, 'organizations', orgId, 'farms', farm.id, 'ponds', pond.id, 'cycles', pond.activeCycleId, 'feeding'),
            orderBy('date', 'desc')
          )
        );
        
        let cumulativeTotal = 0;
        let cumulativeSlots = {};
        let dates = {}; 
        
        snap.docs.forEach(d => {
          const data = d.data();
          const date = data.date;
          if (!date) return;
          if (!dates[date]) dates[date] = { slots: {}, total: 0, manualTotal: null };
          
          let rowTotal = 0;
          let hasManual = data.manualTotal != null;
          
          if (hasManual) {
            rowTotal = data.manualTotal;
            dates[date].manualTotal = rowTotal;
          } else {
            Object.keys(data).forEach(k => {
              if (k !== 'manualTotal' && typeof data[k] === 'number') {
                rowTotal += data[k];
                dates[date].slots[k] = (dates[date].slots[k] || 0) + data[k];
                cumulativeSlots[k] = (cumulativeSlots[k] || 0) + data[k];
              }
            });
          }
          
          dates[date].total += rowTotal;
          cumulativeTotal += rowTotal;
        });
        
        overviewData[pond.id] = { cumulativeSlots, cumulativeTotal, dates };
      }
    }
  }
  return overviewData;
}
