import { ParserError } from "../errors/errors";
import { Nullable } from "../types/internal.types";
import { IPosition, ProgramSourceType, TsAccessibility } from "./basic";
import {
    AssignmentOperator, BinaryOperator, ICommentNode, ICompositeExpression, ICompositeNode, ICompositeOperatorNode, IDirective, IDirectiveLiteral, IEstreeLiteral, IHasArgument, IHasBody, IHasChildren,
    IHasComputed,
    IHasDeclare,
    IHasDirectives, IHasExpression,
    IHasKey,
    IHasKind,
    IHasOperator, IHasParams, IHasProperties, IHasTypeAnnotation, ILiteralBase, ILiteralExpression,
    INodeBase, IStringLiteral, ITypeParameter, LogicalOperator, NodeBase, TsOperator, UnaryOperator, UpdateOperator, VariableKind
} from "./nodes.common";

//#region base nodes

export type IHasTestExpression<N extends boolean = false> = { test: N extends true ? Nullable<ExpressionNode> : ExpressionNode; };
export type UnType<T extends NodeBase> = Omit<T, "type">;// & { type: AnyNode["type"] };
export type IHasDecorators = { decorators?: IDecorator[]; }
export type IHasTsTypeParameters = { typeParameters?: IHasParams<ITypeParameter | TsTypeParameter>; };
export type IHasTsTypeParameterDeclaration = { typeParameters?: TsTypeParameterDeclaration; };
export type IHasTsTypeParameterInstantiation = { typeParameters?: TsTypeParameterInstantiation; };
export type IHasLabel = { label?: Identifier; }
export type IHasOptional = { optional: boolean; }
export type IHasId<N extends boolean = false> = { id: N extends true ? Nullable<Identifier> : Identifier; };
export interface IHasAnyBody extends IHasBody<ExpressionNode> { }
export interface IHasAnyChildren extends IHasChildren<ExpressionNode> { }
export interface IHasAnyExpression<N extends boolean = true> extends IHasExpression<ExpressionNode, N> { }
export interface IHasAnyArgument<T extends boolean = true> extends IHasArgument<ExpressionNode, T> { }
export interface IPatternBase<T extends string> extends INodeBase<T>, IHasDecorators, IHasTypeAnnotation<ExpressionNode> { }
//#endregion

export interface ICommentWhitespace {
    start: number;
    end: number;
    comments: Array<ICommentNode>;
    leadingNode?: AnyNode;
    trailingNode?: AnyNode;
    containingNode?: AnyNode;
};

export interface IHasTrailingComma {
    trailingCommaLocation?: IPosition;
    trailingComma?: number;
}

export interface IProgram extends INodeBase<"Program">, IHasChildren<ModuleDeclaration | ExpressionNode, false>, IHasDirectives {
    sourceType: ProgramSourceType;
    interpreter?: InterpreterDirective;
    comments: ICommentNode[];
    errors?: Array<ParserError<unknown>>;
}
export interface IModuleExpression extends INodeBase<"ModuleExpression">, IHasBody<IProgram> { }

export interface IMemberExpression extends INodeBase<"MemberExpression" | "OptionalMemberExpression">, IHasComputed {
    object: ExpressionNode | ISuper;
    property: ExpressionNode;
    optional?: boolean;
}
export interface IDecorator extends INodeBase<"Decorator">, IHasAnyExpression {
    //arguments?: Array<IExpression | ISpreadElement>;
}

export interface ITemplateLiteral extends INodeBase<"TemplateLiteral"> {
    quasis: ITemplateElement[];
    expressions: ExpressionNode[];
}

export interface ITemplateElement extends INodeBase<"TemplateElement"> {
    tail: boolean;
    value: { cooked: string | null; raw: string; };
}


export type Identifier = IPatternBase<"Identifier"> & IHasDecorators & { name: string; optional?: true | null; }
export type IPlaceholder = INodeBase<"Placeholder">;
export interface ILabeledStatement extends INodeBase<"LabeledStatement">, IHasLabel, IHasAnyBody { }
export type IArgumentPlaceholder = INodeBase<"ArgumentPlaceholder">;
export type ISuper = INodeBase<"Super">;
export type InterpreterDirective = ILiteralBase<'InterpreterDirective', string>;

