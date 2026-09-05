import os

base_dir = r"d:\Hackathon\Sanjeevni\frontend\src"

files = {
    "utils/constants.js": """
export const ROLES = {
  PATIENT: 'patient',
  WORKER: 'worker',
  DOCTOR: 'doctor',
  HOSPITAL_ADMIN: 'hospital_admin',
  SYSTEM_ADMIN: 'system_admin'
};
export const RISK_LEVELS = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' };
""",
    "context/AuthContext.jsx": """
import React, { createContext, useState } from 'react';
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
""",
    "hooks/useAuth.js": """
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
export const useAuth = () => useContext(AuthContext);
""",
    "services/api.js": """
import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
export default api;
""",
    "components/common/ProtectedRoute.jsx": """
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
export default function ProtectedRoute({ children, role }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (role && user?.role !== role) return <div>Access Denied</div>;
  return children;
}
""",
    "pages/LoginPage.jsx": """
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleLogin = (e) => {
    e.preventDefault();
    login({ name: 'Test User', role: 'doctor' });
    navigate('/doctor/dashboard');
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold text-teal-600 mb-6">Sanjeevni Login</h1>
        <form onSubmit={handleLogin}>
          <input className="w-full border p-2 mb-4" placeholder="Email" required />
          <input className="w-full border p-2 mb-4" type="password" placeholder="Password" required />
          <button className="w-full bg-teal-600 text-white p-2 rounded" type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
""",
    "pages/doctor/DoctorDashboard.jsx": """
import React from 'react';
export default function DoctorDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-teal-600">Doctor Dashboard</h1>
      <p>Welcome to the Doctor Dashboard.</p>
    </div>
  );
}
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\\n")
