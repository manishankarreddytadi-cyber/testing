// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, query, collection, limit, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { subscribeOrgName } from '../services/settings.service';

const AuthContext = createContext(null);

const STORAGE_KEY = 'aquanubandh_active_org';

// Helper removed, using standard getDoc to prevent premature timeouts on slow connections

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [globalUser, setGlobalUser] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(localStorage.getItem(STORAGE_KEY) || null);
  const [profile, setProfile] = useState(null);   // Firestore user doc for active org
  const [orgName, setOrgName] = useState('');      // Live org name from Firestore
  const [loading, setLoading] = useState(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  // Ref to track current firebase user so membership listener can access it
  const firebaseUserRef = useRef(null);
  // Ref to unsubscribe previous membership listener
  const membershipUnsubRef = useRef(null);

  const loadProfile = async (firebaseUser, currentOrgId) => {
    try {
      if (!currentOrgId) return setProfile(null);
      const userRef = doc(db, 'organizations', currentOrgId, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error('loadProfile error:', e);
      setProfile(null);
    }
  };

  const loadGlobalUser = async (firebaseUser) => {
    try {
      const globalRef = doc(db, 'global_users', firebaseUser.uid);
      const snap = await getDoc(globalRef);
      let userData;
      if (snap.exists()) {
        userData = snap.data();
      } else {
        userData = {
          email: firebaseUser.email,
          orgs: [] // No auto-created org
        };
        // Background save, don't block UI
        setDoc(globalRef, userData).catch(console.error);
      }
      setGlobalUser(userData);
      
      const userOrgs = userData.orgs || [];
      const nextOrg = (activeOrgId && userOrgs.some(o => o.id === activeOrgId))
        ? activeOrgId
        : (userOrgs.length > 0 ? userOrgs[0].id : null);
        
      setActiveOrgId(nextOrg);
      if (nextOrg) {
        localStorage.setItem(STORAGE_KEY, nextOrg);
        await loadProfile(firebaseUser, nextOrg);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setProfile(null);
      }
    } catch (e) {
      console.error('loadGlobalUser error:', e);
      // Fallback if offline or failed
      const fallbackData = { email: firebaseUser.email, orgs: [] };
      setGlobalUser(fallbackData);
      setActiveOrgId(null);
      setProfile(null);
    }
  };

  // Subscribe to live org name whenever activeOrgId changes
  useEffect(() => {
    if (!activeOrgId) { setOrgName(''); return; }
    const unsub = subscribeOrgName(activeOrgId, setOrgName);
    return unsub;
  }, [activeOrgId]);

  // Real-time listener on the current user's membership doc.
  // If an admin deletes them, the doc disappears → immediately reload
  // global_users so the app routes to onboarding or another org.
  useEffect(() => {
    if (membershipUnsubRef.current) {
      membershipUnsubRef.current();
      membershipUnsubRef.current = null;
    }
    if (!user || !activeOrgId) return;

    const memberRef = doc(db, 'organizations', activeOrgId, 'users', user.uid);
    const unsub = onSnapshot(memberRef, async (snap) => {
      if (!snap.exists()) {
        // User was removed! Clean up their global_users doc just in case it got out of sync
        // (e.g. if removed before the new deleteUser logic went live).
        setProfile(null);
        try {
          const globalRef = doc(db, 'global_users', user.uid);
          const gSnap = await getDoc(globalRef);
          if (gSnap.exists()) {
            const data = gSnap.data();
            const filteredOrgs = (data.orgs || []).filter(o => o.id !== activeOrgId);
            if (filteredOrgs.length !== (data.orgs || []).length) {
              // Note: using updateDoc from firestore, make sure it's imported (we need to add it to imports)
              await setDoc(globalRef, { ...data, orgs: filteredOrgs });
            }
          }
        } catch (err) {
          console.error("Failed to self-heal global_users", err);
        }
        
        // Reload global user to find another org or go to onboarding
        loadGlobalUser(firebaseUserRef.current);
      } else {
        setProfile(snap.data());
      }
    }, (err) => console.error('membership listener error:', err));

    membershipUnsubRef.current = unsub;
    return () => { unsub(); membershipUnsubRef.current = null; };
  }, [user?.uid, activeOrgId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      firebaseUserRef.current = firebaseUser;
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadGlobalUser(firebaseUser);
        setLoading(false);
      } else {
        setUser(null);
        setGlobalUser(null);
        setProfile(null);
        setActiveOrgId(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const switchOrg = async (orgId) => {
    if (orgId === activeOrgId) return;
    setActiveOrgId(orgId);
    try {
      localStorage.setItem(STORAGE_KEY, orgId);
    } catch (err) {
      console.warn('localStorage error:', err);
    }
    await loadProfile(user, orgId);
  };

  const value = {
    user,
    globalUser,
    profile,
    loading,
    orgId: activeOrgId,
    orgName,
    switchOrg,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'Admin',
    isCreatingOrg,
    setIsCreatingOrg,
    needsOnboarding: !loading && (isCreatingOrg || (globalUser != null && (!globalUser.orgs || globalUser.orgs.length === 0))),
    // Admins always have all permissions; for others check modulePermissions.
    // If profile hasn't loaded yet, show the tab (don't hide while loading).
    hasPermission: (module) => {
      if (!profile) return true; // Still loading — show tab optimistically
      if (profile.role === 'Admin') return true;
      return profile.modulePermissions?.[module] !== false;
    },
    reloadProfile: () => user && activeOrgId && loadProfile(user, activeOrgId),
    reloadGlobalUser: () => user && loadGlobalUser(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
