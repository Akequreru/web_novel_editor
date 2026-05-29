// 解析結果のタイムライン描画
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('image-modal');
    const fullImg = document.getElementById('full-img');
    const closeBtn = document.querySelector('.close-modal');
    const modalOverlay = document.querySelector('.modal-overlay');

    if (!modal || !fullImg) return;

    // モーダルを閉じる関数
    const closeModal = () => { modal.classList.add('hidden'); };

    // zoomableクラスを持つ画像がクリックされたら拡大表示
    document.querySelectorAll('.zoomable').forEach(img => {
        img.addEventListener('click', function () {
            modal.classList.remove('hidden');
            fullImg.src = this.src;
        });
    });

    // 閉じるボタンや背景クリック、Escキーでモーダルを閉じる
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => { if (e.key === "Escape") closeModal(); });
});

function renderComments(comments) {
    const resultDiv = document.getElementById('comment-result');
    const timelineRoot = document.getElementById('comment-timeline-root');
    const countSpan = document.getElementById('comment-count');

    // 一旦タイムラインを空にする
    timelineRoot.innerHTML = '';
    countSpan.innerText = comments.length;

    // 20人のコメントを1つずつカードにしてタイムラインに追加
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

// 投稿するボタンのクリックイベント
// 投稿するボタンのクリックイベント
document.getElementById('post-btn').addEventListener('click', async () => {
    // 💡 ボタンが押されたこの瞬間に、直接HTMLから要素を捕まえます（一番安全な方法）
    const text = document.getElementById('novel-text').value;
    const fileInput = document.getElementById('novel-file');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('comment-result');

    if (!text && (!fileInput.files || fileInput.files.length === 0)) { 
        alert("小説の本文またはあらすじを入力してください"); 
        return; 
    }

    // 💡 変数のバグを完全に回避するため、document.getElementByIdを直接使って画像を非表示にします
    const exampleSection = document.getElementById('example-use-section');
    if (exampleSection) {
        exampleSection.classList.add('hidden');
    }

    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    const DEBUG_MODE = false; // 💻 バックエンドと未接続の間はtrue

    if (DEBUG_MODE) {
        // 💻 マジのネット感想欄を再現した怒涛の20人ダミーデータ
        const dummyComments = [
            {"avatar": "😺", "name": "通りすがりの猫", "user_type": "一般読者", "comment": "一気に読んじゃいました！めちゃくちゃ面白かったです！次回も楽しみにしてます！"},
            {"avatar": "🧐", "name": "文芸スペース", "user_type": "批評家風", "comment": "全体的にプロットの構成が緻密ですね。特に中盤からのミスリードの誘い方と、そこからの伏線回収のロジックが非常に美しい。ただ、主人公の行動原理がやや舞台装置に引っ張られている印象を受けたので、そこを深掘りするとさらに化けるかと。"},
            {"avatar": "🔥", "name": "ななし＠感想厨", "user_type": "ネット民", "comment": "ちょｗｗｗｗそこで終わるのずるすぎませんかねぇ！？！？はよ続き読ませてクレメンス！！！"},
            {"avatar": "🥺", "name": "推しが尊いbot", "user_type": "信者系ファン", "comment": "待って無理しんどい最高……主人公くんとライバル関係のあそこ尊すぎて語彙力溶けました。出会ってくれてありがとう。"},
            {"avatar": "💤", "name": "夜更かしさん", "user_type": "ながら読者", "comment": "布団の中でなんとなく読み始めたら止まらなくなって今午前3時ですどうしてくれる。神作をありがとう。"},
            {"avatar": "🛠️", "name": "プロット崩壊警報", "user_type": "長文考察班", "comment": "第3話のアレって、もしかして第1話の描写が伏線になってます？\nもしそうだとすると、今後の展開として『あのキャラの裏切り』か『実はループしている説』のどちらかが濃厚になってくる気がするんですが、どうなんでしょう。めちゃくちゃワクワクしながら考察してます。"},
            {"avatar": "✨", "name": "浪漫飛行", "user_type": "ポエティック", "comment": "言葉の選び方がとても綺麗ですね。朝の光が差し込む部屋の描写、まるで情景が目の前に浮かぶようでした。"},
            {"avatar": "⚡", "name": "秒速スクロール", "user_type": "短文・ライト層", "comment": "テンポよくて最高！サクサク読める！"},
            {"avatar": "🤔", "name": "ひねくれ2号", "user_type": "辛口レビュアー", "comment": "設定は面白いんだけど、ちょっと説明セリフが多すぎるかなーって気がする。もっとキャラの行動とか情景で魅せてほしい。"},
            {"avatar": "🎉", "name": "祝・初投稿", "user_type": "応援隊", "comment": "この作者さんの作品初めて読みました！応援のブクマ入れときますねー！頑張ってください！"},
            {"avatar": "👽", "name": "SFおじさん", "user_type": "ガチ勢", "comment": "科学考証がしっかりしていて好感が持てる。ガジェットの仕様や世界観の裏付けに破綻がないのは読んでいて非常にストレスフリーだね。"},
            {"avatar": "📦", "name": "置き配の段ボール", "user_type": "無個性", "comment": "面白かったです"},
            {"avatar": "📦", "name": "名無しの読者", "user_type": "無個性", "comment": "面白かったです。"},
            {"avatar": "🌸", "name": "春のうらら", "user_type": "情緒重視", "comment": "切ない……登場人物たちの感情の揺れ動きが丁寧に描かれていて、思わず胸が締め付けられました。ハッピーエンドを信じてます！"},
            {"avatar": "🎮", "name": "ゲーマーA", "user_type": "ステータス重視", "comment": "主人公の能力の使い方が頭脳派でいいっすね。チート無双じゃなくて、手持ちのカードで戦う感じが最高に熱い。"},
            {"avatar": "🐾", "name": "らぶ＆ピース", "user_type": "平和主義", "comment": "悪い人が誰も出てこない優しい世界……読んでいてすごく癒やされました。こういうのずっと求めてました。"},
            {"avatar": "🖋️", "name": "ワナビの独り言", "user_type": "同業者風", "comment": "ひえー、文章力高すぎませんか。プロの方ですか？\nセリフの間合いとか、三人称の視点移動のスムーズさとか、めちゃくちゃ勉強になります。嫉妬するレベル。"},
            {"avatar": "🧊", "name": "ドライアイス", "user_type": "バッサリ派", "comment": "悪くはないけど、どこかで見たことある設定の詰め合わせ感は否めない。次からのオリジナリティに期待。"},
            {"avatar": "🔔", "name": "通知から飛んできた", "user_type": "ミーハー", "comment": "SNSで流れてきて気になって読んだけど正解だったわ。これアニメ化してほしいレベル。"},
            {"avatar": "💭", "name": "コトバノアヤ", "user_type": "細部注目型", "comment": "「沈黙が、重い毛布のように二人を包んだ」っていう表現、すごく独特で刺さりました。こういう細かなフレーズのセンスが凄く好きです。"},
            {"avatar": "🏹", "name": "クリティカルヒット", "user_type": "大満足", "comment": "神。ただの神。完結まで絶対ついていきます。毎日更新してくださいなんでもしますから！！！"}
        ];

        setTimeout(() => {
            loading.classList.add('hidden');
            renderComments(dummyComments);
        }, 1200);
        return;
    }

    // --- 本番モード（API通信用） ---
    // --- novel/comment_script.js の送信部分を修正 ---

    // 💡 20〜30の間でランダムな整数を生成します
    const randomCount = Math.floor(Math.random() * (30 - 20 + 1)) + 20;

    // --- 本番モード（API通信用） ---
    const formData = new FormData();
    if (fileInput.files && fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    } else {
        formData.append('text', text);
    }
    // 💡 生成したランダムな人数を、バックエンドに送るデータに追加します
    formData.append('count', randomCount);

    try {
        const response = await fetch("/api/comment/novel", { method: "POST", body: formData });
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
        document.getElementById('novel-text').value = `【ファイル読み込み完了】\nファイル名: ${file.name}\n「投稿する」ボタンを押すと読者の感想が生成されます。`;
    }
});

// 🖼️ 追加：20人のコメント欄全体を1枚の縦長JPG画像としてダウンロードする機能
document.getElementById('save-image-btn').addEventListener('click', () => {
    // 💡 HTML側で表示される結果コンテナ「comment-result」を丸ごとスキャン
    const target = document.getElementById('comment-result'); 

    if (!target) {
        alert("保存するコメント欄が見つかりません。");
        return;
    }

    // html2canvasを実行
    html2canvas(target, {
        backgroundColor: '#ffffff', // 背景を白で固定（透過して真っ黒になるのを防ぐ）
        useCORS: true,              // 画像処理のセキュリティ許可
        scale: 1.5                  // 20人分でかなり縦長になるため、容量オーバーを防ぐ絶妙な画質（1.5倍）
    }).then(canvas => {
        const imageData = canvas.toDataURL('image/jpeg', 0.85); // 圧縮率0.85のJPG
        
        const downloadLink = document.createElement('a');
        downloadLink.href = imageData;
        downloadLink.download = `AI読者コメント欄_${new Date().toLocaleDateString()}.jpg`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }).catch(error => {
        console.error("画像保存エラー:", error);
        alert("画像の保存に失敗しました。ブラウザのコンソールログを確認してください。");
    });
});