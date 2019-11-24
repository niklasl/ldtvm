require = require("esm")(module)
const {read} = require('./util')
const {makeTargetMap} = require('./makemap')
const {mapTo} = require('./runmap')

if (require.main === module) {
  const argsParser = require('ldtr/lib/util/args')

  let opts = argsParser
    .option('--vocab', '-v')
    .option('--target', '-t')
    .flag('--compact', '-c')
    .parse(process.argv.slice(2))

  var infile = opts.args[0]

  if (infile) {
    Promise.all([
      read(opts.vocab, {expand: true}).then(
        vocab => makeTargetMap(vocab, opts.target)),
      read(infile, {expand: true})
    ]).then(([mapping, indata]) => {
      let mapped = mapTo(mapping, indata, opts)
      console.log(JSON.stringify(mapped, null, 2))
    })
  } else {
    read(opts.vocab, {expand: true})
      .then(vocab => makeTargetMap(vocab, opts.target))
      .then(mapping => {
        console.log(JSON.stringify(mapping, null, 2))
      })
  }
}
