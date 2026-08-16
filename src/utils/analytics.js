import { formatMonthLabel } from './formatters'

function toNumber(value) {
  return Number(value) || 0
}

function toDateValue(value) {
  return new Date(value).getTime()
}

export function sortTransactions(transactions) {
  return [...transactions].sort((left, right) => toDateValue(right.date) - toDateValue(left.date))
}

export function getTransactionTotals(transactions) {
  const earningsTotal = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  const expensesTotal = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  return {
    earningsTotal,
    expensesTotal,
    savingsTotal: Math.max(earningsTotal - expensesTotal, 0),
  }
}

export function getSafeToSpendToday(transactions, recurringExpenses) {
  const { savingsTotal } = getTransactionTotals(transactions)
  const recurringBuffer = recurringExpenses.reduce(
    (sum, expense) => sum + toNumber(expense.amount),
    0,
  )

  return Math.max(savingsTotal - recurringBuffer * 0.6, 0)
}

export function getCategoryBreakdown(transactions, targetType = 'expense') {
  const source =
    targetType === 'all'
      ? transactions
      : transactions.filter((transaction) => transaction.type === targetType)

  const total = source.reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

  return Object.entries(
    source.reduce((accumulator, transaction) => {
      accumulator[transaction.category] =
        (accumulator[transaction.category] || 0) + toNumber(transaction.amount)
      return accumulator
    }, {}),
  )
    .map(([category, amount]) => ({
      category,
      amount,
      share: total ? (amount / total) * 100 : 0,
    }))
    .sort((left, right) => right.amount - left.amount)
}

export function getMonthlyReport(transactions) {
  const grouped = transactions.reduce((accumulator, transaction) => {
    const key = `${transaction.date.slice(0, 7)}-01`
    const bucket = accumulator[key] || { month: key, income: 0, expense: 0 }

    if (transaction.type === 'income') {
      bucket.income += toNumber(transaction.amount)
    } else {
      bucket.expense += toNumber(transaction.amount)
    }

    accumulator[key] = bucket
    return accumulator
  }, {})

  return Object.values(grouped)
    .map((bucket) => ({
      ...bucket,
      label: formatMonthLabel(bucket.month),
      net: bucket.income - bucket.expense,
    }))
    .sort((left, right) => toDateValue(right.month) - toDateValue(left.month))
}

export function getWeeklyTrend(transactions) {
  const sorted = sortTransactions(transactions)
  const anchor = sorted[0]?.date || new Date().toISOString().slice(0, 10)
  const anchorDate = new Date(anchor)

  const buckets = []

  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(anchorDate)
    day.setDate(anchorDate.getDate() - index)
    const dayKey = day.toISOString().slice(0, 10)

    const dailyTransactions = transactions.filter((transaction) => transaction.date === dayKey)
    const income = dailyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)
    const expense = dailyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0)

    buckets.push({
      date: dayKey,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day),
      income,
      expense,
      net: income - expense,
    })
  }

  return buckets
}

export function getGoalProgress(goal) {
  return goal.targetAmount ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0
}

export function getDaysUntil(date) {
  const today = new Date()
  const future = new Date(date)
  const msPerDay = 1000 * 60 * 60 * 24

  return Math.max(Math.ceil((future.getTime() - today.getTime()) / msPerDay), 0)
}

export function getFinancialHealthScore(transactions, recurringExpenses, goals) {
  if (transactions.length === 0 && recurringExpenses.length === 0 && goals.length === 0) {
    return 0
  }

  const { earningsTotal, expensesTotal, savingsTotal } = getTransactionTotals(transactions)
  const savingsRate = earningsTotal ? savingsTotal / earningsTotal : 0
  const recurringLoad = expensesTotal
    ? recurringExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0) / expensesTotal
    : 0
  const averageGoalProgress =
    goals.reduce((sum, goal) => sum + getGoalProgress(goal), 0) / (goals.length || 1)

  const score =
    savingsRate * 48 +
    (1 - Math.min(recurringLoad, 1)) * 22 +
    (averageGoalProgress / 100) * 30

  return Math.max(Math.min(Math.round(score), 99), 35)
}
