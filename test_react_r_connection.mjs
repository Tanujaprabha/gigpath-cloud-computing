import fs from "fs";
import path from "path";

// Helper to parse CSV rows into JS objects
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

async function testReactToRConnection() {
  console.log("=======================================================================");
  console.log("      TESTING REACT -> R PLUMBER API CONNECTION (PHASE 4A)             ");
  console.log("=======================================================================\n");

  const targetUid = "tPzibdnWM7ea6mRK28VpUR5Qqfz1";
  const dataDir = path.join(process.cwd(), "data");

  const allTx = parseCsv(path.join(dataDir, "transactions_all_users.csv"));
  const allGoals = parseCsv(path.join(dataDir, "goals_all_users.csv"));
  const allRec = parseCsv(path.join(dataDir, "recurring_expenses_all_users.csv"));

  const userTx = allTx.filter(t => t.user_id === targetUid || t.uid === targetUid);
  const userGoals = allGoals.filter(g => g.user_id === targetUid || g.uid === targetUid);
  const userRec = allRec.filter(r => r.user_id === targetUid || r.uid === targetUid);

  console.log(`[React Payload Prepared] Current Authenticated User UID: ${targetUid}`);
  console.log(` - Transactions sent:         ${userTx.length}`);
  console.log(` - Goals sent:                ${userGoals.length}`);
  console.log(` - Recurring Expenses sent:   ${userRec.length}\n`);

  // Post to R Plumber API
  try {
    const response = await fetch("http://localhost:8000/budget-recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: targetUid,
        transactions: userTx,
        goals: userGoals,
        recurringExpenses: userRec
      })
    });

    if (!response.ok) {
      console.error(`HTTP ERROR ${response.status}: ${await response.text()}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log("=================== R API RESPONSE RECEIVED BY REACT ===================");
    console.log(JSON.stringify(data, null, 2));
    console.log("=======================================================================\n");

    console.log("[Verification Checklist]");
    console.log(` - status:                      ${data.status}`);
    console.log(` - user_id:                     ${data.user_id}`);
    console.log(` - income_reference:            ₹${data.budget_recommendation.income_reference}`);
    console.log(` - essential_expenses:          ₹${data.budget_recommendation.essential_expenses}`);
    console.log(` - discretionary_expenses:      ₹${data.budget_recommendation.discretionary_expenses}`);
    console.log(` - goal_allocation:             ₹${data.budget_recommendation.goal_allocation}`);
    console.log(` - recommended_savings:         ₹${data.budget_recommendation.recommended_savings}`);
    console.log(` - recommended_spending_limit:  ₹${data.budget_recommendation.recommended_spending_limit}`);
    console.log(` - data_quality transactions:   ${data.data_quality.transactions_used}`);
    console.log(` - data_quality goals:          ${data.data_quality.goals_used}`);
    console.log(` - data_quality recurring:      ${data.data_quality.recurring_expenses_used}\n`);

  } catch (err) {
    console.error("Failed to connect to R server:", err.message);
    process.exit(1);
  }
}

testReactToRConnection();
