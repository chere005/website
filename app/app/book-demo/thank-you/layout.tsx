import type { Metadata } from 'next';

import constants from '@constants';

const {
  company: { name: companyName },
  website: { urls: websiteUrls },
} = constants;

const title = `Demo Booked — Thank You | ${companyName}`;
const description = `Your ${companyName} enterprise demo is confirmed. We'll be in touch shortly to walk you through the secure MCP platform for AI agents.`;
const url = `${websiteUrls.base}/book-demo/thank-you`;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  robots: {
    index: false,
    follow: false,
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

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return children;
}
