(function() {
    const SUM_INDENT = 41;

    function formatSum (sum, currency) {
        if (currency && currency !== '₽') {
            if (currency === '$' || currency === '£') {
                sum = currency + sum;
            } else {
                sum += ' ' + currency;
            }
        }

        return sum;
    }

    window.PTA = {
        parseSum: text => text.replace(/,/g, '.').replace(/\s/g, ','),

        formatTrs: (trs) => {
            let text = `${trs.date} ${trs.name}`;
            if (trs.comment) {
                text += '  ; ' + trs.comment;
            }
            if (trs.src) {
                text += `\n    ${trs.src}`;
                if (trs.srcComment) {
                    text += '  ; ' + trs.srcComment;
                }
            }

            // simple trs without splits
            if (trs.sum) {
                if (trs.src) {
                    trs.src = [trs.src, null];
                } else {
                    trs.src = [];
                }
                trs.dst = [trs.dst, trs.sum];
                delete trs.sum;
            }

            for (let [acc, sum] in trs.src) {
                if (sum) {
                    sum = formatSum(sum);
                    text += `\n    ${acc}  `.padEnd(SUM_INDENT, ' ') + `${sum}`;
                } else {
                    text += `\n    ${acc}`;
                }
            }

            for (let [acc, sum] in trs.dst) {
                if (sum) {
                    sum = formatSum(sum);
                    if (trs.sign) {
                        sum = trs.sign + sum;
                    }
                    text += `\n    ${acc}  `.padEnd(SUM_INDENT, ' ') + `${sum}`;
                } else {
                    text += `\n    ${acc}`;
                }
            }

            text += '\n';
            return text;
        },

        parseDate: (text) => {
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

                // "\p{L}" is "\w" for unicode
                let match = /^(\d+)\s+(\p{L}+)/u.exec(text);
                if (!match) {
                    throw new Error('Invalid date: ' + text);
                }

                date = new Date(date.getFullYear(), MONTH_MAP[match[2]] - 1, parseInt(match[1]));
            }

            return date;
        },

        formatDate: (date) => {
            let day = date.getDate().toString().padStart(2, '0');
            let month = (date.getMonth() + 1).toString().padStart(2, '0');
            let year = date.getFullYear();

            return `${year}-${month}-${day}`;
        },
    };
})();
