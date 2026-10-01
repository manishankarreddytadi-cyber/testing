import { collection, getDocs, doc, setDoc, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function runMigration(orgId) {
  if (!orgId) return;
  console.log('Starting migration for missing usage records...');
  try {
    const usageSnap = await getDocs(collection(db, 'organizations', orgId, 'inventory_usage'));
    const usages = usageSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const batch = writeBatch(db);
    let count = 0;

    for (const usage of usages) {
      if (!usage.farmId || !usage.pondId) continue;
      
      let cycleId = usage.cycleId;
      if (!cycleId) {
        // If cycleId was lost, fetch the pond to see if it has an active cycle
        const pondSnap = await getDocs(query(collection(db, 'organizations', orgId, 'farms', usage.farmId, 'ponds'), where('__name__', '==', usage.pondId)));
        if (!pondSnap.empty) {
            cycleId = pondSnap.docs[0].data().activeCycleId;
        }
      }
      
      if (!cycleId) {
          console.warn('Could not determine cycleId for usage', usage.id);
          continue;
      }

      const collName = usage.type === 'feed' ? 'feeding' : 'consumables';
      const destColl = collection(db, 'organizations', orgId, 'farms', usage.farmId, 'ponds', usage.pondId, 'cycles', cycleId, collName);
      
      // Check if it already exists
      const existing = await getDocs(query(destColl, where('usageId', '==', usage.id)));
      if (!existing.empty) continue; // Already exists, skip

      const newRef = doc(destColl);
      
      if (usage.type === 'feed') {
        const feedPayload = {
          date: usage.date,
          item: usage.itemName || usage.item || '',
          itemId: usage.itemId,
          usageId: usage.id,
          manualTotal: usage._manualTotal ? (parseFloat(usage.total) || 0) : null,
          recordedAt: usage.recordedAt || serverTimestamp()
        };
        // extract slots
        Object.keys(usage).forEach(k => {
          if (k.includes('AM') || k.includes('PM')) {
            feedPayload[k] = parseFloat(usage[k]) || 0;
          }
        });
        batch.set(newRef, feedPayload);
        count++;
      } else {
        const consPayload = {
          date: usage.date,
          category: usage.category || '',
          categoryId: usage.categoryId || '',
          item: usage.itemName || usage.item || '',
          itemId: usage.itemId,
          usageId: usage.id,
          qty: parseFloat(usage.qty) || 0,
          unit: usage.unit || 'kg',
          recordedAt: usage.recordedAt || serverTimestamp()
        };
        batch.set(newRef, consPayload);
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Migration complete! Copied ${count} missing records.`);
      alert(`Migration complete! Restored ${count} missing records to their ponds.`);
    } else {
      console.log('No missing records found to migrate.');
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
}
