async function testMinimalPayload() {
  console.log("--> TEST 2: Sending minimal valid JSON payload to POST http://127.0.0.1:8000/financial-analysis/user...");
  const response = await fetch("http://127.0.0.1:8000/financial-analysis/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "tPzibdnWM7ea6mRK28VpUR5Qqfz1",
      transactions: [],
      goals: [],
      recurringExpenses: []
    })
  });

  const data = await response.json();
  console.log("TEST 2 Status Code:", response.status);
  console.log("TEST 2 Response Payload:", JSON.stringify(data, null, 2));
}

testMinimalPayload();
