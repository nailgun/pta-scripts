// ==UserScript==
// @name         Sberbank Online Report to PTA
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Generates PTA file from Sberbank Online Report
// @author       nailgun
// @match        https://report-vypiska.sberbank.ru/*
// @updateURL    https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-report.js
// @downloadURL  https://raw.githubusercontent.com/nailgun/pta-scripts/master/tampermonkey/sber-report.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sberbank.ru
// @grant        GM_log
// @grant        GM_setClipboard
// ==/UserScript==

(async function() {
    'use strict';

    GM_log('Starting PTA generator');

    function waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    (async function addLink() {
        let cardInfo = await waitForElement('div.b-aside div.aside_owner div.b-card-info');
        let infoItem = document.createElement('div');
        infoItem.className = 'info_item';
        let a = document.createElement('a');
        a.appendChild(document.createTextNode('PTA'));
        a.href = '#';
        a.onclick = generateReport;
        infoItem.appendChild(a);
        cardInfo.appendChild(infoItem);
    })();

    function generateReport() {
        let trsList = document.querySelector('#History div.history_main div.b-trs');
        GM_log(trsList);
    }
})();