export type IBlockStatement = INodeBase<"BlockStatement"> & IHasAnyChildren & IHasDirectives;
export type IBreakStatement = INodeBase<"BreakStatement"> & IHasLabel;
export type IContinueStatement = INodeBase<"ContinueStatement"> & IHasLabel;
export type IDebuggerStatement = INodeBase<"DebuggerStatement">;
export type IEmptyStatement = INodeBase<"EmptyStatement">;

export type IExpressionStatement = INodeBase<"ExpressionStatement"> & IHasAnyExpression;
export type IDoWhileStatement = INodeBase<"DoWhileStatement"> & IHasAnyBody & IHasTestExpression;
export type IWhileStatement = INodeBase<"WhileStatement"> & IHasAnyBody & IHasTestExpression;
export type IWithStatement = INodeBase<"WithStatement"> & IHasAnyBody & { object: ExpressionNode };

export type IPrivateName = INodeBase<"PrivateName"> & IHasId;

export type IThisExpression = INodeBase<"ThisExpression">;
export type IParenthesizedExpression = INodeBase<"ParenthesizedExpression"> & IHasAnyExpression;
export interface IYieldExpression extends INodeBase<"YieldExpression">, IHasAnyArgument { delegate: boolean; }
export interface IAwaitExpression extends INodeBase<"AwaitExpression">, IHasAnyArgument { };
export interface IDoExpression extends INodeBase<"DoExpression">, IHasBody<IBlockStatement> { async: boolean; }
export interface IUnaryExpression extends INodeBase<"UnaryExpression">, IHasAnyArgument, IHasOperator<UnaryOperator> { prefix: boolean; }
export interface IUpdateExpression extends INodeBase<"UpdateExpression">, IHasAnyArgument, IHasOperator<UpdateOperator> { prefix: boolean; }

export interface IForStatement extends INodeBase<"ForStatement">, IHasTestExpression<true>, IHasAnyBody {
    init: Nullable<IVariableDeclaration | ExpressionNode>;
    update: Nullable<ExpressionNode>;
}

export interface IForInOfBase<T extends string> extends IHasAnyBody, ICompositeNode<T, IVariableDeclaration | ExpressionNode, ExpressionNode> {
    await: boolean;
}

export interface IForInStatement extends IForInOfBase<"ForInStatement"> { }

export interface IForOfStatement extends IForInOfBase<"ForOfStatement"> { }

export interface IVariableDeclaration extends INodeBase<"VariableDeclaration">, IHasDeclare, IHasDecorators, IHasKind<VariableKind> {
    declarations: IVariableDeclarator[];
}

export interface IVariableDeclarator extends INodeBase<"VariableDeclarator"> {
    id: IPattern;
    init: Nullable<ExpressionNode>;
    definite?: true;
}

export type HasChildrenNode = IProgram | IBlockStatement | ISequenceExpression;
export type IAnyStatement = IExpressionStatement | IParenthesizedExpression;
export type IBlockStatementLike = IProgram | IBlockStatement;
export type IHasLabelStatement = IContinueStatement | IBreakStatement;
export type IForLike = IForStatement | IForInStatement | IForOfStatement;
export type ILoopStatement = IDoWhileStatement | IWhileStatement | IForLike;

export interface IConditionalExpression extends INodeBase<"ConditionalExpression">, IHasTestExpression {
    alternate: ExpressionNode;
    consequent: ExpressionNode;
}

export interface IIfStatement extends INodeBase<"IfStatement">, IHasTestExpression {
    consequent: ExpressionNode;
    alternate: Nullable<ExpressionNode>;
}

export interface ISwitchStatement extends INodeBase<"SwitchStatement"> {
    discriminant: ExpressionNode;
    cases: ISwitchCase[];
}

export interface ISwitchCase extends INodeBase<"SwitchCase">, IHasTestExpression<true> {
    consequent: ExpressionNode[];
}

export interface ITryStatement extends INodeBase<"TryStatement"> {
    block: IBlockStatement;
    handler: Nullable<ICatchClause>;
    finalizer: Nullable<IBlockStatement>;
}

