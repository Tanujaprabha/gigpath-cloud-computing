export const transactionCategories = {
  income: [
    { key: 'categories.rideShare', fallback: 'Ride Share' },
    { key: 'categories.delivery', fallback: 'Delivery' },
    { key: 'categories.freelance', fallback: 'Freelance' },
    { key: 'categories.bonus', fallback: 'Bonus' },
    { key: 'categories.tips', fallback: 'Tips' }
  ],
  expense: [
    { key: 'categories.fuel', fallback: 'Fuel' },
    { key: 'categories.food', fallback: 'Food' },
    { key: 'categories.maintenance', fallback: 'Maintenance' },
    { key: 'categories.subscriptions', fallback: 'Subscriptions' },
    { key: 'categories.phone', fallback: 'Phone' },
    { key: 'categories.workspace', fallback: 'Workspace' },
    { key: 'categories.taxes', fallback: 'Taxes' },
    { key: 'categories.supplies', fallback: 'Supplies' },
    { key: 'categories.insurance', fallback: 'Insurance' },
    { key: 'categories.admin', fallback: 'Admin' }
  ],
}

export const sidebarSections = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    basePath: '/app/dashboard',
    mainTo: '/app/dashboard',
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'finance',
    basePath: '/app/finance',
    mainTo: '/app/finance/transactions',
    children: [
      { label: 'Transaction List', to: '/app/finance/transactions' },
      { label: 'Add Transaction', to: '/app/finance/transactions/new' },
      { label: 'Category Breakdown', to: '/app/finance/categories' },
      { label: 'Monthly Report', to: '/app/finance/monthly-report' },
      { label: 'Recurring Expenses', to: '/app/finance/recurring-expenses' },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: 'insights',
    basePath: '/app/insights',
    mainTo: '/app/insights/overview',
    children: [
      { label: 'Overview', to: '/app/insights/overview' },
      { label: 'Cash Flow', to: '/app/insights/cash-flow' },
      { label: 'Financial Health', to: '/app/insights/financial-health' },
    ],
  },
  {
    key: 'goals',
    label: 'Goals',
    icon: 'goals',
    basePath: '/app/goals',
    mainTo: '/app/goals',
    children: [
      { label: 'Goals List', to: '/app/goals' },
      { label: 'Add Goal', to: '/app/goals/new' },
      { label: 'Goal Details', to: '/app/goals/detail' },
      { label: 'Goal Progress', to: '/app/goals/progress' },
    ],
  },
  {
    key: 'budgetRecommendation',
    label: 'Budget Recommendation',
    icon: 'spark',
    basePath: '/app/ai/budget-recommendation',
    mainTo: '/app/ai/budget-recommendation',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'profile',
    basePath: '/app/profile',
    mainTo: '/app/profile',
    children: [
      { label: 'View Profile', to: '/app/profile' },
      { label: 'Edit Profile', to: '/app/profile/edit' },
      { label: 'Preferences', to: '/app/profile/preferences' },
      { label: 'Notifications', to: '/app/notifications' },
      { label: 'Help', to: '/app/profile/help' },
    ],
  },
]

export const initialTransactions = [
  {
    id: 'tx-101',
    title: 'Uber Airport Run',
    amount: 210,
    type: 'income',
    category: 'categories.rideShare',
    date: '2026-05-05',
    status: 'status.cleared',
    method: 'methods.bankTransfer',
    note: 'Peak-hour multiplier lifted this shift.',
  },
  {
    id: 'tx-102',
    title: 'DoorDash Lunch Rush',
    amount: 124,
    type: 'income',
    category: 'categories.delivery',
    date: '2026-05-04',
    status: 'status.cleared',
    method: 'methods.walletTransfer',
    note: 'Strong lunch demand near downtown offices.',
  },
  {
    id: 'tx-103',
    title: 'Fuel Top-Up',
    amount: 48,
    type: 'expense',
    category: 'categories.fuel',
    date: '2026-05-04',
    status: 'status.paid',
    method: 'methods.card',
    note: 'Full tank before airport queue window.',
  },
  {
    id: 'tx-104',
    title: 'Mobile Data Plan',
    amount: 29,
    type: 'expense',
    category: 'categories.phone',
    date: '2026-05-03',
    status: 'status.paid',
    method: 'methods.autopay',
    note: 'Essential for navigation and delivery apps.',
  },
  {
    id: 'tx-105',
    title: 'Freelance Invoice',
    amount: 680,
    type: 'income',
    category: 'categories.freelance',
    date: '2026-05-02',
    status: 'status.cleared',
    method: 'methods.bankTransfer',
    note: 'Landing-page copy refresh for local studio.',
  },
  {
    id: 'tx-106',
    title: 'Tire Service',
    amount: 96,
    type: 'expense',
    category: 'categories.maintenance',
    date: '2026-04-29',
    status: 'status.paid',
    method: 'methods.card',
    note: 'Preventive rotation ahead of heavier weekends.',
  },
  {
    id: 'tx-107',
    title: 'Weekend Event Gig',
    amount: 340,
    type: 'income',
    category: 'categories.bonus',
    date: '2026-04-25',
    status: 'status.cleared',
    method: 'methods.directDeposit',
    note: 'Brand ambassador work at a sports event.',
  },
  {
    id: 'tx-108',
    title: 'Streaming Subscription',
    amount: 18,
    type: 'expense',
    category: 'categories.subscriptions',
    date: '2026-04-27',
    status: 'status.paid',
    method: 'methods.autopay',
    note: 'Keeps downtime calm between long shifts.',
  },
  {
    id: 'tx-109',
    title: 'Groceries Restock',
    amount: 62,
    type: 'expense',
    category: 'categories.food',
    date: '2026-04-24',
    status: 'status.paid',
    method: 'methods.card',
    note: 'Meal prep for the upcoming work week.',
  },
  {
    id: 'tx-110',
    title: 'Coworking Day Pass',
    amount: 36,
    type: 'expense',
    category: 'categories.workspace',
    date: '2026-04-21',
    status: 'status.paid',
    method: 'methods.card',
    note: 'Quiet space for client calls and invoicing.',
  },
]

