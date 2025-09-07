const testKnowledgeRetrieval = async () => {
  const response = await fetch('http://localhost:54321/functions/v1/ai-agent-handler', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Call': 'true',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  },
    body: JSON.stringify({
      agentId: '6340b410-00c5-4969-89a9-5e4b4006fd83',
      query: 'How much does Chattalyst cost and what integrations does it support?',
      sessionId: 'test-session-123',
      contactIdentifier: 'test-contact-456'
    })
  });
  
  const result = await response.json();
  console.log('Response Status:', response.status);
  console.log('Response Body:', JSON.stringify(result, null, 2));
};

testKnowledgeRetrieval().catch(console.error);