export interface ICatchClause extends INodeBase<"CatchClause">, IHasBody<IBlockStatement, true> {
    param?: IPattern;
}

export interface IThrowStatement extends INodeBase<"ThrowStatement">, IHasAnyArgument { }




//#region object members
export type IMethodBase = IFunctionBase<IBlockStatement> & IHasKind<"constructor" | "method" | "get" | "set">;
export type IClassMethodOrDeclareMethodCommon<T extends string, Key extends NodeBase = ExpressionNode> = IClassMemberBase<T> & IHasKey<Key>;
export type IFunctionBase<T extends NodeBase> = IBodilessFunctionOrMethodBase & IHasBody<T>;
export interface IObjectMemberBase<T extends string, V extends NodeBase> extends INodeBase<T>, IHasDecorators,
    IHasTsTypeParameters, IHasComputed, IHasKey<Identifier | IPrivateName | IStringLiteral>, IHasKind<"get" | "set" | "method", true> {
    value: V;
    method: boolean;
    abstract?: boolean;
    // variance?: FlowVariance | null; // TODO: Not in spec
}

export interface IClassMemberBase<T extends string> extends INodeBase<T>, IHasDecorators, IHasComputed {
    static: boolean;
    accessibility?: TsAccessibility;
    override?: true | null;
    abstract?: true | null;
    optional?: true | null;
}

export interface IEstreeMethodDefinition extends INodeBase<"MethodDefinition">, IHasKey<ExpressionNode>, IHasComputed,
    IHasKind<"get" | "set" | "method", true>, IHasDecorators {
    static: boolean;
    value: ExpressionNode;
}

export interface IBodilessFunctionOrMethodBase extends IHasDecorators, IHasTsTypeParameters, IHasParams<IPattern | TSParameterProperty, true>, IHasId<true> {
    generator: boolean;
    async: boolean;
    expression: boolean;
    returnType?: Nullable<IHasTypeAnnotation<NodeBase>>;
}
export type IObjectProperty = IObjectMemberBase<"ObjectProperty", ExpressionNode | IPattern> & { shorthand: boolean; }
export type IAssignmentProperty = IObjectProperty & { value: IPattern };

export type IObjectMethod = IObjectMemberBase<"ObjectMethod", ExpressionNode> & IFunctionBase<IBlockStatement>;
export type IFunctionExpression = INodeBase<"FunctionExpression"> & IFunctionBase<IBlockStatement>;
export type IOptFunctionDeclaration = INodeBase<"FunctionDeclaration"> & IFunctionBase<IBlockStatement> & IHasDeclare;
export type IFunctionDeclaration = IOptFunctionDeclaration & IHasId;
export interface IClassMethod extends IMethodBase, IClassMethodOrDeclareMethodCommon<"ClassMethod"> { }
export interface IArrowFunctionExpression extends INodeBase<"ArrowFunctionExpression">, IFunctionBase<IBlockStatement | ExpressionNode> { }
export interface IClassPrivateMethod extends IMethodBase, IClassMethodOrDeclareMethodCommon<"ClassPrivateMethod", IPrivateName> { computed: false; }



export interface IClassProperty extends IClassMemberBase<"ClassProperty">, IHasDeclare, IHasKey<ExpressionNode>, IHasTypeAnnotation<NodeBase> {
    value: Nullable<ExpressionNode>;
    readonly?: true;
    definite?: true;
}

export interface IClassPrivateProperty extends Omit<IClassMemberBase<"ClassPrivateProperty">, "accessibility" | "abstract">,
    IHasKey<IPrivateName>, IHasTypeAnnotation<NodeBase> {
    value: Nullable<ExpressionNode>;
    readonly?: true;
    definite?: true;
}

export interface IClassAccessorProperty extends IClassMemberBase<"ClassAccessorProperty">, IHasDeclare,
    IHasKey<IPrivateName | ExpressionNode>, IHasTypeAnnotation<NodeBase> {
    value: Nullable<ExpressionNode>;
    readonly?: true;
    definite?: true;
}

export interface IReturnStatement extends INodeBase<"ReturnStatement">, IHasAnyArgument { }

export type IClassMember = IClassMethod | IClassPrivateMethod | IClassProperty | IClassPrivateProperty | IClassAccessorProperty;

