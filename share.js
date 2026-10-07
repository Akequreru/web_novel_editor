// 結果の共有ボタン（X）
// - スマホ：端末の共有画面から、結果の画像（複数枚）を付けて共有する
// - PC：画像を保存して、Xの投稿画面（文章とURL入り）を開く（画像は、Xの仕様上、自動では添付できない）
//
// 使い方：
// <button id="share-btn"
//         data-share-target="result"                      … 画像にする範囲（分割しない場合）
//         data-share-parts='[{"selector":".a","name":"グラフ"}, ...]'  … 画像を分割する場合（要素と名前）
//         data-share-text="...{score}...\n..."            … 投稿の文章（{score} は点数に、\n は改行に置き換える）
//         data-share-score-id="avg-score"                 … 点数が入っている要素のid
//         data-share-file="AI小説下読みくん">             … 保存する画像の名前（番号と名前が付く）
(function () {
    'use strict';

    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        !!(navigator.userAgentData && navigator.userAgentData.mobile);

    // 画像を、まとめて共有できる端末か（同期で判定する）
    function canShareFiles(count) {
        try {
            if (!isMobile || !navigator.share || !navigator.canShare) return false;
            var files = [];
            for (var i = 0; i < count; i++) { files.push(new File(['x'], 'x' + i + '.jpg', { type: 'image/jpeg' })); }
            return navigator.canShare({ files: files });
        } catch (e) {
            return false;
        }
    }

    // 注意書きは、画像保存の対象に写らないよう、結果の外（直後）に置く
    function showNote(anchor, message) {
        var note = document.querySelector('.share-note');
        if (!note) {
            note = document.createElement('p');
            note.className = 'share-note';
            note.style.cssText = 'text-align:center;font-size:0.9rem;color:#6b665c;margin:0 0 20px;';
            anchor.insertAdjacentElement('afterend', note);
        }
        note.textContent = message;
    }

    // 画像の周りに、白い余白を付ける
    function addPadding(canvas) {
        var pad = 48;
        var c = document.createElement('canvas');
        c.width = canvas.width + pad * 2;
        c.height = canvas.height + pad * 2;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, pad, pad);
        return c;
    }

    function captureElement(el) {
        return html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollY: -window.scrollY,
            windowHeight: el.scrollHeight
        }).then(addPadding).then(function (canvas) {
            return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.9); });
        });
    }

    // 設定から、画像にする範囲の一覧を作る
    function getParts(btn) {
        var raw = btn.getAttribute('data-share-parts');
        var base = btn.getAttribute('data-share-file') || 'result';
        var parts = [];
        // 範囲は、結果（data-share-target）の中だけから探す
        // （解析前のサンプルにも、同じ名前の要素があり、そちらを拾うと、大きさ0の画像になるため）
        var scope = document.getElementById(btn.getAttribute('data-share-target') || '') || document;
        if (raw) {
            try {
                JSON.parse(raw).forEach(function (p) {
                    var el = scope.querySelector(p.selector);
                    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) { parts.push({ el: el, name: p.name }); }
                });
            } catch (e) { console.error('data-share-parts が正しくありません:', e); }
        }
        if (!parts.length) {
            var t = document.getElementById(btn.getAttribute('data-share-target') || '');
            if (t) { parts.push({ el: t, name: '' }); }
        }
        return parts.map(function (p, i) {
            var suffix = parts.length > 1 ? '_' + (i + 1) + (p.name ? '_' + p.name : '') : '';
            return { el: p.el, fileName: base + suffix + '.jpg' };
        });
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function download(file) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    }

    // 設定されている画像の枚数（結果が表示される前でも、数えられるように、設定から数える）
    function configuredCount(btn) {
        try {
            var list = JSON.parse(btn.getAttribute('data-share-parts') || '[]');
            return list.length || 1;
        } catch (e) {
            return 1;
        }
    }

    function setup(btn) {
        // ボタンに、画像をどう扱うかを、書き添える
        //   PC：画像を保存する／スマホ：画像を付けて、共有画面を開く
        var count = configuredCount(btn);
        var what = count > 1 ? '画像' + count + '枚' : '画像';
        var base = btn.textContent.trim();
        btn.textContent = isMobile ? base + '（' + what + '付き）' : base + '（' + what + 'をダウンロード）';
        var label = btn.textContent;

        btn.addEventListener('click', function () {
            var parts = getParts(btn);
            if (!parts.length) return;

            var scoreEl = document.getElementById(btn.getAttribute('data-share-score-id') || '');
            var score = scoreEl ? scoreEl.textContent.trim() : '';
            // 文面の中の「\n」（バックスラッシュとn）は、改行に置き換える（HTMLの属性の中では、改行を書きにくいため）
            var text = (btn.getAttribute('data-share-text') || '').replace('{score}', score).replace(/\\n/g, '\n');
            var url = location.origin + location.pathname;
            // URLとハッシュタグも、文面の中に含めて渡す
            // （Xの投稿画面の url / hashtags の指定だと、文面の後ろに空白でつながり、改行できないため）
            var fullText = text + '\n' + url + '\n#AI文芸チェッカー';

            var native = canShareFiles(parts.length);
            // ポップアップがブロックされないよう、PCでは、クリックの直後に、先にウィンドウを開いておく
            var popup = native ? null : window.open('about:blank', '_blank');

            btn.disabled = true;
            btn.textContent = '画像を準備中…';

            // 1枚ずつ画像にする（同時に作ると、メモリを使いすぎるため）
            var files = [];
            parts.reduce(function (chain, part) {
                return chain.then(function () {
                    return captureElement(part.el).then(function (blob) {
                        files.push(new File([blob], part.fileName, { type: 'image/jpeg' }));
                    });
                });
            }, Promise.resolve()).then(function () {
                if (native) {
                    return navigator.share({ files: files, text: fullText }).catch(function (e) {
                        if (e && e.name === 'AbortError') return;   // 共有を、自分でやめた場合
                        throw e;
                    });
                }

                // PC：画像を保存して、Xの投稿画面を開く
                var intent = 'https://x.com/intent/post?text=' + encodeURIComponent(fullText);
                if (popup) { popup.location.href = intent; } else { window.open(intent, '_blank'); }

                // 続けて保存すると、ブラウザに止められることがあるので、少し間を空ける
                return files.reduce(function (chain, f) {
                    return chain.then(function () { download(f); return sleep(400); });
                }, Promise.resolve()).then(function () {
                    var anchor = document.getElementById(btn.getAttribute('data-share-target') || '') || btn.closest('.save-area') || btn;
                    showNote(anchor, '画像を' + files.length + '枚保存しました。Xの投稿画面で、保存した画像を添付してください（最大4枚まで）。');
                });
            }).catch(function (e) {
                console.error('共有の準備に失敗しました:', e);
                if (popup) { popup.close(); }
                alert('共有の準備に失敗しました。もう一度お試しください。');
            }).then(function () {
                btn.disabled = false;
                btn.textContent = label;
            });
        });
    }

    function init() {
        var btn = document.getElementById('share-btn');
        if (btn && typeof html2canvas !== 'undefined') { setup(btn); }
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
