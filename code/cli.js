const {read} = require('./util')
const {makeTargetMap} = require('./makemap')
const {mapTo} = require('./runmap')

/*
set-mapping-by-context(-or-vocab)
  mapping-structure: {
    [from all kinds of vocabularies; start with those referred to in the given
     context, but any seen is useful to consume wild data (provided that
     those seen are have paths to terms (including known equivs)
     within the context]
    source term: inferred path to target with requirements or optional defaults along it
}
*/

if (require.main === module) {
  const {parseArgs} = require('../../ldtr/lib/util/args')

  let opts = parseArgs(process.argv.slice(2),
    {vocab: null, target: null},
    {v: 'vocab', t: 'target'})

  var infile = opts.args[0]

  if (infile) {
    Promise.all([
      read(opts.vocab, {expand: true}).then(
        vocab => makeTargetMap(vocab, opts.target)),
      read(infile, {expand: true})
    ]).then(([mapping, indata]) => {
      let mapped = mapTo(mapping, indata)
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
