# Gestalten In Code (gic) Language (lang)

gic-lang is a small c style language with the narrow purpose of creating two dimensional generative art. It is born as part of my research in speculative software design at the university of applied science Potsdam. Inspired by the simplicity of Design by Numbers and Processing and the malcontent of the complexity modern software development presents to beginners gic-lang is aimed as a small learning tool in the area of creative coding. 

It has the deliberately narrow surface. Things like interactivity, typography, or image loading are left out on purpose. 
It should be used as a tool for teaching programming basics without overwhelming students with the shear infinite amount of way of doing things. 
Once students have grasp the basic constructs of programming they are encouraged to move on to more complex tool kits like p5.js, Processing or or even leave the c style languages behind and use VVVV or cables.gl to name a few. 


## Credits 

Technically the language is based on lox-lang from [craftinginterpreters.com](https://craftinginterpreters.com/) by Robert Nystrom. 
Conceptually it inherits a lot from [Design by Numbers](https://dbn.media.mit.edu/whatisdbn.html) by [John Maeda](https://maedastudio.com/), [Processing](https://processing.org/) by [Ben Fry](https://www.benfry.com/) and [Casey Reas](https://reas.com/), [p5.js](https://p5js.org/) by [Lauren McCarthy](https://get-lauren.net/), [Basil.js](https://basiljs2.netlify.app/) by [Benedikt Groß](https://benedikt-gross.de/), [Ludwig Zeller](https://www.ludwigzeller.net/), [Ted Davis](https://teddavis.org/). 

## AI in this Project 

In this project AI was used as a guide/ tutor for the implementation and as a intern to do grunt work like setting up tests. The code was mostly written by hand with some sprinkles of auto completion and context suggestion. 

If there will be some automated generation of examples is still up to discussion. 

## About the Author (me)

I am using Processing since around 2006/2007 (can't tell anymore) when Patrick Kochlik gave a Nature of Code inspired seminar at university of applied sciences Potsdam. This is the first programming language/environment that clicked for me. I tried Flash and ActionScript 3 and also Quart composer before that. None of these made programming work for me. I kept on programming and Processing/Java, openFrameworks/c++ and eventually in JavaScript/Adobe Extendscript.  
Since 2012, I am teaching programming for designers in different contexts using all of the above and additionally Arduino and p5.js. All of this, led me to this point where try to create gic-lang. 


## Interesting Bits

Things that I found that might be related to development but can't be sorted or applied yet.

### Executable options for bundlers and compilers:

- https://tsdown.dev/options/exe#executable
- https://bun.com/docs/bundler/executables
