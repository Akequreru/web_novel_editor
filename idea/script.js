// AI構想相談くん：入力 → API → 結果表示
let myChart = null; // グラフの重複描画を防ぐための変数

const AXES = [
    { key: 'originality', label: '独創性' },
    { key: 'development', label: '展開' },
    { key: 'consistency', label: '一貫性' },
    { key: 'form', label: '形式' },
    { key: 'potential', label: '発展性' }
];

const READER_ICONS = { 'カイト': '🎧', 'ミユ': '✨', 'サトウ': '👤', 'ハルカ': '📚' };

async function saveAsImage() {
    if (typeof html2canvas === 'undefined') {
        alert("ライブラリの読み込み待ちです。数秒後に再度お試しください。");
        return;
    }

    const element = document.getElementById('result');
    const btn = document.getElementById('save-image-btn');

    btn.disabled = true;
    btn.innerText = "画像を作成中…";

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollY: -window.scrollY,
            windowHeight: element.scrollHeight
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/jpeg", 0.9);
        link.download = `idea_consult_${new Date().getTime()}.jpg`;
        link.click();
    } catch (error) {
        console.error("画像保存エラー:", error);
        alert("保存に失敗しました。");
    } finally {
        btn.disabled = false;
        btn.innerText = "画像(JPG)をダウンロード";
    }
}

function renderResult(data) {
    const resultDiv = document.getElementById('result');
    const axes = data.axes || {};

    // 見立て
    const overview = document.getElementById('overview');
    overview.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = '見立て：';
    overview.appendChild(strong);
    overview.appendChild(document.createTextNode(data.overview || ''));

    // レーダーチャート
    const values = AXES.map(a => (axes[a.key] && axes[a.key].stars) || 2);
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if (myChart) { myChart.destroy(); }
    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: AXES.map(a => a.label),
            datasets: [{
                data: values,
                fill: true,
                backgroundColor: 'rgba(232, 100, 60, 0.2)',
                borderColor: 'rgb(232, 100, 60)',
                pointBackgroundColor: 'rgb(232, 100, 60)',
                borderWidth: 3
            }]
        },
        options: {
            scales: {
                r: {
                    ticks: { display: false, stepSize: 1 },
                    pointLabels: { font: { family: "'Shippori Mincho', 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif", size: 16, weight: '600' }, color: '#26231f' },
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 5
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 字体の読み込みが間に合わなかった場合に備え、読み込み後にグラフを描き直す
    if (document.fonts && document.fonts.load) {
        document.fonts.load("600 16px 'Shippori Mincho'").then(function () { if (myChart) { myChart.update(); } });
    }

    // 観点ごとの評価
    const axisList = document.getElementById('axis-list');
    axisList.innerHTML = '';
    AXES.forEach(a => {
        const item = axes[a.key] || {};
        const stars = item.stars || 2;
        const div = document.createElement('div');
        div.className = 'axis-item';

        const head = document.createElement('div');
        head.className = 'axis-head';
        const name = document.createElement('span');
        name.className = 'axis-name';
        name.textContent = a.label;
        const star = document.createElement('div');
        star.className = 'star-rating';
        star.style.setProperty('--rating-width', `${(stars / 5) * 100}%`);
        star.textContent = '☆☆☆☆☆';
        head.appendChild(name);
        head.appendChild(star);

        const comment = document.createElement('p');
        comment.className = 'axis-comment';
        comment.textContent = item.comment || '';

        div.appendChild(head);
        div.appendChild(comment);
        axisList.appendChild(div);
    });

    // 読者の期待コメント
    const cards = document.getElementById('reader-cards');
    cards.innerHTML = '';
    (data.readers || []).forEach(r => {
        const card = document.createElement('div');
        card.className = 'card';

        const icon = document.createElement('div');
        icon.className = 'reader-icon';
        icon.textContent = READER_ICONS[r.name] || '👤';

        const content = document.createElement('div');
        content.className = 'reader-content';

        const header = document.createElement('div');
        header.className = 'reader-header';
        const rname = document.createElement('span');
        rname.className = 'reader-name';
        rname.textContent = r.name;
        const meta = document.createElement('span');
        meta.className = 'reader-meta';
        meta.textContent = `${r.gender} / ${r.age}`;
        header.appendChild(rname);
        header.appendChild(meta);

        const comment = document.createElement('p');
        comment.className = 'reader-comment';
        comment.textContent = r.comment;

        content.appendChild(header);
        content.appendChild(comment);
        card.appendChild(icon);
        card.appendChild(content);
        cards.appendChild(card);
    });

    // まとめ・次に考えること
    document.getElementById('overall-summary').textContent = data.summary || '';
    const steps = document.getElementById('next-steps');
    steps.innerHTML = '';
    (data.next_steps || []).filter(s => s).forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        steps.appendChild(li);
    });

    resultDiv.classList.remove('hidden');
}

document.getElementById('save-image-btn').addEventListener('click', saveAsImage);

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const text = document.getElementById('idea-text').value.trim();
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const exampleSection = document.getElementById('example-use-section');
    const btn = document.getElementById('analyze-btn');

    if (!text) {
        alert("構想やプロットを入力してください");
        return;
    }

    // 画面表示をリセット
    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    if (exampleSection) exampleSection.classList.add('hidden');
    btn.disabled = true;

    const formData = new FormData();
    formData.append('text', text);

    try {
        const response = await fetch("/api/idea", {
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
        btn.disabled = false;
    }
});
