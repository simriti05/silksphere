import React from 'react'
import { useApp } from '../../context/AppContext'
import { LayoutDashboard, Package, Microscope, ShoppingBag, Wallet, Settings, LogOut, X, Leaf, BarChart2, Activity } from 'lucide-react'
import SilkLogo from '../ui/SilkLogo'

const FARMER_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'batches', label: 'My Batches', icon: Package },
  { id: 'diagnostics', label: 'AI Diagnostics', icon: Microscope },
  { id: 'lifecycle', label: 'Life Cycle', icon: Leaf },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const BUYER_NAV = [
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ page, setPage, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useApp()
  const nav = user?.role === 'farmer' ? FARMER_NAV : BUYER_NAV

  const go = (id) => { setPage(id); setSidebarOpen(false) }

  return (
    <>
      {sidebarOpen && <div className="sidebar-backdrop open" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <SilkLogo size={30} />
          <div className="logo-text">SilkSphere</div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: 'auto' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => go(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </div>
          ))}
          <div className="nav-item logout" onClick={logout}>
            <LogOut size={16} />
            <span>Logout</span>
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{(user?.name || 'U')[0].toUpperCase()}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
      </aside>
    </>
  )
}
