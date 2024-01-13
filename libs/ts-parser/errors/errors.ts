/* eslint-disable @typescript-eslint/ban-types */
import { ErrorDetails, IPosition, LValAncestor, TsAccessibility, TsModifier } from "../types/basic";
import { toNodeDescription } from "./errors.description";

function ParseErrorEnum<T extends { [key: string]: string | Function }>(enums: T): { [K in keyof T]: ErrorDetails } {
    return Object.entries(enums).reduce((prev, [key, v]) => {
        prev[key] = { code: key, message: v };
        return prev;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as any);
}

const StandardErrors = {
    MissingFeature: ({ missingFeature }: { missingFeature: [string] }) =>
        `This experimental syntax requires enabling the parser Feature: ${missingFeature
            .map(name => JSON.stringify(name))
            .join(", ")}.`,
    InvalidEscapedReservedWord: ({ reservedWord }: { reservedWord: string }) => `Escape sequence in keyword ${reservedWord}.`,
    InvalidDigit: ({ radix }: { radix: number }) => `Expected number in radix ${radix}.`,
    InvalidOrUnexpectedToken: ({ unexpected }: { unexpected: string }) => `Unexpected character '${unexpected}'.`,
    UnexpectedToken: ({ expected, unexpected }: { expected?: string | null; unexpected?: string | null; }) =>
        `Unexpected token${unexpected ? ` '${unexpected}'.` : ""}${expected ? `, expected "${expected}"` : ""}`,
    InvalidPrivateFieldResolution: ({ identifierName }: { identifierName: string; }) =>
        `Private name #${identifierName} is not defined.`,
    PrivateNameRedeclaration: ({ identifierName }: { identifierName: string }) => `Duplicate private name #${identifierName}.`,
    VarRedeclaration: ({ identifierName }: { identifierName: string }) => `Identifier '${identifierName}' has already been declared.`,
    InvalidLhs: ({ ancestor }: { ancestor: LValAncestor }) => `Invalid left-hand side in ${toNodeDescription(ancestor)}.`,
    InvalidLhsBinding: ({ ancestor }: { ancestor: LValAncestor }) => `Binding invalid left-hand side in ${toNodeDescription(ancestor)}.`,
    ImportCallArity: ({ maxArgumentCount }: { maxArgumentCount: 1 | 2 }) =>
        `\`import()\` requires exactly ${maxArgumentCount === 1 ? "one argument" : "one or two arguments"}.`,
    PrivateInExpectedIn: ({ identifierName }: { identifierName: string }) =>
        `Private names are only allowed in property accesses (\`obj.#${identifierName}\`) or in \`in\` expressions (\`#${identifierName} in obj\`).`,
    UnsupportedMetaProperty: ({ target, onlyValidPropertyName }: { target: string; onlyValidPropertyName: string; }) =>
        `The only valid meta property for ${target} is ${target}.${onlyValidPropertyName}.`,
    AccessorIsGenerator: ({ kind }: { kind: "get" | "set" }) => `A ${kind}ter cannot be a generator.`,
    UnexpectedKeyword: ({ keyword }: { keyword: string }) => `Unexpected keyword '${keyword}'.`,
    UnexpectedReservedWord: ({ reservedWord }: { reservedWord: string }) => `Unexpected reserved word '${reservedWord}'.`,
    ModuleExportUndefined: ({ localName }: { localName: string }) => `Export '${localName}' is not defined.`,
    IllegalBreakContinue: ({ type }: { type: "BreakStatement" | "ContinueStatement"; }) =>
        `Unsyntactic ${type === "BreakStatement" ? "break" : "continue"}.`,
    DeclarationMissingInitializer: ({ kind }: { kind: "const" | "destructuring"; }) => `Missing initializer in ${kind} declaration.`,
    ForInOfLoopInitializer: ({ type }: { type: "ForInStatement" | "ForOfStatement"; }) =>
        `'${type === "ForInStatement" ? "for-in" : "for-of"}' loop variable declaration may not have an initializer.`,
    LabelRedeclaration: ({ labelName }: { labelName: string }) => `Label '${labelName}' is already declared.`,
    InvalidModifierOnTypeMember: ({ modifier }: { modifier: TsModifier }) => `'${modifier}' modifier cannot appear on a type member.`,
    InvalidModifiersOrder: ({ orderedModifiers, }: { orderedModifiers: [TsModifier, TsModifier]; }) =>
        `'${orderedModifiers[0]}' modifier must precede '${orderedModifiers[1]}' modifier.`,
    IncompatibleModifiers: ({ modifiers }: { modifiers: [TsModifier, TsModifier]; }) =>
        `'${modifiers[0]}' modifier cannot be used with '${modifiers[1]}' modifier.`,
    DuplicateModifier: ({ modifier }: { modifier: TsModifier }) => `Duplicate modifier: '${modifier}'.`,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    DuplicateAccessibilityModifier: ({ modifier }: { modifier: TsAccessibility }) => `Accessibility modifier already seen.`,
    UnsupportedSignatureParameterKind: ({ type }: { type: string }) => `Name in a signature must be an Identifier, ObjectPattern or ArrayPattern, instead got ${type}.`,
    InvalidModifierOnTypeParameterPositions: ({ modifier }: { modifier: TsModifier; }) =>
        `'${modifier}' modifier can only appear on a type parameter of a class, interface or type alias.`,
    InvalidModifierOnTypeParameter: ({ modifier }: { modifier: TsModifier }) =>
        `'${modifier}' modifier cannot appear on a type parameter.`,
    EmptyHeritageClauseType: ({ token }: { token: "extends" | "implements" }) => `'${token}' list cannot be empty.`,
    AbstractMethodHasImplementation: ({ methodName }: { methodName: string }) =>
        `Method '${methodName}' cannot have an implementation because it is marked abstract.`,
    DeclareAccessor: ({ kind }: { kind: "get" | "set" }) => `'declare' is not allowed in ${kind}ters.`,
    PrivateElementHasAccessibility: ({ modifier }: { modifier: TsAccessibility; }) =>
        `Private elements cannot have an accessibility modifier ('${modifier}').`,
    AbstractPropertyHasInitializer: ({ propertyName }: { propertyName: string; }) =>
        `Property '${propertyName}' cannot have an initializer because it is marked abstract.`,
    IndexSignatureHasAccessibility: ({ modifier }: { modifier: TsAccessibility; }) =>
        `Index signatures cannot have an accessibility modifier ('${modifier}').`,
    DeclareFunctionHasImplementation: "An implementation cannot be declared in ambient contexts.",
    PatternIsOptional: "A binding pattern parameter cannot be optional in an implementation signature.",
    UnterminatedComment: "Unterminated comment.",
    InvalidNumber: "Invalid number.",
    NumericSeparatorInEscapeSequence: "Numeric separators are not allowed inside unicode escape sequences or hex escape sequences.",
    UnexpectedNumericSeparator: "A numeric separator is only allowed between two digits.",
    NumberIdentifier: "Identifier directly after number.",
    InvalidDecimal: "Invalid decimal.",
    InvalidBigIntLiteral: "Invalid BigIntLiteral.",
    InvalidOrMissingExponent: "Floating-point numbers require a valid exponent after the 'e'.",
    ZeroDigitNumericSeparator: "Numeric separator can not be used after leading 0.",
    InvalidEscapeSequence: "Bad character escape sequence.",
    InvalidCodePoint: "Code point out of bounds.",
    UnterminatedString: "Unterminated string constant.",
    IncompatibleRegExpUVFlags: "The 'u' and 'v' regular expression flags cannot be enabled at the same time.",
    DuplicateRegExpFlags: "Duplicate regular expression flag.",
    MalformedRegExpFlags: "Invalid regular expression flag.",
    UnterminatedRegExp: "Unterminated regular expression.",
    UnterminatedTemplate: "Unterminated template.",
    MissingUnicodeEscape: "Expecting Unicode escape sequence \\uXXXX.",
    EscapedCharNotAnIdentifier: "Invalid Unicode escape.",
    RecordExpressionHashIncorrectStartSyntaxType: "Record expressions starting with '#{' are only allowed when the 'syntaxType'" +
        " option of the 'recordAndTuple' plugin is set to 'hash'.",
    TupleExpressionHashIncorrectStartSyntaxType: "Tuple expressions starting with '#[' are only allowed when the 'syntaxType'"
        + " option of the 'recordAndTuple' plugin is set to 'hash'.",
    UnexpectedDigitAfterHash: "Unexpected digit after hash token.",
    MissingSemicolon: "Missing semicolon.",
    InvalidCoverInitializedName: "Invalid shorthand property initializer.",
    DuplicateProto: "Redefinition of __proto__ property.",
    UnexpectedPrivateField: "Unexpected private name.",
    AwaitBindingIdentifier: "Can not use 'await' as identifier inside an async function.",
    //AwaitBindingIdentifierInStaticBlock: "Can not use 'await' as identifier inside a static block.",
    AwaitExpressionFormalParameter: "'await' is not allowed in async function parameters.",
    YieldInParameter: "Yield expression is not allowed in formal parameters.",
    InvalidParenthesizedAssignment: "Invalid parenthesized assignment pattern.",
    RestTrailingComma: "Unexpected trailing comma after rest element.",
    MissingEqInAssignment: "Only '=' operator can be used for specifying default value.",
    PatternHasAccessor: "Object pattern can't contain getter or setter.",
    PatternHasMethod: "Object pattern can't contain methods.",
    UnsupportedParameterDecorator: "Decorators cannot be used to decorate parameters.",
    InvalidPropertyBindingPattern: "Binding member expression.",
    ParamDupe: "Argument name clash.",
    LetInLexicalBinding: "'let' is not allowed to be used as a name in 'let' or 'const' declarations.",
    InvalidRestAssignmentPattern: "Invalid rest operator's argument.",
    ElementAfterRest: "Rest element must be last element.",
    RecordNoProto: "'__proto__' is not allowed in Record expressions.",
    ObsoleteAwaitStar: "'await*' has been removed from the async functions proposal. Use Promise.all() instead.",
    UnexpectedTokenUnaryExponentiation: "Illegal expression. Wrap left hand side or entire exponentiation in parentheses.",
    DeletePrivateField: "Deleting a private field is not allowed.",
    OptionalChainingNoNew: "Constructors in/after an Optional Chain are not allowed.",
    SuperPrivateField: "Private fields can't be accessed on super.",
    ImportCallArgumentTrailingComma: "Trailing comma is disallowed inside import(...) arguments.",
    UnexpectedArgumentPlaceholder: "Unexpected argument placeholder.",
    ImportCallSpreadArgument: "`...` is not allowed in `import()`.",
    AwaitNotInAsyncContext: "'await' is only allowed within async functions and at the top levels of modules.",
    SuperNotAllowed: "`super()` is only valid inside a class constructor of a subclass. Maybe a typo in the method name " +
        "('constructor') or not extending another class?",
    UnexpectedSuper: "'super' is only allowed in object methods and classes.",
    UnsupportedSuper: "'super' can only be used with function calls (i.e. super()) or in property accesses (i.e. super.prop or super[prop]).",
    IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list.",
    OptionalChainingNoTemplate: "Tagged Template Literals are not allowed in optionalChain.",
    InvalidEscapeSequenceTemplate: "Invalid escape sequence in template.",
    UnsupportedImport: "`import` can only be used in `import()` or `import.meta`.",
    UnsupportedBind: "Binding should be performed on object property.",
    ImportMetaOutsideModule: `import.meta may appear only with 'sourceType: "module"'`,
    UnexpectedNewTarget: "`new.target` can only be used in functions or class properties.",
    ImportCallNotNewExpression: "Cannot use new with import(...).",
    LineTerminatorBeforeArrow: "No line break is allowed before '=>'.",
    MixingCoalesceWithLogical: "Nullish coalescing operator(??) requires parens when mixing with logical operators.",
    InvalidRecordProperty: "Only properties and spread elements are allowed in record definitions.",
    UnsupportedPropertyDecorator: "Decorators cannot be used to decorate object literal properties.",
    YieldBindingIdentifier: "Can not use 'yield' as identifier inside a generator.",
    AwaitBindingIdentifierInStaticBlock: "Can not use 'await' as identifier inside a static block.",
    ArgumentsInClass: "'arguments' is only allowed in functions and class methods.",
    BadGetterArity: "A 'get' accessor must not have any formal parameters.",
    BadSetterArity: "A 'set' accessor must have exactly one formal parameter.",
    BadSetterRestParameter: "A 'set' accessor function argument must not be a rest parameter.",
    MissingClassName: "A class name is required.",
    DecoratorSemicolon: "Decorators must not be followed by a semicolon.",
    DecoratorConstructor: "Decorators can't be used with a constructor. Did you mean '@dec class { ... }'?",
    TrailingDecorator: "Decorators must be attached to a class element.",
    DecoratorStaticBlock: "Decorators can't be used with a static block.",
    StaticPrototype: "Classes may not have static property named prototype.",
    ConstructorClassPrivateField: "Classes may not have a private field named '#constructor'.",
    ConstructorIsGenerator: "Constructor can't be a generator.",
    OverrideOnConstructor: "'override' modifier cannot appear on a constructor declaration.",
    ConstructorIsAsync: "Constructor can't be an async function.",
    ConstructorIsAccessor: "Class constructor may not be an accessor.",
    ConstructorClassField: "Classes may not have a field named 'constructor'.",
    GeneratorInSingleStatementContext: "Generators can only be declared at the top level or inside a block.",
    SloppyFunctionAnnexB: "In non-strict mode code, functions can only be declared at top level, inside a block, or as the body of an if statement.",
    SloppyFunction: "In non-strict mode code, functions can only be declared at top level or inside a block.",
    AwaitUsingNotInAsyncContext: "'await using' is only allowed within async functions and at the top levels of modules.",
    UnexpectedLexicalDeclaration: "Lexical declaration cannot appear in a single-statement context.",
    UnexpectedUsingDeclaration: "Using declaration cannot appear in the top level when source type is `script`.",
    UnexpectedImportExport: "'import' and 'export' may only appear at the top level.",
    AsyncFunctionInSingleStatementContext: "Async functions can only be declared at the top level or inside a block.",
    ForInUsing: "For-in loop may not start with 'using' declaration.",
    ForOfLet: "The left-hand side of a for-of loop may not start with 'let'.",
    ForOfAsync: "The left-hand side of a for-of loop may not be 'async'.",
    UnexpectedLeadingDecorator: "Leading decorators must be attached to a class declaration.",
    DecoratorExportClass: "Decorators must be placed *after* the 'export' keyword. Remove the 'decoratorsBeforeExport: false' option to use the '@decorator export class {}' syntax.",
    UnexpectedParameterModifier: "A parameter property is only allowed in a constructor implementation.",
    UnsupportedParameterPropertyKind: "A parameter property may not be declared using a binding pattern.",
    UnexpectedReadonly: "'readonly' type modifier is only permitted on array and tuple literal types.",
    EmptyTypeArguments: "Type argument list cannot be empty.",
    UnsupportedImportTypeArgument: "Argument in a type import must be a string literal.",
    EmptyTypeParameters: "Type parameter list cannot be empty.",
    ReadonlyForMethodSignature: "'readonly' modifier can only appear on a property declaration or index signature.",
    AccesorCannotHaveTypeParameters: "An accessor cannot have type parameters.",
    AccesorCannotDeclareThisParameter: "'get' and 'set' accessors cannot declare 'this' parameters.",
    SetAccesorCannotHaveOptionalParameter: "A 'set' accessor cannot have an optional parameter.",
    SetAccesorCannotHaveRestParameter: "A 'set' accessor cannot have rest parameter.",
    SetAccesorCannotHaveReturnType: "A 'set' accessor cannot have a return type annotation.",
    TupleOptionalAfterType: "A labeled tuple optional element must be declared using a question mark after the name and before the colon (`name?: type`), rather than after the type (`name: type?`).",
    InvalidTupleMemberLabel: "Tuple members must be labeled with a simple identifier.",
    OptionalTypeBeforeRequired: "A required element cannot follow an optional element.",
    MixedLabeledAndUnlabeledElements: "Tuple members must all have names or all not have names.",
    MissingInterfaceName: "'interface' declarations must be followed by an identifier.",
    NonClassMethodPropertyHasAbstractModifer: "'abstract' modifier can only appear on a class, method, or property declaration.",
    InvalidPropertyAccessAfterInstantiationExpression: "Invalid property access after an instantiation expression. " +
        "You can either wrap the instantiation expression in parentheses, or delete the type arguments.",
    UnexpectedTypeAnnotation: "Did not expect a type annotation here.",
    TypeImportCannotSpecifyDefaultAndNamed: "A type-only import can specify a default import or named bindings, but not both.",
    ImportAliasHasImportType: "An import alias can not use 'import type'.",
    ImportReflectionHasImportType: "An `import module` declaration can not use `type` modifier",
    TypeModifierIsUsedInTypeImports: "The 'type' modifier cannot be used on a named import when 'import type' is used on its import statement.",
    TypeModifierIsUsedInTypeExports: "The 'type' modifier cannot be used on a named export when 'export type' is used on its export statement.",
    TypeAnnotationAfterAssign: "Type annotations must come before default assignments, e.g. instead of `age = 25: number` use `age: number = 25`.",
    UnexpectedTypeCastInParameter: "Unexpected type cast in parameter position.",
    ReservedArrowTypeParam: "This syntax is reserved in files with the .mts or .cts extension. Add a trailing comma, as in `<T,>() => ...`.",
    ConstructorHasTypeParameters: "Type parameters cannot appear on a constructor declaration.",
    AccessorCannotBeOptional: "An 'accessor' property cannot be declared optional.",
    PrivateElementHasAbstract: "Private elements cannot have the 'abstract' modifier.",
    DeclareClassFieldHasInitializer: "Initializers are not allowed in ambient contexts.",
    ExpectedAmbientAfterExportDeclare: "'export declare' must be followed by an ambient declaration.",
    ConstInitiailizerMustBeStringOrNumericLiteralOrLiteralEnumReference: "A 'const' initializer in an ambient context must be a string or numeric literal or literal enum reference.",
    InitializerNotAllowedInAmbientContext: "Initializers are not allowed in ambient contexts.",
    StaticBlockCannotHaveModifier: "Static class blocks cannot have any modifier.",
    ClassMethodHasDeclare: "Class methods cannot have the 'declare' modifier.",
    ClassMethodHasReadonly: "Class methods cannot have the 'readonly' modifier.",
    OverrideNotInSubClass: "This member cannot have an 'override' modifier because its containing class does not extend another class.",
    NonAbstractClassHasAbstractMethod: "Abstract methods can only appear within an abstract class.",
    IndexSignatureHasAbstract: "Index signatures cannot have the 'abstract' modifier.",
    IndexSignatureHasDeclare: "Index signatures cannot have the 'declare' modifier.",
    IndexSignatureHasOverride: "'override' modifier cannot appear on an index signature.",
};

const StrictModeErrors = {
    StrictEvalArguments: ({ referenceName }: { referenceName: string }) => `Assigning to '${referenceName}' in strict mode.`,
    StrictEvalArgumentsBinding: ({ bindingName }: { bindingName: string }) => `Binding '${bindingName}' in strict mode.`,
    StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block.",
    StrictNumericEscape: "The only valid numeric escape in strict mode is '\\0'.",
    StrictOctalLiteral: "Legacy octal literals are not allowed in strict mode.",
    StrictDelete: "Deleting local variable in strict mode.",
    IllegalReturn: "'return' outside of function.",
    NewlineAfterThrow: "Illegal newline after throw.",
    MultipleDefaultsInSwitch: "Multiple default clauses.",
    NoCatchOrFinally: "Missing catch or finally clause.",
    StrictWith: "'with' in strict mode.",
};

export const ModuleErrors = {
    ModuleAttributesWithDuplicateKeys: ({ key }: { key: string }) => `Duplicate key "${key}" is not allowed in module attributes.`,
    ImportBindingIsString: ({ importName }: { importName: string }) =>
        `A string literal cannot be used as an imported binding.\n- Did you mean \`import { "${importName}" as foo }\`?`,
    ModuleExportNameHasLoneSurrogate: ({ surrogateCharCode }: { surrogateCharCode: number; }) =>
        `An export name cannot include a lone surrogate, found '\\u${surrogateCharCode.toString(16,)}'.`,
    ExportBindingIsString: ({ localName, exportName }: { localName: string; exportName: string; }) =>
        `A string literal cannot be used as an exported binding without \`from\`.\n- Did you mean \`export { '${localName}' as '${exportName}' } from 'some-module'\`?`,
    DuplicateExport: ({ exportName }: { exportName: string }) =>
        `\`${exportName}\` has already been exported. Exported identifiers must be unique.`,
    ImportMetaOutsideModule: `import.meta may appear only with 'sourceType: "module"'`,
    ImportOutsideModule: `'import' and 'export' may appear only with 'sourceType: "module"'`,
    ImportJSONBindingNotDefault: "A JSON module can only be imported with `default`.",
    ImportReflectionNotBinding: 'Only `import module x from "./module"` is valid.',
    ImportReflectionHasAssertion: "`import module x` cannot have assertions.",
    ModuleAttributeInvalidValue: "Only string literals are allowed as module attribute values.",
    DestructureNamedImport: "ES2015 named imports do not destructure. Use another statement for destructuring after the import.",
    UnsupportedDecoratorExport: "A decorated export must export a class declaration.",
    ExportDefaultFromAsIdentifier: "'from' is not allowed as an identifier after 'export default'.",
    DuplicateDefaultExport: "Only one default export allowed per module.",
    DecoratorBeforeExport: "Decorators must be placed *before* the 'export' keyword. Remove the 'decoratorsBeforeExport: true' option to use the 'export @decorator class {}' syntax.",
    UnsupportedDefaultExport: "Only expressions, functions or classes are allowed as the `default` export.",
};

export const Errors = {
    ...ParseErrorEnum(StandardErrors),
    ...ParseErrorEnum(StrictModeErrors),
    ...ParseErrorEnum(ModuleErrors),
};

export class ExpressionErrors {
    shorthandAssignLoc?: IPosition;
    doubleProtoLoc?: IPosition;
    privateKeyLoc?: IPosition;
    optionalParametersLoc?: IPosition;
}

export class ParserError<T> extends SyntaxError {
    constructor(message: string, public location?: IPosition, public code?: string, public details?: T) {
        super(message);
    }
}