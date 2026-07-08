import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Tag, Star, Search, Send, ArrowUpRight, LogOut, ExternalLink, Layers, Truck, Percent, Mail, Clock, MapPin, FileText, Instagram, BarChart3, Users as UsersIcon, Puzzle, FolderOpen, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['admin', 'store_manager', 'blogger'] },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, roles: ['admin'] },
  { to: '/admin/products', label: 'Products', icon: Package, roles: ['admin', 'store_manager'] },
  { to: '/admin/categories', label: 'Categories', icon: FolderOpen, roles: ['admin', 'store_manager'] },
  { to: '/admin/collections', label: 'Collections', icon: Layers, roles: ['admin', 'store_manager'] },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag, roles: ['admin'] },
  { to: '/admin/shipping', label: 'Shipping', icon: Truck, roles: ['admin', 'store_manager'] },
  { to: '/admin/tax', label: 'Tax', icon: Percent, roles: ['admin', 'store_manager'] },
  { to: '/admin/reviews', label: 'Reviews', icon: Star, roles: ['admin'] },
  { to: '/admin/blog', label: 'Blog', icon: FileText, roles: ['admin', 'blogger'] },
  { to: '/admin/instagram', label: 'Instagram', icon: Instagram, roles: ['admin'] },
  { to: '/admin/seo', label: 'SEO', icon: Search, roles: ['admin'] },
  { to: '/admin/redirects', label: 'Redirects', icon: ArrowUpRight, roles: ['admin'] },
  { to: '/admin/newsletter', label: 'Newsletter', icon: Send, roles: ['admin'] },
  { to: '/admin/emails', label: 'Emails', icon: Mail, roles: ['admin'] },
  { to: '/admin/abandoned-carts', label: 'Abandoned Carts', icon: Clock, roles: ['admin'] },
  { to: '/admin/locations', label: 'Locations', icon: MapPin, roles: ['admin'] },
  { to: '/admin/users', label: 'Team & Access', icon: UsersIcon, roles: ['admin'] },
  { to: '/admin/integrations', label: 'Integrations', icon: Puzzle, roles: ['admin'] },
  { to: '/admin/design', label: 'Design', icon: Palette, roles: ['admin'] },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const nav_ = useNavigate();
  const doLogout = async () => { await logout(); nav_('/admin/login', { replace: true }); };

  return (
    <div className="min-h-screen bg-[#FDF3EB] flex">
      <aside className="w-64 shrink-0 bg-[#1A1A1A] text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/" aria-label="Wear The Hope home">
            <Logo variant="light" className="h-7" />
          </Link>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#E88864] mt-2">Admin</div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {NAV.filter(n => !n.roles || n.roles.includes(user?.role || 'admin')).map(n => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#B4593F] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon className="w-4 h-4" /> {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors px-2 py-2">
            <ExternalLink className="w-3.5 h-3.5" /> Visit Storefront
          </a>
          <div className="flex items-center gap-3 mt-3 px-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#B4593F] flex items-center justify-center text-xs">{(user?.name || 'A')[0]}</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.name}</div>
              <div className="text-[10px] text-white/50 truncate">{user?.email}</div>
              {user?.role && <div className="text-[9px] uppercase tracking-widest text-[#E88864] mt-0.5">{user.role.replace('_', ' ')}</div>}
            </div>
            <button onClick={doLogout} className="p-2 rounded-full hover:bg-white/10" title="Logout"><LogOut className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <div className="max-w-[1300px] mx-auto px-8 py-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
