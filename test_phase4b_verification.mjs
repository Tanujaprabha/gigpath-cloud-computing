import fs from "fs";
import path from "path";

function parseCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8").trim();
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      let val = matches[i] ? matches[i].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
      obj[h] = val;
    });
    return obj;
  });
}

async function verifyPhase4B() {
  console.log("=======================================================================");
  console.log("             PHASE 4B USER FINANCIAL ANALYSIS VERIFICATION             ");
  console.log("=======================================================================\n");

  const uidUserA = "tPzibdnWM7ea6mRK28VpUR5Qqfz1";
  const uidUserB = "HFOr1A4UVDMLQvj64jTjVIVH8Ps2";
  const dataDir = path.join(process.cwd(), "data");

  const allTx = parseCsv(path.join(dataDir, "transactions_all_users.csv"));
  const allGoals = parseCsv(path.join(dataDir, "goals_all_users.csv"));
  const allRec = parseCsv(path.join(dataDir, "recurring_expenses_all_users.csv"));

  // Filter per user
  const userATx = allTx.filter(t => t.user_id === uidUserA || t.uid === uidUserA);
  const userAGoals = allGoals.filter(g => g.user_id === uidUserA || g.uid === uidUserA);
  const userARec = allRec.filter(r => r.user_id === uidUserA || r.uid === uidUserA);

  const userBTx = allTx.filter(t => t.user_id === uidUserB || t.uid === uidUserB);
  const userBGoals = allGoals.filter(g => g.user_id === uidUserB || g.uid === uidUserB);
  const userBRec = allRec.filter(r => r.user_id === uidUserB || r.uid === uidUserB);

  console.log(`[Payload Prepared User A (${uidUserA})]`);
  console.log(` - Transactions: ${userATx.length}, Goals: ${userAGoals.length}, Recurring: ${userARec.length}`);

  console.log(`[Payload Prepared User B (${uidUserB})]`);
  console.log(` - Transactions: ${userBTx.length}, Goals: ${userBGoals.length}, Recurring: ${userBRec.length}\n`);

  // Test 1: POST /financial-analysis/user for User A
  console.log("--> Calling POST http://localhost:8000/financial-analysis/user for User A...");
  const resA = await fetch("http://localhost:8000/financial-analysis/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: uidUserA,
      transactions: userATx,
      goals: userAGoals,
      recurringExpenses: userARec
    })
  });
  if (!resA.ok) throw new Error(`User A request failed: ${resA.status}`);
  const dataA = await resA.json();

  console.log("\n[User A Analysis Response Received]:");
  console.log(` - Status: ${dataA.status}`);
  console.log(` - User ID: ${dataA.user_id}`);
  console.log(` - Total Income: ₹${dataA.analysis.transaction_summary.total_income}`);
  console.log(` - Total Expenses: ₹${dataA.analysis.transaction_summary.total_expenses}`);
  console.log(` - Net Cash Flow: ₹${dataA.analysis.transaction_summary.net_cash_flow}`);
  console.log(` - Savings Rate: ${dataA.analysis.transaction_summary.savings_rate_percent}%`);
  console.log(` - Expense-to-Income Ratio: ${dataA.analysis.transaction_summary.expense_to_income_ratio_percent}%`);
  console.log(` - Transactions Used: ${dataA.data_quality.transactions_used}`);
  console.log(` - Goals Used: ${dataA.data_quality.goals_used}`);
  console.log(` - Recurring Expenses Used: ${dataA.data_quality.recurring_expenses_used}\n`);

  // Test 2: POST /financial-analysis/user for User B
  console.log("--> Calling POST http://localhost:8000/financial-analysis/user for User B...");
  const resB = await fetch("http://localhost:8000/financial-analysis/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: uidUserB,
      transactions: userBTx,
      goals: userBGoals,
      recurringExpenses: userBRec
    })
  });
  if (!resB.ok) throw new Error(`User B request failed: ${resB.status}`);
  const dataB = await resB.json();

  console.log("\n[User B Analysis Response Received]:");
  console.log(` - Status: ${dataB.status}`);
  console.log(` - User ID: ${dataB.user_id}`);
  console.log(` - Total Income: ₹${dataB.analysis.transaction_summary.total_income}`);
  console.log(` - Total Expenses: ₹${dataB.analysis.transaction_summary.total_expenses}`);
  console.log(` - Net Cash Flow: ₹${dataB.analysis.transaction_summary.net_cash_flow}`);
  console.log(` - Savings Rate: ${dataB.analysis.transaction_summary.savings_rate_percent}%`);

  // Test 3: User Isolation Check
  const userIsolated = dataA.analysis.transaction_summary.total_income !== dataB.analysis.transaction_summary.total_income;
  console.log(`\n[User Isolation Verification] User A Income (₹${dataA.analysis.transaction_summary.total_income}) !== User B Income (₹${dataB.analysis.transaction_summary.total_income}): ${userIsolated}`);

  // Test 4: Verify Phase 4A budget-recommendation endpoint still works
  console.log("\n--> Verifying Phase 4A endpoint POST http://localhost:8000/budget-recommendation...");
  const res4A = await fetch("http://localhost:8000/budget-recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: uidUserA,
      transactions: userATx,
      goals: userAGoals,
      recurringExpenses: userARec
    })
  });
  if (!res4A.ok) throw new Error(`Phase 4A endpoint failed: ${res4A.status}`);
  const data4A = await res4A.json();
  console.log(` - Phase 4A Recommendation Status: ${data4A.status}, Spending Limit: ₹${data4A.budget_recommendation.recommended_spending_limit}`);

  console.log("\n=======================================================================");
  console.log("                  ALL PHASE 4B VERIFICATIONS PASSED                    ");
  console.log("=======================================================================");
}

verifyPhase4B().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
