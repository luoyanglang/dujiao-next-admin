<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import IdCell from '@/components/IdCell.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogScrollContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, getLocalizedText } from '@/utils/format'

const productIdInput = ref('')
const { t } = useI18n()
const productIdHint = ref(t('admin.cardSecrets.productHintEmpty'))
const productInfo = ref<any>(null)
const adminPath = import.meta.env.VITE_ADMIN_PATH || ''

const stats = ref<any>(null)
const statsLoading = ref(false)

const batches = ref<any[]>([])
const batchesLoading = ref(false)
const batchPagination = ref({
  page: 1,
  page_size: 20,
  total: 0,
  total_page: 1,
})
const batchJumpPage = ref('')
const cardSecrets = ref<any[]>([])
const cardSecretsLoading = ref(false)
const cardSecretStatus = ref('__all__')
const normalizeFilterValue = (value: string) => (value === '__all__' ? '' : value)
const cardSecretPagination = ref({
  page: 1,
  page_size: 20,
  total: 0,
  total_page: 1,
})
const cardSecretJumpPage = ref('')

const batchForm = ref({
  secrets: '',
  batch_no: '',
  note: '',
})
const batchSubmitting = ref(false)
const batchError = ref('')
const batchSuccess = ref('')

const importForm = ref({
  file: null as File | null,
  batch_no: '',
  note: '',
})
const importSubmitting = ref(false)
const importError = ref('')
const importSuccess = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const importFileLabel = computed(() => importForm.value.file?.name || t('admin.cardSecrets.csvPlaceholder'))

const showEditModal = ref(false)
const editSubmitting = ref(false)
const editError = ref('')
const editForm = reactive({
  id: 0,
  secret: '',
  status: 'available',
})

