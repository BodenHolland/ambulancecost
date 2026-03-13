import React from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronLeft } from 'lucide-react';
import { faqs } from '@/lib/faqData';
import { notFound } from 'next/navigation';
import TakeAction from '@/components/TakeAction';
import { Metadata } from 'next';

export function generateStaticParams() {
  return faqs.map((faq) => ({
    slug: faq.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const faq = faqs.find((f) => f.slug === resolvedParams.slug);
  
  if (!faq) {
    return {
      title: 'FAQ Not Found - AmbulanceCost',
    };
  }

  return {
    title: `${faq.q} | AmbulanceCost Nationwide Data`,
    description: faq.a.substring(0, 160) + '...',
  };
}

export default async function FAQDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const faq = faqs.find((f) => f.slug === resolvedParams.slug);

  if (!faq) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* Navigation removed in favor of global NavigationPopup */}

      <main className="max-w-5xl mx-auto px-6 pt-16 md:pt-20 min-h-[50vh]">
        <Link 
          href="/resources" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm tracking-wide transition-colors mb-10 group uppercase"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Resources
        </Link>
        
        <div className="mb-12 border-b border-slate-200 pb-12">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1]">
            {faq.q}
          </h1>
        </div>
        
        <article className="prose prose-lg prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-900">
          {faq.content || <p>{faq.a}</p>}
        </article>

        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-sm md:text-base text-slate-500 italic font-medium">
            This article was last updated on {faq.updatedAt || 'March 12, 2026'}.
          </div>
          
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <p className="text-xs font-bold text-blue-900/60 uppercase tracking-tight">
              Estimates only. Not legal or medical advice. 
              <Link href="/terms" className="ml-2 text-blue-600 underline hover:text-blue-800 transition-colors">Terms of Service</Link>
            </p>
          </div>
        </div>
      </main>

      <div className="max-w-5xl mx-auto px-6 mt-16">
        <TakeAction />
      </div>
    </div>
  );
}
