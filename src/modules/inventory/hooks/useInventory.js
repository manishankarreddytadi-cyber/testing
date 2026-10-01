// src/modules/inventory/hooks/useInventory.js
import { useState, useEffect } from 'react';
import {
  subscribeItems, subscribeCategories, subscribeStores,
  subscribePurchases, subscribeUsage, getCurrentStock,
} from '../../../services/inventory.service';
import { useAuth } from '../../../contexts/AuthContext';

export function useInventory() {
  const { orgId, profile, isAdmin } = useAuth();
  const [items,       setItems]       = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [stores,      setStores]      = useState([]);
  const [purchases,   setPurchases]   = useState([]);
  const [usage,       setUsage]       = useState([]);
  const [stock,       setStock]       = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const u1 = subscribeItems(orgId, setItems);
    const u2 = subscribeCategories(orgId, setCategories);
    const u3 = subscribeStores(orgId, setStores);
    const u4 = subscribePurchases(orgId, setPurchases);
    const u5 = subscribeUsage(orgId, setUsage);
    setLoading(false);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [orgId]);

  // Recompute stock whenever purchases or usage change
  useEffect(() => {
    getCurrentStock(orgId).then(setStock).catch(() => setStock([]));
  }, [purchases, usage, orgId]);

  const filteredStores = stores.filter(s => {
    if (isAdmin) return true;
    if (!profile?.storeAccess || profile.storeAccess.length === 0) return true;
    return profile.storeAccess.includes(s.id);
  });

  return { items, categories, stores: filteredStores, purchases, usage, stock, loading };
}
