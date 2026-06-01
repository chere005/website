import type { Metadata } from 'next';

import constants from '@constants';

const {
  company: { name: companyName },
  website: { urls: websiteUrls },
} = constants;

const title = 'Book a Demo';
const socialTitle = `Book a Demo | ${companyName}`;
const description = `Schedule a 30-minute enterprise demo of ${companyName} — the secure MCP gateway and catalog for AI agents.`;
const url = `${websiteUrls.base}/book-demo`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    title: socialTitle,
    description,
    url,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: socialTitle,
    description,
  },
};

export default function BookDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
