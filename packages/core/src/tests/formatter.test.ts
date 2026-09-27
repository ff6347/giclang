// ABOUTME: Verifies canonical, semantics-preserving formatting for GIC source.
// ABOUTME: Covers comments, idempotence, and safe handling of invalid documents.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatSource } from "../formatter.ts";
import { runSource } from "../core.ts";

describe("formatSource", () => {
	const source = `func motif(x,y){// draw a motif
let size=10;
if(size>0){circle(x,y,size);}else{point(x,y);}
return size;
}
motif(20,30);`;
	const formatted = `func motif(x, y) {
\t// draw a motif
\tlet size = 10;
\tif (size > 0) {
\t\tcircle(x, y, size);
\t} else {
\t\tpoint(x, y);
\t}
\treturn size;
}
motif(20, 30);
`;

	test("formats a representative valid program canonically", () => {
		assert.equal(formatSource(source), formatted);
	});

	test("preserves program behavior", () => {
		assert.deepEqual(runSource(formatSource(source)), runSource(source));
	});

	test("is idempotent", () => {
		assert.equal(formatSource(formatted), formatted);
	});

	test("formats repeat loops, unary expressions, and binary expressions", () => {
		const expressionSource =
			"let value=-1+2*3;repeat(i,0,3){if(!false&&value>=0||value!=4){point(i,value);}}";
		const formattedExpressionSource = `let value = -1 + 2 * 3;
repeat(i, 0, 3) {
\tif (!false && value >= 0 || value != 4) {
\t\tpoint(i, value);
\t}
}
`;

		assert.equal(formatSource(expressionSource), formattedExpressionSource);
	});

	test("preserves comment text and order without treating slashes in strings as comments", () => {
		const commentSource = `// first
print("https://example.test");// second
// third`;
		const formattedCommentSource = `// first
print("https://example.test");
// second
// third
`;

		assert.equal(formatSource(commentSource), formattedCommentSource);
	});

	test("returns lexer-invalid and parser-invalid source unchanged", () => {
		for (const invalidSource of ['"unterminated', "@", "func broken("]) {
			assert.equal(formatSource(invalidSource), invalidSource);
		}
	});
});
