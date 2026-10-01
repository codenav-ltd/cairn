import { ref } from 'vue'

export type ToastTone = 'neutral' | 'success' | 'danger'

export interface Toast {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

// Toasts are only raised from client-side handlers, so module state is safe here.
const toasts = ref<Toast[]>([])
let next = 0

export function useToast() {
  function push(title: string, options: { description?: string; tone?: ToastTone } = {}) {
    toasts.value.push({ id: next++, title, tone: options.tone ?? 'neutral', ...options })
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return {
    toasts,
    dismiss,
    success: (title: string, description?: string) => push(title, { description, tone: 'success' }),
    error: (title: string, description?: string) => push(title, { description, tone: 'danger' }),
    info: (title: string, description?: string) => push(title, { description }),
  }
}
