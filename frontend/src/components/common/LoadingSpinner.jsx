import React from 'react';

const LoadingSpinner = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] w-full p-6">
      <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-teal-600 animate-spin mb-4"></div>
      {message && <p className="text-slate-600 font-medium">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
