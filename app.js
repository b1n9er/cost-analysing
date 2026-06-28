/* =============================================
   日清 Nisshin 原価分析システム
   GitHub Pages 静态部署版
   ============================================= */

// 中日双语
const I18N = {
  zh: {
    title: '成本分析仪表盘', nisshin: '日清 Nisshin', period: '2024年1期 vs 2期',
    totalProducts: '产品总数', warnings: '异常告警', critical: '严重超标',
    avgVariance: '平均差异率', costUp: '成本上升', costDown: '成本下降',
    costStructure: '成本结构分解（单位成本均值）', trend: '多期成本趋势',
    scatterTitle: '产品差异分布（差异率 × 产量）',
    scatterSub: '气泡大小=产量 | 🔴>5%上升 | 🟢正常 | 🔵>5%下降',
    topUp: '成本上升 Top 8', topDown: '成本下降 Top 8',
    tableTitle: '产品成本对比明细表', colCode: '编码', colName: '产品名称',
    colCurrent: '本期单位成本', colPrevious: '上期单位成本', colVariance: '差异额',
    colVariancePct: '差异率', colTarget: '目标成本', colFlags: '标记', colAction: '操作',
    detail: '详情', noTarget: '未设', breakdownTitle: '成本项目明细',
    rawMaterial: '原材料', packaging: '包装物', manufacturing: '制造费用', rework: '返工品', labor: '直接人工',
    search: '搜索产品名称/编码', sortByVariancePct: '差异率排序', sortByVariance: '差异额排序',
    sortByCode: '产品编码', sortByCurrent: '本期成本', filterAll: '全部',
    over5: '≥ 5%', over10: '≥ 10%', over20: '≥ 20%',
    prevPage: '‹ 上一页', nextPage: '下一页 ›', itemCount: '件', page: '页',
    currentPeriod: '本期', previousPeriod: '上期',
  },
  ja: {
    title: '原価分析ダッシュボード', nisshin: '日清 Nisshin', period: '2024年1期 vs 2期',
    totalProducts: '製品総数', warnings: '警告数', critical: '重大超過',
    avgVariance: '平均差異率', costUp: 'コスト上昇', costDown: 'コスト低下',
    costStructure: 'コスト構造分解（単位原価平均）', trend: '期間別コスト推移',
    scatterTitle: '製品差異分布（差異率 × 生産量）',
    scatterSub: 'バブル=生産量 | 🔴>5%上昇 | 🟢正常 | 🔵>5%低下',
    topUp: 'コスト上昇 Top 8', topDown: 'コスト低下 Top 8',
    tableTitle: '製品原価対比明細表', colCode: 'コード', colName: '製品名',
    colCurrent: '当期単価', colPrevious: '前期単価', colVariance: '差異額',
    colVariancePct: '差異率', colTarget: '目標原価', colFlags: 'フラグ', colAction: '操作',
    detail: '詳細', noTarget: '未設定', breakdownTitle: '原価項目明細',
    rawMaterial: '原材料', packaging: '包装資材', manufacturing: '製造費用', rework: '返工品', labor: '直接労務費',
    search: '製品名・コード検索', sortByVariancePct: '差異率順', sortByVariance: '差異額順',
    sortByCode: '製品コード', sortByCurrent: '当期原価', filterAll: '全て',
    over5: '5%以上', over10: '10%以上', over20: '20%以上',
    prevPage: '‹ 前ページ', nextPage: '次ページ ›', itemCount: '件', page: 'ページ',
    currentPeriod: '当期', previousPeriod: '前期',
  }
}

let lang = localStorage.getItem('nisshin_lang') || 'zh'
function t(key) { return I18N[lang][key] || key }
function toggleLang() {
  lang = lang === 'zh' ? 'ja' : 'zh'
  localStorage.setItem('nisshin_lang', lang)
  render()
}

// 工具
function fmt(n) { return (n || 0).toFixed(2) }
function tagClass(vp) {
  const a = Math.abs(vp || 0)
  return a >= 10 ? 'tag-danger' : a >= 5 ? 'tag-warn' : 'tag-ok'
}
function flagTag(fl) {
  if (!fl) return ''
  if (fl.includes('重大差異')) return '<span class="badge badge-danger">⚠️重大</span>'
  if (fl.includes('要注意')) return '<span class="badge badge-warn">⚠️要注意</span>'
  if (fl.includes('コスト低下')) return '<span class="badge badge-ok">↓好調</span>'
  if (fl.includes('コスト上昇')) return '<span class="badge badge-danger">↑上昇</span>'
  return ''
}

