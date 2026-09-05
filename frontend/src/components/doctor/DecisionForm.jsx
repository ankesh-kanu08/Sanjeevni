import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

const DecisionForm = ({ patient, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    decisionType: '',
    clinicalNotes: '',
    followUpDate: '',
    urgency: 'Routine'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Clinical Decision</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Decision Action</label>
          <select 
            name="decisionType" 
            value={formData.decisionType} 
            onChange={handleChange}
            required
            className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          >
            <option value="">Select an action...</option>
            <option value="continue_monitoring">Continue Home Monitoring</option>
            <option value="request_assessment">Request Another Assessment</option>
            <option value="teleconsult">Start Teleconsultation</option>
            <option value="refer_phc">Refer to PHC</option>
            <option value="refer_hospital">Refer to Hospital</option>
            <option value="emergency">Emergency Escalation</option>
            <option value="modify_monitoring">Modify Monitoring Frequency</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
          <textarea 
            name="clinicalNotes" 
            value={formData.clinicalNotes} 
            onChange={handleChange}
            required
            placeholder="Enter clinical observations and reasoning..."
            className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[128px]"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date (Optional)</label>
            <input 
              type="date" 
              name="followUpDate" 
              value={formData.followUpDate} 
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Urgency</label>
            <div className="flex space-x-4">
              {['routine', 'urgent', 'emergency'].map((urgency) => (
                <label key={urgency} className="flex items-center">
                  <input 
                    type="radio" 
                    name="urgency" 
                    value={urgency} 
                    checked={formData.urgency === urgency}
                    onChange={handleChange}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-slate-700 capitalize">{urgency}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-teal-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Record Decision'}
          </button>
        </div>
        
        <div className="flex items-start text-xs text-slate-500 mt-3 bg-slate-50 p-2 rounded">
          <AlertCircle size={14} className="mr-1.5 flex-shrink-0 text-slate-400 mt-0.5" />
          <p>This decision will be recorded in the patient timeline and visible to assigned health workers.</p>
        </div>
      </div>
    </form>
  );
};

export default DecisionForm;
