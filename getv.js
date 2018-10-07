/**
 * todo: use cheerio.load
 * add  Salary
 * 
 * --- *.json ---
 * [{
 *      name: "skill",
 *      "DD-MM-YYYY": {
 *          count: xxx,
 *          salary: xxx
 *      }
 * }]
 */
const 
    request = require('request'),
    fs = require('fs'),
    process = require('process'),
    dateFormat = require('dateformat');

const 
    BASE_URL = 'https://www.indeed.ca/',
    DATA_FILE = './getv.json';

let UPDATE = process.argv.indexOf('--update')>0;
let SORT = process.argv.indexOf('--sort');
SORT = (SORT>0) && process.argv[SORT+1];


// --- run ---
let Data = require(DATA_FILE);
if (UPDATE)
    update(dateFormat(new Date(), "dd-mm-yyyy"))
    .then(_ => {
        save()
    });
else if (SORT) {
    sort(SORT)
    save()
}
else
    print()


function print() {
    let headers = ['name'];
    Data.forEach(item => {
        for (p in item)
            if (!headers.includes(p))
                headers.push(p)
    });
    console.log('\t\t' + headers.join('\t'));
    console.log('--------------------------');

    Data.forEach(item => {
        let TAB_L = 8;
        let out = item.name + (item.name.length<TAB_L?'\t':'') + (item.name.length<2*TAB_L?'\t':'') + (item.name.length<3*TAB_L?'\t':'');
        for (let i=0; i<headers.length; i++)
            if (headers[i]!='name')
                out += (item[headers[i]].count||' ') + '\t\t';
        console.log(out);
    })
    
}

// --- implementation ---
function sort(field) {
    console.log('sort by', SORT);
    Data = Data.sort((a,b)=>(parseInt(b[field].count)||0) - (parseInt(a[field].count)||0))
}

function save() {
    fs.writeFile(DATA_FILE, JSON.stringify(Data,0,'\t'), 'utf8');
}

// update for today
function update(DATE) {
    console.log(DATE);
    return Data.reduce((next, item)=>next
        .then(()=>get_count(item.name))
        .then(count => {
            item[DATE]=item[DATE]||{};
            item[DATE].count = count;
            console.log(item.name,count);
        }), 
        new Promise(resolve=>resolve())
    )
}


// <div id="searchCount"> Jobs 1 to 20 of 90</div>
let SearchCount = /<div[^>]+searchCount[^>]*>[^<]+\s([,0-9]+)</; // /<div[^>]+searchCount[^>]*>[^<]+\s([,0..9]+)</;

// https://www.indeed.ca/DevOps-jobs
// what = DevOps
function get_count(what){
    return new Promise((resolve,reject)=>{
        request(`${BASE_URL}jobs?q=${encodeURI(what)}&l=`, function (error, response, body) { //'https://www.indeed.ca/jobs?q=DevOps&l=', function (res) { // 
            if (error){
                console.error(error);
                reject('');
                return;
            }
            
            let count = SearchCount.exec(body);
            count = parseInt(count && count[1].replace(/,/g,''));
            
            resolve(count);
        });    
    });
}
