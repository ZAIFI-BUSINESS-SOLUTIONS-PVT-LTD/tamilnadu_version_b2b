import React, { createContext, useContext } from 'react';

// Holds resolved institution details for domain-based tenancy
// Shape: { institutionId: string, displayName: string }
const InstitutionContext = createContext(null);

function InstitutionProvider({ value, children }) {
  return (
    <InstitutionContext.Provider value={value}>
      {children}
    </InstitutionContext.Provider>
  );
}

function useInstitution() {
  return useContext(InstitutionContext);
}

export { InstitutionContext, InstitutionProvider, useInstitution };
