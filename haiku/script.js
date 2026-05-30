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

    const avgScore = data.average_score;
    document.getElementById('avg-score').innerText = avgScore;
    const mainStar = document.getElementById('main-star-rating');
    mainStar.style.setProperty('--rating-width', `${(avgScore / 5) * 100}%`);

    document.getElementById('overall-summary').innerText = data.overall_summary;

    // --- 1. 俳句・川柳専用レーダーチャート ---
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (myChart) { myChart.destroy(); }

    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['言葉選び', '切れ字', 'リズム', '写生', '余白の美'],
            datasets: [{
                data: [
                    data.analysis_scores.vocabulary, // 💡 キー名を vocabulary に変更
                    data.analysis_scores.kireji,
                    data.analysis_scores.rhythm,
                    data.analysis_scores.shasei,
                    data.analysis_scores.yohaku
                ],
                fill: true,
                // 以下省略
                backgroundColor: 'rgba(241, 196, 15, 0.2)', // 俳句らしく風情のある山吹・ゴールド系に
                borderColor: 'rgb(230, 126, 34)',
                pointBackgroundColor: 'rgb(230, 126, 34)',
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

    // 4人のAI俳人レビュー生成
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
    const DEBUG_MODE = false; // 💡 実際のAPIでテストするためfalseにします
    const text = document.getElementById('novel-text').value;
    const fileInput = document.getElementById('novel-file');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const exampleSection = document.getElementById('example-use-section');

    if (!text && (!fileInput.files || fileInput.files.length === 0)) { 
        alert("俳句・川柳を入力するか、テキストファイルをアップロードしてください"); 
        return; 
    }

    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    if (exampleSection) exampleSection.classList.add('hidden');

    if (DEBUG_MODE) {
        // デバッグ用ダミー
        const dummyHaikuData = {
            "analysis_scores": { "vocabulary": 8, "kireji": 9, "rhythm": 7, "shasei": 8, "yohaku": 8 },
            "editor": {
                "good": ["古池と蛙の対比が完璧。", "静寂を破る水の音が鮮明に伝わる。"],
                "bad": ["特にありません。完成されています。"]
            },
            "readers": [
                {"name": "カイト", "age": "学生", "gender": "男", "score": 4.5, "comment": "水の音が聞こえる感じ、超リアル！"},
                {"name": "ミユ", "age": "学生", "gender": "女", "score": 4.0, "comment": "静かな空間が一瞬で目に浮かびました。"},
                {"name": "サトウ", "age": "社会人", "gender": "男", "score": 4.8, "comment": "『や』による切れが効いている。極めて知的。"},
                {"name": "ハルカ", "age": "社会人", "gender": "女", "score": 5.0, "comment": "侘び寂びの極致。これぞ日本の美学です。"}
            ],
            "average_score": 4.6,
            "overall_summary": "歴史に残る名句です。"
        };
        setTimeout(() => {
            loading.classList.add('hidden');
            renderResult(dummyHaikuData);
        }, 1000);
        return;
    }

    // --- 本番モード（API通信） ---
    const selectedMode = document.querySelector('input[name="analyze-mode"]:checked').value;
    const formData = new FormData();
    
    if (fileInput.files && fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    } else {
        formData.append('text', text);
    }
    formData.append('mode', selectedMode);

    try {
        // 💡 Live ServerからFastAPI（8000ポート）へ明示的に送信
        const response = await fetch("/api/shitayomi/haiku", { method: "POST", body: formData });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        renderResult(data);
    } catch (err) {
        alert("エラーが発生しました: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
});

// ファイルが選択されたらテキストエリアに案内を出す処理
document.getElementById('novel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('novel-text').value = `【ファイル読み込み完了】\nファイル名: ${file.name}\n「詠んでもらう」ボタンを押すと解析が始まります。`;
    }
});

// 🖼️ 結果画面をJPG画像としてダウンロードする機能
document.getElementById('save-image-btn').addEventListener('click', () => {
    const target = document.getElementById('result'); 
    if (!target) { alert("保存する結果が見つかりません。"); return; }

    html2canvas(target, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 2
    }).then(canvas => {
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        const downloadLink = document.createElement('a');
        downloadLink.href = imageData;
        downloadLink.download = `俳句解析結果_${new Date().toLocaleDateString()}.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }).catch(error => {
        console.error("画像保存エラー:", error);
        alert("画像の保存に失敗しました。");
    });
});