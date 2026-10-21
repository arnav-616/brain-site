// Full-screen status message (loading, empty, error).
export function Message({ title, text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="h-3 w-3 animate-ping rounded-full bg-[#5EEAD4]" />
      <h1 className="mt-5 font-display text-xl text-ink">{title}</h1>
      {text && <p className="max-w-sm text-mute">{text}</p>}
    </div>
  )
}
