import { useEffect, useState } from 'react'

// WMO weather codes → plain words.
const WORDS = [
  [0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [45, 'Foggy'], [48, 'Foggy'],
  [51, 'Light drizzle'], [53, 'Drizzle'], [55, 'Heavy drizzle'], [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'],
  [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'], [80, 'Showers'], [81, 'Showers'], [82, 'Heavy showers'],
  [95, 'Thunderstorms'], [96, 'Thunderstorms'], [99, 'Thunderstorms'],
]
const word = (code) => (WORDS.find(([c]) => c === code) ?? WORDS.findLast(([c]) => c <= code) ?? [0, ''])[1]

// Live weather for the place set in .brain/sources.json (Open-Meteo: free, no key, no account).
export default function Weather({ location }) {
  const [w, setW] = useState(null)
  useEffect(() => {
    if (!location) return
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
      '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&temperature_unit=fahrenheit&timezone=auto&forecast_days=1'
    fetch(url).then(r => r.json()).then(d => setW({
      now: Math.round(d.current.temperature_2m), code: d.current.weather_code,
      hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]), rain: d.daily.precipitation_probability_max[0],
    })).catch(() => {})
  }, [location])
  if (!w) return null
  return (
    <p className="text-sm text-ink/80">
      {w.now}° and {word(w.code).toLowerCase()} in {location.name.split(',')[0]}. High {w.hi}°, low {w.lo}°
      {w.rain >= 30 ? `, ${w.rain}% chance of rain` : ''}.
    </p>
  )
}
