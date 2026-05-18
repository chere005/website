'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { Suspense, useEffect } from 'react';

import { gdprConsentStore } from '@lib/gdpr-consent-store';

function PostHogPageView() {
  const client = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    client?.capture('$pageview', { $current_url: window.location.href });
  }, [pathname, searchParams, client]);

  return null;
}

function PostHogSetup({ apiKey }: { apiKey: string }) {
  useEffect(() => {
    posthog.init(apiKey, {
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      capture_heatmaps: false,
      opt_out_capturing_by_default: true,
    });

    const syncConsent = () => {
      if (gdprConsentStore.hasAnalyticsConsent()) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    };

    syncConsent();

    const unsubscribe = gdprConsentStore.subscribe(syncConsent);
    window.addEventListener('storage', syncConsent);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', syncConsent);
    };
  }, [apiKey]);

  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}

export function PostHogProvider({ apiKey, children }: { apiKey: string; children: React.ReactNode }) {
  if (!apiKey) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogSetup apiKey={apiKey} />
      {children}
    </PHProvider>
  );
}
