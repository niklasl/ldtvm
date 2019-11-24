# Target Vocabulary Maps

Setup:

    $ npm i
    $ npm test

(Note: currently requires a local git clone of ldtr side-by-side with this repository.)

Example Use:

    $ node code/cli.js -c -v examples/mappings.ttl -t 'http://schema.org/' examples/book-bf.ttl | ldtr -tjsonld -ottl

Also see examples/Spec.md.
