<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import IdCell from '@/components/IdCell.vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  orderStatusClass as orderStatusClassMap,
  orderStatusLabel as orderStatusLabelMap,
  paymentStatusClass as paymentStatusClassMap,
  paymentStatusLabel as paymentStatusLabelMap,
  userStatusClass,
  userStatusLabel,
} from '@/utils/status'
import { formatDate, formatMoney, getLocalizedText } from '@/utils/format'

const { t } = useI18n()
const route = useRoute()
const adminPath = import.meta.env.VITE_ADMIN_PATH || ''
const userId = computed(() => Number(route.params.id))

const user = ref<any>(null)
const userError = ref('')

const activeTab = ref<'orders' | 'payments' | 'coupons'>('orders')
const tabs = computed<Array<{ key: 'orders' | 'payments' | 'coupons'; label: string }>>(() => [
  { key: 'orders', label: t('admin.userDetail.tabs.orders') },
  { key: 'payments', label: t('admin.userDetail.tabs.payments') },
  { key: 'coupons', label: t('admin.userDetail.tabs.coupons') },
])

const orders = ref<any[]>([])
const ordersLoading = ref(false)
const ordersPagination = ref({ page: 1, page_size: 20, total: 0, total_page: 1 })
const ordersJumpPage = ref('')

const payments = ref<any[]>([])
const paymentsLoading = ref(false)
const paymentsPagination = ref({ page: 1, page_size: 20, total: 0, total_page: 1 })
const paymentsJumpPage = ref('')

const couponUsages = ref<any[]>([])
const couponsLoading = ref(false)
const couponsPagination = ref({ page: 1, page_size: 20, total: 0, total_page: 1 })
const couponsJumpPage = ref('')

const fetchUser = async () => {
  if (!Number.isFinite(userId.value) || userId.value <= 0) return
  userError.value = ''
  try {
    const response = await adminAPI.getUser(userId.value)
    user.value = response.data.data
  } catch (err: any) {
    userError.value = err?.message || t('admin.userDetail.fetchFailed')
  }
}

const fetchOrders = async (page = 1) => {
  if (!Number.isFinite(userId.value) || userId.value <= 0) return
  ordersLoading.value = true
  try {
    const response = await adminAPI.getOrders({
      page,
      page_size: ordersPagination.value.page_size,
      user_id: userId.value,
    })
    orders.value = (response.data.data as any[]) || []
    ordersPagination.value = response.data.pagination || ordersPagination.value
  } finally {
    ordersLoading.value = false
  }
}

const fetchPayments = async (page = 1) => {
  if (!Number.isFinite(userId.value) || userId.value <= 0) return
  paymentsLoading.value = true
  try {
    const response = await adminAPI.getPayments({
      page,
      page_size: paymentsPagination.value.page_size,
      user_id: userId.value,
    })
    payments.value = (response.data.data as any[]) || []
    paymentsPagination.value = response.data.pagination || paymentsPagination.value
  } finally {
    paymentsLoading.value = false
  }
}

const fetchCoupons = async (page = 1) => {
  if (!Number.isFinite(userId.value) || userId.value <= 0) return
  couponsLoading.value = true
  try {
    const response = await adminAPI.getUserCouponUsages(userId.value, {
      page,
      page_size: couponsPagination.value.page_size,
    })
    couponUsages.value = (response.data.data as any[]) || []
    couponsPagination.value = response.data.pagination || couponsPagination.value
  } finally {
    couponsLoading.value = false
  }
}

const jumpOrdersPage = () => {
  if (!ordersJumpPage.value) return
  const raw = Number(ordersJumpPage.value)
  if (Number.isNaN(raw)) return
  const target = Math.min(Math.max(Math.floor(raw), 1), ordersPagination.value.total_page)
  if (target === ordersPagination.value.page) return
  fetchOrders(target)
}

const jumpPaymentsPage = () => {
  if (!paymentsJumpPage.value) return
  const raw = Number(paymentsJumpPage.value)
  if (Number.isNaN(raw)) return
  const target = Math.min(Math.max(Math.floor(raw), 1), paymentsPagination.value.total_page)
  if (target === paymentsPagination.value.page) return
  fetchPayments(target)
}

