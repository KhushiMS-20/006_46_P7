import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Sun, 
  Moon, 
  UserCheck, 
  LogOut, 
  ShieldCheck, 
  Bell, 
  ChevronDown,
  Activity,
  Cpu
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout, switchRole, darkMode, toggleDarkMode } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Handler': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b transition-colors duration-200 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border-slate-800 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors md:hidden"
          title="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                NEXUS<span className="text-cyan-400">ATM</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                Enterprise Dispatcher
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Automated Error Logging & Deterministic Dispatch</p>
          </div>
        </Link>

        {/* Live operational status ticker */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-[11px]">DFA ENGINE: ACTIVE</span>
        </div>
      </div>

      {/* Right: Actions, Role Switcher, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role Switcher Pill (Great for Demo Presentation) */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-slate-400">Role:</span>
            <span className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold ${getRoleBadgeColor(user?.role)}`}>
              {user?.role || 'Guest'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-2 z-50 text-xs"
              onClick={() => setRoleDropdownOpen(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Demo Persona
              </div>
              <button
                onClick={() => switchRole('admin')}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${user?.role === 'Admin' ? 'text-cyan-400 font-medium' : 'text-slate-300'}`}
              >
                <div>
                  <div className="font-medium">Administrator</div>
                  <div className="text-[10px] text-slate-400">Lead Dispatcher</div>
                </div>
                {user?.role === 'Admin' && <span className="text-cyan-400">✓</span>}
              </button>
              <button
                onClick={() => switchRole('user')}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${user?.role === 'User' ? 'text-cyan-400 font-medium' : 'text-slate-300'}`}
              >
                <div>
                  <div className="font-medium">Branch User</div>
                  <div className="text-[10px] text-slate-400">David Miller (Branch Ops)</div>
                </div>
                {user?.role === 'User' && <span className="text-cyan-400">✓</span>}
              </button>
              <button
                onClick={() => switchRole('handler')}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${user?.role === 'Handler' ? 'text-cyan-400 font-medium' : 'text-slate-300'}`}
              >
                <div>
                  <div className="font-medium">Field Handler</div>
                  <div className="text-[10px] text-slate-400">John Davis (HND-01)</div>
                </div>
                {user?.role === 'Handler' && <span className="text-cyan-400">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Dark/Light Mode Switcher */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-cyan-300">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-medium text-slate-200 leading-tight">{user?.full_name || 'Guest User'}</div>
            <div className="text-[10px] text-slate-400 leading-tight">{user?.zone ? `${user.zone} Zone` : user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 ml-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
