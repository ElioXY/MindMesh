import { useStore } from '../store'

export default function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.leaving ? 'leaving' : ''}`}>
          <span>{t.text}</span>
          {t.actionLabel && (
            <button onClick={() => { t.action?.(); dismiss(t.id) }}>{t.actionLabel}</button>
          )}
        </div>
      ))}
    </div>
  )
}
