import type { Metadata } from 'next';

import constants from '@constants';

import DocPage, { generateMetadata as generateDocMetadata } from './[slug]/page';
import DeveloperNotice from './components/DeveloperNotice';
import { getAllDocs } from './utils';

function getDefaultSlug(): string | undefined {
  const docs = getAllDocs();
  if (docs.length === 0) return undefined;
  return docs.find((doc) => doc.slug === 'platform-quickstart')?.slug ?? docs[0].slug;
}

export async function generateMetadata(): Promise<Metadata> {
  const slug = getDefaultSlug();
  if (!slug) {
    return {
      title: `Documentation | ${constants.company.name}`,
    };
  }
  return generateDocMetadata({ params: Promise.resolve({ slug }) });
}

export default function DocsIndexPage() {
  const slug = getDefaultSlug();

  if (!slug) {
    if (process.env.NODE_ENV === 'development') {
      return <DeveloperNotice />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Documentation Available</h1>
          <p className="text-gray-600">Please check back later.</p>
        </div>
      </div>
    );
  }

  return <DocPage params={Promise.resolve({ slug })} />;
}
