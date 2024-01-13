export class ReservedWordsHelper {
    private static reservedWords = {
        keyword: [
            "break",
            "case",
            "catch",
            "continue",
            "debugger",
            "default",
            "do",
            "else",
            "finally",
            "for",
            "function",
            "if",
            "return",
            "switch",
            "throw",
            "try",
            "var",
            "const",
            "while",
            "with",
            "new",
            "this",
            "super",
            "class",
            "extends",
            "export",
            "import",
            "null",
            "true",
            "false",
            "in",
            "instanceof",
            "typeof",
            "void",
            "delete",
        ],
        strict: [
            "implements",
            "interface",
            "let",
            "package",
            "private",
            "protected",
            "public",
            "static",
            "yield",
        ],
        strictBind: ["eval", "arguments"],
    };

    private static reservedDepends = ['Object',
        'Function',
        'Boolean',
        'Symbol',
        'Error',
        'AggregateError',
        'EvalError',
        'RangeError',
        'ReferenceError',
        'SyntaxError',
        'TypeError',
        'URIError',
        'InternalError',
        'Number',
        'BigInt',
        'Math',
        'Date',
        'String',
        'RegExp',
        'Array',
        'Int8Array',
        'Uint8Array',
        'Uint8ClampedArray',
        'Int16Array',
        'Uint16Array',
        'Int32Array',
        'Uint32Array',
        'BigInt64Array',
        'BigUint64Array',
        'Float32Array',
        'Float64Array',
        'Map',
        'Set',
        'WeakMap',
        'WeakSet',
        'ArrayBuffer',
        'SharedArrayBuffer',
        'DataView',
        'Atomics',
        'JSON',
        'WeakRef',
        'FinalizationRegistry',
        'Iterator',
        'AsyncIterator',
        'Promise',
        'GeneratorFunction',
        'AsyncGeneratorFunction',
        'Generator',
        'AsyncGenerator',
        'AsyncFunction',
        'Reflect',
        'Proxy',
        'Intl',
        'console'];

    private static keywords = new Set(ReservedWordsHelper.reservedWords.keyword);
    private static reservedWordsStrictSet = new Set(ReservedWordsHelper.reservedWords.strict);
    private static reservedWordsStrictBindSet = new Set(ReservedWordsHelper.reservedWords.strictBind);
    private static reservedDependencies = new Set(ReservedWordsHelper.reservedDepends);

    /**
     * Checks if word is a reserved word in non-strict mode
     */
    static isReservedWord(word: string, inModule: boolean): boolean {
        return (inModule && word === "await") || word === "enum";
    }

    static isReservedDependency(word: string): boolean {
        return ReservedWordsHelper.reservedDependencies.has(word);
    }

    /**
     * Checks if word is a reserved word in non-binding strict mode
     *
     * Includes non-strict reserved words
     */
    static isStrictReservedWord(word: string, inModule: boolean): boolean {
        return ReservedWordsHelper.isReservedWord(word, inModule) || ReservedWordsHelper.reservedWordsStrictSet.has(word);
    }

    /**
     * Checks if word is a reserved word in binding strict mode, but it is allowed as
     * a normal identifier.
     */
    static isStrictBindOnlyReservedWord(word: string): boolean {
        return ReservedWordsHelper.reservedWordsStrictBindSet.has(word);
    }

    /**
     * Checks if word is a reserved word in binding strict mode
     *
     * Includes non-strict reserved words and non-binding strict reserved words
     */
    static isStrictBindReservedWord(word: string, inModule: boolean): boolean {
        return (ReservedWordsHelper.isStrictReservedWord(word, inModule) || ReservedWordsHelper.isStrictBindOnlyReservedWord(word));
    }

    static isKeyword(word: string): boolean {
        return ReservedWordsHelper.keywords.has(word);
    }

}