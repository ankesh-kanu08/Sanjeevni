import React, { useState } from 'react';
import { AlertTriangle, Check, ShieldCheck, ArrowRight } from 'lucide-react';

export default function DataConflictModal({ conflicts, onResolve, onCancel }) {
  // decisions: { [conflictKey]: 'current' | 'document' }
  const [decisions, setDecisions] = useState(() => {
    const initial = {};
    conflicts.forEach(c => {
      initial[c.key] = 'document'; // default suggestion to document, or current
    });
    return initial;
  });

  const setAllTo = (choice) => {
    const updated = {};
    conflicts.forEach(c => {
      updated[c.key] = choice;
    });
    setDecisions(updated);
  };

  const handleConfirm = () => {
    onResolve(decisions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b bg-amber-50/60 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Resolve Data Conflicts</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              You already entered some values manually before uploading this document. For each conflicting field below, choose whether to keep your manual entry or replace it with the document's extracted value.
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="px-6 py-2.5 bg-gray-50 border-b flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">
            {conflicts.length} conflicting field{conflicts.length > 1 ? 's' : ''} found
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllTo('current')}
              className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded hover:bg-gray-100 font-medium"
            >
              Keep All Current
            </button>
            <button
              type="button"
              onClick={() => setAllTo('document')}
              className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded hover:bg-teal-100 font-medium"
            >
              Use All Document Values
            </button>
          </div>
        </div>

        {/* List of conflicts */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {conflicts.map((item) => {
            const currentSelected = decisions[item.key] === 'current';
            const docSelected = decisions[item.key] === 'document';

            return (
              <div key={item.key} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {item.category || 'General'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Current Manual Value */}
                  <button
                    type="button"
                    onClick={() => setDecisions({ ...decisions, [item.key]: 'current' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      currentSelected
                        ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                        : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-600">Keep Current Manual</span>
                      {currentSelected && <Check size={14} className="text-teal-600 font-bold" />}
                    </div>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {String(item.currentValue || '—')}
                    </p>
                  </button>

                  {/* Document Extracted Value */}
                  <button
                    type="button"
                    onClick={() => setDecisions({ ...decisions, [item.key]: 'document' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      docSelected
                        ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                        : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-teal-700">Use Document Value</span>
                      {docSelected && <Check size={14} className="text-teal-600 font-bold" />}
                    </div>
                    <p className="text-sm font-medium text-teal-950 break-words">
                      {String(item.documentValue || '—')}
                    </p>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow transition-colors flex items-center gap-1.5"
          >
            Apply Choices & Merge <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
