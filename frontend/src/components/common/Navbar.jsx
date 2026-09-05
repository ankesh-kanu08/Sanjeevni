import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Bell, LogOut, Menu, Radio, Check, Trash2, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';
import { capitalize, formatRelativeTime } from '../../utils/formatters';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, connected } = useSocket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    setDropdownOpen(false);

    if (item.patientId) {
      if (user?.role === 'doctor') {
        navigate(`/doctor/patient/${item.patientId}`);
      } else if (user?.role === 'worker') {
        navigate(`/worker/patient/${item.patientId}`);
      } else if (user?.role === 'hospital_admin') {
        navigate(`/hospital/patient/${item.patientId}`);
      }
    } else if (user?.role === 'doctor') {
      navigate('/doctor/alerts');
    }
  };

  return (
    <nav className="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-20 relative">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden focus:outline-none"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Heart className="text-teal-600 fill-teal-600" size={26} />
          <span className="text-teal-600 font-bold text-xl tracking-tight hidden sm:block">
            Sanjeevni
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 hidden lg:inline-block border border-teal-200">
            Sanjeevni AI
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Live Socket Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Real-time Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Reconnecting
            </span>
          )}
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 text-slate-600 hover:text-teal-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Real-time Alerts</h3>
                  <p className="text-xs text-slate-500">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <Check size={14} /> Read all
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-slate-400 hover:text-red-600 p-1"
                      title="Clear all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    No active alerts right now
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${!item.read ? 'bg-teal-50/40' : ''}`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 ${item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {item.riskLevel === 'HIGH' ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.patientName}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      </div>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-teal-600 self-center" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && user?.role === 'doctor' && (
                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/doctor/alerts'); }}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    View All Doctor Alerts →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Badge and Logout */}
        <div className="flex items-center gap-4 border-l border-slate-200 pl-4 sm:pl-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full mt-0.5 font-medium">
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
