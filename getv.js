// todo: use cheerio.load
// add  Salary

const 
    http = require('https'),
    request = require('request'),
    path = require('path'),
    fs = require('fs');
const 
    BASE_URL = 'https://www.indeed.ca/',
    QUERIES = [
        'Java',
        'Javascript',
        'Python',
        'React'
    ];

   


// <div id="searchCount"> Jobs 1 to 20 of 90</div>

let SearchCount = /<div[^>]+searchCount[^>]*>[^<]+\s([,0-9]+)</; // /<div[^>]+searchCount[^>]*>[^<]+\s([,0..9]+)</;

// https://www.indeed.ca/DevOps-jobs
// what = DevOps
function get(what){
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

var list = [];

QUERIES.reduce((previousValue, currentValue, index, array)=>{
    return previousValue.then(data=>get(currentValue))
    .then(data=>{
        list.push({query: currentValue, count: data})
        console.log(currentValue, data);
    })
    
}, new Promise(resolve=>resolve()))
.then(_=>console.log(list))

