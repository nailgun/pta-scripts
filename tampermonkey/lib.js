(function() {
    const SUM_INDENT = 41;

    window.PTA = {
        parseSum: text => text.replace(/,/g, '.').replace(/\s/g, ','),

        formatTrs: (trs) => {
            let text = `${trs.date} ${trs.name}`;
            if (trs.time || trs.geo) {
                text += `  ; ${trs.time} ${trs.geo}`;
            }
            if (trs.src) {
                text += `\n    ${trs.src}`;
            }
            let sum = trs.sum;
            if (trs.currency && trs.currency !== '₽') {
                if (trs.currency === '$' || trs.currency === '£') {
                    sum = trs.currency + sum;
                } else {
                    sum += ' ' + trs.currency;
                }
            }
            if (trs.sign) {
                sum = trs.sign + sum;
            }
            text += `\n    ${trs.dst}  `.padEnd(SUM_INDENT, ' ') + `${sum}\n`;
            return text;
        },

        parseDate: (text) => {
            let now = new Date();
            text = text.toLowerCase();

            if (text === 'сегодня') {
                return now;
            }

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

            let match = /^(\d+)\s+(.+)$/.exec(text);
            if (!match) {
                throw new Error('Invalid date: ' + text);
            }

            return new Date(now.getFullYear(), MONTH_MAP[match[2]], match[1]);
        },

        formatDate: (date) => {
            let day = date.getDate().toString().padStart(2, '0');
            let month = (date.getMonth() + 1).toString().padStart(2, '0');
            let year = date.getFullYear();

            return `${year}-${month}-${day}`;
        },
    };
})();
