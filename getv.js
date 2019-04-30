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

// <div id="searchCount">Page 1 of 6,743 jobs</div>
let SEARCH_COUNT = /<div[^>]+searchCount[^>]*>[^<]+\s([^<]+)\s+jobs\s*</; 


let UPDATE = process.argv.indexOf('--update')>0;
let SORT = process.argv.indexOf('--sort');
let SORT_DATE = (SORT>0) && process.argv[SORT+1];

//---------------------------

// --- run ---
let Data = require(DATA_FILE);
if (UPDATE)
    update(dateFormat(new Date(), "dd-mm-yyyy"))
    .then(_ => {
        save()
    });
else if (SORT>0) {
    sort(SORT_DATE)
    save()
}
else
    print()

function print() {
    let headers = getHeaders();
    
    console.log('\t\t' + headers.join('\t'));
    console.log('--------------------------');

    // calc vacations counts
    let counts = [];
    Data.forEach(item => {
        let out = shift(item.name, 3)
        for (let i=0; i<headers.length; i++){
            let val = item[headers[i]] && item[headers[i]].count ||0;
            counts[i] = counts[i]||0 + val;
        }
    })
    
    Data.forEach(item => {
        let out = shift(item.name, 3)
        for (let i=0; i<headers.length; i++){
            let val = item[headers[i]] && item[headers[i]].count ||0;
            let prev = item[headers[i-1]];
            prev = prev && prev.count ||0;
            let count = counts[i];
            let count_prev = counts[i-1]||0;
            let per = (val&&prev)? Math.round(100*(val-prev)/prev): 0;
            // let per = (val&&prev)? Math.round(100*(val/count-prev/count_prev)/(prev/count_prev)): 0;
            if (per>0) per = '+' + per;
            
            if (headers[i] != 'name')
                out += shift((val||' ') + '' + (per||''), 2);
        }
        console.log(out);
    })
    
    function shift(str, count) {
        count = count - Math.floor(str.length / 8); // TAB length
        for (let i=0; i<count; i++)
            str += '\t';
        return str;
    }
}

// get sorted headers
function getHeaders(){
    let headers = ['name'];
    Data.forEach(item => {
        for (p in item)
            if (!headers.includes(p))
                headers.push(p)
    });
    headers.sort((a,b)=>{ // 31-01-2019	<> 09-04-2019
        a = a.split('-');
        b = b.split('-');
        return (a[2]-b[2])*32*16 + (a[1]-b[1])*32 + a[0]-b[0];
    })
    return headers;
}

// --- implementation ---
function sort(field) {
    if (!field) {
        field = getHeaders().pop();
    }
    
    console.log('sort by', field);
    Data = Data.sort((a,b)=>(b[field] && parseInt(b[field].count)||0) - (a[field] && parseInt(a[field].count)||0))
}

function save() {
    fs.writeFile(DATA_FILE, JSON.stringify(Data,0,'\t'), 'utf8', ()=>{
        console.log('saved to', DATA_FILE);
    });
}

// update for today
function update(DATE) {
    console.log(DATE);
    return Data.reduce((next, item)=>next
        .then(()=>get_count(item.name))
        .then(count => {
            if(count) {
                item[DATE]=item[DATE]||{};
                item[DATE].count = count;
            }
            if (isNaN(count))
                console.warn('Can\'t find "searchCount", try to change regexp');
            console.log(item.name,count);
        }), 
        new Promise(resolve=>resolve())
    )
}



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
            
            let count = SEARCH_COUNT.exec(body);
            count = parseInt(count && count[1].replace(/,/g,''));
            
            resolve(count);
        });    
    });
}