const jumpCouponsPage = () => {
  if (!couponsJumpPage.value) return
  const raw = Number(couponsJumpPage.value)
  if (Number.isNaN(raw)) return
  const target = Math.min(Math.max(Math.floor(raw), 1), couponsPagination.value.total_page)
  if (target === couponsPagination.value.page) return
  fetchCoupons(target)
}

const changeTab = (tab: 'orders' | 'payments' | 'coupons') => {
  activeTab.value = tab
  if (tab === 'orders') {
    fetchOrders(ordersPagination.value.page)
  } else if (tab === 'payments') {
    fetchPayments(paymentsPagination.value.page)
  } else {
    fetchCoupons(couponsPagination.value.page)
  }
}

const orderLink = (orderId: number) => `${adminPath}/orders?order_id=${orderId}`
const orderListLink = computed(() => `${adminPath}/orders?user_id=${userId.value}`)
const paymentListLink = computed(() => `${adminPath}/payments?user_id=${userId.value}`)

const statusClass = (status?: string) => userStatusClass(status)
const statusLabel = (status?: string) => userStatusLabel(t, status)
const orderStatusClass = (status?: string) => orderStatusClassMap(status)
const orderStatusLabel = (status?: string) => orderStatusLabelMap(t, status)
const paymentStatusClass = (status?: string) => paymentStatusClassMap(status)
const paymentStatusLabel = (status?: string) => paymentStatusLabelMap(t, status)

const formatLocale = (raw?: string) => {
  if (!raw) return '-'
  const map: Record<string, string> = {
    'zh-CN': t('admin.common.lang.zhCN'),
    'zh-TW': t('admin.common.lang.zhTW'),
    'en-US': t('admin.common.lang.enUS'),
  }
  return map[raw] || raw
}

const formatCouponType = (raw?: string) => {
  if (!raw) return '-'
  const map: Record<string, string> = {
    percent: t('admin.common.discountTypes.percent'),
    fixed: t('admin.common.discountTypes.fixed'),
  }
  return map[raw] || raw
}

const formatScopeProducts = (products?: any[]) => {
  if (!Array.isArray(products) || products.length === 0) return '-'
  const names = products.map((item) => getLocalizedText(item.title)).filter((item) => item)
  if (names.length === 0) return '-'
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')}...`
}

onMounted(() => {
  fetchUser()
  fetchOrders()
})

