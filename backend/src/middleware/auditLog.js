import AuditLog from '../models/AuditLog.js';

export const auditLog = (action, resource) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        await AuditLog.create({
          user: req.user._id,
          action,
          resource,
          resourceId: req.params.id || req.body.id || null,
          details: { method: req.method, url: req.originalUrl, query: req.query },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    } catch (err) {
      console.error('Audit Log Error:', err);
    }
    next();
  };
};
