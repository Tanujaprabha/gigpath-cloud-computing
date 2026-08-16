import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  collectionGroup,
  doc,
  getDoc
} from "firebase/firestore";

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

async function inspectRealFirestore() {
  console.log("=================== REAL FIRESTORE INSPECTION ===================");

  // 1. Unauthenticated Collection Query for 'users'
  console.log("\n[Test 1] Querying root collection 'users' without auth...");
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    console.log(` -> SUCCESS: Found ${usersSnap.docs.length} user documents.`);
    usersSnap.docs.forEach(d => console.log(`    User Doc ID: ${d.id}`));
  } catch (err) {
    console.log(` -> PERMISSION ERROR: ${err.message}`);
  }

  // 2. Unauthenticated CollectionGroup Queries
  console.log("\n[Test 2] Querying collectionGroup 'transactions' without auth...");
  try {
    const txSnap = await getDocs(collectionGroup(db, "transactions"));
    console.log(` -> SUCCESS: Found ${txSnap.docs.length} transaction documents across all users.`);
  } catch (err) {
    console.log(` -> PERMISSION ERROR: ${err.message}`);
  }

  console.log("\n[Test 3] Querying collectionGroup 'goals' without auth...");
  try {
    const goalsSnap = await getDocs(collectionGroup(db, "goals"));
    console.log(` -> SUCCESS: Found ${goalsSnap.docs.length} goal documents across all users.`);
  } catch (err) {
    console.log(` -> PERMISSION ERROR: ${err.message}`);
  }

  console.log("\n[Test 4] Querying collectionGroup 'recurringExpenses' without auth...");
  try {
    const recSnap = await getDocs(collectionGroup(db, "recurringExpenses"));
    console.log(` -> SUCCESS: Found ${recSnap.docs.length} recurring expense documents across all users.`);
  } catch (err) {
    console.log(` -> PERMISSION ERROR: ${err.message}`);
  }

  // 5. Test Authenticated User Session
  console.log("\n[Test 5] Attempting authenticated user session...");
  try {
    // Try login with sample account if present or inspect auth
    const userCredential = await signInWithEmailAndPassword(auth, "jordan@gigpath.app", "password123").catch(async () => {
      // If login fails, try creating a test session to get a valid UID
      return await createUserWithEmailAndPassword(auth, `test_${Date.now()}@gigpath.app`, "Password123!");
    });
    
    const currentUser = userCredential.user;
    console.log(` -> Authenticated successfully as UID: ${currentUser.uid} (${currentUser.email})`);

    // Test reading current user's subcollections
    const userTxSnap = await getDocs(collection(db, "users", currentUser.uid, "transactions"));
    console.log(` -> User ${currentUser.uid} transactions count: ${userTxSnap.docs.length}`);

    const userGoalsSnap = await getDocs(collection(db, "users", currentUser.uid, "goals"));
    console.log(` -> User ${currentUser.uid} goals count: ${userGoalsSnap.docs.length}`);

    const userRecSnap = await getDocs(collection(db, "users", currentUser.uid, "recurringExpenses"));
    console.log(` -> User ${currentUser.uid} recurringExpenses count: ${userRecSnap.docs.length}`);

    // Test reading OTHER users' collection while logged in
    console.log("\n[Test 6] Attempting to read 'users' collection while logged in as UID " + currentUser.uid + "...");
    try {
      const allUsersSnap = await getDocs(collection(db, "users"));
      console.log(` -> SUCCESS: Found ${allUsersSnap.docs.length} user documents while logged in.`);
    } catch (err) {
      console.log(` -> PERMISSION ERROR: ${err.message}`);
    }

    console.log("\n[Test 7] Attempting collectionGroup 'transactions' while logged in...");
    try {
      const allTxSnap = await getDocs(collectionGroup(db, "transactions"));
      console.log(` -> SUCCESS: Found ${allTxSnap.docs.length} transactions while logged in.`);
    } catch (err) {
      console.log(` -> PERMISSION ERROR: ${err.message}`);
    }

  } catch (err) {
    console.log(` -> Authentication test failed: ${err.message}`);
  }

  console.log("=================================================================\n");
  process.exit(0);
}

inspectRealFirestore();
