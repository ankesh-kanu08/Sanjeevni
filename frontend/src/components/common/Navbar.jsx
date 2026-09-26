import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Bell, LogOut, Menu, Radio, Check, Trash2, X, AlertTriangle, ShieldAlert, Globe } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';
import { useLanguage } from '../../context/LanguageContext';
import { capitalize, formatRelativeTime } from '../../utils/formatters';
import LanguageSelector from './LanguageSelector';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, availableLanguages, t } = useLanguage();
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
    <nav className="bg-white border-b border-slate-100 h-20 flex items-center justify-between px-6 sm:px-8 z-20 relative">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-50 md:hidden focus:outline-none"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-5 ml-auto">
        {/* Live Socket Status Indicator */}
        <div className="flex items-center">
          {connected ? (
            <span className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-3.5 py-1.5 rounded-full border border-emerald-100/90 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              {t('common.realtimeActive') || 'Real-time Active'}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50/80 px-3.5 py-1.5 rounded-full border border-amber-100/90 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {t('common.reconnecting') || 'Reconnecting'}
            </span>
          )}
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors focus:outline-none"
            title={t('common.notifications') || 'Notifications'}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{t('common.notifications') || 'Real-time Alerts'}</h3>
                  <p className="text-xs text-slate-500">
                    {unreadCount === 1 ? t('common.unreadAlerts', { count: 1 }) : t('common.unreadAlertsPlural', { count: unreadCount })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                      title={t('common.markAllRead')}
                    >
                      <Check size={14} /> {t('common.markAllRead')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-slate-400 hover:text-red-600 p-1"
                      title={t('common.clearAll')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    {t('common.noNotifications') || 'No active alerts right now'}
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${!item.read ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 ${item.riskLevel === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
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
                        <span className="w-2 h-2 rounded-full bg-indigo-600 self-center" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && user?.role === 'doctor' && (
                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/doctor/alerts'); }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {t('common.viewAllAlerts') || 'View All Doctor Alerts →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Multilingual Selector in Navbar */}
        <LanguageSelector compact={true} />

        {/* Dynamic User Profile Badge */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs select-none">
            {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {user?.name || t('common.patient')}
            </span>
            <span className="text-[11px] text-slate-400 font-medium leading-tight capitalize mt-0.5">
              {user?.role ? (t(`common.${user.role.replace('_admin', 'Admin')}`) || capitalize(user.role.replace('_', ' '))) : ''}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 ml-1 rounded-lg hover:bg-slate-50 focus:outline-none"
            title={t('common.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
