import { useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import ProgressBar from '../../components/ui/ProgressBar'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { useAppContext } from '../../context/AppContext'
import { formatCurrency } from '../../utils/formatters'

export default function BudgetRecommendationPage() {
  const { 
    session,
    dataLoading,
    transactions, 
    recurringExpenses, 
    goals,
    rBudgetRecommendation,
    rBudgetLoading,
    rBudgetError,
    fetchRBudgetRecommendation
  } = useAppContext()

  useEffect(() => {
    if (session?.uid && !dataLoading && !rBudgetRecommendation && !rBudgetLoading) {
      fetchRBudgetRecommendation(transactions, goals, recurringExpenses)
    }
  }, [session?.uid, dataLoading, transactions.length, goals.length, recurringExpenses.length, rBudgetRecommendation, rBudgetLoading])

  const recData = rBudgetRecommendation?.budget_recommendation
  const catRecs = rBudgetRecommendation?.category_recommendations || []
  const goalRec = rBudgetRecommendation?.goal_recommendation
  const dataQuality = rBudgetRecommendation?.data_quality

  const normalizedBudgetStatus = Array.isArray(rBudgetRecommendation?.status) ? rBudgetRecommendation.status[0] : rBudgetRecommendation?.status
  const isConnected = rBudgetRecommendation && normalizedBudgetStatus === 'success'

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="R ANALYTICS BACKEND"
        title="R Personalized Budget Recommendation"
        description="Data-driven budget framework generated directly by the R Plumber API for your account."
      />

      {/* R Server Status / Connection Card */}
      <SurfaceCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>R Analytics Backend Connection</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
              Target Endpoint: <code>POST http://localhost:8000/budget-recommendation</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span 
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isConnected ? '#22c55e' : '#ef4444',
                border: `1px solid ${isConnected ? '#22c55e' : '#ef4444'}`
              }}
            >
              {rBudgetLoading 
                ? 'Connecting...' 
                : isConnected 
                  ? 'R Server Online (200 OK)' 
                  : (rBudgetError?.includes('500') || rBudgetError?.includes('API Error'))
                    ? 'R API Error'
                    : 'R Server Offline'}
            </span>
            <button 
              onClick={() => fetchRBudgetRecommendation()} 
              disabled={rBudgetLoading}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: rBudgetLoading ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--accent-blue, #3b82f6)',
                color: '#fff',
                border: 'none'
              }}
            >
              {rBudgetLoading ? 'Refreshing...' : 'Refresh R Recommendation'}
            </button>
          </div>
        </div>

        {rBudgetError && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontSize: '0.85rem',
            marginTop: '8px'
          }}>
            <strong>Connection Warning:</strong> {rBudgetError}
          </div>
        )}
      </SurfaceCard>

      {/* Main R Recommendation Output */}
      {isConnected && recData ? (
        <>
          <SurfaceCard>
            <div className="section-heading">
              <h2>Personalized R Budget Allocation</h2>
              <p>
                User ID: <code>{rBudgetRecommendation.user_id}</code> | Reference Income: <strong>{formatCurrency(recData.income_reference)}</strong>
              </p>
            </div>

            <div className="stack-list" style={{ marginTop: '16px' }}>
              <ProgressBar
                value={recData.income_reference > 0 ? Math.round((recData.essential_expenses / recData.income_reference) * 100) : 0}
                label={`Essential Operating Costs • ${formatCurrency(recData.essential_expenses)}`}
                helper="Fixed recurring commitments (EMI, subscriptions) plus essential fuel, phone, and maintenance with a 5% contingency buffer."
              />
              <ProgressBar
                value={recData.income_reference > 0 ? Math.round((recData.recommended_savings / recData.income_reference) * 100) : 0}
                label={`Recommended Savings & Goal Allocation • ${formatCurrency(recData.recommended_savings)}`}
                helper={`Includes ${formatCurrency(recData.goal_allocation)} goal contribution allocation + ${formatCurrency(recData.recommended_savings - recData.goal_allocation)} emergency reserve.`}
                color="linear-gradient(90deg, var(--accent-green, #22c55e), var(--accent-blue, #3b82f6))"
              />
              <ProgressBar
                value={recData.income_reference > 0 ? Math.round((recData.discretionary_expenses / recData.income_reference) * 100) : 0}
                label={`Discretionary Personal Limit • ${formatCurrency(recData.discretionary_expenses)}`}
                helper="Personal spending room after essential operating costs and savings targets are protected."
                color="linear-gradient(90deg, #eab308, #f97316)"
              />
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600 }}>Recommended Total Monthly Spending Limit:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>
                {formatCurrency(recData.recommended_spending_limit)}
              </span>
            </div>
          </SurfaceCard>

          {/* Goal Reasoning & Insights */}
          {goalRec && (
            <SurfaceCard>
              <div className="section-heading">
                <h2>Goal Feasibility & Recommendation</h2>
                <p>{goalRec.reason}</p>
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Target Monthly Goal Contribution</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{formatCurrency(goalRec.target_monthly_contribution)}</div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Recommended Monthly Allocation</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22c55e' }}>{formatCurrency(goalRec.recommended_monthly_contribution)}</div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Remaining Goal Funding Gap</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(goalRec.remaining_goal_gap)}</div>
                </div>
              </div>
            </SurfaceCard>
          )}

          {/* Category Recommendations Table */}
          {catRecs.length > 0 && (
            <SurfaceCard>
              <div className="section-heading">
                <h2>Category Spending Limit Recommendations</h2>
                <p>Controlled category limits based on user historical spending and cash margin.</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Category</th>
                    <th style={{ padding: '8px' }}>Historical Spend</th>
                    <th style={{ padding: '8px' }}>Recommended Limit</th>
                    <th style={{ padding: '8px' }}>Difference</th>
                    <th style={{ padding: '8px' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {catRecs.map((cat, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{cat.category}</td>
                      <td style={{ padding: '8px' }}>{formatCurrency(cat.historical_spending)}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(cat.recommended_limit)}</td>
                      <td style={{ padding: '8px', color: cat.difference >= 0 ? '#22c55e' : '#ef4444' }}>
                        {cat.difference >= 0 ? `+${formatCurrency(cat.difference)}` : formatCurrency(cat.difference)}
                      </td>
                      <td style={{ padding: '8px', opacity: 0.8, fontSize: '0.8rem' }}>{cat.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SurfaceCard>
          )}

          {/* Data Quality Footer */}
          {dataQuality && (
            <SurfaceCard style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Real Firebase Transactions Used: <strong>{dataQuality.transactions_used}</strong></span>
                <span>Active Goals Used: <strong>{dataQuality.goals_used}</strong></span>
                <span>Recurring Expenses Used: <strong>{dataQuality.recurring_expenses_used}</strong></span>
              </div>
            </SurfaceCard>
          )}
        </>
      ) : (
        <SurfaceCard>
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <h3>R Recommendation Pending / Server Offline</h3>
            <p style={{ opacity: 0.8, fontSize: '0.9rem', maxWidth: '600px', margin: '8px auto 16px auto' }}>
              To view your live R-based personalized budget recommendation, ensure the R Plumber API server is running on <code>http://localhost:8000</code>.
            </p>
            <button
              onClick={() => fetchRBudgetRecommendation()}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Retry R Connection
            </button>
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}
