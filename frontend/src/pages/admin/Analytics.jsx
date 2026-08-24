import React, { useEffect, useState } from 'react';
import { adminAnalyticsSummary } from '../../lib/api';
import { TrendingUp, Eye, ShoppingCart, IndianRupee, Percent, Info, Users, Clock, LogIn, LogOut, Monitor, MousePointerClick } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid, Area, AreaChart } from 'recharts';

const RANGES = [7, 14, 30, 90];
const COLORS = ['#B4593F', '#213a60', '#8B5A2B', '#E88864', '#EBD9CE', '#5C3A22'];

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
          <p className="text-sm text-neutral-600 mt-1">Sales · traffic · behaviour · past {days} days</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r} onClick={() => setDays(r)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full ${days === r ? 'bg-[#213a60] text-white' : 'bg-white border border-[#EBD9CE] hover:border-[#B4593F]'}`} data-testid={`analytics-range-${r}`}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6 text-sm flex items-start gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          Traffic + source data is <strong>MOCKED</strong> (GA <code>{data.pixel_ga_id}</code> · FB Pixel <code>{data.pixel_fb_id}</code>) until enough real page-views are captured. Order + revenue data is <strong>real</strong> from your database. Connect GA4 &amp; Meta Pixel IDs in <code>Admin → Integrations</code> for full production ingestion.
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <Kpi icon={Eye} label="Page views" value={t.page_views.toLocaleString('en-IN')} accent="#213a60" />
        <Kpi icon={Users} label="Sessions" value={(t.sessions || 0).toLocaleString('en-IN')} accent="#8B5A2B" />
        <Kpi icon={MousePointerClick} label="Pages / session" value={(t.avg_pages_per_session || 0)} accent="#5C3A22" />
        <Kpi icon={Percent} label="Bounce rate" value={`${t.bounce_rate || 0}%`} accent="#E88864" />
        <Kpi icon={ShoppingCart} label="Orders" value={t.orders.toLocaleString('en-IN')} accent="#B4593F" />
        <Kpi icon={IndianRupee} label="Revenue" value={`₹${t.revenue.toLocaleString('en-IN')}`} accent="#8B5A2B" />
        <Kpi icon={Percent} label="Conversion" value={`${t.conversion_percent}%`} accent="#213a60" />
        <Kpi icon={TrendingUp} label="Avg. order" value={`₹${t.aov.toLocaleString('en-IN')}`} accent="#B4593F" />
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
              <Line yAxisId="left" type="monotone" dataKey="page_views" stroke="#213a60" strokeWidth={2} dot={false} name="Page views" />
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
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#213a60' }} width={120} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} formatter={(v, k) => k === 'revenue' ? [`₹${v.toLocaleString('en-IN')}`, 'Revenue'] : [v, 'Units']} />
                <Bar dataKey="units" fill="#B4593F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Page behaviour */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <PageList
          title="Most visited pages"
          rows={data.top_pages}
          icon={Eye}
          accent="#213a60"
          testid="analytics-top-pages"
          empty="No page views yet."
        />
        <PageList
          title="Entry pages"
          subtitle="Where visitors landed first"
          rows={data.entry_pages}
          icon={LogIn}
          accent="#B4593F"
          testid="analytics-entry-pages"
          empty="No sessions tracked yet."
        />
        <PageList
          title="Exit pages"
          subtitle="Last page before leaving"
          rows={data.exit_pages}
          icon={LogOut}
          accent="#8B5A2B"
          testid="analytics-exit-pages"
          empty="No sessions tracked yet."
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Device breakdown */}
        <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6" data-testid="analytics-device-breakdown">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-display text-2xl">Device split</h3>
            <Monitor className="w-4 h-4 text-neutral-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.device_breakdown} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                {data.device_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {data.device_breakdown.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1">{s.label}</span>
                <span className="text-neutral-500">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hour of day */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBD9CE] p-6" data-testid="analytics-hourly">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-display text-2xl">Hour of day</h3>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourly_distribution} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBD9CE" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8a8a8a' }} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, 'Views']} />
              <Bar dataKey="value" fill="#213a60" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekday distribution */}
      <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6" data-testid="analytics-weekday">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-display text-2xl">Day of week</h3>
          <span className="text-xs text-neutral-500">Best days to run drops or ads</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.weekday_distribution} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBD9CE" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8a8a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8a8a8a' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'white', border: '1px solid #EBD9CE', borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, 'Views']} />
            <Bar dataKey="value" fill="#B4593F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, accent }) => (
  <div className="bg-white rounded-2xl border border-[#EBD9CE] p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <div className="font-serif-display text-2xl" style={{ color: accent }}>{value}</div>
  </div>
);

const PageList = ({ title, subtitle, rows, icon: Icon, accent, testid, empty }) => {
  const max = Math.max(1, ...(rows || []).map(r => r.value));
  return (
    <div className="bg-white rounded-2xl border border-[#EBD9CE] p-6" data-testid={testid}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-serif-display text-2xl">{title}</h3>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      {subtitle && <p className="text-xs text-neutral-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-neutral-500 py-8 text-center">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.label + i} className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="truncate pr-3 font-mono text-[11px] text-[#213a60]">{r.label}</span>
                <span className="text-neutral-500 tabular-nums">{r.value.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#FDF3EB]">
                <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: accent }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminAnalytics;
