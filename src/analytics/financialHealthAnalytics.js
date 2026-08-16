/**
 * Analytics for overall financial health.
 */

import { getSavingsAnalytics, getGoalAnalytics } from './savingsAnalytics';

function toNumber(value) {
  return Number(value) || 0;
}

export const getFinancialHealthAnalytics = (data) => {
  const transactions = data?.transactions || [];
  const recurringExpenses = data?.recurringExpenses || [];
  const goals = data?.goals || [];

  const totalIncomeAll = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  // If the user has no income (whether brand new or having only expenses), score is 0
  if (totalIncomeAll === 0) {
    return {
      score: 0,
      label: transactions.length === 0 && recurringExpenses.length === 0 && goals.length === 0 
        ? 'New User' 
        : 'Needs Income',
      breakdown: {
        savingsScore: 0,
        stabilityScore: 0,
        recurringScore: 0,
        goalScore: 0,
        safeToSpendScore: 0,
      },
    };
  }

  // 1. Savings Ratio Component (30%)
  const savingsAnalytics = getSavingsAnalytics(data);
  const savingsRatio = savingsAnalytics.savingsRatio || 0;
  // Goal: 20% savings rate = 100 score
  const savingsScore = Math.min(Math.max(savingsRatio, 0) / 0.2, 1) * 100;

  // 2. Expense Stability Component (20%)
  // Measures cash margin: target month income vs expenses
  const targetMonth = savingsAnalytics.targetMonth;
  const monthTransactions = transactions.filter((t) => t.date && t.date.startsWith(targetMonth));
  const monthIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const monthExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  let stabilityScore = 100;
  if (monthExpense > 0) {
    // If income is at least 1.3x expenses, score is 100
    stabilityScore = Math.min(monthIncome / (monthExpense * 1.3), 1) * 100;
  } else if (monthIncome === 0) {
    stabilityScore = 50; // Neutral if no activity
  }

  // 3. Recurring Expense Load Component (20%)
  const totalRecurring = recurringExpenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const totalCombinedExpense = monthExpense + totalRecurring;
  const recurringRatio = totalCombinedExpense ? totalRecurring / totalCombinedExpense : 0;
  // Goal: Recurring expenses should be less than 40% of total expenses.
  // 0% recurring = 100 score, >= 50% recurring = 0 score
  const recurringScore = Math.max(0, Math.min(1, (0.5 - recurringRatio) / 0.5)) * 100;

  // 4. Goal Progress Component (15%)
  const goalAnalytics = getGoalAnalytics(data);
  const goalCompletion = goalAnalytics.completionPercentage || 0;
  const savingsConsistency = goalAnalytics.savingsConsistency ?? 100;
  const goalBaseScore = goals.length > 0 ? goalCompletion : 100;
  const goalScore = (goalBaseScore * 0.7) + (savingsConsistency * 0.3);

  // 5. Safe-to-Spend Balance Component (15%)
  const reservedGoalSavings = goals.reduce((sum, g) => sum + toNumber(g.monthlyContribution), 0);
  const safeToSpend = Math.max(monthIncome - monthExpense - totalRecurring - reservedGoalSavings, 0);
  const safeToSpendRatio = monthIncome ? safeToSpend / monthIncome : 0;
  // Goal: Safe-to-spend should be at least 15% of income
  const safeToSpendScore = monthIncome ? Math.min(safeToSpendRatio / 0.15, 1) * 100 : (safeToSpend > 0 ? 100 : 50);

  // Compute overall health score (0-100)
  const score = Math.round(
    savingsScore * 0.3 +
    stabilityScore * 0.2 +
    recurringScore * 0.2 +
    goalScore * 0.15 +
    safeToSpendScore * 0.15
  );

  const clampedScore = Math.max(0, Math.min(score, 100));

  // Determine health label
  let label;
  if (clampedScore >= 85) {
    label = 'Excellent';
  } else if (clampedScore >= 70) {
    label = 'Good';
  } else if (clampedScore >= 50) {
    label = 'Moderate';
  } else {
    label = 'Risky';
  }

  return {
    score: clampedScore,
    label,
    breakdown: {
      savingsScore,
      stabilityScore,
      recurringScore,
      goalScore,
      safeToSpendScore,
    },
  };
};
