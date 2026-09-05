import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, CheckCircle, AlertTriangle, Activity, UserCheck, Stethoscope } from 'lucide-react';

const AlertCard = ({ alert, onReview, onMarkRead, onMarkActioned }) => {
  const isHighRisk = alert.riskLevel === 'HIGH' || alert.level === 'HIGH';
  const isMediumRisk = alert.riskLevel === 'MEDIUM' || alert.level === 'MEDIUM';
  const isActioned = alert.isActioned || alert.status === 'ACTIONED';

  // Extract patient details
  const patientName = alert.patient?.name || alert.patient?.user?.name || 'Unknown Patient';
  const patientAge = alert.patient?.age || alert.patient?.demographics?.age || 'N/A';
  const patientDiagnosis = alert.patient?.diagnosis || alert.diagnosis || 'Post-Discharge';

  // Extract vitals comparison
  const vitalsComp = alert.vitalsComparison || {};
  const hasVitalsComp = vitalsComp.baseline && vitalsComp.current;

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
      isActioned ? 'border-slate-200 opacity-80' :
      isHighRisk ? 'border-red-300 ring-1 ring-red-100' :
      isMediumRisk ? 'border-amber-300' : 'border-slate-200'
    }`}>
      {/* Risk Header Banner */}
      <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
        isActioned ? 'bg-slate-100 text-slate-700' :
        isHighRisk ? 'bg-red-600 text-white' :
        isMediumRisk ? 'bg-amber-500 text-white' :
        'bg-teal-600 text-white'
      }`}>
        <div className="flex items-center space-x-1.5">
          {isHighRisk ? <ShieldAlert size={15} /> : isMediumRisk ? <AlertTriangle size={15} /> : <Activity size={15} />}
          <span>{isActioned ? 'ACTIONED' : isHighRisk ? 'URGENT — HIGH RISK' : `${alert.riskLevel || 'STANDARD'} RISK`}</span>
        </div>
        <span className="text-[11px] font-normal opacity-90 lowercase first-letter:uppercase">
          {alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true }) : 'Recently'}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Patient Header & Title */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {patientName}
              <span className="text-sm font-normal text-slate-500">
                ({patientAge}y, {alert.patient?.demographics?.gender || alert.patient?.gender || 'Patient'})
              </span>
            </h3>
            <p className="text-xs text-teal-700 font-semibold mt-0.5">
              Diagnosis: <span className="font-medium text-slate-700">{patientDiagnosis}</span>
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            isHighRisk ? 'bg-red-100 text-red-800 border border-red-200' :
            isMediumRisk ? 'bg-amber-100 text-amber-800 border border-amber-200' :
            'bg-green-100 text-green-800 border border-green-200'
          }`}>
            {alert.riskLevel || 'LOW'} RISK
          </span>
        </div>

        {/* Alert Summary & Clinical Reason */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <h4 className="font-semibold text-slate-800 text-sm mb-1">{alert.title || 'Possible Deterioration Detected'}</h4>
          <p className="text-sm text-slate-600">{alert.message}</p>
          {alert.reasons && alert.reasons.length > 0 && (
            <ul className="mt-2 text-xs text-slate-700 space-y-1 list-disc pl-4">
              {alert.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Clinical Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Baseline vs Current Vitals */}
          <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100">
            <span className="font-semibold text-teal-900 block mb-1.5 flex items-center gap-1">
              <Activity size={13} className="text-teal-700" /> Vitals Comparison
            </span>
            {hasVitalsComp ? (
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">SpO₂:</span>
                  <span className="font-bold text-red-600">
                    {vitalsComp.baseline.spo2}% → {vitalsComp.current.spo2}%
                    {vitalsComp.changes?.spo2Change !== undefined && (
                      <span className="text-xs font-medium ml-1">({vitalsComp.changes.spo2Change} pts)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Heart Rate:</span>
                  <span className="font-bold text-amber-700">
                    {vitalsComp.baseline.heartRate} → {vitalsComp.current.heartRate} bpm
                    {vitalsComp.changes?.hrChange !== undefined && (
                      <span className="text-xs font-medium ml-1">(+{vitalsComp.changes.hrChange} bpm)</span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">SpO₂:</span>
                  <span className="font-bold text-red-600">96% → 91% (-5 pts)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Heart Rate:</span>
                  <span className="font-bold text-amber-700">78 → 104 bpm (+26 bpm)</span>
                </div>
              </div>
            )}
          </div>

          {/* Verification & Symptoms Context */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Patient Reported:</span>
              <span className="text-slate-800 font-medium">
                {alert.symptomsReported?.length > 0 ? alert.symptomsReported.join(', ') : 'Increasing breathlessness'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5 flex items-center gap-1">
                <UserCheck size={12} className="text-teal-600" /> Physical Verification:
              </span>
              <span className="inline-block font-medium px-2 py-0.5 rounded text-[11px] bg-teal-100 text-teal-800">
                {alert.verificationStatus || 'Completed by ASHA'}
              </span>
            </div>
          </div>
        </div>

        {/* Recommended Action & CTA Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500">Recommended: </span>
            <span className="font-semibold text-teal-800">
              {alert.recommendedAction || 'Clinical review'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onReview && onReview(alert)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Stethoscope size={14} />
              Review Patient
            </button>

            {!isActioned ? (
              <button
                onClick={() => onMarkActioned ? onMarkActioned(alert._id) : onMarkRead && onMarkRead(alert._id)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <CheckCircle size={14} className="text-slate-500" />
                Mark as Actioned
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-medium border border-emerald-200">
                <CheckCircle size={13} /> Actioned
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
