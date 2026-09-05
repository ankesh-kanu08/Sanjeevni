import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Activity, User, Stethoscope } from 'lucide-react';
import RiskBadge from '../../components/common/RiskBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import patientService from '../../services/patientService';
import { formatDate } from '../../utils/formatters';

export default function HospitalPatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientRes, baselineRes] = await Promise.allSettled([
          patientService.getPatient(id),
          patientService.getBaseline(id)
        ]);
        if (patientRes.status === 'fulfilled') setPatient(patientRes.value.data?.data || patientRes.value.data);
        if (baselineRes.status === 'fulfilled') setBaseline(baselineRes.value.data?.data || baselineRes.value.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading patient details..." />;
  if (!patient) return <div className="text-center py-12 text-slate-500">Patient not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hospital/patients" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Patient Details</h1>
      </div>

      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{patient.user?.name || patient.name || 'Unknown'}</h2>
                <p className="text-slate-500">
                  {patient.demographics?.age || ''} yrs • {patient.demographics?.gender || ''} • {patient.demographics?.location || ''}
                </p>
              </div>
            </div>
          </div>
          <RiskBadge level={patient.currentRiskLevel || 'LOW'} size="lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-2 text-slate-600">
            <Stethoscope className="w-4 h-4" />
            <span className="text-sm">Diagnosis: <strong>{patient.diagnosis || 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Discharged: <strong>{patient.dischargeDate ? formatDate(patient.dischargeDate) : 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Follow-up: <strong>{patient.followUpDate ? formatDate(patient.followUpDate) : 'N/A'}</strong></span>
          </div>
        </div>
      </div>

      {baseline && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Discharge Baseline
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {baseline.vitals?.spo2 && (
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">SpO2</p>
                <p className="text-xl font-bold text-slate-900">{baseline.vitals.spo2}%</p>
              </div>
            )}
            {baseline.vitals?.heartRate && (
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Heart Rate</p>
                <p className="text-xl font-bold text-slate-900">{baseline.vitals.heartRate} bpm</p>
              </div>
            )}
            {baseline.vitals?.temperature && (
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Temperature</p>
                <p className="text-xl font-bold text-slate-900">{baseline.vitals.temperature}°F</p>
              </div>
            )}
            {baseline.vitals?.bloodPressure && (
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Blood Pressure</p>
                <p className="text-xl font-bold text-slate-900">{baseline.vitals.bloodPressure.systolic}/{baseline.vitals.bloodPressure.diastolic}</p>
              </div>
            )}
            {baseline.vitals?.respiratoryRate && (
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Resp Rate</p>
                <p className="text-xl font-bold text-slate-900">{baseline.vitals.respiratoryRate}/min</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Monitoring Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              patient.monitoringActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {patient.monitoringActive ? 'Active Monitoring' : 'Monitoring Paused'}
            </span>
          </div>
          <div>
            <p className="text-sm text-slate-500">Current Risk Level</p>
            <RiskBadge level={patient.currentRiskLevel || 'LOW'} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Assigned Doctor</p>
            <p className="font-medium">{patient.assignedDoctor?.name || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Assigned Worker</p>
            <p className="font-medium">{patient.assignedWorker?.name || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      {patient.comorbidities?.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Comorbidities</h3>
          <div className="flex flex-wrap gap-2">
            {patient.comorbidities.map((c, i) => (
              <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
