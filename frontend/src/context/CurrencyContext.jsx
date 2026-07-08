import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const CurrencyContext = createContext(null);

const STORAGE_KEY = 'wth_currency';

// Fallback used on first render before /api/currency/rates responds.
const FALLBACK = {
  base: 'INR',
  currencies: [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', rate: 1, decimals: 0 },
    { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', rate: 0.012, decimals: 2 },
    { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', rate: 0.011, decimals: 2 },
    { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', rate: 0.0095, decimals: 2 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', rate: 0.018, decimals: 2 },
    { code: 'AED', symbol: 'AED', name: 'UAE Dirham', locale: 'ar-AE', rate: 0.044, decimals: 2 },
  ],
};

export const CurrencyProvider = ({ children }) => {
  const [data, setData] = useState(FALLBACK);
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'INR'; } catch { return 'INR'; }
  });

  useEffect(() => {
    api.get('/currency/rates')
      .then(r => r.data && r.data.currencies?.length && setData(r.data))
      .catch(() => { /* keep fallback */ });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* noop */ }
  }, [code]);

  const current = useMemo(
    () => data.currencies.find(c => c.code === code) || data.currencies[0],
    [data, code],
  );

  const format = useCallback((amountInINR) => {
    if (amountInINR == null || Number.isNaN(Number(amountInINR))) return '';
    const c = current;
    const converted = Number(amountInINR) * c.rate;
    // Use Intl for pretty formatting; fall back manually if locale unsupported.
    try {
      return new Intl.NumberFormat(c.locale, {
        style: 'currency',
        currency: c.code,
        minimumFractionDigits: c.decimals,
        maximumFractionDigits: c.decimals,
      }).format(converted);
    } catch {
      return `${c.symbol}${converted.toFixed(c.decimals)}`;
    }
  }, [current]);

  const value = useMemo(() => ({
    code,
    setCode,
    current,
    currencies: data.currencies,
    format,
    base: data.base,
  }), [code, current, data, format]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
};
