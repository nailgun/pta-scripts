// ==UserScript==
// @name         Sberbank Online Report to PTA
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Generates PTA file from Sberbank Online Report
// @author       nailgun
// @match        https://report-vypiska.sberbank.ru/*
// @updateURL    https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-report.js
// @downloadURL  https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-report.js
// @require      https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/lib.js?rev=6
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sberbank.ru
// @grant        GM_log
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* global PTA */

(async function() {
    'use strict';

    const ASSET_PREFIX = 'assets:sber';

    GM_registerMenuCommand('PTA', generateReport);

    function generateReport() {
        let acc = document.querySelector('.b-crd .crd_row').innerText;
        let balance = parseBalance();
        let trsList = parseTrsList();
        trsList.reverse();

        GM_log(balance);
        GM_log(trsList);
        let pta = [formatBalance(balance.begin, acc), generatePTA(trsList, acc), formatBalance(balance.end, acc)].join('\n');
        GM_log(pta);
        GM_setClipboard(pta);
        alert('PTA file copied to the clipboard');
    }

    function parseTrsList() {
        let trsList = document.querySelectorAll('.b-trs .trs_it');
        return [...trsList].map(trs => {
            let dateElm = trs.querySelector('.trs_date .idate');
            let sumElm = trs.querySelector('.isum');
            return {
                name: trs.querySelector('.trs_name').innerText.trim(),
                date: getDate(dateElm),
                time: getTime(dateElm),
                sum: getSum(sumElm),
                cat: trs.querySelector('.icat').innerText.trim().replace(/\s+/g, ' '),
                authCode: trs.querySelector('.trs-auth .trs_val').innerText.trim().replace(/\s+/g, ' '),
                postDate: getDate(trs.querySelector('.trs-post .trs_val .idate')),
                geo: trs.querySelector('.trs-geo .trs_val').innerText.trim().replace(/\s+/g, ' '),
                account: trs.querySelector('.trs-card .trs_val').innerText.trim().replace(/\s+/g, ' '),
                isIncome: !!trs.querySelector('.trs_st-refill'),
            };
        });
    }

    function getDate (dateElm) {
        let match = /^(\d\d).(\d\d).(\d\d\d\d)$/.exec(dateElm.dataset.date);
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    function getTime (dateElm) {
        return dateElm.childNodes[dateElm.childNodes.length-1].nodeValue.trim();
    }

    function getSum(sumElm) {
        // TODO: currency
        return PTA.parseSum(sumElm.innerText.trim());
    }

    function generatePTA(trsList, acc) {
        return trsList.map(trs => {
            let trsHeader = `${trs.date} ${trs.name}  ; ${trs.time} ${trs.geo}`;
            let assetPosting = `${ASSET_PREFIX}${acc}  ${trs.isIncome ? '' : '-'}${trs.sum}; auth=${trs.authCode} date:${trs.postDate}`;
            let secondPosting = trs.isIncome ? `income:${trs.cat}` : `expenses:${trs.cat}`;
            return `${trsHeader}\n    ${assetPosting}\n    ${secondPosting}\n`;
        }).join('\n');
    }

    function parseBalance() {
        let [beginElm, endElm] = document.querySelectorAll('.b-balance .state_row');

        function parseElm(elm) {
            return {
                date: getDate(elm.querySelector('.state_key .idate')),
                balance: getSum(elm.querySelector('.state_val .isum')),
            };
        }

        return {
            begin: parseElm(beginElm),
            end: parseElm(endElm),
        }
    }

    function formatBalance(b, acc) {
        return `${b.date} * sber reconcilation\n    ${ASSET_PREFIX}${acc}  =${b.balance}\n`;
    }
})();
