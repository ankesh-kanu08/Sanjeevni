from typing import List, Dict, Any
import re
from app.models.schemas import (
    CheckInQuestion,
    DiseaseQuestionProtocolRequest,
    DiseaseQuestionProtocolResponse,
)

class DiseaseQuestionEngine:
    """
    AI Clinical Question Protocol Engine
    Trained to generate personalized, disease-specific voice check-in protocols
    based on the patient's post-discharge diagnosis and clinical profile.
    """

    def __init__(self) -> None:
        pass

    def classify_disease_category(self, diagnosis: str, comorbidities: List[str] = None) -> str:
        text = (diagnosis or "").lower()
        if comorbidities:
            text += " " + " ".join(comorbidities).lower()

        # 1. Respiratory diseases
        if re.search(r'\b(pneumonia|copd|asthma|bronchitis|pulmonary|lung|respiratory|dyspnea|swas|infiltrate)\b', text):
            return "RESPIRATORY"

        # 2. Cardiovascular diseases
        if re.search(r'\b(heart|cardiac|chf|congestive|failure|hypertension|bp|infarction|mi|angina|cad|coronary|arrhythmia|edema)\b', text):
            return "CARDIAC"

        # 3. Post-surgical recovery
        if re.search(r'\b(post|surgery|surgical|cholecystectomy|appendectomy|hernia|laparoscopic|operation|incision|wound|stitches|resection|arthroplasty)\b', text):
            return "POST_SURGICAL"

        # 4. Metabolic / Renal diseases
        if re.search(r'\b(diabetes|diabetic|sugar|ckd|renal|kidney|nephro)\b', text):
            return "METABOLIC_RENAL"

        return "GENERAL"

    def generate_protocol(self, request: DiseaseQuestionProtocolRequest) -> DiseaseQuestionProtocolResponse:
        category = self.classify_disease_category(request.diagnosis, request.comorbidities)
        name = request.patient_name or "मरीज"

        if category == "RESPIRATORY":
            return DiseaseQuestionProtocolResponse(
                disease_category="RESPIRATORY",
                diagnosis=request.diagnosis,
                protocol_name="Respiratory & Pneumonia Care Protocol",
                questions=[
                    CheckInQuestion(
                        id="resp_001_greeting",
                        category="greeting",
                        text_hi=f"नमस्ते {name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपके फेफड़ों और सांस की तबीयत कैसी लग रही है? कृपया बोल कर बताएं।",
                        text_en=f"Hello {name}. I am your Sanjeevni care companion. How are you feeling today with your breathing and chest?",
                        criticality="routine",
                        expected_symptoms=["fatigue", "general_weakness"]
                    ),
                    CheckInQuestion(
                        id="resp_002_breathlessness",
                        category="breathlessness",
                        text_hi="क्या आपको सांस लेने में कोई तकलीफ हो रही है, या थोड़ा भी चलने-फिरने पर सांस फूल रही है?",
                        text_en="Are you experiencing any shortness of breath, difficulty breathing, or does your breath get heavy when walking?",
                        criticality="critical",
                        expected_symptoms=["breathlessness", "shortness_of_breath"]
                    ),
                    CheckInQuestion(
                        id="resp_003_cough_phlegm",
                        category="cough_sputum",
                        text_hi="क्या आपको खांसी आ रही है, बलगम का रंग पीला या हरा लग रहा है, या सीने में सांस लेते समय दर्द है?",
                        text_en="Do you have a cough, yellowish or greenish phlegm, or any chest pain when breathing in?",
                        criticality="warning",
                        expected_symptoms=["cough", "phlegm", "chest_pain"]
                    ),
                    CheckInQuestion(
                        id="resp_004_fever_vitals",
                        category="fever_vitals",
                        text_hi="क्या आपको कंपकंपी के साथ बुखार लग रहा है, और क्या आपने आज पल्स ऑक्सीमीटर से अपना ऑक्सीजन चेक किया है?",
                        text_en="Do you feel any fever or chills, and did you measure your oxygen (SpO₂) level with a pulse oximeter today?",
                        criticality="warning",
                        expected_symptoms=["fever", "chills"]
                    ),
                    CheckInQuestion(
                        id="resp_005_medication",
                        category="medication",
                        text_hi="क्या आपने आज डॉक्टर द्वारा दी गई सभी एंटीबायोटिक और सांस की दवाइयाँ समय पर ले ली हैं?",
                        text_en="Did you take all your prescribed respiratory medications and antibiotics on time today?",
                        criticality="routine",
                        expected_symptoms=[]
                    ),
                    CheckInQuestion(
                        id="resp_006_closing",
                        category="closing",
                        text_hi="धन्यवाद। आपकी सांस और फेफड़ों की संपूर्ण स्थिति दर्ज कर ली गई है और डॉक्टर व स्वास्थ्य टीम को भेज दी गई है। आप कृपया आराम करें।",
                        text_en="Thank you. Your respiratory health data has been recorded and shared with your clinical team. Please rest well.",
                        criticality="routine",
                        expected_symptoms=[]
                    )
                ]
            )

        elif category == "CARDIAC":
            return DiseaseQuestionProtocolResponse(
                disease_category="CARDIAC",
                diagnosis=request.diagnosis,
                protocol_name="Congestive Heart Failure & Cardiovascular Protocol",
                questions=[
                    CheckInQuestion(
                        id="card_001_greeting",
                        category="greeting",
                        text_hi=f"नमस्ते {name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपके दिल और शरीर की तबीयत कैसी लग रही है? कृपया बोल कर बताएं।",
                        text_en=f"Hello {name}. I am your Sanjeevni care companion. How are you feeling today with your heart and energy?",
                        criticality="routine",
                        expected_symptoms=["fatigue", "weakness"]
                    ),
                    CheckInQuestion(
                        id="card_002_edema",
                        category="pedal_edema",
                        text_hi="क्या आज आपने अपने दोनों पैरों, पंजों या टखनों में कोई सूजन या भारीपन देखा है?",
                        text_en="Have you noticed any swelling, puffiness, or heaviness in your feet, ankles, or legs today?",
                        criticality="critical",
                        expected_symptoms=["pedal_edema", "swelling"]
                    ),
                    CheckInQuestion(
                        id="card_003_orthopnea",
                        category="orthopnea",
                        text_hi="क्या आपको बिस्तर पर सीधे लेटते समय सांस लेने में तकलीफ होती है, या सोने के लिए तकिया ऊंचा करना पड़ता है?",
                        text_en="Do you feel breathless when lying flat in bed, or do you need extra pillows to breathe easily at night?",
                        criticality="critical",
                        expected_symptoms=["orthopnea", "breathlessness"]
                    ),
                    CheckInQuestion(
                        id="card_004_vitals_palpitation",
                        category="vitals_palpitation",
                        text_hi="क्या आपको सीने में भारीपन, दिल की धड़कन तेज होना या चक्कर जैसा लग रहा है, और क्या ब्लड प्रेशर नापा है?",
                        text_en="Are you experiencing any chest heaviness, rapid heartbeat, or dizziness, and did you check your blood pressure?",
                        criticality="warning",
                        expected_symptoms=["palpitation", "chest_pain", "dizziness"]
                    ),
                    CheckInQuestion(
                        id="card_005_medication_fluids",
                        category="medication_fluids",
                        text_hi="क्या आपने अपनी पेशाब बढ़ाने वाली (डाययूरेटिक) और ब्लड प्रेशर की सभी दवाइयाँ समय पर ली हैं, और पानी सीमित रखा है?",
                        text_en="Did you take all your prescribed heart, blood pressure, and diuretic medicines on time, and follow your daily fluid limit?",
                        criticality="routine",
                        expected_symptoms=[]
                    ),
                    CheckInQuestion(
                        id="card_006_closing",
                        category="closing",
                        text_hi="धन्यवाद। आपके हृदय स्वास्थ्य और सूजन की जानकारी दर्ज कर ली गई है और डॉक्टर व आशा कार्यकर्ता को भेज दी गई है। कृपया आराम करें।",
                        text_en="Thank you. Your cardiac health and fluid status have been recorded and sent to your doctor and care team. Please rest comfortably.",
                        criticality="routine",
                        expected_symptoms=[]
                    )
                ]
            )

        elif category == "POST_SURGICAL":
            return DiseaseQuestionProtocolResponse(
                disease_category="POST_SURGICAL",
                diagnosis=request.diagnosis,
                protocol_name="Post-Surgical & Wound Recovery Protocol",
                questions=[
                    CheckInQuestion(
                        id="surg_001_greeting",
                        category="greeting",
                        text_hi=f"नमस्ते {name} जी। मैं आपकी संजीवनी केयर साथी हूँ। ऑपरेशन के बाद आज आपकी तबीयत और ताकत कैसी लग रही है?",
                        text_en=f"Hello {name}. I am your Sanjeevni care companion. How is your recovery and strength feeling today after your surgery?",
                        criticality="routine",
                        expected_symptoms=["fatigue", "general_weakness"]
                    ),
                    CheckInQuestion(
                        id="surg_002_incision_pain",
                        category="incision_pain",
                        text_hi="क्या ऑपरेशन के चीरे या टांकों की जगह तेज दर्द, लालिमा, सूजन, या कोई पानी या मवाद बह रहा है?",
                        text_en="Is there any severe pain, redness, swelling, or any watery or pus discharge from your surgical stitches or incision?",
                        criticality="critical",
                        expected_symptoms=["surgical_wound_pain", "wound_discharge", "pain"]
                    ),
                    CheckInQuestion(
                        id="surg_003_fever",
                        category="fever",
                        text_hi="क्या आपको कंपकंपी के साथ बुखार लग रहा है, या शरीर गर्म महसूस हो रहा है?",
                        text_en="Do you have any fever, chills, or does your body feel unusually hot or clammy?",
                        criticality="warning",
                        expected_symptoms=["fever", "chills"]
                    ),
                    CheckInQuestion(
                        id="surg_004_diet_bowel",
                        category="diet_bowel",
                        text_hi="क्या आप हल्का खाना खा पा रहे हैं, उल्टी या मतली तो नहीं है, और क्या पेट साफ हो रहा है?",
                        text_en="Are you able to eat soft food, is there any nausea or vomiting, and are your bowel movements normal?",
                        criticality="warning",
                        expected_symptoms=["nausea", "vomiting", "bowel_issue"]
                    ),
                    CheckInQuestion(
                        id="surg_005_medication",
                        category="medication",
                        text_hi="क्या आपने अपने ऑपरेशन के बाद दी गई एंटीबायोटिक और दर्द निवारक दवाइयाँ समय पर ली हैं?",
                        text_en="Did you take your prescribed post-surgical antibiotics and pain medications on time today?",
                        criticality="routine",
                        expected_symptoms=[]
                    ),
                    CheckInQuestion(
                        id="surg_006_closing",
                        category="closing",
                        text_hi="धन्यवाद। आपकी सर्जरी के बाद की स्थिति दर्ज कर ली गई है और सर्जिकल टीम को भेज दी गई है। चीरे को सूखा रखें और आराम करें।",
                        text_en="Thank you. Your post-surgical recovery details have been recorded and shared with your surgical team. Please rest well.",
                        criticality="routine",
                        expected_symptoms=[]
                    )
                ]
            )

        elif category == "METABOLIC_RENAL":
            return DiseaseQuestionProtocolResponse(
                disease_category="METABOLIC_RENAL",
                diagnosis=request.diagnosis,
                protocol_name="Metabolic & Renal Care Protocol",
                questions=[
                    CheckInQuestion(
                        id="meta_001_greeting",
                        category="greeting",
                        text_hi=f"नमस्ते {name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज आपकी सेहत और कमजोरी कैसी लग रही है? कृपया बताएं।",
                        text_en=f"Hello {name}. I am your Sanjeevni care companion. How are you feeling today regarding your overall energy and health?",
                        criticality="routine",
                        expected_symptoms=["fatigue", "weakness"]
                    ),
                    CheckInQuestion(
                        id="meta_002_hypoglycemia_dizziness",
                        category="hypoglycemia_dizziness",
                        text_hi="क्या आपको चक्कर आना, आंखों के आगे अंधेरा, कंपकंपी, या बहुत ज्यादा पसीना या प्यास महसूस हो रही है?",
                        text_en="Are you experiencing any dizziness, blurred vision, trembling, profuse sweating, or excessive thirst?",
                        criticality="critical",
                        expected_symptoms=["dizziness", "excessive_thirst", "sweating"]
                    ),
                    CheckInQuestion(
                        id="meta_003_feet_wounds",
                        category="feet_wounds",
                        text_hi="क्या आपके पैरों या तलवों में कोई नया घाव, छाला, सुन्नपन या सूजन देखी है आपने?",
                        text_en="Have you noticed any new cuts, blisters, numbness, or swelling in your feet or legs?",
                        criticality="warning",
                        expected_symptoms=["foot_wound", "numbness", "swelling"]
                    ),
                    CheckInQuestion(
                        id="meta_004_vitals_urination",
                        category="urination_vitals",
                        text_hi="क्या पेशाब की मात्रा या रंग में कोई बदलाव है, और क्या आपने अपना ब्लड शुगर या ब्लड प्रेशर चेक किया?",
                        text_en="Is there any change in your urination frequency, and did you check your blood sugar or blood pressure today?",
                        criticality="warning",
                        expected_symptoms=["urinary_changes"]
                    ),
                    CheckInQuestion(
                        id="meta_005_medication",
                        category="medication",
                        text_hi="क्या आपने इंसुलिन या डॉक्टर द्वारा दी गई शुगर और बीपी की दवाइयाँ खाने के साथ समय पर ली हैं?",
                        text_en="Did you take all your insulin doses and prescribed diabetic and BP medicines on time with meals?",
                        criticality="routine",
                        expected_symptoms=[]
                    ),
                    CheckInQuestion(
                        id="meta_006_closing",
                        category="closing",
                        text_hi="धन्यवाद। आपकी शुगर और स्वास्थ्य की जानकारी दर्ज कर ली गई है और डॉक्टर को भेज दी गई है। कृपया समय पर पौष्टिक आहार लें।",
                        text_en="Thank you. Your metabolic health update has been recorded and forwarded to your doctor. Please maintain your diet.",
                        criticality="routine",
                        expected_symptoms=[]
                    )
                ]
            )

        # DEFAULT / GENERAL
        return DiseaseQuestionProtocolResponse(
            disease_category="GENERAL",
            diagnosis=request.diagnosis or "General Medical",
            protocol_name="Standard Post-Discharge Recovery Protocol",
            questions=[
                CheckInQuestion(
                    id="gen_001_greeting",
                    category="greeting",
                    text_hi=f"नमस्ते {name} जी। मैं आपकी संजीवनी केयर साथी हूँ। आज अस्पताल से छुट्टी के बाद आपकी तबीयत कैसी लग रही है? बोल कर बताएं।",
                    text_en=f"Hello {name}. I am your Sanjeevni care companion. How are you feeling today following your hospital discharge?",
                    criticality="routine",
                    expected_symptoms=["fatigue", "general_weakness"]
                ),
                CheckInQuestion(
                    id="gen_002_breathlessness",
                    category="breathlessness",
                    text_hi="क्या आपको सांस लेने में कोई तकलीफ हो रही है, या चलने फिरने पर सांस फूल रही है?",
                    text_en="Are you experiencing any shortness of breath, breathing difficulty, or chest tightness?",
                    criticality="warning",
                    expected_symptoms=["breathlessness"]
                ),
                CheckInQuestion(
                    id="gen_003_fever_pain",
                    category="fever_pain",
                    text_hi="क्या आपको बुखार, शरीर में तेज दर्द या कोई नई शारीरिक परेशानी महसूस हो रही है?",
                    text_en="Do you have any fever, severe body pain, or any new symptoms since discharge?",
                    criticality="warning",
                    expected_symptoms=["fever", "pain"]
                ),
                CheckInQuestion(
                    id="gen_004_worsening",
                    category="trend",
                    text_hi="क्या यह तकलीफ या कमजोरी कल के मुकाबले ज्यादा बढ़ गई है?",
                    text_en="Has this discomfort or weakness become worse compared to yesterday?",
                    criticality="warning",
                    expected_symptoms=["worsening"]
                ),
                CheckInQuestion(
                    id="gen_005_medication",
                    category="medication",
                    text_hi="क्या आपने आज अपने डॉक्टर द्वारा दी गई सभी दवाइयाँ समय पर ले ली हैं?",
                    text_en="Did you take all your prescribed medicines on time today?",
                    criticality="routine",
                    expected_symptoms=[]
                ),
                CheckInQuestion(
                    id="gen_006_closing",
                    category="closing",
                    text_hi="धन्यवाद। आपकी संपूर्ण स्वास्थ्य जानकारी दर्ज कर ली गई है और डॉक्टर व स्वास्थ्य टीम को भेज दी गई है। आप कृपया आराम करें।",
                    text_en="Thank you. Your health update has been recorded and shared with your clinical team. Please rest well.",
                    criticality="routine",
                    expected_symptoms=[]
                )
            ]
        )
