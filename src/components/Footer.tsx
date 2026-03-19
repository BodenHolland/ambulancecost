'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ambulance, Scale, HeartPulse, X, Send, CheckCircle2 } from 'lucide-react';

const Footer = () => {
  const pathname = usePathname();
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Only show contact form on privacy and terms pages
  const showContact = pathname === '/terms' || pathname === '/privacy';

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const body = formData.get('message') as string;
    
    // Obfuscated email assembly for scraper protection
    const user = 'Hello';
    const domain = 'openform.company';
    const finalBody = `From: ${name}\n\n${body}`;
    
    window.location.href = `mailto:${user}@${domain}?subject=${encodeURIComponent('Inquiry from AmbulanceCost')}&body=${encodeURIComponent(finalBody)}`;
    
    // Slight delay before closing modal to allow mailto to trigger
    setTimeout(() => {
      setIsContactOpen(false);
    }, 500);
  };

  return (
    <footer className="bg-slate-950 text-slate-400 pb-6 px-4 md:pb-8 pt-12 md:pt-20 mt-24 md:mt-32">
      <div className="max-w-7xl mx-auto">
        {/* Compact Brand Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-900 pb-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <Ambulance className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              Ambulance<span className="text-blue-500">Cost</span>
            </span>
          </Link>
        </div>

        {/* Dense, High-Utilization Disclaimer Section */}
        <div id="footer-disclaimers" className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left side: Heading */}
          <div className="lg:w-1/5">
            <h3 className="text-white font-bold text-base uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-500" /> Disclaimer
            </h3>
          </div>

          {/* Right side: Multi-column content */}
          <div className="lg:w-4/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-base leading-relaxed font-medium">
            <section className="space-y-1.5">
              <h4 className="text-slate-200 font-bold uppercase text-sm tracking-wider">Informational Only</h4>
              <p className="text-slate-400 text-base">
                Estimates based on public fee schedules and Medicare benchmarks. Not a guaranteed price or quote.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="text-slate-200 font-bold uppercase text-sm tracking-wider">No Advice</h4>
              <p className="text-slate-400 text-base">
                Values for educational use only. We do not provide legal, medical, or financial advice.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="text-slate-200 font-bold uppercase text-sm tracking-wider">Consult Professionals</h4>
              <p className="text-slate-400 text-base">
                Laws vary by jurisdiction. Consult an attorney or billing advocate for disputes.
              </p>
            </section>

            <div className="space-y-1.5 border-l-2 border-red-500/30 pl-4">
              <h4 className="text-red-400 font-bold uppercase text-sm tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4" /> Emergency Care
              </h4>
              <p className="text-red-300 text-base">
                Call 911 in an emergency. Never delay seeking care because of info on this site.
              </p>
            </div>
          </div>
        </div>

        {/* Minimal Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 opacity-80">
          
          {/* Left Side: Policies & Live Data */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-xs font-black uppercase tracking-widest text-slate-400">
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">Privacy Policy</Link>
            <div className="w-1 h-1 bg-slate-800 rounded-full" />
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
            
            {showContact && (
              <>
                <div className="w-1 h-1 bg-slate-800 rounded-full" />
                <button 
                  onClick={() => setIsContactOpen(true)} 
                  className="hover:text-slate-200 transition-colors tracking-widest uppercase font-black"
                >
                  Contact Us
                </button>
              </>
            )}

            <div className="w-1 h-1 bg-slate-800 rounded-full" />
          </div>
          
          {/* Right Side: Copyright */}
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 text-center md:text-right">
            © 2026 AmbulanceCost Project • v1.1.0-debug
          </div>
        </div>
      </div>

      {/* Secure Contact Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsContactOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-sans">
            <button 
              onClick={() => setIsContactOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-black text-slate-900 mb-2 whitespace-nowrap">Contact Us</h3>
              <p className="text-slate-600 text-sm">Send a direct message to our support team. Your default mail application will open securely.</p>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Your Name</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Jane Doe"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">Message</label>
                <textarea 
                  name="message"
                  required
                  rows={4}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="How can we help?"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <Send className="w-4 h-4" />
                Prepare Secure Message
              </button>
            </form>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
