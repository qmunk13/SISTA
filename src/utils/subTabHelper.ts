import { useState, useEffect } from 'react';

export function useSubTab<T extends string>(tabName: string, initialValue: T): [T, (val: T) => void] {
  const [activeSubTab, setActiveSubTab] = useState<T>(() => {
    const saved = localStorage.getItem(`erp_subtab_${tabName}`);
    return (saved as T) || initialValue;
  });

  useEffect(() => {
    const handleSubTabChange = (e: CustomEvent) => {
      if (e.detail && e.detail.tab === tabName) {
        setActiveSubTab(e.detail.subTab as T);
      }
    };
    window.addEventListener('erp-subtab-change', handleSubTabChange as EventListener);
    return () => window.removeEventListener('erp-subtab-change', handleSubTabChange as EventListener);
  }, [tabName]);

  const setSubTabWithStorage = (val: T) => {
    setActiveSubTab(val);
    localStorage.setItem(`erp_subtab_${tabName}`, val);
  };

  return [activeSubTab, setSubTabWithStorage];
}
