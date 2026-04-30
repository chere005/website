'use client';

import {
  Book,
  Bot,
  ChevronRight,
  Code,
  Database,
  FileText,
  Layers,
  Lock,
  Monitor,
  Network,
  Search,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SearchDoc {
  slug: string;
  title: string;
  category: string;
  subcategory?: string;
  description?: string;
  content: string;
  headings: { id: string; offset: number }[];
}

interface DocsSearchProps {
  docs: SearchDoc[];
}

interface SearchResult {
  doc: SearchDoc;
  score: number;
  snippet?: string;
  anchor?: string;
}

const MAX_RESULTS = 30;
const SNIPPET_RADIUS = 70;

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Archestra Desktop Agent': Monitor,
  'Archestra Platform': Layers,
  Agents: Bot,
  'LLM Proxy': Shield,
  MCP: Network,
  Administration: Lock,
  Knowledge: Database,
  Development: Code,
  'Getting Started': Book,
  'API Reference': Code,
  Guides: FileText,
  Examples: Layers,
  Advanced: Settings,
  Reference: FileText,
};

function findMatch(content: string, query: string): { idx: number; snippet: string } | undefined {
  if (!query) return undefined;
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return undefined;

  const lineStart = content.lastIndexOf('\n', idx - 1) + 1;
  const lineEndRaw = content.indexOf('\n', idx);
  const lineEnd = lineEndRaw === -1 ? content.length : lineEndRaw;
  const line = content.slice(lineStart, lineEnd);
  const matchInLine = idx - lineStart;

  const start = Math.max(0, matchInLine - SNIPPET_RADIUS);
  const end = Math.min(line.length, matchInLine + query.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < line.length ? '…' : '';
  return { idx, snippet: prefix + line.slice(start, end).trim() + suffix };
}

function findAnchorForOffset(headings: { id: string; offset: number }[], offset: number): string | undefined {
  let current: string | undefined;
  for (const h of headings) {
    if (h.offset <= offset) current = h.id;
    else break;
  }
  return current;
}

function scoreDoc(doc: SearchDoc, q: string): number {
  const query = q.toLowerCase();
  const title = doc.title.toLowerCase();
  const category = doc.category.toLowerCase();
  const subcategory = doc.subcategory?.toLowerCase() ?? '';
  const description = doc.description?.toLowerCase() ?? '';
  const content = doc.content.toLowerCase();

  let score = 0;
  if (title === query) score += 1000;
  if (title.startsWith(query)) score += 500;
  if (title.includes(query)) score += 200;
  if (subcategory.includes(query)) score += 80;
  if (category.includes(query)) score += 60;
  if (description.includes(query)) score += 40;
  if (content.includes(query)) score += 10;
  return score;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-gray-900">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function buildBreadcrumb(doc: SearchDoc): string {
  const parts = ['docs', doc.category.toLowerCase()];
  if (doc.subcategory) parts.push(doc.subcategory.toLowerCase());
  return parts.join(' / ');
}

const SEARCH_OPEN_EVENT = 'docs-search:open';

export function DocsSearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SEARCH_OPEN_EVENT))}
      className="flex items-center gap-2 w-full h-8 px-2.5 rounded-md border border-gray-200 bg-transparent text-[12.5px] text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
      aria-label="Search docs"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Search docs…</span>
      <kbd className="hidden sm:inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[3px] border border-gray-300 bg-gray-50 text-[10px] font-mono text-gray-500">
        <span>⌘</span>K
      </kbd>
    </button>
  );
}

