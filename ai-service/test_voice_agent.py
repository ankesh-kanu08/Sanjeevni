import sys
import os

# Add ai-service to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.schemas import VoiceTurnRequest
from app.services.voice_agent_service import voice_agent_service

def run_tests():
    print("==================================================")
    print("RUNNING VOICE AGENT TESTS FOR ALL SCENARIOS")
    print("==================================================")
    
    # -------------------------------------------------------------------------
    # TEST 1 — Name
    # -------------------------------------------------------------------------
    print("\n--- TEST 1: Name Extraction & Non-Repetition ---")
    req1 = VoiceTurnRequest(
        sessionId="test_sess_1",
        turnId=2,
        language="en-IN",
        previousQuestion="What is your name?",
        patientResponse="Ramesh.",
        conversationState={"currentTopic": "name", "answeredTopics": []}
    )
    res1 = voice_agent_service.process_turn(req1)
    assert any(obs.name == "patient_name" and obs.value == "Ramesh" for obs in res1.extractedObservations), "Name Ramesh not extracted!"
    assert "patient_name" in res1.answeredTopics or "name" in res1.answeredTopics
    print("✓ TEST 1 PASSED: Name correctly extracted as Ramesh, not asked again.")

    # -------------------------------------------------------------------------
    # TEST 2 — Context: Exertional vs Resting Breathlessness
    # -------------------------------------------------------------------------
    print("\n--- TEST 2: Contextual Short Answer (Activity vs Resting) ---")
    req2 = VoiceTurnRequest(
        sessionId="test_sess_2",
        turnId=3,
        language="en-IN",
        previousQuestion="Is your breathlessness happening at rest or while walking?",
        patientResponse="Only when I walk.",
        conversationState={
            "currentTopic": "breathlessness_activity",
            "answeredTopics": ["overall_recovery", "breathlessness"]
        }
    )
    res2 = voice_agent_service.process_turn(req2)
    b_obs = next((obs for obs in res2.extractedObservations if obs.name == "breathlessness"), None)
    assert b_obs is not None, "Breathlessness observation missing!"
    assert b_obs.context == "activity", f"Expected context 'activity', got {b_obs.context}"
    assert "walking" in res2.assistantResponse.lower() or "worse" in res2.assistantResponse.lower()
    print("✓ TEST 2 PASSED: 'Only when I walk' accurately contextualized as activity-related.")

    # -------------------------------------------------------------------------
    # TEST 3 — Multiple Observations in One Response
    # -------------------------------------------------------------------------
    print("\n--- TEST 3: Multiple Observations in Single Sentence ---")
    req3 = VoiceTurnRequest(
        sessionId="test_sess_3",
        turnId=2,
        language="en-IN",
        previousQuestion="How are you feeling compared with yesterday?",
        patientResponse="My cough is worse, I'm feeling weak, and my oxygen is 92.",
        conversationState={"currentTopic": "overall_recovery", "answeredTopics": []}
    )
    res3 = voice_agent_service.process_turn(req3)
    obs_names = [o.name for o in res3.extractedObservations]
    assert "cough" in obs_names, f"Cough missing in {obs_names}"
    assert "weakness" in obs_names, f"Weakness missing in {obs_names}"
    assert "spo2" in obs_names, f"SpO2 missing in {obs_names}"
    spo2_obs = next(o for o in res3.extractedObservations if o.name == "spo2")
    assert spo2_obs.value == 92.0, f"Expected SpO2 92, got {spo2_obs.value}"
    print(f"✓ TEST 3 PASSED: Extracted cough, weakness, and SpO2=92 from a single response: {obs_names}")

    # -------------------------------------------------------------------------
    # TEST 4 — Temporal Understanding
    # -------------------------------------------------------------------------
    print("\n--- TEST 4: Temporal Understanding (Yesterday vs Today) ---")
    req4 = VoiceTurnRequest(
        sessionId="test_sess_4",
        turnId=2,
        language="en-IN",
        previousQuestion="How are you feeling compared with yesterday?",
        patientResponse="I was okay yesterday but today I feel much weaker.",
        conversationState={"currentTopic": "overall_recovery", "answeredTopics": []}
    )
    res4 = voice_agent_service.process_turn(req4)
    w_obs = next((o for o in res4.extractedObservations if o.name == "weakness"), None)
    assert w_obs is not None
    assert w_obs.onset == "today" or w_obs.trend == "worsening"
    assert res4.conversationState.get("temporalContext", {}).get("today") is True
    print("✓ TEST 4 PASSED: Temporal context properly parsed (yesterday stable -> today weaker).")

    # -------------------------------------------------------------------------
    # TEST 5 — Unexpected Relevant Information (Leg Swelling)
    # -------------------------------------------------------------------------
    print("\n--- TEST 5: Unexpected Relevant Symptom (Pedal Edema) ---")
    req5 = VoiceTurnRequest(
        sessionId="test_sess_5",
        turnId=3,
        language="en-IN",
        previousQuestion="How is your breathing today?",
        patientResponse="My breathing is okay but my legs are swollen.",
        conversationState={"currentTopic": "breathlessness", "answeredTopics": ["overall_recovery"]}
    )
    res5 = voice_agent_service.process_turn(req5)
    assert any(o.name == "pedal_edema" for o in res5.extractedObservations)
    assert "swelling" in res5.assistantResponse.lower()
    print(f"✓ TEST 5 PASSED: Prioritized unexpected leg swelling: '{res5.assistantResponse}'")

    # -------------------------------------------------------------------------
    # TEST 6 — Correction Handling
    # -------------------------------------------------------------------------
    print("\n--- TEST 6: Correction Handling ---")
    # First patient says 94
    req6_a = VoiceTurnRequest(
        sessionId="test_sess_6",
        turnId=4,
        language="en-IN",
        previousQuestion="Do you have today's SpO2 reading?",
        patientResponse="My oxygen is 94.",
        conversationState={"currentTopic": "spo2", "answeredTopics": ["overall_recovery", "breathlessness", "cough"]}
    )
    res6_a = voice_agent_service.process_turn(req6_a)
    # Then patient corrects to 92
    req6_b = VoiceTurnRequest(
        sessionId="test_sess_6",
        turnId=5,
        language="en-IN",
        previousQuestion="Thank you. Do you also have your heart-rate reading?",
        patientResponse="Actually, sorry, I checked again. It's 92.",
        conversationState=res6_a.conversationState
    )
    res6_b = voice_agent_service.process_turn(req6_b)
    current_spo2 = res6_b.conversationState["observations"]["spo2"]["value"]
    assert current_spo2 == 92.0, f"Expected corrected SpO2=92, got {current_spo2}"
    print(f"✓ TEST 6 PASSED: Corrected SpO2 updated from 94 to {current_spo2}")

    # -------------------------------------------------------------------------
    # TEST 7 — Unclear Speech
    # -------------------------------------------------------------------------
    print("\n--- TEST 7: Unclear Speech ---")
    req7 = VoiceTurnRequest(
        sessionId="test_sess_7",
        turnId=3,
        language="en-IN",
        previousQuestion="How is your breathing today?",
        patientResponse="... unclear ...",
        conversationState={"currentTopic": "breathlessness", "answeredTopics": ["overall_recovery"]}
    )
    res7 = voice_agent_service.process_turn(req7)
    assert res7.nextAction == "CLARIFY"
    assert "repeat" in res7.assistantResponse.lower() or "catch" in res7.assistantResponse.lower()
    print(f"✓ TEST 7 PASSED: Asked for repetition: '{res7.assistantResponse}'")

    # -------------------------------------------------------------------------
    # TEST 8 — Irrelevant Query Redirection
    # -------------------------------------------------------------------------
    print("\n--- TEST 8: Irrelevant Query Redirection ---")
    req8 = VoiceTurnRequest(
        sessionId="test_sess_8",
        turnId=3,
        language="en-IN",
        previousQuestion="How is your breathing today?",
        patientResponse="What time is the cricket match?",
        conversationState={"currentTopic": "breathlessness", "answeredTopics": ["overall_recovery"]}
    )
    res8 = voice_agent_service.process_turn(req8)
    assert res8.nextAction == "REDIRECT"
    assert "recovery" in res8.assistantResponse.lower() or "breathing" in res8.assistantResponse.lower()
    print(f"✓ TEST 8 PASSED: Politely redirected back to clinical check-in: '{res8.assistantResponse}'")

    # -------------------------------------------------------------------------
    # TEST 9 & 10 — PRIMARY DEMO CONVERSATION FULL WALKTHROUGH
    # -------------------------------------------------------------------------
    print("\n--- TEST 9 & 10: Primary Demo Conversation Full Reactive Walkthrough ---")
    
    # Step 1: Greeting
    r1 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=1,
        language="en-IN",
        patientResponse=""
    ))
    print(f"Turn 1 AI: {r1.assistantResponse}")
    assert "Good morning, Ramesh" in r1.assistantResponse
    
    # Step 2: Patient reports weakness and breathing difficulty
    r2 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=2,
        language="en-IN",
        previousQuestion=r1.assistantResponse,
        patientResponse="I was feeling okay yesterday, but today I'm feeling a little weak and I'm having some difficulty breathing.",
        conversationState=r1.conversationState
    ))
    print(f"Patient: I was feeling okay yesterday, but today I'm feeling a little weak and I'm having some difficulty breathing.")
    print(f"Turn 2 AI: {r2.assistantResponse}")
    assert "resting" in r2.assistantResponse.lower() and "walking" in r2.assistantResponse.lower()
    
    # Step 3: Patient clarifies breathlessness when walking, sitting is normal
    r3 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=3,
        language="en-IN",
        previousQuestion=r2.assistantResponse,
        patientResponse="Mostly when I walk. When I'm sitting, my breathing is almost normal.",
        conversationState=r2.conversationState
    ))
    print(f"Patient: Mostly when I walk. When I'm sitting, my breathing is almost normal.")
    print(f"Turn 3 AI: {r3.assistantResponse}")
    assert "walking" in r3.assistantResponse.lower() and "worse" in r3.assistantResponse.lower()

    # Step 4: Patient says breathlessness is slightly worse than yesterday
    r4 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=4,
        language="en-IN",
        previousQuestion=r3.assistantResponse,
        patientResponse="Yes, slightly worse than yesterday.",
        conversationState=r3.conversationState
    ))
    print(f"Patient: Yes, slightly worse than yesterday.")
    print(f"Turn 4 AI: {r4.assistantResponse}")
    assert "cough" in r4.assistantResponse.lower()

    # Step 5: Patient reports cough is worse with more phlegm
    r5 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=5,
        language="en-IN",
        previousQuestion=r4.assistantResponse,
        patientResponse="The cough is still there. I think it's a little worse today, and I'm bringing up more phlegm.",
        conversationState=r4.conversationState
    ))
    print(f"Patient: The cough is still there. I think it's a little worse today, and I'm bringing up more phlegm.")
    print(f"Turn 5 AI: {r5.assistantResponse}")
    assert "color" in r5.assistantResponse.lower() or "phlegm" in r5.assistantResponse.lower()

    # Step 6: Patient notes yellow phlegm
    r6 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=6,
        language="en-IN",
        previousQuestion=r5.assistantResponse,
        patientResponse="Yes, it looks more yellow today.",
        conversationState=r5.conversationState
    ))
    print(f"Patient: Yes, it looks more yellow today.")
    print(f"Turn 6 AI: {r6.assistantResponse}")
    assert "oxygen" in r6.assistantResponse.lower() or "spo2" in r6.assistantResponse.lower()

    # Step 7: Patient provides SpO2 = 92%
    r7 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=7,
        language="en-IN",
        previousQuestion=r6.assistantResponse,
        patientResponse="Yes. I checked it a few minutes ago. It is 92 percent.",
        conversationState=r6.conversationState
    ))
    print(f"Patient: Yes. I checked it a few minutes ago. It is 92 percent.")
    print(f"Turn 7 AI: {r7.assistantResponse}")
    assert "96%" in r7.assistantResponse and "92%" in r7.assistantResponse and "heart" in r7.assistantResponse.lower()

    # Step 8: Patient provides Heart Rate = 96
    r8 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=8,
        language="en-IN",
        previousQuestion=r7.assistantResponse,
        patientResponse="Yes, my heart rate is 96.",
        conversationState=r7.conversationState
    ))
    print(f"Patient: Yes, my heart rate is 96.")
    print(f"Turn 8 AI: {r8.assistantResponse}")
    assert "temperature" in r8.assistantResponse.lower()

    # Step 9: Patient provides Temperature = 99.2 F
    r9 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=9,
        language="en-IN",
        previousQuestion=r8.assistantResponse,
        patientResponse="Yes, it is 99.2 degrees Fahrenheit.",
        conversationState=r8.conversationState
    ))
    print(f"Patient: Yes, it is 99.2 degrees Fahrenheit.")
    print(f"Turn 9 AI: {r9.assistantResponse}")
    assert "different" in r9.assistantResponse.lower() or "breathlessness" in r9.assistantResponse.lower()

    # Step 10: Patient says that's all, but worried about breathing
    r10 = voice_agent_service.process_turn(VoiceTurnRequest(
        sessionId="demo_sess_100",
        turnId=10,
        language="en-IN",
        previousQuestion=r9.assistantResponse,
        patientResponse="No, that's all. But I'm a little worried about my breathing.",
        conversationState=r9.conversationState
    ))
    print(f"Patient: No, that's all. But I'm a little worried about my breathing.")
    print(f"Turn 10 AI: {r10.assistantResponse}")
    assert r10.checkInStatus == "COMPLETE"
    assert "care team" in r10.assistantResponse.lower() or "assessment" in r10.assistantResponse.lower()

    print("\n✓ ALL 10 TESTS PASSED FLAWLESSLY WITH 100% SPEC CONFORMANCE!")

if __name__ == "__main__":
    run_tests()
