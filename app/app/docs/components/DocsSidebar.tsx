'use client';

import {
  Book,
  Bot,
  Code,
  Database,
  FileText,
  Layers,
  Lock,
  Menu,
  Monitor,
  Network,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { DocCategory, DocPage, DocSubcategory } from '../types';
import { DocsSearchTrigger } from './DocsSearch';

interface DocsSidebarProps {
  categories: DocCategory[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Archestra Desktop Agent': <Monitor className="h-4 w-4" />,
  'Archestra Platform': <Layers className="h-4 w-4" />,
  Agents: <Bot className="h-4 w-4" />,
  'LLM Proxy': <Shield className="h-4 w-4" />,
  MCP: <Network className="h-4 w-4" />,
  Administration: <Lock className="h-4 w-4" />,
  Knowledge: <Database className="h-4 w-4" />,
  Development: <Code className="h-4 w-4" />,
  'Getting Started': <Book className="h-4 w-4" />,
  'API Reference': <Code className="h-4 w-4" />,
  Guides: <FileText className="h-4 w-4" />,
  Examples: <Layers className="h-4 w-4" />,
  Advanced: <Settings className="h-4 w-4" />,
  Reference: <FileText className="h-4 w-4" />,
};

type SidebarItem =
  | { kind: 'doc'; doc: DocPage; order: number }
  | { kind: 'subcategory'; subcategory: DocSubcategory; parentDoc?: DocPage; order: number };

// Build a single ordered list per category that interleaves direct docs and
// subcategories. If a subcategory name matches a sibling direct doc's title,
// that doc becomes the subcategory's parent link and is removed from the
// direct-doc list. The subcategory inherits the parent doc's `order` so the
// nested group appears at the parent's natural position.
function buildSidebarItems(category: DocCategory): SidebarItem[] {
  const subcategoryNames = new Set((category.subcategories ?? []).map((sc) => sc.name));

  const directItems: SidebarItem[] = category.docs
    .filter((doc) => !subcategoryNames.has(doc.title))
    .map((doc) => ({ kind: 'doc' as const, doc, order: doc.order }));

  const subcategoryItems: SidebarItem[] = (category.subcategories ?? []).map((subcategory) => {
    const parentDoc = category.docs.find((d) => d.title === subcategory.name);
    return {
      kind: 'subcategory' as const,
      subcategory,
      parentDoc,
      order: parentDoc?.order ?? Number.MAX_SAFE_INTEGER,
    };
  });

  return [...directItems, ...subcategoryItems].sort((a, b) => a.order - b.order);
}

export default function DocsSidebar({ categories }: DocsSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get the first doc slug for comparison
  const firstDocSlug = categories[0]?.docs[0]?.slug;

  const isActiveDoc = (slug: string) => {
    // If we're on /docs and this is the first doc, mark it as active
    if (pathname === '/docs' && slug === firstDocSlug) {
      return true;
    }
    return pathname === `/docs/${slug}`;
  };

  const isActiveCategory = (category: DocCategory) => {
    const hasActiveDirectDoc = category.docs.some((doc) => isActiveDoc(doc.slug));
    const hasActiveSubcategoryDoc = category.subcategories?.some((subcategory) =>
      subcategory.docs.some((doc) => isActiveDoc(doc.slug))
    );
    return hasActiveDirectDoc || hasActiveSubcategoryDoc;
  };

  return (
    <>
      {/* Mobile Menu Panel - Only visible on small screens */}
      <div className="block lg:hidden">
        <div className="px-4 pt-3 pb-2">
          <DocsSearchTrigger />
        </div>
        <div className="sticky top-0 bg-white border-b border-gray-200 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="text-sm font-medium text-gray-700">Documentation Menu</span>
            {isMobileMenuOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
          </button>

          {/* Mobile Dropdown Menu */}
          <div
            className={`
            ${isMobileMenuOpen ? 'block' : 'hidden'}
            bg-white border-t border-gray-100 max-h-[60vh] overflow-y-auto
          `}
          >
            <nav className="py-2">
              {categories.map((category) => {
                const isActive = isActiveCategory(category);
                const items = buildSidebarItems(category);

                return (
                  <div key={category.slug} className="">
                    <div
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                        isActive ? 'text-gray-900 bg-gray-50' : 'text-gray-700'
                      }`}
                    >
                      {categoryIcons[category.name] || <FileText className="h-4 w-4" />}
                      <span>{category.name}</span>
                    </div>

                    <div>
                      {items.map((item) => {
                        if (item.kind === 'doc') {
                          const isDocActive = isActiveDoc(item.doc.slug);
                          return (
                            <Link
                              key={item.doc.slug}
                              href={`/docs/${item.doc.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`block pl-10 pr-4 py-2 text-sm transition-colors ${
                                isDocActive
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {item.doc.title}
                            </Link>
                          );
                        }

                        const { subcategory, parentDoc } = item;
                        const isParentActive = parentDoc ? isActiveDoc(parentDoc.slug) : false;

                        return (
                          <div key={subcategory.name}>
                            {parentDoc ? (
                              <Link
                                href={`/docs/${parentDoc.slug}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block pl-10 pr-4 py-2 text-sm transition-colors ${
                                  isParentActive
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                {parentDoc.title}
                              </Link>
                            ) : (
                              <div className="pl-10 pr-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                                {subcategory.name}
                              </div>
                            )}
                            {subcategory.docs.map((doc) => {
                              const isDocActive = isActiveDoc(doc.slug);
                              return (
                                <Link
                                  key={doc.slug}
                                  href={`/docs/${doc.slug}`}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={`block pl-16 pr-4 py-2 text-sm transition-colors ${
                                    isDocActive
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                  }`}
                                >
                                  {doc.title}
                                </Link>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Only visible on large screens */}
      <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-gray-200 pl-5 pr-4 sm:pl-8 lg:pl-14 pt-4 pb-8 self-start">
        <div className="mb-4">
          <DocsSearchTrigger />
        </div>
        <div>
          <nav className="flex flex-col gap-3 pb-8">
            {categories.map((category) => {
              const isActive = isActiveCategory(category);
              const items = buildSidebarItems(category);

              return (
                <div key={category.slug} className="flex flex-col gap-1.5">
                  <div
                    className={`flex items-center gap-2.5 py-1 text-sm font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {categoryIcons[category.name] || <FileText className="h-4 w-4" />}
                    <span>{category.name}</span>
                  </div>

                  <div className="ml-6 flex flex-col gap-0.5">
                    {items.map((item) => {
                      if (item.kind === 'doc') {
                        const isDocActive = isActiveDoc(item.doc.slug);
                        return (
                          <Link
                            key={item.doc.slug}
                            href={`/docs/${item.doc.slug}`}
                            className={`block px-3 py-1 text-sm rounded-md transition-colors ${
                              isDocActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            {item.doc.title}
                          </Link>
                        );
                      }

                      const { subcategory, parentDoc } = item;
                      const isParentActive = parentDoc ? isActiveDoc(parentDoc.slug) : false;

                      return (
                        <div key={subcategory.name} className="flex flex-col gap-0.5">
                          {parentDoc ? (
                            <Link
                              href={`/docs/${parentDoc.slug}`}
                              className={`block px-3 py-1 text-sm rounded-md transition-colors ${
                                isParentActive
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              {parentDoc.title}
                            </Link>
                          ) : (
                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                              {subcategory.name}
                            </div>
                          )}
                          {subcategory.docs.map((doc) => {
                            const isDocActive = isActiveDoc(doc.slug);
                            return (
                              <Link
                                key={doc.slug}
                                href={`/docs/${doc.slug}`}
                                className={`block ml-4 px-3 py-1 text-sm rounded-md transition-colors ${
                                  isDocActive
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                {doc.title}
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
