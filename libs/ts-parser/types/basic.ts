export interface IPosition {
    line?: number;
    column?: number;
    index: number;
}

export interface ISourceLocation {
    start: IPosition;
    end: IPosition;
}

export interface IHasLocation {
    location: ISourceLocation;
}

export interface ErrorDetails {
    code: string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    message: string | Function;
}

export interface IOptions {
    sourceType?: ProgramSourceType;
    annexB?: boolean;
    continueOnerror?: boolean;
    allowAwaitOutsideFunction?: boolean;
    allowSuperOutsideMethod?: boolean;
    createParenthesizedExpressions?: boolean;
    allowNewTargetOutsideFunction?: boolean;
    allowUndeclaredExports?: boolean;
    allowImportExportEverywhere?: boolean;
    allowReturnOutsideFunction?: boolean;
    parseAsAmbientContext?: boolean;
    strictMode?: boolean;
    decorators?: 'legacy' | 'proposal' | null;
    pipelineOperator?: 'minimal' | 'fsharp' | 'hack' | 'smart',
    features?: {
        destructuringPrivate?: boolean;
        decimal?: boolean;
        recordAndTuple?: boolean;
        throwExpressions?: boolean;
        importAttributes?: boolean;
        importAssertions?: boolean;
        moduleAttributes?: boolean;
        partialApplication?: boolean;
        v8intrinsic?: boolean;
        doExpressions?: boolean;
        asyncDoExpressions?: boolean;
        functionSent?: boolean;
        moduleBlocks?: boolean;
        decoratorAutoAccessors?: boolean;
        explicitResourceManagement?: boolean;
        exportDefaultFrom?: boolean;
        estree?: boolean;
        importReflection?: boolean;
    }
}

export interface ITokenContext {
    token: string;
    preserveSpace?: boolean;
}

export interface IStateLabel {
    kind: "loop" | "switch" | undefined | null;
    name?: string | null;
    statementStart?: number;
}

export type TryParse<TNode, TError, TThrown, TAborted, TFailState> = {
    node: TNode;
    error: TError;
    thrown: TThrown;
    aborted: TAborted;
    failState: TFailState;
};

export type LValAncestor = { type: "UpdateExpression"; prefix: boolean }
    | {
        type: "ArrayPattern"
        | "AssignmentExpression"
        | "CatchClause"
        | "ForOfStatement"
        | "FormalParameters"
        | "ForInStatement"
        | "ForStatement"
        | "ImportSpecifier"
        | "ImportNamespaceSpecifier"
        | "ImportDefaultSpecifier"
        | "ParenthesizedExpression"
        | "ObjectPattern"
        | "RestElement"
        | "VariableDeclarator"
    };

export type ParserFeature = 'destructuringPrivate' | 'decimal' | 'recordAndTuple' | 'throwExpressions'
    | 'importAssertions' | 'importAttributes' | 'moduleAttributes' | 'partialApplication' | 'v8intrinsic'
    | 'doExpressions' | 'asyncDoExpressions' | 'functionSent' | 'moduleBlocks' | 'decoratorAutoAccessors'
    | 'explicitResourceManagement' | 'exportDefaultFrom' | 'estree' | 'importReflection';

export type AllowedLValTypes = 'AssignmentPattern' | 'RestElement' | 'ObjectProperty' | 'ParenthesizedExpression' |
    'ArrayPattern' | 'ObjectPattern';
export type AllowedTsLValTypes = 'TSTypeCastExpression' | 'TSParameterProperty' | 'TSNonNullExpression' | 'TSAsExpression'
    | 'TSSatisfiesExpression' | 'TSTypeAssertion'


export type ParsingContext = "EnumMembers" | "HeritageClauseElement" | "TupleElementTypes" | "TypeMembers" | "TypeParametersOrArguments";

export type TsAccessibility = "public" | "protected" | "private";
export type VarianceAnnotations = "in" | "out";
export type TsModifier = "readonly" | "abstract" | "declare" | "static" | "override" | "const" | TsAccessibility | VarianceAnnotations;
export type RaiseProperties<T> = T & { at?: IPosition | IHasLocation | null };
export type ProgramSourceType = "script" | "module" | "unambiguous";
export type CallBack<Args, TOut> = (arg: Args) => TOut;
export type CallBackVoid<Args> = CallBack<Args, void>;
export type ModifierBase = { accessibility?: TsAccessibility; } & { [key in TsModifier]?: boolean | undefined; };


