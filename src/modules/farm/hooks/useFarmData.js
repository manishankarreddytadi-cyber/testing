// src/modules/farm/hooks/useFarmData.js
// Subscribes to farms + ponds in real-time. Returns state consumed by FarmPage.
import { useState, useEffect, useMemo } from 'react';
import { subscribePonds } from '../../../services/farm.service';
import { useAppContext } from '../../../contexts/AppContext';
import { useAuth } from '../../../contexts/AuthContext';

export function useFarmData() {
  const { farms: allFarms, loadingFarms } = useAppContext();
  const { profile, isAdmin, orgId } = useAuth();

  const farms = useMemo(() => allFarms.filter(f => {
    // Only filter farms belonging to the current active org where permissions apply
    if (f.orgId !== orgId) return false; 
    if (isAdmin) return true;
    if (!profile?.farmAccess || profile.farmAccess.length === 0) return true;
    return profile.farmAccess.includes(f.id);
  }), [allFarms, orgId, isAdmin, profile?.farmAccess]);
  const [ponds, setPonds] = useState({}); // { farmId: [...ponds] }

  // Subscribe to ponds for each farm, using the farm's specific orgId
  useEffect(() => {
    if (farms.length === 0) return;
    const unsubs = farms.map((farm) =>
      subscribePonds(farm.orgId, farm.id, (pondList) => {
        setPonds((prev) => ({ ...prev, [farm.id]: pondList }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [farms]);

  return { farms, ponds, loading: loadingFarms };
}
