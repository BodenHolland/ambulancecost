'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Home, HelpCircle, FileText, Info } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function NavigationPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { name: 'Calculator', href: '/', icon: Home },
    { name: 'Resources', href: '/resources', icon: HelpCircle },
    { name: 'No Surprises', href: '/no-surprises', icon: FileText },
    { name: 'About', href: '/about', icon: Info },
  ];

  return (
    <div className="absolute top-4 right-4 md:top-6 md:right-8 z-[110] flex items-center gap-6">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8 pr-4">
        {links.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${
                isActive 
                  ? 'text-blue-600 drop-shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Hamburger Menu (Mobile/Tablets) */}
      <div className="md:hidden">
        {/* Menu Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center transition-all z-[110] relative p-2 ${
            isOpen 
            ? 'text-white rotate-90' 
            : 'text-slate-400/60 hover:text-slate-600'
          }`}
          aria-label="Toggle Navigation"
        >
          {isOpen ? <X className="w-8 h-8 stroke-[2.5]" /> : <Menu className="w-8 h-8 stroke-[2.5]" />}
        </button>

        {/* Full Screen / Mobile Optimized Menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-12 right-0 mt-4 w-[calc(100vw-2rem)] bg-blue-700 rounded-[2.5rem] p-4 shadow-2xl z-[110] border border-blue-600 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 overflow-hidden text-white sm:max-w-sm">
              
              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-40"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500 rounded-full blur-[60px] opacity-30"></div>

              <nav className="relative z-10 flex flex-col gap-2">
                {links.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-4 px-6 py-5 rounded-3xl transition-all ${
                        isActive 
                          ? 'bg-white text-blue-700 shadow-lg scale-[1.02]'
                          : 'text-blue-50 hover:bg-blue-600/50 active:scale-95'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-blue-800/40 text-blue-200'}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black tracking-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
