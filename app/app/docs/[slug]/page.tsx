import 'highlight.js/styles/github.css';
import { ChevronLeft, ChevronRight, Clock, Edit } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

import Footer from '@components/Footer';
import Header from '@components/Header';
import constants from '@constants';

import DocContent from '../components/DocContent';
import DocsSidebar from '../components/DocsSidebar';
import { buildDocMetadata, generateTableOfContents, getAllDocs, getDocBySlug, getDocsByCategory } from '../utils';

const {
  company: { name: companyName },
} = constants;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  return buildDocMetadata(doc, constants.website.urls.base, companyName);
}

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  const categories = getDocsByCategory();
  const toc = doc ? generateTableOfContents(doc.content) : [];

  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <DocsSidebar categories={categories} />
        </div>

        <div className="mx-auto w-full max-w-[1320px] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_16rem]">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <DocsSidebar categories={categories} />
          </div>

          {/* Article */}
          <article className="min-w-0 px-6 md:px-12 pt-4 pb-10 max-w-3xl mx-auto w-full">
            {/* Breadcrumb with Edit */}
            <nav className="mb-6 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex flex-wrap items-center gap-x-2 text-gray-600">
                  <Link href="/docs" className="hover:text-blue-600 transition-colors">
                    Docs
                  </Link>
                  <span>/</span>
                  <span className="text-gray-500">{doc.category}</span>
                  <span>/</span>
                  <span className="text-gray-900 font-medium">{doc.title}</span>
                </div>
                <a
                  href={`https://github.com/archestra-ai/archestra/edit/main/docs/pages/${doc.slug}.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors -ml-2 sm:ml-4 px-2 py-1 hover:bg-gray-50 rounded-lg"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit on GitHub</span>
                </a>
              </div>
            </nav>

            <header className="mb-8 pb-8 border-b border-gray-200">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{doc.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {doc.readingTime}
                </span>
              </div>
            </header>

            <DocContent content={doc.content} />

            {doc.navigation && (
              <nav className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex justify-between">
                  {doc.navigation.prev ? (
                    <Link
                      href={`/docs/${doc.navigation.prev.slug}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <div>
                        <div className="text-xs text-gray-500">Previous</div>
                        <div className="font-medium">{doc.navigation.prev.title}</div>
                      </div>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {doc.navigation.next && (
                    <Link
                      href={`/docs/${doc.navigation.next.slug}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-right"
                    >
                      <div>
                        <div className="text-xs text-gray-500">Next</div>
                        <div className="font-medium">{doc.navigation.next.title}</div>
                      </div>
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </article>

          {/* Table of Contents - Right Sidebar */}
          <aside className="hidden xl:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-l border-gray-200 self-start">
            {toc.length > 0 && (
              <div className="px-6 pt-4 pb-10">
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-2 py-1">
                  On this page
                </h3>
                <nav className="flex flex-col gap-0.5 pb-4">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`
                        block w-full text-left py-1 text-sm transition-colors
                        ${item.level === 2 ? 'pl-0' : 'pl-4'}
                        text-gray-600 hover:text-gray-900 border-l border-transparent
                      `}
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <>{children}</>,
                          code: ({ children }) => (
                            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {item.rawText}
                      </ReactMarkdown>
                    </a>
                  ))}
                </nav>
              </div>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
