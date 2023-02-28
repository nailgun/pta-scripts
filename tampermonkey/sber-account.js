// ==UserScript==
// @name         Sberbank Online Account History to PTA
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Generates PTA file from Sberbank Online Account History
// @author       nailgun
// @match        https://web2.online.sberbank.ru/*
// @match        https://web2-new.online.sberbank.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sberbank.ru
// @updateURL    https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-account.js
// @downloadURL  https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-account.js
// @require      https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/lib.js?rev=7
// @grant        GM_registerMenuCommand
// @grant        GM_log
// @grant        GM_setClipboard
// ==/UserScript==

/* global PTA */

(function() {
    'use strict';

    const ASSETS_PREFIX = 'assets:';

    GM_registerMenuCommand('PTA', generateReport);

    function generateReport() {
        let opListElm = document.querySelector('[data-unit="OperationsList"]');
        if (!opListElm) {
            alert('OperationsList not found');
            return;
        }

        let sections = document.querySelectorAll('[data-unit="OperationsList"] > section');
        let trsList = [...sections].map(section => {
            let date = parseDate(section.querySelector('[data-unit="Date"]').innerText);
            let trsElmList = section.querySelectorAll('a[mode="full"]');
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

                if (parts.length == 3 && parts[2].startsWith('Заказ отчета')) {
                    return null;
                } else if (parts.length == 3 && parts[2] == 'Клиенту Сбербанка') {
                    trs.src = null;
                    trs.dst = 'expenses:' + parts[0];
                } else if (parts.length == 4) {
                    let acc = ASSETS_PREFIX + parts.slice(0, 2).join(' ');
                    if (parts[2] == 'Перевод клиенту Сбербанка') {
                        trs.src = null;
                        trs.dst = 'expenses:other';
                    } else if (sign == '+') {
                        trs.src = 'income:interest';
                        trs.dst = cleanAccountName(acc);
                    } else {
                        trs.src = cleanAccountName(acc);
                        trs.dst = 'expenses:other';
                    }
                } else if (parts.length == 5 && parts[3] == 'Заявка отклонена банком') {
                    return null;
                } else if (parts.length == 6) {
                    let acc1 = ASSETS_PREFIX + parts.slice(0, 2).join(' ');
                    let acc2 = ASSETS_PREFIX + parts.slice(2, 4).join(' ');
                    if (sign == '+') {
                        trs.src = cleanAccountName(acc1);
                        trs.dst = cleanAccountName(acc2);
                    } else {
                        trs.src = cleanAccountName(acc2);
                        trs.dst = cleanAccountName(acc1);
                    }
                } else {
                    throw new Error('Unknown operation: ' + parts);
                }

                return trs;
            }).filter(trs => !!trs);
        }).flat();

        console.log(trsList);

        trsList.reverse();

        let balanceText = document.querySelector('[data-testid="AccountSum"]').innerText;
        let balanceAccount = trsList.find(trs => trs.sign === '+').dst;
        let balance = PTA.parseSum(balanceText.slice(0, -1).trim());
        let today = parseDate('Сегодня');
        trsList.push({
            date: today,
            name: '* sber reconcilation',
            currency: balanceText[balanceText.length-1],
            sum: PTA.parseSum(balanceText.slice(0, -1).trim()),
            dst: balanceAccount,
            sign: '=',
        });
        trsList.forEach(trs => {
            if (trs.src == null && trs.sign != '=') {
                trs.src = balanceAccount;
            }
        });

        GM_log(trsList);

        let pta = trsList.map(trs => PTA.formatTrs(trs)).join('\n');
        pta = `; import from sber history @ ${today}\n\n` + pta;
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
        } else if (text === 'Вчера') {
            let yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            day = yesterday.getDate().toString().padStart(2, '0');
            month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
            year = yesterday.getFullYear();
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

    function cleanAccountName(name) {
        return name.replace('счёт', 'счет');
    }
})();