// 数据
const D = MOCK_DATA
const products = D.products

function render() {
  renderHeader()
  renderKPI()
  renderStructure()
  renderTrend()
  renderScatter()
  renderTopChanges()
  renderTable()
}

function renderHeader() {
  document.getElementById('app-title').textContent = t('title')
  document.getElementById('lang-btn').textContent = lang === 'zh' ? 'JP' : 'CN'
  document.getElementById('lang-btn').className = `lang-btn ${lang === 'zh' ? 'lang-cn' : 'lang-ja'}`
  document.getElementById('period').textContent = D.period || t('period')
  
  // Chart titles
  document.getElementById('cs-title').textContent = t('costStructure')
  document.getElementById('tr-title').textContent = t('trend')
  document.getElementById('sc-title').textContent = t('scatterTitle')
  document.getElementById('sc-sub').textContent = t('scatterSub')
  document.getElementById('top-up-title').textContent = t('topUp')
  document.getElementById('top-down-title').textContent = t('topDown')
  document.getElementById('table-title').textContent = t('tableTitle')
  document.getElementById('bd-title').textContent = t('breakdownTitle')
  
  // Toolbar
  document.getElementById('toolbar-right').innerHTML =
    '<input class="search-input" id="search-input" placeholder="' + t('search') + '" oninput="filterTable()">' +
    '<select class="sort-select" id="sort-select" onchange="filterTable()">' +
      '<option value="vp">' + t('sortByVariancePct') + '</option>' +
      '<option value="vt">' + t('sortByVariance') + '</option>' +
      '<option value="c">' + t('sortByCode') + '</option>' +
      '<option value="p1">' + t('sortByCurrent') + '</option>' +
    '</select>' +
    '<select class="threshold-select" id="threshold-select" onchange="filterTable()">' +
      '<option value="0">' + t('filterAll') + '</option>' +
      '<option value="5">' + t('over5') + '</option>' +
      '<option value="10">' + t('over10') + '</option>' +
      '<option value="20">' + t('over20') + '</option>' +
    '</select>'
  
  // Table header
  document.getElementById('table-head').innerHTML =
    '<tr><th>' + t('colCode') + '</th><th>' + t('colName') + '</th><th>' + t('colCurrent') +
    '</th><th>' + t('colPrevious') + '</th><th>' + t('colVariance') + '</th><th>' + t('colVariancePct') +
    '</th><th>' + t('colTarget') + '</th><th>' + t('colFlags') + '</th><th>' + t('colAction') + '</th></tr>'
}

function renderKPI() {
  const items = [
    { label: t('totalProducts'), value: D.total, color: '#409eff', warn: false },
    { label: t('warnings'), value: D.warnings, color: D.warnings > 10 ? '#f56c6c' : '#e6a23c', warn: D.warnings > 5 },
    { label: t('critical'), value: D.critical, color: D.critical > 3 ? '#f56c6c' : '#909399', warn: D.critical > 3 },
    { label: t('avgVariance'), value: D.avg_var + '%', color: '#67c23a', warn: false },
    { label: t('costUp'), value: D.cost_up, color: '#f56c6c', warn: true },
    { label: t('costDown'), value: D.cost_down, color: '#67c23a', warn: false },
  ]
  document.getElementById('kpi-row').innerHTML = items.map(x =>
    `<div class="kpi-card ${x.warn ? 'kpi-warn' : ''}" style="border-left-color:${x.color}">
       <div class="kpi-value" style="color:${x.color}">${x.value}</div>
       <div class="kpi-label">${x.label}</div>
     </div>`
  ).join('')
}

function renderStructure() {
  const cs = D.cs
  const items = [
    { name: t('rawMaterial'), value: cs.rm, color: '#409eff' },
    { name: t('manufacturing'), value: cs.mf, color: '#e6a23c' },
    { name: t('packaging'), value: cs.pk, color: '#67c23a' },
    { name: t('labor'), value: cs.lb, color: '#9b59b6' },
    { name: t('rework'), value: cs.rw, color: '#f56c6c' },
  ].filter(x => x.value > 0)

  const chart = echarts.init(document.getElementById('chart-structure'))
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 10, textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n¥{c}', fontSize: 11 },
      emphasis: { label: { show: true, fontSize: 14 } },
      data: items.map(x => ({ ...x, itemStyle: { color: x.color } }))
    }]
  })
}

