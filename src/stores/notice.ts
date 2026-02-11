import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type NoticeType = 'error' | 'success' | 'info'

export interface NoticeItem {
  id: number
  message: string
  type: NoticeType
}

export const useNoticeStore = defineStore('admin-notice', () => {
  const items = ref<NoticeItem[]>([])
  const timerMap = new Map<number, number>()
  let sequence = 0

  const remove = (id: number) => {
    const timeoutId = timerMap.get(id)
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId)
      timerMap.delete(id)
    }
    items.value = items.value.filter((item) => item.id !== id)
  }

  const show = (msg: string, kind: NoticeType = 'error', duration = 6000) => {
    const message = msg?.trim()
    if (!message) return

    const id = ++sequence
    items.value.push({
      id,
      message,
      type: kind,
    })

    if (duration > 0) {
      const timeoutId = window.setTimeout(() => {
        remove(id)
      }, duration)
      timerMap.set(id, timeoutId)
    }

    if (items.value.length > 5) {
      const overflow = items.value.slice(0, items.value.length - 5)
      overflow.forEach((item) => remove(item.id))
    }

    return id
  }

  const clear = () => {
    const first = items.value[0]
    if (first) {
      remove(first.id)
    }
  }

  const clearAll = () => {
    items.value.forEach((item) => {
      const timeoutId = timerMap.get(item.id)
      if (typeof timeoutId === 'number') {
        window.clearTimeout(timeoutId)
      }
    })
    timerMap.clear()
    items.value = []
  }

  const message = computed(() => items.value[0]?.message || '')
  const type = computed<NoticeType>(() => items.value[0]?.type || 'info')
  const visible = computed(() => items.value.length > 0)

  return {
    items,
    message,
    type,
    visible,
    show,
    remove,
    clear,
    clearAll,
  }
})
