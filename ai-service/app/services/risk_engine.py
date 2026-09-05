from datetime import datetime
from typing import Tuple, List, Dict, Any
from app.models.schemas import RiskAnalysisRequest, RiskAnalysisResponse, BaselineDeviation
from app.rules.clinical_rules import ClinicalSafetyRules
from app.ml.baseline_model import MLRiskModel

class TrendAnalyzer:
    def analyze(self, previous_assessments: List[Any]) -> Dict[str, Any]:
        if not previous_assessments or len(previous_assessments) < 2:
            return {'trend': 'insufficient_data', 'score_modifier': 0, 'reasons': []}
        
        scores = [a.riskScore for a in previous_assessments[-3:]]
        
        if all(scores[i] < scores[i+1] for i in range(len(scores)-1)):
            return {
                'trend': 'worsening',
                'score_modifier': 10,
                'reasons': ['Risk trend shows consistent worsening over recent assessments']
            }
        
        if len(scores) >= 2 and scores[-1] - scores[0] > 30:
            return {
                'trend': 'rapid_deterioration',
                'score_modifier': 15,
                'reasons': ['Rapid deterioration detected in risk trajectory']
            }
        
        return {'trend': 'stable', 'score_modifier': 0, 'reasons': []}

class RiskEngine:
    def __init__(self) -> None:
        self.clinical_rules = ClinicalSafetyRules()
        self.ml_model = MLRiskModel()
        self.trend_analyzer = TrendAnalyzer()
    
    def _calculate_baseline_deviations(self, baseline: Any, current: Any) -> List[BaselineDeviation]:
        deviations = []
        
        if baseline.spo2 is not None and current.spo2 is not None:
            change = baseline.spo2 - current.spo2
            severity = 'normal'
            if change >= 6: severity = 'severe'
            elif change >= 4: severity = 'moderate'
            elif change > 0: severity = 'mild'
            if change > 0:
                deviations.append(BaselineDeviation(
                    parameter='spo2', baseline=baseline.spo2, current=current.spo2,
                    change=-change, unit='%', severity=severity
                ))
                
        if baseline.heartRate is not None and current.heartRate is not None:
            change = current.heartRate - baseline.heartRate
            severity = 'normal'
            if change >= 30: severity = 'severe'
            elif change >= 20: severity = 'moderate'
            elif change > 10: severity = 'mild'
            if change > 0:
                deviations.append(BaselineDeviation(
                    parameter='heartRate', baseline=baseline.heartRate, current=current.heartRate,
                    change=change, unit='bpm', severity=severity
                ))
                
        if baseline.temperature is not None and current.temperature is not None:
            change = current.temperature - baseline.temperature
            severity = 'normal'
            if change >= 2.5: severity = 'severe'
            elif change >= 1.5: severity = 'moderate'
            elif change > 0.5: severity = 'mild'
            if change > 0:
                deviations.append(BaselineDeviation(
                    parameter='temperature', baseline=baseline.temperature, current=current.temperature,
                    change=change, unit='F', severity=severity
                ))
                
        if baseline.bloodPressure and baseline.bloodPressure.systolic is not None and current.bloodPressure and current.bloodPressure.systolic is not None:
            change = current.bloodPressure.systolic - baseline.bloodPressure.systolic
            abs_change = abs(change)
            severity = 'normal'
            if abs_change >= 30: severity = 'severe'
            elif abs_change >= 20: severity = 'moderate'
            elif abs_change > 10: severity = 'mild'
            if abs_change > 0:
                deviations.append(BaselineDeviation(
                    parameter='systolic_bp', baseline=baseline.bloodPressure.systolic, current=current.bloodPressure.systolic,
                    change=change, unit='mmHg', severity=severity
                ))
                
        return deviations

    def _combine_results(self, rules_result: Dict[str, Any], ml_result: Dict[str, Any], trend_result: Dict[str, Any], deviations: List[BaselineDeviation], symptoms: List[str]) -> Tuple[float, str, List[str]]:
        reasons = []
        final_score = ml_result['score'] + trend_result['score_modifier']
        reasons.extend(ml_result['reasons'])
        reasons.extend(trend_result['reasons'])
        
        for dev in deviations:
            if dev.severity in ['moderate', 'severe']:
                reasons.append(f"{dev.parameter.capitalize()} changed by {abs(dev.change)} {dev.unit} from baseline ({dev.severity})")
                
        reasons.extend(rules_result['reasons'])
        
        final_level = "LOW"
        if final_score >= 70:
            final_level = "HIGH"
        elif final_score >= 40:
            final_level = "MEDIUM"
            
        if rules_result['risk_level'] == "HIGH":
            final_level = "HIGH"
            final_score = max(final_score, 85.0)
        elif rules_result['risk_level'] == "MEDIUM" and final_level == "LOW":
            final_level = "MEDIUM"
            final_score = max(final_score, 50.0)
            
        final_score = min(final_score, 100.0)
        
        # Deduplicate reasons
        reasons = list(dict.fromkeys(reasons))
        
        return final_score, final_level, reasons

    def _determine_workflow(self, risk_level: str) -> str:
        if risk_level == "HIGH":
            return "immediate_escalation"
        elif risk_level == "MEDIUM":
            return "schedule_teleconsult"
        return "continue_routine_monitoring"

    def analyze(self, request: RiskAnalysisRequest) -> RiskAnalysisResponse:
        deviations = self._calculate_baseline_deviations(request.baseline, request.current)
        rules_result = self.clinical_rules.evaluate(request.current, deviations, request.symptoms)
        ml_result = self.ml_model.predict(request)
        trend_result = self.trend_analyzer.analyze(request.previousAssessments)
        
        final_score, final_level, reasons = self._combine_results(
            rules_result, ml_result, trend_result, deviations, request.symptoms
        )
        
        workflow = self._determine_workflow(final_level)
        
        return RiskAnalysisResponse(
            riskScore=final_score,
            riskLevel=final_level,
            reasons=reasons,
            recommendedWorkflow=workflow,
            baselineDeviation=deviations,
            trends=trend_result,
            timestamp=datetime.now().isoformat()
        )
