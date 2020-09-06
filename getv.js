/*
 getv.js {[--update] | [--get <skill> [--save]] | [--sort <field/date>] | [--remove <date>]} [--country <USA|Canada>]

    --update - download new data and append
    --sort - sort data in DB by <date>
    --get - fetch defined <skill>
    --save - save fetched data
    --remove - remove date data
    --country - process only one country
    default behavior - print data
 */

/**
 * --- *.json ---
 * { 
 *    "Contry": {
 *      "url": "https://www.indeed.com/",
 *      "data": [{
 *          name: "skill",
 *          "DD-MM-YYYY": {
 *              count: xxx,     
 *              salary: xxx
 *          }
 *      }]
 *   }
 * }
 * @todo extract Model
 * @todo use DB
 * @todo use Highcharts
 * @todo extract new skills
 * @todo group by relations
 */
const 
    fs = require('fs'),
    process = require('process'),
    dateFormat = require('dateformat'),
    fetchStat = require('./fetch-stat.js');


const 
    DATA_FILE = './getv.json';


// actions
let UPDATE = process.argv.indexOf('--update');
let SORT = process.argv.indexOf('--sort');
let GET = process.argv.indexOf('--get');
let SAVE = process.argv.indexOf('--save');
let REMOVE = process.argv.indexOf('--remove');
// params
let COUNTRY = process.argv.indexOf('--country');
//---------------------------

// --- run ---
main();

async function main() {
    const CUR_DATE = dateFormat(new Date(), "dd-mm-yyyy");
    const Data = require(DATA_FILE);
    
    let processData = Data;

    if (COUNTRY > 0) {
        const country = process.argv[COUNTRY+1];

        processData = {
            [country]: Data[country]
        }
    }

    for (const country of Object.keys(Data)) {
        const DataItem = Data[country];
        if (!DataItem.data) continue;
        const data = DataItem.data;

        // handle operations, process_country
        console.log('--------------------------');
        console.log('info for ' + country);

        if (UPDATE>0) {
            await update_all(CUR_DATE, data, country);
        }
        else if (GET>0) {
            const {name,count,salary} = await get_count(process.argv[GET+1], country);
                
            if (SAVE>0) {
                update_item(name, {count, salary}, CUR_DATE, data);
            }
        }
        else if (SORT>0) {
            let field = process.argv[SORT+1];
            if (field && field.startsWith('--')) field = '';
            sort_by_field(field, data);
        }
        else if (REMOVE>0) {
            remove_date(process.argv[REMOVE+1], data);
        }
        else {
            print_all(data)
        }
    }
    
    await save(Data);
}

// ---------------------------
function remove_date(date, Data) {
    Data.forEach(item=>{
        if (date in item) delete item[date];
    });
}    

function print_all(Data) {
    let headers = getHeaders(Data);
    
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
        let out = shift(item.name, 3)   // name
        for (let i=0; i<headers.length; i++) {
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
function getHeaders(Data){
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
function sort_by_field(field, Data) {
    let fields = getHeaders(Data);
    if (!fields.includes(field)) {
        field = fields.pop();
    }
    
    console.log('sort by', field);
    Data = Data.sort((a,b)=>(b[field] && parseInt(b[field].count)||0) - (a[field] && parseInt(a[field].count)||0))
}

function save(Data) {
    return new Promise((resolve)=>{
        fs.writeFile(DATA_FILE, JSON.stringify(Data, 0,'\t'), 'utf8', ()=>{
            console.log('saved to', DATA_FILE);
            resolve();
        });
    })
}

// update all
function update_all(DATE, Data, country) {
    console.log(DATE);
    let proc = new Promise(resolve=>resolve());
    Data.forEach((item)=>{
        proc = proc
        .then(()=>get_count(item.name, country))
        .then(({count, salary}) => {
            update_item(item, {count, salary}, DATE, Data)
        })
    });
    proc = proc.then(()=>{
        console.log('done update')
    })
    return proc;
}

function update_item(item, {count, salary}, DATE, Data){
    if (typeof item == 'string') { // if name was sent
        let name = item;
        item = Data.filter(item=>item.name.toLowerCase().trim()==name.toLowerCase().trim())[0];
        if (!item) {
            item = { name };
            Data.push(item);
        }
    }
    
    if (count) {
        item[DATE]=item[DATE]||{};
        item[DATE].count = count;
        if (salary) item[DATE].salary = salary;
    }
}

async function get_count(name, country) {
    const stat = await fetchStat[country](name);
    
    console.log(stat);

    return stat;
}
