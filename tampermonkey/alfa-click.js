// ==UserScript==
// @name         Alfa Click to PTA
// @namespace    http://tampermonkey.net/
// @version      1
// @description  try to take over the world!
// @author       nailgun
// @match        https://web.alfabank.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=alfabank.ru
// @updateURL    https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/alfa-click.js
// @downloadURL  https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/alfa-click.js
// @require      https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/lib.js?rev=6
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        GM_setClipboard
// ==/UserScript==

/* global PTA */

(function() {
    'use strict';

    const ASSETS_PREFIX = 'assets:alfa';

    GM_registerMenuCommand('PTA', generateReport);

    function generateReport() {
        //let acc = ASSETS_PREFIX + document.querySelector('[data-test-id="account-number"]').innerText;
        let accName = document.querySelector('[data-test-id="account-name-initial-editable-value"]').innerText;
        let acc = ASSETS_PREFIX;
        if (['RUB', 'USD', 'EUR', 'GBP'].indexOf(accName) == -1) {
            acc = `${ASSETS_PREFIX}:${accName}`;
        }
        let balance = document.querySelector('[data-test-id$="balance-component-amount"]').innerText;
        let balanceCurrency = balance.slice(-1);
        balance = PTA.parseSum(balance.slice(0, -1).trim());

        let sections = document.querySelectorAll('[class^="operations-history-list_section_"]');
        let trsList = [...sections].map(section => {
            let date = PTA.formatDate(parseDate(section.querySelector('[class^="operation-header_component_"]').innerText));
            let trsElmList = section.querySelectorAll('[data-test-id="operation-cell"]');
            return [...trsElmList].map(op => {
                let trs = {
                    date,
                    name: op.querySelector('[data-test-id="cell-pure-text"], [data-test-id="transaction-title"]').innerText,
                    category: op.querySelector('[data-test-id="cell-pure-category-name"], [data-test-id="transaction-category"]').innerText,
                    sum: op.querySelector('[data-test-id="transaction-status"], [data-test-id="operation-amount"]').innerText,
                };

                let sign = trs.sum[0];
                trs.currency = trs.sum.slice(-1);
                trs.sum = PTA.parseSum(trs.sum.slice(1, -1).trim());

                if (sign === '+') {
                    trs.src = `income:${trs.category}`;
                    trs.dst = acc;
                } else {
                    trs.src = acc;
                    trs.dst = `expense:${trs.category}`;
                }

                return trs;
            });
        }).flat();

        trsList.reverse();

        let balanceTrs = {
            date: PTA.formatDate(new Date()),
            name: '* alfa reconcilation',
            currency: balanceCurrency,
            sum: balance,
            dst: acc,
            sign: '=',
        };
        trsList.push(balanceTrs);

        GM_log(trsList);

        let pta = trsList.map(trs => PTA.formatTrs(trs)).join('\n');
        pta = `; import from alfa click @ ${balanceTrs.date}\n\n` + pta;
        GM_log(pta);
        GM_setClipboard(pta);
        alert('PTA file copied to the clipboard');
    }

    function parseDate(text) {
        let [_, date] = text.split(',');
        return PTA.parseDate(date ? date.trim() : text);
    }
})();
