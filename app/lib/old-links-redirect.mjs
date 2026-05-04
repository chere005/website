/**
 * ───────────────────────────────────────────────────────────────────────────
 *  AI ASSISTANT INSTRUCTIONS — READ BEFORE RENAMING OR DELETING ROUTES
 * ───────────────────────────────────────────────────────────────────────────
 *
 *  Permanent (301) redirects for URLs that no longer exist or were renamed.
 *  Imported by `next.config.mjs` and returned from `redirects()`.
 *
 *  WHEN to add an entry here:
 *    - You renamed, moved, or deleted a public route (page, doc, blog post,
 *      catalog slug, marketing URL, etc.) that may have inbound links or be
 *      indexed by search engines.
 *    - You fixed a typo in a route segment that was already shipped.
 *    - You consolidated two routes into one.
 *    - The Search Console 404 report flags a stale URL with an obvious
 *      modern equivalent.
 *
 *  WHEN NOT to add an entry:
 *    - The old URL never shipped publicly (no inbound links, never indexed).
 *      Just delete the route.
 *    - There is no clean modern equivalent — let it 404 so Google drops it.
 *      A redirect to an unrelated page is worse than a 404.
 *    - The 404 originates from junk paths scraped out of third-party
 *      content (e.g. relative paths inside MCP server READMEs that Google
 *      parsed as URLs). Adding redirects for these pollutes the table
 *      without SEO benefit.
 *
 *  HOW to add an entry:
 *    1. Append `{ source, destination, permanent: true }` to the array.
 *       `source` is the OLD path. `destination` is the CURRENT path.
 *       Use `permanent: true` (308 in Next, treated as 301 by Google) for
 *       renames. Use `permanent: false` (307) only for genuinely temporary
 *       moves.
 *    2. Group entries by reason with a short comment header.
 *    3. Do NOT chain redirects — point old URLs directly at the final
 *       destination, even if that means updating an older entry.
 *    4. Verify locally:
 *         curl -sI http://localhost:3001<source>
 *       Expected: HTTP 308 with `location: <destination>`.
 *
 *  Anything beyond simple path renames (regex sources, host-based rules,
 *  conditional redirects) belongs in `next.config.mjs` directly.
 * ───────────────────────────────────────────────────────────────────────────
 */

/** @type {import('next').NextConfig['redirects'] extends () => Promise<infer R> ? R : never} */
export const oldLinksRedirects = [
  // Typos in shipped platform docs URLs.
  {
    source: '/docs/platfrom-quickstart',
    destination: '/docs/platform-quickstart',
    permanent: true,
  },
  {
    source: '/docs/platfrom-developer-quickstart',
    destination: '/docs/platform-developer-quickstart',
    permanent: true,
  },

  // Stale inbound links surfaced via Search Console 404 report.
  {
    source: '/docs/developer-quickstart',
    destination: '/docs/platform-developer-quickstart',
    permanent: true,
  },
  {
    source: '/platform-knowledge-connectors',
    destination: '/docs/platform-knowledge-connectors',
    permanent: true,
  },
  {
    source: '/docs/platform-single-sign-on',
    destination: '/docs/platform-identity-providers',
    permanent: true,
  },
];
