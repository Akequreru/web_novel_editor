# 次にやること

最終更新: 2026-10-25 / 作業ブランチ: `book-recs-novel`（main には未マージ）

## 現状

- **Gemini API**: `gemini-2.5-flash` が2026-10-16に停止予定だったため、全エンドポイントを `gemini-3.1-flash-lite`（思考 `low`）に変更済み。`main` にマージ・push 済み。
  - モデル名と思考設定は [main.py](main.py) の `MODEL_NAME` / `THINKING_CONFIG` に集約。
  - 比較ツール: `tools/compare_thinking.py`（実行には `GEMINI_API_KEY` が必要。結果は `tools/out/` に出力され、git 管理外）。
- **おすすめの本（楽天アフィリエイト、A8経由）**: 小説の結果にだけ実装済み（`book-recs-novel` ブランチ）。
  - 点数の低い2項目（同点は全部）に合わせて、各項目から1冊ずつ表示。
  - 性格類語辞典のポジティブ編・ネガティブ編は、セットで表示。
  - 保存ボタンの上に表示し、画像保存・共有画像には写さない（`data-html2canvas-ignore`）。
  - 本の定義は [books.js](books.js) の `BOOKS`。

## すぐやること

- [ ] 本番デプロイ後、各ツール（小説・短歌・俳句・詩・コメント欄・構想相談）を1回ずつ動かして、エラーが出ないことを確認する。
  - 特に `google-genai` のバージョンが古いと `thinking_level` でエラーになる。その場合は `requirements.txt` に下限を指定する。
  - 俳句・短歌は、音数（字余り・字足らず）の指摘が変になっていないかも見る。
- [ ] 保存した画像に、本が写っていないことと、下に余白が出ていないことを確認する（出る場合は [novel/script.js](novel/script.js) の `windowHeight` を調整）。
- [ ] 公開前に、[novel/shitayomi.html](novel/shitayomi.html) の `books.js?v=1` を `?v=2` に上げる（キャッシュ対策）。
- [ ] 問題なければ `book-recs-novel` を `main` にマージして push する。

## 次の候補（優先度順）

1. **本の表示を他のツールへ展開**: 俳句・短歌・詩。各項目ごとのおすすめの本のリンクが必要（A8 のタグから、リンクと画像を取り出して [books.js](books.js) に足す）。
   - `BOOKS` に `haiku` / `tanka` / `poetry` のキーを足し、各 `script.js` から `BookRecommend.render(...)` を呼ぶ。
   - 俳句の項目キー: vocabulary / kireji / rhythm / shasei / yohaku。短歌・詩のキーは各プロンプトの `analysis_scores` を確認。
2. **API の乱用対策**（コストを守る）
   - IP ごとのレート制限（例: 1日10回）。
   - CORS を `allow_origins=["*"]` から自サイトのみに限定。
   - 同じ入力の結果キャッシュ。
   - Google Cloud の予算アラートと、API キーの日次クォータ上限（コード外の設定）。
3. **リワード広告**: 無料枠（例: 1日3回）を超えたら、広告を見て続きを使える形。
   - Web 向けは Google Ad Manager（GPT）のリワード枠。審査あり。
   - 広告の迂回を防ぐため、視聴後に使い捨てトークンを発行し、API 側で検証する仕組みが必要。
   - 先に上の「API の乱用対策」を入れる。
4. **収益の計測**: 本・A8・i-mobile のクリック数を比べられるようにする（1週間では判断できないため）。

## 注意

- 入力上限は現状 5万文字（`MAX_CHARS`）。コストが気になる場合は下げる。
- 料金（円/回）は、`tools/compare_thinking.py` の概算。実際の請求は Google の最新の料金表で確認する。
- ローカルで動作確認するときの `DEBUG_MODE`（[novel/script.js](novel/script.js)）は、確認後に必ず `false` に戻す（一度、`true` のままコミットしてしまった）。
- A8 のタグを作り直して表示している。規約上問題ないか、A8 側で確認しておくと安心。
