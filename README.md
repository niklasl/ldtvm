# Target Vocabulary Maps

## Introduction

This is a mapping technique for translating data using one set of vocabularies/ontologies into another, without employing full OWL reasoning in the process. It uses RDFS and OWL (sometimes creatively) to derive fairly simple maps from source terms to result terms, which are then used at runtime for a speedy translation process.

The key difference from regular OWL inference is that a _target_ vocabulary, or an ordered array of terms or prefixes (provided as a JSON-LD context) is defined and used when creating the mapping. The algorithm then creates a map to these terms, from a set of known ontology assertions, ranging from basic RDFS and OWL mappings (using the super-, sub- and equivalency relationships), via property chains, to properties derived from reified forms.

The resulting map is then used to translate input data, described by any terms from the known vocabularies, into output data using the desired target vocabulary terms.

## Examples

See [examples/Spec.md](examples/Spec.md).

## Presentations

* A presentation on the TVM approach held at SWIB 2019: [slides](https://swib.org/swib19/slides/08_lindstroem_target-vocabulary-maps.pdf), [video](https://www.youtube.com/watch?v=A_1BIDAlbeI).

## Implementations

### Example Prototype

This repository contains the original (incomplete) example prototype.

Setup:

    $ npm i

(Note: currently requires a local git clone of [LDTR](https://github.com/niklasl/ldtr) side-by-side with this repository.)

Example Use:

    $ node code/cli.js -c -v examples/mappings.ttl -t 'http://schema.org/' examples/book-bf.ttl

(Pipe that to `ldtr -tjsonld -ottl` for compact Turtle output.)

You can also verify the examples in the spec document using:

    $ npm test

### TRLD

There is an improved, in-progress implementation in the [TRLD](https://github.com/niklasl/trld) repository (transpiled into multiple languages).

## Background

Inferencing is often considered a foundational feature for mechanical semantic interoperability. But it is fairly unheard of outside the semantic web community. Not even in the wider circle of linked data proponents does inference feature as a part of common implementations and services.

Meanwhile the web of data at large continues to grow (with REST APIs and services multiplying, with lots of invention and plenty of code being or waiting to be written for integrations of increasing complexity, with little or no reuse between them). Every need cropping up in and between our organizations which needs to be solved right now thus requires us to write up yet another integration script; batching, caching, indexing and (more or less successfully) keeping track of source updates and deletions.

On the level of terms and shapes of descriptions, metadata experts are mired in perpetuated discussion, more or less related to the crude realities of said integrations. Most crucially, these integrations seldom work for interoperability when multiple perspectives and granularities are taken into consideration. The same patterns are defined and implemented over and over again.

### On OWL Reasoners

There are some things which OWL reasoners are prone to, which makes them cumbersome to integrate in "simpler" applications. A great amount of general intelligence for inferring facts is applied, but not so much is about *selection*, and handling of granularities and proportions between on the one hand events and qualifications, on the other simpler ("dumbed-down") "shorthand" properties.

* Reasoners produce *all* inferable triples, instead of triples for a desired target vocabulary or selected combination.
* There is no means to specify which reduction or expansion to use for a desired granularity.
* This general inference process can be unpredictably slow.

### Custom Tooling

It is therefore not uncommon to device custom mappings between RDF vocabularies. Examples include the [PROV-DC-mappings](https://www.w3.org/TR/prov-dc/), and recently mappings between Schema.org and BibFrame. A common approach is to use SPARQL for this. This can be effective, and is arguably better/simpler than using "custom programming" (including XSLT), at least in terms of complexity (which anything Turing-complete is prone to invite). There are some drawbacks to this approach though, like:
* SPARQL is not necessarily a good fit for more comprehensive transformations. (Admittedly, this claim requires more analysis.)
* This is a one-way mapping approach. Translations back from the source to the target vocabulary requires another translation to be written.

### A Possible Middle Ground

TVMs represent a flatter, directed, perhaps "cruder" approach then either OWL or one-way custom mappings of arbitrary complexity.

The approach differs in one fundamental way: it is designed to preprocess vocabulary descriptions (using RDFS and OWL), scanning their mappings and creating a "target map" from every known property and class to a *predefined selection* of desired target properties and classes. This selection is done either by selecting an entire vocabulary, or by cherry-picking certain terms, possibly from multiple vocabularies (in order of preference). This computed *Target Vocabulary Map* is then used to read input data using *known* terms, which can then be followed in the map to the desired target property.

In the process, differing granularities of expression can be taken into account, to e.g. "fold" qualified statements or more fine-grained property chains into simpler properties, or vice versa (depending on what the source and target property is).

It is notable that the OWL vocabulary contains a lot of the terminology needed for this. While `owl:propertyChainAxiom` is pushed a bit beyond its logical limit, and reification is somewhat reconceptualized as qualification, the position taken here is that this is preferable over inventing new mechanisms until this "gaming" is shown to be untenable. Depending on more practical user experience going forward, it is feasible to reevaluate this, and decide whether or not to rephrase these kinds of mappings using a fresh vocabulary (containing the appropriate mapping equivalencies, of course), rather than "gaming" OWL any further.

### A Call For Vocabulary Alignments

In well-known vocabularies some mappings have been added for good measure, but this field hasn't really taken off (due to the lack of actual usage and thus no feedback and requests for addition or adjustments). These are mainly informative, structured documentation, rather than implemented mappings vetted in the field, in production, in an process of ongoing data integration.

The lack of simple tooling may be the reason so little of this is used outside of advanced OWL-using expert systems. Hopefully, the TVM approach can change this, putting more emphasis on vocabulary alignments using fairly simple RDFS and OWL constructs.
