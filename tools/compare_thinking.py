"""thinking設定・モデル別の出力比較ツール。

使い方（プロジェクト直下で）:
    GEMINI_API_KEY=xxxx .venv/bin/python tools/compare_thinking.py
    # またはプロジェクト直下の .env に GEMINI_API_KEY を書いておく
    # 回数を変える: --repeat 3 / ドライラン(API不使用): --dry-run

結果は tools/out/compare_thinking.html に出力される（ブラウザで開く）。
"""
import argparse
import html
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from dotenv import load_dotenv

load_dotenv()
os.environ.setdefault("GEMINI_API_KEY", "dummy")  # main.pyのimport用

import main as app  # プロンプトと共通関数を本番と同じものにするため
from google.genai import types

# 単価(USD/100万トークン)。概算なので最新の料金表で要確認。思考トークンは出力単価で課金。
PRICES = {
    "gemini-2.5-flash": {"in": 0.30, "out": 2.50},
    "gemini-3.1-flash-lite": {"in": 0.25, "out": 1.50},
}
JPY_PER_USD = 150

# budget: 2.5系の thinking_budget / level: 3系の thinking_level (minimal|low|medium|high)
CONDITIONS = {
    "old": {"label": "旧本番 (2.5-flash・思考デフォルト)", "model": "gemini-2.5-flash"},
    "minimal": {"label": "3.1-flash-lite・思考minimal", "model": "gemini-3.1-flash-lite", "level": "minimal"},
    "low": {"label": "3.1-flash-lite・思考low (現本番)", "model": "gemini-3.1-flash-lite", "level": "low"},
    "medium": {"label": "3.1-flash-lite・思考medium", "model": "gemini-3.1-flash-lite", "level": "medium"},
}

NOVEL = """　駅前の古い時計屋は、午後三時になると必ず店を閉める。
　それを不思議に思った私は、ある日、閉店の五分前に扉を押した。
「いらっしゃい。でも、もう閉めるところでね」
　店主の老人はそう言いながら、止まった柱時計の前に椅子を置いた。
「この時計、三時で止まってるんですね」
「ああ。妻が亡くなった時刻でね。直せるんだが、直さないことにしてる」
　私は黙っていた。老人は懐中時計を取り出して、ちらりと見た。
「でも、あんたが来たから三分遅れた。妻は怒るだろうな。時間にうるさい人だったから」
　笑う老人の背後で、柱時計がかちりと音を立てた。針は動いていない。それなのに、確かに秒針の音がした。
「……聞こえましたか」
　私が頷くと、老人は帽子を脱いで、深く頭を下げた。
「ありがとう。やっと、三時が終わる」
　その日から、時計屋は三時を過ぎても開いている。"""

CASES = [
    {"id": "novel", "title": "小説下読み", "kind": "novel", "prompt": app.SYSTEM_PROMPT_NOVEL,
     "input": f"[[TEXT_START]]\n{NOVEL}\n[[TEXT_END]]", "note": "短編小説（約450字）。採点のばらつきと講評の質を見る。"},
    {"id": "haiku_ok", "title": "俳句: 五七五の正格", "kind": "poem",
     "prompt": app.SYSTEM_PROMPT_HAIKU, "text": "柿食へば鐘が鳴るなり法隆寺",
     "note": "5-7-5の正格。リズム(rhythm)が高く出るべき。"},
    {"id": "haiku_over", "title": "俳句: 大幅な字余り", "kind": "poem",
     "prompt": app.SYSTEM_PROMPT_HAIKU, "text": "満員電車でスマホを見ている人たちの頭上に蝉時雨",
     "note": "明らかな字余り（17音を大きく超える）。字余りと指摘できているか、リズムの点が妥当か。"},
    {"id": "haiku_short", "title": "俳句: 字足らず", "kind": "poem",
     "prompt": app.SYSTEM_PROMPT_HAIKU, "text": "春の風猫が眠る",
     "note": "11音の字足らず。音数不足を指摘できているか。"},
    {"id": "tanka", "title": "短歌: 一首評", "kind": "poem",
     "prompt": app.SYSTEM_PROMPT_TANKA, "text": "不来方のお城の草に寝転びて空に吸はれし十五の心",
     "note": "石川啄木。五七五七七のリズム判定と講評の質。"},
    {"id": "comment_haiku", "title": "俳句コメント欄(7人指定)", "kind": "count", "count": 7,
     "prompt": app.SYSTEM_PROMPT_COMMENT_HAIKU, "text": "柿食へば鐘が鳴るなり法隆寺",
     "note": "指定人数ぴったりのコメントが返るか。"},
    {"id": "comment_novel", "title": "小説コメント欄(15人指定)", "kind": "count", "count": 15,
     "prompt": app.SYSTEM_PROMPT_COMMENT_NOVEL, "text": NOVEL,
     "note": "指定人数ぴったりのコメントが返るか。"},
]


