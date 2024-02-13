**MiniParse** is a small Typescript parser combinator library with an efficient regex based lexer.

## Parser Features
* Small code size makes **MiniParse** suitable for runtime embedding (< 5KB compressed).
* **MiniParse** is a combinator library. 
You write a grammar by combining simple TypeScript 
functions like `or()`, `repeat()`, and `seq()`. 
It's just Typescript so it's easy to mix with your existing code,
IDE, test framework, etc.
* **MiniParse** is a Parsing Expression Grammar (PEG) parser. 
It parses top down, using recursive descent with backtracking. 
Top down parsing is easy to understand. 
* Parsers are modular - every grammar fragment is also a parser and can be tested and reused independently.
* Extensive debug tracing for use while developing grammars is built in.
(Tracing is automatically removed from production builds).
* Error reporting is included, with full line context displayed.

## Advanced Features
* Swap lexers under parser control. This is handy for parsing quotes, 
  or for mixed language parsing (e.g. html in jsx).
* Stack parsers to parse things that can appear almost anywhere in your grammar.
  Handy for things like nested comments, semantic comments (jsdoc), or annotations. 
* Named accumulators make it easy to collect parsing results from deeply nested sub parsers.

## Choosing a Parsing Approach in the Javascript Ecosystem
Consider which category of parser you'd like. 

#### Custom parser code - maximum speed and ultimate malleability, but lots of work. 
* For maximum speed and control, write a dedicated parser directly in Typescript.
This is the most effort, but if you're writing a production compiler and need to squeeze
every millisecond, it's worth it. 
Otherwise use a parser generator tool suite or a parser combinator library.

#### Parser Generators - high speed, some work to adopt.
Parser generators statically analyze and precompile a grammar description language.
These mature tools can be a bit big, but there's lots of documentation,
rich ecosystems of example code and support tools.

Worthy examples include:
[Nearley](https://nearley.js.org/), 
[Lezer](https://lezer.codemirror.net/), 
[Antlr](https://www.antlr.org/), 
or perhaps [Ohm](https://ohmjs.org/).
Each parser generator has its own textual format to describe the grammar. The library
compiles into an execution format before parsing. 
Each of the libraries uses a different base algorithm (Earley, GLR, LL, Packrat), 
with different tradeoffs, but all have evolved robust features to classic parsing
problems of error recovery, left recursion, producing parse results, tracing, etc.

Parser generators are typically more complicated to adopt than parser combinator libraries, 
less flexible, require a separate build step, and they're generally larger than parser combinators.
But for demanding parsing jobs, the complexity of a parser generator tool is 
easily worth the investment.

#### Parser Combinators - most flexiblity, lightweight adoption.
Parser combinators define a grammar mixing and matching TypeScript functions 
provided by the library or written by the user. 
Execution of the grammar involves simply running these functions. 
That makes parser combinators very flexible and easy to adopt - you're using
TypesScript for everything.

Parser combinators are intepreting rather than compiling the grammar in advance, 
so they're slower to run. Of course, interpreted languages are free to apply
just in time compilation techniques for speed and so combinator libraries can too. 
But the typical aim of a parser combinator library is to emphasize flexibility,
and they're plenty fast enough for most purposes.

In the Parser Combinator category, **MiniParse** has a few interesting features 
and is notably lightweight.
Also consider other worthy and more mature libraries 
in the TypeScript parser combinator category like:
[ts-parsec](https://github.com/microsoft/ts-parsec) 
and [ParJS](https://github.com/GregRos/parjs).

## Parsing
* 

## Lexer

## Calculator example

## Left recursion
Left recursive rules are traditionally disallowed in top down parsers, including MiniParse. 
In the parser combinator setting, it's obvious why - a function calling itself 
in its first statement is going to recurse forever.
Best to write the grammar differently and put the recursion in the middle or at the end, 
as you would with functions.

## Future Work
PEG parsers like MiniParse can be sped up using a memoization algorithm called packrat parsing.



[Tratt](https://tratt.net/laurie/research/pubs/html/tratt__direct_left_recursive_parsing_expression_grammars/)
describes a technique to allow some left recursive rules, based on 
[Warth](https://tinlizzie.org/VPRIPapers/tr2007002_packrat.pdf)'s proposal for left recursion
with packrat parsing.
[Rossum](https://medium.com/@gvanrossum_83706/left-recursive-peg-grammars-65dab3c580e1) also 
has pursued this approach for Python. 
However, there is 
