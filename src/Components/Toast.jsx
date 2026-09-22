import { useEffect } from 'react'

// Short message at the bottom of the screen that disappears on its own.
// "toast" is { id, message }; a new id restarts the timer.
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDone, 3500)
    return () => clearTimeout(timer)
  }, [toast, onDone])

  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