//#endregion

//#region IPattern

export type IObjectPattern = IPatternBase<"ObjectPattern"> & IHasProperties<IAssignmentProperty | IRestElement>;
export type IArrayPattern = IPatternBase<"ArrayPattern"> & { elements: Array<Nullable<IPattern | TSParameterProperty>>; }
export interface IAssignmentPattern extends IPatternBase<"AssignmentPattern">, ICompositeExpression<IPattern, ExpressionNode> { }
export interface IRestElement extends IPatternBase<"RestElement">, IHasArgument<IPattern> { }
export interface ISpreadElement extends INodeBase<"SpreadElement">, IHasAnyArgument<false> { };
export type IPattern = Identifier | IObjectPattern | IArrayPattern | IRestElement | IAssignmentPattern;

//#endregion

export interface IStaticBlock extends INodeBase<"StaticBlock">, IHasAnyChildren { }
export interface IClassBody extends INodeBase<"ClassBody">, IHasChildren<IClassMember | IStaticBlock | TsIndexSignature> {
    dependencies: string[];
}
export interface IClassBase<T extends string> extends INodeBase<T>, IHasDecorators, IHasId<true>, IHasBody<IClassBody>, IHasTsTypeParameters {
    superClass: Nullable<ExpressionNode>;
    superTypeParameters?: TsTypeParameterInstantiation;
    abstract?: boolean;
    implements?: Nullable<TsExpressionWithTypeArguments[]>
}

export interface IClassDeclaration extends IClassBase<"ClassDeclaration">, IHasDeclare, IHasDecorators { }
export interface IClassExpression extends IClassBase<"ClassExpression"> { }

export type IClass = IClassDeclaration | IClassExpression;


export type IObjectExpression = INodeBase<"ObjectExpression"> & IHasProperties<IObjectProperty | IObjectMethod | ISpreadElement>;
export type IRecordExpression = INodeBase<"RecordExpression"> & IHasProperties<IObjectProperty | IObjectMethod | ISpreadElement>;
export type IArrayExpression = IPatternBase<"ArrayExpression"> & { elements: Array<Nullable<ISpreadElement | ExpressionNode>>; }
export type ITupleExpression = INodeBase<"TupleExpression"> & { elements: Array<Nullable<ISpreadElement | ExpressionNode>>; }
export interface IAssignmentExpression extends ICompositeOperatorNode<"AssignmentExpression", ExpressionNode | IPattern, ExpressionNode, AssignmentOperator> { }
export interface ILogicalExpression extends ICompositeOperatorNode<"LogicalExpression", ExpressionNode, ExpressionNode, LogicalOperator> { }
export interface IBinaryExpression extends ICompositeOperatorNode<"BinaryExpression", ExpressionNode, ExpressionNode, BinaryOperator> { }

export interface IBindExpression extends INodeBase<"BindExpression"> {
    object: Nullable<ExpressionNode>;
    callee: ExpressionNode;
}

export interface ITaggedTemplateExpression extends INodeBase<"TaggedTemplateExpression">, IHasTsTypeParameterInstantiation {
    tag: ExpressionNode;
    quasi: ITemplateLiteral;
}

export interface ICallOrNewExpression extends INodeBase<"CallExpression" | "NewExpression" | "OptionalCallExpression"> {
    callee: ExpressionNode | ISuper | Import;
    arguments: Array<Nullable<ExpressionNode | ISpreadElement>>;
    typeArguments?: IHasParams<NodeBase>;
    optional?: boolean;
    typeParameters?: IHasParams<NodeBase>;
}

export interface ISequenceExpression extends INodeBase<"SequenceExpression">, IHasAnyChildren { }

//#region meta/import/export

export type Import = INodeBase<"Import">;

export interface IMetaProperty extends INodeBase<"MetaProperty"> {
    meta: Identifier;
    property: Identifier;
}

export interface IExportDefaultDeclaration extends INodeBase<"ExportDefaultDeclaration"> {
    declaration: IOptFunctionDeclaration | OptTSDeclareFunction | IClassDeclaration | ExpressionNode;
}

