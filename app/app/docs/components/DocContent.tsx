'use client';

import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import mermaid from 'mermaid';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('./SwaggerUI'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-gray-500">Loading API documentation...</div>
    </div>
  ),
});

interface DocContentProps {
  content: string;
}

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

interface MermaidProps {
  chart: string;
}

function findFirstTextMatch(root: HTMLElement, query: string): { node: Text; idx: number } | undefined {
  const lower = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const parent = n.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('mark')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    const idx = (text.nodeValue ?? '').toLowerCase().indexOf(lower);
    if (idx !== -1) return { node: text, idx };
  }
  return undefined;
}

function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      if (!ref.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        // Scale up the SVG by modifying its viewBox and dimensions
        const scaledSvg = svg.replace(/(<svg[^>]*)(>)/, (match, p1, p2) => {
          // Add or modify width to be 100% and set a min-height
          return (
            p1.replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '') +
            ' width="100%" style="min-height: 400px; max-width: 900px;"' +
            p2
          );
        });
        setSvg(scaledSvg);
      } catch (error) {
        console.error('Mermaid rendering failed:', error);
        setSvg('<div class="text-red-600">Failed to render diagram</div>');
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div className="my-8 w-full flex justify-center">
      <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-diagram w-full" />
    </div>
  );
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node && typeof node === 'object' && 'props' in node) {
      return extractText((node as any).props.children);
    }
    return '';
  };

  const copyToClipboard = async () => {
    try {
      const text = extractText(children);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-end border-b border-gray-200 px-2 py-1">
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center justify-center h-6 w-6 rounded text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className={`${className ?? ''} px-4 py-3.5 text-[12.5px] leading-[1.6] whitespace-pre`}>{children}</pre>
      </div>
    </div>
  );
}

function SearchHighlighter({
  proseRef,
  content,
}: {
  proseRef: React.RefObject<HTMLDivElement | null>;
  content: string;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams?.get('q');
    if (!q || !proseRef.current) return;
    const root = proseRef.current;

    let attempts = 0;
    const tryHighlight = () => {
      const target = findFirstTextMatch(root, q);
      if (!target) {
        if (attempts++ < 10) setTimeout(tryHighlight, 100);
        return;
      }
      const { node, idx } = target;
      const after = node.splitText(idx);
      after.splitText(q.length);
      const mark = document.createElement('mark');
      mark.className = 'bg-yellow-200 rounded px-0.5 transition-colors';
      mark.textContent = after.nodeValue;
      after.parentNode?.replaceChild(mark, after);
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        mark.classList.add('bg-transparent');
        mark.classList.remove('bg-yellow-200');
      }, 2500);
    };
    tryHighlight();
  }, [searchParams, content, proseRef]);

  return null;
}

