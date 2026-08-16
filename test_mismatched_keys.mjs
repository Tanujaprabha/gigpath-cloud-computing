async function testMismatchedKeys() {
  console.log("Testing POST /financial-analysis/user with heterogeneous key payload...");
  const response = await fetch("http://localhost:8000/financial-analysis/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "testUserHetero",
      transactions: [
        { user_id: "testUserHetero", id: "tx1", title: "Gig Payout", amount: 5000, type: "income", date: "2026-08-01" },
        { user_id: "testUserHetero", id: "tx2", title: "Fuel Expense", amount: 400, type: "expense", category: "Fuel", date: "2026-08-02", note: "Extra note field" },
        { user_id: "testUserHetero", id: "tx3", title: "Maintenance", amount: 1200, type: "expense", category: "Maintenance", date: "2026-08-03", method: "UPI", status: "completed", customTag: "tag123" }
      ],
      goals: [
        { user_id: "testUserHetero", id: "g1", goalTitle: "Emergency Fund", targetAmount: 50000, alreadySaved: 10000 }
      ],
      recurringExpenses: []
    })
  });

  const data = await response.json();
  console.log("Response status:", response.status);
  console.log("Response payload:", JSON.stringify(data, null, 2));
}

testMismatchedKeys();
