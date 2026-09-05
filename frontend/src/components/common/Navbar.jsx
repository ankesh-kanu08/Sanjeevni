import React from 'react';
import { Heart, Bell, LogOut, Menu } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';
import { capitalize } from '../../utils/formatters';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { notifications } = useSocket();

  const unreadCount = notifications.length;

  return (
    <nav className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden focus:outline-none"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Heart className="text-teal-600" size={28} />
          <span className="text-teal-600 font-bold text-xl tracking-tight hidden sm:block">
            CareWatch
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-slate-500 hover:text-teal-600 transition-colors focus:outline-none">
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full mt-0.5">
              {user?.role ? capitalize(user.role.replace('_', ' ')) : ''}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50 focus:outline-none"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
