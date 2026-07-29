## Lexer/ Scanner

The Lexer is also the scanner. It scans the text it gets for tokens. A token is a piece of text with a specific meaning. For example: `,` or `let` or `func` or `(` or `"Hello"`. Whitespace is ignored and also comments. They are only identified by `//`
The lexer uses a regular language (like in regular expressions) to create tokens from our text. Here we already throw things like `unexpected token` when we for example have a `,` where there shouldn't be one.

## Parser

These tokens are then passed on to the parser. The parser looks for the meaning of the tokens. For example, variables or operators. From these it builds a "tree", also called a "syntax tree" or "abstract syntax tree" (AST). This tree represents the flow of the logic in the language. If there is a problem, the parser reports a `syntax error`.

> [!Important] **recursive descent**??
> [current location](https://craftinginterpreters.com/parsing-expressions.html#:~:text=A%20recursive%20descent%20parser%20is%20a%20literal%20translation%20of%20the%20grammar%E2%80%99s%20rules%20straight%20into%20imperative%20code%2E%20Each%20rule%20becomes%20a%20function%2E%20The%20body%20of%20the%20rule%20translates%20to%20code%20roughly%20like)

## Resolver

The resolver takes care of tracking which variable has which value in which environment. Since we have nested scopes, a variable can be shadowed or change its value. The resourcer tracks the Reference to the declaration. So the interpreter has the right value when executing the code.

### Possible enhancements:

> The way the interpreter assumes the variable is in that map feels like flying blind. The interpreter code trusts that the resolver did its job and resolved the variable correctly. This implies a deep coupling between these two classes. In the resolver, each line of code that touches a scope must have its exact match in the interpreter for modifying an environment.
> I felt that coupling firsthand because as I wrote the code for the book, I ran into a couple of subtle bugs where the resolver and interpreter code were slightly out of sync. Tracking those down was difficult. One tool to make that easier is to have the interpreter explicitly assert—using Java’s assert statements or some other validation tool—the contract it expects the resolver to have already upheld.

After checking top level return

> We could go farther and report warnings for code that isn’t necessarily _wrong_ but probably isn’t useful. For example, many IDEs will warn if you have unreachable code after a `return` statement, or a local variable whose value is never read. All of that would be pretty easy to add to our static visiting pass, or as separate passes.

## Typechecker

This is the position where also a type checker could come in.

## Interpreter

interpreter takes the code, walks the AST executes it. using the scope depth information from the resolver.

> I love crafting interpreters and mention it on grugbrain:
>  https://grugbrain.dev/#grug-on-parsing
> but the visitor pattern is nearly always a bad idea IMO: you should just encode the operation in the tree if you control it or create a recursive function that manually dispatches on the argument type if you don't
> https://news.ycombinator.com/item?id=44304648

# Visitor Pattern & Writing Interpreters in TypeScript

## Why the Visitor Pattern Exists

In Java, you can’t easily add new _operations_ to a class hierarchy without modifying every class. The visitor pattern works around this via double-dispatch — but it’s ceremonial boilerplate (a `Visitor` interface, `accept()` on every node) that obscures what’s actually happening. Nystrom uses it in _Crafting Interpreters_ pragmatically, not because it’s elegant.

## The Core Problem It’s Solving

The **expression problem**: you want to add both new _types_ and new _operations_ to a system without modifying existing code. Visitor solves the “new operations” side but makes adding new node types harder. It’s a Java-ism — a simulation of something better languages provide natively.

## What TypeScript Gives You Instead

**Discriminated unions + exhaustive switch** — the natural fit:

```typescript
type Expr =
	| { kind: "number"; value: number }
	| { kind: "binary"; op: string; left: Expr; right: Expr }
	| { kind: "unary"; op: string; right: Expr }
	| { kind: "grouping"; expr: Expr };

function evaluate(expr: Expr): number {
	switch (expr.kind) {
		case "number":
			return expr.value;
		case "binary":
			return applyOp(expr.op, evaluate(expr.left), evaluate(expr.right));
		case "unary":
			return -evaluate(expr.right);
		case "grouping":
			return evaluate(expr.expr);
	}
}
```

TypeScript enforces exhaustiveness — if you miss a case, you get a compile error.

## Adding New Operations

Just write a new function over `Expr`. No interface changes, no touching existing code. Want a pretty-printer? Another function. A resolver? Another function.

## The Remaining Tradeoff

Adding a **new node type** still requires updating every switch statement — this is unavoidable without more complex machinery. But in practice, AST node types stabilize early; you add _operations_ more often. So discriminated unions win for interpreters.

## When Classes Still Make Sense

If nodes need significant mutable state or many methods, classes can feel cleaner. For side-channel data (e.g. resolved variable depth), prefer a `Map<Expr, SomeData>` rather than polluting the node type itself.

## Bottom Line

Skip the visitor pattern in TypeScript. Use **discriminated unions + functions**. You get exhaustiveness checking, clean separation of operations, and far less boilerplate.

### context-free grammar (**CFG**)

## Static Analysis

What follows is the static analysis. The compiler looks up what these first elements of the tree actually mean. For example, if we call a variable, where is this variable declared? So we linked these two things together. like `a + b`. What is `a`? What is `b`? if the language is statically typed, like for example, TypeScript. At this point, we would throw a `type error` if `a + b` is not possible in this language.

These gathered information must be stored somewhere. There are different ways to do this. One is to add this information to the AST. Another one is to create a lookup (called symbol table) table, or the third solution is to create an intermediary representation (IR). A new data structure.

## Optimization

## Code Generation

This takes all of this before and generates the bytecode. What the (virtual) machine can run. OR we generate machine code.

## Virtual machine

The bytecode is passed into the virtual machine. This Virtual machine emulates the chip on which it has to run. It is slower than generating machine code, but way more portable and easier to maintain since we don't have to write machine code for every chip that exists out there.

## Runtime

Finally, we want to run our code. If we wrote bytecode, we need to boot the virtual machine to run it.

https://craftinginterpreters.com/a-map-of-the-territory.html

> - An **argument** is an actual value you pass to a function when you call it. So a function _call_ has an _argument_ list. Sometimes you hear **actual parameter** used for these.
> - A **parameter** is a variable that holds the value of the argument inside the body of the function. Thus, a function _declaration_ has a _parameter_ list. Others call these **formal parameters** or simply **formals**.
> - https://craftinginterpreters.com/the-lox-language.html
