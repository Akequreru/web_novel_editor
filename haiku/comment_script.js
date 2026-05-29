// 🖼️ 画像拡大・モーダル制御ロジック
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

// 解析結果のタイムライン描画
function renderComments(comments) {
    const resultDiv = document.getElementById('comment-result');
    const timelineRoot = document.getElementById('comment-timeline-root');
    const countSpan = document.getElementById('comment-count');

    timelineRoot.innerHTML = '';
    countSpan.innerText = comments.length;

    comments.forEach(c => {
        const card = document.createElement('div');
        card.className = 'comment-card';
        card.innerHTML = `
            <div class="comment-avatar">${c.avatar}</div>
            <div class="comment-main">
                <div class="comment-header">
                    <span class="comment-user-name">${c.name}</span>
                    <span class="comment-meta">${c.user_type}</span>
                </div>
                <p class="comment-text">${c.comment}</p>
            </div>
        `;
        timelineRoot.appendChild(card);
    });

    resultDiv.classList.remove('hidden');
}

// 投稿ボタンのイベント
document.getElementById('post-btn').addEventListener('click', async () => {
    const text = document.getElementById('novel-text').value;
    const fileInput = document.getElementById('novel-file');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('comment-result');

    if (!text && (!fileInput.files || fileInput.files.length === 0)) { 
        alert("作品を入力するか、テキストファイルをアップロードしてください"); 
        return; 
    }

    const exampleSection = document.getElementById('example-use-section');
    if (exampleSection) { exampleSection.classList.add('hidden'); }

    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    const selectedMode = document.querySelector('input[name="analyze-mode"]:checked').value;
    let commentCount = 20;

    if (selectedMode === "single") {
        // 一句モードなら 4〜6人
        commentCount = Math.floor(Math.random() * (6 - 4 + 1)) + 4;
    } else {
        // 句集モードなら 20〜30人
        commentCount = Math.floor(Math.random() * (30 - 20 + 1)) + 20;
    }

    const formData = new FormData();
    if (fileInput.files && fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    } else {
        formData.append('text', text);
    }
    formData.append('mode', selectedMode);
    formData.append('count', commentCount);

    try {
        const response = await fetch("/api/comment/haiku", { method: "POST", body: formData });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        renderComments(data.comments);
    } catch (err) {
        alert("エラーが発生しました: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
});

// ファイル選択時の案内
document.getElementById('novel-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('novel-text').value = `【ファイル読み込み完了】\nファイル名: ${file.name}\n「投稿する」ボタンを押すと感想が生成されます。`;
    }
});

// 🖼️ 画像JPGダウンロード
document.getElementById('save-image-btn').addEventListener('click', () => {
    const target = document.getElementById('comment-result'); 
    if (!target) return;

    html2canvas(target, {
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 1.5
    }).then(canvas => {
        const imageData = canvas.toDataURL('image/jpeg', 0.85);
        const downloadLink = document.createElement('a');
        downloadLink.href = imageData;
        downloadLink.download = `AI俳句コメント欄_${new Date().toLocaleDateString()}.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }).catch(error => {
        alert("画像の保存に失敗しました。");
    });
});