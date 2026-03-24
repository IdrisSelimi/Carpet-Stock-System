import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'selected_store_id';

interface StoreContextType {
  /** When set, manager is in "store view" — inventory, orders, and new sale apply to this store only. */
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
  /** Whether a store is selected (manager is in store-specific view). */
  isStoreView: boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selectedStoreId) {
        localStorage.setItem(STORAGE_KEY, selectedStoreId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [selectedStoreId]);

  const setSelectedStoreId = useCallback((id: string | null) => {
    setSelectedStoreIdState(id);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        selectedStoreId,
        setSelectedStoreId,
        isStoreView: selectedStoreId != null,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
}
