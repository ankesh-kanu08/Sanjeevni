export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

export const validateVitals = (vitals) => {
  const errors = {};

  if (vitals.spo2 !== undefined && (vitals.spo2 < 50 || vitals.spo2 > 100)) {
    errors.spo2 = 'SpO2 must be between 50 and 100';
  }
  if (vitals.hr !== undefined && (vitals.hr < 30 || vitals.hr > 250)) {
    errors.hr = 'Heart rate must be between 30 and 250';
  }
  if (vitals.temp !== undefined && (vitals.temp < 90 || vitals.temp > 110)) {
    errors.temp = 'Temperature must be between 90 and 110';
  }
  if (vitals.systolic !== undefined && (vitals.systolic < 50 || vitals.systolic > 250)) {
    errors.systolic = 'Systolic BP must be between 50 and 250';
  }
  if (vitals.diastolic !== undefined && (vitals.diastolic < 30 || vitals.diastolic > 180)) {
    errors.diastolic = 'Diastolic BP must be between 30 and 180';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
