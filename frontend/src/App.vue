<template>
  <div id="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <div class="logo">日清 Nisshin</div>
        <span class="separator">|</span>
        <span class="subtitle">{{ t('title') }}</span>
      </div>
      <div class="header-right">
        <!-- 语言切换按钮 -->
        <el-switch
          v-model="lang"
          active-value="ja"
          inactive-value="zh"
          active-text="JP"
          inactive-text="CN"
          style="margin-right:12px"
          @change="onLangChange"
        />
        <span class="period-badge">{{ overview.period_label || t('period') }}</span>
        <el-tag type="success" effect="dark" size="small" v-if="lastSync">{{ lang === 'zh' ? '已同步' : '同期済' }}</el-tag>
        <el-button size="small" circle :icon="Refresh" @click="refreshData" :loading="loading" />
      </div>
    </header>

    <!-- KPI Cards -->
    <section class="kpi-row">
      <div class="kpi-card" v-for="kpi in kpiList" :key="kpi.label"
           :class="{ 'kpi-warn': kpi.warn, 'kpi-good': kpi.good }">
        <div class="kpi-value" :style="{ color: kpi.color }">
          {{ kpi.prefix }}{{ kpi.value }}{{ kpi.suffix }}
        </div>
        <div class="kpi-label">{{ kpi.label }}</div>
      </div>
    </section>

    <!-- Row 1: Structure + Trend -->
    <section class="chart-row">
      <div class="chart-card chart-card-2col">
        <div class="chart-title">{{ t('costStructure') }}</div>
        <v-chart :option="structureOption" style="height:280px" autoresize />
      </div>
      <div class="chart-card chart-card-2col">
        <div class="chart-title">{{ t('trend') }}</div>
        <v-chart :option="trendOption" style="height:280px" autoresize />
      </div>
    </section>

    <!-- Row 2: Scatter -->
    <section class="chart-row">
      <div class="chart-card chart-card-full">
        <div class="chart-title">{{ t('scatterTitle') }}</div>
        <div class="chart-subtitle">{{ t('scatterSub') }}</div>
        <v-chart :option="scatterOption" style="height:400px" autoresize />
      </div>
    </section>

    <!-- Row 3: Top changes -->
    <section class="chart-row">
      <div class="chart-card chart-card-2col">
        <div class="chart-title">{{ t('topUp') }}</div>
        <div class="change-list">
          <div class="change-item" v-for="item in topUp" :key="item.item_code"
               @click="selectProduct(item.item_code)"
               :class="{ active: selectedCode === item.item_code }">
            <span class="change-code">{{ item.item_code }}</span>
            <span class="change-name">{{ item.item_name }}</span>
            <span class="change-bar-wrap">
              <span class="change-bar" :style="{ width: Math.min(Math.abs(item.variance_total_pct)*3, 100) + '%', background: item.variance_total > 0 ? '#f56c6c' : '#67c23a' }"></span>
            </span>
            <span class="change-val up">{{ item.variance_total > 0 ? '+' : '' }}{{ item.variance_total_pct }}%</span>
          </div>
        </div>
      </div>
      <div class="chart-card chart-card-2col">
        <div class="chart-title">{{ t('topDown') }}</div>
        <div class="change-list">
          <div class="change-item" v-for="item in topDown" :key="item.item_code"
               @click="selectProduct(item.item_code)"
               :class="{ active: selectedCode === item.item_code }">
            <span class="change-code">{{ item.item_code }}</span>
            <span class="change-name">{{ item.item_name }}</span>
            <span class="change-bar-wrap">
              <span class="change-bar" :style="{ width: Math.min(Math.abs(item.variance_total_pct)*3, 100) + '%', background: item.variance_total > 0 ? '#f56c6c' : '#67c23a' }"></span>
            </span>
            <span class="change-val down">{{ item.variance_total > 0 ? '+' : '' }}{{ item.variance_total_pct }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Table -->
    <section class="chart-card chart-card-full">
      <div class="table-toolbar">
        <div class="chart-title">{{ t('tableTitle') }}</div>
        <div class="toolbar-right">
          <el-input v-model="searchQuery" :placeholder="t('search')" clearable size="small"
                    style="width:200px;margin-right:8px" @input="searchProducts" />
          <el-select v-model="sortBy" size="small" style="width:130px;margin-right:8px" @change="loadProducts">
            <el-option :label="t('sortByVariancePct')" value="variance_total_pct" />
            <el-option :label="t('sortByVariance')" value="variance_total" />
            <el-option :label="t('sortByCode')" value="item_code" />
            <el-option :label="t('sortByCurrent')" value="p1_total" />
          </el-select>
          <el-select v-model="thresholdFilter" size="small" style="width:110px" @change="loadProducts">
            <el-option :label="t('filterAll')" :value="0" />
            <el-option :label="t('over5')" :value="5" />
            <el-option :label="t('over10')" :value="10" />
            <el-option :label="t('over20')" :value="20" />
          </el-select>
        </div>
      </div>
      <el-table :data="products" stripe highlight-current-row @row-click="selectProduct"
                style="width:100%;font-size:13px" max-height="500">
        <el-table-column prop="item_code" :label="t('colCode')" width="90" sortable />
        <el-table-column prop="item_name" :label="t('colName')" min-width="140" />
        <el-table-column :label="t('colCurrent')" width="120" sortable prop="p1_total">
          <template #default="{row}"><span class="cell-cost">¥{{ row.p1_total?.toFixed(2) }}</span></template>
        </el-table-column>
        <el-table-column :label="t('colPrevious')" width="120" sortable prop="p2_total">
          <template #default="{row}">
            <span class="cell-cost" v-if="row.p2_total">¥{{ row.p2_total.toFixed(2) }}</span>
            <el-tag size="small" type="info" v-else>—</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('colVariance')" width="110" sortable prop="variance_total">
          <template #default="{row}">
            <span :class="row.variance_total > 0 ? 'diff-up' : 'diff-down'">
              {{ row.variance_total > 0 ? '+' : '' }}{{ row.variance_total?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="t('colVariancePct')" width="110" sortable prop="variance_total_pct">
          <template #default="{row}">
            <el-tag :type="tagType(row.variance_total_pct)" size="small" effect="dark">
              {{ row.variance_total > 0 ? '+' : '' }}{{ row.variance_total_pct?.toFixed(1) }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('colTarget')" width="110" sortable prop="target_total">
          <template #default="{row}">
            <span v-if="row.target_total" :class="row.p1_total > row.target_total ? 'diff-up' : 'diff-down'">¥{{ row.target_total.toFixed(2) }}</span>
            <span v-else class="text-muted">{{ t('noTarget') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('colFlags')" width="140">
          <template #default="{row}">
            <el-tag size="small" v-if="row.flags?.includes('要注意')" type="warning">⚠️{{ lang==='zh'?'关注':'要注意' }}</el-tag>
            <el-tag size="small" v-if="row.flags?.includes('重大差異')" type="danger">⚠️{{ t('flagMajor') }}</el-tag>
            <el-tag size="small" v-if="row.flags?.includes('コスト低下')" type="success">↓{{ t('flagGood') }}</el-tag>
            <el-tag size="small" v-if="row.flags?.includes('コスト上昇')" type="danger">↑{{ lang==='zh'?'上升':'上昇' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('colAction')" width="70" fixed="right">
          <template #default="{row}">
            <el-button size="small" link type="primary" @click.stop="selectProduct(row.item_code)">{{ t('detail') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalProducts"
          size="small"
          layout="total, prev, pager, next"
          @current-change="loadProducts"
        />
      </div>
    </section>

    <!-- Detail dialog -->
    <el-dialog v-model="detailVisible" :title="`${detailProduct?.item_name} (${detailProduct?.item_code})`" width="700px" top="5vh">
      <div v-if="detailProduct" class="detail-panel">
        <div class="product-card" :class="detailProduct.variance_total > 0 ? 'card-up' : 'card-down'">
          <div class="card-header">
            <div class="card-title-row">
              <span class="card-code">{{ detailProduct.item_code }}</span>
              <span class="card-name">{{ detailProduct.item_name }}</span>
              <span class="card-spec">{{ detailProduct.specification }}{{ detailProduct.unit }}</span>
              <el-tag :type="detailProduct.variance_total > 0 ? 'danger' : 'success'" size="small" effect="dark" class="card-tag">
                {{ detailProduct.variance_total > 0 ? '↑' : '↓' }} {{ Math.abs(detailProduct.variance_total_pct) }}%
              </el-tag>
            </div>
            <div class="card-cost-row">
              <div class="cost-item"><span class="cost-label">{{ lang==='zh'?'本期':'当期' }}</span><span class="cost-val">¥{{ detailProduct.p1_total?.toFixed(2) }}</span></div>
              <div class="cost-item"><span class="cost-label">{{ lang==='zh'?'上期':'前期' }}</span><span class="cost-val">¥{{ detailProduct.p2_total?.toFixed(2) }}</span></div>
              <div class="cost-item"><span class="cost-label">{{ t('colTarget') }}</span><span class="cost-val" :class="detailProduct.p1_total > (detailProduct.target_total || 999) ? 'diff-up' : 'diff-down'">¥{{ detailProduct.target_total?.toFixed(2) || t('noTarget') }}</span></div>
              <div class="cost-item"><span class="cost-label">{{ t('colVariance') }}</span><span class="cost-val" :class="detailProduct.variance_total > 0 ? 'diff-up' : 'diff-down'">{{ detailProduct.variance_total > 0 ? '+' : '' }}¥{{ detailProduct.variance_total?.toFixed(2) }}</span></div>
            </div>
          </div>
          <div class="card-cost-breakdown">
            <div class="breakdown-title">{{ t('breakdownTitle') }}</div>
            <div class="breakdown-grid">
              <div class="breakdown-item" v-for="(item, idx) in costBreakdown" :key="idx">
                <div class="bd-name">{{ item.name }}</div>
                <div class="bd-bar-wrap"><div class="bd-bar" :style="{ width: item.pct + '%', background: item.color }"></div></div>
                <div class="bd-values">
                  <span class="bd-p1">¥{{ item.p1.toFixed(2) }}</span>
                  <span class="bd-p2">→ ¥{{ item.p2.toFixed(2) }}</span>
                  <span :class="item.diff > 0 ? 'diff-up' : 'diff-down'" class="bd-diff">{{ item.diff > 0 ? '+' : '' }}{{ item.diff_pct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent } from 'echarts/components'
import api from './api'
import messages from './i18n'

use([CanvasRenderer, BarChart, LineChart, PieChart, ScatterChart,
     GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, DataZoomComponent])

// Language
const lang = ref(localStorage.getItem('nisshin_lang') || 'zh')
function onLangChange() {
  localStorage.setItem('nisshin_lang', lang.value)
}
const t = computed(() => {
  const m = messages[lang.value]
  return (key) => m[key] || key
})

// State
const loading = ref(false)
const overview = ref({})
const topUp = ref([])
const topDown = ref([])
const products = ref([])
const totalProducts = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const sortBy = ref('variance_total_pct')
const thresholdFilter = ref(0)
const searchQuery = ref('')
const lastSync = ref(false)
const detailVisible = ref(false)
const detailProduct = ref(null)
const selectedCode = ref('')
const structureData = ref(null)
const trendData = ref({ trends: [] })
const scatterProducts = ref([])

// KPI
const kpiList = computed(() => [
  { label: t.value('totalProducts'), value: overview.value.total_products || 0, color: '#409eff', good: true },
  { label: t.value('warnings'), value: overview.value.warnings || 0, color: (overview.value.warnings || 0) > 10 ? '#f56c6c' : '#e6a23c', warn: (overview.value.warnings || 0) > 5 },
  { label: t.value('critical'), value: overview.value.critical || 0, color: (overview.value.critical || 0) > 3 ? '#f56c6c' : '#909399', warn: (overview.value.critical || 0) > 3 },
  { label: t.value('avgVariance'), value: overview.value.avg_variance_pct || 0, color: '#67c23a', suffix: '%', good: true },
  { label: t.value('costUp'), value: overview.value.cost_up || 0, color: '#f56c6c', warn: true },
  { label: t.value('costDown'), value: overview.value.cost_down || 0, color: '#67c23a', good: true },
])

// ECharts options
const structureOption = computed(() => {
  if (!structureData.value) return {}
  const d = structureData.value
  const items = [
    { name: t.value('rawMaterial'), value: d.avg_rm, itemStyle: { color: '#409eff' } },
    { name: t.value('manufacturing'), value: d.avg_mfg, itemStyle: { color: '#e6a23c' } },
    { name: t.value('packaging'), value: d.avg_pkg, itemStyle: { color: '#67c23a' } },
    { name: t.value('labor'), value: d.avg_lb, itemStyle: { color: '#9b59b6' } },
    { name: t.value('rework'), value: d.avg_rw, itemStyle: { color: '#f56c6c' } },
  ].filter(x => x.value > 0)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 10, textStyle: { fontSize: 12 } },
    series: [{ type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n¥{c}', fontSize: 11 },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: items }]
  }
})

const trendOption = computed(() => {
  const tData = trendData.value.trends || []
  if (!tData.length) return {}
  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: tData.map(d => d.month), axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', name: '¥', nameTextStyle: { fontSize: 11 } },
    series: [{
      name: lang.value === 'zh' ? '平均成本' : '平均原価',
      type: 'line', data: tData.map(d => d.avg_cost),
      smooth: true, lineStyle: { color: '#409eff', width: 2 },
      areaStyle: { color: 'rgba(64,158,255,0.1)' },
      markLine: { silent: true, data: [{ yAxis: tData[0]?.target, label: { formatter: `${lang.value === 'zh' ? '目標' : '目標'} ¥{c}`, fontSize: 11 }, lineStyle: { color: '#f56c6c', type: 'dashed' } }] }
    }]
  }
})

const scatterOption = computed(() => {
  const data = scatterProducts.value
  if (!data.length) return {}
  return {
    tooltip: { formatter: (p) => { const d = p.data; return `<b>${d.value[3]}</b><br/>${lang.value === 'zh' ? '单位成本' : '単位原価'}: ¥${d.value[0].toFixed(2)}<br/>${lang.value === 'zh' ? '差异率' : '差異率'}: ${d.value[1].toFixed(1)}%<br/>${lang.value === 'zh' ? '产量' : '生産量'}: ${(d.value[2] || 0).toLocaleString()}` } },
    grid: { left: 60, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'log', name: `¥ ${lang.value === 'zh' ? '单位成本' : '単位原価'}`, nameLocation: 'center', nameGap: 35, nameTextStyle: { fontSize: 11 }, axisLabel: { formatter: '¥{value}' } },
    yAxis: { type: 'value', name: `${lang.value === 'zh' ? '差异率' : '差異率'} (%)`, nameTextStyle: { fontSize: 11 }, axisLabel: { formatter: '{value}%' }, splitLine: { show: true, lineStyle: { type: 'dashed' } } },
    series: [{
      type: 'scatter',
      data: data.map(d => ({
        value: [d.p1_total, d.variance_total_pct, d.p1_quantity || 5000, d.item_name],
        itemStyle: { color: d.variance_total_pct > 5 ? '#f56c6c' : d.variance_total_pct < -5 ? '#67c23a' : '#909399' }
      })),
      symbolSize: (val) => Math.max(8, Math.min(40, Math.sqrt(val[2] || 5000) * 0.2)),
      emphasis: { focus: 'series', itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } }
    }]
  }
})

const costBreakdown = computed(() => {
  const p = detailProduct.value
  if (!p) return []
  const items = [
    { name: t.value('rawMaterial'), p1: p.p1_raw_material, p2: p.p2_raw_material, color: '#409eff' },
    { name: t.value('packaging'), p1: p.p1_packaging, p2: p.p2_packaging, color: '#67c23a' },
    { name: t.value('manufacturing'), p1: p.p1_manufacturing, p2: p.p2_manufacturing, color: '#e6a23c' },
    { name: t.value('labor'), p1: p.p1_labor, p2: p.p2_labor, color: '#9b59b6' },
    { name: t.value('rework'), p1: p.p1_rework, p2: p.p2_rework, color: '#f56c6c' },
  ].filter(x => x.p1 > 0 || x.p2 > 0)
  const maxVal = Math.max(...items.map(x => Math.max(x.p1, x.p2)), 1)
  return items.map(x => ({ ...x, diff: x.p2 - x.p1, diff_pct: x.p1 > 0 ? ((x.p2 - x.p1) / x.p1 * 100).toFixed(1) : '—', pct: Math.max(x.p1, x.p2) / maxVal * 100 }))
})

function tagType(pct) {
  if (!pct) return 'info'
  const abs = Math.abs(pct)
  if (abs >= 10) return 'danger'
  if (abs >= 5) return 'warning'
  return 'success'
}

async function refreshData() {
  loading.value = true
  try {
    const [ov, top, cost, trend, scatter] = await Promise.all([
      api.getOverview(), api.getTopChanges(8), api.getCostStructure(), api.getTrend(), api.getScatterData()
    ])
    overview.value = ov
    topUp.value = top.top_up
    topDown.value = top.top_down
    structureData.value = cost
    trendData.value = trend
    scatterProducts.value = scatter.data || []
    lastSync.value = true
    await loadProducts()
  } catch (e) {
    console.error('Data load failed:', e)
  }
  loading.value = false
}

async function loadProducts() {
  try {
    const res = await api.getProducts({ sort_by: sortBy.value, sort_order: 'desc', threshold: thresholdFilter.value, search: searchQuery.value, page: currentPage.value, page_size: pageSize.value })
    products.value = res.products
    totalProducts.value = res.total
  } catch (e) {
    console.error('Products load failed:', e)
  }
}

function searchProducts() { currentPage.value = 1; loadProducts() }

async function selectProduct(code) {
  selectedCode.value = code
  try {
    const res = await api.getProductDetail(code)
    detailProduct.value = res.product
    detailVisible.value = true
  } catch (e) {
    console.error('Product detail load failed:', e)
  }
}

onMounted(refreshData)
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans JP', sans-serif; color: #303133; }
#app { max-width: 1440px; margin: 0 auto; padding: 16px 24px; }
.app-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 18px; font-weight: 700; color: #303133; letter-spacing: 1px; }
.separator { color: #dcdfe6; font-size: 18px; }
.subtitle { font-size: 14px; color: #909399; }
.header-right { display: flex; align-items: center; gap: 10px; }
.period-badge { font-size: 13px; color: #606266; background: #ecf5ff; padding: 3px 10px; border-radius: 4px; }
.kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi-card { background: #fff; border-radius: 8px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; }
.kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.kpi-warn { border-left: 3px solid #f56c6c; }
.kpi-good { border-left: 3px solid #67c23a; }
.kpi-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
.kpi-label { font-size: 13px; color: #909399; margin-top: 4px; }
.chart-row { display: flex; gap: 12px; margin-bottom: 12px; }
.chart-card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 12px; }
.chart-card-full { width: 100%; }
.chart-card-2col { flex: 1; }
.chart-title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.chart-subtitle { font-size: 12px; color: #909399; margin-bottom: 8px; }
.change-list { max-height: 400px; overflow-y: auto; }
.change-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 4px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f2f2f2; }
.change-item:hover { background: #f5f7fa; }
.change-item.active { background: #ecf5ff; }
.change-code { font-size: 11px; color: #909399; min-width: 55px; font-family: monospace; }
.change-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.change-bar-wrap { flex: 1; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; min-width: 60px; }
.change-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
.change-val { font-size: 13px; font-weight: 600; min-width: 50px; text-align: right; font-family: monospace; }
.up { color: #f56c6c; }
.down { color: #67c23a; }
.table-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.toolbar-right { display: flex; align-items: center; }
.cell-cost { font-family: monospace; font-size: 12px; }
.diff-up { color: #f56c6c; font-weight: 600; font-family: monospace; }
.diff-down { color: #67c23a; font-weight: 600; font-family: monospace; }
.text-muted { color: #c0c4cc; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
.detail-panel { padding: 0; }
.product-card { border-radius: 10px; overflow: hidden; border: 1px solid #ebeef5; }
.card-up { border-left: 4px solid #f56c6c; }
.card-down { border-left: 4px solid #67c23a; }
.card-header { padding: 16px; background: #fafafa; }
.card-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.card-code { font-family: monospace; font-size: 14px; color: #909399; }
.card-name { font-size: 16px; font-weight: 600; }
.card-spec { font-size: 12px; color: #909399; }
.card-tag { font-size: 12px; }
.card-cost-row { display: flex; gap: 24px; }
.cost-item { display: flex; flex-direction: column; gap: 2px; }
.cost-label { font-size: 11px; color: #909399; }
.cost-val { font-size: 18px; font-weight: 700; }
.card-cost-breakdown { padding: 16px; }
.breakdown-title { font-size: 13px; font-weight: 600; color: #606266; margin-bottom: 12px; }
.breakdown-grid { display: flex; flex-direction: column; gap: 14px; }
.breakdown-item { display: flex; align-items: center; gap: 10px; }
.bd-name { min-width: 65px; font-size: 13px; color: #606266; }
.bd-bar-wrap { flex: 1; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
.bd-bar { height: 100%; border-radius: 10px; transition: width 0.5s; opacity: 0.7; }
.bd-values { display: flex; gap: 8px; min-width: 200px; justify-content: flex-end; font-family: monospace; font-size: 12px; }
.bd-p1 { color: #909399; }
.bd-p2 { color: #606266; }
.bd-diff { min-width: 60px; text-align: right; font-weight: 600; }
</style>
