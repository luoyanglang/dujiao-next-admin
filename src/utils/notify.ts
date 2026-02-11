import i18n from '@/i18n'
import { useNoticeStore, type NoticeType } from '@/stores/notice'

const t = (key: string, params?: Record<string, unknown>) =>
  (params ? i18n.global.t(key, params) : i18n.global.t(key)) as string

const dedupeWindowMs = 800
let lastMessage = ''
let lastType: NoticeType | '' = ''
let lastAt = 0

const shouldSkip = (type: NoticeType, content: string) => {
  const normalized = content.trim()
  if (!normalized) {
    return false
  }
  const now = Date.now()
  const duplicated = lastType === type && lastMessage === normalized && now - lastAt <= dedupeWindowMs
  lastType = type
  lastMessage = normalized
  lastAt = now
  return duplicated
}

const pushNotice = (message: string | undefined, type: NoticeType, fallbackKey = 'common.api.requestFailed') => {
  try {
    const store = useNoticeStore()
    const fallback = t(fallbackKey)
    const content = message && message.trim() ? message : fallback
    if (shouldSkip(type, content)) {
      return
    }
    store.show(content, type)
  } catch {
  }
}

export const notifyError = (message?: string) => {
  pushNotice(message, 'error')
}

export const notifySuccess = (message?: string) => {
  pushNotice(message, 'success', 'admin.common.operationSuccess')
}

export const notifyInfo = (message?: string) => {
  pushNotice(message, 'info', 'admin.common.notice')
}