export type Declaration = IVariableDeclaration | IClassDeclaration | IFunctionDeclaration | TsInterfaceDeclaration | TsTypeAliasDeclaration
    | TsEnumDeclaration | TsModuleDeclaration;

export interface IExportNamedDeclaration extends INodeBase<"ExportNamedDeclaration"> {
    declaration: Nullable<Declaration>;
    specifiers: Array<IExportSpecifier | IExportDefaultSpecifier | IExportNamespaceSpecifier>;
    source: Nullable<ILiteralExpression>;
    exportKind?: "type" | "value"; // TODO: Not in spec,
    attributes?: ImportAttribute[];
    assertions?: ImportAttribute[];
}

export interface IImportDeclaration extends INodeBase<"ImportDeclaration"> {
    specifiers: Array<IImportSpecifier | IImportDefaultSpecifier | IImportNamespaceSpecifier>;
    source: ILiteralExpression;
    importKind?: "type" | "typeof" | "value"; // TODO: Not in spec,
    attributes?: ImportAttribute[];
    assertions?: ImportAttribute[];
    module?: boolean;
}

export interface IExportAllDeclaration extends INodeBase<"ExportAllDeclaration"> {
    source: ILiteralExpression;
    exportKind?: "type" | "value"; // TODO: Not in spec,
    assertions?: ImportAttribute[];
}

export interface ImportAttribute extends INodeBase<"ImportAttribute">, IHasKey<Identifier | IStringLiteral> {
    type: "ImportAttribute";
    value: IStringLiteral;
}

export interface IModuleSpecifier<T extends string> extends INodeBase<T>, IHasKey<Identifier | IStringLiteral, false> { local?: Identifier | IStringLiteral; }

export interface IExportDefaultSpecifier extends IModuleSpecifier<"ExportDefaultSpecifier"> { }

export interface IImportDefaultSpecifier extends IModuleSpecifier<"ImportDefaultSpecifier"> { }

export interface IImportNamespaceSpecifier extends IModuleSpecifier<"ImportNamespaceSpecifier"> { }
export interface IExportNamespaceSpecifier extends IModuleSpecifier<"ExportNamespaceSpecifier"> { }


export interface IExportSpecifier extends IModuleSpecifier<"ExportSpecifier">, IHasKind<"type" | "value"> { }

export interface IImportSpecifier extends IModuleSpecifier<"ImportSpecifier">, IHasKind<"type" | "value"> { }
export type AnyImportSpecifier = IImportSpecifier | IImportDefaultSpecifier | IImportNamespaceSpecifier;
export type AnyModuleSpecifier = IExportSpecifier | IExportDefaultSpecifier | IExportNamespaceSpecifier | AnyImportSpecifier;

export type ModuleDeclaration = AnyImport | AnyExport;
export type AnyImport = IImportDeclaration | TsImportEqualsDeclaration;
export type AnyExport = IExportNamedDeclaration | IExportDefaultDeclaration | IExportAllDeclaration | TsExportAssignment
    | TsImportEqualsDeclaration | TsNamespaceExportDeclaration;

//#endregion

export type AnyCompositeExpression = IAssignmentExpression | IBinaryExpression | ILogicalExpression;
export type NormalFunction = IFunctionDeclaration | IFunctionExpression;
export type AnyFunction = IArrowFunctionExpression | IObjectMethod | IClassMethod | NormalFunction | IClassPrivateMethod;
export type IObjectMember = IObjectProperty | IObjectMethod;
export type IObjectLikeExpression = IObjectExpression | IRecordExpression | IObjectPattern;
export type IArrayLikeExpression = IArrayExpression | ITupleExpression;
export type NoneExpressionNode = IDecorator | IDirective | ImportAttribute | AnyModuleSpecifier;
export type ExpressionNode = Identifier | ISuper | IThisExpression | IMemberExpression | InterpreterDirective | IDirectiveLiteral
    | HasChildrenNode | IAnyStatement | ILiteralExpression | IHasLabelStatement | ITemplateLiteral | ITemplateElement | IDebuggerStatement
    | ILoopStatement | IYieldExpression | IAwaitExpression | IUpdateExpression | IUnaryExpression | ITaggedTemplateExpression | IPattern
    | IObjectLikeExpression | IObjectMember | AnyTsFunction | IBindExpression | IDoExpression | AnyCompositeExpression | ISpreadElement
    | IArrayLikeExpression | ICallOrNewExpression | IArgumentPlaceholder | IConditionalExpression | IIfStatement | ISwitchStatement | ISwitchCase
    | ITryStatement | ICatchClause | IThrowStatement | IPrivateName | IClassPrivateMethod | IWithStatement | IEmptyStatement
    | IVariableDeclaration | IVariableDeclarator | TsExpressionNode | IClass | IClassBody | IClassMember | IStaticBlock | Import | IModuleExpression
    | IMetaProperty | IReturnStatement | ModuleDeclaration | ILabeledStatement | IEstreeMethodDefinition | IEstreeLiteral;

