// 中日双语对照表
export const messages = {
  zh: {
    title: '成本分析仪表盘',
    nisshin: '日清 Nisshin',
    period: '2024年1期 vs 2期',
    
    // KPI
    totalProducts: '产品总数',
    warnings: '异常告警',
    critical: '严重超标',
    avgVariance: '平均差异率',
    costUp: '成本上升',
    costDown: '成本下降',
    
    // Chart titles
    costStructure: '成本结构分解（单位成本均值）',
    trend: '多期成本趋势',
    scatterTitle: '产品差异分布（差异率 × 产量）',
    scatterSub: '气泡大小代表产量 | 红色 = 成本上升 > 5% | 绿色 = 正常 | 蓝色 = 成本下降 > 5%',
    
    // Lists
    topUp: '成本上升 Top 8',
    topDown: '成本下降 Top 8',
    
    // Table
    tableTitle: '产品成本对比明细表',
    colCode: '编码',
    colName: '产品名称',
    colCurrent: '本期单位成本',
    colPrevious: '上期单位成本',
    colVariance: '差异额',
    colVariancePct: '差异率',
    colTarget: '目标成本',
    colFlags: '标记',
    colAction: '操作',
    detail: '详情',
    
    // Flags
    flagNew: '新品',
    flagStopped: '停产',
    flagMajor: '重大',
    flagGood: '利好',
    
    // Dialog
    dialogTitle: '产品详情',
    noTarget: '未设',
    
    // Breakdown
    breakdownTitle: '成本项目明细',
    rawMaterial: '原材料',
    packaging: '包装物',
    manufacturing: '制造费用',
    rework: '返工品',
    labor: '直接人工',
    
    // Search/sort
    search: '搜索产品名称/编码',
    sortByVariancePct: '差异率排序',
    sortByVariance: '差异额排序',
    sortByCode: '产品编码',
    sortByCurrent: '本期成本',
    filterAll: '全部',
    over5: '≥ 5%',
    over10: '≥ 10%',
    over20: '≥ 20%',
  },
  ja: {
    title: '原価分析ダッシュボード',
    nisshin: '日清 Nisshin',
    period: '2024年1期 vs 2期',
    
    totalProducts: '製品総数',
    warnings: '警告数',
    critical: '重大超過',
    avgVariance: '平均差異率',
    costUp: 'コスト上昇',
    costDown: 'コスト低下',
    
    costStructure: 'コスト構造分解（単位原価平均）',
    trend: '期間別コスト推移',
    scatterTitle: '製品差異分布（差異率 × 生産量）',
    scatterSub: 'バブルの大きさ＝生産量 | 赤色＝5%超上昇 | 緑色＝正常 | 青色＝5%超低下',
    
    topUp: 'コスト上昇 Top 8',
    topDown: 'コスト低下 Top 8',
    
    tableTitle: '製品原価対比明細表',
    colCode: 'コード',
    colName: '製品名',
    colCurrent: '当期単価',
    colPrevious: '前期単価',
    colVariance: '差異額',
    colVariancePct: '差異率',
    colTarget: '目標原価',
    colFlags: 'フラグ',
    colAction: '操作',
    detail: '詳細',
    
    flagNew: '新製品',
    flagStopped: '生産停止',
    flagMajor: '重大',
    flagGood: '好調',
    
    dialogTitle: '製品詳細',
    noTarget: '未設定',
    
    breakdownTitle: '原価項目明細',
    rawMaterial: '原材料',
    packaging: '包装資材',
    manufacturing: '製造費用',
    rework: '返工品',
    labor: '直接労務費',
    
    search: '製品名・コード検索',
    sortByVariancePct: '差異率順',
    sortByVariance: '差異額順',
    sortByCode: '製品コード',
    sortByCurrent: '当期原価',
    filterAll: '全て',
    over5: '5%以上',
    over10: '10%以上',
    over20: '20%以上',
  }
}

export default messages
