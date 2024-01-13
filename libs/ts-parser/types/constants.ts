import { CharCodes } from "../tokens/charcodes";

export const enum ParseFunctionFlag {
    Expression = 0b0000,
    Declaration = 0b0001,
    HangingDeclaration = 0b0010,
    NullableId = 0b0100,
    Async = 0b1000,
}

export const enum ParseBindingListFlags {
    ALLOW_EMPTY = 1 << 0,
    IS_FUNCTION_PARAMS = 1 << 1,
    IS_CONSTRUCTOR_PARAMS = 1 << 2,
}

export const enum ParseStatementFlag {
    StatementOnly = 0b0000,
    AllowImportExport = 0b0001,
    AllowDeclaration = 0b0010,
    AllowFunctionDeclaration = 0b0100,
    AllowLabeledFunction = 0b1000,
    AllowAll = AllowImportExport | AllowDeclaration | AllowFunctionDeclaration | AllowLabeledFunction,
    AllowAnyDeclaration = AllowDeclaration | AllowFunctionDeclaration
}

export const RegExPattern = {
    skipWhiteSpace: /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g,
    skipWhiteSpaceInLine: /(?:[^\S\n\r\u2028\u2029]|\/\/.*|\/\*.*?\*\/)*/g,
    lineBreak: /\r\n?|[\n\u2028\u2029]/,
    lineBreakG: /\r\n?|[\n\u2028\u2029]/g,
    skipWhiteSpaceToLineBreak: /(?=((?:[^\S\n\r\u2028\u2029]|\/\/.*|\/\*.*?\*\/)*))\1(?=[\n\r\u2028\u2029]|\/\*(?!.*?\*\/)|$)/y,
    keywordRelationalOperator: /in(?:stanceof)?/y,
    loneSurrogate: /[\uD800-\uDFFF]/u
};

export const TopLevelNodes = new Set(["Program", "ModuleExpression", "ClassDeclaration", "ClassExpression", "ClassBody", "Decorator"]);


const regExFlags = [CharCodes.lowercaseG, CharCodes.lowercaseM, CharCodes.lowercaseS,
CharCodes.lowercaseI, CharCodes.lowercaseY, CharCodes.lowercaseU, CharCodes.lowercaseD, CharCodes.lowercaseV] as const;
export const VALID_REGEX_FLAGS = new Set(regExFlags);

export type ValidRegexFlags = typeof regExFlags[number];