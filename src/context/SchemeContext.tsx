'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type SchemeType = 'LPG' | 'MDM';

interface SchemeContextType {
  currentScheme: SchemeType;
  setScheme: (scheme: SchemeType) => void;
  schemeConfig: {
    name: string;
    fullName: string;
    entityName: string;       // 'Beneficiary' for LPG, 'School' for MDM
    entityNamePlural: string; // 'Beneficiaries' for LPG, 'Schools' for MDM
    idField: string;          // 'beneficiary_id' for LPG, 'school_id' for MDM
    apiBase: string;          // '/api' for LPG, '/api/mdm' for MDM
    color: string;            // Theme color
    icon: string;             // Emoji icon
  };
}

const schemeConfigs: Record<SchemeType, SchemeContextType['schemeConfig']> = {
  LPG: {
    name: 'LPG',
    fullName: 'LPG Subsidy Scheme',
    entityName: 'Beneficiary',
    entityNamePlural: 'Beneficiaries',
    idField: 'beneficiary_id',
    apiBase: '/api',
    color: '#3b82f6', // Blue
    icon: 'LPG',
  },
  MDM: {
    name: 'MDM',
    fullName: 'Mid Day Meal Scheme',
    entityName: 'School',
    entityNamePlural: 'Schools',
    idField: 'school_id',
    apiBase: '/api/mdm',
    color: '#22c55e', // Green
    icon: 'MDM',
  },
};

const SchemeContext = createContext<SchemeContextType | undefined>(undefined);

export function SchemeProvider({ children }: { children: ReactNode }) {
  const [currentScheme, setCurrentScheme] = useState<SchemeType>('LPG');

  const setScheme = useCallback((scheme: SchemeType) => {
    setCurrentScheme(scheme);
    // Optional: persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('janavlokan_scheme', scheme);
    }
  }, []);

  // Load from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('janavlokan_scheme') as SchemeType | null;
      if (saved && (saved === 'LPG' || saved === 'MDM')) {
        setCurrentScheme(saved);
      }
    }
  }, []);

  const value: SchemeContextType = {
    currentScheme,
    setScheme,
    schemeConfig: schemeConfigs[currentScheme],
  };

  return (
    <SchemeContext.Provider value={value}>
      {children}
    </SchemeContext.Provider>
  );
}

export function useScheme() {
  const context = useContext(SchemeContext);
  if (context === undefined) {
    throw new Error('useScheme must be used within a SchemeProvider');
  }
  return context;
}

// Export configs for use elsewhere
export { schemeConfigs };