watch(
  () => route.params.id,
  () => {
    fetchUser()
    fetchOrders(1)
    fetchPayments(1)
    fetchCoupons(1)
  }
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <router-link :to="`${adminPath}/users`" class="text-muted-foreground hover:text-foreground transition-colors">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <h1 class="text-2xl font-semibold">{{ t('admin.userDetail.title') }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <Button as-child size="sm" variant="outline">
          <router-link :to="orderListLink">{{ t('admin.userDetail.actions.orders') }}</router-link>
        </Button>
        <Button as-child size="sm" variant="outline">
          <router-link :to="paymentListLink">{{ t('admin.userDetail.actions.payments') }}</router-link>
        </Button>
      </div>
    </div>

    <div v-if="userError" class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {{ userError }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.id') }}</div>
          <div class="text-sm text-foreground">
            <IdCell v-if="user?.id" :value="user.id" />
            <span v-else>-</span>
          </div>
        </CardContent>
      </Card>
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.email') }}</div>
          <div class="text-sm text-foreground">{{ user?.email || '-' }}</div>
        </CardContent>
      </Card>
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.nickname') }}</div>
          <div class="text-sm text-foreground">{{ user?.display_name || '-' }}</div>
        </CardContent>
      </Card>
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.status') }}</div>
          <div class="text-sm text-foreground">
            <span class="inline-flex rounded-full border px-2.5 py-1 text-xs" :class="statusClass(user?.status)">
              {{ statusLabel(user?.status) }}
            </span>
          </div>
        </CardContent>
      </Card>
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.locale') }}</div>
          <div class="text-sm text-foreground">{{ formatLocale(user?.locale) }}</div>
        </CardContent>
      </Card>
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.createdAt') }}</div>
          <div class="text-sm text-foreground">{{ formatDate(user?.created_at) }}</div>
        </CardContent>
      </Card>
      <Card class="rounded-lg border-border bg-background shadow-none">
        <CardContent class="p-3">
          <div class="text-xs text-muted-foreground">{{ t('admin.userDetail.fields.lastLoginAt') }}</div>
          <div class="text-sm text-foreground">{{ formatDate(user?.last_login_at) }}</div>
        </CardContent>
      </Card>
    </div>

    <div class="flex w-fit gap-2 rounded-xl border border-border bg-card p-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="changeTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'orders'" class="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader class="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.orders.id') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.orders.orderNo') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.orders.status') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.orders.amount') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.orders.createdAt') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody class="divide-y divide-border">
          <TableRow v-if="ordersLoading">
            <TableCell colspan="5" class="px-6 py-8 text-center text-muted-foreground">{{ t('admin.common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="orders.length === 0">
            <TableCell colspan="5" class="px-6 py-8 text-center text-muted-foreground">{{ t('admin.userDetail.empty') }}</TableCell>
          </TableRow>
          <TableRow v-for="order in orders" :key="order.id" class="hover:bg-muted/30">
            <TableCell class="px-6 py-4">
              <IdCell :value="order.id" />
            </TableCell>
            <TableCell class="px-6 py-4 text-foreground font-mono">{{ order.order_no }}</TableCell>
            <TableCell class="px-6 py-4 text-xs">
              <span class="inline-flex rounded-full border px-2.5 py-1 text-xs" :class="orderStatusClass(order.status)">
                {{ orderStatusLabel(order.status) }}
              </span>
            </TableCell>
            <TableCell class="px-6 py-4 text-foreground font-mono">{{ formatMoney(order.total_amount, order.currency) }}</TableCell>
            <TableCell class="px-6 py-4 text-xs text-muted-foreground">{{ formatDate(order.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div
        v-if="ordersPagination.total_page > 1"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">
            {{ t('admin.common.pageInfo', { total: ordersPagination.total, page: ordersPagination.page, totalPage: ordersPagination.total_page }) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2">
            <Input
              v-model="ordersJumpPage"
              type="number"
              min="1"
              :max="ordersPagination.total_page"
              class="h-8 w-20"
              :placeholder="t('admin.common.jumpPlaceholder')"
            />
            <Button variant="outline" size="sm" class="h-8" @click="jumpOrdersPage">
              {{ t('admin.common.jumpTo') }}
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="ordersPagination.page <= 1"
              @click="fetchOrders(ordersPagination.page - 1)"
            >
              {{ t('admin.common.prevPage') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="ordersPagination.page >= ordersPagination.total_page"
              @click="fetchOrders(ordersPagination.page + 1)"
            >
              {{ t('admin.common.nextPage') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'payments'" class="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader class="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.payments.id') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.payments.orderId') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.payments.status') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.payments.amount') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.payments.createdAt') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody class="divide-y divide-border">
          <TableRow v-if="paymentsLoading">
            <TableCell colspan="5" class="px-6 py-8 text-center text-muted-foreground">{{ t('admin.common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="payments.length === 0">
            <TableCell colspan="5" class="px-6 py-8 text-center text-muted-foreground">{{ t('admin.userDetail.empty') }}</TableCell>
          </TableRow>
          <TableRow v-for="payment in payments" :key="payment.id" class="hover:bg-muted/30">
            <TableCell class="px-6 py-4">
              <IdCell :value="payment.id" />
            </TableCell>
            <TableCell class="px-6 py-4 text-foreground font-mono">
              <router-link
                v-if="payment.order_id"
                :to="orderLink(payment.order_id)"
                class="text-primary underline-offset-4 hover:underline"
              >
                #{{ payment.order_id }}
              </router-link>
              <span v-else>-</span>
            </TableCell>
            <TableCell class="px-6 py-4 text-xs">
              <span class="inline-flex rounded-full border px-2.5 py-1 text-xs" :class="paymentStatusClass(payment.status)">
                {{ paymentStatusLabel(payment.status) }}
              </span>
            </TableCell>
            <TableCell class="px-6 py-4 text-foreground font-mono">{{ formatMoney(payment.amount, payment.currency) }}</TableCell>
            <TableCell class="px-6 py-4 text-xs text-muted-foreground">{{ formatDate(payment.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div
        v-if="paymentsPagination.total_page > 1"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">
            {{ t('admin.common.pageInfo', { total: paymentsPagination.total, page: paymentsPagination.page, totalPage: paymentsPagination.total_page }) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2">
            <Input
              v-model="paymentsJumpPage"
              type="number"
              min="1"
              :max="paymentsPagination.total_page"
              class="h-8 w-20"
              :placeholder="t('admin.common.jumpPlaceholder')"
            />
            <Button variant="outline" size="sm" class="h-8" @click="jumpPaymentsPage">
              {{ t('admin.common.jumpTo') }}
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="paymentsPagination.page <= 1"
              @click="fetchPayments(paymentsPagination.page - 1)"
            >
              {{ t('admin.common.prevPage') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="paymentsPagination.page >= paymentsPagination.total_page"
              @click="fetchPayments(paymentsPagination.page + 1)"
            >
              {{ t('admin.common.nextPage') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'coupons'" class="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader class="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.id') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.coupon') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.type') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.products') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.orderId') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.discount') }}</TableHead>
            <TableHead class="px-6 py-3">{{ t('admin.userDetail.coupons.createdAt') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody class="divide-y divide-border">
          <TableRow v-if="couponsLoading">
            <TableCell colspan="7" class="px-6 py-8 text-center text-muted-foreground">{{ t('admin.common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="couponUsages.length === 0">
            <TableCell colspan="7" class="px-6 py-8 text-center text-muted-foreground">{{ t('admin.userDetail.empty') }}</TableCell>
          </TableRow>
          <TableRow v-for="usage in couponUsages" :key="usage.id" class="hover:bg-muted/30">
            <TableCell class="px-6 py-4">
              <IdCell :value="usage.id" />
            </TableCell>
            <TableCell class="px-6 py-4">
              <div class="text-foreground font-mono">{{ usage.coupon_code || '-' }}</div>
              <div class="text-xs text-muted-foreground">#{{ usage.coupon_id }}</div>
            </TableCell>
            <TableCell class="px-6 py-4 text-xs text-muted-foreground">{{ formatCouponType(usage.coupon_type) }}</TableCell>
            <TableCell class="px-6 py-4 text-xs text-muted-foreground">{{ formatScopeProducts(usage.scope_products) }}</TableCell>
            <TableCell class="px-6 py-4 text-foreground font-mono">
              <router-link
                v-if="usage.order_id"
                :to="orderLink(usage.order_id)"
                class="text-primary underline-offset-4 hover:underline"
              >
                #{{ usage.order_id }}
              </router-link>
              <span v-else>-</span>
            </TableCell>
            <TableCell class="px-6 py-4 text-foreground font-mono">{{ formatMoney(usage.discount_amount) }}</TableCell>
            <TableCell class="px-6 py-4 text-xs text-muted-foreground">{{ formatDate(usage.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div
        v-if="couponsPagination.total_page > 1"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4"
      >
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">
            {{ t('admin.common.pageInfo', { total: couponsPagination.total, page: couponsPagination.page, totalPage: couponsPagination.total_page }) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-2">
            <Input
              v-model="couponsJumpPage"
              type="number"
              min="1"
              :max="couponsPagination.total_page"
              class="h-8 w-20"
              :placeholder="t('admin.common.jumpPlaceholder')"
            />
            <Button variant="outline" size="sm" class="h-8" @click="jumpCouponsPage">
              {{ t('admin.common.jumpTo') }}
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="couponsPagination.page <= 1"
              @click="fetchCoupons(couponsPagination.page - 1)"
            >
              {{ t('admin.common.prevPage') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :disabled="couponsPagination.page >= couponsPagination.total_page"
              @click="fetchCoupons(couponsPagination.page + 1)"
            >
              {{ t('admin.common.nextPage') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
