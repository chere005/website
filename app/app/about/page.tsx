import { Metadata } from 'next';
import Image from 'next/image';

import { LinkedInIcon } from '@components/BrandIcons';
import Footer from '@components/Footer';
import Header from '@components/Header';
import { Card, CardContent } from '@components/ui/card';
import constants from '@constants';

import EmailCodePanel from './EmailCodePanel';

const {
  website: { urls: websiteUrls, keywords: websiteKeywords },
  company: {
    name: companyName,
    alternateName: companyAlternateName,
    description: companyDescription,
    people: {
      joey: JOEY,
      matvey: MATVEY,
      ildar: ILDAR,
      innokentii: INNOKENTII,
      alexander: ALEXANDER,
      arseny: ARSENY,
      margaret: MARGARET,
    },
  },
} = constants;

const TITLE = 'About Us | Team & Mission';
const DESCRIPTION = 'Meet the team building the enterprise-grade MCP platform for AI agents.';
const ARSENY_BOOK_TITLE = 'Machine Learning System Design';
const ARSENY_BOOK_URL = 'https://arseny.info/ml_design_book';

function ArsenyDescription() {
  const bookTitleIndex = ARSENY.description.indexOf(ARSENY_BOOK_TITLE);

  if (bookTitleIndex === -1) {
    return <>{ARSENY.description}</>;
  }

  const beforeBookTitle = ARSENY.description.slice(0, bookTitleIndex);
  const afterBookTitle = ARSENY.description.slice(bookTitleIndex + ARSENY_BOOK_TITLE.length);

  return (
    <>
      {beforeBookTitle}
      <a
        href={ARSENY_BOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
      >
        {ARSENY_BOOK_TITLE}
      </a>
      {afterBookTitle}
    </>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: companyDescription,
  keywords: [`${companyName} team`, `about ${companyName}`, ...websiteKeywords],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: websiteUrls.about,
    type: 'website',
    images: [
      {
        url: websiteUrls.teamPhotoAbsoluteUrl,
        width: 1200,
        height: 630,
        alt: `${companyAlternateName} founding team`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [websiteUrls.teamPhotoAbsoluteUrl],
  },
  alternates: {
    canonical: websiteUrls.about,
  },
};

export default function AboutPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': constants.website.structuredData,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Header />

      <main className="flex-1 relative bg-[#fafafa] overflow-hidden">
        {/* Grid Background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)',
          }}
        />

        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          {/* Team Section */}
          <div className="max-w-5xl mx-auto mb-16">
            {/* Team Photo */}
            <div className="mb-12">
              <div className="w-full max-w-4xl mx-auto rounded-xl shadow-lg overflow-hidden">
                <Image
                  src={websiteUrls.teamPhotoRelativeUrl}
                  alt={`${constants.company.alternateName} founding team - Joey, Ildar, and Matvey`}
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                  priority
                  quality={85}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAKAA8DASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0Hj8m0TlsRb5NElgtYXDAfH2oA0R9R7r/9k="
                />
              </div>
            </div>

            {/* Team Member Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Joey */}
              <Card className="border-2 hover:border-yellow-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <h3 className="font-bold text-xl mb-2">{JOEY.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{JOEY.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {JOEY.address.addressLocality}, {JOEY.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">{JOEY.description}</p>
                  <EmailCodePanel email="joey@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={JOEY.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Matvey */}
              <Card className="border-2 hover:border-green-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <h3 className="font-bold text-xl mb-2">{MATVEY.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{MATVEY.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {MATVEY.address.addressLocality}, {MATVEY.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    Third-time founder, engineer and passionate advocate for Open Source who relocated from Israel to
                    London to build this company, previously founding and leading Amixr as CEO (acquired by Grafana
                    Labs) and co-founding KeepHQ (acquired by Elastic).
                  </p>
                  <EmailCodePanel email="matvey@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={MATVEY.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Ildar */}
              <Card className="border-2 hover:border-blue-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <h3 className="font-bold text-xl mb-2">{ILDAR.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{ILDAR.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {ILDAR.address.addressLocality}, {ILDAR.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    Second-time founder who relocated from Singapore to the UK to build this company, bringing
                    experience as Ex-Principal at Grafana Labs and Ex-CTO at Amixr (acquired by Grafana Labs), and is a
                    devoted coffee enthusiast.
                  </p>
                  <EmailCodePanel email="ildar@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={ILDAR.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Innokentii */}
              <Card className="border-2 hover:border-orange-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <div className="flex justify-center mb-4">
                    <Image
                      src="/team/innokentii.jpeg"
                      alt={INNOKENTII.name}
                      width={150}
                      height={150}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{INNOKENTII.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{INNOKENTII.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {INNOKENTII.address.addressLocality}, {INNOKENTII.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">{INNOKENTII.description}</p>
                  <EmailCodePanel email="ikonstantinov@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={INNOKENTII.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Alexander */}
              <Card className="border-2 hover:border-purple-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <div className="flex justify-center mb-4">
                    <Image
                      src="/team/alexander.jpeg"
                      alt={ALEXANDER.name}
                      width={150}
                      height={150}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{ALEXANDER.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{ALEXANDER.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {ALEXANDER.address.addressLocality}, {ALEXANDER.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">{ALEXANDER.description}</p>
                  <EmailCodePanel email="abalashov@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={ALEXANDER.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* arseny */}
              <Card className="border-2 hover:border-cyan-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <div className="flex justify-center mb-4">
                    <Image
                      src="/team/arseny.jpg"
                      alt={ARSENY.name}
                      width={150}
                      height={150}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{ARSENY.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{ARSENY.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {ARSENY.address.addressLocality}, {ARSENY.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    <ArsenyDescription />
                  </p>
                  <EmailCodePanel email="arseny@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={ARSENY.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* margaret */}
              <Card className="border-2 hover:border-pink-200 transition-colors">
                <CardContent className="p-6 text-left">
                  <div className="flex justify-center mb-4">
                    <Image
                      src="/team/margaret.jpg"
                      alt={MARGARET.name}
                      width={150}
                      height={150}
                      className="rounded-full object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-xl mb-2">{MARGARET.name}</h3>
                  <p className="text-gray-700 font-medium mb-1">{MARGARET.jobTitle}</p>
                  <p className="text-gray-500 text-sm mb-3">
                    {MARGARET.address.addressLocality}, {MARGARET.address.addressCountry}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">{MARGARET.description}</p>
                  <EmailCodePanel email="margaret@archestra.ai" />
                  <div className="flex justify-center gap-3 mt-3">
                    <a
                      href={MARGARET.sameAs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <LinkedInIcon size={20} />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Backed By Section */}
          <div className="max-w-6xl mx-auto mb-16">
            {/* All Investors Grid */}
            <div className="space-y-8">
              {/* VCs Section */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center mb-6">
                  Venture Capital Partners
                </p>
                <div className="space-y-8">
                  {/* Lead Seed - 20VC */}
                  <div className="flex justify-center">
                    <a
                      href="https://20vc.fund/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-16 py-10 flex flex-col items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0 relative overflow-hidden"
                      style={{ backgroundColor: '#000000' }}
                    >
                      <div
                        className="absolute top-6 -left-10 bg-white text-black text-sm font-bold px-10 py-1 transform -rotate-45 shadow-sm"
                        style={{ lineHeight: '1' }}
                      >
                        Leading Seed
                      </div>
                      <Image src="/logo_20vc.svg" alt="20VC" width={200} height={67} className="h-auto" />
                    </a>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Lead Pre-Seed - Concept Ventures */}
                    <a
                      href="https://www.conceptventures.vc/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg w-44 h-44 flex flex-col items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0 relative overflow-hidden"
                      style={{ backgroundColor: '#2069f7' }}
                    >
                      <div
                        className="absolute top-5 -left-9 bg-white text-black text-xs font-bold px-8 py-1 transform -rotate-45 shadow-sm"
                        style={{ lineHeight: '1' }}
                      >
                        Leading Pre-Seed
                      </div>
                      <Image
                        src="/logo_concept.svg"
                        alt="Concept Ventures"
                        width={110}
                        height={37}
                        className="h-auto"
                      />
                      <p className="text-white text-center mt-3 text-sm font-medium">Concept Ventures</p>
                    </a>

                    <a
                      href="https://zeroprime.vc/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg w-44 h-44 flex flex-col items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
                      style={{ backgroundColor: 'rgb(14, 30, 40)' }}
                    >
                      <Image
                        src="/logo_zero_prime.jpeg"
                        alt="Zero Prime Ventures"
                        width={110}
                        height={37}
                        className="h-auto"
                      />
                      <p className="text-white text-center mt-3 text-sm font-medium">Zero Prime Ventures</p>
                    </a>

                    <a
                      href="https://www.celeroventures.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-lg w-44 h-44 border border-gray-200 hover:border-gray-400 transition-colors flex flex-col items-center justify-center flex-shrink-0"
                    >
                      <Image src="/logo_celero.png" alt="Celero Ventures" width={110} height={37} className="h-auto" />
                      <p className="text-gray-700 text-center mt-3 text-sm font-medium">Celero Ventures</p>
                    </a>
                  </div>
                </div>
              </div>

              {/* Angel Investors */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center mb-4">
                  Angels and Followers
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <a
                    href="https://www.linkedin.com/in/willwuuu/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">20 Product</p>
                        <p className="text-sm text-gray-600">
                          By Will Wu, CPO at Match Group, former VP Product at Snap
                        </p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/berriche/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Alexandre Berriche</p>
                        <p className="text-sm text-gray-600">Founder, Fleet</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.aloniq.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Aloniq</p>
                        <p className="text-sm text-gray-600">By Mark Shmulevich, Founder & Managing Partner</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/dedutta/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Debo Dutta</p>
                        <p className="text-sm text-gray-600">Chief AI Officer, Nutanix</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/kellydeclan/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Declan Kelly</p>
                        <p className="text-sm text-gray-600">Founder & GP, Foreword</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/gerhardeschelbeck/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Gerhard Eschelbeck</p>
                        <p className="text-sm text-gray-600">Former CISO, Google</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://insiders.vc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Insiders</p>
                        <p className="text-sm text-gray-600">Cofounders of ESL FACEIT Group</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/kieranjflanagan/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Kieran Flanagan</p>
                        <p className="text-sm text-gray-600">CMO, HubSpot</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/kvinogradov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Konstantin Vinogradov</p>
                        <p className="text-sm text-gray-600">GP, Runa Capital</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/luke-harries/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Luke Harries</p>
                        <p className="text-sm text-gray-600">Elevenlabs</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/mgoldberger/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Mark Goldberg</p>
                        <p className="text-sm text-gray-600">VP Sales, Metaview</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/hausermax/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Max Hauser</p>
                        <p className="text-sm text-gray-600">Managing Director & Partner, BCG</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/maxim/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Maxim Konovalov</p>
                        <p className="text-sm text-gray-600">Co-founder, Nginx</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/olivierpomel/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Olivier Pomel</p>
                        <p className="text-sm text-gray-600">CEO & Co-founder, Datadog</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://rtp.vc/team/galina-chifina/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">RTP Global</p>
                        <p className="text-sm text-gray-600">By Galina Chifina, CEO & Partner</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/stephenwhitworth/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Stephen Whitworth</p>
                        <p className="text-sm text-gray-600">CEO, incident.io</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://www.tenacity-cap.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tenacity Capital</p>
                        <p className="text-sm text-gray-600">By AJ Tennant, former VP Sales at Slack and Glean</p>
                      </div>
                    </div>
                  </a>
                  <a
                    href="https://visibleventures.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Visible Ventures</p>
                        <p className="text-sm text-gray-600">
                          With Carolyn Everson, Senior Advisor at Permira, and Board Member at Coca-Cola and Disney
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Media Coverage Section */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-center mb-6">
                  Media Coverage
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <a
                    href="https://siliconangle.com/2025/08/14/archestra-raises-3-3m-secure-enterprise-use-ai-agents-mcp-servers/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">SiliconANGLE</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archestra raises $3.3M to secure enterprise use of AI agents
                    </p>
                  </a>

                  <a
                    href="https://siliconcanals.com/archestra-ai-secures-e2-8m/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Silicon Canals</p>
                    <p className="text-sm text-gray-600 mt-1">Archestra AI secures €2.8M</p>
                  </a>

                  <a
                    href="https://www.uktech.news/ai/archestra-raises-2-5m-to-protect-corporate-data-from-ai-agents-20250813"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">UKTN</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archestra raises £2.5m to protect corporate data from AI agents
                    </p>
                  </a>

                  <a
                    href="https://techfundingnews.com/archestra-london-startup-3-3m-autonomous-agents-guardrails/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Tech Funding News</p>
                    <p className="text-sm text-gray-600 mt-1">
                      London startup raises $3.3m for autonomous agents guardrails
                    </p>
                  </a>

                  <a
                    href="https://www.eu-startups.com/2025/08/london-based-archestra-raises-e2-8-million-to-stop-ai-agents-going-rogue/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">EU-Startups</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archestra raises €2.8 million to stop AI agents going rogue
                    </p>
                  </a>

                  <a
                    href="https://www.uktechnews.info/2025/08/14/archestra-secures-2-5-million-pre-seed-investment-led-by-concept-ventures/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">UK Tech News</p>
                    <p className="text-sm text-gray-600 mt-1">Archestra secures £2.5 million pre-seed investment</p>
                  </a>

                  <a
                    href="https://www.techinasia.com/news/londonbased-archestra-raises-33m-enhance-ai-data-security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Tech in Asia</p>
                    <p className="text-sm text-gray-600 mt-1">
                      London-based Archestra raises $3.3m to enhance AI data security
                    </p>
                  </a>

                  <a
                    href="https://startuprise.co.uk/london-based-archestra-secures-e2-8-million-in-pre-seed-round/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">StartupRise</p>
                    <p className="text-sm text-gray-600 mt-1">Archestra secures €2.8 million in pre-seed round</p>
                  </a>

                  <a
                    href="https://tech.eu/2025/08/14/archestra-raises-3-3m-to-build-guardrails-for-enterprise-ai-agents/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Tech.eu</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archestra raises $3.3m to build guardrails for enterprise AI agents
                    </p>
                  </a>

                  <a
                    href="https://itbrief.co.uk/story/archestra-ai-raises-3-3m-to-secure-enterprise-ai-agents"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">IT Brief UK</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archestra AI raises $3.3m to secure enterprise AI agents
                    </p>
                  </a>

                  <a
                    href="https://businesscloud.co.uk/news/trio-who-moved-to-uk-to-launch-ai-startup-raise-2-4m/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">BusinessCloud</p>
                    <p className="text-sm text-gray-600 mt-1">Trio who moved to UK to launch AI startup raise £2.4m</p>
                  </a>

                  <a
                    href="https://startupnewswire.com/archestra-raises-2-8m-ai-agent-security/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Startup News Wire</p>
                    <p className="text-sm text-gray-600 mt-1">Archestra raises €2.8m for AI agent security</p>
                  </a>

                  <a
                    href="https://securitybrief.co.uk/story/archestra-ai-raises-3-3m-to-secure-enterprise-ai-agents"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">SecurityBrief UK</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Archestra AI raises $3.3m to secure enterprise AI agents
                    </p>
                  </a>

                  <a
                    href="https://theaiinsider.tech/2025/08/20/archestra-raises-3-3m-to-secure-ai-agent-deployments-with-enterprise-ready-mcp-platform/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <p className="font-medium text-gray-900">The AI Insider</p>
                    <p className="text-sm text-gray-600 mt-1">Archestra raises $3.3m to secure AI agent deployments</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
