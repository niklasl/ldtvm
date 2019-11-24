# Using Target Vocabulary Maps

Prelude:

    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix owl: <http://www.w3.org/2002/07/owl#>
    prefix skos: <http://www.w3.org/2004/02/skos/core#>
    prefix dc: <http://purl.org/dc/terms/>
    prefix foaf: <http://xmlns.com/foaf/0.1/>
    prefix schema: <http://schema.org/>
    prefix bf: <http://id.loc.gov/ontologies/bibframe/>
    prefix lcrel: <http://id.loc.gov/vocabulary/relators/>

## Basic Shapes

This is simply done using dictionary lookups.

### Reducing FOAF to RDFS

Given:

    <> a foaf:Document ;
        dc:title "A" .

Target:

    {"@vocab": "http://www.w3.org/2000/01/rdf-schema#"}

Expect:

    <> a rdfs:Resource ;
        rdfs:label "A" .

Assuming:

    foaf:Document rdfs:subClassOf rdfs:Resource .
    dc:title rdfs:subPropertyOf rdfs:label .

## Using Varying Granularities

This is where TVMs become really interesting. It is also where we start to use OWL and even reification in a somewhat audacious manner...

### Structured Values and Shorthand Properties

Given:

    </instance/a>
        bf:identifiedBy [ a bf:Isbn ; rdf:value "12-3456-789-0" ] .

Target:

    {"@vocab": "http://schema.org/"}

Expect:

    </instance/a>
        schema:isbn "12-3456-789-0" .

Assuming:

    schema:isbn
        owl:propertyChainAxiom (
                [ rdfs:subPropertyOf bf:identifiedBy ; rdfs:range bf:Isbn ]
                rdf:value
            ) .

### Qualified Relations as Reifications

Given:

    </work>
        bf:contribution [
                bf:agent </person/a> ;
                bf:role lcrel:ill
            ] .

Target:

    {"@vocab": "http://purl.org/dc/terms/"}

Expect:

    </work>
        dc:contributor </person/a> .

Assuming:

    bf:Contribution
        rdfs:subClassOf rdf:Statement, [
                owl:onProperty rdf:predicate; owl:hasValue dc:contributor ] .

    bf:contribution
        rdfs:range bf:Contribution ;
        rdfs:subPropertyOf [ owl:inverseOf rdf:subject ] .

    bf:role
        rdfs:domain bf:Contribution ;
        rdfs:subPropertyOf rdf:predicate .

    bf:agent
        rdfs:domain bf:Contribution ;
        rdfs:subPropertyOf rdf:object .

    lcrel:ill
        rdfs:subPropertyOf dc:contributor .

### Reification and Events

Given:

    </instance/a>
        bf:provisionActivity [ a bf:Publication ;
                bf:agent </org/a> ;
                bf:date "2017" ] .

Target:

    {"@vocab": "http://schema.org/"}

Expect:

    </instance/a>
        schema:publisher </org/a> ;
        schema:datePublished "2017" .

Assuming:

    schema:datePublished
        rdfs:subPropertyOf dcterms:issued ;
        owl:propertyChainAxiom (
            [ rdfs:subPropertyOf bf:provisionActivity ;
               rdfs:range bf:Publication ]
            bf:date
          ) .

    dcterms:publisher
        owl:equivalentProperty schema:publisher ;
        owl:propertyChainAxiom (
            [ rdfs:subPropertyOf bf:provisionActivity ;
              rdfs:range bf:Publication ]
          bf:agent
        ) .

