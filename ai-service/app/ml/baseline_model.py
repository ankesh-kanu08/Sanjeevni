from typing import Dict, Any

class MLRiskModel:
    def __init__(self) -> None:
        self.weights = {
            'spo2_deviation': 25,
            'hr_deviation': 15,
            'temp_deviation': 10,
            'bp_deviation': 10,
            'symptom_severity': 20,
            'symptom_count': 5,
            'activity_change': 10,
            'trend_worsening': 5
        }
    
    def predict(self, request: Any) -> Dict[str, Any]:
        score = 0.0
        reasons = []
        
        if request.baseline.spo2 is not None and request.current.spo2 is not None:
            spo2_drop = request.baseline.spo2 - request.current.spo2
            if spo2_drop > 0:
                contribution = min(spo2_drop / 6.0, 1.0) * self.weights['spo2_deviation']
                score += contribution
                if spo2_drop >= 2:
                    reasons.append(f'SpO2 decreased {spo2_drop} points from baseline')
                    
        if request.baseline.heartRate is not None and request.current.heartRate is not None:
            hr_inc = request.current.heartRate - request.baseline.heartRate
            if hr_inc > 0:
                contribution = min(hr_inc / 30.0, 1.0) * self.weights['hr_deviation']
                score += contribution
                
        if request.baseline.temperature is not None and request.current.temperature is not None:
            temp_inc = request.current.temperature - request.baseline.temperature
            if temp_inc > 0:
                contribution = min(temp_inc / 2.5, 1.0) * self.weights['temp_deviation']
                score += contribution
                
        if request.symptoms:
            score += min(len(request.symptoms) * 2.5, self.weights['symptom_count'])
            if len(request.symptoms) >= 2:
                reasons.append(f'Patient reported {len(request.symptoms)} symptoms')
                
        if request.activityChange is not None and request.activityChange < 0:
            contribution = min(abs(request.activityChange) / 50.0, 1.0) * self.weights['activity_change']
            score += contribution
            if request.activityChange <= -20:
                reasons.append(f'Activity decreased by {abs(request.activityChange)}%')
                
        score = min(score, 100.0)
        
        return {'score': score, 'reasons': reasons}
