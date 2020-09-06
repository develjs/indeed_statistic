const request = require('request'),
    { parse } = require('node-html-parser');

function query_dom(url) {
    return new Promise((resolve, reject) => {
        request(url, function (error, response, body) {
            if (error) {
                console.error(error);
                reject('');
                return;
            }

            const root = parse(body);
            resolve(root);
        });
    });
}

// get count
// <div id="searchCountPages">Page 1 of 6,743 jobs</div>
function count_searchCountPages(root) {
    let count = NaN;
    try {
        count = root.querySelector('#searchCountPages').childNodes[0].rawText;
        count = /(\S+)\s*jobs/.exec(count);
        count = parseInt(count && count[1].replace(/,/g,''));
        if (isNaN(count)){
            throw new Error('Can\'t find "searchCount"');
        }
            
    } catch (e) {
        console.error(e)
    }

    return count;
}

/**
 * All function have the same interface
 * @param {String} name
 * @return {Object} statistic in format {name, count, salary}
 */
module.exports = {
    USA: async name => {
        const 
            url = 'https://www.indeed.com/jobs?q=${name}'.replace('${name}', encodeURIComponent(name)),
            root = await query_dom(url);

        let count = count_searchCountPages(root);

        return {name, count}; // , salary
    },

    Canada: async name => {
        const url = 'https://ca.indeed.com/jobs?q=${name}&l='.replace('${name}', encodeURIComponent(name)),
            root = await query_dom(url);

        let count = count_searchCountPages(root); // <div id="searchCount">Page 1 of 6,743 jobs</div>
        
        // get salary
        // #filter-salary-estimate ul li .rbLabel
        // $30.00+/hour (3192)
        let sValue=[], sCount=[];
        try {
            const nodes = root.querySelectorAll('#filter-salary-estimate ul li .rbLabel')
                .map(node => node.childNodes[0].rawText);
            
            sValue = nodes.filter((item, index)=>(index % 2 === 0)).map(item => parseInt(item.replace(/\D/g,'')));
            sValue = sValue.map(value => value/100);
            sCount = nodes.filter((item, index)=>(index % 2 === 1)).map(item => parseInt(item.replace(/\D/g,'')));

            if (!nodes || !nodes.length) throw new Error('Empty nodes');
        }
        catch(e) {
            console.log('cannot find salary');
            console.error(e);
        }
        // console.log(sValue);
        // console.log(sCount);
        
        // 30,3192 <= $30.00+/hour (3192) 
        let salary = sValue.reduce(
            ({sum, count}, valueX, index) => {
                let countX = sCount[index]||0;
                return {
                    sum: (sum * count + valueX * countX) / (count+countX),
                    count: count + countX
                }
            },
            {sum:0, count:0}
        ).sum;

        return {name, count, salary: Math.round(salary * 1950)}; // 1950 hous/years
    }
}
