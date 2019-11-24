const ldtr = require('ldtr')
const cx = require('ldtr/lib/jsonld/algorithm')
//ldtr.parse(infile, {expand: true})
exports.read = (infile, opts) =>
  new Promise((resolve, reject) => {
    ldtr.read(infile).then(result => {
      if (opts.expand)
        result = cx.expand({}, result)
      resolve(result)
    })
  })