def build_request(case):
    """本番エンドポイントと同じ組み立て方で (system_instruction, contents) を返す。"""
    if case["kind"] == "novel":
        return case["prompt"], case["input"]
    if case["kind"] == "poem":
        return case["prompt"], f"【実行モード】: single\n\n【提出された作品】:\n{case['text']}"
    n = case["count"]
    instruction = f"""
{case['prompt']}

【最優先追加指令】
今回は、必ず「合計{n}人分」のコメントを生成してください。
多すぎても少なすぎてもいけません。配列の要素数はぴったり{n}個にしてください。
"""
    return instruction, f"【実行モード】: single\n\n[[TEXT_START]]\n{case['text']}\n[[TEXT_END]]"


def run_one(client, case, cond_id, run_idx):
    cond = CONDITIONS[cond_id]
    system, contents = build_request(case)
    cfg = dict(system_instruction=system, response_mime_type="application/json")
    if "level" in cond:
        cfg["thinking_config"] = types.ThinkingConfig(thinking_level=cond["level"])
    elif "budget" in cond:
        cfg["thinking_config"] = types.ThinkingConfig(thinking_budget=cond["budget"])
    rec = {"case": case["id"], "cond": cond_id, "run": run_idx}
    t0 = time.time()
    try:
        r = client.models.generate_content(model=cond["model"], config=types.GenerateContentConfig(**cfg), contents=contents)
        rec["sec"] = round(time.time() - t0, 1)
        u = r.usage_metadata
        rec["in_tok"] = u.prompt_token_count or 0
        rec["out_tok"] = u.candidates_token_count or 0
        rec["think_tok"] = u.thoughts_token_count or 0
        p = PRICES[cond["model"]]
        rec["jpy"] = ((rec["in_tok"] * p["in"] + (rec["out_tok"] + rec["think_tok"]) * p["out"]) / 1e6) * JPY_PER_USD
        rec["data"] = json.loads(app.clean_json_text(r.text))
    except Exception as e:
        rec["sec"] = round(time.time() - t0, 1)
        rec["error"] = f"{type(e).__name__}: {e}"
    return rec


def dry_record(case, cond_id, run_idx):
    return {"case": case["id"], "cond": cond_id, "run": run_idx, "sec": 0, "in_tok": 100, "out_tok": 200,
            "think_tok": 0 if cond_id == "minimal" else 800, "jpy": 0.1,
            "data": {"analysis_scores": {"rhythm": 5}, "comments": [{"comment": "dry"}] * case.get("count", 0)}}


def esc(s):
    return html.escape(str(s))


def find_scores(data):
    s = data.get("analysis_scores") if isinstance(data, dict) else None
    return s if isinstance(s, dict) else {}


def render_data(case, rec):
    if "error" in rec:
        return f'<div class="err">失敗: {esc(rec["error"])}</div>'
    d = rec["data"]
    out = []
    scores = find_scores(d)
    if scores:
        out.append('<div class="scores">' + " ".join(f"<span>{esc(k)} <b>{esc(v)}</b></span>" for k, v in scores.items()) + "</div>")
    if case["kind"] == "count":
        got = len(d.get("comments", [])) if isinstance(d, dict) else -1
        ok = got == case["count"]
        out.append(f'<div class="{"ok" if ok else "ng"}">コメント数: {got} / 指定 {case["count"]} {"✔" if ok else "✘"}</div>')
        for c in (d.get("comments", []) if isinstance(d, dict) else [])[:4]:
            out.append(f'<p class="cm">{esc(c.get("avatar",""))} {esc(c.get("name",""))}: {esc(c.get("comment",""))}</p>')
        out.append('<p class="mut">（先頭4件のみ表示）</p>')
    else:
        text = json.dumps({k: v for k, v in d.items() if k != "analysis_scores"}, ensure_ascii=False, indent=1) if isinstance(d, dict) else str(d)
        out.append(f"<details><summary>全文を見る</summary><pre>{esc(text)}</pre></details>")
    return "".join(out)


