// アフィリエイト（A8.net）と i-mobile を、ページを開くたびに、割合で選んで表示する。
//
// 広告を足す・割合を変える場合は、下の SETS だけを書き換える。
//   SETS.rect   … 300x250 の枠用（下読み・コメント欄・構想相談くんの「概要の下」）
//   SETS.banner … 横長バナーの枠用（トップの「概要の下」）
//   weight  … 選ばれる割合（合計に対する比率。合計が100でなくてもよい）
//   links   … A8の広告（複数あれば、同じ割合の中で、均等に選ぶ）
//   imobile … i-mobile を表示する（この項目は、リンクを持たない）
(function () {
    'use strict';

    function a8(a8mat, banner, pixelHost, width, height) {
        return {
            href: 'https://px.a8.net/svt/ejp?a8mat=' + a8mat,
            img: banner,
            pixel: 'https://' + pixelHost + '/0.gif?a8mat=' + a8mat,
            width: width,
            height: height
        };
    }

    var SETS = {
        // ---------- 300x250 ----------
        rect: [
            {   // 同人誌印刷のペンタロー
                name: '同人誌印刷のペンタロー', weight: 25,
                links: [
                    a8('4BEBP2+65H9TE+3XUO+BY641',
                        'https://www28.a8.net/svt/bgt?aid=261008822372&wid=001&eno=01&mid=s00000018384002007000&mc=1', 'www16.a8.net', 300, 250)
                ]
            },
            {   // デザインポケット（イメージナビ）：3種類を均等に
                name: 'デザインポケット', weight: 25,
                links: [
                    a8('4BEBP2+6JROC2+5XDY+62ENL',
                        'https://www25.a8.net/svt/bgt?aid=261008822396&wid=001&eno=01&mid=s00000027655001019000&mc=1', 'www15.a8.net', 300, 250),
                    a8('4BEBP2+6JROC2+5XDY+609HT',
                        'https://www21.a8.net/svt/bgt?aid=261008822396&wid=001&eno=01&mid=s00000027655001009000&mc=1', 'www11.a8.net', 300, 250),
                    a8('4BEBP2+6JROC2+5XDY+6D4GH',
                        'https://www24.a8.net/svt/bgt?aid=261008822396&wid=001&eno=01&mid=s00000027655001069000&mc=1', 'www12.a8.net', 300, 250)
                ]
            },
            {   // 復刻ドットコム
                name: '復刻ドットコム', weight: 25,
                links: [
                    a8('4BEBP2+77L0J6+37DC+609HT',
                        'https://www26.a8.net/svt/bgt?aid=261008822436&wid=001&eno=01&mid=s00000014952001009000&mc=1', 'www14.a8.net', 300, 250)
                ]
            },
            { name: 'i-mobile', weight: 25, imobile: true }
        ],

        // ---------- 横長バナー（468x60） ----------
        // デザインポケットは、横長のバナーがないため、含めていない
        banner: [
            {   // 同人誌印刷のペンタロー
                name: '同人誌印刷のペンタロー', weight: 25,
                links: [
                    a8('4BEBP2+65H9TE+3XUO+BXQOH',
                        'https://www23.a8.net/svt/bgt?aid=261008822372&wid=001&eno=01&mid=s00000018384002005000&mc=1', 'www12.a8.net', 468, 60)
                ]
            },
            {   // 復刻ドットコム
                name: '復刻ドットコム', weight: 25,
                links: [
                    a8('4BEBP2+77L0J6+37DC+60WN5',
                        'https://www29.a8.net/svt/bgt?aid=261008822436&wid=001&eno=01&mid=s00000014952001012000&mc=1', 'www15.a8.net', 468, 60)
                ]
            },
            { name: 'i-mobile', weight: 25, imobile: true }
        ]
    };

    // 1つ選ぶ。i-mobile のときは null を返す（呼び出し側が、i-mobile を表示する）。
    // set は 'rect'（既定）か 'banner'。rnd は、0以上1未満の乱数を返す関数（試験用に、差し替えられる）。
    function pick(set, rnd) {
        var items = SETS[set || 'rect'] || SETS.rect;
        rnd = rnd || Math.random;
        var total = 0;
        items.forEach(function (it) { total += it.weight; });
        var r = rnd() * total;
        var chosen = items[items.length - 1];
        for (var i = 0; i < items.length; i++) {
            if (r < items[i].weight) { chosen = items[i]; break; }
            r -= items[i].weight;
        }
        if (chosen.imobile) { return null; }
        var link = chosen.links[Math.min(chosen.links.length - 1, Math.floor(rnd() * chosen.links.length))];
        return { name: chosen.name, link: link };
    }

    // 枠の中に、「PR」の表示つきで、広告を描く
    function render(slot, choice) {
        var link = choice.link;

        var label = document.createElement('div');
        label.textContent = 'PR';
        label.style.cssText = 'font-size:11px;letter-spacing:0.15em;color:#999;margin:0 0 4px;';

        var a = document.createElement('a');
        a.href = link.href;
        a.rel = 'nofollow sponsored';
        var img = document.createElement('img');
        img.width = link.width;
        img.height = link.height;
        img.border = 0;
        img.alt = 'PR：' + choice.name;
        // 狭い画面（スマホなど）では、画面の幅に合わせて縮小する
        img.style.cssText = 'max-width:100%;height:auto;';
        img.src = link.img;
        a.appendChild(img);

        // 表示回数を数えるための、1×1の画像（A8のコードに含まれるもの）
        var pixel = document.createElement('img');
        pixel.width = 1;
        pixel.height = 1;
        pixel.border = 0;
        pixel.alt = '';
        pixel.src = link.pixel;

        slot.appendChild(label);
        slot.appendChild(a);
        slot.appendChild(pixel);
    }

    window.Slot4Affiliate = { pick: pick, render: render };
})();
