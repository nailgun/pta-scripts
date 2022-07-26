// ==UserScript==
// @name         Sberbank Online Account History to PTA
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Generates PTA file from Sberbank Online Account History
// @author       nailgun
// @match        https://web2.online.sberbank.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sberbank.ru
// @require      https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/lib.js
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    const ASSETS_PREFIX = 'assets:';
    const SUM_INDENT = 41;

    GM_registerMenuCommand('PTA', generateReport);

    function generateReport() {
        let opListElm = document.querySelector('[data-unit="OperationsList"]');
        if (!opListElm) {
            alert('OperationsList not found');
            return;
        }

        let sections = document.querySelectorAll('[data-unit="OperationsList"] > section[class^="region-operations-"]');
        let trsList = [...sections].map(section => {
            let date = parseDate(section.querySelector('[data-unit="Date"]').innerText);
            let trsElmList = section.querySelectorAll('li[class^="region-operations-"]');
            return [...trsElmList].map(op => {
                let parts = op.innerText.split('\n\n');
                let sumText = parts[parts.length-1];
                let sign = sumText[0];
                if (sign === '+' || sign === '-') {
                    sumText = sumText.slice(1);
                } else {
                    sign = '+';
                }

                let trs = {
                    date: date,
                    name: parts[parts.length-2],
                    currency: sumText[sumText.length-1],
                    sum: PTA.parseSum(sumText.slice(0, -1).trim()),
                    sign: sign,
                };

                if (parts.length == 4) {
                    let acc = ASSETS_PREFIX + parts.slice(0, 2).join(' ');
                    if (sign == '+') {
                        trs.src = 'income:interest';
                        trs.dst = acc;
                    } else {
                        trs.src = acc;
                        trs.dedstst = 'expense:other';
                    }
                } else if (parts.length == 6) {
                    let acc1 = ASSETS_PREFIX + parts.slice(0, 2).join(' ');
                    let acc2 = ASSETS_PREFIX + parts.slice(2, 4).join(' ');
                    if (sign == '+') {
                        trs.src = acc1;
                        trs.dst = acc2;
                    } else {
                        trs.src = acc2;
                        trs.dst = acc1;
                    }
                } else {
                    throw new Error('Unknown operation: ' + parts);
                }

                return trs;
            });
        }).flat();

        trsList.reverse();

        let balanceText = document.querySelector('[data-testid="AccountSum"]').innerText;
        let balanceAccount = trsList.find(trs => trs.sign === '+').dst;
        let balance = PTA.parseSum(balanceText.slice(0, -1).trim());
        trsList.push({
            date: parseDate('Сегодня'),
            name: '* sber reconcilation',
            currency: balanceText[balanceText.length-1],
            sum: '=' + PTA.parseSum(balanceText.slice(0, -1).trim()),
            dst: balanceAccount,
            sign: '=',
        });

        GM_log(trsList);

        let pta = trsList.map(trs => PTA.formatTrs(trs)).join('\n');
        GM_log(pta);
        GM_setClipboard(pta);
        alert('PTA file copied to the clipboard');
    }

    function parseDate(text) {
        let now = new Date();
        let day, month, year;

        if (text === 'Сегодня') {
            day = now.getDate().toString().padStart(2, '0');
            month = (now.getMonth() + 1).toString().padStart(2, '0');
            year = now.getFullYear();
        } else {
            const MONTH_MAP = {
                'января': 1,
                'февраля': 2,
                'марта': 3,
                'апреля': 4,
                'мая': 5,
                'июня': 6,
                'июля': 7,
                'августа': 8,
                'сентября': 9,
                'октября': 10,
                'ноября': 11,
                'декабря': 12,
            };

            let match = /^(\d+)\s+(.+),.*/.exec(text);
            if (!match) {
                return text;
            }

            day = match[1].padStart(2, '0');
            month = MONTH_MAP[match[2]].toString().padStart(2, '0');
            year = now.getFullYear();
        }

        return `${year}-${month}-${day}`;
    }
})();