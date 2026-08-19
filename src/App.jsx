import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/RequireAuth'
import { useAppContext } from './context/AppContext'
import BudgetRecommendationPage from './pages/ai/BudgetRecommendationPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import SignupPage from './pages/auth/SignupPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import AddRecurringExpensePage from './pages/finance/AddRecurringExpensePage'
import AddTransactionPage from './pages/finance/AddTransactionPage'
import CategoryBreakdownPage from './pages/finance/CategoryBreakdownPage'
import EditTransactionPage from './pages/finance/EditTransactionPage'
import MonthlyReportPage from './pages/finance/MonthlyReportPage'
import RecurringExpensesPage from './pages/finance/RecurringExpensesPage'
import TransactionDetailPage from './pages/finance/TransactionDetailPage'
import TransactionListPage from './pages/finance/TransactionListPage'
import AddGoalPage from './pages/goals/AddGoalPage'
import GoalDetailPage from './pages/goals/GoalDetailPage'
import GoalProgressPage from './pages/goals/GoalProgressPage'
import GoalsListPage from './pages/goals/GoalsListPage'
import EditGoalPage from './pages/goals/EditGoalPage'
import CashFlowPage from './pages/insights/CashFlowPage'
import FinancialHealthPage from './pages/insights/FinancialHealthPage'
import InsightsOverviewPage from './pages/insights/InsightsOverviewPage'
import EditProfilePage from './pages/profile/EditProfilePage'
import HelpPage from './pages/profile/HelpPage'
import PreferencesPage from './pages/profile/PreferencesPage'
import ProfilePage from './pages/profile/ProfilePage'
import SettingsPage from './pages/profile/SettingsPage'
import NotificationsPage from './pages/profile/NotificationsPage'
import NotFoundPage from './pages/shared/NotFoundPage'
import SplashScreen from './pages/shared/SplashScreen'
import WelcomeScreen from './pages/shared/WelcomeScreen'

function PublicOnlyRoute() {
  const { isAuthenticated } = useAppContext()
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }
  return <Outlet />
}

function RouteLogger() {
  const location = useLocation()
  useEffect(() => {
    console.log(`[Router Navigation] Navigated to: ${location.pathname}`)
  }, [location])
  return null
}

export default function App() {
  return (
    <>
      <RouteLogger />
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/welcome" element={<WelcomeScreen />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="finance/transactions" element={<TransactionListPage />} />
            <Route path="finance/transactions/new" element={<AddTransactionPage />} />
            <Route path="finance/transactions/:transactionId" element={<TransactionDetailPage />} />
            <Route
              path="finance/transactions/:transactionId/edit"
              element={<EditTransactionPage />}
            />
            <Route path="finance/categories" element={<CategoryBreakdownPage />} />
            <Route path="finance/monthly-report" element={<MonthlyReportPage />} />
            <Route path="finance/recurring-expenses" element={<RecurringExpensesPage />} />
            <Route path="finance/recurring-expenses/new" element={<AddRecurringExpensePage />} />

            <Route path="insights/overview" element={<InsightsOverviewPage />} />
            <Route path="insights/cash-flow" element={<CashFlowPage />} />
            <Route path="insights/financial-health" element={<FinancialHealthPage />} />

            <Route path="goals" element={<GoalsListPage />} />
            <Route path="goals/new" element={<AddGoalPage />} />
            <Route path="goals/detail" element={<GoalDetailPage />} />
            <Route path="goals/progress" element={<GoalProgressPage />} />
            <Route path="goals/:goalId" element={<GoalDetailPage />} />
            <Route path="goals/:goalId/progress" element={<GoalProgressPage />} />
            <Route path="goals/:goalId/edit" element={<EditGoalPage />} />

            <Route
              path="ai/budget-recommendation"
              element={<BudgetRecommendationPage />}
            />

            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="profile/settings" element={<SettingsPage />} />
            <Route path="profile/preferences" element={<PreferencesPage />} />
            <Route path="profile/help" element={<HelpPage />} />
            
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

