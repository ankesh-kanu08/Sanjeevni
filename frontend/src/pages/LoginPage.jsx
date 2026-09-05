import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      toast.success('Login successful!');
      switch (user?.role) {
        case 'patient': navigate('/patient/dashboard'); break;
        case 'worker': navigate('/worker/dashboard'); break;
        case 'doctor': navigate('/doctor/dashboard'); break;
        case 'hospital_admin': navigate('/hospital/dashboard'); break;
        case 'system_admin': navigate('/admin/dashboard'); break;
        default: navigate('/patient/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-20">
        <div className="flex flex-col items-center justify-center text-teal-600">
          <Heart size={64} className="fill-current text-teal-600" />
          <h2 className="mt-4 text-center text-4xl font-extrabold text-gray-900">
            Sanjeevni
          </h2>
          <p className="mt-2 text-center text-gray-600">Post-discharge monitoring platform</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  name="password" type="password" required
                  value={formData.password} onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/register" className="font-medium text-teal-600 hover:text-teal-500">
              Don't have an account? Register
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Demo Credentials</h3>
              <div className="space-y-2 text-sm">
                <button type="button" onClick={() => handleDemoClick('patient@Sanjeevni.com', 'patient123')} className="block w-full text-left px-3 py-2 hover:bg-gray-200 rounded">
                  <span className="font-medium">Patient:</span> patient@Sanjeevni.com
                </button>
                <button type="button" onClick={() => handleDemoClick('worker@Sanjeevni.com', 'worker123')} className="block w-full text-left px-3 py-2 hover:bg-gray-200 rounded">
                  <span className="font-medium">Worker:</span> worker@Sanjeevni.com
                </button>
                <button type="button" onClick={() => handleDemoClick('doctor@Sanjeevni.com', 'doctor123')} className="block w-full text-left px-3 py-2 hover:bg-gray-200 rounded">
                  <span className="font-medium">Doctor:</span> doctor@Sanjeevni.com
                </button>
                <button type="button" onClick={() => handleDemoClick('hospital@Sanjeevni.com', 'hospital123')} className="block w-full text-left px-3 py-2 hover:bg-gray-200 rounded">
                  <span className="font-medium">Hospital:</span> hospital@Sanjeevni.com
                </button>
                <button type="button" onClick={() => handleDemoClick('admin@Sanjeevni.com', 'admin123')} className="block w-full text-left px-3 py-2 hover:bg-gray-200 rounded">
                  <span className="font-medium">Admin:</span> admin@Sanjeevni.com
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}