(function() {
    const SUM_INDENT = 41;

    window.PTA = {
    	parseSum: text => text.replace(/,/g, '.').replace(/\s/g, ','),

    	formatTrs: (trs) => {
	        let text = `${trs.date} ${trs.name}`;
	        if (trs.src) {
	            text += `\n    ${trs.src}`;
	        }
	        text += `\n    ${trs.dst}  `.padEnd(SUM_INDENT, ' ') + `${trs.sum}\n`;
	        return text;
    	},
    };
})();
