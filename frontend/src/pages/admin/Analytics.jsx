import React, { useEffect, useState } from 'react';
import { adminAnalyticsSummary } from '../../lib/api';
import { TrendingUp, Eye, ShoppingCart, IndianRupee, Percent, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid, Area, AreaChart } from 'recharts';

const RANGES = [7, 14, 30, 90];
const COLORS = ['#B4593F', '#1A1A1A', '#8B5A2B', '#E88864', '#EBD9CE'];

const AdminAnalytics = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminAnalyticsSummary(days).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [days]);

  if (loading || !data) return <div className="py-20 text-center text-neutral-500">Loading analytics…</div>;

  const t = data.totals;

  return (
    <div data-testid="analytics-dashboard">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif-display text-4xl">Analytics</h1>
          <p className="text-sm text-neutral-600 mt-1">Sales · traffic · conversions · past {days} days</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r} onClick={() => setDays(r)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full ${days === r ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'}`}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6 text-sm flex items-start gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          Traffic + source data is <strong>MOCKED</strong> (GA <code>{data.pixel_ga_id}</code> · FB Pixel <code>{data.pixel_fb_id}</code>). Order + revenue data is <strong>real</strong> from your database. Connect GA4 & Meta Pixel IDs in <code>.env</code> and swap the mocked baseline for live event ingestion.
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Kpi icon={Eye} label="Page views" value={t.page_views.toLocaleString('en-IN')} accent="#1A1A1A" />
        <Kpi icon={ShoppingCart} label="Orders" value={t.orders.toLocaleString('en-IN')} accent="#B4593F" />
        <Kpi icon={IndianRupee} label="Revenue" value={`₹${t.revenue.toLocaleString('en-IN')}`} accent="#8B5A2B" />
        <Kpi icon={Percent} label="Conversion" value={`${t.conversion_percent}%`} accent="#E88864" />
        <Kpi icon={TrendingUp} label="Avg. order" value={`₹${t.aov.toLocaleString('en-IN')}`} accent="#5C3A22" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBD9CE] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-display text-2xl">Revenue trend</h3>
            <span className="text-xs text-neutral-500">Paid orders only</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B4593F" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#B4593F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBD9CE" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8a' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#B4593F" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic sources */}
        <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6">
          <h3 className="font-serif-display text-2xl mb-4">Traffic sources</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.traffic_sources} dataKey="value" nameKey="source" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                {data.traffic_sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {data.traffic_sources.map((s, i) => (
              <div key={s.source} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1">{s.source}</span>
                <span className="text-neutral-500">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Views vs Orders */}
        <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6">
          <h3 className="font-serif-display text-2xl mb-4">Views vs Orders</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBD9CE" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8a' }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8a8a8a' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8a8a8a' }} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="page_views" stroke="#1A1A1A" strokeWidth={2} dot={false} name="Page views" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#B4593F" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6">
          <h3 className="font-serif-display text-2xl mb-4">Top products</h3>
          {data.top_products.length === 0 ? (
            <div className="text-sm text-neutral-500 py-8 text-center">No paid orders yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.top_products} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBD9CE" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8a8a8a' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#1A1A1A' }} width={120} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} formatter={(v, k) => k === 'revenue' ? [`₹${v.toLocaleString('en-IN')}`, 'Revenue'] : [v, 'Units']} />
                <Bar dataKey="units" fill="#B4593F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white rounded-2xl border border-[#EBD9CE] p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="font-serif-display text-3xl" style={{ color: accent }}>{value}</div>
  </div>
);

export default AdminAnalytics;
