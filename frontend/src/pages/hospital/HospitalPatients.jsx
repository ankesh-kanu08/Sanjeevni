import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import RiskBadge from '../../components/common/RiskBadge';
import hospitalService from '../../services/hospitalService';

export default function HospitalPatients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await hospitalService.getPatients();
        setPatients(data || [
          { id: 1, name: 'John Doe', age: 65, gender: 'Male', diagnosis: 'COPD Exacerbation', dischargeDate: '2023-10-25', riskLevel: 'HIGH', status: 'monitoring', followUp: '2023-11-01' },
          { id: 2, name: 'Jane Smith', age: 72, gender: 'Female', diagnosis: 'Heart Failure', dischargeDate: '2023-10-24', riskLevel: 'MEDIUM', status: 'monitoring', followUp: '2023-10-31' },
          { id: 3, name: 'Robert Johnson', age: 58, gender: 'Male', diagnosis: 'Pneumonia', dischargeDate: '2023-10-23', riskLevel: 'LOW', status: 'completed', followUp: '2023-11-05' },
          { id: 4, name: 'Emily Davis', age: 45, gender: 'Female', diagnosis: 'Asthma', dischargeDate: '2023-10-20', riskLevel: 'LOW', status: 'active', followUp: '2023-11-10' },
        ]);
      } catch (err) {
        console.error('Failed to fetch patients', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || p.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Patient Directory</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or diagnosis..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="completed">Completed</option>
          </select>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">All Risks</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Patient Info</th>
                <th className="px-6 py-4 font-medium">Diagnosis</th>
                <th className="px-6 py-4 font-medium">Discharge Date</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Follow-up</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">Loading patients...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No patients found.</td></tr>
              ) : (
                filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.age} yrs • {patient.gender}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{patient.diagnosis}</td>
                    <td className="px-6 py-4 text-gray-600">{patient.dischargeDate}</td>
                    <td className="px-6 py-4"><RiskBadge riskLevel={patient.riskLevel} /></td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full uppercase">{patient.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{patient.followUp}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/hospital/patient/${patient.id}`)}
                        className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 p-2 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Eye size={18} className="mr-1" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
