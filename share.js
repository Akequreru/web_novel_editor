// 結果の共有ボタン（X）
// - スマホ：端末の共有画面から、結果の画像（複数枚）を付けて共有する
// - PC：画像を保存して、Xの投稿画面（文章とURL入り）を開く（画像は、Xの仕様上、自動では添付できない）
//
// 画像の分け方は、次の3通り（どれか1つを指定する）。
//   data-share-parts : 要素ごとに、別々の画像にする
//                      '[{"selector":".a","name":"グラフ"}, ...]'
//   data-share-cuts  : 結果全体を、指定した要素の位置で、切り分ける（最初の画像は、先頭から）
//                      '[{"name":"グラフと評価"},{"selector":".b","name":"コメント"}, ...]'
//   data-share-split : 結果の中の項目（コメントなど）を、区切りの良い位置で、均等に分ける
//                      '{"count":3,"items":".comment-card","names":["前半","中盤","後半"]}'
//
// その他の指定：
//   data-share-target="result"        … 画像にする範囲（結果）の id
//   data-share-text="...{score}...\n" … 投稿の文章（{score} は点数や件数に、\n は改行に置き換える）
//   data-share-score-id="avg-score"   … {score} に入れる数字が入っている要素の id
//   data-share-file="AI小説下読みくん" … 保存する画像の名前（番号と名前が付く）
(function () {
    'use strict';

    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
        !!(navigator.userAgentData && navigator.userAgentData.mobile);

    var MAX_AREA = 14000000;   // 画像の面積の上限（スマホのブラウザが、大きすぎる画像を作れないため）
    var MAX_HEIGHT = 16000;

    // ---------- 共通の部品 ----------

    function readJSON(btn, name) {
        var raw = btn.getAttribute(name);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { console.error(name + ' が正しくありません:', e); return null; }
    }

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
    function addPadding(canvas, scale) {
        var pad = Math.round(24 * scale);
        var c = document.createElement('canvas');
        c.width = canvas.width + pad * 2;
        c.height = canvas.height + pad * 2;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, pad, pad);
        return c;
    }

    function toBlob(canvas) {
        return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.9); });
    }

    // 画像の大きさが、上限を超えないように、拡大率を決める（最大2倍）
    function chooseScale(width, height) {
        var s = 2;
        s = Math.min(s, Math.sqrt(MAX_AREA / Math.max(1, width * height)));
        s = Math.min(s, MAX_HEIGHT / Math.max(1, height));
        return Math.max(0.5, s);
    }

    function fileName(base, count, i, name) {
        var suffix = count > 1 ? '_' + (i + 1) + (name ? '_' + name : '') : '';
        return base + suffix + '.jpg';
    }

    function configuredCount(btn) {
        var parts = readJSON(btn, 'data-share-parts');
        if (parts && parts.length) return parts.length;
        var cuts = readJSON(btn, 'data-share-cuts');
        if (cuts && cuts.length) return cuts.length;
        var split = readJSON(btn, 'data-share-split');
        if (split && split.count) return split.count;
        return 1;
    }

    // ---------- 画像の作り方 1：要素ごと ----------

    function captureElement(el) {
        var scale = chooseScale(el.offsetWidth, el.offsetHeight);
        return html2canvas(el, {
            scale: scale,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollY: -window.scrollY,
            windowHeight: el.scrollHeight
        }).then(function (canvas) { return toBlob(addPadding(canvas, scale)); });
    }

    function buildByParts(btn, base, scope) {
        var list = readJSON(btn, 'data-share-parts') || [];
        var parts = [];
        list.forEach(function (p) {
            var el = scope.querySelector(p.selector);
            if (el && el.offsetWidth > 0 && el.offsetHeight > 0) { parts.push({ el: el, name: p.name }); }
        });
        if (!parts.length && scope !== document) { parts.push({ el: scope, name: '' }); }

        var files = [];
        return parts.reduce(function (chain, part, i) {
            return chain.then(function () {
                return captureElement(part.el).then(function (blob) {
                    files.push(new File([blob], fileName(base, parts.length, i, part.name), { type: 'image/jpeg' }));
                });
            });
        }, Promise.resolve()).then(function () { return files; });
    }

    // ---------- 画像の作り方 2・3：結果全体を1回撮って、切り分ける ----------

    // 切り分ける位置（結果の上端からの距離。CSSのpx）と、各画像の名前を決める
    function planSlices(btn, target, rect, endY) {
        var cuts = readJSON(btn, 'data-share-cuts');
        var split = readJSON(btn, 'data-share-split');
        var bounds = [0];
        var names = [];

        if (cuts) {
            cuts.forEach(function (c, i) {
                if (i === 0) { names.push(c.name || ''); return; }
                var el = c.selector ? target.querySelector(c.selector) : null;
                if (el && el.offsetHeight > 0) {
                    var y = el.getBoundingClientRect().top - rect.top;
                    if (y > bounds[bounds.length - 1] + 20 && y < endY - 20) {
                        bounds.push(y);
                        names.push(c.name || '');
                    }
                }
            });
        } else if (split) {
            var items = Array.prototype.slice.call(target.querySelectorAll(split.items || ''));
            var count = Math.max(1, Math.min(split.count || 1, items.length));
            var tops = items.map(function (el) { return el.getBoundingClientRect().top - rect.top; });
            names.push((split.names || [])[0] || '');
            for (var k = 1; k < count; k++) {
                var want = endY * k / count;
                var best = -1;
                tops.forEach(function (t, idx) {
                    if (t > bounds[bounds.length - 1] + 20 && t < endY - 20 &&
                        (best < 0 || Math.abs(t - want) < Math.abs(tops[best] - want))) { best = idx; }
                });
                if (best >= 0) {
                    bounds.push(tops[best] - 6);   // カードの間（隙間の中ほど）で切る
                    names.push((split.names || [])[k] || '');
                }
            }
        }
        bounds.push(endY);
        return { bounds: bounds, names: names };
    }

    function sliceCanvas(canvas, y0, y1, scale) {
        var top = Math.round(y0 * scale);
        var h = Math.max(1, Math.round((y1 - y0) * scale));
        var c = document.createElement('canvas');
        c.width = canvas.width;
        c.height = h;
        c.getContext('2d').drawImage(canvas, 0, top, canvas.width, h, 0, 0, canvas.width, h);
        return c;
    }

    function buildBySlices(btn, base, target) {
        var rect = target.getBoundingClientRect();
        var save = target.querySelector('.save-area');
        // 保存ボタンの領域より下は、画像に含めない
        var endY = save ? save.getBoundingClientRect().top - rect.top : rect.height;
        endY = Math.max(1, endY);
        var plan = planSlices(btn, target, rect, endY);   // 撮る前に、位置を測っておく
        var scale = chooseScale(rect.width, endY);

        return html2canvas(target, {
            scale: scale,
            useCORS: true,
            backgroundColor: '#ffffff',
            scrollY: -window.scrollY,
            windowHeight: target.scrollHeight,
            ignoreElements: function (el) { return el === save; }
        }).then(function (canvas) {
            var count = plan.bounds.length - 1;
            var files = [];
            return plan.bounds.slice(0, count).reduce(function (chain, y0, i) {
                return chain.then(function () {
                    var piece = addPadding(sliceCanvas(canvas, y0, plan.bounds[i + 1], scale), scale);
                    return toBlob(piece).then(function (blob) {
                        files.push(new File([blob], fileName(base, count, i, plan.names[i]), { type: 'image/jpeg' }));
                    });
                });
            }, Promise.resolve()).then(function () { return files; });
        });
    }

    function buildFiles(btn) {
        var base = btn.getAttribute('data-share-file') || 'result';
        var target = document.getElementById(btn.getAttribute('data-share-target') || '');
        if (target && (btn.hasAttribute('data-share-cuts') || btn.hasAttribute('data-share-split'))) {
            return buildBySlices(btn, base, target);
        }
        return buildByParts(btn, base, target || document);
    }

    // ---------- 共有の動き ----------

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

    function setup(btn) {
        // ボタンに、画像をどう扱うかを、書き添える
        //   PC：画像を保存する／スマホ：画像を付けて、共有画面を開く
        var count = configuredCount(btn);
        var what = count > 1 ? '画像' + count + '枚' : '画像';
        var base = btn.textContent.trim();
        btn.textContent = isMobile ? base + '（' + what + '付き）' : base + '（' + what + 'をダウンロード）';
        var label = btn.textContent;

        btn.addEventListener('click', function () {
            var target = document.getElementById(btn.getAttribute('data-share-target') || '');

            var scoreEl = document.getElementById(btn.getAttribute('data-share-score-id') || '');
            var score = scoreEl ? scoreEl.textContent.trim() : '';
            // 文面の中の「\n」（バックスラッシュとn）は、改行に置き換える（HTMLの属性の中では、改行を書きにくいため）
            var text = (btn.getAttribute('data-share-text') || '').replace('{score}', score).replace(/\\n/g, '\n');
            var url = location.origin + location.pathname;
            // URLとハッシュタグも、文面の中に含めて渡す
            // （Xの投稿画面の url / hashtags の指定だと、文面の後ろに空白でつながり、改行できないため）
            var fullText = text + '\n' + url + '\n#AI文芸チェッカー';

            var native = canShareFiles(configuredCount(btn));
            // ポップアップがブロックされないよう、PCでは、クリックの直後に、先にウィンドウを開いておく
            var popup = native ? null : window.open('about:blank', '_blank');

            btn.disabled = true;
            btn.textContent = '画像を準備中…';

            buildFiles(btn).then(function (files) {
                if (!files.length) { throw new Error('画像にする範囲が見つかりません'); }

                if (native && canShareFiles(files.length)) {
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
                    showNote(target || btn.closest('.save-area') || btn,
                        '画像を' + files.length + '枚保存しました。Xの投稿画面で、保存した画像を添付してください（最大4枚まで）。');
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
