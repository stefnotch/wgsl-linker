import {
  Parser,
  TestParseResult,
  _withBaseLogger,
  expectNoLogErr,
  logCatch,
  or,
  preParse,
  repeat,
  testParse,
} from "mini-parse";
import { expect, test } from "vitest";
import {
  AbstractElem,
  FnElem,
  ImportElem,
  ModuleElem,
  StructElem,
  TemplateElem,
  VarElem,
} from "../AbstractElems.js";
import {
  directive,
  importing,
  lineCommentOptDirective,
} from "../ParseDirective.js";
import { filterElems } from "../ParseModule2.js";
import {
  blockComment,
  comment,
  unknown,
  wordNumArgs,
} from "../ParseSupport.js";
import {
  fnDecl,
  globalVar,
  parseWgslD,
  structDecl,
  typeSpecifier,
} from "../ParseWgslD.js";
import { mainTokens } from "../MatchWgslD.js";

function testAppParse<T>(
  parser: Parser<T>,
  src: string
): TestParseResult<T, AbstractElem> {
  return testParse(parser, src, mainTokens);
}

test("parse empty string", () => {
  const parsed = parseWgslD("");
  expect(parsed).toMatchSnapshot();
});

test("directive parses #export", () => {
  const { appState } = testAppParse(directive, "#export");
  expect(appState[0].kind).equals("export");
});

test("parse #export", () => {
  const parsed = parseWgslD("#export");
  expect(parsed[0].kind).equals("export");
});

test("parse #import foo", () => {
  const parsed = parseWgslD("#import foo");
  expect(parsed).toMatchSnapshot();
});

test("parse #import foo(a,b) as baz from bar", () => {
  const parsed = parseWgslD("#import foo as baz from bar");
  expect(parsed).toMatchSnapshot();
});

test("lineComment parse // foo bar", () => {
  const src = "// foo bar";
  const { position } = testAppParse(lineCommentOptDirective, src);
  expect(position).eq(src.length);
});

test("lineComment parse // foo bar \\n", () => {
  const src = "// foo bar\n";
  const { position } = testAppParse(lineCommentOptDirective, src);
  expect(position).eq(src.length);
});

test("lineComment parse // #export ", () => {
  const src = "// #export ";
  const { position, appState: app } = testParse(lineCommentOptDirective, src);
  expect(position).eq(src.length);
  expect(app).toMatchSnapshot();
});

