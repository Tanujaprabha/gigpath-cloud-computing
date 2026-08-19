/* eslint-disable react-refresh/only-export-components */
import { onAuthStateChanged } from 'firebase/auth'
import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react'
import { auth } from '../firebase/firebaseConfig'
import { 
  addTransaction as fsAddTransaction, 
  subscribeToTransactions,
  updateTransaction as fsUpdateTransaction,
  addGoal as fsAddGoal,
  updateGoal as fsUpdateGoal,
  deleteGoal as fsDeleteGoal,
  subscribeToGoals,
  addRecurringExpense as fsAddRecurringExpense,
  updateRecurringExpense as fsUpdateRecurringExpense,
  deleteRecurringExpense as fsDeleteRecurringExpense,
  subscribeToRecurringExpenses,
  createUserProfile,
  updateUserProfile as fsUpdateUserProfile,
  subscribeToProfile,
  createUserPreferences,
  updateUserPreferences as fsUpdateUserPreferences,
  subscribeToPreferences,
  createUserSecuritySettings,
  updateUserSecuritySettings as fsUpdateUserSecuritySettings,
  subscribeToSecuritySettings,
  subscribeToNotifications,
  addNotification as fsAddNotification,
  markNotificationAsRead as fsMarkNotificationAsRead,
  deleteNotification as fsDeleteNotification,
  clearAllNotifications as fsClearAllNotifications,
  saveInsightsList as fsSaveInsights,
  subscribeToInsightsList as subscribeToInsights
} from '../services/firestoreService'
import {
  initialGoals,
  initialPreferences,
  initialProfile,
  initialRecurringExpenses,
  initialSecurity,
  initialSettings,
  initialTransactions,
} from '../data/mockData'
import {
  getCategoryBreakdown,
  getMonthlyReport,
  getTransactionTotals,
  getWeeklyTrend,
  sortTransactions,
  getDaysUntil,
} from '../utils/analytics'
import { formatCurrency } from '../utils/formatters'
import { getDashboardAnalytics } from '../analytics/dashboardAnalytics'
import { safeDate } from '../utils/dateUtils'
import { getBudgetRecommendation, getFinancialAnalysis } from '../services/rAnalyticsService'

const AppContext = createContext(null)
const SESSION_STORAGE_KEY = 'gigpath-session'


function getStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }) {
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(() => getStoredSession())
  const [dataLoading, setDataLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [goals, setGoals] = useState([])
  const [notifications, setNotifications] = useState([])
  const [settings, setSettings] = useState(initialSettings)
  const [security, setSecurity] = useState(initialSecurity)
  const [preferences, setPreferences] = useState(initialPreferences)

  const processedNotificationsRef = useRef(new Set())

  useEffect(() => {
    if (!session?.uid) {
      processedNotificationsRef.current.clear()
    }
  }, [session?.uid])
  
  const [aiInsights, setAiInsights] = useState([])
  const [aiSafeToSpendExplanation, setAiSafeToSpendExplanation] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [aiInsightsPriority, setAiInsightsPriority] = useState('medium')
  const [aiInsightsHealthScore, setAiInsightsHealthScore] = useState(50)

  
  const [profile, setProfile] = useState(initialProfile)
  const [profileLoading, setProfileLoading] = useState(false)

  // Phase 4A R Budget Recommendation State
  const [rBudgetRecommendation, setRBudgetRecommendation] = useState(null)
  const [rBudgetLoading, setRBudgetLoading] = useState(false)
  const [rBudgetError, setRBudgetError] = useState(null)
  const budgetRequestIdRef = useRef(0)

  const fetchRBudgetRecommendation = async (
    customTx = transactions,
    customGoals = goals,
    customRec = recurringExpenses
  ) => {
    if (!session?.uid) return null

    const requestId = ++budgetRequestIdRef.current
    console.log("[RBudget/Financial] request started (budget)", requestId)
    setRBudgetLoading(true)

    try {
      const result = await getBudgetRecommendation(
        session.uid,
        customTx,
        customGoals,
        customRec
      )

      if (requestId !== budgetRequestIdRef.current) {
        console.log("[RBudget/Financial] ignoring stale response (budget)", requestId)
        return result
      }

      const normalizedStatus = Array.isArray(result?.status) ? result.status[0] : result?.status;

      if (result && normalizedStatus === 'success') {
        setRBudgetRecommendation(result)
        setRBudgetError(null)
        console.log("[RBudget/Financial] success (budget)", requestId)
        return result
      } else {
        const rawMsg = result?.message
        const msg = (Array.isArray(rawMsg) ? rawMsg[0] : rawMsg) || 'Failed to fetch R budget recommendation'
        setRBudgetError(msg)
        console.log("[RBudget/Financial] error (budget)", requestId, msg)
        return result
      }
    } catch (err) {
      if (requestId === budgetRequestIdRef.current) {
        setRBudgetError(err.message)
        console.log("[RBudget/Financial] error (budget)", requestId, err.message)
      }
      return { status: 'error', message: err.message }
    } finally {
      if (requestId === budgetRequestIdRef.current) {
        setRBudgetLoading(false)
        console.log("[RBudget/Financial] request ended (budget)", requestId)
      }
    }
  }

  // Phase 4B R User Financial Analysis State
  const [rFinancialAnalysis, setRFinancialAnalysis] = useState(null)
  const [rFinancialAnalysisLoading, setRFinancialAnalysisLoading] = useState(false)
  const [rFinancialAnalysisError, setRFinancialAnalysisError] = useState(null)
  const financialAnalysisRequestIdRef = useRef(0)

  const fetchRFinancialAnalysis = async (
    customTx = transactions,
    customGoals = goals,
    customRec = recurringExpenses
  ) => {
    if (!session?.uid) return null

    const requestId = ++financialAnalysisRequestIdRef.current
    console.log("[RBudget/Financial] request started", requestId)
    setRFinancialAnalysisLoading(true)

    try {
      const result = await getFinancialAnalysis(
        session.uid,
        customTx,
        customGoals,
        customRec
      )

      if (requestId !== financialAnalysisRequestIdRef.current) {
        console.log("[RBudget/Financial] ignoring stale response", requestId)
        return result
      }

      const normalizedStatus = Array.isArray(result?.status) ? result.status[0] : result?.status;

      if (result && normalizedStatus === 'success') {
        setRFinancialAnalysis(result)
        setRFinancialAnalysisError(null)
        console.log("[RBudget/Financial] success", requestId)
        return result
      } else {
        const rawMsg = result?.message
        const msg = (Array.isArray(rawMsg) ? rawMsg[0] : rawMsg) || 'Failed to fetch R financial analysis'
        setRFinancialAnalysisError(msg)
        console.log("[RBudget/Financial] error", requestId, msg)
        return result
      }
    } catch (err) {
      if (requestId === financialAnalysisRequestIdRef.current) {
        setRFinancialAnalysisError(err.message)
        console.log("[RBudget/Financial] error", requestId, err.message)
      }
      return { status: 'error', message: err.message }
    } finally {
      if (requestId === financialAnalysisRequestIdRef.current) {
        setRFinancialAnalysisLoading(false)
        console.log("[RBudget/Financial] request ended", requestId)
      }
    }
  }
  
  useEffect(() => {
    if (session?.uid) {
      // We are logged in, ensure we don't show mock data
      Promise.resolve().then(() => setDataLoading(true))
      
      const unsubTransactions = subscribeToTransactions(session.uid, (data) => {
        setTransactions(data)
        setDataLoading(false)
      })
      const unsubGoals = subscribeToGoals(session.uid, (data) => {
        setGoals(data)
      })
      const unsubRecurring = subscribeToRecurringExpenses(session.uid, (data) => {
        setRecurringExpenses(data)
      })
      Promise.resolve().then(() => setProfileLoading(true))
      const unsubProfile = subscribeToProfile(session.uid, (data) => {
        if (data) {
          // Priority: Firestore 'name' field, then existing 'fullName' field
          const resolvedName = data.name || data.fullName || session.name || "Gig worker";
          setProfile({
            ...data,
            fullName: resolvedName
          })
        } else {
          // If no profile exists, create a default one
          const defaultProfile = {
            uid: session.uid,
            name: session.name || "Gig worker",
            email: session.email || "",
            phone: "",
            city: "",
            bio: "",
            workType: "",
            payoutMethod: "",
            accentTheme: "Ocean",
          }
          
          let defaultFilled = 0;
          if (defaultProfile.name && defaultProfile.name.trim() !== '') defaultFilled++;
          if (defaultProfile.email && defaultProfile.email.trim() !== '') defaultFilled++;
          defaultProfile.profileCompletion = Math.round((defaultFilled / 7) * 100);

          createUserProfile(session.uid, defaultProfile)
        }
        setProfileLoading(false)
      })

      const unsubPreferences = subscribeToPreferences(session.uid, (data) => {
        if (data) {
          setPreferences(data)
        } else {
          const defaultPreferences = {
            uid: session.uid,
            language: "en",
            currency: "INR",
            theme: "Light",
            notificationEnabled: true,
            voiceAssistantEnabled: false,
            defaultExpenseCategory: "General",
            summaryDay: "Monday",
            compactTables: false,
            dashboardDensity: "Comfortable"
          }
          createUserPreferences(session.uid, defaultPreferences)
        }
      })

      const unsubSecurity = subscribeToSecuritySettings(session.uid, (data) => {
        if (data) {
          setSecurity(data)
        } else {
          const defaultSecurity = {
            uid: session.uid,
            email: session.email || "",
            twoFactorEnabled: false,
            sessionAlertsEnabled: true,
            lastPasswordChange: null,
            lastLoginAt: new Date().toISOString()
          }
          createUserSecuritySettings(session.uid, defaultSecurity)
        }
      })

      const unsubNotifications = subscribeToNotifications(session.uid, (data) => {
        setNotifications(data)
      })

      const unsubInsights = subscribeToInsights(session.uid, (data) => {
        if (data && Array.isArray(data)) {
          setAiInsights(data)
          const recommendations = data
            .filter(item => item.type === 'budget' || item.type === 'goal')
            .map(item => ({
              title: item.title,
              body: item.description
            }));
          setAiRecommendations(recommendations)
          const hasHigh = data.some(item => item.severity === 'high')
          setAiInsightsPriority(hasHigh ? 'high' : 'medium')
        } else {
          setAiInsights([])
          setAiRecommendations([])
          setAiInsightsPriority('medium')
        }
      })

      return () => {
        unsubTransactions()
        unsubGoals()
        unsubRecurring()
        unsubProfile()
        unsubPreferences()
        unsubSecurity()
        unsubNotifications()
        unsubInsights()
      }
    } else if (!authLoading) {
      // Guest mode or Splash: show mock data
      Promise.resolve().then(() => {
        setTransactions(initialTransactions)
        setGoals(initialGoals)
        setRecurringExpenses(initialRecurringExpenses)
        setProfile(initialProfile)
        setNotifications([])
        
        // Generate mock local insights for guest experience
        import('../services/aiInsightsService').then(({ generateLocalInsights }) => {
          const localInsights = generateLocalInsights({
            transactions: initialTransactions,
            goals: initialGoals,
            recurringExpenses: initialRecurringExpenses
          });
          setAiInsights(localInsights);
          
          const recommendations = localInsights
            .filter(item => item.type === 'budget' || item.type === 'goal')
            .map(item => ({
              title: item.title,
              body: item.description
            }));
          setAiRecommendations(recommendations);
          
          const hasHigh = localInsights.some(item => item.severity === 'high');
          setAiInsightsPriority(hasHigh ? 'high' : 'medium');
        }).catch((err) => {
          console.error("Failed to load local insights service in guest mode:", err);
          setAiInsights([]);
          setAiRecommendations([]);
          setAiInsightsPriority('medium');
        });
        
        setAiInsightsHealthScore(50)
        setDataLoading(false)
      })
    }
  }, [session?.uid, session?.email, session?.name, authLoading])
  // Sync preferences with app behavior dynamically
  useEffect(() => {
    if (preferences.language) {
      import('i18next').then(({ default: i18n }) => {
        if (i18n.language !== preferences.language) {
          i18n.changeLanguage(preferences.language)
        }
      })
    }
    if (preferences.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme.toLowerCase())
    }
    if (preferences.currency) {
      import('../utils/formatters').then(({ setGlobalCurrency }) => {
        setGlobalCurrency(preferences.currency)
      })
    }
  }, [preferences.language, preferences.theme, preferences.currency])

  const totals = useMemo(() => getTransactionTotals(transactions), [transactions])
  const recentTransactions = useMemo(() => sortTransactions(transactions).slice(0, 5), [transactions])
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions])
  const monthlyReport = useMemo(() => getMonthlyReport(transactions), [transactions])
  const weeklyTrend = useMemo(() => getWeeklyTrend(transactions), [transactions])

  // Dynamic Safe-to-spend calculation as requested:
  // safeToSpend = totalIncome - totalExpenses - recurringExpenses - reservedGoalSavings
  const recurringTotal = useMemo(() => {
    return recurringExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  }, [recurringExpenses])

  const reservedGoalSavings = useMemo(() => {
    return goals.reduce((sum, goal) => sum + (Number(goal.monthlyContribution) || 0), 0)
  }, [goals])

  const safeToSpendToday = useMemo(() => {
    return Math.max(totals.earningsTotal - totals.expensesTotal - recurringTotal - reservedGoalSavings, 0)
  }, [totals.earningsTotal, totals.expensesTotal, recurringTotal, reservedGoalSavings])

  const monthlyBudgetLimit = useMemo(() => {
    const recData = rBudgetRecommendation?.budget_recommendation
    if (recData && recData.recommended_spending_limit !== undefined) {
      const rawVal = Array.isArray(recData.recommended_spending_limit)
        ? recData.recommended_spending_limit[0]
        : recData.recommended_spending_limit
      const num = Number(rawVal)
      return isNaN(num) ? null : num
    }
    return null
  }, [rBudgetRecommendation])

  const dashboardAnalytics = useMemo(() => {
    console.log("Transactions:", transactions);
    console.log("Goals:", goals);
    console.log("RecurringExpenses:", recurringExpenses);
    console.log("Insights:", aiInsights);

    // Validate date fields and warning log for invalid objects
    transactions.forEach(t => {
      if (t && t.date !== undefined && t.date !== null && t.date !== "") {
        if (!safeDate(t.date)) {
          console.warn("Invalid object skipped:", t);
        }
      }
    });

    goals.forEach(g => {
      if (g) {
        if (g.targetDate !== undefined && g.targetDate !== null && g.targetDate !== "") {
          if (!safeDate(g.targetDate)) {
            console.warn("Invalid object skipped:", g);
          }
        }
        if (g.deadline !== undefined && g.deadline !== null && g.deadline !== "") {
          if (!safeDate(g.deadline)) {
            console.warn("Invalid object skipped:", g);
          }
        }
      }
    });

    recurringExpenses.forEach(r => {
      if (r && r.nextCharge !== undefined && r.nextCharge !== null && r.nextCharge !== "") {
        if (!safeDate(r.nextCharge)) {
          console.warn("Invalid object skipped:", r);
        }
      }
    });

    aiInsights.forEach(i => {
      if (i && i.createdAt !== undefined && i.createdAt !== null && i.createdAt !== "") {
        if (!safeDate(i.createdAt)) {
          console.warn("Invalid object skipped:", i);
        }
      }
    });

    return getDashboardAnalytics({
      transactions,
      recurringExpenses,
      goals,
      insights: aiInsights,
    })
  }, [transactions, recurringExpenses, goals, aiInsights])

  const spendingAnalytics = dashboardAnalytics.spending
  const savingsAnalytics = dashboardAnalytics.savings
  const goalAnalytics = dashboardAnalytics.goals
  const financialHealthScore = dashboardAnalytics.health.score
  const financialHealthLabel = dashboardAnalytics.health.label
  const spendingTrends = dashboardAnalytics.trends

  // Dynamic background notification checks for Safe-to-Spend and Upcoming Recurring Bills
  useEffect(() => {
    if (authLoading || dataLoading || !session?.uid || !notifications) return

    const runChecks = async () => {
      const todayStr = new Date().toISOString().slice(0, 10)

      // 1. Overspending Alert: total expenses > total earnings
      if (totals.expensesTotal > totals.earningsTotal && totals.earningsTotal > 0) {
        const overspendingMsg = `Alert: You are overspending. Total expenses (${formatCurrency(totals.expensesTotal)}) exceed your total earnings (${formatCurrency(totals.earningsTotal)}).`
        const localKey = `overspending_${todayStr}`
        const dbExists = notifications.some(
          n => n.type === 'security' && n.message.includes("You are overspending") && (n.createdAt?.slice(0, 10) === todayStr || !n.read)
        )
        if (!dbExists && !processedNotificationsRef.current.has(localKey)) {
          processedNotificationsRef.current.add(localKey)
          try {
            await fsAddNotification(session.uid, {
              title: 'Overspending Warning',
              message: overspendingMsg,
              type: 'security'
            })
          } catch (e) {
            console.error("Failed to trigger overspending alert:", e)
            processedNotificationsRef.current.delete(localKey)
          }
        }
      }

      // 2. Low Safe-to-Spend Alert: positive but <= 1000
      else if (safeToSpendToday > 0 && safeToSpendToday <= 1000) {
        const lowSafeMsg = `Warning: Your Safe-to-Spend balance is low at ${formatCurrency(safeToSpendToday)}. Consider reducing non-essential expenses.`
        const localKey = `low_safe_${todayStr}`
        const dbExists = notifications.some(
          n => n.type === 'transaction' && n.message.includes("Safe-to-Spend balance is low") && (n.createdAt?.slice(0, 10) === todayStr || !n.read)
        )
        if (!dbExists && !processedNotificationsRef.current.has(localKey)) {
          processedNotificationsRef.current.add(localKey)
          try {
            await fsAddNotification(session.uid, {
              title: 'Low Safe-to-Spend Alert',
              message: lowSafeMsg,
              type: 'transaction'
            })
          } catch (e) {
            console.error("Failed to trigger low safe to spend alert:", e)
            processedNotificationsRef.current.delete(localKey)
          }
        }
      }

      // Savings Milestone Check: savings rate is >= 20%
      const savingsRate = totals.earningsTotal ? (Math.max(totals.earningsTotal - totals.expensesTotal, 0) / totals.earningsTotal) * 100 : 0;
      if (savingsRate >= 20) {
        const milestoneMsg = `Congratulations! You have saved ${savingsRate.toFixed(0)}% of your earnings this month. Keep it up!`
        const localKey = `savings_milestone_20_${todayStr}`
        const dbExists = notifications.some(
          n => n.type === 'goal' && n.message.includes("saved") && n.message.includes("% of your earnings") && (n.createdAt?.slice(0, 10) === todayStr || !n.read)
        )
        if (!dbExists && !processedNotificationsRef.current.has(localKey)) {
          processedNotificationsRef.current.add(localKey)
          try {
            await fsAddNotification(session.uid, {
              title: 'Savings Milestone Reached',
              message: milestoneMsg,
              type: 'goal'
            })
          } catch (e) {
            console.error("Failed to trigger savings milestone:", e)
            processedNotificationsRef.current.delete(localKey)
          }
        }
      }

      // Unsafe Balance Warning: earnings > 0 and safeToSpendToday is 0
      if (totals.earningsTotal > 0 && safeToSpendToday === 0) {
        const unsafeMsg = "Warning: Your Safe-to-Spend balance is depleted. Avoid any discretionary spending to protect your core budget."
        const localKey = `depleted_safe_${todayStr}`
        const dbExists = notifications.some(
          n => n.type === 'security' && n.message.includes("depleted. Avoid any discretionary") && (n.createdAt?.slice(0, 10) === todayStr || !n.read)
        )
        if (!dbExists && !processedNotificationsRef.current.has(localKey)) {
          processedNotificationsRef.current.add(localKey)
          try {
            await fsAddNotification(session.uid, {
              title: 'Unsafe Balance Warning',
              message: unsafeMsg,
              type: 'security'
            })
          } catch (e) {
            console.error("Failed to trigger unsafe balance warning:", e)
            processedNotificationsRef.current.delete(localKey)
          }
        }
      }

      // 3. Upcoming Recurring Expense reminders: nextCharge due within 3 days
      recurringExpenses.forEach(async (expense) => {
        if (!expense.nextCharge) return
        const daysUntil = getDaysUntil(expense.nextCharge)
        if (daysUntil >= 0 && daysUntil <= 3) {
          const expectedMessage = `Upcoming payment reminder: "${expense.title}" (${formatCurrency(expense.amount)}) is due on ${expense.nextCharge}.`
          const localKey = `upcoming_${expense.id}_${expense.nextCharge}`
          const dbExists = notifications.some(
            n => n.type === 'recurringExpense' && n.message === expectedMessage
          )
          if (!dbExists && !processedNotificationsRef.current.has(localKey)) {
            processedNotificationsRef.current.add(localKey)
            try {
              await fsAddNotification(session.uid, {
                title: 'Upcoming Bill Reminder',
                message: expectedMessage,
                type: 'recurringExpense'
              })
            } catch (e) {
              console.error("Failed to trigger recurring bill reminder:", e)
              processedNotificationsRef.current.delete(localKey)
            }
          }
        }
      })
    }

    const timer = setTimeout(runChecks, 1500)
    return () => clearTimeout(timer)
  }, [
    authLoading,
    dataLoading,
    session?.uid,
    safeToSpendToday,
    totals.earningsTotal,
    totals.expensesTotal,
    recurringExpenses,
    notifications
  ])

  const currentDataHash = useMemo(() => {
    return JSON.stringify({
      transactions: transactions.map(t => ({ id: t.id, amount: t.amount, category: t.category, date: t.date, type: t.type, title: t.title })),
      goals: goals.map(g => ({ id: g.id, title: g.title, targetAmount: g.targetAmount, savedAmount: g.savedAmount, deadline: g.deadline, monthlyContribution: g.monthlyContribution, priority: g.priority })),
      recurringExpenses: recurringExpenses.map(r => ({ id: r.id, title: r.title, amount: r.amount, frequency: r.frequency, nextCharge: r.nextCharge })),
      earnings: totals.earningsTotal,
      expenses: totals.expensesTotal,
      safeToSpend: safeToSpendToday
    });
  }, [transactions, goals, recurringExpenses, totals.earningsTotal, totals.expensesTotal, safeToSpendToday]);

  useEffect(() => {
    if (authLoading || dataLoading || !session?.uid) return;
    
    // Only call AI if we have actual data to analyze
    if (transactions.length === 0 && goals.length === 0 && recurringExpenses.length === 0) return;

    const cacheKey = `gigpath_ai_cache_${session.uid}`;

    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.hash === currentDataHash) {
          Promise.resolve().then(() => {
            setAiSafeToSpendExplanation(cached.explanation);
          });
          return;
        }
      }
    } catch {
      // Ignore cache loading/parsing errors
    }

    const fetchAI = async () => {
      setAiLoading(true);
      try {
        const { generateDashboardInsights } = await import('../services/aiInsightsService');
        const { explainSafeToSpend } = await import('../ai/services/aiInsightService');
        
        const insightsData = await generateDashboardInsights({
          transactions,
          goals,
          recurringExpenses,
          income: totals.earningsTotal,
          expenses: totals.expensesTotal
        });

        // Save generated insights list to Firestore
        await fsSaveInsights(session.uid, insightsData);

        // Process high-severity or specific trigger notifications from the insights
        const todayStr = new Date().toISOString().slice(0, 10);
        for (const insight of insightsData) {
          const isHighSeverity = insight.severity === 'high';
          const isGoalWarning = insight.type === 'goal' && (insight.title.includes("Completion") || insight.title.includes("Nearing") || insight.title.includes("Pacing"));
          const isBudgetWarning = insight.type === 'budget' && (insight.title.includes("Alert") || insight.title.includes("Warning") || insight.title.includes("Depleted"));
          const isRecurringSpike = insight.type === 'recurring' && (insight.title.includes("Load") || insight.title.includes("Spike") || insight.title.includes("Increase"));

          if (isHighSeverity || isGoalWarning || isBudgetWarning || isRecurringSpike) {
            const localKey = `ai_insight_${insight.type}_${insight.title}_${todayStr}`;
            const dbExists = notifications.some(
              n => n.type === 'aiInsight' && n.title === insight.title && (n.createdAt?.slice(0, 10) === todayStr || !n.read)
            );
            
            if (!dbExists && !processedNotificationsRef.current.has(localKey)) {
              processedNotificationsRef.current.add(localKey);
              try {
                await fsAddNotification(session.uid, {
                  title: insight.title,
                  message: insight.description,
                  type: 'aiInsight'
                });
              } catch (e) {
                console.error("Failed to add AI insight notification:", e);
                processedNotificationsRef.current.delete(localKey);
              }
            }
          }
        }

        const explanation = await explainSafeToSpend({
          totalIncome: formatCurrency(totals.earningsTotal),
          totalExpenses: formatCurrency(totals.expensesTotal),
          recurringTotal: formatCurrency(recurringTotal),
          reservedGoalSavings: formatCurrency(reservedGoalSavings),
          safeToSpend: formatCurrency(safeToSpendToday)
        });

        setAiSafeToSpendExplanation(explanation);
        localStorage.setItem(cacheKey, JSON.stringify({
          hash: currentDataHash,
          explanation
        }));
      } catch (err) {
        console.error("Error in fetchAI automation:", err);
      } finally {
        setAiLoading(false);
      }
    };
    
    const timer = setTimeout(fetchAI, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, dataLoading, session?.uid, currentDataHash]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If we already have a profile with a name, use it. 
        // Otherwise use user.displayName as a fallback until Firestore loads.
        setSession({
          name: profile.fullName !== "Gig worker" ? profile.fullName : (user.displayName || user.email.split('@')[0]),
          email: user.email,
          uid: user.uid
        })
        import('../services/firestoreService').then(({ updateUserSecuritySettings, addNotification }) => {
          updateUserSecuritySettings(user.uid, { lastLoginAt: new Date().toISOString() }).catch(() => {})
          addNotification(user.uid, {
            title: 'Login Detected',
            message: 'A new login was detected on your account.',
            type: 'security'
          }).catch(() => {})
        })
      } else {
        setSession(null)
      }
      setAuthLoading(false)
    })
    
    return () => unsubscribe()
  }, [profile.fullName])

  useEffect(() => {
    try {
      if (session) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    } catch {
      // Ignore storage write issues in this UI-only demo.
    }
  }, [session])

  const login = ({ email, name, uid }) => {
    setSession({
      name: name || profile.fullName,
      email,
      uid,
    })
  }

  const signup = ({ name, email }) => {
    setProfile((current) => ({
      ...current,
      fullName: name,
      email,
    }))
    // Session will be set by onAuthStateChanged if not immediately signed out
  }

  const logout = async () => {
    const { logout: firebaseLogout } = await import('../services/authService')
    await firebaseLogout()
    setSession(null)
  }

  const addTransaction = async (payload) => {
    if (!session?.uid) return
    try {
      await fsAddTransaction(session.uid, payload)
      
      const isIncome = payload.type === 'income'
      const title = isIncome ? 'Earnings Added' : 'Expense Added'
      const message = isIncome 
        ? `Received ${formatCurrency(payload.amount)} for ${payload.category}${payload.title ? `: ${payload.title}` : ''}`
        : `Spent ${formatCurrency(payload.amount)} on ${payload.category}${payload.title ? `: ${payload.title}` : ''}`
        
      await fsAddNotification(session.uid, {
        title,
        message,
        type: 'transaction'
      })
    } catch (error) {
      console.error("Failed to add transaction or notification:", error)
      throw error
    }
  }

  const updateTransaction = async (transactionId, payload) => {
    if (!session?.uid) return
    await fsUpdateTransaction(session.uid, transactionId, payload)
  }

  const addRecurringExpense = async (payload) => {
    if (!session?.uid) return
    try {
      await fsAddRecurringExpense(session.uid, payload)
      await fsAddNotification(session.uid, {
        title: 'Recurring Expense Added',
        message: `Recurring expense created successfully: "${payload.title}" (${formatCurrency(payload.amount)} ${payload.frequency}).`,
        type: 'recurringExpense'
      })
    } catch (error) {
      console.error("Failed to add recurring expense or notification:", error)
      throw error
    }
  }

  const updateRecurringExpense = async (expenseId, payload) => {
    if (!session?.uid) return
    await fsUpdateRecurringExpense(session.uid, expenseId, payload)
  }

  const deleteRecurringExpense = async (expenseId) => {
    if (!session?.uid) return
    await fsDeleteRecurringExpense(session.uid, expenseId)
  }

  const addGoal = async (payload) => {
    if (!session?.uid) return
    try {
      await fsAddGoal(session.uid, payload)
      await fsAddNotification(session.uid, {
        title: 'Goal Created',
        message: `Goal "${payload.title}" set up with a target of ${formatCurrency(payload.targetAmount)}.`,
        type: 'goal'
      })
    } catch (error) {
      console.error("Failed to add goal or notification:", error)
      throw error
    }
  }

  const updateGoal = async (goalId, payload) => {
    if (!session?.uid) return
    try {
      const goal = goals.find(g => g.id === goalId)
      await fsUpdateGoal(session.uid, goalId, payload)
      
      if (goal) {
        const oldSaved = Number(goal.savedAmount) || 0
        const target = Number(payload.targetAmount ?? goal.targetAmount) || 1
        const newSaved = Number(payload.savedAmount ?? oldSaved)
        
        const oldProgress = (oldSaved / target) * 100
        const newProgress = (newSaved / target) * 100
        
        if (oldProgress < 100 && newProgress >= 100) {
          await fsAddNotification(session.uid, {
            title: 'Goal Completed!',
            message: `Congratulations! You have fully funded your goal: "${goal.title}" (${formatCurrency(target)}).`,
            type: 'goal'
          })
        } else {
          const milestones = [75, 50, 25]
          for (const milestone of milestones) {
            if (oldProgress < milestone && newProgress >= milestone) {
              await fsAddNotification(session.uid, {
                title: 'Goal Progress Milestone',
                message: `Nice progress! Your goal "${goal.title}" is now ${milestone}% completed (${formatCurrency(newSaved)} of ${formatCurrency(target)}).`,
                type: 'goal'
              })
              break; // Only trigger the highest milestone crossed
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to update goal or notification:", error)
      throw error
    }
  }

  const deleteGoal = async (goalId) => {
    if (!session?.uid) return
    await fsDeleteGoal(session.uid, goalId)
  }

  const updateProfile = async (payload) => {
    if (!session?.uid) return

    const merged = { ...profile, ...payload }
    if (merged.fullName && !merged.name) {
      merged.name = merged.fullName;
    }
    if (payload.fullName) {
      payload.name = payload.fullName;
    }

    const fieldsToCheck = ['name', 'email', 'phone', 'city', 'bio', 'workType', 'payoutMethod'];
    let filledCount = 0;
    fieldsToCheck.forEach(field => {
       if (merged[field] && String(merged[field]).trim() !== '') {
           filledCount++;
       }
    });
    const completion = Math.round((filledCount / fieldsToCheck.length) * 100);
    
    await fsUpdateUserProfile(session.uid, {
      ...payload,
      profileCompletion: completion
    })
    await fsAddNotification(session.uid, {
      title: 'Profile Updated',
      message: 'Your profile has been updated successfully.',
      type: 'system'
    })
  }

  const updateSettings = (payload) => {
    setSettings((current) => ({ ...current, ...payload }))
  }

  const updateSecurity = async (payload) => {
    if (!session?.uid) {
      setSecurity((current) => ({ ...current, ...payload }))
      return
    }
    await fsUpdateUserSecuritySettings(session.uid, payload)
    
    if (payload.lastPasswordChange) {
      await fsAddNotification(session.uid, {
        title: 'Security Alert',
        message: 'Your account password was recently changed.',
        type: 'security'
      })
    }
  }

  const updatePreferences = async (payload) => {
    if (!session?.uid) {
      setPreferences((current) => ({ ...current, ...payload }))
      return
    }
    await fsUpdateUserPreferences(session.uid, payload)
  }

  const markNotificationAsRead = async (notificationId) => {
    if (!session?.uid) return
    await fsMarkNotificationAsRead(session.uid, notificationId)
  }

  const markNotificationRead = markNotificationAsRead

  const deleteNotification = async (notificationId) => {
    if (!session?.uid) return
    await fsDeleteNotification(session.uid, notificationId)
  }

  const clearAllNotifications = async () => {
    if (!session?.uid) return
    await fsClearAllNotifications(session.uid)
  }

  const clearNotifications = clearAllNotifications

  const unreadNotificationCount = notifications.filter(n => !n.read).length

  return (
    <AppContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        transactions,
        recurringExpenses,
        goals,
        profile,
        settings,
        security,
        preferences,
        totals,
        recentTransactions,
        categoryBreakdown,
        monthlyReport,
        weeklyTrend,
        safeToSpendToday,
        monthlyBudgetLimit,
        financialHealthScore,
        financialHealthLabel,
        spendingAnalytics,
        savingsAnalytics,
        goalAnalytics,
        spendingTrends,
        aiInsights,
        aiSafeToSpendExplanation,
        aiLoading,
        aiRecommendations,
        aiInsightsPriority,
        aiInsightsHealthScore,
        authLoading,
        dataLoading,
        profileLoading,
        login,
        signup,
        logout,
        addTransaction,
        updateTransaction,
        addRecurringExpense,
        updateRecurringExpense,
        deleteRecurringExpense,
        addGoal,
        updateGoal,
        deleteGoal,
        updateProfile,
        updateSettings,
        updateSecurity,
        updatePreferences,
        notifications,
        markNotificationAsRead,
        markNotificationRead,
        deleteNotification,
        clearAllNotifications,
        clearNotifications,
        unreadNotificationCount,
        rBudgetRecommendation,
        rBudgetLoading,
        rBudgetError,
        fetchRBudgetRecommendation,
        rFinancialAnalysis,
        rFinancialAnalysisLoading,
        rFinancialAnalysisError,
        fetchRFinancialAnalysis,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider')
  }

  return context
}
