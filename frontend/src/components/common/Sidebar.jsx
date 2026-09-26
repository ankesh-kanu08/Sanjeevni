import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home,
  LayoutDashboard, 
  ClipboardList, 
  History, 
  ListTodo, 
  Bell, 
  Users, 
  FileOutput
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const getNavItems = () => {
    switch (user?.role) {
      case 'patient':
        return [
          { icon: Home, label: t('nav.dashboard'), path: '/patient/dashboard' },
          { icon: ClipboardList, label: t('nav.checkIn'), path: '/patient/check-in' },
          { icon: History, label: t('nav.history'), path: '/patient/history' }
        ];
      case 'worker':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/worker/dashboard' },
          { icon: ListTodo, label: t('nav.tasks'), path: '/worker/tasks' }
        ];
      case 'doctor':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/doctor/dashboard' },
          { icon: Bell, label: t('nav.alerts'), path: '/doctor/alerts' },
          { icon: Users, label: t('nav.patients'), path: '/doctor/patients' }
        ];
      case 'hospital_admin':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/hospital/dashboard' },
          { icon: Users, label: t('nav.patients'), path: '/hospital/patients' },
          { icon: FileOutput, label: t('nav.discharge'), path: '/hospital/discharge' }
        ];
      case 'system_admin':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/admin/dashboard' },
          { icon: Users, label: t('nav.users'), path: '/admin/users' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const sidebarClass = `fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out flex flex-col h-screen
    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClass}>
        {/* Brand Header with Sanjeevani Heart Pulse Logo */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" opacity="0.9"/>
                <path d="M7 12h2.5l1.5-3 2 6 1.5-3H17" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <span className="text-slate-900 font-extrabold text-lg tracking-tight block leading-tight">
                {t('common.appName') || 'Sanjeevani'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-normal block leading-tight mt-0.5">
                {t('common.appTagline') || 'Post-Discharge Care'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all text-sm ${
                  isActive 
                    ? 'bg-indigo-50/80 text-indigo-600 font-semibold shadow-2xs' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
