import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../components/ui/PageHeader'
import ProgressBar from '../../components/ui/ProgressBar'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { useAppContext } from '../../context/AppContext'
import { formatCurrency } from '../../utils/formatters'

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

function generateCategoryExplanation(displayName, histSpend, sugLimit, diff) {
  const catNameLower = (displayName || 'this category').toLowerCase().trim()
  
  if (histSpend === 0 && sugLimit === 0) {
    return `No spending recorded for ${catNameLower}.`
  }
  
  if (histSpend === 0 && sugLimit > 0) {
    return `Up to ${formatCurrency(sugLimit)} is available for ${catNameLower} if needed.`
  }
  
  if (sugLimit === 0 && histSpend > 0) {
    return `Consider avoiding spending on ${catNameLower} to stay within budget.`
  }

  if (diff < -0.01) {
    return `Try to keep ${catNameLower} spending near ${formatCurrency(sugLimit)} to reduce discretionary spending.`
  }

  if (Math.abs(diff) <= 0.01) {
    return `Keep ${catNameLower} spending near ${formatCurrency(sugLimit)}; this category is already within the suggested range.`
  }

  return `Up to ${formatCurrency(sugLimit)} is available for ${catNameLower} based on your current budget and spending pattern.`
}

export default function BudgetRecommendationPage() {
  const { t } = useTranslation()
  const { 
    session,
    dataLoading,
    transactions, 
    recurringExpenses, 
    goals,
    totals,
    safeToSpendToday,
    rBudgetRecommendation,
    rBudgetLoading,
    rBudgetError,
    fetchRBudgetRecommendation
  } = useAppContext()

  useEffect(() => {
    if (session?.uid && !dataLoading) {
      fetchRBudgetRecommendation(transactions, goals, recurringExpenses)
    }
  }, [session?.uid, dataLoading, transactions, goals, recurringExpenses])

  const recData = rBudgetRecommendation?.budget_recommendation
  const catRecs = rBudgetRecommendation?.category_recommendations || []
  const goalRec = rBudgetRecommendation?.goal_recommendation
  const dataQuality = rBudgetRecommendation?.data_quality

  const rawStatus = rBudgetRecommendation?.status
  const normalizedBudgetStatus = extractString(rawStatus)
  const isConnected = rBudgetRecommendation && normalizedBudgetStatus === 'success'

  // 1. BUDGET SUMMARY VALUES (Extracted defensively from backend result with AppContext fallbacks)
  const incomeReference = recData 
    ? extractNumber(recData.income_reference, totals.earningsTotal || 0) 
    : (totals.earningsTotal || 0)

  const historicalSpending = totals.expensesTotal || 0

  const maxComfortableLimit = recData 
    ? extractNumber(recData.recommended_spending_limit, 0) 
    : 0

  const recommendedSavings = recData 
    ? extractNumber(recData.recommended_savings, 0) 
    : 0

  const goalAllocation = recData 
    ? extractNumber(recData.goal_allocation, 0) 
    : 0

  // 2. SPENDING HEADROOM (Calculated dynamically: maxComfortableLimit - historicalSpending)
  const spendingHeadroom = maxComfortableLimit > historicalSpending 
    ? maxComfortableLimit - historicalSpending 
    : 0

  // Comparison chart bar math
  const maxValForChart = Math.max(maxComfortableLimit, historicalSpending, 1)
  const historicalBarPct = Math.min(Math.round((historicalSpending / maxValForChart) * 100), 100)
  const maxLimitBarPct = Math.min(Math.round((maxComfortableLimit / maxValForChart) * 100), 100)

  // 3. GOALS DATA
  const targetMonthlyGoalContribution = goalRec 
    ? extractNumber(goalRec.target_monthly_contribution, goals.reduce((sum, g) => sum + extractNumber(g.monthlyContribution, 0), 0))
    : goals.reduce((sum, g) => sum + extractNumber(g.monthlyContribution, 0), 0)

  const recommendedMonthlyGoalAllocation = goalRec 
    ? extractNumber(goalRec.recommended_monthly_contribution, goalAllocation)
    : goalAllocation

  const remainingGoalFundingGap = goalRec 
    ? extractNumber(goalRec.remaining_goal_gap, goals.reduce((sum, g) => sum + Math.max(extractNumber(g.targetAmount, 0) - extractNumber(g.savedAmount, 0), 0), 0))
    : goals.reduce((sum, g) => sum + Math.max(extractNumber(g.targetAmount, 0) - extractNumber(g.savedAmount, 0), 0), 0)

  const totalGoalSaved = goals.reduce((sum, g) => sum + extractNumber(g.savedAmount, 0), 0)
  const totalGoalTarget = goals.reduce((sum, g) => sum + extractNumber(g.targetAmount, 0), 0)
  const overallGoalProgressPct = totalGoalTarget > 0 
    ? Math.min(Math.round((totalGoalSaved / totalGoalTarget) * 100), 100) 
    : 0

  // 4. PERSONALIZED GUIDANCE MESSAGE (Generated dynamically)
  const guidanceText = (() => {
    if (historicalSpending > 0 && maxComfortableLimit > 0) {
      if (historicalSpending < maxComfortableLimit * 0.6) {
        return "Your current spending is well below your maximum comfortable limit. You have substantial spending headroom while maintaining your current savings and goal allocations."
      } else if (historicalSpending <= maxComfortableLimit) {
        return "Your current spending is comfortably within your maximum limit. Continue following your category guidelines to maintain your savings pace."
      } else {
        return "Your current spending is near or above your maximum comfortable limit. Review discretionary spending categories to protect your savings targets."
      }
    }
    return "Log your income and expense transactions to generate personalized budget guidance."
  })()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="AI Assistant"
        title="Personalized Budget"
        description="A spending plan based on your income, expenses, savings and goals."
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
              {rBudgetLoading 
                ? 'Updating...' 
                : isConnected 
                  ? 'Budget Active' 
                  : 'Analysis Active'}
            </span>
            <button
              onClick={() => fetchRBudgetRecommendation()}
              disabled={rBudgetLoading}
              className="button button--secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {rBudgetLoading ? 'Updating...' : 'Refresh Budget'}
            </button>
          </div>
        }
      />

      {rBudgetError && (
        <SurfaceCard style={{ borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
          <p style={{ margin: 0, color: '#ef4444', fontSize: '0.875rem' }}>
            <strong>Notice:</strong> Unable to refresh budget recommendations. Displaying latest available financial guidance.
          </p>
        </SurfaceCard>
      )}

      {/* 1. BUDGET SUMMARY GRID */}
      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <SurfaceCard className="surface-card--accent">
          <span className="eyebrow">Monthly Income</span>
          <h2 className="text-positive">{formatCurrency(incomeReference)}</h2>
          <p>Reference monthly earnings captured.</p>
        </SurfaceCard>

        <SurfaceCard>
          <span className="eyebrow">Historical Spending</span>
          <h2>{formatCurrency(historicalSpending)}</h2>
          <p>Actual historical expense total.</p>
        </SurfaceCard>

        <SurfaceCard style={{ borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.03)' }}>
          <span className="eyebrow" style={{ color: 'var(--accent-blue)' }}>Monthly Budget Limit</span>
          <h2 style={{ color: '#2563eb' }}>{formatCurrency(maxComfortableLimit)}</h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            An upper spending guideline after essential costs, savings and goal allocations are considered.
          </p>
        </SurfaceCard>

        <SurfaceCard style={{ borderColor: 'rgba(34, 197, 94, 0.4)', background: 'rgba(34, 197, 94, 0.03)' }}>
          <span className="eyebrow" style={{ color: '#16a34a' }}>Safe to Spend Now</span>
          <h2 style={{ color: '#16a34a' }}>{formatCurrency(safeToSpendToday)}</h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            Uncommitted cash available to spend right now after past expenses, recurring obligations, and goals.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <span className="eyebrow">Recommended Savings</span>
          <h2 style={{ color: '#16a34a' }}>{formatCurrency(recommendedSavings)}</h2>
          <p>Protected for savings and reserves.</p>
        </SurfaceCard>

        <SurfaceCard>
          <span className="eyebrow">Goal Allocation</span>
          <h2 style={{ color: '#8b5cf6' }}>{formatCurrency(goalAllocation)}</h2>
          <p>Allocated monthly target contributions.</p>
        </SurfaceCard>
      </div>

      {/* 2. BUDGET COMPARISON & SPENDING HEADROOM VISUAL */}
      <SurfaceCard>
        <div className="section-heading">
          <h2>Budget Comparison & Spending Headroom</h2>
          <p>Comparing your current historical spending against your maximum comfortable spending limit.</p>
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600 }}>Historical Spending</span>
              <strong>{formatCurrency(historicalSpending)}</strong>
            </div>
            <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-strong)', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${historicalBarPct}%`, 
                  height: '100%', 
                  background: '#3b82f6', 
                  borderRadius: '6px',
                  transition: 'width 0.4s ease'
                }} 
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600, color: '#2563eb' }}>Maximum Comfortable Spending Limit</span>
              <strong style={{ color: '#2563eb' }}>{formatCurrency(maxComfortableLimit)}</strong>
            </div>
            <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-strong)', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${maxLimitBarPct}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', 
                  borderRadius: '6px',
                  transition: 'width 0.4s ease'
                }} 
              />
            </div>
          </div>

          {/* Spending Headroom Box */}
          <div 
            style={{ 
              marginTop: '0.5rem', 
              padding: '16px', 
              borderRadius: '12px', 
              background: 'rgba(34, 197, 94, 0.06)', 
              border: '1px solid rgba(34, 197, 94, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <strong style={{ fontSize: '1rem', color: '#16a34a', display: 'block' }}>Spending Headroom</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Room remaining between your current spending and the maximum comfortable limit.
              </span>
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#16a34a', flexShrink: 0, marginLeft: '16px' }}>
              {formatCurrency(spendingHeadroom)}
            </span>
          </div>
        </div>
      </SurfaceCard>

      {/* 3. PERSONALIZED GUIDANCE */}
      <SurfaceCard style={{ background: 'rgba(124, 58, 237, 0.04)', borderColor: 'rgba(124, 58, 237, 0.25)' }}>
        <div className="section-heading" style={{ marginBottom: '8px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <span>✨</span> Personalized Guidance
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
          {guidanceText}
        </p>
      </SurfaceCard>

      {/* 4. CATEGORY BUDGETS */}
      {catRecs.length > 0 ? (
        <SurfaceCard>
          <div className="section-heading">
            <h2>Category Spending Guidelines</h2>
            <p>Suggested spending limits by expense category to keep your overall budget balanced.</p>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Current Spending</th>
                  <th style={{ padding: '10px 12px' }}>Suggested Limit</th>
                  <th style={{ padding: '10px 12px' }}>Change</th>
                  <th style={{ padding: '10px 12px' }}>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {catRecs.map((cat, idx) => {
                  const rawCategory = extractString(cat.category, 'Uncategorized')
                  const displayName = rawCategory.startsWith('categories.') 
                    ? t(rawCategory) 
                    : rawCategory
                  const histSpend = extractNumber(cat.historical_spending, 0)
                  const sugLimit = extractNumber(cat.recommended_limit, 0)
                  const diff = extractNumber(cat.difference, 0)

                  const cleanExplanation = generateCategoryExplanation(displayName, histSpend, sugLimit, diff)

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{displayName}</td>
                      <td style={{ padding: '10px 12px' }}>{formatCurrency(histSpend)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2563eb' }}>{formatCurrency(sugLimit)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: diff >= 0 ? '#16a34a' : '#ef4444' }}>
                        {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{cleanExplanation}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No category limit recommendations available yet. Log expense transactions to see category suggestions.
          </div>
        </SurfaceCard>
      )}

      {/* 5. GOAL PLANNING & 6. SAVINGS SECTION */}
      <div className="content-grid">
        {/* Goal Planning */}
        <SurfaceCard>
          <div className="section-heading">
            <h2>Goal Planning & Progress</h2>
            <p>Monthly target allocations towards active financial goals.</p>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Monthly Goal Contribution</span>
                <strong style={{ fontSize: '1rem' }}>{formatCurrency(targetMonthlyGoalContribution)}</strong>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Recommended Monthly Allocation</span>
                <strong style={{ fontSize: '1rem', color: '#16a34a' }}>{formatCurrency(recommendedMonthlyGoalAllocation)}</strong>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-strong)', borderRadius: '8px' }}>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Remaining Goal Funding</span>
                <strong style={{ fontSize: '1rem', color: '#f59e0b' }}>{formatCurrency(remainingGoalFundingGap)}</strong>
              </div>
            </div>

            {goals && goals.length > 0 && (
              <ProgressBar
                value={overallGoalProgressPct}
                label="Overall Goal Portfolio Progress"
                helper={`${overallGoalProgressPct}% completed across ${goals.length} active goal${goals.length > 1 ? 's' : ''}`}
              />
            )}
          </div>
        </SurfaceCard>

        {/* Savings Protection */}
        <SurfaceCard>
          <div className="section-heading">
            <h2>Recommended Savings</h2>
            <p>Protected monthly savings for future security and cash reserves.</p>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Protected Monthly Savings</span>
              <h2 style={{ margin: '4px 0 8px 0', color: '#16a34a' }}>{formatCurrency(recommendedSavings)}</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Amount currently protected for savings and future goals.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
