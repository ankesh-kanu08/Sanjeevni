import express from 'express';
import aiRoutes from './src/routes/ai.js';

const app = express();
app.use(express.json());
app.use('/api/ai', aiRoutes);

const server = app.listen(5099, async () => {
  try {
    console.log("Testing Backend AI Voice Check-in Turn Endpoint on port 5099...");

    // Test 1: Turn 1 Greeting
    const res1 = await fetch('http://localhost:5099/api/ai/voice-checkin/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test_node_session_1',
        turnId: 1,
        language: 'en-IN',
        patientResponse: ''
      })
    });
    const data1 = await res1.json();
    console.log("Turn 1 Assistant Response:", data1.assistantResponse);
    if (!data1.assistantResponse.includes("Ramesh")) {
      throw new Error("Turn 1 did not address Ramesh");
    }

    // Test 2: Duplicate Turn (Idempotency)
    const res1_dup = await fetch('http://localhost:5099/api/ai/voice-checkin/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test_node_session_1',
        turnId: 1,
        language: 'en-IN',
        patientResponse: ''
      })
    });
    const data1_dup = await res1_dup.json();
    if (data1_dup.assistantResponse !== data1.assistantResponse) {
      throw new Error("Idempotency check failed: responses differ");
    }
    console.log("✓ Idempotency verified: Duplicate turn returned identical cached response.");

    // Test 3: Turn 2 Patient reports symptoms
    const res2 = await fetch('http://localhost:5099/api/ai/voice-checkin/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test_node_session_1',
        turnId: 2,
        language: 'en-IN',
        previousQuestion: data1.assistantResponse,
        patientResponse: "I was feeling okay yesterday, but today I'm feeling a little weak and I'm having some difficulty breathing.",
        conversationState: data1.conversationState
      })
    });
    const data2 = await res2.json();
    console.log("Turn 2 Assistant Response:", data2.assistantResponse);
    if (!data2.assistantResponse.toLowerCase().includes("walking") && !data2.assistantResponse.toLowerCase().includes("resting")) {
      throw new Error("Turn 2 failed to branch into resting vs walking");
    }
    console.log("✓ Backend turn routing verified successfully!");

    server.close();
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    server.close();
    process.exit(1);
  }
});