export default function DocContent({ content }: DocContentProps) {
  const proseRef = useRef<HTMLDivElement>(null);

  // Check if content contains the swagger-ui directive
  const hasSwaggerUI = content.includes(':::swagger-ui');

  // If swagger-ui directive is present, extract the content without the directive
  // and render SwaggerUI component
  const processedContent = hasSwaggerUI ? content.replace(/:::swagger-ui\s*:::/g, '').trim() : content;

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      themeVariables: {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '20px',
        primaryTextColor: '#111827',
        primaryColor: '#e0e7ff',
        primaryBorderColor: '#6366f1',
        lineColor: '#6b7280',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        rankSpacing: 80,
        nodeSpacing: 80,
        padding: 20,
        diagramPadding: 8,
      },
    });
  }, []);

  useEffect(() => {
    // Handle initial load with hash
    if (window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.slice(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Add highlight effect
          element.classList.add('bg-yellow-100', 'transition-all', 'duration-300');
          setTimeout(() => {
            element.classList.remove('bg-yellow-100');
          }, 2000);
        }
      }, 100);
    }

    // Handle hash changes
    const handleHashChange = () => {
      const id = window.location.hash.slice(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Add highlight effect
        element.classList.add('bg-yellow-100', 'transition-all', 'duration-300');
        setTimeout(() => {
          element.classList.remove('bg-yellow-100');
        }, 2000);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Update URL
      window.history.pushState(null, '', `#${id}`);
      // Scroll to element
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
      // Show feedback (could add a toast here)
      element.classList.add('bg-yellow-100', 'transition-all', 'duration-300');
      setTimeout(() => {
        element.classList.remove('bg-yellow-100');
      }, 2000);
    }
  };

  return (
    <div
      ref={proseRef}
      className="prose max-w-none font-sans prose-code:font-mono prose-pre:font-mono text-[15px] leading-[1.72] text-gray-900"
    >
      <Suspense fallback={null}>
        <SearchHighlighter proseRef={proseRef} content={content} />
      </Suspense>
      {/* Render the markdown content */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeSlug]}
        components={{
          p: ({ node, ...props }) => <p {...props} className="text-gray-900 leading-[1.72] mb-4" />,
          h1: ({ node, children, ...props }) => {
            const id = props.id || '';
            return (
              <h1
                {...props}
                className="text-[28px] font-medium text-gray-900 mb-5 mt-10 tracking-[-0.018em] leading-[1.15] group relative transition-colors"
              >
                <a
                  href={`#${id}`}
                  className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleAnchorClick(e, id)}
                  title="Copy link to section"
                >
                  <LinkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </a>
                {children}
              </h1>
            );
          },
          h2: ({ node, children, ...props }) => {
            const id = props.id || '';
            return (
              <h2
                {...props}
                className="text-[20px] font-semibold text-gray-900 mb-3 mt-14 tracking-[-0.012em] group relative scroll-mt-20 transition-colors"
              >
                <a
                  href={`#${id}`}
                  className="absolute -left-8 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleAnchorClick(e, id)}
                  title="Copy link to section"
                >
                  <LinkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </a>
                {children}
              </h2>
            );
          },
          h3: ({ node, children, ...props }) => {
            const id = props.id || '';
            return (
              <h3
                {...props}
                className="text-[15.5px] font-semibold text-gray-900 mb-1.5 mt-8 tracking-[-0.005em] group relative scroll-mt-20 transition-colors"
              >
                <a
                  href={`#${id}`}
                  className="absolute -left-8 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleAnchorClick(e, id)}
                  title="Copy link to section"
                >
                  <LinkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </a>
                {children}
              </h3>
            );
          },
          h4: ({ node, children, ...props }) => {
            const id = props.id || '';
            return (
              <h4
                {...props}
                className="text-md font-bold text-gray-900 mb-2 mt-5 group relative scroll-mt-20 transition-colors"
              >
                <a
                  href={`#${id}`}
                  className="absolute -left-8 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleAnchorClick(e, id)}
                  title="Copy link to section"
                >
                  <LinkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </a>
                {children}
              </h4>
            );
          },
          h5: ({ node, children, ...props }) => {
            const id = props.id || '';
            return (
              <h5
                {...props}
                className="text-[15px] font-bold text-gray-900 mb-2 mt-5 group relative scroll-mt-20 transition-colors"
              >
                <a
                  href={`#${id}`}
                  className="absolute -left-8 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleAnchorClick(e, id)}
                  title="Copy link to section"
                >
                  <LinkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </a>
                {children}
              </h5>
            );
          },
          ul: ({ node, ...props }) => <ul {...props} className="list-disc list-outside mb-4 space-y-2 ml-6" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal list-outside mb-4 space-y-2 ml-6" />,
          li: ({ node, ...props }) => <li {...props} className="text-gray-700 leading-relaxed" />,
          a: ({ node, href, ...props }) => {
            // Check if it's an external link
            const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
            // Don't open localhost links in new tab (consistent behavior for SSR)
            const isLocalhost = href && (href.includes('localhost') || href.includes('127.0.0.1'));
            // Internal links (starting with /) or localhost links don't open in new tab
            const shouldOpenInNewTab = isExternal && !isLocalhost;

            return (
              <a
                {...props}
                href={href}
                className="text-blue-600 hover:underline"
                target={shouldOpenInNewTab ? '_blank' : undefined}
                rel={shouldOpenInNewTab ? 'noopener noreferrer' : undefined}
              />
            );
          },
          img: ({ node, ...props }) => <img {...props} className="shadow-md my-6 w-full max-w-2xl mx-auto" />,
          iframe: ({ node, ...props }) => (
            <div className="relative my-6 w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
              <iframe {...props} className="absolute top-0 left-0 w-full h-full" loading="lazy" />
            </div>
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote {...props} className="border-l-4 border-blue-500 pl-4 my-4 text-gray-600 italic" />
          ),
          pre: ({ node, children, ...props }) => {
            // Check if this is a mermaid code block
            if (children && typeof children === 'object' && 'props' in children) {
              const childProps = (children as any).props;
              if (childProps?.className?.includes('language-mermaid')) {
                const mermaidCode = extractText(childProps.children);
                return <Mermaid chart={mermaidCode} />;
              }
            }
            return <CodeBlock {...props}>{children}</CodeBlock>;

            function extractText(node: React.ReactNode): string {
              if (typeof node === 'string') return node;
              if (Array.isArray(node)) return node.map(extractText).join('');
              if (node && typeof node === 'object' && 'props' in node) {
                return extractText((node as any).props.children);
              }
              return '';
            }
          },
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            // Code inside a pre block (code fence)
            return match ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              // Inline code
              <code
                className="bg-gray-50 px-1.5 py-px rounded-[3px] border border-gray-200 text-[12.5px] font-mono break-all"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="my-6 w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table {...props} className="w-full divide-y divide-gray-200 table-fixed" />
            </div>
          ),
          thead: ({ node, ...props }) => <thead {...props} className="bg-gray-50" />,
          th: ({ node, ...props }) => (
            <th
              {...props}
              className="px-3.5 py-2.5 text-left text-[10.5px] font-medium text-gray-500 uppercase tracking-[0.08em] break-words"
            />
          ),
          td: ({ node, ...props }) => <td {...props} className="px-3.5 py-2.5 text-[13px] text-gray-900 break-words" />,
          // Custom components for callouts
          div: ({ node, className, children, ...props }) => {
            if (className?.includes('callout')) {
              const type = className.split('-')[1] || 'info';
              const leftBorder = {
                info: 'border-l-blue-600',
                warning: 'border-l-yellow-500',
                danger: 'border-l-red-500',
                success: 'border-l-green-500',
              };

              return (
                <div
                  className={`my-6 px-3.5 py-3 text-[13.5px] text-gray-900 border border-gray-200 border-l-2 rounded-[4px] bg-transparent ${
                    leftBorder[type as keyof typeof leftBorder] || leftBorder.info
                  }`}
                  {...props}
                >
                  {children}
                </div>
              );
            }

            return (
              <div className={className} {...props}>
                {children}
              </div>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>

      {/* Render SwaggerUI after markdown content if the directive is present */}
      {hasSwaggerUI && <SwaggerUI />}
    </div>
  );
}
