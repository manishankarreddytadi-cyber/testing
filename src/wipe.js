import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { signOut } from 'firebase/auth';

export async function wipeAll() {
  console.log('WIPING ALL DATA...');
  
  // Wipe organizations and subcollections
  try {
    const orgs = await getDocs(collection(db, 'organizations'));
    for (const o of orgs.docs) {
      const subcols = [
        'users', 'inventory_items', 'inventory_categories', 'inventory_stores', 
        'inventory_purchases', 'inventory_usage', 'farms', 'ponds', 'harvests', 
        'feeding_logs', 'sampling_logs', 'settings'
      ];
      for (const sub of subcols) {
        const docs = await getDocs(collection(db, 'organizations', o.id, sub));
        for (const d of docs.docs) {
          await deleteDoc(d.ref);
        }
      }
      await deleteDoc(o.ref);
    }
  } catch (e) {
    console.warn("Error wiping organizations:", e);
  }

  // Wipe global_users
  try {
    const globals = await getDocs(collection(db, 'global_users'));
    for (const g of globals.docs) {
      await deleteDoc(g.ref);
    }
  } catch (e) {
    console.warn("Error wiping global_users:", e);
  }

  // Wipe invite_codes
  try {
    const codes = await getDocs(collection(db, 'invite_codes'));
    for (const c of codes.docs) {
      await deleteDoc(c.ref);
    }
  } catch (e) {
    console.warn("Could not wipe invite_codes (maybe permission denied):", e);
  }

  console.log('WIPE COMPLETE! Removing local storage...');
  localStorage.clear();
  try {
    await signOut(auth);
  } catch (e) {
    console.error(e);
  }
  alert('Database has been completely wiped for testing! You will now be signed out.');
  window.location.reload();
}

window.wipeAll = wipeAll;
