/**
 * R Analytics Backend API Service
 * Endpoints:
 *  - POST http://127.0.0.1:8000/budget-recommendation (Phase 3 & Phase 4A)
 *  - POST http://127.0.0.1:8000/financial-analysis/user (Phase 4B)
 */

const R_API_PRIMARY_URL = 'http://127.0.0.1:8000';
const R_API_SECONDARY_URL = 'http://localhost:8000';

/**
 * Helper to sanitize record objects coming from Firestore (convert Timestamps/Dates to ISO strings)
 */
function sanitizeRecord(rec, defaultUid) {
  if (!rec || typeof rec !== 'object') return {};
  const cleaned = {};

  for (const [key, value] of Object.entries(rec)) {
    if (value === null || value === undefined) {
      cleaned[key] = null;
    } else if (typeof value === 'object') {
      if (value.seconds !== undefined) {
        cleaned[key] = new Date(value.seconds * 1000).toISOString();
      } else if (typeof value.toDate === 'function') {
        cleaned[key] = value.toDate().toISOString();
      } else if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      } else {
        cleaned[key] = String(value);
      }
    } else {
      cleaned[key] = value;
    }
  }

  const resolvedUid = String(rec.user_id || rec.uid || defaultUid || '');
  cleaned.user_id = resolvedUid;
  cleaned.uid = resolvedUid;

  return cleaned;
}

/**
 * Robust fetch wrapper handling IPv4 (127.0.0.1) primary and localhost fallback connection
 */
async function safeFetchR(endpoint, rawPayload) {
  console.log("[R API] REQUEST START", endpoint);
  const primaryUrl = `${R_API_PRIMARY_URL}${endpoint}`;
  const secondaryUrl = `${R_API_SECONDARY_URL}${endpoint}`;

  const cleanTx = (Array.isArray(rawPayload.transactions) ? rawPayload.transactions : []).map(t => sanitizeRecord(t, rawPayload.user_id));
  const cleanGoals = (Array.isArray(rawPayload.goals) ? rawPayload.goals : []).map(g => sanitizeRecord(g, rawPayload.user_id));
  const cleanRec = (Array.isArray(rawPayload.recurringExpenses) ? rawPayload.recurringExpenses : []).map(r => sanitizeRecord(r, rawPayload.user_id));

  const payload = {
    user_id: String(rawPayload.user_id),
    transactions: cleanTx,
    goals: cleanGoals,
    recurringExpenses: cleanRec
  };

  const payloadString = JSON.stringify(payload);

  let response;
  try {
    response = await fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payloadString
    });
    console.log("[R API] RESPONSE 200", response.status);
  } catch (primaryErr) {
    console.warn(`[R API] Primary fetch failed (${primaryUrl}): ${primaryErr.message}. Retrying fallback (${secondaryUrl})...`);
    try {
      response = await fetch(secondaryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payloadString
      });
      console.log("[R API] RESPONSE 200", response.status);
    } catch (fallbackErr) {
      console.error("[R API] REQUEST ERROR", fallbackErr);
      console.log("[R API] REQUEST END", endpoint);
      return {
        status: 'error',
        isOffline: true,
        message: 'R Server Offline. Unable to connect to http://127.0.0.1:8000 or http://localhost:8000.'
      };
    }
  }

  console.log("[R API] HTTP status:", response.status);
  console.log("[R API] HTTP ok:", response.ok);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.log("[R API] REQUEST ERROR", `HTTP ${response.status}: ${errorText}`);
    console.log("[R API] REQUEST END", endpoint);
    return {
      status: 'error',
      isServerError: true,
      message: `R API Error ${response.status}: ${errorText || 'Internal Server Error'}`
    };
  }

  try {
    const data = await response.json();
    console.log("[R API] RESPONSE STATUS FIELD:", data?.status);
    console.log("[R API] RESPONSE STATUS TYPE:", typeof data?.status);
    console.log("[R API] RESPONSE STATUS ARRAY:", Array.isArray(data?.status));
    console.log("[R API] FULL RESPONSE:", data);

    // Normalize R vector array envelopes for frontend contract
    if (data && typeof data === 'object') {
      if (Array.isArray(data.status)) {
        data.status = data.status[0];
      }
      if (Array.isArray(data.message)) {
        data.message = data.message[0];
      }
    }

    console.log("[R API] RESPONSE JSON", data);
    console.log("[R API] REQUEST END", endpoint);
    return data;
  } catch (jsonErr) {
    console.error("[R API] REQUEST ERROR", `JSON Parse Error: ${jsonErr.message}`);
    console.log("[R API] REQUEST END", endpoint);
    return {
      status: 'error',
      isServerError: true,
      message: `R API JSON Error: ${jsonErr.message}`
    };
  }
}

/**
 * Fetch personalized budget recommendation from R Plumber API backend.
 * @param {string} userId - Current authenticated Firebase user UID
 * @param {Array} transactions - User's transactions array
 * @param {Array} goals - User's goals array
 * @param {Array} recurringExpenses - User's recurring expenses array
 * @returns {Promise<Object>} API response payload or structured error object
 */
export async function getBudgetRecommendation(userId, transactions = [], goals = [], recurringExpenses = []) {
  if (!userId) {
    return {
      status: 'error',
      message: 'Missing authenticated user ID.',
      budget_recommendation: null
    };
  }

  const result = await safeFetchR('/budget-recommendation', {
    user_id: userId,
    transactions,
    goals,
    recurringExpenses
  });

  return result;
}

/**
 * Fetch financial data analysis for current authenticated user from R Plumber API backend.
 * @param {string} userId - Current authenticated Firebase user UID
 * @param {Array} transactions - User's transactions array
 * @param {Array} goals - User's goals array
 * @param {Array} recurringExpenses - User's recurring expenses array
 * @returns {Promise<Object>} API response payload or structured error object
 */
export async function getFinancialAnalysis(userId, transactions = [], goals = [], recurringExpenses = []) {
  if (!userId) {
    return {
      status: 'error',
      message: 'Missing authenticated user ID.',
      analysis: null
    };
  }

  const result = await safeFetchR('/financial-analysis/user', {
    user_id: userId,
    transactions,
    goals,
    recurringExpenses
  });

  return result;
}
