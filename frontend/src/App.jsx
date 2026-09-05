import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from './components/common/MainLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard'
import PatientCheckIn from './pages/patient/PatientCheckIn'
import PatientHistory from './pages/patient/PatientHistory'

// Worker pages
import WorkerDashboard from './pages/worker/WorkerDashboard'
import WorkerTasks from './pages/worker/WorkerTasks'
import WorkerPatientDetail from './pages/worker/WorkerPatientDetail'
import WorkerVisitForm from './pages/worker/WorkerVisitForm'

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorAlerts from './pages/doctor/DoctorAlerts'
import DoctorPatientDetail from './pages/doctor/DoctorPatientDetail'
import DoctorPatients from './pages/doctor/DoctorPatients'

// Hospital pages
import HospitalDashboard from './pages/hospital/HospitalDashboard'
import HospitalPatients from './pages/hospital/HospitalPatients'
import HospitalDischarge from './pages/hospital/HospitalDischarge'
import HospitalPatientDetail from './pages/hospital/HospitalPatientDetail'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'

import { useAuth } from './hooks/useAuth'

function App() {
  const { isAuthenticated, user } = useAuth()
  
  const getDefaultRoute = () => {
    if (!user) return '/login'
    const routes = {
      patient: '/patient/dashboard',
      worker: '/worker/dashboard',
      doctor: '/doctor/dashboard',
      hospital_admin: '/hospital/dashboard',
      system_admin: '/admin/dashboard'
    }
    return routes[user.role] || '/login'
  }
  
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        
        {/* Patient Routes */}
        <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
          <Route element={<MainLayout />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/check-in" element={<PatientCheckIn />} />
            <Route path="/patient/history" element={<PatientHistory />} />
            <Route path="/patient/*" element={<Navigate to="/patient/dashboard" replace />} />
          </Route>
        </Route>
        
        {/* Worker Routes */}
        <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
          <Route element={<MainLayout />}>
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/tasks" element={<WorkerTasks />} />
            <Route path="/worker/patient/:id" element={<WorkerPatientDetail />} />
            <Route path="/worker/visit/:id" element={<WorkerVisitForm />} />
            <Route path="/worker/*" element={<Navigate to="/worker/dashboard" replace />} />
          </Route>
        </Route>
        
        {/* Doctor Routes */}
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route element={<MainLayout />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/alerts" element={<DoctorAlerts />} />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
            <Route path="/doctor/patient/:id" element={<DoctorPatientDetail />} />
            <Route path="/doctor/*" element={<Navigate to="/doctor/dashboard" replace />} />
          </Route>
        </Route>
        
        {/* Hospital Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hospital_admin']} />}>
          <Route element={<MainLayout />}>
            <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
            <Route path="/hospital/patients" element={<HospitalPatients />} />
            <Route path="/hospital/discharge" element={<HospitalDischarge />} />
            <Route path="/hospital/patient/:id" element={<HospitalPatientDetail />} />
            <Route path="/hospital/*" element={<Navigate to="/hospital/dashboard" replace />} />
          </Route>
        </Route>
        
        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['system_admin']} />}>
          <Route element={<MainLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </>
  )
}

export default App