const parseProductId = () => {
  const parsed = Number(productIdInput.value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const productInfoName = computed(() => {
  if (!productInfo.value) return ''
  return getLocalizedText(productInfo.value.title)
})

const currentProductId = computed(() => parseProductId())

const resolveProductName = (productId: number) => {
  if (currentProductId.value && productId === currentProductId.value) {
    return productInfoName.value
  }
  return ''
}

const handleProductChange = () => {
  const productId = parseProductId()
  if (!productId) {
    productIdHint.value = t('admin.cardSecrets.productHintEmpty')
    stats.value = null
    productInfo.value = null
    batches.value = []
    batchPagination.value = {
      page: 1,
      page_size: 20,
      total: 0,
      total_page: 1,
    }
    fetchCardSecrets(1)
    return
  }
  productIdHint.value = t('admin.cardSecrets.productHintCurrent', { id: productId })
}

const productLink = (productId: number) => `${adminPath}/products?product_id=${productId}`
const orderLink = (orderId: number) => `${adminPath}/orders?order_id=${orderId}`

const loadProductInfo = async () => {
  const productId = parseProductId()
  if (!productId) {
    productInfo.value = null
    return
  }
  try {
    const response = await adminAPI.getProduct(productId)
    productInfo.value = response.data.data
  } catch (error) {
    productInfo.value = null
  }
}

const refreshStats = async () => {
  const productId = parseProductId()
  if (!productId) {
    stats.value = null
    return
  }
  statsLoading.value = true
  try {
    const response = await adminAPI.getCardSecretStats({ product_id: productId })
    stats.value = response.data.data
  } catch (error) {
    stats.value = null
  } finally {
    statsLoading.value = false
  }
}

const fetchBatches = async (page = 1) => {
  const productId = parseProductId()
  if (!productId) {
    batches.value = []
    return
  }
  batchesLoading.value = true
  try {
    const response = await adminAPI.getCardSecretBatches({
      product_id: productId,
      page,
      page_size: batchPagination.value.page_size,
    })
    batches.value = (response.data.data as any[]) || []
    batchPagination.value = response.data.pagination || batchPagination.value
  } catch (error) {
    batches.value = []
  } finally {
    batchesLoading.value = false
  }
}

const fetchCardSecrets = async (page = 1) => {
  const productId = parseProductId()
  cardSecretsLoading.value = true
  try {
    const params: Record<string, any> = {
      status: normalizeFilterValue(cardSecretStatus.value) || undefined,
      page,
      page_size: cardSecretPagination.value.page_size,
    }
    if (productId) {
      params.product_id = productId
    }
    const response = await adminAPI.getCardSecrets(params)
    cardSecrets.value = (response.data.data as any[]) || []
    cardSecretPagination.value = response.data.pagination || cardSecretPagination.value
  } catch (error) {
    cardSecrets.value = []
  } finally {
    cardSecretsLoading.value = false
  }
}

const refreshAll = () => {
  const productId = parseProductId()
  if (productId) {
    loadProductInfo()
    refreshStats()
    fetchBatches(1)
  } else {
    productInfo.value = null
    stats.value = null
    batches.value = []
    batchPagination.value = {
      page: 1,
      page_size: 20,
      total: 0,
      total_page: 1,
    }
  }
  fetchCardSecrets(1)
}

const changeBatchPage = (page: number) => {
  if (page < 1 || page > batchPagination.value.total_page) return
  fetchBatches(page)
}

const refreshBatches = () => {
  fetchBatches(batchPagination.value.page)
}

const refreshCardSecrets = () => {
  fetchCardSecrets(1)
}

const changeSecretPage = (page: number) => {
  if (page < 1 || page > cardSecretPagination.value.total_page) return
  fetchCardSecrets(page)
}

const jumpBatchPage = () => {
  if (!batchJumpPage.value) return
  const raw = Number(batchJumpPage.value)
  if (Number.isNaN(raw)) return
  const target = Math.min(Math.max(Math.floor(raw), 1), batchPagination.value.total_page)
  if (target === batchPagination.value.page) return
  changeBatchPage(target)
}

const jumpCardSecretPage = () => {
  if (!cardSecretJumpPage.value) return
  const raw = Number(cardSecretJumpPage.value)
  if (Number.isNaN(raw)) return
  const target = Math.min(Math.max(Math.floor(raw), 1), cardSecretPagination.value.total_page)
  if (target === cardSecretPagination.value.page) return
  changeSecretPage(target)
}

const openEditSecret = (secret: any) => {
  editForm.id = secret.id
  editForm.secret = secret.secret || ''
  editForm.status = secret.status || 'available'
  editError.value = ''
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editError.value = ''
}

const submitEdit = async () => {
  if (!editForm.id) return
  editSubmitting.value = true
  editError.value = ''
  try {
    await adminAPI.updateCardSecret(editForm.id, {
      secret: editForm.secret,
      status: editForm.status,
    })
    closeEditModal()
    fetchCardSecrets(cardSecretPagination.value.page)
  } catch (error: any) {
    editError.value = error?.message || t('admin.cardSecrets.errors.updateFailed')
  } finally {
    editSubmitting.value = false
  }
}

onMounted(() => {
  fetchCardSecrets(1)
})

const resetBatchForm = () => {
  batchForm.value.secrets = ''
  batchForm.value.batch_no = ''
  batchForm.value.note = ''
  batchError.value = ''
  batchSuccess.value = ''
}

const handleBatchCreate = async () => {
  batchError.value = ''
  batchSuccess.value = ''
  const productId = parseProductId()
  if (!productId) {
    batchError.value = t('admin.cardSecrets.errors.productRequired')
    return
  }
  const secrets = batchForm.value.secrets
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item)
  if (!secrets.length) {
    batchError.value = t('admin.cardSecrets.errors.secretsRequired')
    return
  }
  batchSubmitting.value = true
  try {
    await adminAPI.createCardSecretBatch({
      product_id: productId,
      secrets,
      batch_no: batchForm.value.batch_no.trim(),
      note: batchForm.value.note.trim(),
    })
    batchSuccess.value = t('admin.cardSecrets.success.batchCreated')
    batchForm.value.secrets = ''
    refreshAll()
  } catch (err: any) {
    batchError.value = err.message || t('admin.cardSecrets.errors.batchFailed')
  } finally {
    batchSubmitting.value = false
  }
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files && target.files[0]
  importForm.value.file = file || null
}

const triggerImportFile = () => {
  fileInput.value?.click()
}

const clearImportFile = () => {
  importForm.value.file = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const resetImportForm = () => {
  clearImportFile()
  importForm.value.batch_no = ''
  importForm.value.note = ''
  importError.value = ''
  importSuccess.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleImport = async () => {
  importError.value = ''
  importSuccess.value = ''
  const productId = parseProductId()
  if (!productId) {
    importError.value = t('admin.cardSecrets.errors.productRequired')
    return
  }
  if (!importForm.value.file) {
    importError.value = t('admin.cardSecrets.errors.fileRequired')
    return
  }
  importSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('product_id', String(productId))
    formData.append('batch_no', importForm.value.batch_no.trim())
    formData.append('note', importForm.value.note.trim())
    formData.append('file', importForm.value.file)
    await adminAPI.importCardSecretCSV(formData)
    importSuccess.value = t('admin.cardSecrets.success.imported')
    resetImportForm()
    refreshAll()
  } catch (err: any) {
    importError.value = err.message || t('admin.cardSecrets.errors.importFailed')
  } finally {
    importSubmitting.value = false
  }
}

const cardSecretStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    available: t('admin.cardSecrets.status.available'),
    reserved: t('admin.cardSecrets.status.reserved'),
    used: t('admin.cardSecrets.status.used'),
  }
  return map[status] || status
}

