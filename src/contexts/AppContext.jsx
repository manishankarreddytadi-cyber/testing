// src/contexts/AppContext.jsx
// Holds org-level configuration: farms list, system settings, feed slots.
// Components subscribe here instead of re-fetching separately.
import { createContext, useContext, useEffect, useReducer } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

const initialState = {
  farms: [],
  systemConfig: { currency: 'INR (₹)', weightUnit: 'Kilograms (kg)', timezone: 'IST' },
  feedSlots: ['6:30 AM', '9:30 AM', '12:30 PM', '4:30 PM'],
  loadingFarms: true,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_FARMS':       return { ...state, farms: action.payload, loadingFarms: false };
    case 'SET_SYSTEM':      return { ...state, systemConfig: action.payload };
    case 'SET_FEED_SLOTS':  return { ...state, feedSlots: action.payload };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const { orgId, user, globalUser } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    if (!user || !globalUser?.orgs) return;

    // Listen to farms across ALL organizations the user has access to
    const unsubs = [];
    const allFarmsMap = {};
    
    globalUser.orgs.forEach(org => {
      const unsub = onSnapshot(
        collection(db, 'organizations', org.id, 'farms'),
        (snap) => {
          allFarmsMap[org.id] = snap.docs.map((d) => ({ ...d.data(), id: d.id, orgId: org.id }));
          const combinedFarms = [].concat(...Object.values(allFarmsMap));
          dispatch({ type: 'SET_FARMS', payload: combinedFarms });
        },
        () => {}
      );
      unsubs.push(unsub);
    });

    // System config (one-time read + listen)
    let configUnsub;
    if (orgId) {
      configUnsub = onSnapshot(
        doc(db, 'organizations', orgId, 'settings', 'system'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            dispatch({ type: 'SET_SYSTEM', payload: data });
            if (data.feedSlots) dispatch({ type: 'SET_FEED_SLOTS', payload: data.feedSlots });
          } else {
            dispatch({ type: 'SET_SYSTEM', payload: initialState.systemConfig });
            dispatch({ type: 'SET_FEED_SLOTS', payload: initialState.feedSlots });
          }
        }
      );
    }

    return () => {
      unsubs.forEach(fn => fn());
      if (configUnsub) configUnsub();
    };
  }, [user, globalUser, orgId]);

  return <AppContext.Provider value={{ ...state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
