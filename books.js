// 結果の下に、一番点数の低い項目に合わせて、楽天の本（A8.net経由のアフィリエイト）を表示する。
//
// 本を足す・入れ替える場合は、下の BOOKS だけを書き換える。
//   BOOKS.novel … 小説の項目ごと（キーは、解析結果の analysis_scores のキー）
//   label … 見出しに出す項目名
//   items … 表示する本（rk() で、A8のリンクを作る）
(function () {
    'use strict';

    var A8MAT = '4BEBOX+9N3QGI+2HOM+BWGDT';
    var RAFCID = 'wsc_i_is_a9f492a7-8ef9-40e2-ab89-4bc43a1ee283';
    var THUMB = 'https://thumbnail.image.rakuten.co.jp/@0_mall/';

    // 楽天ブックス（book）と楽天Kobo（kobo）で、リンクの途中の符号が異なる
    var SHOPS = {
        book: { shop: 'book', code: 'g00q0724.2bo11c45.g00q0724.2bo12179' },
        kobo: { shop: 'rakutenkobo-ebooks', code: 'g00reb44.2bo11755.g00reb44.2bo12ad3' }
    };

    // A8が発行したリンクと同じ形のURLを作る。itemId=商品ページの番号、mobileId=スマホ用ページの番号
    function rk(kind, itemId, mobileId, thumb, pixelHost, title, author) {
        var s = SHOPS[kind];
        var redirect = 'https%3A%2F%2Fhb.afl.rakuten.co.jp%2Fhgc%2F' + s.code +
            '%2Fa26100868163_4BEBOX_9N3QGI_2HOM_BWGDT%3Fpc%3Dhttps%253A%252F%252Fitem.rakuten.co.jp%252F' +
            s.shop + '%252F' + itemId + '%252F%26m%3Dhttp%253A%252F%252Fm.rakuten.co.jp%252F' +
            s.shop + '%252Fi%252F' + mobileId + '%252F%26rafcid%3D' + RAFCID;
        return {
            href: 'https://rpx.a8.net/svt/ejp?a8mat=' + A8MAT + '&rakuten=y&a8ejpredirect=' + redirect,
            img: THUMB + thumb + '?_ex=64x64',
            pixel: 'https://' + pixelHost + '.a8.net/0.gif?a8mat=' + A8MAT,
            title: title,
            author: author
        };
    }

    var BOOKS = {
        novel: {
            structure: {
                label: '構成',
                items: [
                    rk('book', '6810294', '14007088', 'book/cabinet/0564/9784845910564_1_8.jpg', 'www17',
                        'SAVE THE CATの法則 本当に売れる脚本術', 'ブレイク・スナイダー'),
                    rk('kobo', 'de0ec4e365db319db777d4e64ee36057', '17630053', 'rakutenkobo-ebooks/cabinet/6960/2000006656960.jpg', 'www17',
                        'ストラクチャーから書く小説再入門【電子書籍】', 'K.M.ワイランド')
                ]
            },
            character: {
                label: 'キャラクター',
                items: [
                    rk('kobo', '6abb9f980643342385688dd644d625e9', '19307291', 'rakutenkobo-ebooks/cabinet/2934/2000008672934.jpg', 'www13',
                        'キャラクターからつくる物語創作再入門【電子書籍】', 'K.M.ワイランド'),
                    rk('book', '14297902', '18072149', 'book/cabinet/6016/9784845916016_1_12.jpg', 'www17',
                        '性格類語辞典 ポジティブ編', 'アンジェラ・アッカーマン'),
                    rk('book', '14297903', '18072150', 'book/cabinet/6023/9784845916023_1_12.jpg', 'www13',
                        '性格類語辞典 ネガティブ編', 'アンジェラ・アッカーマン')
                ]
            },
            writing: {
                label: '文章',
                items: [
                    rk('book', '16264018', '19964561', 'book/cabinet/9222/9784845919222_1_13.jpg', 'www13',
                        '感情類語辞典［増補改訂版］', 'アンジェラ・アッカーマン'),
                    rk('book', '16800747', '20402676', 'book/cabinet/0334/9784845920334_1_15.jpg', 'www17',
                        '文体の舵をとれ ル＝グウィンの小説教室', 'アーシュラ・K・ル＝グウィン')
                ]
            },
            originality: {
                label: '独創性',
                items: [
                    rk('book', '12445704', '16579142', 'book/cabinet/3959/9784048913959.jpg', 'www13',
                        '物語の法則 強い物語とキャラを作れるハリウッド式創作術', 'クリストファー・ボグラー＆デイビッド・マッケナ'),
                    rk('book', '16715128', '20339685', 'book/cabinet/3651/9784756253651_1_3.jpg', 'www13',
                        '物語を作る人のための 世界観設定ノート', '榎本秋')
                ]
            },
            logic: {
                label: 'ロジック',
                items: [
                    rk('kobo', 'fea35a81727e3c84a1a9b55db7cc29d6', '18375334', 'rakutenkobo-ebooks/cabinet/9908/2000007509908.jpg', 'www13',
                        'ストーリーの解剖学【電子書籍】', 'ジョン・トゥルービー'),
                    rk('book', '13396967', '17613460', 'book/cabinet/4012/9784344424012_1_3.jpg', 'www13',
                        'ミステリーの書き方（幻冬舎文庫）', '日本推理作家協会')
                ]
            }
        }
    };

    // 一番点数の低い項目を返す（同点のときは、BOOKS に書いた順で先のもの）
    function weakest(kind, scores) {
        var table = BOOKS[kind] || {};
        var best = null;
        Object.keys(table).forEach(function (key) {
            var v = Number(scores && scores[key]);
            if (isNaN(v)) { return; }
            if (best === null || v < best.score) { best = { key: key, score: v }; }
        });
        return best ? best.key : null;
    }

    function el(tag, css, text) {
        var e = document.createElement(tag);
        if (css) { e.style.cssText = css; }
        if (text) { e.textContent = text; }
        return e;
    }

    // container に、おすすめの本を描く。scores は analysis_scores
    function render(container, kind, scores) {
        container.textContent = '';
        var key = weakest(kind, scores);
        if (!key) { return; }
        var group = BOOKS[kind][key];

        // 直後の広告と混ざらないよう、枠で囲み、下に広めの余白と区切り線を置く
        var wrap = el('div', 'max-width:520px;margin:0 auto;padding:16px;text-align:left;' +
            'border:1px solid rgba(128,128,128,0.35);border-radius:10px;background:rgba(128,128,128,0.06);');
        wrap.appendChild(el('div', 'font-size:11px;letter-spacing:0.15em;color:#999;margin:0 0 4px;', 'PR'));
        wrap.appendChild(el('h3', 'margin:0 0 4px;font-size:16px;', '「' + group.label + '」を学ぶならこれ！'));
        wrap.appendChild(el('p', 'margin:0 0 10px;font-size:12px;color:#777;',
            '今回いちばん点数が低かった項目に合わせた、おすすめの本です。'));

        group.items.forEach(function (b) {
            var a = el('a', 'display:flex;align-items:center;gap:12px;padding:10px;margin:0 0 8px;' +
                'border:1px solid rgba(128,128,128,0.35);border-radius:6px;background:rgba(255,255,255,0.5);' +
                'text-decoration:none;color:inherit;');
            a.href = b.href;
            a.target = '_blank';
            a.rel = 'nofollow sponsored noopener';

            var img = el('img', 'width:64px;height:auto;flex:none;');
            img.src = b.img;
            img.alt = '';
            img.loading = 'lazy';
            a.appendChild(img);

            var text = el('div', 'font-size:13px;line-height:1.5;');
            text.appendChild(el('div', 'font-weight:600;', b.title));
            text.appendChild(el('div', 'font-size:11px;color:#777;margin-top:2px;', b.author));
            a.appendChild(text);

            // 表示回数を数えるための、1×1の画像（A8のコードに含まれるもの）
            var pixel = el('img');
            pixel.width = 1;
            pixel.height = 1;
            pixel.alt = '';
            pixel.src = b.pixel;
            a.appendChild(pixel);

            wrap.appendChild(a);
        });
        container.appendChild(wrap);
        container.style.margin = '32px auto 0';
        container.style.paddingBottom = '40px';
        container.style.borderBottom = '1px solid rgba(128,128,128,0.25)';
        container.style.marginBottom = '40px';
        container.classList.remove('hidden');
    }

    function clear(container) {
        container.textContent = '';
        container.style.cssText = '';
    }

    window.BookRecommend = { render: render, clear: clear, weakest: weakest, BOOKS: BOOKS };
})();
