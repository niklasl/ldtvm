const fs = require('fs')
const path = require('path')
const assert = require('assert')

const {markdown} = require('markdown')

require = require("esm")(module)
const ldtr = require('ldtr')
const cx = require('ldtr/lib/jsonld/algorithm')

const {makeTargetMap} = require('../code/makemap')
const {mapTo} = require('../code/runmap')

function extractSpecsFromMarkdown () {
  let specs = []
  let text = fs.readFileSync(path.resolve(__dirname, 'Spec.md'), 'utf-8')
  let mdtree = markdown.parse(text)

  let prelude = null
  let example = null
  let paraText = null

  for (let [tag, attrs, rest] of mdtree) {
    if (attrs === void 0) continue
    if (rest === void 0) {
      rest = attrs
    }

    if (tag === 'para') {
      paraText = rest
    }
    if (tag === 'header' && attrs.level === 3) {
      example = {name: rest}
      specs.push(example)
      continue
    }
    if (tag === 'code_block') {
      if (paraText === 'Prelude:') {
        prelude = rest
      } else if (paraText === 'Given:') {
        example.given = rest
      } else if (paraText === 'Expect:') {
        example.expect = rest
      } else if (paraText === 'Assuming:') {
        example.assuming = rest
      } else if (paraText === 'Target:') {
        example.target = rest
      }
    }
  }

  return {prelude, specs}
}

let {prelude, specs} = extractSpecsFromMarkdown()

let i = 0
for (let spec of specs) {
  if (!spec.given) {
    console.log(`SKIPPING "${spec.name}"`)
    continue
  }
  let given = prelude + '\n' + spec.given
  let expected = prelude + '\n' + spec.expect
  let assuming = spec.assuming ? prelude + '\n' + spec.assuming : null
  let target = spec.target ? JSON.parse(spec.target) : null
  Promise.all([
    ++i,
    ldtr.read({data: assuming, type: 'ttl'}),
    ldtr.read({data: given, type: 'ttl'}),
    ldtr.read({data: expected, type: 'ttl'})
  ]).then(([i, vocab, given, expected]) => {
    console.log(`Checking ${i}: ${spec.name} ...`)
    const cx = require('ldtr/lib/jsonld/algorithm')
    vocab = cx.expand({}, vocab)
    // console.log(JSON.stringify(vocab, null, 2))
    given = cx.expand({}, given)
    expected = cx.expand({}, expected)
    let mapping = makeTargetMap(vocab, target)
    // console.log(JSON.stringify(mapping, null, 2))
    let mapped = mapTo(mapping, given)
    delete mapped['@context']
    delete expected['@context']
    assert.deepEqual(mapped, expected)
    console.log('OK!')
  })
}