function renderTrend() {
  const tr = D.trends
  const chart = echarts.init(document.getElementById('chart-trend'))
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 12 } },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: tr.map(d => d.m), axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', name: '¥', nameTextStyle: { fontSize: 11 } },
    series: [{
      name: lang === 'zh' ? '平均成本' : '平均原価',
      type: 'line', data: tr.map(d => d.c),
      smooth: true, lineStyle: { color: '#409eff', width: 2 },
      areaStyle: { color: 'rgba(64,158,255,0.1)' },
      markLine: {
        silent: true,
        data: [{ yAxis: tr[0]?.t, label: { formatter: `${lang==='zh'?'目標':'目標'} ¥{c}`, fontSize: 11 }, lineStyle: { color: '#f56c6c', type: 'dashed' } }]
      }
    }]
  })
}

function renderScatter() {
  const sc = D.scatter
  const chart = echarts.init(document.getElementById('chart-scatter'))
  chart.setOption({
    tooltip: {
      formatter: (p) => {
        const d = p.data
        return `<b>${d.value[3]}</b><br/>${lang==='zh'?'单位成本':'単位原価'}: ¥${d.value[0].toFixed(2)}<br/>${lang==='zh'?'差异率':'差異率'}: ${d.value[1].toFixed(1)}%<br/>${lang==='zh'?'产量':'生産量'}: ${(d.value[2]||0).toLocaleString()}`
      }
    },
    grid: { left: 60, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'log', name: `¥ ${lang==='zh'?'单位成本':'単位原価'}`, nameLocation: 'center', nameGap: 35, nameTextStyle: { fontSize: 11 }, axisLabel: { formatter: '¥{value}' } },
    yAxis: { type: 'value', name: `${lang==='zh'?'差异率':'差異率'} (%)`, nameTextStyle: { fontSize: 11 }, axisLabel: { formatter: '{value}%' }, splitLine: { show: true, lineStyle: { type: 'dashed' } } },
    series: [{
      type: 'scatter',
      data: sc.map(d => ({
        value: d,
        itemStyle: { color: d[1] > 5 ? '#f56c6c' : d[1] < -5 ? '#67c23a' : '#909399' }
      })),
      symbolSize: (val) => Math.max(8, Math.min(40, Math.sqrt(val[2]||5000)*0.2)),
      emphasis: { focus: 'series', itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } }
    }]
  })
}

function renderTopChanges() {
  const upList = document.getElementById('top-up-list')
  const downList = document.getElementById('top-down-list')
  
  upList.innerHTML = D.top_up.map(p =>
    `<div class="change-item" onclick="showDetail('${p.c}')">
       <span class="change-code">${p.c}</span>
       <span class="change-name">${p.n}</span>
       <span class="change-bar-wrap"><span class="change-bar" style="width:${Math.min(Math.abs(p.vp)*3,100)}%;background:#f56c6c"></span></span>
       <span class="change-val up">${p.vt > 0 ? '+' : ''}${p.vp}%</span>
     </div>`
  ).join('')
  
  downList.innerHTML = D.top_down.map(p =>
    `<div class="change-item" onclick="showDetail('${p.c}')">
       <span class="change-code">${p.c}</span>
       <span class="change-name">${p.n}</span>
       <span class="change-bar-wrap"><span class="change-bar" style="width:${Math.min(Math.abs(p.vp)*3,100)}%;background:#67c23a"></span></span>
       <span class="change-val down">${p.vt > 0 ? '+' : ''}${p.vp}%</span>
     </div>`
  ).join('')
}

let filteredProducts = [...products]
let currentPage = 1
const pageSize = 50

function renderTable() {
  const start = (currentPage - 1) * pageSize
  const pageData = filteredProducts.slice(start, start + pageSize)
  const totalPages = Math.ceil(filteredProducts.length / pageSize)
  
  const tbody = document.getElementById('table-body')
  tbody.innerHTML = pageData.map(p => {
    const vc = p.vt > 0 ? 'diff-up' : 'diff-down'
    return `<tr onclick="showDetail('${p.c}')">
      <td>${p.c}</td>
      <td>${p.n}</td>
      <td class="mono">¥${fmt(p.p1)}</td>
      <td class="mono">¥${fmt(p.p2)}</td>
      <td class="mono ${vc}">${p.vt > 0 ? '+' : ''}${fmt(p.vt)}</td>
      <td><span class="badge ${tagClass(p.vp)}">${p.vt > 0 ? '+' : ''}${fmt(p.vp)}%</span></td>
      <td class="mono ${p.p1 > p.tg ? 'diff-up' : 'diff-down'}">¥${fmt(p.tg)}</td>
      <td>${flagTag(p.fl)}</td>
      <td><button class="btn-link" onclick="event.stopPropagation();showDetail('${p.c}')">${t('detail')}</button></td>
    </tr>`
  }).join('')
  
  document.getElementById('pagination').innerHTML =
    '<span id="page-info"></span>' +
    '<button id="page-prev" onclick="prevPage()">' + t('prevPage') + '</button>' +
    '<button id="page-next" onclick="nextPage()">' + t('nextPage') + '</button>'
  document.getElementById('page-info').textContent = filteredProducts.length + t('itemCount') + ' · ' + currentPage + '/' + totalPages + t('page')
  document.getElementById('page-prev').disabled = currentPage <= 1
  document.getElementById('page-next').disabled = currentPage >= totalPages
}