export type AnyNode = ExpressionNode | NoneExpressionNode;


//#region typescript

export interface TSDeclareMethod extends IMethodBase, IClassMethodOrDeclareMethodCommon<"TSDeclareMethod"> { }
export type OptTSDeclareFunction = INodeBase<"TSDeclareFunction"> & IFunctionBase<IBlockStatement> & IHasDeclare;
export type TSDeclareFunction = OptTSDeclareFunction & IHasId;

export type TsKeywordTypeType = | "TSAnyKeyword" | "TSUnknownKeyword" | "TSNumberKeyword" | "TSObjectKeyword" | "TSBooleanKeyword"
    | "TSBigIntKeyword" | "TSStringKeyword" | "TSSymbolKeyword" | "TSVoidKeyword" | "TSUndefinedKeyword" | "TSNullKeyword"
    | "TSNeverKeyword" | "TSIntrinsicKeyword";

export type TsKeywordType = INodeBase<TsKeywordTypeType>;
export type TsThisType = INodeBase<"TSThisType">;
export type TsTypeParameterInstantiation = INodeBase<"TSTypeParameterInstantiation"> & IHasParams<TsType>;
export type TsEntityName = Identifier | ITsQualifiedName;
export type TsExternalModuleReference = INodeBase<"TSExternalModuleReference"> & IHasAnyExpression;
export type TsModuleReference = TsEntityName | TsExternalModuleReference;
export type TsExportAssignment = INodeBase<"TSExportAssignment"> & IHasAnyExpression;
export type TsNamespaceExportDeclaration = INodeBase<"TSNamespaceExportDeclaration"> & IHasId;

export interface ITsQualifiedName extends ICompositeNode<"TSQualifiedName", TsEntityName, Identifier> { }
export interface TsImportType extends INodeBase<"TSImportType">, IHasArgument<IStringLiteral>, IHasTsTypeParameterInstantiation {
    qualifier?: TsEntityName;
}

export interface TsLiteralType extends INodeBase<"TSLiteralType"> {
    type: "TSLiteralType";
    literal: ILiteralExpression | ITemplateLiteral;
}

export interface TsTypePredicate extends INodeBase<"TSTypePredicate">, IHasTypeAnnotation<TsTypeAnnotation> {
    parameterName: Identifier | TsThisType;
    asserts: boolean;
}

export interface TsTypeAnnotation extends INodeBase<"TSTypeAnnotation">, IHasTypeAnnotation<TsType> { }

export interface TsMappedType extends INodeBase<"TSMappedType">, IHasTypeAnnotation<TsType> {
    readonly?: true | "+" | "-";
    optional?: true | "+" | "-";
    typeParameter: TsTypeParameter;
    nameType: Nullable<TsType>;
}

export interface TsTypeParameter extends INodeBase<"TSTypeParameter"> {
    name: Identifier;
    in?: boolean;
    out?: boolean;
    const?: boolean;
    constraint?: TsType;
    default?: TsType;
}

export interface TsIndexedAccessType extends INodeBase<"TSIndexedAccessType"> {
    objectType: TsType;
    indexType: TsType;
}

export interface TSParameterProperty extends INodeBase<"TSParameterProperty">, IHasDecorators {
    accessibility?: TsAccessibility;
    readonly?: Nullable<true>;
    override?: Nullable<true>;
    parameter: Identifier | IAssignmentPattern;
}

