import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Shield, LayoutDashboard, Key, LogOut, Activity, Menu, Lock, ChevronRight } from 'lucide-react';

const NO_SIDEBAR_PAGES = ['Home'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const showSidebar = !NO_SIDEBAR_PAGES.includes(currentPageName) && !!user;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'Dashboard' },
    { icon: Activity, label: 'Security Logs', page: 'SecurityLogs' },
    ...(user?.role === 'admin' ? [{ icon: Key, label: 'Manage Keys', page: 'AdminKeys' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#070712] text-gray-100 flex">
      <style>{`
        body { background: #070712; margin: 0; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0a0a18; }
        ::-webkit-scrollbar-thumb { background: #1e1e3e; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a2a50; }
        .vh-grid-bg {
          background-image: linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      {showSidebar && (
        <aside
          className={`${sidebarOpen ? 'w-56' : 'w-14'} transition-all duration-200 bg-[#09091a] border-r border-[#1a1a3e] flex flex-col flex-shrink-0 min-h-screen`}
        >
          {/* Logo */}
          <div className="h-14 px-4 border-b border-[#1a1a3e] flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="font-bold text-sm text-white leading-none">Vander Hub</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">VSG v4.2</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 space-y-0.5 pt-3">
            {navItems.map(item => {
              const active = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                  {sidebarOpen && active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                </Link>
              );
            })}
          </nav>

          {/* User / logout */}
          <div className="p-2 border-t border-[#1a1a3e]">
            {sidebarOpen && user && (
              <div className="px-3 py-2 mb-1">
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
                {user.plan_type && (
                  <div className="text-[10px] text-cyan-400 mt-0.5 capitalize">{user.plan_type} plan</div>
                )}
              </div>
            )}
            <button
              onClick={() => base44.auth.logout()}
              title={!sidebarOpen ? 'Logout' : undefined}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && 'Logout'}
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        {showSidebar && (
          <div className="h-14 border-b border-[#1a1a3e] bg-[#09091a]/90 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-10">
            <button onClick={() => setSidebarOpen(v => !v)} className="text-gray-500 hover:text-gray-300 transition-colors">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <Lock className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-medium">VSG Active</span>
            </div>
            <span className="text-xs text-gray-700">·</span>
            <span className="text-xs text-gray-500">{currentPageName}</span>
          </div>
        )}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}