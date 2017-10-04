//const ldtr = require('ldtr')
const ldtr = require('../../ldtr/lib/reader')
const cx = require('../../ldtr/lib/context/algorithm')
//ldtr.read(infile, {expand: true})
exports.read = (infile, opts) =>
  new Promise((resolve, reject) => {
    ldtr.read(infile).then(result => {
      if (opts.expand)
        result = cx.expand({}, result)
      resolve(result)
    })
  })