test("parse fn foo() { }", () => {
  const src = "fn foo() { }";
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse fn with calls", () => {
  const src = "fn foo() { foo(); bar(); }";
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("structDecl parses struct member types", () => {
  const src = "struct Foo { a: f32, b: i32 }";
  const { appState } = testAppParse(structDecl, src);
  const { typeRefs } = appState[0] as StructElem;
  expect(typeRefs[0].name).eq("f32");
  expect(typeRefs[1].name).eq("i32");
});

test("parse struct", () => {
  const src = "struct Foo { a: f32, b: i32 }";
  const parsed = parseWgslD(src);
  expect(parsed).toMatchInlineSnapshot(`
    [
      {
        "end": 29,
        "kind": "struct",
        "members": [
          {
            "end": 19,
            "kind": "member",
            "name": "a",
            "start": 13,
          },
          {
            "end": 27,
            "kind": "member",
            "name": "b",
            "start": 21,
          },
        ],
        "name": "Foo",
        "start": 0,
        "typeRefs": [
          {
            "end": 19,
            "kind": "typeRef",
            "name": "f32",
            "start": 16,
          },
          {
            "end": 27,
            "kind": "typeRef",
            "name": "i32",
            "start": 24,
          },
        ],
      },
    ]
  `);
});

test("parse fn with line comment", () => {
  const src = `
    fn binaryOp() { // binOpImpl
    }`;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("lineCommentOptDirective parses #export(foo) with trailing space", () => {
  const src = `// #export (Elem)    `;
  const result = testAppParse(lineCommentOptDirective, src);
  expect(result.appState[0].kind).eq("export");
});

test("parse #export(foo) with trailing space", () => {
  const src = `
    // #export (Elem) 
  `;

  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse #if #endif", () => {
  const src = `
    #if foo
    fn f() { }
    #endif
    `;
  const parsed = parseWgslD(src, { foo: true });
  expect(parsed.length).eq(1);
  expect((parsed[0] as FnElem).name).eq("f");
});

test("parse // #if !foo", () => {
  const src = `
    // #if !foo
      fn f() { }
    // #endif 
    `;
  const parsed = parseWgslD(src, { foo: false });
  expect((parsed[0] as FnElem).name).eq("f");
});

test("parse #if !foo (true)", () => {
  const src = `
    // #if !foo
      fn f() { }
    // #endif 
    `;
  expectNoLogErr(() => {
    parseWgslD(src, { foo: true });
  });
});

test("parse #if !foo #else #endif", () => {
  const src = `
    // #if !foo
      fn f() { notfoo(); }
    // #else
      fn g() { foo(); }
    // #endif 
    `;
  const parsed = parseWgslD(src, { foo: true });
  expect(parsed.length).eq(1);
  expect((parsed[0] as FnElem).name).eq("g");
});

test("parse nested #if", () => {
  const src = `
    #if foo

    #if bar
      fn f() { }
    #endif 

    #if zap
      fn zap() { }
    #endif

      fn g() { }
    #endif 
    `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src, { foo: true, zap: true });
    expect(parsed.length).eq(2);
    expect((parsed[0] as FnElem).name).eq("zap");
    expect((parsed[1] as FnElem).name).eq("g");
  });
});

test("importing parses importing bar(A) fog(B)", () => {
  const src = ` importing bar(A), fog(B)`;
  const { parsed } = testAppParse(importing, src);
  expect(parsed?.named.importing).toMatchSnapshot();
});

test("parse #export(A, B) importing bar(A)", () => {
  const src = `
    #export(A, B) importing bar(A)
    fn foo(a:A, b:B) { bar(a); }
  `;
  const parsed = parseWgslD(src, { foo: true });
  expect(parsed[0]).toMatchSnapshot();
});

test("parse @attribute before fn", () => {
  const src = `
    @compute 
    fn main() {}
    `;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("wordNumArgs parses (a, b, 1)", () => {
  const src = `(a, b, 1)`;
  const { parsed } = testAppParse(wordNumArgs, src);
  expect(parsed?.value).toMatchSnapshot();
});

test("wordNumArgs parses (a, b, 1) with line comments everywhere", () => {
  const src = `(
    // aah
    a, 
    // boh
    b, 
    // oneness
    1
    // satsified
    )`;
  const { parsed } = testAppParse(preParse(comment, wordNumArgs), src);
  expect(parsed?.value).toMatchSnapshot();
});

test("parse @compute @workgroup_size(a, b, 1) before fn", () => {
  const src = `
    @compute 
    @workgroup_size(a, b, 1) 
    fn main() {}
    `;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse and ignore global diagnostic", () => {
  const src = `
    diagnostic(off,derivative_uniformity);

    fn main() {}
    `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse and ignore const_assert", () => {
  const src = `
    const_assert x < y;

    fn main() {}
    `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse top level var", () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: Uniforms;      

    fn main() {}
  `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse top level override and const", () => {
  const src = `
    override x = 21;
    const y = 1;

    fn main() {}
  `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse root level ;;", () => {
  const src = ";;";
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse alias", () => {
  const src = `
    alias RTArr = array<vec4<f32>>;
  `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("blockComment parses /* comment */", () => {
  const src = "/* comment */";
  expectNoLogErr(() => {
    const { parsed } = testAppParse(blockComment, src);
    expect(parsed).toMatchSnapshot();
  });
});

test("skipBlockComment parses nested comment", () => {
  const src = "/** comment1 /* comment2 */ */";
  expectNoLogErr(() => {
    testAppParse(blockComment, src);
  });
});

test("unexpected token", () => {
  const p = repeat(or("a", unknown));
  const { log, logged } = logCatch();
  _withBaseLogger(log, () => testAppParse(p, "a b"));
  expect(logged()).toMatchInlineSnapshot(`
    "??? word: 'b'
    a b   Ln 1
      ^"
  `);
});

test("#export w/o closing paren", () => {
  const src = `#export (A
    )
    `;
  const { log, logged } = logCatch();
  _withBaseLogger(log, () => parseWgslD(src));
  expect(logged()).toMatchInlineSnapshot(`
    "expected text ')''
    #export (A   Ln 1
              ^"
  `);
});

test("fnDecl parses fn with return type", () => {
  const src = `
    fn foo() -> MyType { }
  `;
  const { appState } = testAppParse(fnDecl, src);
  expect((appState[0] as FnElem).typeRefs[0].name).eq("MyType");
});

test("fnDecl parses :type specifier in fn args", () => {
  const src = `
    fn foo(a: MyType) { }
  `;
  const { appState } = testAppParse(fnDecl, src);
  const { typeRefs } = appState[0] as FnElem;
  expect(typeRefs[0].name).eq("MyType");
});

test("fnDecl parses :type specifier in fn block", () => {
  const src = `
    fn foo() { 
      var b:MyType;
    }
  `;
  const { appState } = testAppParse(fnDecl, src);
  expect((appState[0] as FnElem).typeRefs[0].name).eq("MyType");
});

test("parse type in <template> in fn args", () => {
  const src = `
    fn foo(a: vec2<MyStruct>) { };`;

  const { appState } = testAppParse(fnDecl, src);
  const { typeRefs } = appState[0] as FnElem;
  expect(typeRefs[0].name).eq("vec2");
  expect(typeRefs[1].name).eq("MyStruct");
});

test("parse simple templated type", () => {
  const src = `array<MyStruct,4>`;

  const { parsed } = testAppParse(typeSpecifier, src);
  expect(parsed?.value[0].name).eq("array");
  expect(parsed?.value[1].name).eq("MyStruct");
  expect(parsed?.value.length).eq(2);
});

test("parse nested template that ends with >> ", () => {
  const src = `vec2<array <MyStruct,4>>`;

  const { parsed } = testAppParse(typeSpecifier, src);
  const typeRefNames = parsed?.value.map((r) => r.name);
  expect(typeRefNames).deep.eq(["vec2", "array", "MyStruct"]);
});

test("parse struct member with templated type", () => {
  const src = `struct Foo { a: vec2<array<Bar,4>> }`;
  const { appState } = testAppParse(structDecl, src);
  const typeRefs = (appState[0] as StructElem).typeRefs;
  const typeRefNames = typeRefs.map((r) => r.name);
  expect(typeRefNames).deep.eq(["vec2", "array", "Bar"]);
});

test("parse type in <template> in global var", () => {
  const src = `
    var x:vec2<MyStruct> = { x: 1, y: 2 };`;

  const { appState } = testAppParse(globalVar, src);
  const typeRefs = (appState[0] as VarElem).typeRefs;
  expect(typeRefs[0].name).eq("vec2");
  expect(typeRefs[1].name).eq("MyStruct");
});

test("parse #importMerge", () => {
  const src = `#importMerge Foo(a,b) as Bar from baz`;
  const appState = parseWgslD(src);
  expect(appState[0]).toMatchInlineSnapshot(`
    {
      "args": [
        "a",
        "b",
      ],
      "as": "Bar",
      "end": 37,
      "from": "baz",
      "kind": "importMerge",
      "name": "Foo",
      "start": 0,
    }
  `);
});

test("parse #module foo.bar.ca", () => {
  const src = `#module foo.bar.ca`;
  const appState = parseWgslD(src);
  expect(appState[0].kind).eq("module");
  expect((appState[0] as ModuleElem).name).eq("foo.bar.ca");
});

test("parse import with numeric types", () => {
  const nums = "1u 2.0F 0x010 -7.0 1e7".split(" ");
  const src = `#import foo(${nums.join(",")})`;
  const appState = parseWgslD(src);
  expect((appState[0] as ImportElem).args).deep.eq(nums);
});

test("parse template", () => {
  const src = `#template foo.cz/magic-strings`;
  const appState = parseWgslD(src);
  expect((appState[0] as TemplateElem).name).deep.eq("foo.cz/magic-strings");
});

test("parse for(;;) {} not as a fn call", () => {
  const src = `
    fn main() {
      for (var a = 1; a < 10; a++) {}
    }
  `;
  const appState = parseWgslD(src);
  const fnElem = filterElems<FnElem>(appState, "fn")[0];
  expect(fnElem).toBeDefined();
  expect(fnElem.calls.length).eq(0);
});

test("eolf followed by comment", () => {
  const src = `
    // #if typecheck
    // #endif

    // #export
    fn foo() { }
  `;
  expectNoLogErr(() => parseWgslD(src));
});

test.skip("#if inside struct", () => {
  const src = `
  struct Input { 
  // #if typecheck 
  // #endif
  }`;

  // parseWgslD(src);
  expectNoLogErr(() => parseWgslD(src));
});

test("parse empty line comment", () => {
  const src = `
  var workgroupThreads= 4;                          // 
  `;
  expectNoLogErr(() => parseWgslD(src));
});

test("parse line comment with #replace", () => {
  const src = ` 
  const workgroupThreads= 4;                          // #replace 4=workgroupThreads
  `;
  expectNoLogErr(() => parseWgslD(src));
});
