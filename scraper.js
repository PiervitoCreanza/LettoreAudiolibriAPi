const rp = require('request-promise');
let bookId = 19992
let url = `https://www.libroparlato.org/cilp-repository/${bookId}/marker.txt`

const scrape = url => {
    return new Promise(async function (resolve, reject) {
        rp(url).then(result => {
            let lines = result.split(/\r\n|\r|\n/)
            let totalChapters = lines[6]
            const regex = /(?<=, +\d, +)(\w+)(?=\r\n)|(?<=(\d+ \r\n))\w+/g;
            const chaptersName = result.match(regex);

            if (totalChapters == chaptersName.length) {
                resolve()
            } else {
                console.log(totalChapters, '-', chaptersName.length)
                console.log(chaptersName)
                reject()
            }
        }).catch(err => {
            reject(err)
        })
    })
}


/*
(?<=, +\d, +)(\w+)(?=\n)|(?<=(\d+ \n))\w+
(?<=, +\d, +)(\w+)(?=\n\w)|(?<=(\d+ \n))\d+(?=,)
/(?<=(\d, {1,}))(\d{3,}|\d{3,}_p(\d{1,}|[a-zA-Z]{1,}))(?=(\r\n|\n\r)[a-zA-Z]|\d)|(?<=(\d{1,} \r\n|\n\r))\d{1,}(?:,)/g
*/