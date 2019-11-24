exports.mapTo = mapTo

function mapTo (mapping, indata, {dropUnmapped = true, compact = false} = {}) {
  let {target, targetMap, baseMap} = mapping
  let vocab = target['@vocab']

  let result = {}

  function map (key, value) {
    let rule = targetMap[key]

    if (dropUnmapped && isNaN(key) && key[0] !== '@' && rule === void 0) {
      return {}
    }

    if (Array.isArray(value)) {
      value = value.map(v => targetMap[v] ? targetMap[v] : v).reduce(
        (a, b) => a.concat(Array.isArray(b) ? b : [b]), [])
    }

    if (typeof rule === 'string') {
      return {[rule]: value}
    }

    let out = {}

    let rules = Array.isArray(rule) ? rule : rule ? [rule] : []
    for (let it of rules) {
      if (typeof it === 'object') {
        let {valueFrom, property, propertyFrom, match} = it
        // TODO: use both property and propertyFrom if present
        if (propertyFrom) {
          property = value[0][propertyFrom][0]['@id']
          if (targetMap[property]) property = targetMap[property]
        }
        if (targetMap[property]) property = targetMap[property]
        let outvalue = value
        // TODO: if match + use baseMap
        let matcher
        if (match && match['@type']) {
          matcher = v => v['@type'].filter(t => t === match['@type']).length
        } else {
          matcher = v => true
        }
        if (valueFrom) {
          outvalue = value
            .filter(matcher)
            .map(v => v[valueFrom])
            .reduce((a, b) => a.concat(b), [])
        }
        outvalue = outvalue.map(v => targetMap[v] ? targetMap[v] : v)
        if (property != null) {
          out[property] = outvalue
        }
      }
    }

    return rules.length ? out : {[key]: value}
  }
  function modify (ino, outo) {
    for (let k in ino) {
      let v = ino[k]
      let mapo = map(k, v)
      for (let mapk in mapo) {
        let mapv = mapo[mapk]
        if (typeof mapv === 'object') {
          let outv = Array.isArray(mapv) ? [] : {}
          modify(mapv, outv)
          mapv = outv
        } else {
          if (compact && vocab) {
            if (typeof mapv === 'string' && mapv.startsWith(vocab)) {
              mapv = mapv.substring(vocab.length)
            }
          }
        }
        if (compact && vocab) {
          if (mapk.startsWith(vocab)) mapk = mapk.substring(vocab.length)
        }
        outo[mapk] = mapv
      }
    }
  }

  modify(indata, result)

  if (compact) {
    result['@context'] = target
  }
  return result
}
