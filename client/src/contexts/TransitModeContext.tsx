/**
 * TransitModeContext.tsx
 * 
 * React Context for Transit Mode state management.
 * Provides Transit Mode state to all components.
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 69.4
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { transitModeService } from '../services/TransitModeService';

interface TransitModeContextValue {
  isTransitModeActive: boolean;
  isManuallyDisabled: boolean;
  nextTransitionTime: Date | null;
}

const TransitModeContext = createContext<TransitModeContextValue>({
  isTransitModeActive: false,
  isManuallyDisabled: false,
  nextTransitionTime: null,
});

export const useTransitMode = () => useContext(TransitModeContext);

interface TransitModeProviderProps {
  children: ReactNode;
}

export const TransitModeProvider: React.FC<TransitModeProviderProps> = ({ children }) => {
  const [isTransitModeActive, setIsTransitModeActive] = useState(false);
  const [isManuallyDisabled, setIsManuallyDisabled] = useState(false);
  const [nextTransitionTime, setNextTransitionTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize state from service
    const updateState = () => {
      setIsTransitModeActive(transitModeService.isTransitModeActive());
      setIsManuallyDisabled(transitModeService.isManuallyDisabled());
      setNextTransitionTime(transitModeService.getNextTransitionTime());
    };

    updateState();

    // Listen for Transit Mode state changes
    const handleStateChange = (isActive: boolean) => {
      setIsTransitModeActive(isActive);
      setNextTransitionTime(transitModeService.getNextTransitionTime());
    };

    transitModeService.addListener(handleStateChange);

    // Update next transition time every minute
    const intervalId = setInterval(() => {
      setNextTransitionTime(transitModeService.getNextTransitionTime());
    }, 60000);

    return () => {
      transitModeService.removeListener(handleStateChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <TransitModeContext.Provider
      value={{
        isTransitModeActive,
        isManuallyDisabled,
        nextTransitionTime,
      }}
    >
      {children}
    </TransitModeContext.Provider>
  );
};
