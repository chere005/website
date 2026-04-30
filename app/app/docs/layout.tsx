import GithubSlugger from 'github-slugger';

import Footer from '@components/Footer';
import Header from '@components/Header';

import DocsSearch from './components/DocsSearch';
import DocsSidebar from './components/DocsSidebar';
import { getAllDocs, getDocsByCategory } from './utils';

function cleanInline(line: string): string {
  return line
    .replace(/`([^`\n]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function processContent(content: string): {
  cleaned: string;
  headings: { id: string; offset: number }[];
} {
  const slugger = new GithubSlugger();
  const headings: { id: string; offset: number }[] = [];
  const parts: string[] = [];
  let cleanedLen = 0;

  let noComments = content;
  let previous: string;
  do {
    previous = noComments;
    noComments = noComments.replace(/<!--[\s\S]*?-->/g, '');
  } while (noComments !== previous);
  let inFence = false;

  for (const rawLine of noComments.split('\n')) {
    if (/^\s*```/.test(rawLine)) {
      inFence = !inFence;
      continue;
    }

    let cleaned: string;
    if (inFence) {
      cleaned = rawLine.replace(/[ \t]+/g, ' ').trim();
    } else {
      const h = rawLine.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        const text = cleanInline(h[2]);
        if (text) {
          headings.push({ id: slugger.slug(text), offset: cleanedLen });
        }
        cleaned = text;
      } else {
        cleaned = cleanInline(rawLine.replace(/^\s*[-*+]\s+/, ''));
      }
    }

    if (!cleaned) continue;
    parts.push(cleaned);
    cleanedLen += cleaned.length + 1;
  }

  return { cleaned: parts.join('\n'), headings };
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const categories = getDocsByCategory();
  const searchDocs = getAllDocs().map((doc) => {
    const { cleaned, headings } = processContent(doc.content);
    return {
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      subcategory: doc.subcategory,
      description: doc.description,
      content: cleaned,
      headings,
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <DocsSearch docs={searchDocs} />

      <main className="flex-1">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <DocsSidebar categories={categories} />
        </div>

        <div className="mx-auto w-full max-w-[1320px] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <DocsSidebar categories={categories} />
          </div>

          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
