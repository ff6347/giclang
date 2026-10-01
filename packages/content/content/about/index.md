---
title: About
order: 10
---

**Gestalten in Code (GiC or giclang or gic)** is a small C-style language for creating two-dimensional generative graphics and teaching programming fundamentals.

It is born as part of research in speculative software design at the University of Applied Science Potsdam. Inspired by the simplicity of Design by Numbers and Processing and the malcontent of the complexity modern software development presents to beginners **giclang** is aimed as a small learning tool in the area of creative coding.

It has the deliberately narrow surface and only one way to do things. Features like interactivity, typography, or image loading are left out on purpose. Also animmation and complex structures like objects and arrays are not supported. It should be used as a tool for teaching programming basics without overwhelming students with the shear infinite amount possibilities.

Therefore we built a full environment where students can dive into code without having to setup a development environment. On the web [editor.giclang.cc](https://editor.giclang.cc/) provides full access fast feedback within the browser and even offlline as a progressive web app. The desktop application goes further and intgrates a LLM agent that is primed to provide help in language syntax and has acccess to examples but, since it is a learning tool it can not write or alter the code. It does though engage in a socratic discussion with the students.

Once students have grasped the basic constructs of programming they are encouraged to move on to more complex tools like p5.js, Processing or even leave the c style languages behind and use VVVV or cables.gl to name a few.

## What can and can't GiC do?

The idea of GiC is to create a constrained programming environment. Therefore many features where left out intentionally.

**It cannot:**

- do animation _(might come at some point, not sure yet)_
- read and write files
- load or draw images
- Use font files
- import other files _(i.e. libraries or modules)_
- change its canvas size (yes everything you do must look good in 100 × 100 pixels)
- shadow variables
- even more complex structures like Arrays, Objects, or Classes are not supported _(Arrays might come eventually)_

**It can:**

- have conditional statements like `if`, `else`, `else if` using operators like `==`, `!=`, `>`, `<`, `>=`, `<=`, `&&`, `||`, `!`,`-`
- do loops (we call it `repeat`)
- create variables for numbers, booleans and strings _(it can even concat strings, wow!)_ and reassing them
- print strings, numbers, and booleans to its own console (for debugging)
- create colors as named colors, hex values or oklch colors with alpha channels
- draw points, lines, circles and ellipses, rectangles and quads, triangles, and arcs
- colirize fills and strokes and backgrounds
- generate random numbers and use random seeds (thank you p5.js totally stolen from you)
- do arithmetic operations like `+`, `-`, `*`, `/`, `%`
- do more complex math using `sin`, `cos`, `radians`, `degrees`, `pow`, `sqrt`, `abs`, `round`, `floor`, `ceil`
- create user defined functions

**And also:**

- It has its own editor that works online and as a progressive web app for those parts of your journey where you need to write code but have no internet.
- The editor can export images from your sketches and generate a standalone HTML document that can be run without a server _(double click and open it. file://… protocol goodness)_
- The desktop app runs on Mac, _(Windows and Linux not yet tested but it will soon-ish be done)_ and works fully offline with documentation built in.
- In the desktop app is a built in agent that can be connected to Opencode (Zen and Go), OpenRouter or ChatGPT subscription to use as a coding assistant.
- That assistant cant generate the code it only can provide guidance. You still need to write the code yourself. _(Remember "learn code the hard way! Because the hard way is the right way!")_
- Has its own filetype called `.gic`

## Built with, Inspired by, Runs on

**Inspiration**

- [Design by Numbers](https://dbn.media.mit.edu/whatisdbn.html)
- [Processing](https://processing.org/)
- [p5.js](https://p5js.org/)
- [Basil.js](https://basiljs.ch/)
- [craftinginterpreters.com by Robert Nystrom](https://craftinginterpreters.com/)
- [Gestalten in Code (2016)](https://gestalten-in-code.qawsed.site)

**Tools**

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Tauri](https://tauri.app/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [FlexLayout](https://github.com/caplin/FlexLayout)
- [Base UI](https://base-ui.com/)
- [Pixel Art Icons](https://pixelarticons.com/) (MIT License)

**Runs on**

- Your computer!
- [Hetzner](https://hetzner.com/)
- [Coolify](https://coolify.io/)
- [Github](https://github.com/)

## About the Author (me) and the Intentions

Fabian Morón Zirfas (that"s me) has been teaching programing to designers since 2012/13 using various tools like, Processing, p5.js, Basil.js, Arduino, JavaScript, HTML, CSS Node.js and more. During these years the complexity of the tools around the programming increased. Which is actually wired since humankind invented more stuff to make it easier. In many workshops time is spent with setting up environments and tools, gathering documentation and resources. Then the amount of possibilities overwhelmes the students.

This lead to the conclusion to do it the other way around and go back to simpler times.

One place where all students need is bundled. Like the Processing IDE did for many 20 years ago. Write one line of code and get immediate feedback. Sane defaults. Simplicty. Every concept in expressed in a 100 by 100 image. It should be enough for communicating the concepts of programming.

## About AI in the Project and Education

This project was built with the assistance of AI. The core is implemented manually with the AI as tutor to prove the system of the socratic method and for the auhor to understand the concepts of programming languages. You can see the commit frequency below.

| Month          | Commits | Average commits / calendar day |
| -------------- | ------: | -----------------------------: |
| April 2026     |       1 |                           0.03 |
| May 2026       |      14 |                           0.45 |
| June 2026      |       0 |                           0.00 |
| July 2026      |      54 |                           1.74 |
| August 2026    |     127 |                           4.10 |
| September 2026 |     567 |                          18.90 |

Source: full Git history reachable from `main`, including merge commits. History spans 10 April–30 September 2026.

To tooling around it was mostly generated with a human in the loop for guiding the AI (see the September). For every learning endevour using AI is like taking the forklift to the gym. There will be weights moved with no effect. Besides the political, environmental and ethical implications of AI, it still can be used to broaden access to knowledge. We are looking forward to the point where the agent for this project does nmot have to be a subscription but rather a part of the operating system itself. We are not there yet but it is on the horizon.
