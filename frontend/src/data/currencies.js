export const CURRENCIES = [
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'NZD', symbol: '$', name: 'New Zealand Dollar' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen' },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
]

export function getCurrencySymbol(code) {
  const c = CURRENCIES.find(x => x.code === code)
  return c ? c.symbol : '$'
}

export function formatMoney(amount, currencyCode = 'AUD') {
  const symbol = getCurrencySymbol(currencyCode)
  const num = Number(amount) || 0
  return `${symbol}${num.toFixed(2)}`
}
