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
// @require      https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/lib.js?rev=15
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
        const reconcilationTrs = makeReconcilationTrs();
        if (reconcilationTrs.dst == ASSETS_PREFIX + 'Личный •• 3420') {
            reconcilationTrs.dst = ASSETS_PREFIX + 'sber';
        }
        //makeReconcilationTrs.dst = prompt('Enter account name:', reconcilationTrs.dst);

        let opListElm = document.querySelector('[data-unit="OperationsList"]');
        if (!opListElm) {
            alert('OperationsList not found');
            return;
        }

        let sections = document.querySelectorAll('[data-unit="OperationsList"] > section');
        let trsList = [...sections].map(section => {
            let date = PTA.formatDate(PTA.parseDate(section.querySelector('[data-unit="Date"]').innerText));
            let trsElmList = section.querySelectorAll('a:not([title="Повторить операцию"])');
            return [...trsElmList].map(op => {
                let elems = op.querySelectorAll('p');
                let parts = [...elems].map(part => part.innerText);

                if (parts.length == 2) {
                    return null; // ignore
                } else if (parts.length == 3) {
                    if (/^заказ отчета/i.test(parts[2])) {
                        return null; // ignore
                    }
                    return makeSimpleTrs(parts, date, reconcilationTrs.dst);
                } else if (parts.length == 4 && /^комиссия:/i.test(parts[3])) {
                    return makeTrsWithFee(parts, date, reconcilationTrs.dst);
                } else if (parts.length == 4 && parts[3] == 'Капитализация по вкладу/счету') { // TODO: compare with reconcilationTrs.dst
                    return null; // ignore
                } else if (parts.length == 5) {
                    return null; // ignore
                } else if (parts.length == 6 && /^между своими счетами$/i.test(parts[5])) {
                    return makeTransferTrs(parts, date, reconcilationTrs.dst);
                } else {
                    throw new Error('Unknown operation: ' + op.innerText);
                }
            }).filter(trs => !!trs); // clear ignored
        }).flat();

        trsList.reverse();
        trsList.push(reconcilationTrs);
        GM_log(trsList);

        let pta = trsList.map(trs => PTA.formatTrs(trs)).join('\n');
        pta = `; import from sber history @ ${reconcilationTrs.date}\n\n` + pta;
        GM_log(pta);
        GM_setClipboard(pta);
        alert('PTA file copied to the clipboard');
    }

    function makeSimpleTrs(parts, date, accountName) {
        let sum = parseSum(parts[1]);

        let trs = {
            date: date,
            name: parts[0],
            currency: sum.currency,
            sum: sum.sum,
        };

        if (sum.sign === '-') {
            let expAcc = standartizeExpensesAccount(parts[2]);
            trs.src = accountName;
            trs.dst = 'expenses:' + expAcc;
            if (expAcc != parts[2]) {
                trs.comment = parts[2];
            }
        } else {
            trs.src = 'income:' + parts[2];
            trs.dst = accountName;
        }

        return trs;
    }

    function makeTrsWithFee(parts, date, accountName) {
        let trs = makeSimpleTrs(parts, date, accountName);

        let match = /^комиссия:\s*([\s\S]*)$/i.exec(parts[3]);
        if (!match) {
            throw new Error('Invalid fee format');
        }

        let feeSum = parseSum(match[1]);

        if (feeSum.currency != trs.currency) {
            throw new Error('Fee currency mistmatch');
        }

        trs.src = [[accountName, null]];
        trs.dst = [
            [trs.dst, trs.sum],
            ['expenses:bankfee', feeSum.sum],
        ];
        delete trs.sum;

        return trs;
    }

    function makeTransferTrs(parts, date, accountName) {
        let sum = parseSum(parts[2]);

        let trs = {
            date: date,
            name: parts[5],
            currency: sum.currency,
            sum: sum.sum,
            src: ASSETS_PREFIX + `${parts[0]} ${parts[1]}`,
            dst: ASSETS_PREFIX + `${parts[3]} ${parts[4]}`,
        };

        if (sum.sign == '+') {
            trs.dst = accountName;
        } else {
            trs.src = accountName;
        }

        return trs;
    }

    function makeReconcilationTrs() {
        if (document.location.pathname != '/operations') {
            throw new Error('Invalid document location');
        }

        let match = /^\?usedResource=(ct-account|card)(%3A|:)([^&]+)/.exec(document.location.search);
        if (!match) {
            throw new Error('Invalid operations filter');
        }

        let accountId = match[3];
        let accountLink = document.querySelector(`a[class^="region-products-cards-"][href$="/${accountId}"]`);
        if (!accountLink) {
            throw new Error('Cant find active account');
        }

        let parts = accountLink.innerText.split('\n');

        if (parts.length == 2) {
            // is a card, find account
            accountLink = accountLink.closest('ul').closest('li').querySelector('a[href^="/cta/"]');
            if (!accountLink) {
                throw new Error('Cant find active account');
            }
            parts = accountLink.innerText.split('\n');
        }

        return {
            date: formatDate(new Date()),
            name: '* sber reconcilation',
            currency: parts[2],
            sum: PTA.parseSum(parts[0].trim()),
            dst: ASSETS_PREFIX + `${parts[3]} ${parts[4]}`,
            sign: '=',
        };
    }

    function parseDate(text) {
        let date = new Date();
        text = text.toLowerCase();

        if (text === 'сегодня') {
        } else if (text === 'вчера') {
            date.setDate(date.getDate() - 1);
        } else if (text === 'позавчера') {
            date.setDate(date.getDate() - 2);
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

            date = new Date(date.getFullYear(), MONTH_MAP[match[2]] - 1, parseInt(match[1]));
        }

        return formatDate(date);
    }

    function formatDate(date) {
        let day = date.getDate().toString().padStart(2, '0');
        let month = (date.getMonth() + 1).toString().padStart(2, '0');
        let year = date.getFullYear();
        return `${year}-${month}-${day}`;
    }

    function parseSum(text) {
        let parts = text.split('\n');
        let sign = parts[0][0];
        if (sign === '+' || sign === '-') {
            parts[0] = parts[0].slice(1);
        } else {
            sign = '-';
        }

        return {
            sign: sign,
            currency: parts[2].trim(),
            sum: PTA.parseSum(parts[0].trim()),
        };
    }

    function standartizeExpensesAccount(name) {
        switch (name) {
            case 'Клиенту Сбербанка':
                return 'TRANSFER';
            case 'Перевод по СБП':
                return 'TRANSFER';
            case 'Оплата товаров и услуг':
                return 'UNKNOWN';
            case 'Прочие списания':
                return 'UNKNOWN';
            case 'Оплата услуг':
                return 'UNKNOWN';
            case 'Оплата по QR-коду СБП':
                return 'UNKNOWN';
            case 'Оплата по QR коду Сбербанка':
                return 'UNKNOWN';
            case 'Оплата SberPay':
                return 'UNKNOWN';
        }

        return name;
    }
})();
