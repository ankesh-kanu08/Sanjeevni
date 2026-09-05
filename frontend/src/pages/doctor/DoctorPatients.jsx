import { useEffect, useMemo, useState } from 'react';
import { Activity, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import toast from 'react-hot-toast';

const riskClasses = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-emerald-100 text-emerald-700' };

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => { doctorService.getPatients().then(setPatients).catch(() => toast.error('Unable to load assigned patients.')).finally(() => setLoading(false)); }, []);
  const visiblePatients = useMemo(() => patients.filter((patient) => `${patient.name || ''} ${patient.diagnosis || ''}`.toLowerCase().includes(query.toLowerCase())), [patients, query]);
  if (loading) return <div className="flex justify-center items-center h-64"><Activity className="animate-spin text-teal-600" size={32} /></div>;
  return <div className="max-w-6xl mx-auto space-y-6 pb-10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-800">Assigned Patients</h1><p className="text-slate-600">Review monitoring status and longitudinal information.</p></div><div className="relative"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg" placeholder="Search patients" /></div></div>
    {visiblePatients.length ? <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-4">Patient</th><th className="p-4">Diagnosis</th><th className="p-4">Risk</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{visiblePatients.map((patient) => <tr key={patient._id} className="border-t border-slate-100"><td className="p-4 font-medium">{patient.name}<span className="ml-2 text-sm text-slate-500">{patient.age != null ? `${patient.age}y` : ''}</span></td><td className="p-4 text-slate-600">{patient.diagnosis || 'Not recorded'}</td><td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${riskClasses[patient.riskLevel] || riskClasses.LOW}`}>{patient.riskLevel}</span></td><td className="p-4 text-right"><button onClick={() => navigate(`/doctor/patient/${patient._id}`)} className="text-teal-700 font-medium hover:underline">View patient</button></td></tr>)}</tbody></table></div> : <div className="bg-white border border-slate-200 rounded-xl py-14 text-center text-slate-500"><Users className="mx-auto mb-3 text-slate-300" size={42} />No assigned patients found.</div>}
  </div>;
}
