interface ITokenOptions {
    label: string, before?: boolean, starts?: boolean, prefix?: boolean, postfix?: boolean,
    binop?: number, isAssign?: boolean, rightAssociative?: boolean, isLoop?: boolean
}
const before = true, starts = true, isLoop = true, isAssign = true, prefix = true, postfix = true;

export class Tokens {
    private static infos: ITokenOptions[] = [];
    private static keywords = new Map<string, number>();

    static createToken(options: ITokenOptions | string, isWord: boolean = false): number {
        const _opt = (typeof options == 'string') ? { label: options } : options;
        const tokenId = Tokens.infos.length;
        Tokens.infos.push(_opt);
        if (isWord)
            Tokens.keywords.set(_opt.label, tokenId);
        return tokenId;
    }

    static label(token: number): string {
        return Tokens.infos[token]?.label;
    }

    static keywordToken(word: string): number | undefined {
        return Tokens.keywords.get(word);
    }

    static isKeyword(token: number): boolean {
        return token >= tokenTypes._in && token <= tokenTypes._while;
    }

    static isIdentifier(token: number): boolean {
        return token >= tokenTypes._as && token <= tokenTypes.name;
    }

    static isAssignment(token: number): boolean {
        return token >= tokenTypes.eq && token <= tokenTypes.moduloAssign;
    }

    static isLiteralPropertyName(token: number): boolean {
        return token >= tokenTypes._in && token <= tokenTypes.decimal;
    }

    static isTemplate(token: number): boolean {
        return token >= tokenTypes.templateTail && token <= tokenTypes.templateNonTail;
    }

    static isPrefix(token: number): boolean {
        return !!this.infos[token].prefix;
    }

    static isPostfix(token: number): boolean {
        return !!this.infos[token].postfix;
    }

    static canStartExpression(token: number): boolean {
        return !!this.infos[token].starts;
    }

    static operatorPrecedence(token: number): number {
        return this.infos[token]?.binop ?? -1;
    }

    static isOperator(token: number): boolean {
        return token >= tokenTypes.pipeline && token <= tokenTypes._instanceof;
    }

    static isKeywordOrIdentifier(token: number): boolean {
        return token >= tokenTypes._in && token <= tokenTypes.name;
    }

    static keywordOrIdentifierIsKeyword(token: number): boolean {
        return token <= tokenTypes._while;
    }

    static isLoop(token: number): boolean {
        return token >= tokenTypes._do && token <= tokenTypes._while;
    }

    static isTSDeclarationStart(token: number): boolean {
        return token >= tokenTypes._abstract && token <= tokenTypes._type;
    }

    static isTSTypeOperator(token: number): boolean {
        return token >= tokenTypes._keyof && token <= tokenTypes._unique;
    }

}

