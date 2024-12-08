// ==UserScript==
// @name         dlsite seiheki analyzer
// @namespace    http://tampermonkey.net/
// @version      2024-12-07
// @description  Know your self.
// @author       sushigadaisuki
// @match        https://play.dlsite.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @require      https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
// @grant        none
// ==/UserScript==

(async function () {
    let count_genre = (work_genres) => {
        let genre_counter = {};
        for (let key in work_genres) {
            for (let genre of work_genres[key]) {
                if (!genre_counter[genre]) {
                    genre_counter[genre] = 1;
                } else {
                    genre_counter[genre]++;
                }
            }
        }
        return genre_counter;
    }

    let filter_dict_by_keys = (dict, keys) => Object.fromEntries(
        Object.entries(dict).filter(([key]) => keys.includes(key))
    );

    let res = await fetch("https://raw.githubusercontent.com/sushigadaisuki/erodoujin_manga_database/refs/heads/master/dlsite_id_genre.json.gz");
    let arrbuf = await res.arrayBuffer();
    let uint8Array = new Uint8Array(arrbuf);
    let id_genre = JSON.parse(pako.inflate(uint8Array, { to: 'string' }));
    let purchases_list = [];
    for (let i = 1; ; i++) {
        let purchases_res = await fetch(`https://play.dlsite.com/api/nest/purchases?compatible=true&page=${i}`);
        let purchases = await purchases_res.json();
        if (purchases.works.length == 0) break;
        purchases_list.push(...purchases.works);
    }
    let worknos = purchases_list.map(e => e.workno);
    let genre_count_all_products = count_genre(id_genre); // calc rarelity
    let genre_count = count_genre(filter_dict_by_keys(id_genre, worknos));
    let entries = Object.entries(genre_count).map(e => {
        let all_count = genre_count_all_products[e[0]];
        return [...e, all_count, e[1] / all_count];
    });
    let pts_sum = entries.map(e => e[3]).reduce((e1, e2) => e1 + e2); // use for normalize
    entries = entries.map(e => [...e, e[3] / pts_sum]);
    entries.sort(([, , , val1], [, , , val2]) => val2 - val1);

    let out = entries.map(e => [e[0], e[4]]);
    let graph_dat = out.slice(0, 150);
    console.log(`https://quickchart.io/chart?width=300&height=3000&c={type:%27horizontalBar%27,data:{labels:[${graph_dat.map(e => encodeURI(`'${e[0]}'`)).join(",")}],datasets:[{data:[${graph_dat.map(e => e[1]).join(",")}]}]}}`);
    //window.open(`https://quickchart.io/chart?width=300&height=3000&c={type:%27horizontalBar%27,data:{labels:[${graph_dat.map(e=>encodeURI(`'${e[0]}'`)).join(",")}],datasets:[{data:[${graph_dat.map(e => e[1]).join(",")}]}]}}`, '_blank');
    let appendButton = document.querySelector("#App > div.loContainer > div > nav > li:nth-child(8)").cloneNode(true);
    appendButton.querySelector("div > a > span > span > svg").remove();
    appendButton.querySelector("div > a").href = `https://quickchart.io/chart?width=600&height=3000&c={type:%27horizontalBar%27,data:{labels:[${graph_dat.map(e => encodeURI(`'${e[0]}'`)).join(",")}],datasets:[{data:[${graph_dat.map(e => e[1]).join(",")}],}],},options:{legend:{display:false,position:'right',align:'start'}}}`;
    appendButton.querySelector("div > a").target = "_blank";
    appendButton.querySelector("div > a > span:nth-child(2) > p").innerText = "性癖分析";

    document.querySelector("#App > div.loContainer > div > nav").appendChild(appendButton)
    return;
})();