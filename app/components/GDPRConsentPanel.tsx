'use client';

import { useEffect, useState } from 'react';

import { CONSENT_STORAGE_KEY, CONSENT_VERSION, ConsentSettings, gdprConsentStore } from '@lib/gdpr-consent-store';

export default function GDPRConsentPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!storedConsent) {
      setIsVisible(true);
    } else {
      try {
        const parsed = JSON.parse(storedConsent);
        if (parsed.version !== CONSENT_VERSION) {
          setIsVisible(true);
        }
      } catch {
        setIsVisible(true);
      }
    }

    const unsubscribe = gdprConsentStore.subscribe(() => {
      setIsVisible(true);
      setIsManuallyOpened(true);
    });

    return unsubscribe;
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true, preferences: true });
  };

  const handleRejectAll = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false, preferences: false });
  };

  const saveConsent = (settings: ConsentSettings) => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, timestamp: new Date().toISOString(), settings })
    );
    setIsVisible(false);
    setIsManuallyOpened(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-4 flex items-center gap-4">
        <span className="text-2xl select-none" aria-hidden="true">
          🍪
        </span>
        <p className="flex-1 text-sm text-gray-500 leading-snug">
          We use cookies to understand how people use this website and make it better.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRejectAll}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-1 whitespace-nowrap"
          >
            No thanks
          </button>
          <button
            onClick={handleAcceptAll}
            className="text-sm font-semibold text-white bg-gray-900 hover:bg-gray-700 transition-colors rounded-lg px-4 py-2 whitespace-nowrap"
          >
            Accept
          </button>
        </div>
        {isManuallyOpened && (
          <button
            onClick={() => {
              setIsVisible(false);
              setIsManuallyOpened(false);
            }}
            className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