export const tokenTypes = {
    bracketL: Tokens.createToken({ label: "[", before, starts }),
    bracketHashL: Tokens.createToken({ label: "#[", before, starts }),
    bracketBarL: Tokens.createToken({ label: "[|", before, starts }),
    bracketR: Tokens.createToken("]"),
    bracketBarR: Tokens.createToken("|]"),
    braceL: Tokens.createToken({ label: "{", before, starts }),
    braceBarL: Tokens.createToken({ label: "{|", before, starts }),
    braceHashL: Tokens.createToken({ label: "#{", before, starts }),
    braceR: Tokens.createToken("}"),
    braceBarR: Tokens.createToken("|}"),
    parenL: Tokens.createToken({ label: "(", before, starts }),
    parenR: Tokens.createToken(")"),
    comma: Tokens.createToken({ label: ",", before }),
    semi: Tokens.createToken({ label: ";", before }),
    colon: Tokens.createToken({ label: ":", before }),
    doubleColon: Tokens.createToken({ label: "::", before }),
    dot: Tokens.createToken("."),
    question: Tokens.createToken({ label: "?", before }),
    questionDot: Tokens.createToken("?."),
    arrow: Tokens.createToken({ label: "=>", before }),
    template: Tokens.createToken("template"),
    ellipsis: Tokens.createToken({ label: "...", before }),
    backQuote: Tokens.createToken({ label: "`", starts }),
    dollarBraceL: Tokens.createToken({ label: "${", before, starts }),
    templateTail: Tokens.createToken({ label: "...`", starts }),
    templateNonTail: Tokens.createToken({ label: "...${", before, starts }),
    at: Tokens.createToken("@"),
    hash: Tokens.createToken({ label: "#", starts }),
    interpreterDirective: Tokens.createToken("#!..."),
    eq: Tokens.createToken({ label: "=", before, isAssign }),
    assign: Tokens.createToken({ label: "_=", before, isAssign }),
    slashAssign: Tokens.createToken({ label: "_=", before, isAssign }),
    xorAssign: Tokens.createToken({ label: "_=", before, isAssign }),
    moduloAssign: Tokens.createToken({ label: "_=", before, isAssign }),
    incDec: Tokens.createToken({ label: "++/--", prefix, postfix, starts }),
    bang: Tokens.createToken({ label: "!", before, prefix, starts }),
    tilde: Tokens.createToken({ label: "~", before, prefix, starts }),
    doubleCaret: Tokens.createToken({ label: "^^", starts }),
    doubleAt: Tokens.createToken({ label: "@@", starts }),
    pipeline: Tokens.createToken({ label: "|>", before, binop: 0 }),
    nullishCoalescing: Tokens.createToken({ label: "??", before, binop: 1 }),
    logicalOR: Tokens.createToken({ label: "||", before, binop: 1 }),
    logicalAND: Tokens.createToken({ label: "&&", before, binop: 2 }),
    bitwiseOR: Tokens.createToken({ label: "|", before, binop: 3 }),
    bitwiseXOR: Tokens.createToken({ label: "^", before, binop: 4 }),
    bitwiseAND: Tokens.createToken({ label: "&", before, binop: 5 }),
    equality: Tokens.createToken({ label: "==/!=/===/!==", before, binop: 6 }),
    lt: Tokens.createToken({ label: "</>/<=/>=", before, binop: 7 }),
    gt: Tokens.createToken({ label: "</>/<=/>=", before, binop: 7 }),
    relational: Tokens.createToken({ label: "</>/<=/>=", before, binop: 7 }),
    bitShift: Tokens.createToken({ label: "<</>>/>>>", before, binop: 8 }),
    bitShiftL: Tokens.createToken({ label: "<</>>/>>>", before, binop: 8 }),
    bitShiftR: Tokens.createToken({ label: "<</>>/>>>", before, binop: 8 }),
    plusMin: Tokens.createToken({ label: "+/-", before, binop: 9, prefix, starts }),
    modulo: Tokens.createToken({ label: "%", binop: 10, starts }),
    star: Tokens.createToken({ label: "*", binop: 10 }),
    slash: Tokens.createToken({ label: "/", before, binop: 10 }),
    exponent: Tokens.createToken({ label: "**", before, binop: 11, rightAssociative: true }),

    _in: Tokens.createToken({ label: "in", before, binop: 7 }, true),
    _instanceof: Tokens.createToken({ label: "instanceof", before, binop: 7 }, true),
    _break: Tokens.createToken("break", true),
    _case: Tokens.createToken({ label: "case", before }, true),
    _catch: Tokens.createToken("catch", true),
    _continue: Tokens.createToken("continue", true),
    _debugger: Tokens.createToken("debugger", true),
    _default: Tokens.createToken({ label: "default", before }, true),
    _else: Tokens.createToken({ label: "else", before }, true),
    _finally: Tokens.createToken("finally", true),
    _function: Tokens.createToken({ label: "function", starts }, true),
    _if: Tokens.createToken("if", true),
    _return: Tokens.createToken({ label: "return", before }, true),
    _switch: Tokens.createToken("switch", true),
    _throw: Tokens.createToken({ label: "throw", before, prefix, starts }, true),
    _try: Tokens.createToken("try", true),
    _var: Tokens.createToken("var", true),
    _const: Tokens.createToken("const", true),
    _with: Tokens.createToken("with", true),
    _new: Tokens.createToken({ label: "new", before, starts }, true),
    _this: Tokens.createToken({ label: "this", starts }, true),
    _super: Tokens.createToken({ label: "super", starts }, true),
    _class: Tokens.createToken({ label: "class", starts }, true),
    _extends: Tokens.createToken({ label: "extends", before }, true),
    _export: Tokens.createToken("export", true),
    _import: Tokens.createToken({ label: "import", starts }, true),
    _null: Tokens.createToken({ label: "null", starts }, true),
    _true: Tokens.createToken({ label: "true", starts }, true),
    _false: Tokens.createToken({ label: "false", starts }, true),
    _typeof: Tokens.createToken({ label: "typeof", before, prefix, starts }, true),
    _void: Tokens.createToken({ label: "void", before, prefix, starts }, true),
    _delete: Tokens.createToken({ label: "delete", before, prefix, starts }, true),
    _do: Tokens.createToken({ label: "do", isLoop, before }, true),
    _for: Tokens.createToken({ label: "for", isLoop }, true),
    _while: Tokens.createToken({ label: "while", isLoop }, true),
    _as: Tokens.createToken({ label: "as", starts }, true),
    _assert: Tokens.createToken({ label: "assert", starts }, true),
    _async: Tokens.createToken({ label: "async", starts }, true),
    _await: Tokens.createToken({ label: "await", starts }, true),
    _from: Tokens.createToken({ label: "from", starts }, true),
    _get: Tokens.createToken({ label: "get", starts }, true),
    _let: Tokens.createToken({ label: "let", starts }, true),
    _meta: Tokens.createToken({ label: "meta", starts }, true),
    _of: Tokens.createToken({ label: "of", starts }, true),
    _sent: Tokens.createToken({ label: "sent", starts }, true),
    _set: Tokens.createToken({ label: "set", starts }, true),
    _static: Tokens.createToken({ label: "static", starts }, true),
    _using: Tokens.createToken({ label: "using", starts }, true),
    _yield: Tokens.createToken({ label: "yield", starts }, true),

    _asserts: Tokens.createToken({ label: "asserts", starts }, true),
    _checks: Tokens.createToken({ label: "checks", starts }, true),
    _exports: Tokens.createToken({ label: "exports", starts }, true),
    _global: Tokens.createToken({ label: "global", starts }, true),
    _implements: Tokens.createToken({ label: "implements", starts }, true),
    _intrinsic: Tokens.createToken({ label: "intrinsic", starts }, true),
    _infer: Tokens.createToken({ label: "infer", starts }, true),
    _is: Tokens.createToken({ label: "is", starts }, true),
    _mixins: Tokens.createToken({ label: "mixins", starts }, true),
    _proto: Tokens.createToken({ label: "proto", starts }, true),
    _require: Tokens.createToken({ label: "require", starts }, true),
    _satisfies: Tokens.createToken({ label: "satisfies", starts }, true),
    _keyof: Tokens.createToken({ label: "keyof", starts }, true),
    _readonly: Tokens.createToken({ label: "readonly", starts }, true),
    _unique: Tokens.createToken({ label: "unique", starts }, true),
    _abstract: Tokens.createToken({ label: "abstract", starts }, true),
    _declare: Tokens.createToken({ label: "declare", starts }, true),
    _enum: Tokens.createToken({ label: "enum", starts }, true),
    _module: Tokens.createToken({ label: "module", starts }, true),
    _namespace: Tokens.createToken({ label: "namespace", starts }, true),
    _interface: Tokens.createToken({ label: "interface", starts }, true),
    _type: Tokens.createToken({ label: "type", starts }, true),
    _opaque: Tokens.createToken({ label: "opaque", starts }, true),
    name: Tokens.createToken({ label: "name", starts }),

    string: Tokens.createToken({ label: "string", starts }),
    num: Tokens.createToken({ label: "num", starts }),
    bigint: Tokens.createToken({ label: "bigint", starts }),
    decimal: Tokens.createToken({ label: "decimal", starts }),
    regexp: Tokens.createToken({ label: "regexp", starts }),
    privateName: Tokens.createToken({ label: "#name", starts }),
    eof: Tokens.createToken("eof"),

    // jsx plugin
    jsxName: Tokens.createToken("jsxName"),
    jsxText: Tokens.createToken({ label: "jsxText", before: true }),
    jsxTagStart: Tokens.createToken({ label: "jsxTagStart", starts: true }),
    jsxTagEnd: Tokens.createToken("jsxTagEnd"),
    placeholder: Tokens.createToken({ label: "%%", starts: true }),
} as const;

export const tokenContextTypes = {
    brace: { token: "{" }, // normal JavaScript expression
    j_oTag: { token: "<tag" }, // JSX opening tag
    j_cTag: { token: "</tag" }, // JSX closing tag
    j_expr: { token: "<tag>...</tag>", preserveSpace: true }, // JSX expressions
};