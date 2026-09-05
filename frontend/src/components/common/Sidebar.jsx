import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, History, ListTodo, Bell, Users, FileOutput, Heart, LogOut } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  
  const getNavItems = () => {
    switch (user?.role) {
      case 'patient':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/patient/dashboard' },
          { icon: ClipboardList, label: 'Check-in', path: '/patient/check-in' },
          { icon: History, label: 'History', path: '/patient/history' }
        ];
      case 'worker':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/worker/dashboard' },
          { icon: ListTodo, label: 'Tasks', path: '/worker/tasks' }
        ];
      case 'doctor':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/doctor/dashboard' },
          { icon: Bell, label: 'Alerts', path: '/doctor/alerts' },
          { icon: Users, label: 'Patients', path: '/doctor/patients' }
        ];
      case 'hospital_admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/hospital/dashboard' },
          { icon: Users, label: 'Patients', path: '/hospital/patients' },
          { icon: FileOutput, label: 'Discharge', path: '/hospital/discharge' }
        ];
      case 'system_admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
          { icon: Users, label: 'Users', path: '/admin/users' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const sidebarClass = `fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col h-screen
    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={sidebarClass}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 md:hidden">
          <div className="flex items-center gap-2">
            <Heart className="text-teal-600" size={28} />
            <span className="text-teal-600 font-bold text-xl tracking-tight">
              CareWatch
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 truncate max-w-[120px]">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors focus:outline-none"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
