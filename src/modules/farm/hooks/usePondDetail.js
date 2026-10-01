// src/modules/farm/hooks/usePondDetail.js
// Subscribes to feeding, consumables, sampling AND the active cycle doc for a pond.
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import {
  subscribeFeeding,
  subscribeConsumables,
  subscribeSampling,
} from '../../../services/farm.service';
import { useAuth } from '../../../contexts/AuthContext';

export function usePondDetail(farmId, pond) {
  const { orgId } = useAuth();
  const cycleId = pond?.activeCycleId;

  const [cycle,       setCycle]       = useState(null);
  const [feeding,     setFeeding]     = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [sampling,    setSampling]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!farmId || !pond?.id || !cycleId) {
      setCycle(null); setFeeding([]); setConsumables([]); setSampling([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Track which subscriptions have fired at least once using a Set.
    // checkDone is only called on the FIRST snapshot per subscription.
    const resolved = new Set();
    function checkDone(key) {
      resolved.add(key);
      if (resolved.size === 4) setLoading(false);
    }

    // Subscribe to the cycle document itself to get species/stockDate/etc.
    const cycleDocRef = doc(
      db, 'organizations', orgId, 'farms', farmId, 'ponds', pond.id, 'cycles', cycleId
    );
    let cycle0Done = false;
    const u0 = onSnapshot(cycleDocRef, (snap) => {
      setCycle(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      if (!cycle0Done) { cycle0Done = true; checkDone('cycle'); }
    }, () => { setCycle(null); if (!cycle0Done) { cycle0Done = true; checkDone('cycle'); } });

    let feed0Done = false;
    const u1 = subscribeFeeding(orgId, farmId, pond.id, cycleId, (rows) => {
      setFeeding(rows);
      if (!feed0Done) { feed0Done = true; checkDone('feeding'); }
    });
    let cons0Done = false;
    const u2 = subscribeConsumables(orgId, farmId, pond.id, cycleId, (rows) => {
      setConsumables(rows);
      if (!cons0Done) { cons0Done = true; checkDone('consumables'); }
    });
    let samp0Done = false;
    const u3 = subscribeSampling(orgId, farmId, pond.id, cycleId, (rows) => {
      setSampling(rows);
      if (!samp0Done) { samp0Done = true; checkDone('sampling'); }
    });

    return () => { u0(); u1(); u2(); u3(); };
  }, [orgId, farmId, pond?.id, cycleId]);

  return { cycle, feeding, consumables, sampling, loading };
}
