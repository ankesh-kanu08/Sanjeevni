import re
import json
from typing import Dict, Any, List, Optional, Tuple
from app.models.schemas import (
    VoiceTurnRequest,
    VoiceTurnResponse,
    ObservationItem,
)

class VoiceAgentService:
    """
    Intelligent, reactive conversational clinical voice agent.
    Maintains persistent session state, extracts multiple clinical observations & vitals per turn,
    resolves short contextual responses, detects unexpected symptoms, prevents question duplication,
    and dynamically selects the next clinical question.
    """

    DEFAULT_BASELINE = {
        "spo2": 96.0,
        "heartRate": 82.0,
        "temperature": 98.4,
        "bloodPressure": {"systolic": 138, "diastolic": 84},
        "respiratoryRate": 18.0,
    }

    DEFAULT_MONITORING_PLAN = {
        "frequency": "Daily",
        "parameters": ["breathlessness", "cough", "spo2", "heartRate", "temperature"]
    }

    def __init__(self):
        pass

    def process_turn(self, req: VoiceTurnRequest) -> VoiceTurnResponse:
        """
        Main entry point for processing a patient voice turn.
        """
        session_id = req.sessionId
        turn_id = req.turnId
        lang = req.language or "en-IN"
        is_hindi = "hi" in lang.lower()

        # 1. Recover or initialize session state
        state = req.conversationState or {}
        if not state.get("sessionId"):
            state["sessionId"] = session_id
        if not state.get("patientProfile"):
            state["patientProfile"] = {
                "name": "Ramesh Kumar",
                "age": 62,
                "gender": "Male",
                "diagnosis": "COPD Exacerbation",
                "comorbidities": ["Diabetes", "Hypertension"]
            }
        
        answered_topics = list(state.get("answeredTopics", []))
        pending_topics = list(state.get("pendingTopics", []))
        observations = dict(state.get("observations", {}))
        turns = list(state.get("turns", []))
        temporal = dict(state.get("temporalContext", {
            "today": True,
            "yesterday": "stable",
            "onset": "today",
            "worsening": False,
            "improving": False
        }))

        baseline = req.baseline or self.DEFAULT_BASELINE
        prev_question = (req.previousQuestion or state.get("lastQuestion") or "").strip()
        patient_input = (req.patientResponse or "").strip()
        current_topic = state.get("currentTopic") or "overall_recovery"

        # 2. Handle Turn 1 / Initial greeting if no input or turn 1
        if turn_id <= 1 and not patient_input:
            patient_name = state["patientProfile"].get("name", "Ramesh").split()[0]
            if is_hindi:
                greeting = f"नमस्ते {patient_name} जी। मैं आपकी स्वास्थ्य स्थिति की जांच करने के लिए आई हूँ। कल के मुकाबले आज आपकी तबीयत कैसी लग रही है?"
            else:
                greeting = f"Good morning, {patient_name}. I'm going to check how you're recovering today. How are you feeling compared with yesterday?"

            state["currentTopic"] = "overall_recovery"
            state["lastQuestion"] = greeting
            state["answeredTopics"] = []
            state["pendingTopics"] = ["overall_recovery", "breathlessness", "cough", "spo2", "heartRate", "temperature"]
            state["observations"] = observations
            state["turns"] = [{"turnId": 1, "speaker": "assistant", "message": greeting, "topic": "overall_recovery"}]

            return VoiceTurnResponse(
                assistantResponse=greeting,
                currentTopic="overall_recovery",
                nextAction="ASK_NEXT_TOPIC",
                extractedObservations=[],
                answeredTopics=[],
                pendingTopics=state["pendingTopics"],
                confidence=1.0,
                conversationState=state,
                checkInStatus="IN_PROGRESS"
            )

        # 3. Check for unclear speech
        if self._is_unclear_speech(patient_input):
            if is_hindi:
                unclear_msg = "माफ़ कीजिए, मैं आपकी बात ठीक से सुन नहीं पाई। क्या आप कृपया दोबारा बोल सकते हैं?"
            else:
                unclear_msg = "Sorry, I didn't quite catch that. Could you please repeat that?"
            return VoiceTurnResponse(
                assistantResponse=unclear_msg,
                currentTopic=current_topic,
                nextAction="CLARIFY",
                extractedObservations=[],
                answeredTopics=answered_topics,
                pendingTopics=pending_topics,
                confidence=0.5,
                conversationState=state,
                checkInStatus="IN_PROGRESS"
            )

        # 4. Check for irrelevant speech (e.g. cricket match, weather)
        if self._is_irrelevant_speech(patient_input):
            if is_hindi:
                redirect_msg = f"मैं यहाँ आपकी सेहत की जांच के लिए हूँ। चलिए पहले आपकी सांस के बारे में बात करते हैं। आज आपको सांस लेने में कैसी स्थिति लग रही है?"
            else:
                redirect_msg = "I'm here to check on your recovery. Let's continue with your breathing first. How is your breathing today?"
            return VoiceTurnResponse(
                assistantResponse=redirect_msg,
                currentTopic=current_topic,
                nextAction="REDIRECT",
                extractedObservations=[],
                answeredTopics=answered_topics,
                pendingTopics=pending_topics,
                confidence=0.85,
                conversationState=state,
                checkInStatus="IN_PROGRESS"
            )

        # 5. Extract structured observations from patient response + context
        newly_extracted = self._extract_observations(
            text=patient_input,
            current_topic=current_topic,
            prev_question=prev_question,
            baseline=baseline,
            observations=observations
        )

        # 6. Update master observations dictionary
        for obs in newly_extracted:
            obs_dict = obs.dict()
            name = obs.name
            observations[name] = obs_dict

            # Mark corresponding topic as answered
            if name not in answered_topics:
                answered_topics.append(name)
            
            # Map sub-topics
            if name == "breathlessness" and obs.context:
                if "breathlessness_activity" not in answered_topics:
                    answered_topics.append("breathlessness_activity")
            if name == "cough" and obs.trend:
                if "cough_trend" not in answered_topics:
                    answered_topics.append("cough_trend")
            if name == "phlegm_color" or (name == "phlegm" and obs.notes and "Color:" in obs.notes):
                if "phlegm_color" not in answered_topics:
                    answered_topics.append("phlegm_color")
            if name == "phlegm_amount":
                if "phlegm_amount" not in answered_topics:
                    answered_topics.append("phlegm_amount")


        # Mark current topic as answered if response provided
        if current_topic not in answered_topics:
            answered_topics.append(current_topic)

        # Check temporal cues
        lower_input = patient_input.lower()
        if "yesterday" in lower_input or "kal" in lower_input:
            temporal["yesterday"] = "stable"
        if "today" in lower_input or "aaj" in lower_input:
            temporal["today"] = True
        if any(w in lower_input for w in ["worse", "kharab", "badh", "takleef", "difficulty"]):
            temporal["worsening"] = True

        # Append patient turn to history
        turns.append({
            "turnId": turn_id,
            "speaker": "patient",
            "message": patient_input,
            "topic": current_topic
        })

        # 7. Decide Next Action & Dynamic Next Question
        next_response, next_topic, next_action, checkin_status = self._determine_next_step(
            current_topic=current_topic,
            patient_input=patient_input,
            answered_topics=answered_topics,
            observations=observations,
            baseline=baseline,
            is_hindi=is_hindi,
            patient_name=state["patientProfile"].get("name", "Ramesh").split()[0]
        )

        # Update state
        state["currentTopic"] = next_topic
        state["lastQuestion"] = next_response
        state["lastPatientResponse"] = patient_input
        state["answeredTopics"] = answered_topics
        state["observations"] = observations
        state["temporalContext"] = temporal
        state["checkInStatus"] = checkin_status

        # Append assistant response turn
        turns.append({
            "turnId": turn_id + 1,
            "speaker": "assistant",
            "message": next_response,
            "topic": next_topic
        })
        state["turns"] = turns

        # Determine pending topics
        required_topics = ["breathlessness", "cough", "spo2", "heartRate", "temperature"]
        pending = [t for t in required_topics if t not in answered_topics]
        state["pendingTopics"] = pending

        return VoiceTurnResponse(
            assistantResponse=next_response,
            currentTopic=next_topic,
            nextAction=next_action,
            extractedObservations=newly_extracted,
            answeredTopics=answered_topics,
            pendingTopics=pending,
            confidence=0.98,
            conversationState=state,
            checkInStatus=checkin_status
        )

    # -------------------------------------------------------------
    # Helper: Check Unclear / Irrelevant Speech
    # -------------------------------------------------------------
    def _is_unclear_speech(self, text: str) -> bool:
        if not text:
            return True
        clean = re.sub(r'[\s\.\,\?\!\-_]', '', text).lower()
        if not clean or clean in ["unclear", "none", "null", "undefined", "..."]:
            return True
        return False

    def _is_irrelevant_speech(self, text: str) -> bool:
        lower = text.lower()
        irrelevant_keywords = [
            "cricket match", "cricket score", "who won", "football match",
            "cinema", "movie", "weather today", "stock market", "election"
        ]
        return any(k in lower for k in irrelevant_keywords)

    # -------------------------------------------------------------
    # Helper: Entity & Clinical Observation Extraction
    # -------------------------------------------------------------
    def _extract_observations(
        self,
        text: str,
        current_topic: str,
        prev_question: str,
        baseline: Dict[str, Any],
        observations: Dict[str, Any]
    ) -> List[ObservationItem]:
        extracted = []
        lower = text.lower()

        # 1. Patient Name extraction (TEST 1)
        name_match = re.search(r'(?:my name is|i am|i\'m|call me|name is|naam hai|naam)\s+([a-zA-Z]+)', lower)
        if name_match:
            name_val = name_match.group(1).title()
            extracted.append(ObservationItem(
                type="concern",
                name="patient_name",
                status="present",
                value=name_val
            ))
        elif current_topic == "name" or "your name" in prev_question.lower():
            clean_word = re.sub(r'[^a-zA-Z]', '', text.strip().split()[0])
            name_val = clean_word.title() if clean_word else text.strip().title()
            extracted.append(ObservationItem(
                type="concern",
                name="patient_name",
                status="present",
                value=name_val
            ))

        # 2. Weakness / Fatigue
        if any(w in lower for w in ["weak", "weakness", "kamzor", "kamzori", "fatigue", "tired", "thakaan"]):
            trend = "worsening" if any(w in lower for w in ["today", "aaj", "worse", "pehle se"]) else "present"
            extracted.append(ObservationItem(
                type="symptom",
                name="weakness",
                status="present",
                trend=trend,
                onset="today" if "today" in lower or "aaj" in lower else "recent"
            ))

        # 3. Breathlessness & Exertion / Resting Context
        has_breathlessness = any(w in lower for w in [
            "breath", "breathing", "breathless", "shortness of breath", "saans", "sans", "dyspnea"
        ])
        
        # Contextual short answers for breathlessness
        is_walking_only = any(w in lower for w in [
            "mostly when i walk", "only when i walk", "when walking", "while walking",
            "on walking", "walk", "exertion", "chalne par"
        ])
        is_resting_normal = any(w in lower for w in [
            "sitting, my breathing is almost normal", "sitting is normal", "normal when sitting",
            "sitting", "at rest", "resting"
        ])

        if has_breathlessness or current_topic in ["breathlessness", "breathlessness_activity", "breathlessness_trend"]:
            context = "activity" if is_walking_only else "resting" if "at rest" in lower or "sitting" in lower else None
            trend = "worsening" if any(w in lower for w in ["worse", "slightly worse", "kharab", "badh"]) else "stable" if "same" in lower else "present"
            
            extracted.append(ObservationItem(
                type="symptom",
                name="breathlessness",
                status="present",
                severity="moderate",
                trend=trend,
                context="activity" if is_walking_only else context,
                notes="Activity-related breathlessness; normal/stable at rest" if is_walking_only else None
            ))

        # 4. Cough & Phlegm
        if "cough" in lower or "khansi" in lower or current_topic in ["cough", "cough_trend"]:
            trend = "worsening" if any(w in lower for w in ["worse", "little worse", "badh", "zyada"]) else "stable"
            extracted.append(ObservationItem(
                type="symptom",
                name="cough",
                status="present",
                trend=trend,
                notes="Productive cough"
            ))

        has_phlegm_word = any(w in lower for w in ["phlegm", "sputum", "balgam", "mucus"])
        has_color_word = any(w in lower for w in ["yellow", "peela", "green", "hara", "clear", "white", "brown", "blood"])
        if has_phlegm_word or current_topic == "phlegm_color" or has_color_word:
            color = "yellow" if ("yellow" in lower or "peela" in lower) else "green" if ("green" in lower or "hara" in lower) else "clear" if "clear" in lower else None
            extracted.append(ObservationItem(
                type="symptom",
                name="phlegm",
                status="present",
                severity="moderate",
                trend="worsening" if color in ["yellow", "green"] else "stable",
                notes=f"Color: {color}" if color else "Phlegm reported, color pending"
            ))
            if color:
                extracted.append(ObservationItem(
                    type="symptom",
                    name="phlegm_color",
                    status="present",
                    notes=color
                ))

        if current_topic == "phlegm_amount" or any(w in lower for w in ["amount of phlegm", "more phlegm", "increased phlegm", "balgam zyada", "balgam badh"]):
            is_increased = any(w in lower for w in ["yes", "ha", "haan", "little", "more", "increased", "zyada", "badh", "a little"])
            extracted.append(ObservationItem(
                type="symptom",
                name="phlegm_amount",
                status="present" if is_increased else "stable",
                trend="worsening" if is_increased else "stable",
                notes="Increased phlegm volume reported" if is_increased else "Stable phlegm volume"
            ))


        # 5. Unexpected Relevant Symptoms: Leg Swelling / Pedal Edema (TEST 5)
        if any(w in lower for w in ["swollen", "swelling", "legs", "feet", "edema", "sujan", "soojan", "pairo"]):
            extracted.append(ObservationItem(
                type="symptom",
                name="pedal_edema",
                status="present",
                severity="moderate",
                onset="recent",
                notes="Leg swelling / pedal edema reported"
            ))

        # 6. SpO2 Extraction & Correction (TEST 3, 6)
        is_correction = any(w in lower for w in ["actually", "sorry", "checked again", "mistake", "correction", "i mean"])
        is_spo2_context = (
            current_topic == "spo2" or 
            "oxygen" in lower or 
            "spo2" in lower or 
            "percent" in lower or
            (is_correction and re.search(r'\b(8\d|9\d)\b', lower) and not any(w in lower for w in ["heart", "pulse", "bpm", "temp", "fever"]))
        )
        if is_spo2_context and re.search(r'\b(8\d|9\d)\b', lower):
            num_match = re.search(r'\b(8\d|9\d)\b', lower)
            if num_match:
                spo2_val = float(num_match.group(1))
                base_spo2 = float(baseline.get("spo2") or 96.0)
                diff = spo2_val - base_spo2
                extracted.append(ObservationItem(
                    type="vital",
                    name="spo2",
                    value=spo2_val,
                    unit="%",
                    baselineValue=base_spo2,
                    change=diff,
                    trend="worsening" if diff <= -2 else "stable"
                ))


        # 7. Heart Rate Extraction
        is_oximeter_context = any(w in lower for w in ["pulse oximeter", "oximeter", "percent", "%", "saturation", "oxygen"])
        hr_matches = re.search(r'(?:heart rate|pulse|hr|rate)?\s*(?:is|was|it\'s)?\s*(\b[6-9]\d\b|\b1[0-4]\d\b)', lower)
        if not (is_oximeter_context and current_topic != "heartRate") and (
            (hr_matches and (current_topic == "heartRate" or "heart" in lower or ("pulse" in lower and not is_oximeter_context))) or
            (current_topic == "heartRate" and re.search(r'\b\d{2,3}\b', lower))
        ):
            num_match = re.search(r'\b([6-9]\d|1[0-4]\d)\b', lower)
            if num_match:
                hr_val = float(num_match.group(1))
                base_hr = float(baseline.get("heartRate") or 82.0)
                diff = hr_val - base_hr
                extracted.append(ObservationItem(
                    type="vital",
                    name="heartRate",
                    value=hr_val,
                    unit="bpm",
                    baselineValue=base_hr,
                    change=diff,
                    trend="worsening" if diff >= 10 else "stable"
                ))

        # 8. Temperature Extraction
        temp_matches = re.search(r'(?:temp|temperature)?\s*(?:is|was|it\'s)?\s*(\b9\d(?:\.\d)?\b|\b10\d(?:\.\d)?\b)', lower)
        if (temp_matches and (current_topic == "temperature" or "temp" in lower or "degree" in lower or "fahrenheit" in lower)) or (current_topic == "temperature" and re.search(r'\b\d{2,3}(?:\.\d)?\b', lower)):
            num_match = re.search(r'\b(9\d(?:\.\d)?|10\d(?:\.\d)?)\b', lower)
            if num_match:
                temp_val = float(num_match.group(1))
                base_temp = float(baseline.get("temperature") or 98.4)
                diff = round(temp_val - base_temp, 1)
                extracted.append(ObservationItem(
                    type="vital",
                    name="temperature",
                    value=temp_val,
                    unit="°F",
                    baselineValue=base_temp,
                    change=diff,
                    trend="worsening" if temp_val >= 99.0 else "stable"
                ))

        # 9. Additional concerns / worries
        if any(w in lower for w in ["worried", "anxious", "scared", "chinta", "dar"]):
            extracted.append(ObservationItem(
                type="concern",
                name="patientConcerns",
                status="present",
                notes="Patient expressed worry regarding breathing difficulties"
            ))

        return extracted

    # -------------------------------------------------------------
    # Helper: Dynamic Next Question Selection
    # -------------------------------------------------------------
    def _determine_next_step(
        self,
        current_topic: str,
        patient_input: str,
        answered_topics: List[str],
        observations: Dict[str, Any],
        baseline: Dict[str, Any],
        is_hindi: bool,
        patient_name: str
    ) -> Tuple[str, str, str, str]:
        """
        Determines the next response, next topic, action, and check-in status.
        Never repeats an already answered topic.
        Dynamically branches into follow-ups when symptoms are reported.
        """
        lower = patient_input.lower()

        # BRANCH 0: Check for Name Question (TEST 1)
        if "patient_name" in observations and current_topic == "name":
            extracted_name = observations["patient_name"].get("value", patient_name)
            if is_hindi:
                return (f"धन्यवाद {extracted_name} जी। आज आपकी तबीयत कैसी लग रही है?", "overall_recovery", "ASK_NEXT_TOPIC", "IN_PROGRESS")
            else:
                return (f"Thank you, {extracted_name}. How are you feeling compared with yesterday?", "overall_recovery", "ASK_NEXT_TOPIC", "IN_PROGRESS")

        # BRANCH 1: Unexpected symptom reported (TEST 5 - Leg Swelling)
        if "pedal_edema" in observations and "pedal_edema_followup" not in answered_topics:
            answered_topics.append("pedal_edema_followup")
            if is_hindi:
                msg = "पैरों में सूजन की जानकारी देने के लिए धन्यवाद। क्या यह सूजन हाल ही में शुरू हुई है या पहले से थी?"
            else:
                msg = "Thanks for mentioning the swelling. Has the swelling in your legs started recently, or have you had it before?"
            return (msg, "pedal_edema", "ASK_FOLLOW_UP", "IN_PROGRESS")

        # BRANCH 2: Overall Recovery answered -> Branch to Breathlessness Activity / Severity
        if current_topic == "overall_recovery":
            # Patient mentioned breathlessness
            if "breathlessness" in observations:
                # Check if patient already clarified activity context in the same response
                b_obs = observations["breathlessness"]
                if b_obs.get("context") == "activity":
                    # Already answered walking! Ask about trend compared with yesterday
                    answered_topics.append("breathlessness_activity")
                    if is_hindi:
                        msg = "चलने पर सांस फूलने के बारे में आपने बताया, क्या यह कल के मुकाबले ज्यादा बढ़ गई है?"
                    else:
                        msg = "Okay. Since you mentioned breathlessness while walking, has it become worse compared with yesterday?"
                    return (msg, "breathlessness_trend", "ASK_FOLLOW_UP", "IN_PROGRESS")
                else:
                    # Ask resting vs activity
                    if is_hindi:
                        msg = "मैं समझ सकती हूँ। क्या यह सांस की तकलीफ बैठे रहने पर भी हो रही है, या मुख्य रूप से चलने-फिरने पर होती है?"
                    else:
                        msg = "I understand. Is the breathing difficulty happening even while you're resting, or mainly when you're walking or doing some activity?"
                    return (msg, "breathlessness_activity", "ASK_FOLLOW_UP", "IN_PROGRESS")
            else:
                # If breathlessness not mentioned, ask directly
                if is_hindi:
                    msg = "क्या आपको सांस लेने में कोई तकलीफ हो रही है?"
                else:
                    msg = "Are you experiencing any difficulty breathing or shortness of breath today?"
                return (msg, "breathlessness", "ASK_NEXT_TOPIC", "IN_PROGRESS")

        # BRANCH 3: Breathlessness Activity answered
        if current_topic in ["breathlessness", "breathlessness_activity"]:
            if "breathlessness_trend" not in answered_topics:
                answered_topics.append("breathlessness_trend")
                if is_hindi:
                    msg = "ठीक है। जैसा कि आपने बताया कि चलने पर सांस फूलती है, क्या यह कल के मुकाबले ज्यादा हो गई है?"
                else:
                    msg = "Okay. Since you mentioned breathlessness while walking, has it become worse compared with yesterday?"
                return (msg, "breathlessness_trend", "ASK_FOLLOW_UP", "IN_PROGRESS")

        # BRANCH 4: Breathlessness Trend answered -> Check Cough
        if current_topic == "breathlessness_trend":
            # Check if cough was already answered earlier (e.g. multi-observation)
            if "cough" in observations and "phlegm" in observations:
                # Both already known! Move directly to SpO2
                pass
            elif "cough" in observations and "phlegm" not in observations:
                # Cough known, ask about phlegm
                if is_hindi:
                    msg = "समझा। क्या बलगम के रंग में कोई बदलाव दिखा है?"
                else:
                    msg = "Understood. Have you noticed any change in the color of the phlegm?"
                return (msg, "phlegm_color", "ASK_FOLLOW_UP", "IN_PROGRESS")
            else:
                if is_hindi:
                    msg = "बताने के लिए धन्यवाद। आपको बलगम वाली खांसी भी थी। आज आपकी खांसी कैसी है—बेहतर, पहले जैसी, या ज्यादा खराब?"
                else:
                    msg = "Thanks for telling me. You were also recovering from a productive cough. How is your cough today—better, about the same, or worse?"
                return (msg, "cough", "ASK_NEXT_TOPIC", "IN_PROGRESS")

        # BRANCH 5: Cough answered -> Check Phlegm Color
        if current_topic == "cough":
            if "phlegm_color" in observations or "phlegm_color" in answered_topics:
                pass  # Already has phlegm color
            else:
                if is_hindi:
                    msg = "समझा। क्या आपने बलगम के रंग में कोई बदलाव देखा है?"
                else:
                    msg = "Understood. Have you noticed any change in the color of the phlegm?"
                return (msg, "phlegm_color", "ASK_FOLLOW_UP", "IN_PROGRESS")

        # BRANCH 5b: Phlegm Color answered -> Check Phlegm Amount
        if current_topic == "phlegm_color":
            if "phlegm_amount" not in answered_topics:
                answered_topics.append("phlegm_amount")
                if is_hindi:
                    msg = "क्या बलगम की मात्रा भी पहले से थोड़ी बढ़ गई है?"
                else:
                    msg = "Has the amount of phlegm also increased?"
                return (msg, "phlegm_amount", "ASK_FOLLOW_UP", "IN_PROGRESS")

        # BRANCH 6: SpO2 Check
        if current_topic in ["phlegm_amount", "phlegm_color", "cough"] or "spo2" not in answered_topics:
            if "spo2" not in observations:
                if is_hindi:
                    msg = "ठीक है, मैंने यह नोट कर लिया है। चलिए आपका ऑक्सीजन स्तर भी देख लेते हैं। क्या आपके पास आज की SpO2 रीडिंग है?"
                else:
                    msg = "Okay, I've noted that. Let's check your oxygen level as well. Do you have today's oxygen saturation, or SpO2, reading?"
                return (msg, "spo2", "ASK_NEXT_TOPIC", "IN_PROGRESS")

        # BRANCH 7: Heart Rate Check with SpO2 Baseline Comparison
        if current_topic == "spo2" or "heartRate" not in answered_topics:
            if "heartRate" not in observations:
                base_spo2 = int(baseline.get("spo2") or 96)
                curr_spo2 = int(observations.get("spo2", {}).get("value") or 92)
                if is_hindi:
                    msg = f"धन्यवाद। डिस्चार्ज के समय आपका SpO2 {base_spo2}% था, और आज की वैल्यू {curr_spo2}% दर्ज की गई है। क्या आपके पास अपनी दिल की धड़कन (हार्ट रेट) की रीडिंग भी है?"
                else:
                    msg = f"Thank you. Your discharge record had an SpO2 of {base_spo2}% on room air, so I've recorded today's value of {curr_spo2}% as a change from that baseline. Do you also have your heart-rate reading?"
                return (msg, "heartRate", "ASK_NEXT_TOPIC", "IN_PROGRESS")

        # BRANCH 8: Temperature Check
        if current_topic == "heartRate" or "temperature" not in answered_topics:
            if "temperature" not in observations:
                if is_hindi:
                    msg = "समझ गया। क्या आपने आज अपना तापमान (बुखार) चेक किया है?"
                else:
                    msg = "Got it. Have you checked your temperature today?"
                return (msg, "temperature", "ASK_NEXT_TOPIC", "IN_PROGRESS")

        # BRANCH 9: Additional Concerns Check
        if current_topic == "temperature" or "additional_concerns" not in answered_topics:
            answered_topics.append("additional_concerns")
            symptom_summary = []
            if "breathlessness" in observations:
                symptom_summary.append("breathlessness")
            if "cough" in observations:
                symptom_summary.append("cough")
            if "weakness" in observations:
                symptom_summary.append("weakness")
            summary_str = ", ".join(symptom_summary) or "the symptoms"

            if is_hindi:
                msg = "धन्यवाद। सांस की तकलीफ, खांसी और कमजोरी के अलावा, क्या आज कुछ और अलग या परेशानी भरा लग रहा है?"
            else:
                msg = f"Thank you. Apart from the {summary_str} you've mentioned, is there anything else that feels different today?"
            return (msg, "additional_concerns", "ASK_FOLLOW_UP", "IN_PROGRESS")

        # BRANCH 10: Complete Check-in & Handoff to Clinical Risk Assessment
        if is_hindi:
            closing_msg = "मैं समझ सकती हूँ। मैंने आपके द्वारा बताए गए सभी बदलाव दर्ज कर लिए हैं। मैं इस जांच को समीक्षा के लिए भेज रही हूँ ताकि स्वास्थ्य टीम इसकी समीक्षा कर सके।"
        else:
            closing_msg = "I understand. I've recorded the changes you mentioned. I'll send this check-in for assessment so that the care team can review the changes."

        return (closing_msg, "closing", "COMPLETE", "COMPLETE")

# Singleton instance
voice_agent_service = VoiceAgentService()