export const initialRecurringExpenses = [
  {
    id: 'rec-101',
    title: 'Commercial Insurance',
    category: 'categories.insurance',
    amount: 118,
    nextCharge: '2026-05-11',
    frequency: 'frequency.monthly',
    status: 'status.scheduled',
  },
  {
    id: 'rec-102',
    title: 'Fuel Membership',
    category: 'categories.fuel',
    amount: 45,
    nextCharge: '2026-05-08',
    frequency: 'frequency.monthly',
    status: 'status.scheduled',
  },
  {
    id: 'rec-103',
    title: 'Bookkeeping Tool',
    category: 'categories.admin',
    amount: 22,
    nextCharge: '2026-05-15',
    frequency: 'frequency.monthly',
    status: 'status.scheduled',
  },
  {
    id: 'rec-104',
    title: 'Cloud Storage',
    category: 'categories.subscriptions',
    amount: 14,
    nextCharge: '2026-05-19',
    frequency: 'frequency.monthly',
    status: 'status.scheduled',
  },
]

export const initialGoals = [
  {
    id: 'goal-101',
    title: 'Emergency Cushion',
    purpose: 'Cash buffer for slow demand weeks and repairs.',
    targetAmount: 3000,
    savedAmount: 1650,
    deadline: '2026-10-01',
    monthlyContribution: 270,
    priority: 'priority.high',
  },
  {
    id: 'goal-102',
    title: 'Tax Buffer',
    purpose: 'Stay ahead on quarterly taxes without stress.',
    targetAmount: 2200,
    savedAmount: 920,
    deadline: '2026-09-15',
    monthlyContribution: 220,
    priority: 'priority.high',
  },
  {
    id: 'goal-103',
    title: 'New Scooter Down Payment',
    purpose: 'Expand delivery radius with a more efficient vehicle.',
    targetAmount: 4500,
    savedAmount: 1880,
    deadline: '2027-02-01',
    monthlyContribution: 320,
    priority: 'priority.medium',
  },
]

export const initialProfile = {
  fullName: 'Jordan Miles',
  email: 'jordan@gigpath.app',
  phone: '(415) 555-0186',
  city: 'San Francisco, CA',
  workType: 'Ride-share and delivery',
  bio: 'Independent gig worker balancing ride-share, delivery, and freelance side projects.',
  payoutMethod: 'Checking account ending in 3842',
}

export const initialSettings = {
  weeklyDigest: true,
  autoCategorization: true,
  lowBalanceAlerts: true,
  recurringReview: false,
}

export const initialSecurity = {
  mfaEnabled: true,
  sessionAlerts: true,
  lastPasswordUpdate: '2026-03-11',
}

export const initialPreferences = {
  currency: 'INR',
  summaryDay: 'Monday',
  compactTables: false,
  accentTheme: 'Ocean',
  dashboardDensity: 'Comfortable',
}

export const quickPromptTemplates = [
  'What can I cut this week without hurting income?',
  'How much should I reserve for taxes this month?',
  'Show a safer daily spending target.',
]

export const helpTopics = [
  {
    question: 'How does GigPath calculate Safe to Spend?',
    answer:
      'It starts from current savings, then leaves room for recurring commitments and near-term cash flow so you can make daily decisions with less guesswork.',
  },
  {
    question: 'Can I connect a bank account here?',
    answer:
      'This frontend demo uses local dummy data only, so there is no live syncing. The interface is structured as if a real integration could be added later.',
  },
  {
    question: 'What is the financial health score based on?',
    answer:
      'The score balances savings rate, recurring expense pressure, and progress across your active goals to give a quick signal rather than a full audit.',
  },
]
