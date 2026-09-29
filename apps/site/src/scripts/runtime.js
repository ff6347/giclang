var GicStandaloneRuntime = (function (e) {
	Object.defineProperty(e, Symbol.toStringTag, {
		value: `Module`,
	});
	function t(e) {
		return e.kind === `oklch`
			? e.alpha === void 0
				? `oklch(${e.lightness}% ${e.chroma}% ${e.hue % 360})`
				: `oklch(${e.lightness}% ${e.chroma}% ${e.hue % 360} / ${e.alpha}%)`
			: e.value;
	}
	function n(e) {
		return (e * Math.PI) / 180;
	}
	function r(e, r) {
		let o = e.getContext(`2d`);
		if (!o) throw Error(`Canvas context is null`);
		a(o, e);
		let s = `white`,
			c = `black`,
			l = 1,
			u = !0,
			d = !0;
		((o.lineWidth = l), (o.fillStyle = s), (o.strokeStyle = c));
		for (let a of r)
			switch (a.type) {
				case `noFill`:
					d = !1;
					break;
				case `noStroke`:
					u = !1;
					break;
				case `strokeWidth`:
					l = a.width;
					break;
				case `stroke`:
					((u = !0), (c = t(a.color)));
					break;
				case `fill`:
					((d = !0), (s = t(a.color)));
					break;
				case `background`:
					let r = a.color;
					((o.fillStyle = t(r)), o.fillRect(0, 0, e.width, e.height));
					break;
				case `point`:
					(o.beginPath(),
						u &&
							(o.ellipse(a.x, a.y, l / 2, l / 2, 0, 0, 2 * Math.PI),
							(o.fillStyle = c),
							o.fill()));
					break;
				case `line`:
					(o.beginPath(),
						o.moveTo(a.x1, a.y1),
						o.lineTo(a.x2, a.y2),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: !1,
							isStroked: u,
						}));
					break;
				case `triangle`:
					(o.beginPath(),
						o.moveTo(a.x1, a.y1),
						o.lineTo(a.x2, a.y2),
						o.lineTo(a.x3, a.y3),
						o.closePath(),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: d,
							isStroked: u,
						}));
					break;
				case `quad`:
					(o.beginPath(),
						o.moveTo(a.x1, a.y1),
						o.lineTo(a.x2, a.y2),
						o.lineTo(a.x3, a.y3),
						o.lineTo(a.x4, a.y4),
						o.closePath(),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: d,
							isStroked: u,
						}));
					break;
				case `rect`:
					(o.beginPath(),
						o.rect(a.x, a.y, a.width, a.height),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: d,
							isStroked: u,
						}));
					break;
				case `ellipse`:
					(o.beginPath(),
						o.ellipse(a.x, a.y, a.width / 2, a.height / 2, 0, 0, 2 * Math.PI),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: d,
							isStroked: u,
						}));
					break;
				case `circle`:
					(o.beginPath(),
						o.ellipse(a.x, a.y, a.radius, a.radius, 0, 0, 2 * Math.PI),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: d,
							isStroked: u,
						}));
					break;
				case `arc`:
					(o.beginPath(),
						o.arc(a.x, a.y, a.radius, n(a.startAngle), n(a.endAngle)),
						i({
							ctx: o,
							currentFill: s,
							currentStroke: c,
							currentLineWidth: l,
							isFilled: !1,
							isStroked: u,
						}));
			}
	}
	function i({
		ctx: e,
		currentFill: t,
		currentStroke: n,
		currentLineWidth: r,
		isFilled: i,
		isStroked: a,
	}) {
		((e.fillStyle = t),
			(e.strokeStyle = n),
			(e.lineWidth = r),
			i && e.fill(),
			a && e.stroke());
	}
	function a(e, t) {
		e.clearRect(0, 0, t.width, t.height);
	}
	function o(e, t) {
		let n = document.querySelector(`textarea`),
			i = document.querySelector(`canvas`),
			o = document.querySelector(`#diagnostics`),
			s = document.querySelector(`#output`);
		if (
			!(n instanceof HTMLTextAreaElement) ||
			!(i instanceof HTMLCanvasElement) ||
			!(o instanceof HTMLElement) ||
			!(s instanceof HTMLElement)
		)
			throw Error(`Standalone preview elements are missing.`);
		let c = null,
			l = null,
			u = () => {
				let e = i.getContext(`2d`);
				e && a(e, i);
			},
			d = (e) => {
				s.textContent = e.map((e) => `Line ${e.line + 1}: ${e.text}`).join(`
`);
			},
			f = (e) => {
				let n = URL.createObjectURL(new Blob([t], { type: `text/javascript` })),
					a = new Worker(n);
				(URL.revokeObjectURL(n), (c = a));
				let l = window.setTimeout(() => {
					a === c &&
						(a.terminate(),
						(c = null),
						u(),
						(s.textContent = ``),
						(o.textContent = `The preview took too long and was terminated.`));
				}, 500);
				((a.onmessage = ({ data: e }) => {
					if (a === c) {
						if (
							(window.clearTimeout(l),
							a.terminate(),
							(c = null),
							d(e.output),
							e.ok)
						) {
							(r(i, e.commands), (o.textContent = ``));
							return;
						}
						(u(),
							(o.textContent = e.diagnostics.map(
								(e) => `Line ${e.line + 1}: ${e.message}`,
							).join(`
`)));
					}
				}),
					a.postMessage({ source: e }));
			};
		((n.value = e),
			n.addEventListener(`input`, () => {
				(l !== null && window.clearTimeout(l),
					c?.terminate(),
					(c = null),
					u(),
					(o.textContent = ``),
					(s.textContent = ``),
					(l = window.setTimeout(() => f(n.value), 100)));
			}),
			f(e));
	}
	return ((e.startStandalonePreview = o), e);
})({});
GicStandaloneRuntime.startStandalonePreview(
	`// edit me!
repeat(_, 0, 500) {
	fill("lightpink");
	strokeWidth(random(0.2,3));
	circle((1 / sqrt(random(0, 1))) * 50 - WIDTH / 2,
	random(0, HEIGHT),
	random(0, 4));
}
// print("👋🏾 🌎!");
`,
	"(function(){function e(e){return{message:`Cannot assign to function '${e.lexeme}'.`,line:e.line,start:e.start,end:e.end}}function t(e){return{message:`Cannot assign to repeat variable '${e.lexeme}'.`,line:e.line,start:e.start,end:e.end}}function n(e){return{message:`Cannot declare '${e.lexeme}' because that name already exists.`,line:e.line,start:e.start,end:e.end}}function r(e){return{message:`Cannot assign to '${e.lexeme}' because that name is defined by GIC.`,line:e.line,start:e.start,end:e.end}}function i(e){return{message:`Cannot declare '${e.lexeme}' because that name is defined by GIC.`,line:e.line,start:e.start,end:e.end}}function a(e){return{message:`Cannot find name '${e.lexeme}'.`,line:e.line,start:e.start,end:e.end}}function o(e){return{message:`Cannot call '${e.lexeme}' because it is not a function.`,line:e.line,start:e.start,end:e.end}}function s(e,t,n){let r=new Intl.ListFormat(`en-US`,{style:`short`,type:`disjunction`});return{message:`Function '${e.lexeme}' expects ${typeof t==`number`?t:r.format(t.map(String))} arguments, but got ${n}.`,line:e.line,start:e.start,end:e.end}}function c(e){return{message:`Function '${e.lexeme}' must have a return statement.`,line:e.line,start:e.start,end:e.end}}function ee(e){return{message:`Function '${e.lexeme}' cannot return both a value and no value.`,line:e.line,start:e.start,end:e.end}}function te(e){return{message:`Cannot return outside a function.`,line:e.line,start:e.start,end:e.end}}function l(e){return{message:`Function '${e.lexeme}' does not return a value and cannot be used in an expression.`,line:e.line,start:e.start,end:e.end}}function u(e){return{message:`Function '${e.lexeme}' must produce a finite number.`,line:e.line,start:e.start,end:e.end}}function ne(e){return{message:`Function '${e.lexeme}' requires argument 'min' to be less than argument 'max'.`,line:e.line,start:e.start,end:e.end}}function d(e,t,n){return{message:`Function '${e.lexeme}' requires a ${t} for argument '${n}'.`,line:e.line,start:e.start,end:e.end}}var f=[[{name:`value`,kind:`string`}],[{name:`lightness`,kind:`number`},{name:`chroma`,kind:`number`},{name:`hue`,kind:`number`}],[{name:`lightness`,kind:`number`},{name:`chroma`,kind:`number`},{name:`hue`,kind:`number`},{name:`alpha`,kind:`number`}]],p={WIDTH:{kind:`constant`,valueKind:`number`,value:100},HEIGHT:{kind:`constant`,valueKind:`number`,value:100},PI:{kind:`constant`,valueKind:`number`,value:Math.PI},background:{kind:`function`,signatures:[...f],returnKind:`void`},stroke:{kind:`function`,signatures:[...f],returnKind:`void`},noStroke:{kind:`function`,signatures:[[]],returnKind:`void`},noFill:{kind:`function`,signatures:[[]],returnKind:`void`},fill:{kind:`function`,signatures:[...f],returnKind:`void`},strokeWidth:{kind:`function`,signatures:[[{name:`width`,kind:`number`}]],returnKind:`void`},print:{kind:`function`,signatures:[[{name:`value`,kind:`string`}],[{name:`value`,kind:`number`}],[{name:`value`,kind:`boolean`}]],returnKind:`void`},point:{kind:`function`,signatures:[[{name:`x`,kind:`number`},{name:`y`,kind:`number`}]],returnKind:`void`},line:{kind:`function`,signatures:[[{name:`x1`,kind:`number`},{name:`y1`,kind:`number`},{name:`x2`,kind:`number`},{name:`y2`,kind:`number`}]],returnKind:`void`},rect:{kind:`function`,signatures:[[{name:`x`,kind:`number`},{name:`y`,kind:`number`},{name:`width`,kind:`number`},{name:`height`,kind:`number`}]],returnKind:`void`},circle:{kind:`function`,signatures:[[{name:`x`,kind:`number`},{name:`y`,kind:`number`},{name:`radius`,kind:`number`}]],returnKind:`void`},ellipse:{kind:`function`,signatures:[[{name:`x`,kind:`number`},{name:`y`,kind:`number`},{name:`width`,kind:`number`},{name:`height`,kind:`number`}]],returnKind:`void`},triangle:{kind:`function`,signatures:[[{name:`x1`,kind:`number`},{name:`y1`,kind:`number`},{name:`x2`,kind:`number`},{name:`y2`,kind:`number`},{name:`x3`,kind:`number`},{name:`y3`,kind:`number`}]],returnKind:`void`},quad:{kind:`function`,signatures:[[{name:`x1`,kind:`number`},{name:`y1`,kind:`number`},{name:`x2`,kind:`number`},{name:`y2`,kind:`number`},{name:`x3`,kind:`number`},{name:`y3`,kind:`number`},{name:`x4`,kind:`number`},{name:`y4`,kind:`number`}]],returnKind:`void`},arc:{kind:`function`,signatures:[[{name:`x`,kind:`number`},{name:`y`,kind:`number`},{name:`radius`,kind:`number`},{name:`startAngle`,kind:`number`},{name:`endAngle`,kind:`number`}]],returnKind:`void`},random:{kind:`function`,signatures:[[{name:`min`,kind:`number`},{name:`max`,kind:`number`}]],returnKind:`value`},randomSeed:{kind:`function`,signatures:[[{name:`seed`,kind:`number`}]],returnKind:`void`},floor:{kind:`function`,signatures:[[{name:`value`,kind:`number`}]],returnKind:`value`},ceil:{kind:`function`,signatures:[[{name:`value`,kind:`number`}]],returnKind:`value`},round:{kind:`function`,signatures:[[{name:`value`,kind:`number`}]],returnKind:`value`},abs:{kind:`function`,signatures:[[{name:`value`,kind:`number`}]],returnKind:`value`},min:{kind:`function`,signatures:[[{name:`a`,kind:`number`},{name:`b`,kind:`number`}]],returnKind:`value`},max:{kind:`function`,signatures:[[{name:`a`,kind:`number`},{name:`b`,kind:`number`}]],returnKind:`value`},sqrt:{kind:`function`,signatures:[[{name:`value`,kind:`number`}]],returnKind:`value`},pow:{kind:`function`,signatures:[[{name:`base`,kind:`number`},{name:`exponent`,kind:`number`}]],returnKind:`value`},sin:{kind:`function`,signatures:[[{name:`degrees`,kind:`number`}]],returnKind:`value`},cos:{kind:`function`,signatures:[[{name:`degrees`,kind:`number`}]],returnKind:`value`}};function m(e){return Object.hasOwn(p,e)}var h={else:`ELSE`,false:`FALSE`,true:`TRUE`,if:`IF`,return:`RETURN`,let:`LET`,repeat:`REPEAT`,func:`FUNC`,loop:`LOOP`,null:`NULL`},g=new Set([...Object.keys(p),...Object.keys(h)]),_=class{declarations=new Map},re=class{scopes=[];diagnostics=[];program;programGlobalNames=new Set;returnState=void 0;constructor(e){this.program=e;let t=new _;this.scopes.push(t)}classifyStatements(e){let t=`none`;for(let n of e)t=this.mergeReturnStates(t,this.classifyStatement(n));return t}classifyStatement(e){switch(e.type){case`ReturnStmt`:return e.value?`value`:`void`;case`IfStmt`:return this.mergeReturnStates(this.classifyStatements(e.thenBranch),this.classifyStatements(e.elseBranch??[]));case`RepeatStmt`:return this.classifyStatements(e.body);default:return`none`}}mergeReturnStates(e,t){return e===`mixed`||t===`mixed`?`mixed`:e===`none`?t:t===`none`||e===t?e:`mixed`}findDeclaration(e){for(let t=this.scopes.length-1;t>=0;t--)if(this.scopes[t]?.declarations.has(e))return this.scopes[t]?.declarations.get(e)}walkStatement(e){switch(e.type){case`ReturnStmt`:this.onReturnStmt(e);break;case`RepeatStmt`:this.onRepeatStmt(e);break;case`FuncStmt`:this.onFuncStmt(e);break;case`Assignment`:this.onAssignment(e);break;case`ExprStmt`:this.onExprStmt(e);break;case`IfStmt`:this.onIfStmt(e);break;case`VarDecl`:this.onVarDecl(e);break;default:throw Error(`Unhandled type ${e} in Analyser.analyze`)}}onReturnStmt(e){let t=e.value?`value`:`void`;this.returnState===void 0?this.diagnostics.push(te(e.keyword)):this.returnState===`none`?this.returnState=t:this.returnState!==t&&(this.returnState=`mixed`),e.value&&this.walkExpression(e.value)}onRepeatStmt(e){this.walkExpression(e.start),this.walkExpression(e.end),e.step&&this.walkExpression(e.step),this.scopes.push(new _),g.has(e.variable.lexeme)?this.diagnostics.push(i(e.variable)):this.programGlobalNames.has(e.variable.lexeme)?this.diagnostics.push(n(e.variable)):this.findDeclaration(e.variable.lexeme)===void 0?this.scopes.at(-1)?.declarations.set(e.variable.lexeme,{kind:`repeat-variable`,token:e.variable}):this.diagnostics.push(n(e.variable)),e.body.forEach(e=>{this.walkStatement(e)}),this.scopes.pop()}onFuncStmt(e){this.returnState=`none`,g.has(e.name.lexeme)?this.diagnostics.push(i(e.name)):this.findDeclaration(e.name.lexeme)!==void 0&&this.diagnostics.push(n(e.name));let t={kind:`function`,token:e.name,arity:e.params?.length??0},r=this.classifyStatements(e.body);this.returnState=r,(r===`void`||r===`value`)&&(t.returnKind=r),this.scopes.at(-1)?.declarations.set(e.name.lexeme,t),this.scopes.push(new _),e.params&&e.params.forEach(e=>{g.has(e.lexeme)?this.diagnostics.push(i(e)):(this.programGlobalNames.has(e.lexeme)||this.findDeclaration(e.lexeme)!==void 0)&&this.diagnostics.push(n(e)),this.scopes.at(-1)?.declarations.set(e.lexeme,{kind:`variable`,token:e})}),e.body.forEach(e=>{this.walkStatement(e)}),this.returnState===`none`?this.diagnostics.push(c(e.name)):this.returnState===`mixed`?this.diagnostics.push(ee(e.name)):t?.kind===`function`&&(this.returnState===`void`?t.returnKind=`void`:this.returnState===`value`&&(t.returnKind=`value`)),this.scopes.pop(),this.returnState=void 0}onAssignment(n){let i=this.findDeclaration(n.name.lexeme);if(g.has(n.name.lexeme)){let e=r(n.name);this.diagnostics.push(e)}else i===void 0?this.diagnostics.push(a(n.name)):i.kind===`function`?this.diagnostics.push(e(n.name)):i.kind===`repeat-variable`&&this.diagnostics.push(t(n.name));this.walkExpression(n.value)}onExprStmt(e){e.expression.type===`Call`?this.onCall(e.expression,!1):this.walkExpression(e.expression)}onVarDecl(e){if(this.walkExpression(e.initializer),g.has(e.name.lexeme))this.diagnostics.push(i(e.name));else if(this.scopes.length>1&&this.programGlobalNames.has(e.name.lexeme))this.diagnostics.push(n(e.name));else if(this.findDeclaration(e.name.lexeme)!==void 0){let t=n(e.name);this.diagnostics.push(t)}else this.scopes.at(-1)?.declarations.set(e.name.lexeme,{kind:`variable`,token:e.name})}onIfStmt(e){this.walkExpression(e.condition),this.scopes.push(new _);for(let t of e.thenBranch)this.walkStatement(t);if(this.scopes.pop(),e.elseBranch){this.scopes.push(new _);for(let t of e.elseBranch)this.walkStatement(t);this.scopes.pop()}}walkExpression(e){switch(e.type){case`Unary`:this.onUnary(e);break;case`Logical`:this.onLogical(e);break;case`Grouping`:this.onGrouping(e);break;case`Call`:this.onCall(e);break;case`Binary`:this.onBinary(e);break;case`Literal`:this.onLiteral(e);break;case`Identifier`:this.onIdentifier(e);break;default:throw Error(`Unhandled type ${e} in Analyser.walkExpression`)}}onUnary(e){this.walkExpression(e.right)}onLogical(e){this.walkExpression(e.left),this.walkExpression(e.right)}onGrouping(e){this.walkExpression(e.expression)}onIdentifier(e){this.findDeclaration(e.name.lexeme)||g.has(e.name.lexeme)||this.diagnostics.push(a(e.name))}onLiteral(e){}onCall(e,t=!0){let n=this.findDeclaration(e.callee.name.lexeme);if(n&&n.kind===`variable`)this.diagnostics.push(o(e.callee.name));else if(m(e.callee.name.lexeme)){let n=p[e.callee.name.lexeme];if(n.kind===`constant`)this.diagnostics.push(o(e.callee.name));else if(n.kind===`function`){let r=n.signatures.filter(t=>t.length===e.arguments.length);if(r.length===0)this.diagnostics.push(s(e.callee.name,(e=>Array.from(new Set(e.signatures.map(e=>e.length))))(n).sort((e,t)=>e-t),e.arguments.length));else{let i=e.arguments.map(ie),a=r.some(e=>e.every((e,t)=>i[t]===void 0||i[t]===e.kind)),o=r[0]?.find((e,t)=>i[t]!==void 0&&i[t]!==e.kind);if(!a&&o&&this.diagnostics.push(d(e.callee.name,o.kind,o.name)),a){let r=ae(e.callee.name,e.arguments);r?this.diagnostics.push(r):n.returnKind===`void`&&t&&this.diagnostics.push(l(e.callee.name))}}}}else n&&n.kind===`function`&&(e.arguments.length===n.arity?n.returnKind===`void`&&t&&this.diagnostics.push(l(e.callee.name)):this.diagnostics.push(s(e.callee.name,n.arity,e.arguments.length)));this.walkExpression(e.callee),e.arguments.forEach(e=>this.walkExpression(e))}onBinary(e){this.walkExpression(e.left),this.walkExpression(e.right)}analyze(){for(let e of this.program.statements)(e.type===`FuncStmt`||e.type===`VarDecl`)&&this.programGlobalNames.add(e.name.lexeme);for(let e of this.program.statements)this.walkStatement(e);return this.program.loopStatement&&this.onLoopStatement(this.program.loopStatement),this.diagnostics}onLoopStatement(e){this.scopes.push(new _);for(let t of e.body)this.walkStatement(t);this.scopes.pop()}};function ie(e){switch(e.type){case`Literal`:return typeof e.value==`number`?`number`:typeof e.value==`string`?`string`:typeof e.value==`boolean`?`boolean`:void 0;case`Unary`:return e.operator.type===`MINUS`&&e.right.type===`Literal`&&typeof e.right.value==`number`?`number`:void 0;default:return}}function v(e){if(e?.type===`Literal`&&typeof e.value==`number`)return e.value;if(e?.type===`Unary`&&e.operator.type===`MINUS`&&e.right.type===`Literal`&&typeof e.right.value==`number`)return-e.right.value}function ae(e,t){switch(e.lexeme){case`sqrt`:{let n=v(t[0]);return n!==void 0&&n<0?u(e):void 0}case`pow`:{let n=v(t[0]),r=v(t[1]);return n!==void 0&&r!==void 0&&!Number.isFinite(n**+r)?u(e):void 0}case`random`:{let n=v(t[0]),r=v(t[1]);return n!==void 0&&r!==void 0&&n>=r?ne(e):void 0}default:return}}var y=class extends Error{line;start;end;constructor(e,t,n,r){super(e),this.name=`GicError`,this.line=t,this.start=n,this.end=r}},b=class extends Error{token;line;start;end;constructor(e,t){super(e),this.name=`ParserError`,this.token=t,this.line=t?.line??0,this.start=t?.start??0,this.end=t?.end??0}},x=class{parent;variables;constructor(e){this.parent=e,this.variables=new Map}get(e){if(this.variables.has(e))return this.variables.get(e);if(this.parent)return this.parent.get(e)}assign(e,t){return this.variables.has(e)?(this.variables.set(e,t),!0):this.parent?this.parent.assign(e,t):!1}set(e,t){this.variables.set(e,t)}};function S(e,t){if(typeof t!=`boolean`)throw new y(`Logical operator '${e.lexeme}' requires boolean operands.`,e.line,e.start,e.end);return t}function oe(e,t){switch(e.type){case`MINUS`:if(typeof t!=`number`)throw new y(`Cannot perform unary operation on non-number value.`,e.line,e.start,e.end);return-t;case`BANG`:if(typeof t!=`boolean`)throw new y(`Cannot perform unary operation on non-boolean value.`,e.line,e.start,e.end);return!t;default:throw Error(`Unknown unary operation: ${e.lexeme}`)}}function se(e,t,n){switch(e.type){case`BANG_EQUAL`:return t!==n;case`EQUAL_EQUAL`:return t===n;case`MODULO`:{let[r,i]=C(e,t,n,`Cannot perform modulo on non-number values.`);if(i===0)throw new y(`Cannot calculate modulo by zero.`,e.line,e.start,e.end);return r%i}case`LESS`:{let[r,i]=C(e,t,n,`Cannot compare non-number values.`);return r<i}case`LESS_EQUAL`:{let[r,i]=C(e,t,n,`Cannot compare non-number values.`);return r<=i}case`GREATER`:{let[r,i]=C(e,t,n,`Cannot compare non-number values.`);return r>i}case`GREATER_EQUAL`:{let[r,i]=C(e,t,n,`Cannot compare non-number values.`);return r>=i}case`PLUS`:if(typeof t==`number`&&typeof n==`number`||typeof t==`string`&&typeof n==`string`)return t+n;throw new y(`Cannot add values unless both are numbers or both are strings.`,e.line,e.start,e.end);case`MINUS`:{let[r,i]=C(e,t,n,`Cannot perform subtraction on non-number values.`);return r-i}case`STAR`:{let[r,i]=C(e,t,n,`Cannot perform multiplication on non-number values.`);return r*i}case`SLASH`:{let[r,i]=C(e,t,n,`Cannot perform division on non-number values.`);if(i===0)throw new y(`Cannot divide by zero.`,e.line,e.start,e.end);return r/i}default:throw Error(`Unknown operator: ${e.lexeme}`)}}function C(e,t,n,r){if(typeof t!=`number`||typeof n!=`number`)throw new y(r,e.line,e.start,e.end);return[t,n]}function w(e,t,n){if(typeof e!=`number`)throw new y(n,t.line,t.start,t.end);return e}var ce=new Set(`aliceblue.antiquewhite.aqua.aquamarine.azure.beige.bisque.black.blanchedalmond.blue.blueviolet.brown.burlywood.cadetblue.chartreuse.chocolate.coral.cornflowerblue.cornsilk.crimson.cyan.darkblue.darkcyan.darkgoldenrod.darkgray.darkgreen.darkgrey.darkkhaki.darkmagenta.darkolivegreen.darkorange.darkorchid.darkred.darksalmon.darkseagreen.darkslateblue.darkslategray.darkslategrey.darkturquoise.darkviolet.deeppink.deepskyblue.dimgray.dimgrey.dodgerblue.firebrick.floralwhite.forestgreen.fuchsia.gainsboro.ghostwhite.gold.goldenrod.gray.green.greenyellow.grey.honeydew.hotpink.indianred.indigo.ivory.khaki.lavender.lavenderblush.lawngreen.lemonchiffon.lightblue.lightcoral.lightcyan.lightgoldenrodyellow.lightgray.lightgreen.lightgrey.lightpink.lightsalmon.lightseagreen.lightskyblue.lightslategray.lightslategrey.lightsteelblue.lightyellow.lime.limegreen.linen.magenta.maroon.mediumaquamarine.mediumblue.mediumorchid.mediumpurple.mediumseagreen.mediumslateblue.mediumspringgreen.mediumturquoise.mediumvioletred.midnightblue.mintcream.mistyrose.moccasin.navajowhite.navy.oldlace.olive.olivedrab.orange.orangered.orchid.palegoldenrod.palegreen.paleturquoise.palevioletred.papayawhip.peachpuff.peru.pink.plum.powderblue.purple.rebeccapurple.red.rosybrown.royalblue.saddlebrown.salmon.sandybrown.seagreen.seashell.sienna.silver.skyblue.slateblue.slategray.slategrey.snow.springgreen.steelblue.tan.teal.thistle.tomato.turquoise.violet.wheat.white.whitesmoke.yellow.yellowgreen`.split(`.`));function le({values:e,token:t}){return{type:`arc`,x:E(e[0],`x`,t),y:E(e[1],`y`,t),radius:E(e[2],`radius`,t),startAngle:E(e[3],`startAngle`,t),endAngle:E(e[4],`endAngle`,t)}}function ue({values:e,token:t}){return{type:`background`,color:T(e,t)}}function de({values:e,token:t}){return{type:`circle`,x:E(e[0],`x`,t),y:E(e[1],`y`,t),radius:E(e[2],`radius`,t)}}function T(e,t){if(e.length===1){let n=Ce(e[0],`value`,t);if(ce.has(n.toLowerCase())||n.match(/^#(?:[\\da-f]{3}|[\\da-f]{4}|[\\da-f]{6}|[\\da-f]{8})$/i))return{kind:`css`,value:n};throw new y(`Invalid color: ${n}`,t.line,t.start,t.end)}if(e.length===3||e.length===4){let n=E(e[0],`lightness`,t),r=E(e[1],`chroma`,t),i=E(e[2],`hue`,t);if(D(n,`lightness`,t,0,100),D(r,`chroma`,t,0,100),D(i,`hue`,t,0,360),e.length===4){let a=E(e[3],`alpha`,t);return D(a,`alpha`,t,0,100),{kind:`oklch`,lightness:n,chroma:r,hue:i,alpha:a}}return{kind:`oklch`,lightness:n,chroma:r,hue:i}}throw new y(`Invalid color: ${e}`,t.line,t.start,t.end)}function fe({values:e,token:t}){return{type:`ellipse`,x:E(e[0],`x`,t),y:E(e[1],`y`,t),width:E(e[2],`width`,t),height:E(e[3],`height`,t)}}function pe({values:e,token:t}){return{type:`fill`,color:T(e,t)}}function me({values:e,token:t}){return{type:`line`,x1:E(e[0],`x1`,t),y1:E(e[1],`y1`,t),x2:E(e[2],`x2`,t),y2:E(e[3],`y2`,t)}}function he(){return{type:`noFill`}}function ge(){return{type:`noStroke`}}function _e({values:e,token:t}){return{type:`point`,x:E(e[0],`x`,t),y:E(e[1],`y`,t)}}function ve({values:e,token:t}){return{type:`quad`,x1:E(e[0],`x1`,t),y1:E(e[1],`y1`,t),x2:E(e[2],`x2`,t),y2:E(e[3],`y2`,t),x3:E(e[4],`x3`,t),y3:E(e[5],`y3`,t),x4:E(e[6],`x4`,t),y4:E(e[7],`y4`,t)}}function ye({values:e,token:t}){return{type:`rect`,x:E(e[0],`x`,t),y:E(e[1],`y`,t),width:E(e[2],`width`,t),height:E(e[3],`height`,t)}}function be({values:e,token:t}){return{type:`strokeWidth`,width:E(e[0],`width`,t)}}function xe({values:e,token:t}){return{type:`stroke`,color:T(e,t)}}function Se({values:e,token:t}){return{type:`triangle`,x1:E(e[0],`x1`,t),y1:E(e[1],`y1`,t),x2:E(e[2],`x2`,t),y2:E(e[3],`y2`,t),x3:E(e[4],`x3`,t),y3:E(e[5],`y3`,t)}}function Ce(e,t,n){if(typeof e!=`string`)throw new y(`Function '${n.lexeme}' requires a string for argument '${t}'.`,n.line,n.start,n.end);return e}function E(e,t,n){if(typeof e!=`number`)throw new y(`Function '${n.lexeme}' requires a number for argument '${t}'.`,n.line,n.start,n.end);return e}function D(e,t,n,r,i){if(e<r||e>i||!Number.isFinite(e))throw new y(`Function '${n.lexeme}' requires argument '${t}' to be between ${r} and ${i}.`,n.line,n.start,n.end);return e}var we={background:ue,fill:pe,noFill:he,noStroke:ge,stroke:xe,strokeWidth:be,point:_e,line:me,arc:le,ellipse:fe,circle:de,rect:ye,quad:ve,triangle:Se};function O(e,t,n){if(typeof e!=`number`)throw new y(`Function '${n.lexeme}' requires a number for argument '${t}'.`,n.line,n.start,n.end);return e}var k={floor:Ee,ceil:De,abs:Oe,min:Ae,max:je,sin:Pe,cos:Fe,sqrt:Me,pow:Ne,round:ke};function A(e,t){if(!Number.isFinite(e))throw new y(`Value '${e}' is not a finite number.`,t.line,t.start,t.end)}function Te(){let e=4294967296,t;return[({values:n,token:r})=>{let i=O(n[0],`min`,r),a=O(n[1],`max`,r);if(A(i,r),A(a,r),i>=a)throw new y(`Function 'random' requires argument 'min' to be less than argument 'max'.`,r.line,r.start,r.end);return t===void 0?Math.random()*(a-i)+i:(t=(1664525*t+1013904223)%e,t/e*(a-i)+i)},({values:e,token:n})=>{let r=O(e[0],`seed`,n);A(r,n),t=r>>>0}]}function Ee({values:e,token:t}){let n=O(e[0],`value`,t);return A(n,t),Math.floor(n)}function De({values:e,token:t}){let n=O(e[0],`value`,t);return A(n,t),Math.ceil(n)}function Oe({values:e,token:t}){let n=O(e[0],`value`,t);return A(n,t),Math.abs(n)}function ke({values:e,token:t}){let n=O(e[0],`value`,t);return A(n,t),Math.round(n)}function Ae({values:e,token:t}){let n=O(e[0],`a`,t),r=O(e[1],`b`,t);return A(n,t),A(r,t),Math.min(n,r)}function je({values:e,token:t}){let n=O(e[0],`a`,t),r=O(e[1],`b`,t);return A(n,t),A(r,t),Math.max(n,r)}function Me({values:e,token:t}){let n=O(e[0],`value`,t);if(A(n,t),n<0)throw new y(`Function 'sqrt' must produce a finite number.`,t.line,t.start,t.end);return Math.sqrt(n)}function Ne({values:e,token:t}){let n=O(e[0],`base`,t),r=O(e[1],`exponent`,t);A(n,t),A(r,t);let i=n**+r;if(!Number.isFinite(i))throw new y(`Function 'pow' must produce a finite number.`,t.line,t.start,t.end);return i}function Pe({values:e,token:t}){let n=O(e[0],`degrees`,t);return A(n,t),Math.sin(j(n))}function Fe({values:e,token:t}){let n=O(e[0],`degrees`,t);return A(n,t),Math.cos(j(n))}var j=e=>Math.PI/180*e,Ie=class{callables=new Map;constructor(){for(let[e,t]of Object.entries(we))this.register(e,{kind:`drawing`,invoke:t});let[e,t]=Te();this.register(`random`,{kind:`pure`,invoke:e}),this.register(`randomSeed`,{kind:`effect`,invoke:t}),this.register(`print`,{kind:`print`});for(let[e,t]of Object.entries(k))this.register(e,{kind:`pure`,invoke:t})}register(e,t){this.callables.set(e,t)}get(e){return this.callables.get(e)}},M=Symbol(`void`),N=class{program;callables=new Ie;globals=new x(null);sink;constructor(e,t){this.program=e,this.sink=t}executeStatement(e,t,n){switch(e.type){case`ReturnStmt`:return this.onReturnStmt(e,t,n);case`FuncStmt`:this.onFuncStmt(e);break;case`RepeatStmt`:return this.onRepeatStmt(e,t,n);case`IfStmt`:return this.onIfStmt(e,t,n);case`Assignment`:this.onAssignment(e,t,n);break;case`VarDecl`:this.onVarDecl(e,t,n);break;case`ExprStmt`:this.onExprStmt(e,t,n)}}onReturnStmt(e,t,n){return e.value?{value:this.evaluateExpression(e.value,t,n),kind:`return`}:{kind:`return`,value:M}}onFuncStmt(e){this.callables.register(e.name.lexeme,{kind:`user`,declaration:e})}onRepeatStmt(e,t,n){let r=w(this.evaluateExpression(e.start,t,n),e.startToken,`Expected repeat start value to be a number.`),i=w(this.evaluateExpression(e.end,t,n),e.endToken,`Expected repeat end value to be a number.`),a=1;if(e.step&&e.stepToken&&(a=w(this.evaluateExpression(e.step,t,n),e.stepToken,`Expected repeat step value to be a number.`)),a===0&&e.stepToken)throw new y(`Repeat step cannot be zero.`,e.stepToken.line,e.stepToken.start,e.stepToken.end);let o=new x(n);for(let n=0;;n++){let s=r+n*a;if(!(a>0?s<i:s>i))break;o.set(e.variable.lexeme,s);let c=this.executeStatements(e.body,t,o);if(c)return c}}onIfStmt(e,t,n){let r=this.evaluateExpression(e.condition,t,n);if(r===M)throw Error(`If condition did not produce a value`);if(typeof r!=`boolean`)throw new y(`Cannot use non-boolean value as condition.`,e.keyword.line,e.keyword.start,e.keyword.end);if(r){let r=new x(n),i=this.executeStatements(e.thenBranch,t,r);if(i)return i}else if(e.elseBranch){let r=new x(n),i=this.executeStatements(e.elseBranch,t,r);if(i)return i}}executeStatements(e,t,n){for(let r of e){let e=this.executeStatement(r,t,n);if(e)return e}}onAssignment(e,t,n){let r=this.evaluateExpression(e.value,t,n);if(r===M)throw Error(`Assignment value did not produce a value '${e.name.lexeme}'`);if(!n.assign(e.name.lexeme,r))throw new y(`Cannot find name '${e.name.lexeme}'.`,e.name.line,e.name.start,e.name.end)}onVarDecl(e,t,n){let r=this.evaluateExpression(e.initializer,t,n);if(r===M)throw Error(`Variable initializer did not produce a value '${e.name.lexeme}'`);n.set(e.name.lexeme,r)}evaluateExpression(e,t,n){switch(e.type){case`Logical`:return this.onLogical(e,t,n);case`Unary`:return this.onUnary(e,t,n);case`Grouping`:return this.onGrouping(e,t,n);case`Binary`:return this.onBinary(e,t,n);case`Literal`:return this.onLiteral(e);case`Identifier`:return this.onIdentifier(e,n);case`Call`:return this.onCall(e,t,n);default:throw Error(`Unknown expression.`)}}onLogical(e,t,n){if(e.operator.type===`AND`||e.operator.type===`OR`){let r=this.evaluateExpression(e.left,t,n);if(r===M)throw Error(`Cannot perform logical operation on void value`);let i=S(e.operator,r);if(i===!1&&e.operator.type===`AND`)return!1;if(i===!0&&e.operator.type===`OR`)return!0;let a=this.evaluateExpression(e.right,t,n);if(a===M)throw Error(`Cannot perform logical operation on void value`);return S(e.operator,a)}throw Error(`Unknown logical operator: ${e.operator.type}`)}onUnary(e,t,n){let r=e.operator,i=this.evaluateExpression(e.right,t,n);if(i===M)throw Error(`Cannot perform unary operation on void value`);return oe(r,i)}onGrouping(e,t,n){let r=this.evaluateExpression(e.expression,t,n);if(r===M)throw Error(`Cannot perform grouping on void value`);return r}onBinary(e,t,n){let r=this.evaluateExpression(e.left,t,n);if(r===M)throw new y(`Cannot perform binary operation on void value`,e.operator.line,e.operator.start,e.operator.end);let i=this.evaluateExpression(e.right,t,n);if(i===M)throw new y(`Cannot perform binary operation on void value`,e.operator.line,e.operator.start,e.operator.end);return se(e.operator,r,i)}onLiteral(e){return e.value}onIdentifier(e,t){let n=t.get(e.name.lexeme);if(n===void 0){if(m(e.name.lexeme)){let t=p[e.name.lexeme];if(t.kind===`constant`)return t.value}throw new y(`Cannot find name '${e.name.lexeme}'`,e.name.line,e.name.start,e.name.end)}return n}onExprStmt(e,t,n){this.evaluateExpression(e.expression,t,n)}onCall(e,t,n){let r=e.arguments.map(e=>this.evaluateExpression(e,t,n)),i=e.callee.name.lexeme,a=this.callables.get(i);if(!a)throw new y(`Function '${i}' not found`,e.callee.name.line,e.callee.name.start,e.callee.name.end);return this.invokeCallable(a,r,e.callee.name,t)}invokeCallable(e,t,n,r){if(e.kind===`drawing`)return r.push(e.invoke({values:t,token:n})),M;if(e.kind===`pure`)return e.invoke({values:t,token:n});if(e.kind===`effect`)return e.invoke({values:t,token:n}),M;if(e.kind===`print`){if(t[0]===void 0)throw Error(`Argument ${n.lexeme} is undefined`);if(t[0]===M)throw new y(`Argument must produce a value`,n.line,n.start,n.end);return this.sink({line:n.line,start:n.start,end:n.end,text:String(t[0])}),M}let i=e.declaration,a=i.params??[];if(t.length!==a.length)throw new y(`Expected ${a.length} arguments, got ${t.length}`,n.line,n.start,n.end);let o=new x(this.globals);for(let[e,r]of a.entries()){let i=t[e];if(i===M)throw new y(`Argument must produce a value`,n.line,n.start,n.end);if(i===void 0)throw Error(`Missing evaluated argument at index ${e}.`);o.set(r.lexeme,i)}let s=this.executeStatements(i.body,r,o);return s?s.value:M}interpret(){let e=[];for(let t of this.program.statements)this.executeStatement(t,e,this.globals);return e}},P=class{lexeme;line;start;end;literal;type;constructor(e,t,n,r,i,a){this.lexeme=t,this.line=r,this.literal=n,this.type=e,this.start=i,this.end=a}toString(){return`${this.type} ${this.lexeme} ${this.literal}`}},F=`LEFT_PAREN`,I=`RIGHT_PAREN`,L=`LEFT_BRACE`,R=`RIGHT_BRACE`,z=`COMMA`,B=`MINUS`,V=`PLUS`,H=`SEMICOLON`,U=`SLASH`,W=`STAR`,Le=`BANG`,G=`BANG_EQUAL`,K=`EQUAL`,q=`EQUAL_EQUAL`,J=`GREATER`,Y=`GREATER_EQUAL`,X=`LESS`,Z=`LESS_EQUAL`,Q=`IDENTIFIER`,Re=`STRING`,ze=`NUMBER`,$=`MODULO`;function Be(e){return e in h}var Ve=class{source;start=0;current=0;line=0;tokens=[];constructor(e){this.source=e}scanTokens(){for(;!this.isAtEnd();)this.start=this.current,this.scanToken();return this.start=this.current,this.tokens.push(new P(`EOF`,``,null,this.line,this.start,this.current)),this.tokens}isAtEnd(){return this.current>=this.source.length}advance(){return this.source.charAt(this.current++)}addToken(e,t=null){let n=this.source.substring(this.start,this.current);this.tokens.push(new P(e,n,t,this.line,this.start,this.current))}scanToken(){let e=this.advance();switch(e){case`(`:this.addToken(F);break;case`)`:this.addToken(I);break;case`{`:this.addToken(L);break;case`}`:this.addToken(R);break;case`,`:this.addToken(z);break;case`|`:if(this.match(`|`))this.addToken(`OR`);else throw new y(`Unexpected |, did you mean '||'?`,this.line,this.start,this.current);break;case`&`:if(this.match(`&`))this.addToken(`AND`);else throw new y(`Unexpected &, did you mean '&&'?`,this.line,this.start,this.current);break;case`%`:this.addToken($);break;case`;`:this.addToken(H);break;case`<`:this.addToken(this.match(`=`)?Z:X);break;case`>`:this.addToken(this.match(`=`)?Y:J);break;case`=`:this.addToken(this.match(`=`)?q:K);break;case`!`:this.addToken(this.match(`=`)?G:Le);break;case`-`:this.addToken(B);break;case`+`:this.addToken(V);break;case`*`:this.addToken(W);break;case`/`:if(this.match(`/`))for(;this.peek()!==`\n`&&!this.isAtEnd();)this.advance();else this.addToken(U);break;case` `:case`\t`:case`\\r`:break;case`\n`:this.line++;break;case`\"`:this.string();break;default:if(this.isDigit(e))this.number();else if(this.isAlpha(e))this.identifier();else throw new y(`Unexpected character`,this.line,this.start,this.current)}}match(e){return this.isAtEnd()||this.source.charAt(this.current)!==e?!1:(this.current++,!0)}string(){for(;this.peek()!==`\"`&&this.peek()!==`\n`&&!this.isAtEnd();)this.advance();if(this.peek()===`\n`||this.isAtEnd())throw new y(`Unterminated string`,this.line,this.start,this.current);this.advance();let e=this.source.substring(this.start+1,this.current-1);this.addToken(Re,e)}peek(){return this.isAtEnd()?`\\0`:this.source.charAt(this.current)}peekNext(){return this.current+1>=this.source.length?`\\0`:this.source.charAt(this.current+1)}identifier(){for(;this.isAlphaNumeric(this.peek());)this.advance();let e=null,t=this.source.substring(this.start,this.current);if(Be(t)){let n=h[t];n===`TRUE`?e=!0:n===`FALSE`&&(e=!1),this.addToken(n,e)}else this.addToken(Q,e)}isAlpha(e){return e>=`a`&&e<=`z`||e>=`A`&&e<=`Z`||e===`_`}isDigit(e){return e>=`0`&&e<=`9`}isAlphaNumeric(e){return this.isAlpha(e)||this.isDigit(e)}number(){for(;this.isDigit(this.peek());)this.advance();if(this.peek()===`.`&&this.isDigit(this.peekNext()))for(this.advance();this.isDigit(this.peek());)this.advance();let e=this.source.substring(this.start,this.current);this.addToken(ze,parseFloat(e))}},He=class{tokens=[];current=0;blockDepth=0;constructor(e){this.tokens=e}parse(){let e=[];for(;!this.isAtEnd()&&!this.check(`LOOP`);)e.push(this.declaration());let t;if(this.match(`LOOP`)&&(t=this.loopStatement()),!this.isAtEnd())throw new b(`Unexpected token '${this.peek()?.lexeme}'.${this.peek()?.type===`LOOP`?` Only one loop block is allowed and it must be the last construct.`:``}`,this.peek());return t?{type:`Program`,statements:e,loopStatement:t}:{type:`Program`,statements:e}}declaration(){return this.match(`LET`)?this.varDeclaration():this.statement()}statement(){if((this.check(`FUNC`)||this.check(`LOOP`))&&this.blockDepth!==0)throw new b(`Unexpected 'func' or 'loop'. Functions and loops can only be declared at the top level.`,this.peek());return this.match(`IF`)?this.ifStatement(this.previous()):this.match(`REPEAT`)?this.repeatStatement():this.match(`FUNC`)?this.funcStatement():this.match(`RETURN`)?this.returnStatement(this.previous()):this.check(`IDENTIFIER`)&&this.checkNext(`EQUAL`)?this.assignment():this.expressionStatement()}returnStatement(e){let t;this.check(`SEMICOLON`)||(t=this.expression()),this.consume(H,t?`Expected ';' after return value.`:`Expected ';' after return keyword.`);let n={type:`ReturnStmt`,keyword:e};return t&&(n.value=t),n}block(){let e=[];for(;!this.check(`RIGHT_BRACE`)&&!this.isAtEnd();)e.push(this.declaration());return this.consume(R,`Expected '}' after block.`),this.blockDepth--,e}funcStatement(){let e=this.consume(Q,`Expected function name.`);this.consume(F,`Expected '(' after function name.`);let t=[];for(;!this.check(`RIGHT_PAREN`)&&!this.isAtEnd()&&(t?.push(this.consume(Q,`Expected parameter name.`)),!this.check(`RIGHT_PAREN`));)this.consume(z,`Expected ',' after parameter.`);this.consume(I,`Expected ')' after parameters.`),this.consume(L,`Expected '{' after parameters.`),this.blockDepth++;let n={type:`FuncStmt`,name:e,body:this.block()};return t!==void 0&&(n.params=t),n}loopStatement(){return this.consume(L,`Expected '{' after loop.`),this.blockDepth++,{type:`LoopStmt`,body:this.block()}}repeatStatement(){this.consume(F,`Expected '(' after 'repeat'.`);let e=this.consume(Q,`Expected loop variable name.`);this.consume(z,`Expected ',' after variable.`);let t=this.peek(),n=this.expression();this.consume(z,`Expected ',' after start.`);let r=this.peek(),i=this.expression(),a;if(this.match(`COMMA`))a={token:this.peek(),expression:this.expression()};else if(!this.check(`RIGHT_PAREN`))throw new b(`Expected ',' after repeat end.`,this.peek());this.consume(I,`Expected ')' after repeat arguments.`),this.consume(L,`Expected '{' before body`),this.blockDepth++;let o={type:`RepeatStmt`,variable:e,start:n,startToken:t,end:i,endToken:r,body:this.block()};return a!==void 0&&(o.step=a.expression,o.stepToken=a.token),o}ifStatement(e){this.consume(F,`Expected '(' after 'if'.`);let t=this.expression();this.consume(I,`Expected ')' after condition.`),this.consume(L,`Expected '{' before body`),this.blockDepth++;let n=this.block(),r;return this.match(`ELSE`)&&(this.match(`IF`)?r=[this.ifStatement(this.previous())]:(this.consume(L,`Expected '{' before else branch`),this.blockDepth++,r=this.block())),r===void 0?{type:`IfStmt`,keyword:e,condition:t,thenBranch:n}:{type:`IfStmt`,keyword:e,condition:t,thenBranch:n,elseBranch:r}}checkNext(e){let t=this.tokens.at(this.current+1);return t!==void 0&&t.type===e}expressionStatement(){let e=this.expression();return this.consume(H,`Expected ';' after expression`),{type:`ExprStmt`,expression:e}}varDeclaration(){let e=this.consume(Q,`Expected variable name.`);this.consume(K,`Expected '=' sign after variable name.`);let t=this.expression();return this.consume(H,`Expected semicolon after variable declaration.`),{type:`VarDecl`,name:e,initializer:t}}expression(){return this.or()}or(){let e=this.and();for(;this.match(`OR`);){let t=this.previous(),n=this.and();e={type:`Logical`,left:e,operator:t,right:n}}return e}and(){let e=this.equality();for(;this.match(`AND`);){let t=this.previous(),n=this.equality();e={type:`Logical`,left:e,operator:t,right:n}}return e}equality(){let e=this.comparison();for(;this.match(G,q);){let t=this.previous(),n=this.comparison();e={type:`Binary`,left:e,operator:t,right:n}}return e}comparison(){let e=this.term();for(;this.match(X,J,Z,Y);){let t=this.previous(),n=this.term();e={type:`Binary`,left:e,operator:t,right:n}}return e}term(){let e=this.factor();for(;this.match(V,B);){let t=this.previous(),n=this.factor();e={type:`Binary`,left:e,operator:t,right:n}}return e}factor(){let e=this.unary();for(;this.match(U,W,$);){let t=this.previous(),n=this.unary();e={type:`Binary`,left:e,operator:t,right:n}}return e}unary(){return this.match(`BANG`,`MINUS`)?{type:`Unary`,operator:this.previous(),right:this.unary()}:this.call()}call(){let e=this.primary();for(;this.match(`LEFT_PAREN`);){if(e.type!==`Identifier`)throw new b(`Only function names can be called.`,this.previous());e=this.finishCall(e)}return e}finishCall(e){let t=[];if(!this.check(`RIGHT_PAREN`))do t.push(this.expression());while(this.match(z));return{type:`Call`,callee:e,arguments:t,paren:this.consume(I,`Expected ')' after arguments.`)}}primary(){if(this.match(`IDENTIFIER`))return{type:`Identifier`,name:this.previous()};if(this.match(`TRUE`,`FALSE`)||this.match(`NUMBER`,`STRING`))return{type:`Literal`,value:this.previous().literal};if(this.match(`LEFT_PAREN`)){let e=this.expression();return this.consume(I,`Expected ')' after expression.`),{type:`Grouping`,expression:e}}throw new b(`Expected Expression.`,this.peek())}assignment(){let e=this.consume(Q,`Expected variable name.`);this.consume(K,`Expected '=' after variable name.`);let t=this.expression();return this.consume(H,`Expected ';' after assignment`),{type:`Assignment`,name:e,value:t}}consume(e,t){if(this.check(e))return this.advance();throw new b(t,this.peek())}match(...e){for(let t of e)if(this.check(t))return this.advance(),!0;return!1}advance(){return this.isAtEnd()||this.current++,this.previous()}previous(){let e=this.tokens.at(this.current-1);if(e===void 0)throw new b(`Previous token is undefined.`,this.tokens.at(this.current-1));return e}check(e){return!this.isAtEnd()&&this.peek()?.type===e}isAtEnd(){return this.peek()?.type===`EOF`}peek(){let e=this.tokens.at(this.current);if(!e)throw new b(`Peeked past end of input.`,e);return e}};function Ue(e){let t=[];try{return{ok:!0,diagnostics:t,program:new He(new Ve(e).scanTokens()).parse()}}catch(e){if(e instanceof y||e instanceof b)t.push({message:e.message,line:e.line,start:e.start,end:e.end});else throw e;return{ok:!1,diagnostics:t}}}function We(e){let t=Ue(e);if(!t.ok)return t;let n=[...t.diagnostics,...new re(t.program).analyze()];return n.length>0?{ok:!1,diagnostics:n}:{ok:!0,program:t.program,diagnostics:n}}function Ge(e){let t=[],n=[];try{let r=We(e);if(t.push(...r.diagnostics),r.ok){let{program:e}=r;return{ok:!0,commands:new N(e,e=>{n.push(e)}).interpret(),diagnostics:t,output:n}}return{ok:!1,diagnostics:t,output:n}}catch(e){if(e instanceof y||e instanceof b)t.push({message:e.message,line:e.line,start:e.start,end:e.end});else throw e;return{ok:!1,diagnostics:t,output:n}}}self.onmessage=e=>{self.postMessage(Ge(e.data.source))}})();",
);
