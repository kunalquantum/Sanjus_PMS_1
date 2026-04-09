import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ChevronRight,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Search,
  Settings,
  Sun,
  UserCircle2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';
import { useTheme } from '../../context/ThemeContext';
import SnehaAshaLogo from '../branding/SnehaAshaLogo';

const navigationLinks = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEACHER', 'STUDENT', 'FUNDER'] },
  { path: '/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
  { path: '/students', label: 'Student Monitoring', icon: GraduationCap, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEACHER', 'FUNDER'] },
  { path: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['PROJECT_MANAGER', 'TEACHER', 'STUDENT'] },
  { path: '/academics', label: 'Academics', icon: BookOpen, roles: ['PROJECT_MANAGER', 'TEACHER', 'STUDENT'] },
  { path: '/programs', label: 'Programs', icon: BarChart3, roles: ['ADMIN', 'FUNDER'] },
  { path: '/funds', label: 'Disbursement', icon: Wallet, roles: ['ADMIN', 'PROJECT_MANAGER'] },
  { path: '/expenses', label: 'My Expenses', icon: Receipt, roles: ['STUDENT'] },
  { path: '/expense-verification', label: 'Verification', icon: CheckSquare, roles: ['ADMIN', 'PROJECT_MANAGER'] },
  { path: '/alerts', label: 'Alerts & Risk', icon: AlertTriangle, roles: ['ADMIN', 'PROJECT_MANAGER', 'TEACHER'] },
  { path: '/reports', label: 'Reports', icon: History, roles: ['ADMIN', 'PROJECT_MANAGER', 'FUNDER'] },
  { path: '/audit-logs', label: 'Audit Logs', icon: History, roles: ['ADMIN'] },
  { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['STUDENT'] },
  { path: '/my-scholarship', label: 'Scholarship', icon: Wallet, roles: ['STUDENT'] },
  { path: '/students-impact', label: 'Impact', icon: BarChart3, roles: ['FUNDER'] },
  { path: '/fund-utilization', label: 'Utilization', icon: Wallet, roles: ['FUNDER'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
];

const upcomingFeaturePaths = new Set(['/users', '/programs', '/funds']);

const roleTone = {
  ADMIN: 'School Command Desk',
  PROJECT_MANAGER: 'Field Operations',
  TEACHER: 'Academic Operations',
  STUDENT: 'Student Workspace',
  FUNDER: 'Trust & Transparency',
};

const SidebarContent = ({ links, role, user, onNavigate, onLogout }) => (
  <>
    <div className="px-5 pt-5">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
        <SnehaAshaLogo compact className="justify-start" />
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-100/80">Sneha Asha PMS</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{roleTone[role]}</p>
      </div>
    </div>

    <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
      {links.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center justify-between rounded-[22px] px-4 py-3.5 transition ${
              isActive
                ? 'bg-white text-slate-950 shadow-soft'
                : 'text-slate-300 hover:bg-white/7 hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3">
                <link.icon className={`h-5 w-5 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="text-sm font-bold">{link.label}</span>
              </div>
              <ChevronRight className={`h-4 w-4 transition ${isActive ? 'text-brand-600' : 'text-slate-500 group-hover:text-slate-200'}`} />
            </>
          )}
        </NavLink>
      ))}
    </nav>

    <div className="border-t border-white/10 p-4">
      <div className="rounded-[24px] bg-white/5 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
            {initials(user?.name || '')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs uppercase tracking-[0.14em] text-slate-400">{role}</p>
          </div>
          <button onClick={onLogout} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </>
);

export const AppShell = ({ children }) => {
  const { user, role, logout, notifications, markNotificationRead, clearNotifications, addNotification } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const filteredLinks = useMemo(
    () => navigationLinks.filter((link) => link.roles.includes(role) && !upcomingFeaturePaths.has(link.path)),
    [role]
  );

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return ['Dashboard'];
    return parts.map((part) => part.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase()));
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGlobalSearch = () => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return;

    const match = filteredLinks.find((link) => {
      const label = link.label.toLowerCase();
      if (label.includes(query)) return true;

      if (query.includes('student') && link.path === '/students') return true;
      if ((query.includes('expense') || query.includes('proof')) && (link.path === '/expense-verification' || link.path === '/expenses')) return true;
      if ((query.includes('fund') || query.includes('disbursement')) && link.path === '/fund-utilization') return true;
      if ((query.includes('alert') || query.includes('risk') || query.includes('intervention')) && link.path === '/alerts') return true;
      if ((query.includes('report') || query.includes('export')) && link.path === '/reports') return true;
      if ((query.includes('program') || query.includes('scholarship')) && link.path === '/my-scholarship') return true;
      if ((query.includes('attendance')) && link.path === '/attendance') return true;
      if ((query.includes('academic') || query.includes('marks')) && link.path === '/academics') return true;
      return false;
    });

    if (match) {
      navigate(match.path);
      addNotification('Workspace search', `Navigated to ${match.label}.`, 'Info');
      setGlobalSearch('');
      return;
    }

    addNotification('Workspace search', `No matching workspace found for "${globalSearch}".`, 'Warning');
  };

  return (
    <div className="theme-grid h-screen overflow-hidden bg-app-grid bg-grid text-slate-900 dark:text-white">
      <div className="flex h-full overflow-hidden">
        <aside className="hidden w-[304px] flex-col border-r border-slate-200 bg-slate-950 lg:flex">
          <SidebarContent links={filteredLinks} role={role} user={user} onLogout={handleLogout} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-white/76 backdrop-blur-xl dark:border-white/10 dark:bg-[#181311]/82">
            <div className="flex flex-col gap-4 px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-white/80 bg-white/86 px-4 py-3 shadow-soft dark:border-white/10 dark:bg-white/5">
                  <Search className="h-4 w-4 text-slate-400 dark:text-white/45" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/35"
                    placeholder="Search students, disbursements, proofs, alerts, reports..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleGlobalSearch();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleGlobalSearch}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-soft transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Search
                </button>

                <button
                  onClick={toggleTheme}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-soft transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5 text-brand-400" /> : <Moon className="h-5 w-5 text-brand-600" />}
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-soft transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#181311]/95">
                        <div className="border-b border-slate-100 p-5 dark:border-white/10">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-950 dark:text-white">Notifications</p>
                            <button 
                              onClick={clearNotifications}
                              className="text-[11px] font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => {
                                  markNotificationRead(n.id);
                                  setNotifOpen(false);
                                  navigate('/notifications');
                                }}
                                className={`flex w-full flex-col gap-1 border-b border-slate-50 p-5 text-left transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${!n.read ? 'bg-brand-50/30 dark:bg-brand-500/10' : ''}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className={`truncate text-sm font-bold ${!n.read ? 'text-slate-950 dark:text-white' : 'text-slate-600 dark:text-white/75'}`}>{n.title}</p>
                                  {!n.read && <div className="h-2 w-2 rounded-full bg-brand-500" />}
                                </div>
                                <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-white/60">{n.description}</p>
                                <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-white/40">{n.time || 'Recently'}</p>
                              </button>
                            ))
                          ) : (
                            <div className="p-10 text-center">
                              <Bell className="mx-auto h-8 w-8 text-slate-200 dark:text-white/25" />
                              <p className="mt-3 text-sm font-medium text-slate-400 dark:text-white/45">All caught up!</p>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                          className="w-full bg-slate-50 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:bg-white/5 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          View all notifications
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="hidden items-center gap-3 rounded-[22px] border border-white/80 bg-white/90 px-4 py-2.5 shadow-soft dark:border-white/10 dark:bg-white/5 md:flex">
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/45">Sneha Asha</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{roleTone[role]}</p>
                  </div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-brand-500 dark:text-slate-950">
                    <UserCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {location.pathname !== '/' && (
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-white/40">{breadcrumbs.join(' / ')}</p>
                    <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.04em] text-slate-950 dark:text-white">{breadcrumbs[breadcrumbs.length - 1]}</h2>
                  </div>
                  <div className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700 shadow-soft dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                    {role.replace('_', ' ')}
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-8 lg:py-10">
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-3 duration-500">{children}</div>
          </main>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex w-[320px] flex-col bg-sidebar-glow shadow-panel">
            <div className="flex items-center justify-between px-5 pt-5">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-100/80">Sneha Asha</p>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/10 p-2 text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              links={filteredLinks}
              role={role}
              user={user}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}
    </div>
  );
};
