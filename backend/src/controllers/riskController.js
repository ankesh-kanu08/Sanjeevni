import { assessRisk, getRiskHistory } from '../services/riskService.js';

export const triggerRiskAssessment = async (req, res, next) => {
  try {
    const assessment = await assessRisk(req.params.id);
    res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await getRiskHistory(req.params.id);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
