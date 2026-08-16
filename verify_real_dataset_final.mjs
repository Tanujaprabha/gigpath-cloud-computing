import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, collectionGroup } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = {
    apiKey: "AIzaSyDdluyClUswF1JCJQhlMXr01qi6Sy6jAi0",
    authDomain: "gigpath.firebaseapp.com",
    projectId: "gigpath",
    storageBucket: "gigpath.firebasestorage.app",
    messagingSenderId: "594068319655",
    appId: "1:594068319655:web:6c068158465e6a54ad1a82",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function parseCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content) return [];
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];
  // Skip header
  const dataLines = lines.slice(1);
  return dataLines.map(line => {
    // Simple regex CSV parser for quoted fields
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    return matches.map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
  });
}

async function runFinalVerification() {
  console.log("=======================================================================");
  console.log("             FINAL REAL-DATA VERIFICATION PROTOCOL                     ");
  console.log("=======================================================================\n");

  // 1. Authenticate with Firebase
  const email = `final_verifier_${Date.now()}@gigpath.app`;
  const password = "VerifierPassword123!";
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  console.log(`[Firebase Auth] Authenticated Session UID: ${cred.user.uid}`);

  // 2. Query Firebase Firestore Counts
  const usersSnap = await getDocs(collection(db, "users"));
  const fbUsersSet = new Set(usersSnap.docs.map(d => d.id));

  const txSnap = await getDocs(collectionGroup(db, "transactions"));
  const fbTxDocIds = new Set();
  txSnap.docs.forEach(d => {
    fbTxDocIds.add(d.id);
    const pathUid = d.ref.path.split('/')[1];
    if (pathUid) fbUsersSet.add(pathUid);
  });

  const goalsSnap = await getDocs(collectionGroup(db, "goals"));
  const fbGoalDocIds = new Set();
  goalsSnap.docs.forEach(d => {
    fbGoalDocIds.add(d.id);
    const pathUid = d.ref.path.split('/')[1];
    if (pathUid) fbUsersSet.add(pathUid);
  });

  const recSnap = await getDocs(collectionGroup(db, "recurringExpenses"));
  const fbRecDocIds = new Set();
  recSnap.docs.forEach(d => {
    fbRecDocIds.add(d.id);
    const pathUid = d.ref.path.split('/')[1];
    if (pathUid) fbUsersSet.add(pathUid);
  });

  const totalFbUsers = fbUsersSet.size;
  const totalFbTx = txSnap.docs.length;
  const totalFbGoals = goalsSnap.docs.length;
  const totalFbRec = recSnap.docs.length;

  console.log("[Firebase Real Counts]");
  console.log(` - Total Actual Users Discovered: ${totalFbUsers}`);
  console.log(` - Total Transaction Documents:   ${totalFbTx}`);
  console.log(` - Total Goal Documents:          ${totalFbGoals}`);
  console.log(` - Total Recurring Documents:     ${totalFbRec}\n`);

  // 3. Read CSV Files
  const dataDir = path.join(process.cwd(), "data");
  const txCsvPath = path.join(dataDir, "transactions_all_users.csv");
  const goalsCsvPath = path.join(dataDir, "goals_all_users.csv");
  const recCsvPath = path.join(dataDir, "recurring_expenses_all_users.csv");

  const txRows = parseCsvRows(txCsvPath);
  const goalsRows = parseCsvRows(goalsCsvPath);
  const recRows = parseCsvRows(recCsvPath);

  // Extract unique user_ids & doc IDs from CSVs
  const txCsvUserIds = new Set(txRows.map(r => r[0]));
  const txCsvDocIds = new Set(txRows.map(r => r[1]));

  const goalsCsvUserIds = new Set(goalsRows.map(r => r[0]));
  const goalsCsvDocIds = new Set(goalsRows.map(r => r[1]));

  const recCsvUserIds = new Set(recRows.map(r => r[0]));
  const recCsvDocIds = new Set(recRows.map(r => r[1]));

  console.log("[CSV Record Counts & Unique Identifiers]");
  console.log(` - transactions_all_users.csv : ${txRows.length} rows | Unique user_ids: ${txCsvUserIds.size} | Unique doc IDs: ${txCsvDocIds.size}`);
  console.log(` - goals_all_users.csv        : ${goalsRows.length} rows | Unique user_ids: ${goalsCsvUserIds.size} | Unique doc IDs: ${goalsCsvDocIds.size}`);
  console.log(` - recurring_expenses_all_users.csv: ${recRows.length} rows | Unique user_ids: ${recCsvUserIds.size} | Unique doc IDs: ${recCsvDocIds.size}\n`);

  // 4. Validate Duplicate Firestore Document IDs
  const txDupDocIds = txRows.length - txCsvDocIds.size;
  const goalsDupDocIds = goalsRows.length - goalsCsvDocIds.size;
  const recDupDocIds = recRows.length - recCsvDocIds.size;

  console.log("[Duplicate Document ID Check]");
  console.log(` - Transactions duplicate Doc IDs: ${txDupDocIds}`);
  console.log(` - Goals duplicate Doc IDs:        ${goalsDupDocIds}`);
  console.log(` - Recurring duplicate Doc IDs:    ${recDupDocIds}\n`);

  // 5. Compare Firebase vs CSV
  const txDiff = Math.abs(totalFbTx - txRows.length);
  const goalsDiff = Math.abs(totalFbGoals - goalsRows.length);
  const recDiff = Math.abs(totalFbRec - recRows.length);

  const txStatus = (txDiff === 0 && txDupDocIds === 0) ? "MATCHED" : "MISMATCH";
  const goalsStatus = (goalsDiff === 0 && goalsDupDocIds === 0) ? "MATCHED" : "MISMATCH";
  const recStatus = (recDiff === 0 && recDupDocIds === 0) ? "MATCHED" : "MISMATCH";

  console.log("=================== VERIFICATION TABLE ===================");
  console.log(`Dataset            | Firebase records | CSV records | Difference | Status`);
  console.log(`-------------------|------------------|-------------|------------|---------`);
  console.log(`Transactions       | ${String(totalFbTx).padEnd(16)} | ${String(txRows.length).padEnd(11)} | ${String(txDiff).padEnd(10)} | ${txStatus}`);
  console.log(`Goals              | ${String(totalFbGoals).padEnd(16)} | ${String(goalsRows.length).padEnd(11)} | ${String(goalsDiff).padEnd(10)} | ${goalsStatus}`);
  console.log(`Recurring Expenses | ${String(totalFbRec).padEnd(16)} | ${String(recRows.length).padEnd(11)} | ${String(recDiff).padEnd(10)} | ${recStatus}`);
  console.log("==========================================================");

  const overallPass = (txStatus === "MATCHED") && (goalsStatus === "MATCHED") && (recStatus === "MATCHED");

  if (overallPass) {
    console.log("\nVERIFICATION RESULT: PHASE 1 REAL FIREBASE DATA: PASS");
  } else {
    console.log("\nVERIFICATION RESULT: PHASE 1 REAL FIREBASE DATA: FAIL");
  }

  process.exit(0);
}

runFinalVerification().catch(err => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