export interface TsConditionalType extends INodeBase<"TSConditionalType"> {
    checkType: TsType;
    extendsType: TsType;
    trueType: TsType;
    falseType: TsType;
}
export interface TsSignatureDeclarationOrIndexSignatureBase<T extends string> extends INodeBase<T>,
    IHasParams<IPattern | TSParameterProperty, true>, IHasTypeAnnotation<TsTypeAnnotation> {
    returnType: Nullable<TsTypeAnnotation>;
}

export interface TsSignatureDeclarationBase<T extends string> extends TsSignatureDeclarationOrIndexSignatureBase<T>, IHasTsTypeParameterDeclaration { }
export interface TsCallSignatureDeclaration extends TsSignatureDeclarationBase<"TSCallSignatureDeclaration"> { }
export interface TsConstructSignatureDeclaration extends TsSignatureDeclarationBase<"TSConstructSignatureDeclaration"> { }


export interface TsTypeParameterDeclaration extends INodeBase<"TSTypeParameterDeclaration">, IHasParams<TsTypeParameter> { }
export interface TsTypeOperator extends INodeBase<"TSTypeOperator">, IHasOperator<TsOperator>, IHasTypeAnnotation<TsType> { }
export interface TsParenthesizedType extends INodeBase<"TSParenthesizedType">, IHasTypeAnnotation<TsType> { }
export interface TsInferType extends INodeBase<"TSInferType"> { typeParameter: TsTypeParameter; }
export interface TsNamedTupleMember extends INodeBase<"TSNamedTupleMember">, IHasLabel { optional: boolean; elementType: TsType; }
export interface TsUnionOrIntersectionTypeBase<T extends string> extends INodeBase<T> { types: TsType[]; }
export interface TsUnionType extends TsUnionOrIntersectionTypeBase<"TSUnionType"> { };
export interface TsIntersectionType extends TsUnionOrIntersectionTypeBase<"TSIntersectionType"> { };
export interface TsRestType extends INodeBase<"TSRestType">, IHasTypeAnnotation<TsType | TsNamedTupleMember, false> { }
export interface TsOptionalType extends INodeBase<"TSOptionalType">, IHasTypeAnnotation<TsType> { }
export interface TsArrayType extends INodeBase<"TSArrayType"> { elementType: TsType; }
export interface TsTupleType extends INodeBase<"TSTupleType"> { elementTypes: Array<TsType | TsNamedTupleMember> }
export interface TsTypeLiteral extends INodeBase<"TSTypeLiteral"> { members: TsTypeElement[]; }
export interface TsTypeQuery extends INodeBase<"TSTypeQuery">, IHasTsTypeParameterInstantiation {
    exprName: TsEntityName | TsImportType;
}

export interface TsTypeReference extends INodeBase<"TSTypeReference">, IHasTsTypeParameterInstantiation { typeName: TsEntityName; }
export interface TsExpressionWithTypeArguments extends INodeBase<"TSExpressionWithTypeArguments">, IHasTsTypeParameterInstantiation, IHasExpression<TsEntityName> { }

export interface TsNamedTypeElementBase extends IHasKey<ExpressionNode>, IHasComputed { optional?: true; }
export interface TsPropertySignature extends INodeBase<"TSPropertySignature">, TsNamedTypeElementBase, IHasTypeAnnotation<TsTypeAnnotation> {
    readonly?: true;
    initializer?: ExpressionNode;
}
export interface TsMethodSignature extends TsSignatureDeclarationBase<"TSMethodSignature">, TsNamedTypeElementBase, IHasKind<"method" | "get" | "set"> { }
export interface TsIndexSignature extends TsSignatureDeclarationOrIndexSignatureBase<"TSIndexSignature"> {
    readonly?: true;
    static?: true;
}
export interface TsFunctionType extends TsSignatureDeclarationBase<"TSFunctionType"> { }
export interface TsConstructorType extends TsSignatureDeclarationBase<"TSConstructorType"> { abstract: boolean; }


export interface TsInterfaceDeclaration extends INodeBase<"TSInterfaceDeclaration">, IHasDeclare, IHasId<true>, IHasTsTypeParameterDeclaration {
    extends?: TsExpressionWithTypeArguments[];
    body: TsInterfaceBody;
}

