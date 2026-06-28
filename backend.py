"""
日清原価分析システム — プロトタイプバックエンド (FastAPI + SQLite)
全ての製品データはダミーデータに置き換え済み（脱敏済み）
"""
import sqlite3
import json
import random
import math
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# ============================================================
# 1. Database Initialization
# ============================================================
DB_PATH = "cost_analysis.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""
        CREATE TABLE IF NOT EXISTS period_unit_cost (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_code TEXT NOT NULL,
            item_name TEXT NOT NULL,
            specification TEXT,
            unit TEXT DEFAULT 'kg',
            p1_quantity REAL,
            p1_raw_material REAL,
            p1_packaging REAL,
            p1_rework REAL,
            p1_manufacturing REAL,
            p1_labor REAL,
            p1_total REAL,
            p2_quantity REAL,
            p2_raw_material REAL,
            p2_packaging REAL,
            p2_rework REAL,
            p2_manufacturing REAL,
            p2_labor REAL,
            p2_total REAL,
            avg_quantity REAL,
            avg_raw_material REAL,
            avg_packaging REAL,
            avg_manufacturing REAL,
            avg_rework REAL,
            avg_labor REAL,
            avg_total REAL,
            variance_total REAL,
            variance_total_pct REAL,
            variance_raw_material REAL,
            variance_raw_material_pct REAL,
            variance_packaging REAL,
            variance_packaging_pct REAL,
            variance_manufacturing REAL,
            variance_manufacturing_pct REAL,
            variance_labor REAL,
            variance_labor_pct REAL,
            variance_rework REAL,
            variance_rework_pct REAL,
            flags TEXT DEFAULT '',
            period_label TEXT DEFAULT '2024年1期 vs 2期',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    c.execute("""
        CREATE TABLE IF NOT EXISTS cost_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            item_code TEXT NOT NULL,
            item_name TEXT NOT NULL,
            specification TEXT,
            unit TEXT DEFAULT 'kg',
            plan_quantity REAL,
            cost_item TEXT NOT NULL,
            input_quantity REAL,
            input_amount REAL,
            completed_quantity REAL,
            unit_consumption REAL,
            unit_cost REAL,
            completed_amount REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    c.execute("""
        CREATE TABLE IF NOT EXISTS target_costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_code TEXT NOT NULL,
            item_name TEXT NOT NULL,
            period TEXT NOT NULL,
            target_raw_material REAL,
            target_packaging REAL,
            target_manufacturing REAL,
            target_rework REAL,
            target_labor REAL,
            target_total REAL,
            UNIQUE(item_code, period)
        )
    """)
    
    conn.commit()
    conn.close()

# ============================================================
# 2. DUMMY Data — All product names & codes are fake (脱敏済み)
# ============================================================

DUMMY_PRODUCTS = [
    # code, name (Japanese), spec
    ("P-001", "プレミアム小麦粉A", "25"),
    ("P-002", "プレミアム小麦粉B", "25"),
    ("P-003", "強力粉スーパー", "20"),
    ("P-004", "薄力粉スペシャル", "20"),
    ("P-005", "全粒粉ブレンド", "25"),
    ("P-006", "米粉パウダー", "25"),
    ("P-007", "片栗粉プレミアム", "384.45"),
    ("P-008", "タピオカスターチ", "25"),
    ("P-009", "コーンスターチ精製", "375"),
    ("P-010", "そば粉特選", "163"),
    ("P-011", "白玉粉極上", "570.72"),
    ("P-012", "上新粉上質", "356.235"),
    ("P-013", "だし粉ブレンド", "20"),
    ("P-014", "抹茶パウダーA", "20"),
    ("P-015", "抹茶パウダーB", "20"),
    ("P-016", "紅麹パウダー", "10"),
    ("P-017", "カレー粉オリジナル", "20"),
    ("P-018", "七味唐辛子ブレンド", "20"),
    ("P-019", "ごまペースト", "20"),
    ("P-020", "味噌パウダー", "20"),
    ("P-021", "醤油パウダー加工", "20"),
    ("P-022", "鰹節粉特製", "1kg×10/箱"),
    ("P-023", "昆布パウダー", "1kg×10/箱"),
    ("P-024", "乾燥野菜ミックス", "20"),
    ("P-025", "お好み焼きミックス", "0.5kg×20/箱"),
    ("P-026", "たこ焼きミックス", "20"),
    ("P-027", "ホットケーキミックス", "20"),
    ("P-028", "天ぷら粉サクサク", "20"),
    ("P-029", "唐揚げ粉スパイシー", "20"),
    ("P-030", "パン粉極細", "20"),
    ("P-031", "調理用生パン粉", "20"),
    ("P-032", "冷凍生地プレミアム", "20"),
]

def generate_cost_items(total_unit_cost, has_rework=False, has_labor=False):
    if total_unit_cost is None or total_unit_cost == 0:
        return [0]*6
    
    rm_ratio = random.uniform(0.45, 0.75)
    pkg_ratio = random.uniform(0.02, 0.08)
    mfg_ratio = random.uniform(0.15, 0.40)
    rw_ratio = random.uniform(0.01, 0.05) if has_rework else 0
    lb_ratio = random.uniform(0.02, 0.08) if has_labor else 0
    
    total = rm_ratio + pkg_ratio + mfg_ratio + rw_ratio + lb_ratio
    rm = round(total_unit_cost * rm_ratio / total, 2)
    pkg = round(total_unit_cost * pkg_ratio / total, 2)
    mfg = round(total_unit_cost * mfg_ratio / total, 2)
    rw = round(total_unit_cost * rw_ratio / total, 2) if has_rework else 0
    lb = round(total_unit_cost * lb_ratio / total, 2) if has_labor else 0
    
    diff = total_unit_cost - (rm + pkg + mfg + rw + lb)
    mfg = round(mfg + diff, 2)
    
    return [rm, pkg, mfg, rw, lb]

def generate_data():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("DELETE FROM period_unit_cost")
    c.execute("DELETE FROM cost_records")
    c.execute("DELETE FROM target_costs")
    
    for code, name, spec in DUMMY_PRODUCTS:
        # Random base cost between ¥2 ~ ¥32 (matching real data range)
        p1 = round(random.uniform(2.0, 32.0), 2)
        change = random.uniform(-0.40, 0.35)
        p2 = round(p1 * (1 + change), 2)
        
        p1_qty = random.randint(300, 50000)
        p2_qty = random.randint(300, 50000)
        
        has_rework = code in ["P-001", "P-008", "P-014", "P-025"]
        has_labor = code in ["P-025", "P-022", "P-024"]
        
        p1_items = generate_cost_items(p1, has_rework, has_labor)
        p2_items = generate_cost_items(p2, has_rework, has_labor)
        
        rm1, pkg1, mfg1, rw1, lb1 = p1_items
        rm2, pkg2, mfg2, rw2, lb2 = generate_cost_items(p2, has_rework, has_labor)
        
        total_qty = p1_qty + p2_qty
        if total_qty > 0:
            avg_rm = round((rm1 * p1_qty + rm2 * p2_qty) / total_qty, 2)
            avg_pkg = round((pkg1 * p1_qty + pkg2 * p2_qty) / total_qty, 2)
            avg_mfg = round((mfg1 * p1_qty + mfg2 * p2_qty) / total_qty, 2)
            avg_rw = round((rw1 * p1_qty + rw2 * p2_qty) / total_qty, 2)
            avg_lb = round((lb1 * p1_qty + lb2 * p2_qty) / total_qty, 2)
            avg_total = round(avg_rm + avg_pkg + avg_mfg + avg_rw + avg_lb, 2)
        else:
            avg_rm = avg_pkg = avg_mfg = avg_rw = avg_lb = avg_total = 0
        
        var_total = round(p2 - p1, 2)
        var_total_pct = round((var_total / p1 * 100), 2) if p1 != 0 else 0
        
        def calc_var(a, b):
            diff = round(b - a, 2)
            pct = round((diff / a * 100), 2) if a != 0 else 0
            return diff, pct
        
        v_rm, v_rm_pct = calc_var(rm1, rm2)
        v_pkg, v_pkg_pct = calc_var(pkg1, pkg2)
        v_mfg, v_mfg_pct = calc_var(mfg1, mfg2)
        v_rw, v_rw_pct = calc_var(rw1, rw2)
        v_lb, v_lb_pct = calc_var(lb1, lb2)
        
        flags = []
        if abs(var_total_pct) >= 10:
            flags.append("重大差異")
        elif abs(var_total_pct) >= 5:
            flags.append("要注意")
        if var_total < 0:
            flags.append("コスト低下")
        elif var_total > 0:
            flags.append("コスト上昇")
        
        c.execute("""
            INSERT INTO period_unit_cost (
                item_code, item_name, specification, unit,
                p1_quantity, p1_raw_material, p1_packaging, p1_rework, p1_manufacturing, p1_labor, p1_total,
                p2_quantity, p2_raw_material, p2_packaging, p2_rework, p2_manufacturing, p2_labor, p2_total,
                avg_quantity, avg_raw_material, avg_packaging, avg_manufacturing, avg_rework, avg_labor, avg_total,
                variance_total, variance_total_pct,
                variance_raw_material, variance_raw_material_pct,
                variance_packaging, variance_packaging_pct,
                variance_manufacturing, variance_manufacturing_pct,
                variance_labor, variance_labor_pct,
                variance_rework, variance_rework_pct,
                flags
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            code, name, spec, 'kg',
            p1_qty, rm1, pkg1, rw1, mfg1, lb1, p1,
            p2_qty, rm2, pkg2, rw2, mfg2, lb2, p2,
            p1_qty, avg_rm, avg_pkg, avg_mfg, avg_rw, avg_lb, avg_total,
            var_total, var_total_pct,
            v_rm, v_rm_pct,
            v_pkg, v_pkg_pct,
            v_mfg, v_mfg_pct,
            v_lb, v_lb_pct,
            v_rw, v_rw_pct,
            ','.join(flags)
        ))
    
    # Cost records detail
    for code, name, spec in DUMMY_PRODUCTS:
        p1 = round(random.uniform(2.0, 32.0), 2)
        has_rework = code in ["P-001", "P-008", "P-014", "P-025"]
        has_labor = code in ["P-025", "P-022", "P-024"]
        items = generate_cost_items(p1, has_rework, has_labor)
        item_names = ["原材料", "包装資材", "製造費用", "返工品", "直接労務費"]
        
        plan_qty = random.randint(1000, 60000)
        completed_qty = random.randint(int(plan_qty*0.8), plan_qty)
        
        for i, (cost_item, unit_cost) in enumerate(zip(item_names, items)):
            if unit_cost == 0:
                continue
            amount = round(unit_cost * completed_qty, 2)
            c.execute("""
                INSERT INTO cost_records (
                    period, item_code, item_name, specification, unit,
                    plan_quantity, cost_item, input_quantity, input_amount,
                    completed_quantity, unit_consumption, unit_cost, completed_amount
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                "2024年1期", code, name, spec, 'kg',
                plan_qty, cost_item, plan_qty, amount,
                completed_qty, round(random.uniform(0.5, 2.0), 4), unit_cost, amount
            ))
    
    # Target costs
    c.execute("SELECT item_code, item_name, p1_total FROM period_unit_cost WHERE p1_total IS NOT NULL")
    for code, name, p1 in c.fetchall():
        target_factor = random.uniform(0.95, 1.03)
        target_total = round(p1 * target_factor, 2)
        
        has_rework = code in ["P-001", "P-008", "P-014", "P-025"]
        has_labor = code in ["P-025", "P-022", "P-024"]
        items = generate_cost_items(target_total, has_rework, has_labor)
        
        c.execute("""
            INSERT OR REPLACE INTO target_costs
                (item_code, item_name, period, target_raw_material, target_packaging,
                 target_manufacturing, target_rework, target_labor, target_total)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (code, name, "2024年1期", items[0], items[1], items[2], items[3], items[4], target_total))
    
    conn.commit()
    conn.close()
    print(f"✅ ダミーデータ生成完了: {len(DUMMY_PRODUCTS)} 製品")