function prevPage() { if (currentPage > 1) { currentPage--; renderTable() } }
function nextPage() { const tp = Math.ceil(filteredProducts.length / pageSize); if (currentPage < tp) { currentPage++; renderTable() } }

function filterTable() {
  const q = document.getElementById('search-input').value.toLowerCase()
  const th = parseFloat(document.getElementById('threshold-select').value) || 0
  
  filteredProducts = products.filter(p => {
    if (th > 0 && Math.abs(p.vp) < th) return false
    if (q && !p.c.toLowerCase().includes(q) && !p.n.toLowerCase().includes(q)) return false
    return true
  })
  
  const sortKey = document.getElementById('sort-select').value
  filteredProducts.sort((a, b) => Math.abs(b[sortKey]||0) - Math.abs(a[sortKey]||0))
  
  currentPage = 1
  renderTable()
}

function showDetail(code) {
  const p = products.find(x => x.c === code)
  if (!p) return
  
  document.getElementById('modal').style.display = 'flex'
  document.getElementById('modal-title').textContent = `${p.n} (${p.c})`
  
  const items = [
    { name: t('rawMaterial'), p1: p.rm1, p2: p.rm2, color: '#409eff' },
    { name: t('packaging'), p1: p.pk1, p2: p.pk2, color: '#67c23a' },
    { name: t('manufacturing'), p1: p.mf1, p2: p.mf2, color: '#e6a23c' },
    { name: t('labor'), p1: p.lb1, p2: p.lb2, color: '#9b59b6' },
    { name: t('rework'), p1: p.rw1, p2: p.rw2, color: '#f56c6c' },
  ].filter(x => x.p1 > 0 || x.p2 > 0)
  
  const maxVal = Math.max(...items.map(x => Math.max(x.p1, x.p2)), 1)
  
  document.getElementById('detail-header').innerHTML = `
    <div class="card-title-row">
      <span class="card-code">${p.c}</span>
      <span class="card-name">${p.n}</span>
      <span class="card-spec">${p.s}</span>
      <span class="badge ${p.vt > 0 ? 'badge-danger' : 'badge-ok'}">${p.vt>0?'↑':'↓'} ${Math.abs(p.vp)}%</span>
    </div>
    <div class="card-cost-row">
      <div class="cost-item"><span class="cost-label">${t('currentPeriod')}</span><span class="cost-val">¥${fmt(p.p1)}</span></div>
      <div class="cost-item"><span class="cost-label">${t('previousPeriod')}</span><span class="cost-val">¥${fmt(p.p2)}</span></div>
      <div class="cost-item"><span class="cost-label">${t('colTarget')}</span><span class="cost-val ${p.p1 > p.tg ? 'diff-up' : 'diff-down'}">¥${fmt(p.tg)}</span></div>
      <div class="cost-item"><span class="cost-label">${t('colVariance')}</span><span class="cost-val ${p.vt>0?'diff-up':'diff-down'}">${p.vt>0?'+':''}¥${fmt(p.vt)}</span></div>
    </div>`
  
  document.getElementById('detail-breakdown').innerHTML = items.map(x => {
    const diff = x.p2 - x.p1
    const dp = x.p1 > 0 ? ((diff/x.p1)*100).toFixed(1) : '—'
    return `<div class="bd-item">
      <div class="bd-name">${x.name}</div>
      <div class="bd-bar-wrap"><div class="bd-bar" style="width:${Math.max(x.p1,x.p2)/maxVal*100}%;background:${x.color}"></div></div>
      <div class="bd-vals">
        <span class="bd-p1">¥${fmt(x.p1)}</span>
        <span class="bd-arrow">→</span>
        <span class="bd-p2">¥${fmt(x.p2)}</span>
        <span class="${diff>0?'diff-up':'diff-down'} bd-diff">${diff>0?'+':''}${dp}%</span>
      </div>
    </div>`
  }).join('')
}

function closeModal() { document.getElementById('modal').style.display = 'none' }

// Init
document.addEventListener('DOMContentLoaded', render)
