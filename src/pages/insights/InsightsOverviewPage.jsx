import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { useAppContext } from '../../context/AppContext'
import { formatCurrency, formatPercent, formatTimeAgo } from '../../utils/formatters'

export default function InsightsOverviewPage() {
  const { totals, safeToSpendToday, financialHealthScore, categoryBreakdown, aiInsights, aiLoading } = useAppContext()
  const savingsRate = totals.earningsTotal
    ? (totals.savingsTotal / totals.earningsTotal) * 100
    : 0

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Insights"
        title="Overview"
        description="A quick read on margin, discipline, and what is driving your financial position right now."
      />

      <div className="stat-grid">
        <StatCard
          icon="spark"
          label="Safe to Spend Now"
          value={formatCurrency(safeToSpendToday)}
          description="Uncommitted liquid cash available after obligations."
          tone="neutral"
        />
        <StatCard
          icon="insights"
          label="Savings rate"
          value={formatPercent(savingsRate)}
          description="Portion of income still protected."
          tone="positive"
        />
        <StatCard
          icon="shield"
          label="Health score"
          value={`${financialHealthScore}/100`}
          description="High-level resilience signal."
          tone="neutral"
        />
      </div>

      <SurfaceCard>
        <div className="section-heading">
          <h2>Primary expense drivers</h2>
          <p>The categories creating the most pressure on your weekly margin.</p>
        </div>
        <div className="bar-list">
          {categoryBreakdown.slice(0, 4).map((item) => (
            <div key={item.category} className="bar-list__item">
              <div className="bar-list__meta">
                <strong>{item.category}</strong>
                <span>{formatCurrency(item.amount)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${item.share}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="section-heading">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-violet)' }}>✨</span> AI Financial Insights
          </h2>
          <p>Real-time analysis and suggestions generated from your financial profile.</p>
        </div>
        <div className="simple-list">
          {aiLoading ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)' }}>Generating insights...</div>
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
            <div style={{ padding: '16px', color: 'var(--text-muted)' }}>No insights available right now. Add some financial data to get started.</div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}
