'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, HelpCircle, MessageSquare, ShieldCheck, Search, X } from 'lucide-react';
import TakeAction from '@/components/TakeAction';
import { faqs } from '@/lib/faqData';

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => {
    setVisibleCount(15);
  }, [searchQuery]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase().trim();
    return faqs.filter(faq => 
      faq.q.toLowerCase().includes(query) || 
      faq.a.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const displayedFaqs = filteredFaqs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFaqs.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Navigation removed in favor of global NavigationPopup */}

      <main className="max-w-4xl mx-auto px-6 pt-20">
        <div className="mb-12">
          <h1 className="text-5xl font-black mb-4 tracking-tight text-slate-900">Resources</h1>
          <p className="text-slate-500 text-xl font-medium max-w-2xl">
            Straightforward answers about ambulance billing, your federal rights, and how to defend yourself against surprise medical debt.
          </p>
        </div>
          
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative group mb-12">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none z-10">
            <Search className={`w-5 h-5 transition-colors ${searchQuery ? 'text-blue-600' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
          </div>
          <input
            type="text"
            placeholder="Search for questions, terms, or policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-[2rem] py-4 pl-14 pr-12 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-400 shadow-sm relative"
          />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-4 flex items-center p-2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

        <div className="space-y-6">
          {filteredFaqs.length > 0 ? (
            <>
              {displayedFaqs.map((faq, i) => (
                <Link key={i} href={`/resources/${faq.slug}`} className="block animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${(i % 15) * 50}ms` }}>
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex gap-6">
                      <div className="flex-1">
                        <h3 className="text-xl md:text-2xl font-black mb-3 text-slate-900 leading-tight group-hover:text-blue-600 transition-colors pr-8">
                          {faq.q}
                        </h3>
                        <p className="text-slate-600 leading-relaxed line-clamp-2 text-base md:text-lg">
                          {faq.a}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                        <ChevronLeft className="w-8 h-8 rotate-180" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {hasMore && (
                <div className="flex justify-center pt-8 pb-4">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 15)}
                    className="group flex items-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 font-bold py-4 px-8 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    Load More Articles
                    <div className="bg-slate-100 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-500 p-1.5 rounded-full transition-colors">
                      <ChevronLeft className="w-5 h-5 -rotate-90 group-hover:translate-y-0.5 transition-transform" />
                    </div>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No matching questions found</h3>
              <p className="text-slate-500">Try adjusting your search terms or browse all categories below.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-blue-600 font-bold hover:underline"
              >
                Clear search and view all
              </button>
            </div>
          )}
        </div>

        <TakeAction />

        {/* Support CTA */}
        <section className="mt-20 grid md:grid-cols-2 gap-8">
          <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-600/20 group hover:scale-[1.02] transition-transform">
            <ShieldCheck className="w-12 h-12 mb-6 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Legal Resources</h2>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Need help understanding state-specific laws? Visit the CMS portal for the most up-to-date guidance on the No Surprises Act.
            </p>
            <a 
              href="https://www.cms.gov/nosurprises"
              target="_blank"
              className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-xs bg-white text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Visit CMS.gov <ChevronLeft className="w-4 h-4 rotate-180" />
            </a>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] group hover:scale-[1.02] transition-transform">
            <MessageSquare className="w-12 h-12 mb-6 text-blue-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">Contact CMS</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              For direct assistance with medical bills and reporting potential violations to federal law.
            </p>
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-blue-400">
               <span className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl">1-800-985-3059</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