export interface TsInterfaceBody extends INodeBase<"TSInterfaceBody">, IHasChildren<TsTypeElement> { }

export interface TsTypeAliasDeclaration extends INodeBase<"TSTypeAliasDeclaration">, IHasDeclare, IHasId, IHasTsTypeParameterDeclaration,
    IHasTypeAnnotation<TsType> { }

export interface TsEnumDeclaration extends INodeBase<"TSEnumDeclaration">, IHasDeclare, IHasId, IHasChildren<TsEnumMember> {
    const?: true;
}

export interface TsEnumMember extends INodeBase<"TSEnumMember"> {
    id: Identifier | IStringLiteral;
    initializer?: ExpressionNode;
}

export type TsInstantiationExpression = INodeBase<"TSInstantiationExpression"> & IHasAnyExpression<false> & IHasTsTypeParameterInstantiation;
export type TsTypeCastExpression = INodeBase<"TSTypeCastExpression"> & IHasAnyExpression & IHasTypeAnnotation<TsTypeAnnotation>;

export interface TsModuleBlock extends INodeBase<"TSModuleBlock">, IHasAnyChildren { }

export interface TsNamespaceDeclaration extends Omit<TsModuleDeclaration, "id">, IHasId {
}

export interface TsModuleDeclaration extends INodeBase<"TSModuleDeclaration">, IHasDeclare, IHasBody<TsModuleBlock | TsNamespaceDeclaration> {
    global?: true; // In TypeScript, this is only available through `node.flags`.,
    id: Identifier | IStringLiteral;
}

export interface TsImportEqualsDeclaration extends INodeBase<"TSImportEqualsDeclaration">, IHasId {
    isExport: boolean;
    importKind: "type" | "value";
    moduleReference: TsModuleReference;
}

export type TsNonNullExpression = INodeBase<"TSNonNullExpression"> & IHasAnyExpression;

export type TsTypeAssertionLikeBase<T extends string> = INodeBase<T> & IHasAnyExpression & IHasTypeAnnotation<TsType>;
export type TsAsExpression = TsTypeAssertionLikeBase<"TSAsExpression">;
export type TsTypeAssertion = TsTypeAssertionLikeBase<"TSTypeAssertion">;
export type TsSatisfiesExpression = TsTypeAssertionLikeBase<"TSSatisfiesExpression">;

export type TsTypeAssertionLike = TsAsExpression | TsTypeAssertion | TsSatisfiesExpression;

export type TsFunctionOrConstructorType = TsFunctionType | TsConstructorType;
export type TsTypeElement = TsCallSignatureDeclaration | TsConstructSignatureDeclaration | TsPropertySignature
    | TsMethodSignature | TsIndexSignature;
export type TsSignatureDeclaration = TsCallSignatureDeclaration | TsConstructSignatureDeclaration | TsMethodSignature | TsFunctionOrConstructorType;
export type TsUnionOrIntersectionType = TsUnionType | TsIntersectionType;
export type TsType = | TsKeywordType | TsThisType | TsFunctionOrConstructorType | TsTypeReference | TsTypeQuery | TsTypeLiteral
    | TsArrayType | TsTupleType | TsOptionalType | TsRestType | TsUnionOrIntersectionType | TsConditionalType | TsInferType
    | TsParenthesizedType | TsTypeOperator | TsIndexedAccessType | TsMappedType | TsLiteralType | TsImportType | TsTypePredicate;

export type AnyTsFunction = AnyFunction | TSDeclareMethod | TSDeclareFunction;
export type TsExpressionNode = TSParameterProperty | TsType | TsTypeAnnotation | TsTypeParameter | ITsQualifiedName | TsModuleDeclaration
    | TsTypeParameterInstantiation | TsTypeElement | TsTypeParameterDeclaration | TsNamedTupleMember | TsTypeAssertionLike | TsModuleBlock
    | TsExpressionWithTypeArguments | TsInterfaceBody | TsInterfaceDeclaration | TsTypeAliasDeclaration | TsEnumDeclaration | TsEnumMember
    | TsNonNullExpression | TsInstantiationExpression | TsTypeCastExpression | TsExternalModuleReference;



//#endregion