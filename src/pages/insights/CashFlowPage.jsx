import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../components/ui/PageHeader'
import SurfaceCard from '../../components/ui/SurfaceCard'
import ProgressBar from '../../components/ui/ProgressBar'
import { useAppContext } from '../../context/AppContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

const CATEGORY_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#64748b', // Slate
  '#14b8a6', // Teal
  '#a855f7', // Violet
]

function extractString(val, fallback = '') {
  if (val === null || val === undefined) return fallback
  if (Array.isArray(val)) return extractString(val[0], fallback)
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (typeof val === 'object') {
    return extractString(val.label || val.name || val.category || val.key || val.title || val.id || fallback)
  }
  return String(val)
}

function extractNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback
  if (Array.isArray(val)) return extractNumber(val[0], fallback)
  const num = Number(val)
  return isNaN(num) ? fallback : num
}

export default function CashFlowPage() {
  const { t } = useTranslation()
  const { 
    session,
    dataLoading,
    weeklyTrend, 
    recurringExpenses,
    transactions,
    goals,
    totals,
    rFinancialAnalysis,
    rFinancialAnalysisLoading,
    rFinancialAnalysisError,
    fetchRFinancialAnalysis
  } = useAppContext()

  useEffect(() => {
    if (session?.uid && !dataLoading) {
      fetchRFinancialAnalysis(transactions, goals, recurringExpenses)
    }
  }, [session?.uid, dataLoading, transactions, goals, recurringExpenses])

  const rawStatus = rFinancialAnalysis?.status
  const normalizedAnalysisStatus = extractString(rawStatus)
  const isConnected = rFinancialAnalysis && normalizedAnalysisStatus === 'success'
  const analysisData = rFinancialAnalysis?.analysis
  const summary = analysisData?.transaction_summary
  const catAnalysis = analysisData?.category_analysis?.categories || {}
  const expVar = analysisData?.expense_variability
  const incVar = analysisData?.income_variability
  const indicators = analysisData?.financial_indicators
  const recAnalysis = analysisData?.recurring_expenses
  const goalAnalysis = analysisData?.goals

  // 1. MONEY OVERVIEW (Defensive extraction with AppContext totals fallback)
  const totalIncome = summary 
    ? extractNumber(summary.total_income, totals.earningsTotal || 0) 
    : (totals.earningsTotal || 0)

  const totalExpenses = summary 
    ? extractNumber(summary.total_expenses, totals.expensesTotal || 0) 
    : (totals.expensesTotal || 0)

  const netCashFlow = summary 
    ? extractNumber(summary.net_cash_flow, totals.savingsTotal || 0) 
    : (totals.savingsTotal || 0)

  const fallbackSavingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0
  const savingsRate = summary && summary.savings_rate_percent !== undefined
    ? extractNumber(summary.savings_rate_percent, fallbackSavingsRate)
    : fallbackSavingsRate

  // 2. INCOME VS EXPENSES COMPARISON
  const totalVolume = totalIncome + totalExpenses
  const incomePct = totalVolume > 0 ? Math.round((totalIncome / totalVolume) * 100) : 0
  const expensePct = totalVolume > 0 ? Math.round((totalExpenses / totalVolume) * 100) : 0

  // 3. SPENDING BREAKDOWN (Defensive category breakdown)
  const processedCategories = (() => {
    if (Object.keys(catAnalysis).length > 0) {
      return Object.entries(catAnalysis).map(([catKey, catObj], idx) => {
        const rawCategory = catObj && typeof catObj === 'object' 
          ? (catObj.category || catObj.name || catObj.label || catKey)
          : (catObj || catKey)
        const strKey = extractString(rawCategory, extractString(catKey, 'Uncategorized'))
        const displayName = strKey.startsWith('categories.') ? t(strKey) : (strKey || 'Uncategorized')

        return {
          key: extractString(catKey, `cat-${idx}`),
          name: displayName,
          amount: extractNumber(catObj?.total_spending ?? catObj?.amount, 0),
          percentage: extractNumber(catObj?.percentage_of_total_expenses ?? catObj?.percentage, 0),
          count: extractNumber(catObj?.transaction_count ?? catObj?.count, 0),
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
        }
      })
    }

    // Fallback: derive categories defensively from local transactions
    const expenseTx = transactions.filter(t => t.type === 'expense')
    if (expenseTx.length === 0) return []

    const map = {}
    let sumTotal = 0
    expenseTx.forEach(tx => {
      const rawCat = tx.category || 'Other'
      const strCat = extractString(rawCat, 'Other')
      const amt = extractNumber(tx.amount, 0)
      sumTotal += amt
      if (!map[strCat]) map[strCat] = { amount: 0, count: 0 }
      map[strCat].amount += amt
      map[strCat].count += 1
    })

    return Object.entries(map).map(([catKey, val], idx) => {
      const strKey = extractString(catKey, 'Uncategorized')
      const displayName = strKey.startsWith('categories.') ? t(strKey) : (strKey || 'Uncategorized')
      return {
        key: strKey || `cat-${idx}`,
        name: displayName,
        amount: val.amount,
        percentage: sumTotal > 0 ? Math.round((val.amount / sumTotal) * 100) : 0,
        count: val.count,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
      }
    })
  })()

  // SVG Donut Slices Calculation
  const totalCategoryAmount = processedCategories.reduce((acc, c) => acc + c.amount, 0)
  const donutCircumference = 2 * Math.PI * 70 // r = 70 => 439.82
  let accumulatedOffset = 0
  const donutSlices = processedCategories.map(cat => {
    const share = totalCategoryAmount > 0 ? cat.amount / totalCategoryAmount : 0
    const dashLength = share * donutCircumference
    const gapLength = donutCircumference - dashLength
    const offset = accumulatedOffset
    accumulatedOffset += dashLength
    return {
      ...cat,
      dashArray: `${dashLength.toFixed(2)} ${gapLength.toFixed(2)}`,
      dashOffset: -offset
    }
  })

  // 4. CASH FLOW TREND
  const maxTrendVal = Math.max(
    ...weeklyTrend.flatMap((day) => [
      extractNumber(day.income, 0), 
      extractNumber(day.expense, 0), 
      Math.abs(extractNumber(day.net, 0))
    ]),
    1
  )

  // 5. SPENDING PATTERN INTERPRETATION
  const rawCv = expVar && expVar.cv !== undefined ? extractNumber(expVar.cv, null) : null
  const expMean = expVar && expVar.mean !== undefined ? extractNumber(expVar.mean, null) : null
  const incMean = incVar && incVar.mean !== undefined ? extractNumber(incVar.mean, null) : null

  let spendingPatternText = 'Add more transactions to view your spending pattern stability.'
  let spendingPatternTone = 'neutral'

  if (rawCv !== null && !isNaN(rawCv)) {
    if (rawCv < 0.5) {
      spendingPatternText = 'Your spending is consistent and predictable.'
      spendingPatternTone = 'positive'
    } else if (rawCv <= 1.0) {
      spendingPatternText = 'Your spending shows moderate variation.'
      spendingPatternTone = 'warning'
    } else {
      spendingPatternText = 'Your spending varies significantly from period to period.'
      spendingPatternTone = 'negative'
    }
  }

  // 6. RECURRING PAYMENTS
  const fallbackRecurringSum = recurringExpenses.reduce((sum, item) => sum + extractNumber(item.amount, 0), 0)
  const totalRecurringAmount = recAnalysis && recAnalysis.total_recurring_monthly !== undefined
    ? extractNumber(recAnalysis.total_recurring_monthly, fallbackRecurringSum)
    : fallbackRecurringSum
  const recurringCount = recurringExpenses.length
  const nextRecurring = [...recurringExpenses].sort(
    (left, right) => new Date(left.nextCharge) - new Date(right.nextCharge)
  )[0]

  // 7. GOALS PROGRESS
  const fallbackGoalSaved = goals.reduce((sum, g) => sum + extractNumber(g.savedAmount, 0), 0)
  const fallbackGoalTarget = goals.reduce((sum, g) => sum + extractNumber(g.targetAmount, 0), 0)
  
  const totalGoalSaved = goalAnalysis && goalAnalysis.total_saved_amount !== undefined
    ? extractNumber(goalAnalysis.total_saved_amount, fallbackGoalSaved)
    : fallbackGoalSaved

  const totalGoalTarget = goalAnalysis && goalAnalysis.total_target_amount !== undefined
    ? extractNumber(goalAnalysis.total_target_amount, fallbackGoalTarget)
    : fallbackGoalTarget

  const fallbackGap = Math.max(totalGoalTarget - totalGoalSaved, 0)
  const remainingGoalGap = indicators && indicators.goal_funding_gap !== undefined
    ? extractNumber(indicators.goal_funding_gap, fallbackGap)
    : fallbackGap

  const overallGoalProgressPct = totalGoalTarget > 0 
    ? Math.min(Math.round((totalGoalSaved / totalGoalTarget) * 100), 100) 
    : 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Insights"
        title="Cash Flow & Insights"
        description="Clear, actionable visibility into your money movement, spending breakdown, and financial momentum."
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: isConnected 
                  ? 'rgba(34, 197, 94, 0.12)' 
                  : 'rgba(59, 130, 246, 0.12)',
                color: isConnected ? '#16a34a' : '#2563eb',
                border: `1px solid ${isConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
              }}
            >
              {rFinancialAnalysisLoading 
                ? 'Updating...' 
                : isConnected 
                  ? 'Insights Updated' 
                  : 'Analysis Active'}
            </span>
            <button
              onClick={() => fetchRFinancialAnalysis()}
              disabled={rFinancialAnalysisLoading}
              className="button button--secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {rFinancialAnalysisLoading ? 'Updating...' : 'Refresh Insights'}
            </button>
          </div>
        }
      />

      {rFinancialAnalysisError && (
        <SurfaceCard style={{ borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
          <p style={{ margin: 0, color: '#ef4444', fontSize: '0.875rem' }}>
            <strong>Notice:</strong> Unable to refresh analysis. Showing latest cached financial metrics.
          </p>
        </SurfaceCard>
      )}

      {/* 1. MONEY OVERVIEW GRID */}
      <div className="content-grid">
        <SurfaceCard className="surface-card--accent">
          <span className="eyebrow">Total Income</span>
          <h2 className="text-positive">{formatCurrency(totalIncome)}</h2>
          <p>Earnings captured across all logged activity.</p>
        </SurfaceCard>

        <SurfaceCard>
          <span className="eyebrow">Total Expenses</span>
          <h2 className="text-negative">{formatCurrency(totalExpenses)}</h2>
          <p>Operating outflow and recurring commitments.</p>
        </SurfaceCard>

        <SurfaceCard>
          <span className="eyebrow">Net Cash Flow</span>
          <h2 className={netCashFlow >= 0 ? 'text-positive' : 'text-negative'}>
            {formatCurrency(netCashFlow)}
          </h2>
          <p>Net margin remaining after spending.</p>
        </SurfaceCard>

        <SurfaceCard>
          <span className="eyebrow">Savings Rate</span>
          <h2>{savingsRate}%</h2>
          <p>Percentage of income retained.</p>
        </SurfaceCard>
      </div>

      {/* 2. INCOME VS EXPENSES & 3. SPENDING BREAKDOWN */}
      <div className="content-grid content-grid--wide">
        {/* Income vs Expenses Bar Chart */}
        <SurfaceCard>
          <div className="section-heading">
            <h2>Income vs Expenses</h2>
            <p>Visual proportion of inflow compared to operating outflow.</p>
          </div>

          {totalVolume > 0 ? (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--positive)' }}>Income</span>
                  <strong>{formatCurrency(totalIncome)} ({incomePct}%)</strong>
                </div>
                <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-strong)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${incomePct}%`, 
                      height: '100%', 
                      background: '#10b981', 
                      borderRadius: '6px',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--negative)' }}>Expenses</span>
                  <strong>{formatCurrency(totalExpenses)} ({expensePct}%)</strong>
                </div>
                <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-strong)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${expensePct}%`, 
                      height: '100%', 
                      background: '#ef4444', 
                      borderRadius: '6px',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Net Retention:</span>
                <strong className={netCashFlow >= 0 ? 'text-positive' : 'text-negative'}>
                  {formatCurrency(netCashFlow)} ({savingsRate}%)
                </strong>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No income or expense activity logged yet.
            </div>
          )}
        </SurfaceCard>

        {/* Spending Breakdown Donut Chart */}
        <SurfaceCard>
          <div className="section-heading">
            <h2>Spending Breakdown</h2>
            <p>Expense distribution across active spending categories.</p>
          </div>

          {processedCategories.length > 0 && totalCategoryAmount > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '20px', alignItems: 'center', marginTop: '1rem' }}>
              {/* Responsive SVG Donut Chart */}
              <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="70" stroke="var(--bg-strong)" strokeWidth="18" fill="none" />
                  {donutSlices.map((slice) => (
                    <circle
                      key={slice.key}
                      cx="80"
                      cy="80"
                      r="70"
                      stroke={slice.color}
                      strokeWidth="18"
                      strokeDasharray={slice.dashArray}
                      strokeDashoffset={slice.dashOffset}
                      fill="none"
                      style={{ transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease' }}
                    >
                      <title>{`${slice.name}: ${formatCurrency(slice.amount)} (${slice.percentage}%)`}</title>
                    </circle>
                  ))}
                </svg>
              </div>

              {/* Category Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {processedCategories.map((cat) => (
                  <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                    </div>
                    <strong style={{ marginLeft: '12px', flexShrink: 0 }}>{formatCurrency(cat.amount)} ({cat.percentage}%)</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No expense categories available. Add expense transactions to visualize category breakdown.
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* 4. CASH FLOW TREND CHART */}
      <SurfaceCard>
        <div className="section-heading">
          <h2>Cash Flow Trend</h2>
          <p>Daily net momentum derived from recent transaction activity.</p>
        </div>

        {weeklyTrend && weeklyTrend.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <div className="mini-chart" style={{ height: '160px', alignItems: 'flex-end', display: 'flex', gap: '16px' }}>
              {weeklyTrend.map((day) => {
                const dayInc = extractNumber(day.income, 0)
                const dayExp = extractNumber(day.expense, 0)
                const dayLabel = extractString(day.label, '')
                return (
                  <div key={extractString(day.date, dayLabel)} className="mini-chart__column" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div className="mini-chart__bars" style={{ width: '100%', height: '120px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px' }}>
                      <span
                        className="mini-chart__bar mini-chart__bar--income"
                        style={{ 
                          height: `${(dayInc / maxTrendVal) * 100}%`,
                          width: '12px',
                          borderRadius: '3px',
                          background: '#10b981'
                        }}
                        title={`Income: ${formatCurrency(dayInc)}`}
                      />
                      <span
                        className="mini-chart__bar mini-chart__bar--expense"
                        style={{ 
                          height: `${(dayExp / maxTrendVal) * 100}%`,
                          width: '12px',
                          borderRadius: '3px',
                          background: '#ef4444'
                        }}
                        title={`Expenses: ${formatCurrency(dayExp)}`}
                      />
                    </div>
                    <strong style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-muted)' }}>{dayLabel}</strong>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                <span>Daily Inflow</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }} />
                <span>Daily Outflow</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recent daily transaction data available to plot trend.
          </div>
        )}
      </SurfaceCard>

      {/* 5. SPENDING PATTERN & 6. RECURRING PAYMENTS */}
      <div className="content-grid">
        {/* Spending Pattern Card */}
        <SurfaceCard>
          <div className="section-heading">
            <h2>Spending Pattern</h2>
            <p>Analysis of your spending consistency and variability.</p>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div 
              style={{ 
                padding: '14px 16px', 
                borderRadius: '12px', 
                background: spendingPatternTone === 'positive' 
                  ? 'rgba(34, 197, 94, 0.08)' 
                  : spendingPatternTone === 'warning' 
                    ? 'rgba(245, 158, 11, 0.08)' 
                    : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${
                  spendingPatternTone === 'positive' 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : spendingPatternTone === 'warning' 
                      ? 'rgba(245, 158, 11, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'
                }`
              }}
            >
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>Stability Assessment</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                {spendingPatternText}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Average Expense / Tx</span>
                <strong>{expMean !== null ? formatCurrency(expMean) : 'N/A'}</strong>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Average Income / Tx</span>
                <strong>{incMean !== null ? formatCurrency(incMean) : 'N/A'}</strong>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {/* Recurring Payments Card */}
        <SurfaceCard>
          <div className="section-heading">
            <h2>Recurring Payments</h2>
            <p>Fixed monthly commitments and upcoming schedule.</p>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Monthly Fixed</span>
                <strong style={{ fontSize: '1.1rem' }}>{formatCurrency(totalRecurringAmount)}</strong>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Active Recurring Count</span>
                <strong style={{ fontSize: '1.1rem' }}>{recurringCount}</strong>
              </div>
            </div>

            {nextRecurring ? (
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Next Upcoming Charge</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{extractString(nextRecurring.title, 'Recurring Charge')}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due {formatDate(nextRecurring.nextCharge)}</div>
                  </div>
                  <strong className="text-negative">{formatCurrency(extractNumber(nextRecurring.amount, 0))}</strong>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                No active recurring commitments scheduled.
              </p>
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* 7. GOAL PROGRESS */}
      <SurfaceCard>
        <div className="section-heading">
          <h2>Goal Progress & Funding Gap</h2>
          <p>Overall reserve build across active financial targets.</p>
        </div>

        {goals && goals.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Saved So Far</span>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--positive)' }}>{formatCurrency(totalGoalSaved)}</h3>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Target Amount</span>
                <h3 style={{ margin: '4px 0 0 0' }}>{formatCurrency(totalGoalTarget)}</h3>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining Funding Gap</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#f59e0b' }}>{formatCurrency(remainingGoalGap)}</h3>
              </div>
            </div>

            <ProgressBar
              value={overallGoalProgressPct}
              label="Overall Portfolio Progress"
              helper={`${overallGoalProgressPct}% funding completed across ${goals.length} active goal${goals.length > 1 ? 's' : ''}`}
            />
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No financial goals set up yet. Create a goal to track your savings runway.
          </div>
        )}
      </SurfaceCard>
    </div>
  )
}
