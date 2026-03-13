'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  HelpCircle, 
  AlertOctagon, 
  Plane, 
  Ambulance, 
  ExternalLink, 
  Scale, 
  FileText,
  Phone,
  Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function NoSurprisesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* Navigation removed in favor of global NavigationPopup */}

      {/* Hero Header */}
      <header className="pt-20 pb-16 px-6 bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            Federal Law Update • 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
            The No Surprises Act
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Understanding your protection against unexpected medical bills, and more importantly, <span className="text-blue-600 font-bold">where the law currently stops.</span>
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 -mt-10">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-12 bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100">
            
            {/* The Big Distinction Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <Scale className="w-8 h-8 text-blue-600" />
                Air vs. Ground: The Coverage Gap
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                The No Surprises Act was designed to prevent patients from receiving massive "balance bills" when they have no choice in their provider. However, in 2026, there is still a massive legislative divide.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-4">
                    <Plane className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-xl mb-1 text-emerald-900">Air Ambulances</h3>
                  <p className="text-sm font-bold text-emerald-600 uppercase mb-4 transition-all">Fully Protected (Federal)</p>
                  <p className="text-emerald-800/70 text-sm leading-relaxed">
                    Under federal law, you only pay your in-network deductible and co-pay. Providers are prohibited from billing you for the rest.
                  </p>
                </div>
                
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-4">
                    <Ambulance className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-xl mb-1 text-amber-900">Ground Ambulances</h3>
                  <p className="text-sm font-bold text-amber-600 uppercase mb-4">Patchwork Protection</p>
                  <p className="text-amber-800/70 text-sm leading-relaxed">
                    As of 2026, there is <strong className="text-amber-900">no federal protection</strong> for ground ambulances. Coverage depends entirely on your specific state's laws.
                  </p>
                </div>
              </div>
            </section>

            {/* Your Rights Section */}
            <section className="space-y-6 pt-8 border-t border-slate-100">
              <h2 className="text-3xl font-black">How to Exercise Your Rights</h2>
              <div className="space-y-4">
                {[
                  {
                    title: "Check for In-Network Status",
                    desc: "Even if your state isn't protected, your insurance may have a local contract. Always ask for 'In-Network' transport if the situation is not life-threatening."
                  },
                  {
                    title: "The 72-Hour Rule",
                    desc: "Hospitals must provide notice and obtain consent before you are moved by a non-emergency out-of-network provider."
                  },
                  {
                    title: "Challenge the 'Market Rate'",
                    desc: "If you receive a bill for 4x the Medicare rate (AmbulanceCost estimate), you have the right to request an independent dispute resolution (IDR)."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar / Ethical CTAs */}
          <div className="space-y-6">
            
            {/* CTA: Report a Bill */}
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <AlertOctagon className="w-32 h-32" />
              </div>
              <h3 className="text-2xl font-black mb-4 relative z-10">Received a Surprise Bill?</h3>
              <p className="text-slate-400 text-sm mb-8 relative z-10 leading-relaxed">
                If you believe you've been wrongly charged for an out-of-network ambulance ride, you can report it directly to the CMS Help Desk.
              </p>
              <div className="space-y-3 relative z-10">
                <a 
                  href="https://www.cms.gov/medical-bill-rights/help/submit-a-complaint" 
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold transition-all"
                >
                  <FileText className="w-5 h-5" />
                  Report a Violation
                </a>
                <a 
                  href="tel:18009853059" 
                  className="flex items-center justify-center gap-2 w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-bold transition-all text-slate-300"
                >
                  <Phone className="w-5 h-5" />
                  1-800-985-3059
                </a>
              </div>
            </div>

            {/* CTA: Check State Laws */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-lg flex flex-col items-center text-center">
              <HelpCircle className="w-10 h-10 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold mb-3">Is your state protected?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                22 states have filled the gap left by federal law. Check if your state legislators have enacted ground ambulance protections.
              </p>
              <Link 
                href="/"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
              >
                Use the Calculator to Check
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>



          </div>
        </div>
      </main>

    </div>
  );
}
