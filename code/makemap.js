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

const indexer = require('ldtr/lib/util/indexer')

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

const RDF = NS('http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'Property', 'Statement', 'subject', 'predicate', 'object')

const RDFS = NS('http://www.w3.org/2000/01/rdf-schema#',
  'Class',
  'subClassOf', 'subPropertyOf', 'domain', 'range')

const OWL = NS('http://www.w3.org/2002/07/owl#',
  'Class', 'Datatype', 'ObjectProperty', 'DatatypeProperty', 'Restriction',
  'equivalentClass', 'equivalentProperty',
  'inverseOf', 'propertyChainAxiom',
  'onProperty', 'hasValue', 'allValuesFrom')

const SKOS = NS('http://www.w3.org/2004/02/skos/core#',
  'broadMatch', 'closeMatch', 'exactMatch', 'narrowMatch', 'mappingRelation')

const SYMMETRIC = {
  [OWL.equivalentClass]: true,
  [OWL.equivalentProperty]: true,
  [SKOS.closeMatch]: true,
  [SKOS.exactMatch]: true
}

function asArray(o) {
  if (!Array.isArray(o)) {
    return o == null ? [] : [ o ]
  }
  return o
}

function isTargeted(target, id) {
  return id in target || id.startsWith(target['@vocab'])
}

function makeTargetMap (vocab, target) {
  if (typeof target === 'string') {
    target = {['@vocab']: target}
  }
  let vocabIndex = indexer.index(vocab)
  let targetMap = {}
  let baseMap = {}

  function addRule (sourceId, rule) {
    if (sourceId === rule) return

    let rules = targetMap[sourceId]
    if (rules === void 0) {
      targetMap[sourceId] = rule
    } else {
      if (!Array.isArray(rules)) {
        rules = [rules]
        targetMap[sourceId] = rules
      }
      if (Array.isArray(rule)) {
        for (r of rule) rules.push(r)
      } else {
        rules.push(rule)
      }
    }
  }

  for (let obj of vocab[GRAPH]) {
    let id = obj[ID]

    // TODO: build baseMap first to be used for match rules
    let baseRels = [RDFS.subClassOf, RDFS.subPropertyOf]
    for (let rel of baseRels) {
      let bases = obj[rel]
      if (bases) {
        baseMap[obj[ID]] = bases.map(base => base[ID]).filter(it => it)
      }
    }

    processClassRelations(obj, vocabIndex, target, addRule)

    processPropertyRelations(obj, vocabIndex, target, addRule)

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
      let ranges = asArray(obj[RDFS.range])
      let propertyFrom
      let valueFrom
      for (let range of ranges) {
        let rangeNode = vocabIndex.byId[range[ID]]
        if (!rangeNode) continue
        let inDomainOf = (rangeNode[REVERSE] || {})[RDFS.domain] || []
        for (let prop of inDomainOf) {
          let superProps = ((vocabIndex.byId[prop[ID]] || {})[RDFS.subPropertyOf] || [])
          if (superProps.find(it => it[ID] === RDF.predicate)) {
            propertyFrom = prop[ID]
          } else if (superProps.find(it => it[ID] === RDF.object)) {
            valueFrom = prop[ID]
          }
        }
      }
      if (propertyFrom && valueFrom) {
        addRule(obj[ID], {propertyFrom, valueFrom})
      }
    }
  }

  return {target: target, targetMap, baseMap}
}

function processClassRelations (obj, vocabIndex, target, addRule) {
  let rels = [OWL.equivalentClass, RDFS.subClassOf]
  let check = id => id != null && isTargeted(target, id)

  // TODO: rework this more like processPropertyRelations
  let baseRels = []

  let id = obj[ID]

  if (check(obj[ID])) baseRels.push(obj[ID])
  // TODO: use vocabIndex to search recursively
  for (let rel of rels) {
    for (let candidate of obj[rel] || []) {
      if (check(candidate[ID])) {
        baseRels.push([rel, candidate[ID]])
      } else if (SYMMETRIC[rel] && !check(candidate[ID])) {
          addRule(candidate[ID], id)
      }
    }
  }

  if (!isTargeted(target, id)) {
    baseRels = baseRels.filter(it => it && it !== id)
    if (baseRels.length !== 0) {
      let baseClasses = []
      for (let [rel, base] of baseRels) {
        baseClasses.push(base)
        if (rel === OWL.equivalentClass) {
          addRule(base, id)
        }
      }
      addRule(id, baseClasses)
    }
  }
}

function processPropertyRelations (obj, vocabIndex, target, addRule) {
  let rels = [OWL.equivalentProperty, RDFS.subPropertyOf]
  let check = id => id != null && isTargeted(target, id)

  let id = obj[ID]
  let property = check(id) ? id : null

  // TODO: OK to add identity-mapping?
  if (property) addRule(id, property)

  // TODO: use vocabIndex to search recursively
  for (let rel of rels) {
    for (let candidate of obj[rel] || []) {
      if (!check(id) && check(candidate[ID])) {
        addRule(id, candidate[ID])
        property = candidate[ID]
        //break
      } else if (SYMMETRIC[rel] && !check(candidate[ID]) && check(id)) {
          addRule(candidate[ID], id)
          property = candidate[ID]
          //break
        }
    }
    /* why did I follow reverse just to get the object in this sketch?
     * For the todo re. recursively or ... ?
    if (SYMMETRIC[rel] && obj[REVERSE]) {
      for (let candidate of obj[REVERSE][rel] || []) {
        if (check(candidate[ID])) {
          addRule(candidate[ID], id)
          property = candidate[ID]
          break
        }
      }
    }
    */
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
      if (property != null && property !== sourceProperty &&
          !isTargeted(target, sourceProperty)) {
        addRule(sourceProperty, rule)
      }
    }
  }
}

module.exports = {makeTargetMap}
