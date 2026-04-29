'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { TableOfContentsItem } from '../types';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  useEffect(() => {
    if (!activeId) return;
    const link = linkRefs.current.get(activeId);
    if (!link) return;
    const container = link.closest('aside');
    if (!container) return;
    const linkRect = link.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
      const target = link.offsetTop - container.clientHeight / 2 + link.clientHeight / 2;
      container.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [activeId]);

  useEffect(() => {
    if (items.length === 0) return;

    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visible = new Set<string>();

    const updateActive = () => {
      if (visible.size > 0) {
        const firstVisible = items.find((item) => visible.has(item.id));
        if (firstVisible) {
          setActiveId(firstVisible.id);
          return;
        }
      }
      const scrollY = window.scrollY + 120;
      let current = items[0]?.id ?? '';
      for (const el of elements) {
        if (el.offsetTop <= scrollY) {
          current = el.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        updateActive();
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    updateActive();

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="px-6 pt-4 pb-10">
      <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-2 py-1">On this page</h3>
      <nav className="flex flex-col gap-0.5 pb-4">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <a
              key={item.id}
              ref={(el) => {
                if (el) linkRefs.current.set(item.id, el);
                else linkRefs.current.delete(item.id);
              }}
              href={`#${item.id}`}
              className={`
                block w-full text-left py-1 text-sm transition-colors border-l
                ${item.level === 2 ? 'pl-3' : 'pl-7'}
                ${
                  isActive
                    ? 'border-blue-600 text-blue-700 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
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
          );
        })}
      </nav>
    </div>
  );
}
