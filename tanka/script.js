let myChart = null;

// プライバシーポリシーの制御
document.getElementById('policy-btn').addEventListener('click', () => {
    document.getElementById('policy-modal').classList.remove('hidden');
});
document.getElementById('close-policy').addEventListener('click', () => {
    document.getElementById('policy-modal').classList.add('hidden');
});

// 画像拡大・モーダル制御
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('image-modal');
    const fullImg = document.getElementById('full-img');
    const closeBtn = document.querySelector('.close-modal');
    const modalOverlay = document.querySelector('.modal-overlay');

    if (!modal || !fullImg) return;

    const closeModal = () => { modal.classList.add('hidden'); };

    document.querySelectorAll('.zoomable').forEach(img => {
        img.addEventListener('click', function () {
            modal.classList.remove('hidden');
            fullImg.src = this.src;
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
});

// 解析結果の描画
function renderResult(data) {
    const resultDiv = document.getElementById('result');

    // スコアと星の更新
    const avgScore = data.average_score;
    document.getElementById('avg-score').innerText = avgScore;
    const mainStar = document.getElementById('main-star-rating');
    mainStar.style.setProperty('--rating-width', `${(avgScore / 5) * 100}%`);

    document.getElementById('overall-summary').innerText = data.overall_summary;

    // --- 1. 短歌・歌集専用レーダーチャート ---
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (myChart) { myChart.destroy(); }

    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['構成', '情景', '調べ', '表現技法', '余情・余韻'],
            datasets: [{
                data: [
                    data.analysis_scores.structure,
                    data.analysis_scores.imagery,
                    data.analysis_scores.rhythm,
                    data.analysis_scores.technique,
                    data.analysis_scores.resonance
                ],
                fill: true,
                backgroundColor: 'rgba(46, 204, 113, 0.2)', // 短歌らしく淡い緑系に
                borderColor: 'rgb(39, 174, 96)',
                pointBackgroundColor: 'rgb(39, 174, 96)',
                borderWidth: 3
            }]
        },
        options: {
            scales: {
                r: {
                    ticks: { display: false, stepSize: 1 },
                    pointLabels: { font: { size: 14, weight: 'bold' }, color: '#2c3e50' },
                    suggestedMin: 0,
                    suggestedMax: 10
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 良い点・悪い点リストの生成
    const goodList = document.getElementById('good-list');
    const badList = document.getElementById('bad-list');
    goodList.innerHTML = ''; badList.innerHTML = '';

    data.editor.good.filter(item => item !== "").forEach(item => {
        const li = document.createElement('li'); li.innerText = item; goodList.appendChild(li);
    });
    data.editor.bad.filter(item => item !== "").forEach(item => {
        const li = document.createElement('li'); li.innerText = item; badList.appendChild(li);
    });

    // 4人のAI歌人レビュー生成
    const cardsContainer = document.getElementById('reader-cards');
    cardsContainer.innerHTML = '';

    data.readers.forEach(r => {
        let icon = "👤";
        if (r.name === "カイト") icon = "🎧";
        if (r.name === "ミユ") icon = "✨";
        if (r.name === "サトウ") icon = "👤";
        if (r.name === "ハルカ") icon = "📚";

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="reader-icon">${icon}</div>
            <div class="reader-content">
                <div class="reader-header">
                    <span class="reader-name">${r.name}</span>
                    <span class="reader-meta">${r.gender} / ${r.age}</span>
                </div>
                <div class="reader-rating-row">
                    <div class="star-rating" style="--rating-width: ${(r.score / 5) * 100}%">☆☆☆☆☆</div>
                    <span class="reader-score">${r.score}</span>
                </div>
                <p class="reader-comment">${r.comment}</p>
            </div>
        `;
        cardsContainer.innerHTML += card.outerHTML;
    });

    resultDiv.classList.remove('hidden');
}

// 詠むボタンのクリックイベント
document.getElementById('analyze-btn').addEventListener('click', async () => {
    const DEBUG_MODE = false; // 💻 ローカルテスト時は一旦true。本番通信時はfalseに
    const text = document.getElementById('novel-text').value;
    const fileInput = document.getElementById('novel-file');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const exampleSection = document.getElementById('example-use-section');

    // テキストもファイルも両方空なら弾く
    if (!text && (!fileInput.files || fileInput.files.length === 0)) { 
        alert("短歌を入力するか、テキストファイルをアップロードしてください"); 
        return; 
    }

    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    if (exampleSection) exampleSection.classList.add('hidden');

    if (DEBUG_MODE) {
        // 💻 テスト用のダミーデータ
        const dummyTankaData = {
            "analysis_scores": {
                "structure": 8, "imagery": 7, "rhythm": 6, "technique": 8, "resonance": 9
            },
            "editor": {
                "good": [
                    "時間経過に伴う光の捉え方のグラデーションが非常に美しい。",
                    "静的な情景を動的に捉える独特の比喩表現に高い独創性を感じる。",
                    "一冊の小さな歌集を読んだような心地よい満足感がある。"
                ],
                "bad": [
                    "一部、文語と口語（現代語）の混在がトーンのブレを生んでいる。",
                    "全体的に字余りが多く、結句のリズムが少しもたついている印象。"
                ]
            },
            "readers": [
                {"name": "カイト", "age": "ライト層", "gender": "男", "score": 4.2, "comment": "日常を切り取る表現がめちゃくちゃエモい。一気に引き込まれました！"},
                {"name": "ミユ", "age": "情緒派", "gender": "女", "score": 4.5, "comment": "届かない恋心を託した一首が切なすぎて胸に刺さりました。"},
                {"name": "サトウ", "age": "技巧派", "gender": "男", "score": 3.8, "comment": "古典の『本歌取り』を試みている意図は評価するが、噛み合わせがやや強引か。"},
                {"name": "ハルカ", "age": "伝統派", "gender": "女", "score": 3.5, "comment": "抒情の深さは認めますが、定型の器をもう少し意識するとさらに化けます。"}
            ],
            "average_score": 4.0,
            "overall_summary": "本作は独自の視点とリズム感が光る仕上がりを見せています。現代的な感性の中に突如古い文法が混ざることで、読者の没入感が途切れる箇所を整理し、調べ（リズム）を整えれば、よりエッジの効いた歌集へと昇華されるはずです。"
        };

        setTimeout(() => {
            loading.classList.add('hidden');
            renderResult(dummyTankaData);
        }, 1000);
        return;
    }

    // --- 本番モード（API通信） ---
    const selectedMode = document.querySelector('input[name="analyze-mode"]:checked').value;
    const formData = new FormData();
    
    // テキストまたはファイルの紐付け
    if (fileInput.files && fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    } else {
        formData.append('text', text);
    }
    formData.append('mode', selectedMode);

    try {
        // 💡 ポート番号を「8000」に変更して、FastAPIを狙い撃ちします
        const response = await fetch("/api/shitayomi/tanka", { 
            method: "POST", 
            body: formData 
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        renderResult(data);
    } catch (err) {
        alert("エラーが発生しました: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
});

// 💡 追加：ファイルが選択されたらテキストエリアに案内を出す処理（外側に独立配置）
document.getElementById('novel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('novel-text').value = `【ファイル読み込み完了】\nファイル名: ${file.name}\n「詠んでもらう」ボタンを押すと解析が始まります。`;
    }
});

// 🖼️ 追加：結果画面をJPG画像としてダウンロードする機能
document.getElementById('save-image-btn').addEventListener('click', () => {
    // 画像化したい範囲（結果エリア全体）を指定
    const target = document.getElementById('result'); 

    if (!target) {
        alert("保存する結果が見つかりません。");
        return;
    }

    // html2canvasを実行
    html2canvas(target, {
        backgroundColor: '#ffffff', // 背景を白に固定（透過バグ防止）
        useCORS: true,              // 外部画像（Chart.js等）の読み込みを許可
        scale: 2                    // 画質を2倍にして綺麗にする
    }).then(canvas => {
        // 画像のデータURLを生成 (JPG)
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        
        // ダウンロード用の見えないリンクを作ってクリックさせる
        const downloadLink = document.createElement('a');
        downloadLink.href = imageData;
        downloadLink.download = `短歌解析結果_${new Date().toLocaleDateString()}.jpg`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }).catch(error => {
        console.error("画像保存エラー:", error);
        alert("画像の保存に失敗しました。ブラウザの設定を確認してください。");
    });
});