import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, collectionGroup } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDdluyClUswF1JCJQhlMXr01qi6Sy6jAi0",
    authDomain: "gigpath.firebaseapp.com",
    projectId: "gigpath",
    storageBucket: "gigpath.firebasestorage.app",
    messagingSenderId: "594068319655",
    appId: "1:594068319655:web:6c068158465e6a54ad1a82",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFetchAll() {
  console.log("=================== FIRESTORE MULTI-USER INSPECTION ===================");

  let userIds = new Set();
  let transactionsCount = 0;
  let goalsCount = 0;
  let recurringCount = 0;

  // 1. Check users collection
  try {
    const usersCol = collection(db, "users");
    const usersSnap = await getDocs(usersCol);
    console.log(`[users collection] Total user documents found: ${usersSnap.docs.length}`);
    usersSnap.docs.forEach(doc => {
      userIds.add(doc.id);
      console.log(` - User ID Document: ${doc.id}`);
    });
  } catch (err) {
    console.error("[users collection ERROR]:", err.message);
  }

  // 2. Check collectionGroup transactions
  try {
    const txGroup = collectionGroup(db, "transactions");
    const txSnap = await getDocs(txGroup);
    transactionsCount = txSnap.docs.length;
    console.log(`[collectionGroup transactions] Total transaction records: ${transactionsCount}`);
    txSnap.docs.forEach(doc => {
      const data = doc.data();
      const uidFromPath = doc.ref.path.split('/')[1];
      const uid = data.uid || uidFromPath;
      if (uid) userIds.add(uid);
      console.log(` - Tx Doc ID: ${doc.id} | User UID: ${uid} | Path: ${doc.ref.path} | Amount: ${data.amount}`);
    });
  } catch (err) {
    console.error("[collectionGroup transactions ERROR]:", err.message);
  }

  // 3. Check collectionGroup goals
  try {
    const goalsGroup = collectionGroup(db, "goals");
    const goalsSnap = await getDocs(goalsGroup);
    goalsCount = goalsSnap.docs.length;
    console.log(`[collectionGroup goals] Total goal records: ${goalsCount}`);
    goalsSnap.docs.forEach(doc => {
      const data = doc.data();
      const uidFromPath = doc.ref.path.split('/')[1];
      const uid = data.uid || uidFromPath;
      if (uid) userIds.add(uid);
      console.log(` - Goal Doc ID: ${doc.id} | User UID: ${uid} | Path: ${doc.ref.path} | Target: ${data.targetAmount}`);
    });
  } catch (err) {
    console.error("[collectionGroup goals ERROR]:", err.message);
  }

  // 4. Check collectionGroup recurringExpenses
  try {
    const recGroup = collectionGroup(db, "recurringExpenses");
    const recSnap = await getDocs(recGroup);
    recurringCount = recSnap.docs.length;
    console.log(`[collectionGroup recurringExpenses] Total recurring records: ${recurringCount}`);
    recSnap.docs.forEach(doc => {
      const data = doc.data();
      const uidFromPath = doc.ref.path.split('/')[1];
      const uid = data.uid || uidFromPath;
      if (uid) userIds.add(uid);
      console.log(` - Rec Doc ID: ${doc.id} | User UID: ${uid} | Path: ${doc.ref.path} | Amount: ${data.amount}`);
    });
  } catch (err) {
    console.error("[collectionGroup recurringExpenses ERROR]:", err.message);
  }

  console.log("\n--- SUMMARY OF DISCOVERED DATA ---");
  console.log(`Total Unique Users Discovered: ${userIds.size}`);
  console.log(`Total Transactions Across All Users: ${transactionsCount}`);
  console.log(`Total Goals Across All Users: ${goalsCount}`);
  console.log(`Total Recurring Expenses Across All Users: ${recurringCount}`);
  console.log("=======================================================================");

  process.exit(0);
}

testFetchAll();
