// 結果を表示するための共通関数
let myChart = null; // グラフの重複描画を防ぐための変数

document.getElementById('policy-btn').addEventListener('click', () => {
    document.getElementById('policy-modal').classList.remove('hidden');
});
document.getElementById('close-policy').addEventListener('click', () => {
    document.getElementById('policy-modal').classList.add('hidden');
});

// 全ての .zoomable クラスを持つ画像に対して処理
// script.js の該当箇所を書き換え
// --- 画像モーダル制御（エラー防止・修正版） ---
// DOMが完全に読み込まれてから実行する
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('image-modal');
    const fullImg = document.getElementById('full-img');
    const closeBtn = document.querySelector('.close-modal');
    const modalOverlay = document.querySelector('.modal-overlay');

    // モーダル要素が見つからない場合は処理を中断（エラーを防ぐ）
    if (!modal || !fullImg) {
        console.warn("警告: 'image-modal' または 'full-img' がHTMLに見つかりません。");
        return;
    }

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    // 拡大表示
    document.querySelectorAll('.zoomable').forEach(img => {
        img.addEventListener('click', function () {
            modal.classList.remove('hidden');
            fullImg.src = this.src;
        });
    });

    // 閉じる：×ボタン
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // 閉じる：背景
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    // 閉じる：Escキー
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeModal();
    });
});
// saveAsPDF の中身をこれに入れ替えてみてください
async function saveAsImage() {
    // ライブラリが存在するかチェック
    if (typeof html2canvas === 'undefined') {
        alert("ライブラリの読み込み待ちです。数秒後に再度お試しください。");
        return;
    }

    const element = document.getElementById('result');
    const btn = document.getElementById('save-image-btn');

    btn.disabled = true;
    btn.innerText = "📸 画像作成中...";

    try {
        // html2canvasを実行
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            // 💡 画面のスクロール位置に関わらず、要素のトップから撮影する設定
            scrollY: -window.scrollY,
            windowHeight: element.scrollHeight
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `novel_score_${new Date().getTime()}.jpg`;
        link.click();

        console.log("JPG保存完了！");
    } catch (error) {
        console.error("画像保存エラー:", error);
        alert("保存に失敗しました。");
    } finally {
        btn.disabled = false;
        btn.innerText = "🖼️ 画像(JPG)をダウンロード";
    }
}
function renderResult(data) {
    const resultDiv = document.getElementById('result');

    // 0. 平均スコアの数字と星を更新
    const avgScore = data.average_score;
    document.getElementById('avg-score').innerText = avgScore;

    const mainStar = document.getElementById('main-star-rating');
    const mainPercent = (avgScore / 5) * 100;
    mainStar.style.setProperty('--rating-width', `${mainPercent}%`);

    document.getElementById('overall-summary').innerText = data.overall_summary;

    // --- 1. レーダーチャートの描画 ---
    const ctx = document.getElementById('scoreChart').getContext('2d');

    // すでにグラフがある場合は一度壊す（再描画のため）
    if (myChart) { myChart.destroy(); }

    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['構成', 'キャラ', '文章', '独創性', 'ロジック'],
            datasets: [{
                data: [
                    data.analysis_scores.structure,
                    data.analysis_scores.character,
                    data.analysis_scores.writing,
                    data.analysis_scores.originality,
                    data.analysis_scores.logic
                ],
                fill: true,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgb(52, 152, 219)',
                pointBackgroundColor: 'rgb(52, 152, 219)',
                borderWidth: 3
            }]
        },
        options: {

            scales: {
                r: {
                    ticks: {
                        display: false,
                        stepSize: 1
                    },
                    pointLabels: {
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#2c3e50'
                    },
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 10
                }
            },

            plugins: {
                // 上部のラベル（作品スコア）も不要なら非表示にできます
                legend: {
                    display: false
                }
            }
        }
    });



    // --- 2. 良い点・悪い点リストの生成 ---
    const goodList = document.getElementById('good-list');
    const badList = document.getElementById('bad-list');
    goodList.innerHTML = '';
    badList.innerHTML = '';

    data.editor.good.filter(item => item !== "").forEach(item => {
        const li = document.createElement('li');
        li.innerText = item;
        goodList.appendChild(li);
    });

    data.editor.bad.filter(item => item !== "").forEach(item => {
        const li = document.createElement('li');
        li.innerText = item;
        badList.appendChild(li);
    });

    // --- 3. 読者カードの生成（以前と同じ） ---
    const cardsContainer = document.getElementById('reader-cards');
    cardsContainer.innerHTML = '';

    data.readers.forEach(r => {
        let icon = "👤"; // デフォルト
        if (r.name === "カイト") icon = "🎧"; // 学生・スピード感
        if (r.name === "ミユ") icon = "✨"; // 学生・センス
        if (r.name === "サトウ") icon = "👤"; // 社会人・ロジック
        if (r.name === "ハルカ") icon = "📚"; // 社会人・深み


        const card = document.createElement('div');
        card.className = 'card';

        const ratingPercent = (r.score / 5) * 100;

        card.innerHTML = `
            <div class="reader-icon">${icon}</div>
            
            <div class="reader-content">
                <div class="reader-header">
                    <span class="reader-name">${r.name}</span>
                    <span class="reader-meta">${r.gender} / ${r.age}</span>
                </div>
                
                <div class="reader-rating-row">
                    <div class="star-rating" style="--rating-width: ${ratingPercent}%">☆☆☆☆☆</div>
                    <span class="reader-score">${r.score}</span>
                </div>
                
                <p class="reader-comment">${r.comment}</p>
            </div>
        `;
        cardsContainer.innerHTML += card.outerHTML;
    });

    resultDiv.classList.remove('hidden');
}


