import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionCategories } from '../../data/mockData'
import SurfaceCard from './SurfaceCard'

const defaultValues = {
  title: '',
  amount: '',
  type: 'income',
  category: transactionCategories.income[0].key,
  date: '2026-05-05',
  method: 'methods.bankTransfer',
  status: 'status.cleared',
  note: '',
}

export default function TransactionForm({
  title,
  description,
  initialValues = defaultValues,
  submitLabel,
  onSubmit,
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ ...defaultValues, ...initialValues })

  const handleChange = ({ target }) => {
    const { name, value } = target

    setForm((current) => {
      if (name === 'type') {
        const nextCategories = transactionCategories[value]
        const categoryExists = nextCategories.find(c => c.key === current.category)
        const nextCategory = categoryExists
          ? current.category
          : nextCategories[0].key

        return {
          ...current,
          type: value,
          category: nextCategory,
        }
      }

      return {
        ...current,
        [name]: value,
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({
      ...form,
      amount: Number(form.amount),
    })
  }

  const categories = transactionCategories[form.type]

  return (
    <SurfaceCard className="form-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Title</span>
          <input
            required
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Airport run payout"
          />
        </label>

        <label className="field">
          <span>Amount</span>
          <input
            required
            min="0"
            step="0.01"
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
          />
        </label>

        <label className="field">
          <span>{t('finance.type', 'Type')}</span>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="income">{t('finance.filter_income', 'Income')}</option>
            <option value="expense">{t('finance.filter_expense', 'Expense')}</option>
          </select>
        </label>

        <label className="field">
          <span>{t('finance.category', 'Category')}</span>
          <select name="category" value={form.category} onChange={handleChange}>
            {categories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {t(cat.key, cat.fallback)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Date</span>
          <input required type="date" name="date" value={form.date} onChange={handleChange} />
        </label>

        <label className="field">
          <span>{t('finance.method', 'Method')}</span>
          <select name="method" value={form.method} onChange={handleChange}>
            {['methods.bankTransfer', 'methods.walletTransfer', 'methods.card', 'methods.autopay', 'methods.directDeposit', 'methods.cash', 'methods.upi'].map(m => (
              <option key={m} value={m}>{t(m)}</option>
            ))}
          </select>
        </label>

        {form.type === 'expense' && (
          <label className="field">
            <span>{t('finance.status', 'Status')}</span>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="status.cleared">{t('status.cleared', 'Cleared')}</option>
              <option value="status.paid">{t('status.paid', 'Paid')}</option>
              <option value="status.pending">{t('status.pending', 'Pending')}</option>
            </select>
          </label>
        )}

        <label className="field field--full">
          <span>Note</span>
          <textarea
            rows="4"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Add a little context for future you."
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="button button--primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </SurfaceCard>
  )
}
