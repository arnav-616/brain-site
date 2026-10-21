// "Today", "Yesterday", "3 days ago", or a short date.
export const relDay = (iso) => {
  if (!iso) return ''
  const d = Math.round((new Date(new Date().toLocaleDateString('en-CA') + 'T12:00:00') - new Date(String(iso).slice(0, 10) + 'T12:00:00')) / 864e5)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d > 1 && d < 7) return `${d} days ago`
  return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