const cardSecretStatusClass = (status: string) => {
  switch (status) {
    case 'available':
      return 'text-emerald-700 border-emerald-200 bg-emerald-50'
    case 'reserved':
      return 'text-amber-700 border-amber-200 bg-amber-50'
    case 'used':
      return 'text-muted-foreground border-border bg-muted/30'
    default:
      return 'text-muted-foreground border-border bg-muted/30'
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">{{ t('admin.cardSecrets.title') }}</h1>
    </div>

    <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input v-model="productIdInput" :placeholder="t('admin.cardSecrets.productPlaceholder')" @input="handleProductChange" />
        <Button variant="outline" @click="refreshAll">{{ t('admin.common.refresh') }}</Button>
        <div class="text-xs text-muted-foreground flex flex-col gap-1">
          <span>{{ productIdHint }}</span>
          <span v-if="productInfoName">
            {{ t('admin.cardSecrets.productNameLabel') }}：
            <a v-if="currentProductId" :href="productLink(currentProductId)" target="_blank" rel="noopener" class="text-primary underline-offset-4 hover:underline">
              {{ productInfoName }}
            </a>
            <span v-else>{{ productInfoName }}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">{{ t('admin.cardSecrets.batchTitle') }}</h2>
        <form class="space-y-4" @submit.prevent="handleBatchCreate">
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.secretsLabel') }} *</label>
            <Textarea v-model="batchForm.secrets" rows="6" :placeholder="t('admin.cardSecrets.secretsPlaceholder')" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.batchNoLabel') }}</label>
              <Input v-model="batchForm.batch_no" placeholder="BATCH-20260203-001" />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.noteLabel') }}</label>
              <Input v-model="batchForm.note" :placeholder="t('admin.cardSecrets.notePlaceholder')" />
            </div>
          </div>
          <div v-if="batchError" class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {{ batchError }}
          </div>
          <div v-if="batchSuccess" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {{ batchSuccess }}
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="resetBatchForm">{{ t('admin.common.reset') }}</Button>
            <Button type="submit" :disabled="batchSubmitting">
              {{ batchSubmitting ? t('admin.cardSecrets.submitting') : t('admin.cardSecrets.submitBatch') }}
            </Button>
          </div>
        </form>
      </div>

      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">{{ t('admin.cardSecrets.importTitle') }}</h2>
        <form class="space-y-4" @submit.prevent="handleImport">
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.csvLabel') }} *</label>
            <div class="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <Button type="button" size="sm" variant="outline" @click="triggerImportFile">{{ t('admin.cardSecrets.csvChoose') }}</Button>
              <span class="flex-1 truncate" :class="importForm.file ? 'text-foreground' : 'text-muted-foreground'">{{ importFileLabel }}</span>
              <Button v-if="importForm.file" type="button" size="sm" variant="ghost" @click="clearImportFile">{{ t('admin.cardSecrets.csvClear') }}</Button>
            </div>
            <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileChange" />
            <p class="mt-2 text-xs text-muted-foreground">{{ t('admin.cardSecrets.csvHint') }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.batchNoLabel') }}</label>
              <Input v-model="importForm.batch_no" placeholder="BATCH-20260203-002" />
            </div>
            <div>
              <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.noteLabel') }}</label>
              <Input v-model="importForm.note" :placeholder="t('admin.cardSecrets.importNotePlaceholder')" />
            </div>
          </div>
          <div v-if="importError" class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {{ importError }}
          </div>
          <div v-if="importSuccess" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {{ importSuccess }}
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="resetImportForm">{{ t('admin.common.reset') }}</Button>
            <Button type="submit" :disabled="importSubmitting">
              {{ importSubmitting ? t('admin.cardSecrets.importing') : t('admin.cardSecrets.startImport') }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-lg font-semibold text-foreground mb-4">{{ t('admin.cardSecrets.statsTitle') }}</h2>
        <div v-if="statsLoading" class="text-sm text-muted-foreground">{{ t('admin.common.loading') }}</div>
        <div v-else-if="!stats" class="text-sm text-muted-foreground">{{ t('admin.cardSecrets.selectProductTip') }}</div>
        <div v-else class="space-y-3 text-sm">
          <div class="flex justify-between text-muted-foreground"><span>{{ t('admin.cardSecrets.stats.total') }}</span><span class="font-mono text-foreground">{{ stats.total }}</span></div>
          <div class="flex justify-between text-muted-foreground"><span>{{ t('admin.cardSecrets.stats.available') }}</span><span class="font-mono text-foreground">{{ stats.available }}</span></div>
          <div class="flex justify-between text-muted-foreground"><span>{{ t('admin.cardSecrets.stats.reserved') }}</span><span class="font-mono text-foreground">{{ stats.reserved }}</span></div>
          <div class="flex justify-between text-muted-foreground"><span>{{ t('admin.cardSecrets.stats.used') }}</span><span class="font-mono text-foreground">{{ stats.used }}</span></div>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-foreground">{{ t('admin.cardSecrets.batchesTitle') }}</h2>
          <Button size="sm" variant="outline" @click="refreshBatches">{{ t('admin.common.refresh') }}</Button>
        </div>

        <Table>
          <TableHeader class="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
            <TableRow>
              <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.table.batchNo') }}</TableHead>
              <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.table.source') }}</TableHead>
              <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.table.count') }}</TableHead>
              <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.table.note') }}</TableHead>
              <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.table.createdAt') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody class="divide-y divide-border">
            <TableRow v-if="batchesLoading">
              <TableCell colspan="5" class="px-4 py-6 text-center text-muted-foreground">{{ t('admin.common.loading') }}</TableCell>
            </TableRow>
            <TableRow v-else-if="batches.length === 0">
              <TableCell colspan="5" class="px-4 py-6 text-center text-muted-foreground">{{ t('admin.cardSecrets.emptyBatches') }}</TableCell>
            </TableRow>
            <TableRow v-for="batch in batches" :key="batch.id" class="hover:bg-muted/30">
              <TableCell class="px-4 py-3 font-medium text-foreground">{{ batch.batch_no || '-' }}</TableCell>
              <TableCell class="px-4 py-3 text-xs text-muted-foreground">{{ batch.source }}</TableCell>
              <TableCell class="px-4 py-3 text-xs text-muted-foreground">{{ batch.total_count }}</TableCell>
              <TableCell class="px-4 py-3 text-xs text-muted-foreground">{{ batch.note || '-' }}</TableCell>
              <TableCell class="px-4 py-3 text-xs text-muted-foreground">{{ formatDate(batch.created_at) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div
          v-if="batchPagination.total_page > 1"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground">
              {{ t('admin.common.pageInfo', { total: batchPagination.total, page: batchPagination.page, totalPage: batchPagination.total_page }) }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-2">
              <Input
                v-model="batchJumpPage"
                type="number"
                min="1"
                :max="batchPagination.total_page"
                class="h-8 w-20"
                :placeholder="t('admin.common.jumpPlaceholder')"
              />
              <Button variant="outline" size="sm" class="h-8" @click="jumpBatchPage">
                {{ t('admin.common.jumpTo') }}
              </Button>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-8"
                :disabled="batchPagination.page <= 1"
                @click="changeBatchPage(batchPagination.page - 1)"
              >
                {{ t('admin.common.prevPage') }}
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-8"
                :disabled="batchPagination.page >= batchPagination.total_page"
                @click="changeBatchPage(batchPagination.page + 1)"
              >
                {{ t('admin.common.nextPage') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-border bg-card p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 class="text-lg font-semibold text-foreground">{{ t('admin.cardSecrets.listTitle') }}</h2>
        <div class="flex flex-wrap items-center gap-3">
          <Select v-model="cardSecretStatus" @update:modelValue="refreshCardSecrets">
            <SelectTrigger class="h-9 w-[180px] text-xs">
            <SelectValue :placeholder="t('admin.cardSecrets.statusAll')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{{ t('admin.cardSecrets.statusAll') }}</SelectItem>
            <SelectItem value="available">{{ t('admin.cardSecrets.status.available') }}</SelectItem>
            <SelectItem value="reserved">{{ t('admin.cardSecrets.status.reserved') }}</SelectItem>
            <SelectItem value="used">{{ t('admin.cardSecrets.status.used') }}</SelectItem>
          </SelectContent>
          </Select>
          <Button size="sm" variant="outline" @click="refreshCardSecrets">{{ t('admin.common.refresh') }}</Button>
        </div>
      </div>

      <Table>
        <TableHeader class="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.id') }}</TableHead>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.secret') }}</TableHead>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.product') }}</TableHead>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.status') }}</TableHead>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.orderId') }}</TableHead>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.batchId') }}</TableHead>
            <TableHead class="px-4 py-3">{{ t('admin.cardSecrets.listTable.createdAt') }}</TableHead>
            <TableHead class="px-4 py-3 text-right">{{ t('admin.cardSecrets.listTable.action') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody class="divide-y divide-border">
          <TableRow v-if="cardSecretsLoading">
            <TableCell colspan="8" class="px-4 py-6 text-center text-muted-foreground">{{ t('admin.common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="cardSecrets.length === 0">
            <TableCell colspan="8" class="px-4 py-6 text-center text-muted-foreground">{{ t('admin.cardSecrets.emptyList') }}</TableCell>
          </TableRow>
          <TableRow v-for="secret in cardSecrets" :key="secret.id" class="hover:bg-muted/30">
            <TableCell class="px-4 py-3">
              <IdCell :value="secret.id" />
            </TableCell>
            <TableCell class="px-4 py-3 text-xs font-mono text-muted-foreground break-all">{{ secret.secret }}</TableCell>
            <TableCell class="px-4 py-3 text-xs text-muted-foreground">
              <a v-if="secret.product_id" :href="productLink(secret.product_id)" target="_blank" rel="noopener" class="text-primary underline-offset-4 hover:underline">
                #{{ secret.product_id }} {{ resolveProductName(secret.product_id) }}
              </a>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="px-4 py-3 text-xs">
              <span class="inline-flex rounded-full border px-2.5 py-1 text-xs" :class="cardSecretStatusClass(secret.status)">
                {{ cardSecretStatusLabel(secret.status) }}
              </span>
            </TableCell>
            <TableCell class="px-4 py-3 text-xs">
              <a v-if="secret.order_id" :href="orderLink(secret.order_id)" target="_blank" rel="noopener" class="text-primary underline-offset-4 hover:underline">
                #{{ secret.order_id }}
              </a>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="px-4 py-3 text-xs text-muted-foreground">
              <span v-if="secret.batch_id">#{{ secret.batch_id }}</span>
              <span v-else>-</span>
            </TableCell>
            <TableCell class="px-4 py-3 text-xs text-muted-foreground">{{ formatDate(secret.created_at) }}</TableCell>
            <TableCell class="px-4 py-3 text-right">
              <Button size="sm" variant="outline" @click="openEditSecret(secret)">{{ t('admin.cardSecrets.actions.edit') }}</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div
        v-if="cardSecretPagination.total_page > 1"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">
            {{ t('admin.common.pageInfo', { total: cardSecretPagination.total, page: cardSecretPagination.page, totalPage: cardSecretPagination.total_page }) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2">
            <Input
              v-model="cardSecretJumpPage"
              type="number"
              min="1"
              :max="cardSecretPagination.total_page"
              class="h-8 w-20"
              :placeholder="t('admin.common.jumpPlaceholder')"
            />
            <Button variant="outline" size="sm" class="h-8" @click="jumpCardSecretPage">
              {{ t('admin.common.jumpTo') }}
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="cardSecretPagination.page <= 1"
              @click="changeSecretPage(cardSecretPagination.page - 1)"
            >
              {{ t('admin.common.prevPage') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="cardSecretPagination.page >= cardSecretPagination.total_page"
              @click="changeSecretPage(cardSecretPagination.page + 1)"
            >
              {{ t('admin.common.nextPage') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:open="showEditModal" @update:open="(value) => { if (!value) closeEditModal() }">
      <DialogScrollContent class="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('admin.cardSecrets.editTitle') }}</DialogTitle>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitEdit">
          <div class="text-xs text-muted-foreground flex items-center gap-2">
            <span>{{ t('admin.cardSecrets.editId') }}：</span>
            <IdCell v-if="editForm.id" :value="editForm.id" />
            <span v-else>-</span>
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.editSecret') }}</label>
            <Textarea v-model="editForm.secret" rows="3" :placeholder="t('admin.cardSecrets.editSecretPlaceholder')" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{ t('admin.cardSecrets.editStatus') }}</label>
            <Select v-model="editForm.status">
              <SelectTrigger class="h-9 w-full">
                <SelectValue :placeholder="t('admin.cardSecrets.status.available')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{{ t('admin.cardSecrets.status.available') }}</SelectItem>
                <SelectItem value="reserved">{{ t('admin.cardSecrets.status.reserved') }}</SelectItem>
                <SelectItem value="used">{{ t('admin.cardSecrets.status.used') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-if="editError" class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {{ editError }}
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="closeEditModal">{{ t('admin.common.cancel') }}</Button>
            <Button type="submit" :disabled="editSubmitting">
              {{ editSubmitting ? t('admin.common.loading') : t('admin.common.save') }}
            </Button>
          </div>
        </form>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>
