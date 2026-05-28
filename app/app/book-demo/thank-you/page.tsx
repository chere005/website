import { BookOpen, FileText, LayoutGrid, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import Footer from '@components/Footer';
import Header from '@components/Header';
import constants from '@constants';

const {
  slack: { joinCommunityUrl },
} = constants;

const exploreLinks = [
  {
    icon: BookOpen,
    label: 'Read the docs',
    description: 'Quickstart guides, deployment options, and full platform reference.',
    href: '/docs',
    colour: 'teal',
  },
  {
    icon: LayoutGrid,
    label: 'Browse the MCP Catalog',
    description: '900+ evaluated Model Context Protocol servers, ready to plug in.',
    href: '/mcp-catalog',
    colour: 'purple',
  },
  {
    icon: FileText,
    label: 'Explore the blog',
    description: 'Deep dives on MCP security, prompt injection, and agentic AI.',
    href: '/blog',
    colour: 'blue',
  },
  {
    icon: MessageSquare,
    label: 'Join the community',
    description: 'Chat with the team and other Archestra users on Slack.',
    href: joinCommunityUrl,
    colour: 'green',
    external: true,
  },
];

const colourMap: Record<string, { icon: string; border: string }> = {
  teal: {
    icon: 'text-teal-600 bg-teal-50',
    border: 'border-teal-200 hover:border-teal-300',
  },
  purple: {
    icon: 'text-purple-600 bg-purple-50',
    border: 'border-purple-200 hover:border-purple-300',
  },
  blue: {
    icon: 'text-blue-600 bg-blue-50',
    border: 'border-blue-200 hover:border-blue-300',
  },
  green: {
    icon: 'text-green-600 bg-green-50',
    border: 'border-green-200 hover:border-green-300',
  },
};

export default function BookDemoThankYouPage() {
  return (
    <>
      <Header />

      <main className="bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#fafafa] py-24 sm:py-36">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
            }}
          />

          <div className="relative mx-auto max-w-2xl px-5 sm:px-8 text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 ring-8 ring-teal-100">
              <svg
                className="h-10 w-10 text-teal-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
              </span>
              <span className="text-sm font-medium text-teal-700">Confirmed</span>
            </div>

            <h1
              className="font-bold text-gray-950"
              style={{
                fontSize: 'clamp(32px, 5vw, 58px)',
                lineHeight: 1.04,
                letterSpacing: '-0.03em',
              }}
            >
              Demo booked.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-500">
              Check your inbox for a calendar invite. We will review your setup beforehand so the session is tailored to
              your stack and your questions.
            </p>
          </div>
        </section>

        {/* While you wait */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <h2
              className="mb-3 text-center font-medium text-gray-900"
              style={{ fontSize: 'clamp(22px, 3vw, 32px)', letterSpacing: '-0.025em' }}
            >
              While you wait
            </h2>
            <p className="mb-12 text-center text-gray-500">Get a head start on the platform.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {exploreLinks.map(({ icon: Icon, label, description, href, colour, external }) => {
                const c = colourMap[colour];
                const Wrapper = external ? 'a' : Link;
                const extraProps = external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href };

                return (
                  <Wrapper
                    key={label}
                    {...extraProps}
                    className={`group flex items-start gap-4 rounded-xl border bg-white p-5 transition-all hover:shadow-md ${c.border}`}
                  >
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:underline">{label}</p>
                      <p className="mt-0.5 text-sm text-gray-500 leading-relaxed">{description}</p>
                    </div>
                    <svg
                      className="ml-auto mt-1 h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
