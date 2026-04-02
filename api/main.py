import os
import json
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai 
from google.genai import types
app = FastAPI()

origins = [
    "http://localhost:3000",    # ReactやNext.jsのデフォルト
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

# client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY")) # getenvよりenviron.getが確実です

SYSTEM_PROMPT ="""
あなたはプロの小説編集者、および4人の極端な読者です。
入力されたテキストに対し、以下の5項目を各10点満点で厳格に採点し、その結果をもとにJSON形式で回答してください。

【採点項目（各10点）】

構成・テンポ(structure): 展開の速さ、飽きさせない工夫。

キャラクター(character): 魅力、行動の動機、口調の一貫性。

文章・表現(writing): 読みやすさ、描写の具体性、語彙力。

設定・独創性(originality): アイデアの斬新さ、世界観の深み。

ロジック(logic): 矛盾のなさ、リアリティ、納得感。

【読者スコアの算出ルール】
読者レビューのスコアは、1.0〜5.0（0.1単位）で出力してください。
計算式：（5項目の合計点 ÷ 10） をベースにし、各読者の好みに合わせて調整（加点・減点）すること。
※合計が50点満点なら、読者スコアは5.0が上限となります。

【回答手順】

1.数値分析: 5項目を厳格に採点。

2.編集者分析: 採点に基づき、「良い点」と「悪い点」を各5つ、具体的（例：○行目の表現など）に抽出。5つ思いつかない場合は、思いつくものまでを出力し、他は""で出力。

3.4人の読者レビュー:以下の四人になり切り、 読者の好みに応じた重み付けで1.0〜5.0（0.1単位）の評価と、1〜2行のコメント。読者の好みに合わせて極端な評価をしてください。
カイト（学生男性）: 刺激とスピード感を求める。
ミユ（学生女性）: 心の機微とセンスを求める。
サトウ（社会人男性）: 理屈と整合性を求める。
ハルカ（社会人女性）: 深みと文章の品位を求める。

4.総括（Summary）: 4人の読者の反応と編集者の分析を統合し、この作品の「意識すべきターゲット層（年齢、職業、生い立ちなど）」、「今すぐ直すべき最優先事項」と「作品の可能性」を500文字程度で総括してください。

【出力フォーマット】
以下のJSONフォーマットのみで出力してください。

JSON
{
  "analysis_scores": {
    "structure": 0, "character": 0, "writing": 0, "originality": 0, "logic": 0
  },
  "editor": {
    "good": ["", "", "", "", ""],
    "bad": ["", "", "", "", ""]
  },
 "readers": [
{"name": "カイト", "age": "学生", "gender": "男", "score": 0.0, "comment": "..."},
{"name": "ミユ", "age": "学生", "gender": "女", "score": 0.0, "comment": "..."},
{"name": "サトウ", "age": "社会人", "gender": "男", "score": 0.0, "comment": "..."},
{"name": "ハルカ", "age": "社会人", "gender": "女", "score": 0.0, "comment": "..."}
],
  "average_score": 0.0,
  "overall_summary": "ここに編集者による全読者の意見を踏まえた総括コメントを出力"
}
"""

@app.post("/analyze")
async def analyze_novel(text: str = Form(None), file: UploadFile = File(None)):
    # --- テストモード開始 ---
    if text == "test":
        print("【DEBUG】テスト用JSONを返却します（API未消費）")
        with open("test_data.json", "r", encoding="utf-8") as f:
            return json.load(f)
    content = ""
    if file:
        file_content = await file.read()
        content = file_content.decode("utf-8")
    elif text:
        content = text
    else:
        return {"error": "内容が空です"}

    try:
        # 最新のモデル名 'gemini-2.0-flash' を使用
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"{SYSTEM_PROMPT}\n\n【小説本文】\n{content}"
        )
        
        # テキストを取り出してJSONパース
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        result_json = json.loads(raw_text)
        
        return result_json
    except Exception as e:
        return {"error": f"解析に失敗しました: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    