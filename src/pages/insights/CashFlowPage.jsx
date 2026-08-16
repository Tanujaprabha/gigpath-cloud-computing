import { useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { useAppContext } from '../../context/AppContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export default function CashFlowPage() {
  const { 
    session,
    dataLoading,
    weeklyTrend, 
    recurringExpenses,
    transactions,
    goals,
    rFinancialAnalysis,
    rFinancialAnalysisLoading,
    rFinancialAnalysisError,
    fetchRFinancialAnalysis
  } = useAppContext()

  useEffect(() => {
    if (session?.uid && !dataLoading && !rFinancialAnalysis && !rFinancialAnalysisLoading) {
      fetchRFinancialAnalysis(transactions, goals, recurringExpenses)
    }
  }, [session?.uid, dataLoading, transactions.length, goals.length, recurringExpenses.length, rFinancialAnalysis, rFinancialAnalysisLoading])

  const averageNet =
    weeklyTrend.reduce((sum, day) => sum + day.net, 0) / (weeklyTrend.length || 1)
  const nextRecurring = [...recurringExpenses].sort(
    (left, right) => new Date(left.nextCharge) - new Date(right.nextCharge),
  )[0]

  const normalizedAnalysisStatus = Array.isArray(rFinancialAnalysis?.status) ? rFinancialAnalysis.status[0] : rFinancialAnalysis?.status
  const isConnected = rFinancialAnalysis && normalizedAnalysisStatus === 'success'
  const analysisData = rFinancialAnalysis?.analysis
  const summary = analysisData?.transaction_summary
  const catAnalysis = analysisData?.category_analysis?.categories || {}
  const monthlyAnalysis = analysisData?.monthly_analysis || {}
  const incVar = analysisData?.income_variability
  const expVar = analysisData?.expense_variability
  const recAnalysis = analysisData?.recurring_expenses
  const goalAnalysis = analysisData?.goals
  const indicators = analysisData?.financial_indicators
  const limitations = rFinancialAnalysis?.data_limitations || []
  const dataQuality = rFinancialAnalysis?.data_quality

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Insights"
        title="Cash Flow & R Financial Analysis"
        description="Near-term money movement integrated with user-level statistical financial analysis from R."
      />

      {/* R Server Status & Connection Header */}
      <SurfaceCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>R Financial Analysis Service (Current User)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
              Endpoint: <code>POST http://localhost:8000/financial-analysis/user</code>
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
              {rFinancialAnalysisLoading 
                ? 'Calculating in R...' 
                : isConnected 
                  ? 'R Server Online (200 OK)' 
                  : (rFinancialAnalysisError?.includes('500') || rFinancialAnalysisError?.includes('API Error'))
                    ? 'R API Error'
                    : 'R Server Offline'}
            </span>
            <button 
              onClick={() => fetchRFinancialAnalysis()} 
              disabled={rFinancialAnalysisLoading}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: rFinancialAnalysisLoading ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--accent-blue, #3b82f6)',
                color: '#fff',
                border: 'none'
              }}
            >
              {rFinancialAnalysisLoading ? 'Processing...' : 'Run R Analysis'}
            </button>
          </div>
        </div>

        {rFinancialAnalysisError && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontSize: '0.85rem',
            marginTop: '8px'
          }}>
            <strong>Connection Error:</strong> {rFinancialAnalysisError}
          </div>
        )}
      </SurfaceCard>

      {/* R Financial Analysis Section */}
      {isConnected && summary ? (
        <>
          {/* Key Metrics Grid */}
          <div className="content-grid">
            <SurfaceCard className="surface-card--accent">
              <span className="eyebrow">R Total Income</span>
              <h2>{formatCurrency(summary.total_income)}</h2>
              <p>Income transactions count: {summary.income_transactions_count}</p>
            </SurfaceCard>

            <SurfaceCard>
              <span className="eyebrow">R Total Expenses</span>
              <h2>{formatCurrency(summary.total_expenses)}</h2>
              <p>Expense transactions count: {summary.expense_transactions_count}</p>
            </SurfaceCard>

            <SurfaceCard>
              <span className="eyebrow">R Net Cash Flow</span>
              <h2 className={summary.net_cash_flow >= 0 ? 'text-positive' : 'text-negative'}>
                {formatCurrency(summary.net_cash_flow)}
              </h2>
              <p>Savings Rate: <strong>{summary.savings_rate_percent}%</strong></p>
            </SurfaceCard>
          </div>

          {/* R Statistical Variability & Indicators */}
          <SurfaceCard>
            <div className="section-heading">
              <h2>R Statistical Income & Expense Variability</h2>
              <p>Descriptive metrics calculated directly on your authenticated dataset.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>Income Variability</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Average: <strong>{incVar ? formatCurrency(incVar.mean) : 'N/A'}</strong></div>
                  <div>Median: <strong>{incVar ? formatCurrency(incVar.median) : 'N/A'}</strong></div>
                  <div>Std Dev: <strong>{incVar && typeof incVar.sd === 'number' ? formatCurrency(incVar.sd) : String(incVar?.sd)}</strong></div>
                  <div>Coefficient of Variation: <strong>{incVar && typeof incVar.cv === 'number' ? incVar.cv : String(incVar?.cv)}</strong></div>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Expense Variability</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Average: <strong>{expVar ? formatCurrency(expVar.mean) : 'N/A'}</strong></div>
                  <div>Median: <strong>{expVar ? formatCurrency(expVar.median) : 'N/A'}</strong></div>
                  <div>Std Dev: <strong>{expVar && typeof expVar.sd === 'number' ? formatCurrency(expVar.sd) : String(expVar?.sd)}</strong></div>
                  <div>Coefficient of Variation: <strong>{expVar && typeof expVar.cv === 'number' ? expVar.cv : String(expVar?.cv)}</strong></div>
                </div>
              </div>
            </div>
          </SurfaceCard>

          {/* R Category & Monthly Cash Flow Breakdown */}
          {Object.keys(catAnalysis).length > 0 && (
            <SurfaceCard>
              <div className="section-heading">
                <h2>R Category Expense Distribution</h2>
                <p>Categorical expenditure distribution across your transactions.</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Category</th>
                    <th style={{ padding: '8px' }}>Total Spend</th>
                    <th style={{ padding: '8px' }}>Share of Total</th>
                    <th style={{ padding: '8px' }}>Average Expense</th>
                    <th style={{ padding: '8px' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(catAnalysis).map(([catKey, catObj], idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{catObj.category || catKey}</td>
                      <td style={{ padding: '8px' }}>{formatCurrency(catObj.total_spending)}</td>
                      <td style={{ padding: '8px' }}>{catObj.percentage_of_total_expenses}%</td>
                      <td style={{ padding: '8px' }}>{formatCurrency(catObj.average_expense)}</td>
                      <td style={{ padding: '8px' }}>{catObj.transaction_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SurfaceCard>
          )}

          {/* R Indicators & Recurring Burden */}
          {indicators && (
            <SurfaceCard>
              <div className="section-heading">
                <h2>R Financial Indicators & Obligations</h2>
                <p>Key ratios and obligations derived from R analysis.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.85rem', marginTop: '12px' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Expense-to-Income Ratio</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{indicators.expense_to_income_ratio_percent}%</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Recurring Expense Burden</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{indicators.recurring_expense_burden_percent}%</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Goal Funding Gap</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(indicators.goal_funding_gap)}</div>
                </div>
              </div>
            </SurfaceCard>
          )}

          {/* R Limitations & Data Quality */}
          {dataQuality && (
            <SurfaceCard style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>User Transactions Analyzed: <strong>{dataQuality.transactions_used}</strong></span>
                <span>Goals Analyzed: <strong>{dataQuality.goals_used}</strong></span>
                <span>Recurring Expenses Analyzed: <strong>{dataQuality.recurring_expenses_used}</strong></span>
              </div>
              {limitations.length > 0 && (
                <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                  <strong>R Analysis Declarations:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </SurfaceCard>
          )}
        </>
      ) : null}

      {/* Standard GigPath Rolling 7-Day View (Preserved Existing UI) */}
      <div className="content-grid">
        <SurfaceCard className="surface-card--accent">
          <span className="eyebrow">Average daily net (7-Day Rolling)</span>
          <h2>{formatCurrency(averageNet)}</h2>
          <p>Based on the current rolling 7-day view.</p>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-heading">
            <h2>Next fixed charge</h2>
            <p>What is coming up first on your recurring calendar.</p>
          </div>
          {nextRecurring ? (
            <div className="detail-grid detail-grid--compact">
              <div>
                <span>Expense</span>
                <strong>{nextRecurring.title}</strong>
              </div>
              <div>
                <span>Due date</span>
                <strong>{formatDate(nextRecurring.nextCharge)}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>{formatCurrency(nextRecurring.amount)}</strong>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', padding: '12px 0' }}>No upcoming recurring expenses.</p>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="section-heading">
          <h2>Recent daily net</h2>
          <p>Positive days create room. Negative days signal where adjustments may help.</p>
        </div>
        <div className="simple-list">
          {weeklyTrend.map((day) => (
            <div key={day.date} className="simple-list__item">
              <div>
                <strong>{day.label}</strong>
                <span>
                  Income {formatCurrency(day.income)} • Expenses {formatCurrency(day.expense)}
                </span>
              </div>
              <strong className={day.net >= 0 ? 'text-positive' : 'text-negative'}>
                {formatCurrency(day.net)}
              </strong>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}