document.getElementById('save-image-btn').addEventListener('click', () => {
    saveAsImage();
});
document.getElementById('novel-file').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        document.getElementById('novel-text').placeholder = "ファイルが選択されているため、こちらは無視されます";
        document.getElementById('novel-text').disabled = true; // 入力できなくする
    } else {
        document.getElementById('novel-text').disabled = false;
    }
});
document.getElementById('analyze-btn').addEventListener('click', async () => {
    const DEBUG_MODE = false; // テスト時はtrue、本番はfalse
    const text = document.getElementById('novel-text').value;
    const file = document.getElementById('novel-file').files[0];
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const exampleSection = document.getElementById('example-use-section');
    if (!text && !file) {
        alert("小説を入力するかファイルを選択してください");
        return;
    }// analyze-btn のクリックイベント内
    if (text && file) {
        alert("テキスト入力とファイル選択の両方が行われています。ファイルの内容を優先して解析します。");
    }

    // 画面表示をリセット
    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    if (exampleSection) {
        exampleSection.classList.add('hidden');
    }
    if (DEBUG_MODE) {
        const dummyData =
        {
            "analysis_scores": {
                "structure": 6,
                "character": 4,
                "writing": 5,
                "originality": 8,
                "logic": 2
            },
            "editor": {
                "good": [
                    "「猫が動くものを叩く」という習性を人類が「オペレーション・ネコダマシ」で逆手に取るアイデアは非常に独創的。",
                    "「ゴロゴロ音による地殻崩壊」という、猫の可愛さと破滅的被害のギャップが強いフックになっている。",
                    "太陽系消滅という破滅的な結末を、猫の「仕方ない」という主観で締める独特の脱力感がある。",
                    "「質量がないが実体はある」というSF的な不気味さが物語の不穏な空気を醸成している。",
                    "読者を突き放すような語り口が、逆にネット怪談的な奇妙な魅力を生んでいる。"
                ],
                "bad": [
                    "「なんと」「驚きました」などの説明的で単調な文体が物語の緊張感を削いでいる。",
                    "デシベルの理論的矛盾や、後半のガスの動きがご都合主義的でリアリティを損なっている。",
                    "猫の動機が「観察に来ただけ」という設定に対し、地球滅亡に至る因果関係の描写が唐突すぎる。",
                    "巨大黒猫教の登場と退場が早すぎて、物語の深みを掘り下げるチャンスを逃している。",
                    "最後の「ね？」というメタ的な語りかけが、物語の没入感を大きく阻害している。"
                ]
            },
            "readers": [
                {
                    "name": "カイト",
                    "age": "学生",
                    "gender": "男",
                    "score": 3.5,
                    "comment": "猫の可愛さと地球滅亡のギャップが面白すぎる。ネコダマシ作戦の名前もセンスあって好き。"
                },
                {
                    "name": "ミユ",
                    "age": "学生",
                    "gender": "女",
                    "score": 2.5,
                    "comment": "シュールで怖い！でも、結末があまりに投げやりで、ちょっと後味が悪いかな。"
                },
                {
                    "name": "サトウ",
                    "age": "社会人",
                    "gender": "男",
                    "score": 1.5,
                    "comment": "350デシベルの説明など物理的整合性が皆無で、SFとして読むにはあまりに粗雑。"
                },
                {
                    "name": "ハルカ",
                    "age": "社会人",
                    "gender": "女",
                    "score": 2.0,
                    "comment": "語彙が平坦で物語の重厚感がありません。アイデアは良いのに文章がそれを殺しています。"
                }
            ],
            "average_score": 2.4,
            "overall_summary": "本作は「巨大猫が地球を滅ぼす」というインパクト重視の奇想天外なプロットが最大の武器です。ターゲット層は、ネット上の怪談や「SCP財団」のような、少し不気味でシュールなSFショートショートを好む10代〜20代の読者です。今すぐ直すべき最優先事項は、物語の「語り口」の改善です。現状では状況説明が羅列されているだけで、キャラクターのドラマが不足しています。特に中盤の宗教団体の動きや、人類側の苦悩をもう少し掘り下げることで、破滅の際の悲劇性が増すはずです。また、物理的な矛盾をSF的ガジェットで補強するか、あるいは「理屈など通じない怪異」としてもっとホラーテイストを強めるかの二択で方向性を絞るべきです。本作には、短い時間で読者を唖然とさせる「ショート・ショートとしての爆発力」があります。このまま終わらせず、猫の視点や「猫の生態」をさらに掘り下げることで、カルト的な人気を博すエッジの効いた作品へと化ける可能性があります。"
        }
            ;

        setTimeout(() => {
            loading.classList.add('hidden');
            renderResult(dummyData); // 共通関数を呼び出す
        }, 1000);
        return;
    }

    // --- 本番モード（API通信） ---
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (text) formData.append('text', text);

    try {
        const response = await fetch("/api/shitayomi", { // 相対パスにする
            method: "POST",
            body: formData
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        renderResult(data); // 共通関数を呼び出す
    } catch (err) {
        alert("エラーが発生しました: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
});