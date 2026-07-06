import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getSeoMeta } from '../lib/api';

const defaults = {
  title: 'Wear The Hope | Faith-based Gift Store',
  description: 'Motivational gift brand declaring the message of hope and love. Personalized Christian gifts, T-shirts, wallets, mugs and more.',
  keywords: 'biblical gifts, christian gifts, wear the hope, faith fashion, scripture wallet',
  og_image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200',
  robots: 'index,follow',
};

const SeoHelmet = ({ overrides = {} }) => {
  const { pathname } = useLocation();
  const [meta, setMeta] = useState(defaults);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await getSeoMeta(pathname);
        if (!cancel && data && data.title) setMeta({ ...defaults, ...data });
        else if (!cancel) setMeta(defaults);
      } catch {
        if (!cancel) setMeta(defaults);
      }
    })();
    return () => { cancel = true; };
  }, [pathname]);

  const m = { ...meta, ...overrides };
  const url = typeof window !== 'undefined' ? window.location.origin + pathname : '';
  return (
    <Helmet>
      <title>{m.title}</title>
      <meta name="description" content={m.description} />
      {m.keywords && <meta name="keywords" content={m.keywords} />}
      <meta name="robots" content={m.robots || 'index,follow'} />
      <link rel="canonical" href={m.canonical || url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={m.title} />
      <meta property="og:description" content={m.description} />
      <meta property="og:url" content={url} />
      {m.og_image && <meta property="og:image" content={m.og_image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={m.title} />
      <meta name="twitter:description" content={m.description} />
      {m.og_image && <meta name="twitter:image" content={m.og_image} />}
    </Helmet>
  );
};

export default SeoHelmet;
