// ==UserScript==
// @name         Sberbank Online Report to PTA
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Generates PTA file from Sberbank Online Report
// @author       nailgun
// @match        https://report-vypiska.sberbank.ru/*
// @updateURL    https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-report.js
// @downloadURL  https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-report.js
// @require      https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/lib.js?rev=7
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sberbank.ru
// @grant        GM_log
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* global PTA */

(async function() {
    'use strict';

    const ASSET_PREFIX = 'assets:sber:';

    GM_registerMenuCommand('PTA', generateReport);

    function generateReport() {
        //let acc = ASSET_PREFIX + getText(document.querySelector('.b-crd .crd_row'));
        let acc = 'assets:sber';
        let balance = parseBalance(acc);
        let trsList = parseTrsList(acc);
        trsList.reverse();
        trsList = trsList.filter(trs => trs.date >= balance.begin.date); // exclude РАНЕЕ СОВЕРШЕННЫЕ ОПЕРАЦИИ (Операции повлияли на счёт в запрошенном периоде)
        trsList.push(balance.end);
        GM_log(trsList);

        let pta = trsList.map(trs => PTA.formatTrs(trs)).join('\n');
        pta = `; import from sber report @ ${balance.end.date}\n\n` + pta;
        GM_log(pta);
        GM_setClipboard(pta);
        alert('PTA file copied to the clipboard');
    }

    function parseTrsList(acc) {
        let trsList = document.querySelectorAll('.b-trs .trs_it');
        return [...trsList].map(trs => {
            let dateElm = trs.querySelector('.trs_date .idate');
            let sumElm = trs.querySelector('.isum');

            //let acc = getText(trs.querySelector('.trs-card .trs_val'));
            let time = dateElm.childNodes[dateElm.childNodes.length-1].nodeValue.trim();
            let geo = getText(trs.querySelector('.trs-geo .trs_val'));
            //let authCode = getText(trs.querySelector('.trs-auth .trs_val'));
            let postDate = getDate(trs.querySelector('.trs-post .trs_val .idate'));

            let myTrs = {
                name: getText(trs.querySelector('.trs_name')),
                date: getDate(dateElm),
                sum: getSum(sumElm),
                category: getText(trs.querySelector('.icat')),
                comment: `${time} ${geo}`,
            };

            let isIncome = !!trs.querySelector('.trs_st-refill');
            let postComment = `date:${postDate}`;
            if (isIncome) {
                myTrs.dst = acc;
                myTrs.dstComment = postComment;
                myTrs.src = `income:${myTrs.category}`;
            } else {
                myTrs.dst = `expenses:${myTrs.category}`;
                myTrs.src = acc;
                myTrs.srcComment = postComment;
            }
            return myTrs;
        });
    }

    function getDate (dateElm) {
        let match = /^(\d\d).(\d\d).(\d\d\d\d)$/.exec(dateElm.dataset.date);
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    function getSum(sumElm) {
        // TODO: currency
        return PTA.parseSum(getText(sumElm));
    }

    function parseBalance(acc) {
        let [beginElm, endElm] = document.querySelectorAll('.b-balance .state_row');

        function parseElm(elm) {
            return {
                date: getDate(elm.querySelector('.state_key .idate')),
                name: '* sber reconcilation',
                sum: getSum(elm.querySelector('.state_val .isum')),
                dst: acc,
                sign: '=',
            };
        }

        return {
            begin: parseElm(beginElm),
            end: parseElm(endElm),
        }
    }

    function getText(elm) {
        return elm.textContent.trim().replace(/\s+/g, ' ');
    }
})();