export default function DocsSearch({ docs }: DocsSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener(SEARCH_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(SEARCH_OPEN_EVENT, onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (!q) {
      return docs.slice(0, MAX_RESULTS).map((doc) => ({ doc, score: 0 }));
    }
    const scored: SearchResult[] = [];
    for (const doc of docs) {
      const score = scoreDoc(doc, q);
      if (score > 0) {
        const match = findMatch(doc.content, q);
        const anchor = match ? findAnchorForOffset(doc.headings, match.idx) : undefined;
        scored.push({ doc, score, snippet: match?.snippet, anchor });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS);
  }, [docs, query]);

  // Group while preserving result order
  const sections = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    const order: string[] = [];
    for (const r of results) {
      const key = r.doc.category;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(r);
    }
    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const navigate = (slug: string, anchor?: string) => {
    setOpen(false);
    const q = query.trim();
    let path = `/docs/${slug}`;
    if (q) {
      path += `?q=${encodeURIComponent(q)}`;
    } else if (anchor) {
      path += `#${anchor}`;
    }
    router.push(path);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) navigate(r.doc.slug, r.anchor);
    }
  };

  let runningIdx = 0;

  if (!open || !mounted) return null;

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-6 pt-24 pb-6 bg-[rgba(15,18,22,0.46)] backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
        >
          <div
            className="w-full max-w-[640px] flex flex-col bg-white border border-gray-300 rounded-[10px] overflow-hidden shadow-[0_24px_48px_-12px_rgba(15,18,22,0.32),0_4px_12px_-2px_rgba(15,18,22,0.12)]"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Input row */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-200">
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search docs, MCP servers, settings…"
                className="flex-1 bg-transparent border-0 outline-none text-[15px] font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400"
              />
              <button
                onClick={() => setOpen(false)}
                className="w-[22px] h-[22px] rounded inline-flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} className="flex-1 overflow-y-auto py-1.5">
              {results.length === 0 ? (
                <div className="py-9 px-6 text-center text-[13px] text-gray-500">
                  <div className="w-8 h-8 mx-auto mb-2.5 border border-gray-200 rounded-full flex items-center justify-center text-gray-400">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    No results for{' '}
                    <span className="font-mono bg-gray-50 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-900">
                      {query}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-400">Try a different keyword, or browse the sidebar.</div>
                </div>
              ) : (
                sections.map((section, sIdx) => {
                  const Icon = categoryIcons[section.name] ?? FileText;
                  return (
                    <div key={section.name} className={sIdx > 0 ? 'mt-1' : ''}>
                      <div className="px-[18px] pt-3.5 pb-1.5 text-sm font-medium text-gray-900">{section.name}</div>
                      {section.items.map((r) => {
                        const i = runningIdx++;
                        const selected = i === activeIndex;
                        return (
                          <div
                            key={r.doc.slug}
                            data-index={i}
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => navigate(r.doc.slug, r.anchor)}
                            className={`flex items-center gap-3 pl-[18px] pr-4 py-2.5 cursor-pointer border-l-2 transition-colors ${
                              selected ? 'bg-blue-50/60 border-blue-600' : 'border-transparent hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className={`w-[26px] h-[26px] shrink-0 inline-flex items-center justify-center rounded-[5px] border bg-white ${
                                selected ? 'border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500'
                              }`}
                            >
                              <Icon className="h-[13px] w-[13px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-px">
                                <div
                                  className={`text-[13.5px] font-medium truncate min-w-0 ${
                                    selected ? 'text-blue-600' : 'text-gray-900'
                                  }`}
                                >
                                  {highlight(r.doc.title, query)}
                                </div>
                                <div className="text-xs text-gray-400 shrink-0">{buildBreadcrumb(r.doc)}</div>
                              </div>
                              {(r.snippet || r.doc.description) && (
                                <div className="text-xs text-gray-500 leading-[1.4] truncate">
                                  {r.snippet ? highlight(r.snippet, query) : r.doc.description}
                                </div>
                              )}
                            </div>
                            <ChevronRight
                              className={`h-3 w-3 shrink-0 ${selected ? 'opacity-100 text-blue-600' : 'opacity-0'}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3.5 px-4 py-2 border-t border-gray-200 bg-gray-50 text-[11.5px] text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center min-w-4 h-4 px-1 border border-gray-300 rounded-[3px] bg-white text-[10px] font-mono text-gray-500">
                  ↑
                </kbd>
                <kbd className="inline-flex items-center justify-center min-w-4 h-4 px-1 border border-gray-300 rounded-[3px] bg-white text-[10px] font-mono text-gray-500">
                  ↓
                </kbd>
                <span>navigate</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center min-w-4 h-4 px-1 border border-gray-300 rounded-[3px] bg-white text-[10px] font-mono text-gray-500">
                  ↵
                </kbd>
                <span>select</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center min-w-4 h-4 px-1 border border-gray-300 rounded-[3px] bg-white text-[10px] font-mono text-gray-500">
                  esc
                </kbd>
                <span>close</span>
              </span>
              <span className="flex-1" />
              <span className="text-gray-400">archestra docs</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
