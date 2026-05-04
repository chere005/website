import type { Metadata } from 'next';

import constants from '@constants';

const {
  company: { name: companyName },
  website: { urls: websiteUrls },
} = constants;

const title = `Contributor Onboarding | ${companyName}`;
const description = `Join the ${companyName} community as an open-source contributor.`;
const url = `${websiteUrls.base}/contributor-onboard`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url,
    type: 'website',
  },
};

export default function ContributorOnboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