def write_report(records, path, dry):
    by = {}
    for r in records:
        by.setdefault((r["case"], r["cond"]), []).append(r)

    def agg(recs):
        ok = [r for r in recs if "error" not in r]
        if not ok:
            return None
        n = len(ok)
        return {"n": n, "fail": len(recs) - n, "jpy": sum(r["jpy"] for r in ok) / n,
                "think": sum(r["think_tok"] for r in ok) / n, "out": sum(r["out_tok"] for r in ok) / n,
                "sec": sum(r["sec"] for r in ok) / n}

    cond_ids = list(CONDITIONS)
    rows = []
    for cid in cond_ids:
        recs = [r for r in records if r["cond"] == cid]
        a = agg(recs)
        if a:
            rows.append(f'<tr><th>{esc(CONDITIONS[cid]["label"])}</th><td>{a["jpy"]:.3f}円</td><td>{a["think"]:.0f}</td><td>{a["out"]:.0f}</td><td>{a["sec"]:.1f}秒</td><td>{a["fail"]}</td></tr>')
    summary = ('<table><tr><th>条件</th><th>1回あたり平均コスト</th><th>思考トークン</th><th>出力トークン</th><th>所要時間</th><th>失敗</th></tr>'
               + "".join(rows) + "</table>")

    body = []
    for case in CASES:
        # スコアのばらつき表（同条件の繰り返し間）
        cols = []
        for cid in cond_ids:
            recs = sorted(by.get((case["id"], cid), []), key=lambda r: r["run"])
            cells = "".join(
                f'<div class="run"><div class="mut">試行{r["run"] + 1} / {r.get("sec", 0)}秒 / 思考{r.get("think_tok", 0)}tok / {r.get("jpy", 0):.3f}円</div>{render_data(case, r)}</div>'
                for r in recs)
            cols.append(f'<div class="col"><h4>{esc(CONDITIONS[cid]["label"])}</h4>{cells}</div>')
        body.append(f'<section><h3>{esc(case["title"])}</h3><p class="mut">{esc(case["note"])}</p>'
                    f'<p class="inp">入力: {esc(case.get("text", case.get("input", ""))[:120])}…</p><div class="grid">{"".join(cols)}</div></section>')

    doc = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>thinking比較</title><style>
:root{{--bg:#fff;--fg:#222;--mut:#777;--line:#ddd;--ok:#157f3b;--ng:#c0392b;--card:#f7f7f9}}
@media(prefers-color-scheme:dark){{:root{{--bg:#16181d;--fg:#e8e8ea;--mut:#999;--line:#333;--card:#1e2128;--ok:#4cc38a;--ng:#ff7b6b}}}}
body{{background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,"Hiragino Sans",sans-serif;margin:0;padding:16px;max-width:1500px;margin:auto}}
table{{border-collapse:collapse;margin:8px 0 24px}}th,td{{border:1px solid var(--line);padding:6px 10px;text-align:left}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}}
.col{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;min-width:0}}
.run{{border-top:1px dashed var(--line);padding:8px 0}}.mut{{color:var(--mut);font-size:12px;margin:2px 0}}
.scores span{{display:inline-block;margin-right:8px}}.ok{{color:var(--ok)}}.ng,.err{{color:var(--ng)}}
pre{{white-space:pre-wrap;word-break:break-all;font-size:12px}}.cm{{margin:4px 0;font-size:13px}}.inp{{font-size:12px;color:var(--mut)}}
h3{{margin-top:32px}}h4{{margin:0 0 4px}}
</style></head><body><h1>thinking設定・モデル比較{" (DRY RUN: ダミーデータ)" if dry else ""}</h1>
<p class="mut">単価は概算({JPY_PER_USD}円/USD)。思考トークンは出力単価で課金。</p>{summary}{"".join(body)}</body></html>"""
    path.write_text(doc, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repeat", type=int, default=2)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not args.dry_run and os.environ["GEMINI_API_KEY"] == "dummy":
        sys.exit("GEMINI_API_KEY が未設定です（環境変数か .env）。")

    jobs = [(c, cid, i) for c in CASES for cid in CONDITIONS for i in range(args.repeat)]
    print(f"{len(jobs)}回のリクエストを実行します{' (dry-run)' if args.dry_run else ''}")
    if args.dry_run:
        records = [dry_record(*j) for j in jobs]
    else:
        client = app.client
        with ThreadPoolExecutor(max_workers=4) as ex:
            records = list(ex.map(lambda j: run_one(client, *j), jobs))
    out = ROOT / "tools" / "out"
    out.mkdir(exist_ok=True)
    (out / "compare_thinking.json").write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
    write_report(records, out / "compare_thinking.html", args.dry_run)
    print("完了:", out / "compare_thinking.html")


if __name__ == "__main__":
    main()
