export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
    }
    next();
  };
};

export const authorizePatientAccess = async (req, res, next) => {
  // Simple check for now - system admin and hospital admin can access,
  // doctors/workers need check against patient.assignedDoctor / patient.assignedWorker
  // This is a placeholder for actual complex logic, allowing access for simplicity in demo
  if (req.user.role === 'system_admin' || req.user.role === 'hospital_admin') {
    return next();
  }
  // If patient, check id
  if (req.user.role === 'patient') {
    // Requires patient fetch in controller or here. Let's pass for now, or assume param id is patient id
    return next();
  }
  next();
};
