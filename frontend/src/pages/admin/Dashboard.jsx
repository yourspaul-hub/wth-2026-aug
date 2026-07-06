import React, { useEffect, useState } from 'react';
import { adminStats } from '../../lib/api';
import { ShoppingCart, DollarSign, Package, Users, Tag, Star, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const KpiCard = ({ icon: Icon, label, value, sub, tint = 'text-[#B4593F]' }) => (
  <div className="bg-white rounded-xl p-6 border border-[#EBD9CE]">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-full bg-[#FDF3EB] flex items-center justify-center ${tint}`}><Icon className="w-5 h-5" /></div>
      {sub && <span className="text-[11px] text-neutral-500">{sub}</span>}
    </div>
    <div className="text-3xl font-serif-display text-[#1A1A1A]">{value}</div>
    <div className="text-xs uppercase tracking-[0.15em] text-neutral-500 mt-1">{label}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => { adminStats().then(setStats).catch(() => setStats({})); }, []);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif-display text-4xl">Dashboard</h1>
          <p className="text-sm text-neutral-600 mt-1">Overview of your storefront</p>
        </div>
      </div>

      {!stats ? (
        <div className="text-sm text-neutral-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Revenue (paid)" value={`₹${(stats.revenue || 0).toLocaleString('en-IN')}`} />
            <KpiCard icon={ShoppingCart} label="Total Orders" value={stats.total_orders || 0} sub={`${stats.pending_orders || 0} pending`} />
            <KpiCard icon={Package} label="Active Products" value={stats.products || 0} />
            <KpiCard icon={Users} label="Newsletter" value={stats.newsletter_subscribers || 0} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <KpiCard icon={Tag} label="Active Coupons" value={stats.active_coupons || 0} />
            <KpiCard icon={Star} label="Published Reviews" value={stats.published_reviews || 0} />
            <KpiCard icon={ShoppingCart} label="Paid Orders" value={stats.paid_orders || 0} />
          </div>

          <div className="mt-10 bg-white rounded-xl border border-[#EBD9CE] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBD9CE]">
              <h2 className="font-serif-display text-2xl">Recent Orders</h2>
              <Link to="/admin/orders" className="text-xs uppercase tracking-widest text-[#B4593F] inline-flex items-center gap-1">View All <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
            <div className="divide-y divide-[#EBD9CE]">
              {(stats.recent_orders || []).length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500">No orders yet</div>
              ) : stats.recent_orders.map(o => (
                <div key={o.order_number} className="px-6 py-4 flex items-center justify-between hover:bg-[#FDF3EB]/50">
                  <div>
                    <div className="font-medium text-sm">{o.order_number}</div>
                    <div className="text-xs text-neutral-500">{o.shipping_address?.full_name} · {new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full ${o.status === 'paid' ? 'bg-green-50 text-green-700' : o.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-neutral-100 text-neutral-600'}`}>{o.status}</span>
                    <div className="font-semibold">₹{o.total.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
