'use client';

import { ArrowUpRight, MapPin, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { GitHubStarButton } from '@components/GitHubStarButton';
import constants from '@constants';

import { useCommunityStats } from '../app/community-stream/data/use-stats';

const {
  company: { name: companyName },
  website: { urls: websiteUrls },
} = constants;

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const stats = useCommunityStats();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      <div className="border-b border-teal-700 bg-teal-600 text-white">
        <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-2.5 text-center sm:px-8 lg:px-14">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="hidden h-4 w-4 shrink-0 text-teal-100 sm:block" />
            <p>
              <span className="font-semibold">We&apos;re heading to KubeCon Mumbai</span>
              <span className="mx-2 text-teal-200">·</span>
              <span className="text-teal-50">June 18–19</span>
            </p>
          </div>
          <a
            href="https://form.typeform.com/to/prOE2Cxf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white px-3 py-1 text-sm font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-50"
          >
            Let&apos;s meet
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center gap-6 px-5 sm:px-8 lg:px-14">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="relative h-[28px] w-[28px] shrink-0">
            <Image src={websiteUrls.logoRelativeUrl} alt={`${companyName} Logo`} fill className="object-contain" />
          </div>
          <span className="font-mono text-[17px] font-medium text-gray-900" style={{ letterSpacing: '-0.015em' }}>
            Archestra<span className="text-gray-400">.AI</span>
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-6 ml-4">
          <Link href="/book-demo" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Book Demo
          </Link>
          <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Blog
          </Link>
          <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Docs
          </Link>
          <Link href="/mcp-catalog" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            MCP Catalog
          </Link>
          <Link href="/about" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            About Us
          </Link>
          <Link href="/careers" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Careers
          </Link>
          <Link
            href="/community-stream/general"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
          >
            Community
            {stats.totalTodayMessages > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {stats.totalTodayMessages}
              </span>
            )}
          </Link>
        </nav>

        <div className="ml-auto hidden xl:flex items-center gap-3">
          <GitHubStarButton />
        </div>

        <div className="ml-auto flex xl:hidden items-center gap-2">
          <GitHubStarButton />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col px-4 py-2">
            <Link
              href="/book-demo"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Book Demo
            </Link>
            <Link
              href="/blog"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/docs"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <Link
              href="/mcp-catalog"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              MCP Catalog
            </Link>
            <Link
              href="/about"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About Us
            </Link>
            <Link
              href="/careers"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Careers
            </Link>
            <Link
              href="/community-stream/general"
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Community
              {stats.totalTodayMessages > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {stats.totalTodayMessages}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
