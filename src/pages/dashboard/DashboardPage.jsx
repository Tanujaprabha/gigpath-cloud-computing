import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../components/ui/PageHeader'
import ProgressBar from '../../components/ui/ProgressBar'
import StatCard from '../../components/ui/StatCard'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { useAppContext } from '../../context/AppContext'
import { getGoalProgress } from '../../utils/analytics'
import { formatCurrency, formatDate, formatPercent, formatTimeAgo } from '../../utils/formatters'

export default function DashboardPage() {
  const { t } = useTranslation()
  const {
    transactions,
    totals,
    recentTransactions,
    goals,
    recurringExpenses,
    safeToSpendToday,
    monthlyBudgetLimit,
    financialHealthScore,
    aiInsights,
    aiSafeToSpendExplanation,
    aiLoading,
    authLoading,
    dataLoading,
    profileLoading,
    profile,
    notifications,
    spendingAnalytics,
  } = useAppContext()

  // Dynamic Current-Month Calculations (MUST BE CALLED UNCONDITIONALLY AT TOP TO OBEY REACT HOOK RULES)
  const today = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  // 1. Current calendar month expense total
  const currentMonthSpending = useMemo(() => {
    return (transactions || [])
      .filter((t) => {
        if (t?.type !== 'expense') return false
        if (!t?.date) return false
        const d = new Date(t.date)
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [transactions, currentYear, currentMonth])

  const unreadNotifications = (notifications || []).filter(n => !n.read)
  const recentNotifications = (notifications || []).slice(0, 3)

  if (authLoading || dataLoading || profileLoading) {
    return (
      <div className="page-stack page-stack--centered" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="loading-state">
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(37, 99, 235, 0.1)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s infinite linear' }}></div>
          <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: '500' }}>{t('common.loading')}</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const savingsRate = totals?.earningsTotal
    ? (totals.savingsTotal / totals.earningsTotal) * 100
    : 0
  const upcomingRecurring = (recurringExpenses || []).slice(0, 3)

  // 2. Remaining Days in current month (inclusive of today)
  const daysInMonthTotal = new Date(currentYear, currentMonth + 1, 0).getDate()
  const remainingDays = Math.max(daysInMonthTotal - today.getDate() + 1, 1)

  // 3. Remaining Budget for current month
  const remainingBudget = monthlyBudgetLimit !== null
    ? Math.max(monthlyBudgetLimit - currentMonthSpending, 0)
    : null

  // 4. Daily Spending Guide (Remaining Budget / Remaining Days)
  const dailySpendingGuide = remainingBudget !== null && remainingDays > 0
    ? (remainingBudget / remainingDays)
    : null

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={`${t('sidebar.dashboard')} • ${profile.fullName}`}
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <Link className="button button--primary" to="/app/finance/transactions/new">
            {t('dashboard.addTransaction')}
          </Link>
        }
      />

      <div className="hero-grid">
        <SurfaceCard className="surface-card--accent hero-card">
          <span className="eyebrow">Monthly Spending Limit</span>
          <h2>{monthlyBudgetLimit !== null ? formatCurrency(monthlyBudgetLimit) : 'Calculating...'}</h2>
          <p>
            Your recommended maximum spending for this month based on your income, savings and goals.
          </p>

          <div className="metric-strip">
            <div>
              <strong>{financialHealthScore}/100</strong>
              <span>{t('dashboard.financialHealth')}</span>
            </div>
            <div>
              <strong>{formatPercent(savingsRate)}</strong>
              <span>{t('dashboard.savingsRate')}</span>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block' }}>Remaining This Month</strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  Budget still available for the current month.
                </span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#4ade80', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                {remainingBudget !== null ? formatCurrency(remainingBudget) : 'Calculating...'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', display: 'block' }}>Daily Spending Guide</strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  Based on your remaining budget and the days left this month.
                </span>
              </div>
              <strong style={{ fontSize: '1.25rem', color: '#93c5fd', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                {dailySpendingGuide !== null ? `≈ ${formatCurrency(dailySpendingGuide)}/day` : 'Calculating...'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', opacity: 0.9 }}>
              <span>Days Remaining</span>
              <strong>{remainingDays} days</strong>
            </div>
          </div>
        </SurfaceCard>

        <div className="stat-grid">
          <StatCard
            icon="money"
            label={t('dashboard.earnings')}
            value={formatCurrency(totals.earningsTotal)}
            description={t('dashboard.earningsDesc')}
            tone="positive"
          />
          <StatCard
            icon="expense"
            label={t('dashboard.expenses')}
            value={formatCurrency(totals.expensesTotal)}
            description={t('dashboard.expensesDesc')}
            tone="negative"
          />
          <StatCard
            icon="savings"
            label={t('dashboard.savings')}
            value={formatCurrency(totals.savingsTotal)}
            description={t('dashboard.savingsDesc')}
            tone="neutral"
          />
        </div>
      </div>

      <div className="content-grid content-grid--wide">
        <SurfaceCard>
          <div className="section-heading section-heading--row">
            <div>
              <h2>{t('dashboard.recentTransactions')}</h2>
              <p>{t('dashboard.recentTransactionsDesc')}</p>
            </div>
            <Link to="/app/finance/transactions" className="button button--ghost">
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="simple-list">
            {recentTransactions.map((transaction) => (
              <Link
                key={transaction.id}
                to={`/app/finance/transactions/${transaction.id}`}
                className="simple-list__item"
              >
                <div>
                  <strong>{transaction.title}</strong>
                  <span>
                    {transaction.category} • {formatDate(transaction.date)}
                  </span>
                </div>
                <strong className={transaction.type === 'income' ? 'text-positive' : 'text-negative'}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </strong>
              </Link>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-heading">
            <h2>{t('dashboard.goalProgress')}</h2>
            <p>{t('dashboard.goalProgressDesc')}</p>
          </div>
          <div className="stack-list">
            {goals.map((goal) => (
              <div key={goal.id} className="goal-row">
                <div className="goal-row__copy">
                  <div>
                    <strong>{goal.title}</strong>
                    <span>{formatCurrency(goal.savedAmount)} {t('common.saved')}</span>
                  </div>
                  <Link to={`/app/goals/${goal.id}`}>{t('common.openGoal')}</Link>
                </div>
                <ProgressBar
                  value={getGoalProgress(goal)}
                  label={formatCurrency(goal.targetAmount)}
                  helper={`${Math.round(getGoalProgress(goal))}% complete`}
                />
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="content-grid">
        <SurfaceCard>
          <div className="section-heading">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{color: 'var(--accent-violet)'}}>✨</span> {t('dashboard.aiInsights', 'AI Insights')}
            </h2>
            <p>{t('dashboard.aiInsightsDesc', 'Smart analysis of your recent activity')}</p>
          </div>
          <div className="simple-list">
            {aiLoading ? (
              <div style={{ padding: '16px', color: 'var(--text-muted)' }}>{t('dashboard.generatingInsights', 'Generating insights...')}</div>
            ) : aiInsights && aiInsights.length > 0 ? (
              aiInsights.map((insight, idx) => {
                let borderLeftColor;
                let bgLight;
                if (insight.severity === 'high') {
                  borderLeftColor = '#ef4444'; // Red
                  bgLight = 'rgba(239, 68, 68, 0.03)';
                } else if (insight.severity === 'medium') {
                  borderLeftColor = '#f97316'; // Orange
                  bgLight = 'rgba(249, 115, 22, 0.03)';
                } else {
                  borderLeftColor = 'var(--accent-violet)';
                  bgLight = 'rgba(124, 58, 237, 0.03)';
                }

                return (
                  <div 
                    key={idx} 
                    className="simple-list__item" 
                    style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      borderLeft: `4px solid ${borderLeftColor}`,
                      background: bgLight,
                      padding: '12px 16px',
                      borderRadius: '4px',
                      borderTop: '1px solid rgba(0,0,0,0.03)',
                      borderRight: '1px solid rgba(0,0,0,0.03)',
                      borderBottom: '1px solid rgba(0,0,0,0.03)',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{insight.title}</strong>
                      {insight.createdAt && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatTimeAgo(insight.createdAt)}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{insight.description}</p>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '16px', color: 'var(--text-muted)' }}>{t('dashboard.noInsights', 'No insights available right now. Add some financial data to get started.')}</div>
            )}
          </div>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-heading">
            <h2>{t('dashboard.quickActions')}</h2>
            <p>{t('dashboard.quickActionsDesc')}</p>
          </div>
          <div className="action-grid">
            <Link className="button button--primary button--block" to="/app/finance/transactions/new">
              {t('dashboard.addTransaction')}
            </Link>
            <Link className="button button--secondary button--block" to="/app/goals/new">
              {t('dashboard.addGoal')}
            </Link>
            <Link className="button button--secondary button--block" to="/app/ai/budget-recommendation">
              {t('sidebar.ai_budget_recommendation')}
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-heading">
            <h2>{t('dashboard.recurringSnapshot')}</h2>
            <p>{t('dashboard.recurringSnapshotDesc')}</p>
          </div>
          <div className="simple-list">
            {upcomingRecurring.map((expense) => (
              <div key={expense.id} className="simple-list__item">
                <div>
                  <strong>{expense.title}</strong>
                  <span>
                    {expense.frequency} • {t('common.due')} {formatDate(expense.nextCharge)}
                  </span>
                </div>
                <strong>{formatCurrency(expense.amount)}</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-heading section-heading--row">
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center' }}>
                {t('dashboard.notifications', 'Notifications')}
                {unreadNotifications.length > 0 && (
                  <span style={{ background: 'var(--negative)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '8px' }}>
                    {unreadNotifications.length} {t('dashboard.new', 'new')}
                  </span>
                )}
              </h2>
              <p>{t('dashboard.notificationsDesc', 'Latest updates and alerts')}</p>
            </div>
            <Link to="/app/notifications" className="button button--ghost">
              {t('common.viewAll')}
            </Link>
          </div>
          <div className="simple-list">
            {recentNotifications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.noNotifications', 'No notifications yet.')}</p>
            ) : (
              recentNotifications.map((n) => (
                <Link key={n.id} to="/app/notifications" className="simple-list__item" style={{ opacity: n.read ? 0.7 : 1 }}>
                  <div>
                    <strong>{n.title}</strong>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px', display: 'inline-block' }}>{n.message}</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{n.createdAt ? formatTimeAgo(n.createdAt) : ''}</span>
                </Link>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
