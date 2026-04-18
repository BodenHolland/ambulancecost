'use client';

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, Loader2, ExternalLink } from 'lucide-react';
import { faqs, FAQ } from '@/lib/faqData';
import TakeAction from './TakeAction';
import Link from 'next/link';

interface Props {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResourceOverlay({ slug, isOpen, onClose }: Props) {
  const [faq, setFaq] = useState<FAQ | null>(null);

  useEffect(() => {
    if (isOpen && slug) {
      const found = faqs.find(f => f.slug === slug);
      setFaq(found || null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, slug]);

  if (!isOpen || !faq) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      <div className="relative bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 flex justify-end items-center">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <div className="mb-10 pb-10 border-b border-slate-100">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                {faq.q}
              </h1>
              <div className="mt-6 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource</span>
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <span className="text-xs text-slate-500 font-medium italic">Updated {faq.updatedAt || 'March 12, 2026'}</span>
              </div>
            </div>

            <article className="prose prose-slate max-w-none 
              prose-headings:font-black prose-headings:text-slate-900 
              prose-p:text-slate-600 prose-p:leading-relaxed 
              prose-li:text-slate-600 prose-strong:text-slate-900
              prose-a:text-blue-600 prose-a:font-bold hover:prose-a:text-blue-800
              prose-img:rounded-3xl prose-img:shadow-xl">
              {faq.content || <p>{faq.a}</p>}
            </article>



            <div className="mt-12 mb-8 bg-blue-50/50 border border-blue-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold text-blue-900/60 uppercase tracking-tight">
                  Estimates only. Not legal or medical advice.
                </p>
              </div>
              <Link 
                href="/terms" 
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 underline transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
