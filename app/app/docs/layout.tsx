import Footer from '@components/Footer';
import Header from '@components/Header';

import DocsSidebar from './components/DocsSidebar';
import { getDocsByCategory } from './utils';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const categories = getDocsByCategory();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

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
