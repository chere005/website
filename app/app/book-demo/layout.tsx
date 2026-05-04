import type { Metadata } from 'next';

import constants from '@constants';

const {
  company: { name: companyName },
  website: { urls: websiteUrls },
} = constants;

const title = `Book a Demo | ${companyName}`;
const description = `Schedule an enterprise demo of ${companyName} — the secure MCP platform for AI agents.`;
const url = `${websiteUrls.base}/book-demo`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    title,
    description,
    url,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function BookDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