# ============================================================
# 3. FastAPI Application
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    generate_data()
    yield

app = FastAPI(title="日清原価分析システム API", version="0.2", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    return conn

# ---- API Endpoints ----

@app.get("/api/overview")
def get_overview():
    conn = get_db()
    c = conn.cursor()
    total = c.execute("SELECT COUNT(*) as cnt FROM period_unit_cost").fetchone()['cnt']
    compared = c.execute("SELECT COUNT(*) as cnt FROM period_unit_cost WHERE p1_total IS NOT NULL AND p2_total IS NOT NULL").fetchone()['cnt']
    warnings = c.execute("SELECT COUNT(*) as cnt FROM period_unit_cost WHERE ABS(variance_total_pct) >= 5").fetchone()['cnt']
    critical = c.execute("SELECT COUNT(*) as cnt FROM period_unit_cost WHERE ABS(variance_total_pct) >= 10").fetchone()['cnt']
    avg_var = c.execute("SELECT ROUND(AVG(ABS(variance_total_pct)), 2) as avg_var FROM period_unit_cost WHERE variance_total_pct IS NOT NULL").fetchone()['avg_var'] or 0
    cost_down = c.execute("SELECT COUNT(*) as cnt FROM period_unit_cost WHERE variance_total < 0").fetchone()['cnt']
    cost_up = c.execute("SELECT COUNT(*) as cnt FROM period_unit_cost WHERE variance_total > 0").fetchone()['cnt']
    conn.close()
    return {
        "total_products": total, "compared_products": compared,
        "warnings": warnings, "critical": critical,
        "avg_variance_pct": avg_var, "cost_down": cost_down, "cost_up": cost_up,
        "period_label": "2024年1期 vs 2期"
    }

@app.get("/api/products")
def get_products(
    sort_by: str = Query("variance_total_pct"),
    sort_order: str = Query("desc"),
    threshold: float = Query(0),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    conn = get_db()
    allowed_sort = {
        'variance_total_pct': 'ABS(puc.variance_total_pct)',
        'variance_total': 'ABS(puc.variance_total)',
        'item_code': 'puc.item_code',
        'item_name': 'puc.item_name',
        'p1_total': 'puc.p1_total',
        'p2_total': 'puc.p2_total',
    }
    sort_col = allowed_sort.get(sort_by, 'ABS(puc.variance_total_pct)')
    order = "DESC" if sort_order == 'desc' else "ASC"
    
    conditions, params = [], []
    if threshold > 0:
        conditions.append("ABS(puc.variance_total_pct) >= ?")
        params.append(threshold)
    if search:
        conditions.append("(puc.item_code LIKE ? OR puc.item_name LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    
    total = conn.execute(f"SELECT COUNT(*) as cnt FROM period_unit_cost puc {where}", params).fetchone()['cnt']
    offset = (page - 1) * page_size
    
    products = conn.execute(f"""
        SELECT puc.*, tc.target_total FROM period_unit_cost puc
        LEFT JOIN target_costs tc ON tc.item_code = puc.item_code AND tc.period = '2024年1期'
        {where} ORDER BY {sort_col} {order} LIMIT ? OFFSET ?
    """, params + [page_size, offset]).fetchall()
    conn.close()
    return {"total": total, "page": page, "page_size": page_size, "total_pages": max(1, (total + page_size - 1) // page_size), "products": products}

@app.get("/api/products/{item_code}")
def get_product_detail(item_code: str):
    conn = get_db()
    product = conn.execute(
        "SELECT puc.*, tc.target_total FROM period_unit_cost puc "
        "LEFT JOIN target_costs tc ON tc.item_code = puc.item_code AND tc.period = '2024年1期' "
        "WHERE puc.item_code = ?", (item_code,)
    ).fetchone()
    if not product:
        conn.close()
        return {"error": "製品が見つかりません"}
    details = conn.execute("SELECT * FROM cost_records WHERE item_code = ? ORDER BY cost_item", (item_code,)).fetchall()
    conn.close()
    return {"product": product, "details": details}

@app.get("/api/top-changes")
def get_top_changes(limit: int = 10):
    conn = get_db()
    top_up = conn.execute("""
        SELECT item_code, item_name, p1_total, p2_total, variance_total, variance_total_pct
        FROM period_unit_cost WHERE variance_total_pct IS NOT NULL AND variance_total > 0
        ORDER BY variance_total_pct DESC LIMIT ?
    """, (limit,)).fetchall()
    top_down = conn.execute("""
        SELECT item_code, item_name, p1_total, p2_total, variance_total, variance_total_pct
        FROM period_unit_cost WHERE variance_total_pct IS NOT NULL AND variance_total < 0
        ORDER BY variance_total_pct ASC LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return {"top_up": top_up, "top_down": top_down}

@app.get("/api/cost-structure")
def get_cost_structure():
    conn = get_db()
    result = conn.execute("""
        SELECT ROUND(AVG(p1_raw_material),2) as avg_rm, ROUND(AVG(p1_packaging),2) as avg_pkg,
               ROUND(AVG(p1_manufacturing),2) as avg_mfg, ROUND(AVG(p1_rework),2) as avg_rw,
               ROUND(AVG(p1_labor),2) as avg_lb, ROUND(AVG(p1_total),2) as avg_total
        FROM period_unit_cost WHERE p1_total IS NOT NULL
    """).fetchone()
    conn.close()
    return result

@app.get("/api/trend")
def get_trend():
    months = ["2023-07", "2023-08", "2023-09", "2023-10", "2023-11", "2023-12",
              "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"]
    conn = get_db()
    avg_cost = conn.execute("SELECT AVG(p1_total) as avg_cost FROM period_unit_cost").fetchone()['avg_cost'] or 8
    trends = []
    base = avg_cost
    for i, m in enumerate(months):
        change = random.uniform(-0.08, 0.10)
        if i > 6:
            change += 0.02
        val = round(base * (1 + change), 2)
        trends.append({"month": m, "avg_cost": val, "target": round(avg_cost * 0.98, 2)})
    conn.close()
    return {"trends": trends}

@app.get("/api/all-products-scatter")
def get_all_products_scatter():
    conn = get_db()
    data = conn.execute("""
        SELECT item_code, item_name, p1_quantity, p2_quantity, p1_total, p2_total, variance_total, variance_total_pct
        FROM period_unit_cost WHERE p1_total IS NOT NULL AND p2_total IS NOT NULL
    """).fetchall()
    conn.close()
    return {"data": data}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
