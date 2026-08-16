import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  collectionGroup 
} from "firebase/firestore";
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

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function toCsvRow(arr) {
  return arr.map(escapeCsv).join(",");
}

async function extractCompleteRealFirebaseDataset() {
  console.log("=======================================================================");
  console.log("       STARTING COMPLETE REAL FIREBASE DATASET EXTRACTION              ");
  console.log("=======================================================================\n");

  const email = `extractor_${Date.now()}@gigpath.app`;
  const password = "ExtractorPassword123!";
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  console.log(`[Auth Session] Authenticated as UID: ${cred.user.uid}`);

  // 1. Fetch Root Users
  const usersSnap = await getDocs(collection(db, "users"));
  const discoveredUserIds = new Set();
  usersSnap.docs.forEach(d => discoveredUserIds.add(d.id));

  // 2. Fetch Transactions across ALL users
  const txSnap = await getDocs(collectionGroup(db, "transactions"));
  const realTransactions = [];
  const txDocIds = new Set();
  const txUserIds = new Set();

  txSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const pathParts = docSnap.ref.path.split('/');
    const pathUid = pathParts[1];
    const realUid = data.uid || pathUid;
    const realDocId = docSnap.id;

    if (txDocIds.has(realDocId)) {
      console.warn(`WARNING: Duplicate Firebase Document ID detected for Transaction: ${realDocId}`);
    }
    txDocIds.add(realDocId);
    if (realUid) {
      txUserIds.add(realUid);
      discoveredUserIds.add(realUid);
    }

    realTransactions.push({
      user_id: realUid,
      id: realDocId,
      uid: realUid,
      title: data.title || data.goalTitle || "Untitled",
      amount: Number(data.amount) || 0,
      type: data.type || "expense",
      category: data.category || "General",
      date: data.date || (data.createdAt ? data.createdAt.slice(0, 10) : ""),
      method: data.method || "",
      status: data.status || "",
      note: data.note || "",
      createdAt: data.createdAt || ""
    });
  });

  // 3. Fetch Goals across ALL users
  const goalsSnap = await getDocs(collectionGroup(db, "goals"));
  const realGoals = [];
  const goalDocIds = new Set();
  const goalUserIds = new Set();

  goalsSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const pathParts = docSnap.ref.path.split('/');
    const pathUid = pathParts[1];
    const realUid = data.uid || pathUid;
    const realDocId = docSnap.id;

    if (goalDocIds.has(realDocId)) {
      console.warn(`WARNING: Duplicate Firebase Document ID detected for Goal: ${realDocId}`);
    }
    goalDocIds.add(realDocId);
    if (realUid) {
      goalUserIds.add(realUid);
      discoveredUserIds.add(realUid);
    }

    realGoals.push({
      user_id: realUid,
      id: realDocId,
      uid: realUid,
      goalTitle: data.goalTitle || data.title || "Untitled Goal",
      purpose: data.purpose || "",
      targetAmount: Number(data.targetAmount) || 0,
      alreadySaved: Number(data.alreadySaved ?? data.savedAmount) || 0,
      deadline: data.deadline || "",
      monthlyContribution: Number(data.monthlyContribution) || 0,
      priority: data.priority || "priority.medium",
      createdAt: data.createdAt || ""
    });
  });

  // 4. Fetch Recurring Expenses across ALL users
  const recSnap = await getDocs(collectionGroup(db, "recurringExpenses"));
  const realRecurring = [];
  const recDocIds = new Set();
  const recUserIds = new Set();

  recSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const pathParts = docSnap.ref.path.split('/');
    const pathUid = pathParts[1];
    const realUid = data.uid || pathUid;
    const realDocId = docSnap.id;

    if (recDocIds.has(realDocId)) {
      console.warn(`WARNING: Duplicate Firebase Document ID detected for Recurring Expense: ${realDocId}`);
    }
    recDocIds.add(realDocId);
    if (realUid) {
      recUserIds.add(realUid);
      discoveredUserIds.add(realUid);
    }

    realRecurring.push({
      user_id: realUid,
      id: realDocId,
      uid: realUid,
      title: data.title || "Untitled Recurring",
      category: data.category || "General",
      amount: Number(data.amount) || 0,
      nextCharge: data.nextCharge || "",
      frequency: data.frequency || "frequency.monthly",
      status: data.status || "status.scheduled",
      createdAt: data.createdAt || ""
    });
  });

  // Write CSV Files with trailing newlines
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Transactions
  const txHeader = ["user_id", "id", "uid", "title", "amount", "type", "category", "date", "method", "status", "note", "createdAt"];
  const txRows = [toCsvRow(txHeader)];
  realTransactions.forEach(t => {
    txRows.push(toCsvRow([t.user_id, t.id, t.uid, t.title, t.amount, t.type, t.category, t.date, t.method, t.status, t.note, t.createdAt]));
  });
  fs.writeFileSync(path.join(dataDir, "transactions_all_users.csv"), txRows.join("\n") + "\n", "utf8");

  // Goals
  const gHeader = ["user_id", "id", "uid", "goalTitle", "purpose", "targetAmount", "alreadySaved", "deadline", "monthlyContribution", "priority", "createdAt"];
  const gRows = [toCsvRow(gHeader)];
  realGoals.forEach(g => {
    gRows.push(toCsvRow([g.user_id, g.id, g.uid, g.goalTitle, g.purpose, g.targetAmount, g.alreadySaved, g.deadline, g.monthlyContribution, g.priority, g.createdAt]));
  });
  fs.writeFileSync(path.join(dataDir, "goals_all_users.csv"), gRows.join("\n") + "\n", "utf8");

  // Recurring Expenses
  const rHeader = ["user_id", "id", "uid", "title", "category", "amount", "nextCharge", "frequency", "status", "createdAt"];
  const rRows = [toCsvRow(rHeader)];
  realRecurring.forEach(r => {
    rRows.push(toCsvRow([r.user_id, r.id, r.uid, r.title, r.category, r.amount, r.nextCharge, r.frequency, r.status, r.createdAt]));
  });
  fs.writeFileSync(path.join(dataDir, "recurring_expenses_all_users.csv"), rRows.join("\n") + "\n", "utf8");

  console.log("=================== EXTRACTION & VERIFICATION SUMMARY ===================");
  console.log(`Total Real Users Discovered: ${discoveredUserIds.size}`);
  console.log(`Firestore Transactions: ${txSnap.docs.length} | Exported CSV Rows: ${realTransactions.length} | Unique Doc IDs: ${txDocIds.size}`);
  console.log(`Firestore Goals:        ${goalsSnap.docs.length} | Exported CSV Rows: ${realGoals.length} | Unique Doc IDs: ${goalDocIds.size}`);
  console.log(`Firestore Recurring:    ${recSnap.docs.length} | Exported CSV Rows: ${realRecurring.length} | Unique Doc IDs: ${recDocIds.size}`);
  console.log("=========================================================================\n");

  process.exit(0);
}

extractCompleteRealFirebaseDataset().catch(err => {
  console.error("FATAL EXTRACTION ERROR:", err);
  process.exit(1);
});
