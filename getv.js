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
    {printText, printHtml} = require('./lib/output.js'),
    fetchStat = require('./fetch-stat.js');


const 
    DATA_FILE = './getv.json';


// actions

//---------------------------

function getArgs() {
    let SORT = process.argv.indexOf('--sort');
    let GET = process.argv.indexOf('--get');
    let REMOVE = process.argv.indexOf('--remove');
    let COUNTRY = process.argv.indexOf('--country');

    return {
        update: (process.argv.indexOf('--update')>0),
        country: (COUNTRY > 0? process.argv[COUNTRY+1] : ''),
        get: (GET>0 ? process.argv[GET+1] : ''),
        save: (process.argv.indexOf('--save')>0),
        sort: (SORT>0? process.argv[SORT+1]: ''),
        remove: (REMOVE>0 ? process.argv[REMOVE+1]: ''),
        debug: (process.argv.indexOf('--debug')>0),
        print: (process.argv.indexOf('--print')>0),
        html: (process.argv.indexOf('--html')>0),
    };
}

function help() {
    console.log('getv.js {[--update] | [--get <skill> [--save]] | [--sort <field/date>] | [--remove <date>]} [--country <USA|Canada>]')
}

// --- run ---
main(getArgs());

async function main({country, update, get, save: SAVE, sort, remove, debug, print, html}) {
    const CUR_DATE = dateFormat(new Date(), "dd-mm-yyyy");
    const Data = require(DATA_FILE);
    
    let processData = Data;

    if (country) {
        processData = {
            [country]: Data[country]
        }
    }

    for (const country of Object.keys(processData)) {
        const DataItem = processData[country];
        if (!DataItem.data) continue;
        const data = DataItem.data;

        // handle operations, process_country
        console.log('--------------------------');
        console.log('info for ' + country);

        if (update) {
            await update_all(CUR_DATE, data, country);
            await save(Data);
        }
        else if (get) {
            const {name,count,salary} = await get_count(get, country, debug);
                
            if (SAVE) {
                update_item(name, {count, salary}, CUR_DATE, data);
                await save(Data);
            }
        }
        else if (sort) {
            let field = sort;
            if (field && field.startsWith('--')) field = '';
            sort_by_field(field, data);
            await save(Data);
        }
        else if (remove) {
            remove_date(remove, data);
            await save(Data);
        }
        else if (print) {
            print_all(data)
        }
        else if (html) {
            print_html(data)
        }
        else {
            help()
        }
    }
}

// ---------------------------
function remove_date(date, Data) {
    Data.forEach(item=>{
        if (date in item) delete item[date];
    });
}    

function print_all(Data) {
    let headers = getHeaders(Data);
    printText(headers, Data);
}

function print_html(Data) {
    let headers = getHeaders(Data);
    headers = [headers[0], ...headers.slice(1).reverse()];
    printHtml(headers, Data);
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

async function get_count(name, country, debug) {
    const stat = await fetchStat[country](name, debug)
    
    console.log(stat);

    return stat;
}
