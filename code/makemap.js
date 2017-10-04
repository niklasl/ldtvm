const indexer = require('../../ldtr/lib/util/indexer')

const ID = '@id'
const TYPE = '@type'
const GRAPH = '@graph'
const LIST = '@list'
const REVERSE = '@reverse'

function NS (base, ...terms) {
  let ns = {}
  for (let term of terms) ns[term] = base + term
  return ns
}

let RDF = NS('http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'Property', 'Statement', 'subject', 'predicate', 'object')

let RDFS = NS('http://www.w3.org/2000/01/rdf-schema#',
  'Class',
  'subClassOf', 'subPropertyOf', 'domain', 'range')

let OWL = NS('http://www.w3.org/2002/07/owl#',
  'Class', 'Datatype', 'ObjectProperty', 'DatatypeProperty', 'Restriction',
  'equivalentClass', 'equivalentProperty',
  'inverseOf', 'propertyChainAxiom',
  'onProperty', 'hasValue', 'allValuesFrom')

function makeTargetMap (vocab, targetVocabUri) {
  let vocabIndex = indexer.index(vocab)
  let targetMap = {}

  function addRule (sourceId, rule) {
    let rules = targetMap[sourceId]
    if (rules === void 0) {
      targetMap[sourceId] = rule
    } else {
      if (!Array.isArray(rules)) {
        rules = [rules]
        targetMap[sourceId] = rules
      }
      rules.push(rule)
    }
  }

  for (let obj of vocab[GRAPH]) {
    let id = obj[ID]

    // TODO: establish a baseMap to be used for match rules

    let baseClass = findAllTargetClassIds(obj, vocabIndex, targetVocabUri)
    if (id !== baseClass && baseClass && baseClass.length !== 0) {
      addRule(id, baseClass)
    }

    let property = findTargetPropertyId(obj, vocabIndex, targetVocabUri)

    if (id !== property && property) {
      addRule(id, property)
    }

    // owl:propertyChainAxiom
    let propChain = obj[OWL.propertyChainAxiom]
    if (propChain !== void 0) {
      let sourceProperty

      let list = propChain[0][LIST]
      let lead = list[0]
      // TODO: assert(list.length === 2) or use rest as path to value...
      if (lead) {
        sourceProperty = lead[ID]
      }
      let valueFrom = list[1][ID]
      let type
      if (sourceProperty == null || sourceProperty.startsWith('_:')) {
        try {
          type = list[0][RDFS.range][0][ID]
        } catch (e) {}
        sourceProperty = list[0][RDFS.subPropertyOf][0][ID]
      }
      let rule = {property, valueFrom}
      // TODO: owl:onProperty, owl:hasValue, owl:allValuesFrom
      if (type) {
        rule.match = {[TYPE]: type}
      }
      if (sourceProperty) {
        addRule(sourceProperty, rule)
      }
    }

    // Use rdf:predicate etc. for propertyFrom rule
    // ... If there is a given range, which is the domain of a property that is
    // a subPropertyOf rdf:predicate, use that property as propertyFrom...
    // Start with property that is sub-inverseOf rdf:subject. (Also domain is
    // subClassOf rdf:Statement, but that's implied...)
    // ... Perhaps only check these if there is a OWL.propertyChainAxiom,
    // and then do it for the lead (OWL.inverseOf [ RDF.subject ]?) and trail
    // (RDF.subPropertyOf RDF.object).
    // And then check for something with domain
    // same as the range of the lead/subject,
    // perhaps fallback to rdf:predicate (resolved at maptime using baseMap)...
    let inverseOfSubject = false
    let invs = obj[OWL.inverseOf]
    if (invs !== void 0) {
      inverseOfSubject = invs.find(p => p[ID] === RDF.subject) !== void 0
    } else {
      let supers = obj[RDFS.subPropertyOf]
      if (supers !== void 0) {
        inverseOfSubject = supers.find(it => it[OWL.inverseOf] &&
          it[OWL.inverseOf].find(p => p[ID] === RDF.subject))
      }
    }
    if (inverseOfSubject) {
      let ranges = obj[RDFS.range]
      let propertyFrom
      let valueFrom
      for (let range of ranges) {
        let rangeNode = vocabIndex[range[ID]]
        let inDomainOf = (rangeNode[REVERSE] || {})[RDFS.domain] || []
        for (let prop of inDomainOf) {
          let superProps = ((vocabIndex[prop[ID]] || {})[RDFS.subPropertyOf] || [])
          if (superProps.find(it => it[ID] === RDF.predicate)) {
            propertyFrom = prop[ID]
          } else if (superProps.find(it => it[ID] === RDF.object)) {
            valueFrom = prop[ID]
          }
        }
      }
      if (propertyFrom && valueFrom) addRule(id, {propertyFrom, valueFrom})
    }
  }
  return {targetMap}
}

function findTargetPropertyId (obj, vocabIndex, targetVocabUri) {
  return findTargetId(obj, vocabIndex, targetVocabUri,
    [OWL.equivalentProperty, RDFS.subPropertyOf])
}

function findAllTargetClassIds (obj, vocabIndex, targetVocabUri) {
  return findAllTargetIds(obj, vocabIndex, targetVocabUri,
    [OWL.equivalentClass, RDFS.subClassOf])
}

function findTargetId (obj, vocabIndex, targetVocabUri, links) {
  let check = id => id != null && id.startsWith(targetVocabUri)
  if (check(obj[ID])) return obj[ID]
  // TODO: use vocabIndex to search recursively
  for (let link of links) {
    for (let candidate of obj[link] || []) {
      if (check(candidate[ID])) return candidate[ID]
    }
  }
}

function findAllTargetIds (obj, vocabIndex, targetVocabUri, links, acc = []) {
  let check = id => id != null && id.startsWith(targetVocabUri)
  if (check(obj[ID])) acc.push(obj[ID])
  // TODO: use vocabIndex to search recursively
  for (let link of links) {
    for (let candidate of obj[link] || []) {
      if (check(candidate[ID])) acc.push(candidate[ID])
    }
  }
  return acc
}

module.exports = {makeTargetMap}
