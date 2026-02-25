import { s } from './styles'

type ToastProps = {
  message: string
  type: 'success' | 'error'
  onDone: () => void
}

export function Toast({ message, type, onDone }: ToastProps) {
  return (
    <div style={{
      position: 'fixed' as const,
      bottom: 24,
      right: 24,
      zIndex: 100,
      padding: '12px 20px',
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 500,
      maxWidth: 420,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${type === 'success' ? 'rgba(100,220,140,0.25)' : 'rgba(255,100,100,0.25)'}`,
      background: type === 'success' ? 'rgba(100,220,140,0.1)' : 'rgba(255,100,100,0.1)',
      color: type === 'success' ? '#8fffb0' : '#ff9090',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      animation: 'fadeInUp 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    }}>
      <span>{message}</span>
      <button
        onClick={onDone}
        style={s.modalClose}
      >
        x
      </button>
    </div>
  )
}
