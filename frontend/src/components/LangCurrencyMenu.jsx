import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';
import { supportedLanguages, setLanguage } from '../lib/i18n';

/**
 * Combined language + currency switcher for the Navbar.
 */
const LangCurrencyMenu = () => {
  const { i18n } = useTranslation();
  const { code, setCode, currencies, current } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const activeLang = supportedLanguages.find(l => l.code === i18n.language) || supportedLanguages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-[#F5D0CE]/60 transition-colors text-[11px] uppercase tracking-[0.15em]"
        aria-label="Language and currency"
        data-testid="lang-currency-trigger"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden md:inline">{activeLang.code.toUpperCase()}</span>
        <span className="hidden md:inline text-neutral-400">·</span>
        <span>{current.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#EBD9CE] p-4 z-50 transition-all duration-200 origin-top-right ${open ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}
        data-testid="lang-currency-menu"
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">Language</div>
        <div className="grid grid-cols-2 gap-1 mb-4">
          {supportedLanguages.map(l => {
            const active = l.code === i18n.language;
            return (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false); }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-[#FDF3EB] text-[#B4593F]' : 'hover:bg-[#FDF3EB]'}`}
                data-testid={`lang-option-${l.code}`}
              >
                <span>{l.native}</span>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">Currency</div>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {currencies.map(c => {
            const active = c.code === code;
            return (
              <button
                key={c.code}
                onClick={() => { setCode(c.code); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-[#FDF3EB] text-[#B4593F]' : 'hover:bg-[#FDF3EB]'}`}
                data-testid={`currency-option-${c.code}`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold w-6 text-left">{c.symbol}</span>
                  <span className="text-neutral-700">{c.name}</span>
                </span>
                <span className="text-[11px] text-neutral-500">{c.code}{active && <Check className="w-3.5 h-3.5 inline ml-2" />}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-[#EBD9CE] text-[10px] text-neutral-500 leading-relaxed">
          Prices in {current.name} are converted from INR at today&apos;s rate. Payments are processed in INR.
        </div>
      </div>
    </div>
  );
};

export default LangCurrencyMenu;
