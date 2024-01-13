/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Errors, ExpressionErrors } from "../errors/errors";
import { State } from "../helper/state";
import { ParserUtil } from "../helper/util";
import { ParserExpression } from "../parser/expression";
import { PARAM } from "../scopes/handler-production-parameter";
import {
    BIND_CLASS, BIND_FLAGS_TS_IMPORT, BIND_NONE, BIND_TS_AMBIENT, BIND_TS_CONST_ENUM, BIND_TS_ENUM, BIND_TS_INTERFACE,
    BIND_TS_NAMESPACE, BIND_TS_TYPE, BIND_TS_TYPE_IMPORT, SCOPE_OTHER, SCOPE_TS_MODULE
} from "../scopes/scopeflags";
import { CharCodes } from "../tokens/charcodes";
import { Tokens, tokenContextTypes, tokenTypes } from "../tokens/tokens";
import {
    AllowedTsLValTypes, IOptions, IPosition, ModifierBase, ParsingContext, TsAccessibility, TsModifier,
    VarianceAnnotations
} from "../types/basic";
import { ParseBindingListFlags, ParseStatementFlag } from "../types/constants";
import { Nullable } from "../types/internal.types";
import {
    AnyExport,
    AnyFunction,
    AnyImport,
    AnyTsFunction,
    Declaration,
    ExpressionNode, IArrowFunctionExpression, IAssignmentPattern,
    IBlockStatement,
    ICallOrNewExpression,
    IClass,
    IClassAccessorProperty, IClassBody,
    IClassDeclaration,
    IClassMember,
    IClassMethod, IClassPrivateMethod,
    IClassPrivateProperty,
    IClassProperty,
    IDecorator,
    IEstreeMethodDefinition,
    IExportNamedDeclaration,
    IExportSpecifier,
    IExpressionStatement,
    IFunctionDeclaration,
    IHasOptional,
    IHasTrailingComma,
    IHasTsTypeParameterDeclaration,
    IImportDeclaration,
    IImportSpecifier,
    IObjectMethod, IObjectProperty,
    IParenthesizedExpression,
    IPattern,
    IStaticBlock,
    ITsQualifiedName,
    IVariableDeclaration,
    IVariableDeclarator,
    Identifier,
    TSDeclareMethod,
    TSParameterProperty, TsArrayType,
    TsAsExpression,
    TsCallSignatureDeclaration,
    TsConditionalType, TsConstructSignatureDeclaration, TsConstructorType, TsEntityName,
    TsEnumDeclaration, TsEnumMember,
    TsExportAssignment,
    TsExpressionWithTypeArguments,
    TsExternalModuleReference,
    TsFunctionType,
    TsImportEqualsDeclaration,
    TsImportType, TsIndexSignature,
    TsIndexedAccessType, TsInferType,
    TsInstantiationExpression,
    TsInterfaceBody,
    TsInterfaceDeclaration, TsIntersectionType, TsKeywordType, TsKeywordTypeType, TsLiteralType, TsMappedType,
    TsMethodSignature, TsModuleBlock, TsModuleDeclaration, TsNamedTupleMember,
    TsNamespaceDeclaration,
    TsNamespaceExportDeclaration,
    TsNonNullExpression,
    TsOptionalType, TsParenthesizedType, TsPropertySignature, TsRestType,
    TsSatisfiesExpression,
    TsSignatureDeclaration, TsThisType, TsTupleType, TsType,
    TsTypeAliasDeclaration,
    TsTypeAnnotation, TsTypeAssertion,
    TsTypeCastExpression,
    TsTypeElement, TsTypeLiteral, TsTypeOperator,
    TsTypeParameter, TsTypeParameterDeclaration, TsTypeParameterInstantiation, TsTypePredicate, TsTypeQuery, TsTypeReference, TsUnionType
} from "../types/nodes";
import { IHasBody, IHasDeclare, IHasTypeAnnotation, ILiteralExpression, IParenthesized, IStringLiteral, NodeBase, TsOperator, VariableKind } from "../types/nodes.common";
import { IParseClassMemberState, IParseSubscriptState } from "../types/parser.interface";
import { TypeScriptScopeHandler } from "./ts-handler-scope";

export class TypeScriptParser extends ParserExpression<TypeScriptScopeHandler> {

    constructor(options?: IOptions) {
        super(options);
    }

    protected override createScope(inModule: boolean): TypeScriptScopeHandler {
        return new TypeScriptScopeHandler(this, inModule);
    }

    protected override isExportDefaultSpecifier(): boolean {
        if (this.tsIsDeclarationStart())
            return false;
        return super.isExportDefaultSpecifier();
    }

    protected override parseAssignableListItem(flags: ParseBindingListFlags, decorators: IDecorator[]) {
        // Store original location to include modifiers in range
        const startLoc = this.state.startLocation;
        const modified: ModifierBase = {};
        this.tsParseModifiers({ allowedModifiers: ["public", "private", "protected", "override", "readonly"] }, modified);
        const accessibility = modified.accessibility;
        const override = modified.override;
        const readonly = modified.readonly;
        if (!(flags & ParseBindingListFlags.IS_CONSTRUCTOR_PARAMS) && (accessibility || readonly || override))
            this.raise(Errors.UnexpectedParameterModifier, { at: startLoc });

        const left = this.parseMaybeDefault();
        this.parseAssignableListItemTypes(left, flags);
        const elt = this.parseMaybeDefault(left.location.start, left);
        if (accessibility || readonly || override) {
            const pp = this.startNodeAt<TSParameterProperty>(startLoc);
            if (decorators.length)
                pp.decorators = decorators;
            if (accessibility) pp.accessibility = accessibility;
            if (readonly) pp.readonly = readonly;
            if (override) pp.override = override;
            if (elt.type !== "Identifier" && elt.type !== "AssignmentPattern")
                this.raise(Errors.UnsupportedParameterPropertyKind, { at: pp });
            pp.parameter = elt as Identifier | IAssignmentPattern;
            return this.finishNode(pp, "TSParameterProperty");
        }

        if (decorators.length)
            left.decorators = decorators;

        return elt;
    }

    protected override isSimpleParameter(node: IPattern | TSParameterProperty) {
        return (
            (node.type === "TSParameterProperty" && super.isSimpleParameter(node.parameter))
            || super.isSimpleParameter(node)
        );
    }

    protected override setArrowFunctionParameters(node: IArrowFunctionExpression, params: Nullable<ExpressionNode>[], trailingCommaLoc?: IPosition) {
        super.setArrowFunctionParameters(node, params, trailingCommaLoc);
        this.tsDisallowOptionalPattern(node);
    }

    protected override parseFunctionBodyAndFinish<T extends AnyTsFunction>(node: T, type: T["type"], isMethod?: boolean): T {
        if (this.match(tokenTypes.colon))
            node.returnType = this.tsParseTypeOrTypePredicateAnnotation(tokenTypes.colon);

        const bodilessType = type === "FunctionDeclaration" ? "TSDeclareFunction"
            : type === "ClassMethod" || type === "ClassPrivateMethod" ? "TSDeclareMethod" : undefined;
        if (bodilessType && !this.match(tokenTypes.braceL) && this.isLineTerminator())
            return this.finishNode(node, bodilessType);
        if (bodilessType === "TSDeclareFunction" && this.state.isAmbientContext) {
            this.raise(Errors.DeclareFunctionHasImplementation, { at: node });
            if ((node as IHasDeclare).declare)
                return super.parseFunctionBodyAndFinish(node, bodilessType, isMethod);
        }
        this.tsDisallowOptionalPattern(node);

        return super.parseFunctionBodyAndFinish(node, type, isMethod);
    }

    protected override parseTemplateSubstitution(): ExpressionNode {
        if (this.state.inType)
            return this.tsParseType();
        return super.parseTemplateSubstitution();
    }

    protected override parseMaybeUnary(refExpressionErrors?: ExpressionErrors, sawUnary?: boolean): ExpressionNode {
        if (this.match(tokenTypes.lt))
            return this.tsParseTypeAssertion();
        return super.parseMaybeUnary(refExpressionErrors, sawUnary);
    }

    protected override parseExpressionStatement(node: IExpressionStatement, expr: ExpressionNode, decorators?: IDecorator[] | undefined) {
        const decl = expr.type === "Identifier"
            ? this.tsParseExpressionStatement(node as unknown as TsModuleDeclaration, expr, decorators)
            : undefined;
        return decl || super.parseExpressionStatement(node, expr, decorators);
    }

    protected override parseClass<T extends IClass>(node: T, isStatement: boolean, optionalId?: boolean | undefined): T {
        const oldInAbstractClass = this.state.inAbstractClass;
        this.state.inAbstractClass = !!node.abstract;
        try {
            return super.parseClass(node, isStatement, optionalId);
        } finally {
            this.state.inAbstractClass = oldInAbstractClass;
        }
    }

    protected override parseMethod<T extends IObjectMethod | IClassMethod | IClassPrivateMethod>(
        node: T, isGenerator: boolean, isAsync: boolean, isConstructor: boolean, allowDirectSuper: boolean, type: T["type"], inClassScope?: boolean): T {

        const method = super.parseMethod<T>(node, isGenerator, isAsync, isConstructor, allowDirectSuper, type, inClassScope);
        if (method.abstract) {
            const hasBody = this.hasFeature("estree") ? !!(method as unknown as { value: { body: IBlockStatement } }).value?.body : !!method.body;
            if (hasBody) {
                const { key } = method;
                this.raise(Errors.AbstractMethodHasImplementation, {
                    at: method,
                    methodName: key.type === "Identifier" && !method.computed ?
                        key.name : `[${this.input.slice(key.location.start.index, key.location.end.index)}]`
                });
            }
        }
        return method;
    }

    protected override parseSubscript(base: ExpressionNode, startLoc: IPosition, noCalls: boolean | undefined, state: IParseSubscriptState) {

        if (!this.hasPrecedingLineBreak() && this.match(tokenTypes.bang)) {
            // When ! is consumed as a postfix operator (non-null assertion),
            // disallow JSX tag forming after. e.g. When parsing `p! < n.p!`
            // `<n.p` can not be a start of JSX tag
            this.state.canStartJSXElement = false;
            this.next();
            const nonNullExpression = this.startNodeAt<TsNonNullExpression>(startLoc);
            nonNullExpression.expression = base;
            return this.finishNode(nonNullExpression, "TSNonNullExpression");
        }

        let isOptionalCall = false;
        if (this.match(tokenTypes.questionDot) && this.lookaheadCharCode() === CharCodes.lessThan) {
            if (noCalls) {
                state.stop = true;
                return base;
            }
            state.optionalChainMember = isOptionalCall = true;
            this.next();
        }

        // handles 'f<<T>'
        if (this.match(tokenTypes.lt) || this.match(tokenTypes.bitShiftL)) {
            let missingParenErrorLoc;
            // tsTryParseAndCatch is expensive, so avoid if not necessary.
            // There are number of things we are going to "maybe" parse, like type arguments on
            // tagged template expressions. If any of them fail, walk it back and continue.
            const result = this.tsTryParseAndCatch(() => {
                if (!noCalls && this.atPossibleAsyncArrow(base)) {
                    // Almost certainly this is a generic async function `async <T>() => ...
                    // But it might be a call with a type argument `async<T>();`
                    const asyncArrowFn = this.tsTryParseGenericAsyncArrowFunction(startLoc);
                    if (asyncArrowFn)
                        return asyncArrowFn;
                }

                const typeArguments = this.tsParseTypeArgumentsInExpression();
                if (!typeArguments) return;

                if (isOptionalCall && !this.match(tokenTypes.parenL)) {
                    missingParenErrorLoc = this.state.currentPosition();
                    return;
                }

                if (Tokens.isTemplate(this.state.type)) {
                    const result = super.parseTaggedTemplateExpression(base, startLoc, state);
                    result.typeParameters = typeArguments;
                    return result;
                }

                if (!noCalls && this.eat(tokenTypes.parenL)) {
                    const node = this.startNodeAt<ICallOrNewExpression>(startLoc);
                    node.callee = base;
                    node.arguments = this.parseCallExpressionArguments(tokenTypes.parenR, false);

                    // Handles invalid case: `f<T>(a:b)`
                    this.tsCheckForInvalidTypeCasts(node.arguments);

                    node.typeParameters = typeArguments;
                    if (state.optionalChainMember)
                        node.optional = isOptionalCall;

                    return this.finishCallExpression(node, state.optionalChainMember);
                }

                const tokenType = this.state.type;
                if (
                    // a<b>>c is not (a<b>)>c, but a<(b>>c)
                    tokenType === tokenTypes.gt ||
                    // a<b>>>c is not (a<b>)>>c, but a<(b>>>c)
                    tokenType === tokenTypes.bitShiftR ||
                    // a<b>c is (a<b)>c
                    (tokenType !== tokenTypes.parenL && Tokens.canStartExpression(tokenType) && !this.hasPrecedingLineBreak())
                ) {
                    // Bail out.
                    return;
                }

                const node = this.startNodeAt<TsInstantiationExpression>(startLoc);
                node.expression = base;
                node.typeParameters = typeArguments;
                return this.finishNode(node, "TSInstantiationExpression");
            });

            if (missingParenErrorLoc)
                this.unexpected(missingParenErrorLoc, tokenTypes.parenL);

            if (result) {
                if (
                    result.type === "TSInstantiationExpression" &&
                    (this.match(tokenTypes.dot) ||
                        (this.match(tokenTypes.questionDot) && this.lookaheadCharCode() !== CharCodes.leftParenthesis))
                ) {
                    this.raise(Errors.InvalidPropertyAccessAfterInstantiationExpression, { at: this.state.startLocation });
                }
                return result;
            }
        }

        return super.parseSubscript(base, startLoc, noCalls, state);
    }

    protected override parseImport(node: AnyImport): AnyImport {
        if (this.match(tokenTypes.string)) {
            node.importKind = "value";
            return super.parseImport(node as IImportDeclaration);
        }

        let importNode;
        if (Tokens.isIdentifier(this.state.type) && this.lookaheadCharCode() === CharCodes.equalsTo) {
            node.importKind = "value";
            return this.tsParseImportEqualsDeclaration(node as TsImportEqualsDeclaration);
        } else if (this.isContextual(tokenTypes._type)) {
            const maybeDefaultIdentifier = this.parseMaybeImportPhase(node as IImportDeclaration, false);
            if (this.lookaheadCharCode() === CharCodes.equalsTo)
                return this.tsParseImportEqualsDeclaration(node as TsImportEqualsDeclaration, maybeDefaultIdentifier);
            else
                importNode = super.parseImportSpecifiersAndAfter(node as IImportDeclaration, maybeDefaultIdentifier);
        } else {
            importNode = super.parseImport(node as IImportDeclaration);
        }
        if (importNode.importKind === "type" &&
            (importNode as IImportDeclaration).specifiers.length > 1 &&
            (importNode as IImportDeclaration).specifiers[0].type === "ImportDefaultSpecifier") {
            this.raise(Errors.TypeImportCannotSpecifyDefaultAndNamed, { at: importNode });
        }

        return importNode;
    }

    protected override parseExport(node: AnyExport, decorators?: IDecorator[] | undefined): AnyExport {
        if (this.match(tokenTypes._import)) {
            node = node as TsImportEqualsDeclaration;
            // `export import A = B;`
            this.next(); // eat `tt._import`
            let maybeDefaultIdentifier: Identifier | undefined = undefined;
            // We pass false here, because we are parsing an `import ... =`
            if (this.isContextual(tokenTypes._type) && this.isPotentialImportPhase(/* isExport */ false)) {
                maybeDefaultIdentifier = this.parseMaybeImportPhase(node,/* isExport */ false);
            } else {
                node.importKind = "value";
            }
            return this.tsParseImportEqualsDeclaration(node, maybeDefaultIdentifier, true);
        } else if (this.eat(tokenTypes.eq)) {
            // `export = x;`
            const assign = node as TsExportAssignment;
            assign.expression = super.parseExpression();
            this.semicolon();
            this.sawUnambiguousESM = true;
            return this.finishNode(assign, "TSExportAssignment");
        } else if (this.eatContextual(tokenTypes._as)) {
            // `export as namespace A;`
            const decl = node as TsNamespaceExportDeclaration;
            // See `parseNamespaceExportDeclaration` in TypeScript's own parser
            this.expectContextual(tokenTypes._namespace);
            decl.id = this.parseIdentifier();
            this.semicolon();
            return this.finishNode(decl, "TSNamespaceExportDeclaration")
        } else {
            return super.parseExport(node, decorators);
        }
    }

    protected override parseExportDefaultExpression(): ExpressionNode {
        if (this.isAbstractClass()) {
            const cls = this.startNode<IClass>();
            this.next(); // Skip "abstract"
            cls.abstract = true;
            return this.parseClass(cls, true, true);
        }

        // export default interface allowed in:
        // https://github.com/Microsoft/TypeScript/pull/16040
        if (this.match(tokenTypes._interface)) {
            const result = this.tsParseInterfaceDeclaration(this.startNode<TsInterfaceDeclaration>());
            if (result)
                return result;
        }

        return super.parseExportDefaultExpression();
    }

    protected override parseExprOp(left: ExpressionNode, leftStartLoc: IPosition, minPrec: number): ExpressionNode {
        let isSatisfies: boolean = false;
        if (Tokens.operatorPrecedence(tokenTypes._in) > minPrec &&
            !this.hasPrecedingLineBreak() &&
            (this.isContextual(tokenTypes._as) || (isSatisfies = this.isContextual(tokenTypes._satisfies)))
        ) {
            const node = this.startNodeAt<TsAsExpression | TsSatisfiesExpression>(leftStartLoc);
            node.expression = left;
            node.typeAnnotation = this.tsInType(() => {
                this.next(); // "as" or "satisfies"
                if (this.match(tokenTypes._const)) {
                    if (isSatisfies)
                        this.raise(Errors.UnexpectedKeyword, { at: this.state.startLocation, keyword: "const" });
                    return this.tsParseTypeReference();
                }
                return this.tsParseType();
            });
            this.finishNode(node, isSatisfies ? "TSSatisfiesExpression" : "TSAsExpression");
            // rescan `<`, `>` because they were scanned when this.state.inType was true
            this.reScan_lt_gt();
            return this.parseExprOp(node, leftStartLoc, minPrec);
        }
        return super.parseExprOp(left, leftStartLoc, minPrec);
    }

    protected override checkReservedWord(word: string, startLoc: IPosition, checkKeywords: boolean, isBinding: boolean): void {
        if (!this.state.isAmbientContext)
            super.checkReservedWord(word, startLoc, checkKeywords, isBinding);
    }

    protected override checkImportReflection(node: IImportDeclaration): void {
        super.checkImportReflection(node);
        if (node.module && node.importKind !== "value")
            this.raise(Errors.ImportReflectionHasImportType, { at: node.specifiers[0].location.start });
    }

    protected override parseImportSpecifier(specifier: IImportSpecifier, importedIsString: boolean,
        isInTypeOnlyImport: boolean, isMaybeTypeOnly: boolean, bindingType?: number | undefined) {
        if (!importedIsString && isMaybeTypeOnly) {
            this.parseTypeOnlyImportExportSpecifier(specifier, true, isInTypeOnlyImport);
            return this.finishNode(specifier, "ImportSpecifier");
        }
        specifier.kind = "value";
        return super.parseImportSpecifier(
            specifier,
            importedIsString,
            isInTypeOnlyImport,
            isMaybeTypeOnly,
            isInTypeOnlyImport ? BIND_TS_TYPE_IMPORT : BIND_FLAGS_TS_IMPORT,
        );
    }

    protected override parseCatchClauseParam(): IPattern {
        const param = super.parseCatchClauseParam();
        const type = this.tsTryParseTypeAnnotation();

        if (type) {
            param.typeAnnotation = type;
            this.resetEndLocation(param);
        }

        return param;
    }

    protected override getGetterSetterExpectedParamCount(method: IObjectMethod | IClassMethod): number {
        const baseCount = super.getGetterSetterExpectedParamCount(method);
        const params = this.getObjectOrClassMethodParams(method);
        const firstParam = params[0];
        const hasContextParam = firstParam && this.isThisParam(firstParam);
        return hasContextParam ? baseCount + 1 : baseCount;
    }

    protected override shouldParseArrow(params: ExpressionNode[]): boolean {
        if (this.match(tokenTypes.colon)) {
            return params.every(expr => this.isAssignable(expr, true));
        }
        return super.shouldParseArrow(params);
    }

    protected override shouldParseAsyncArrow(): boolean {
        return this.match(tokenTypes.colon) || super.shouldParseAsyncArrow();
    }

    protected override canHaveLeadingDecorator() {
        // Avoid unnecessary lookahead in checking for abstract class unless needed!
        return super.canHaveLeadingDecorator() || this.isAbstractClass();
    }

    protected override parseExportSpecifier(node: IExportSpecifier, isString: boolean, isInTypeExport: boolean, isMaybeTypeOnly: boolean) {
        if (!isString && isMaybeTypeOnly) {
            this.parseTypeOnlyImportExportSpecifier(node, false, isInTypeExport);
            return this.finishNode<IExportSpecifier>(node, "ExportSpecifier");
        }
        node.kind = "value";
        return super.parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly);
    }

    protected override toAssignableList(exprList?: Nullable<ExpressionNode>[], trailingCommaLoc?: IPosition, isLHS?: boolean): void {
        if (!exprList)
            return;

        for (let i = 0; i < exprList.length; i++) {
            const expr = exprList[i];
            if (expr?.type === "TSTypeCastExpression") {
                exprList[i] = this.typeCastToParameter(expr);
            }
        }
        super.toAssignableList(exprList, trailingCommaLoc, isLHS);
    }

    protected override readTokenFromCode(code: number): void {
        if (this.state.inType) {
            if (code === CharCodes.greaterThan)
                return this.finishOp(tokenTypes.gt, 1);
            if (code === CharCodes.lessThan)
                return this.finishOp(tokenTypes.lt, 1);
        }
        super.readTokenFromCode(code);
    }

    protected override isClassMethod(): boolean {
        return this.match(tokenTypes.lt) || super.isClassMethod();
    }

    protected override isClassProperty(): boolean {
        return (this.match(tokenTypes.bang) || this.match(tokenTypes.colon) || super.isClassProperty());
    }

    protected override parseMaybeDefault(startLoc?: IPosition, left?: IPattern): IPattern {

        const node = super.parseMaybeDefault(startLoc, left);
        if (node.type === "AssignmentPattern" && node.typeAnnotation && node.right.location.start.index < node.typeAnnotation.location.start.index)
            this.raise(Errors.TypeAnnotationAfterAssign, { at: node.typeAnnotation });
        return node;
    }

    protected override isValidLVal(type: string, isUnparenthesizedInAssign: boolean, binding: number): string | boolean | (string | boolean)[] {
        return this.getOwn(
            {
                // Allow "typecasts" to appear on the left of assignment expressions,
                // because it may be in an arrow function.
                // e.g. `const f = (foo: number = 0) => foo;`
                TSTypeCastExpression: true,
                TSParameterProperty: "parameter",
                TSNonNullExpression: "expression",
                TSAsExpression: (binding !== BIND_NONE || !isUnparenthesizedInAssign) && ["expression", true],
                TSSatisfiesExpression: (binding !== BIND_NONE || !isUnparenthesizedInAssign) && ["expression", true],
                TSTypeAssertion: (binding !== BIND_NONE || !isUnparenthesizedInAssign) && ["expression", true],
            },
            type as AllowedTsLValTypes,
        ) || super.isValidLVal(type, isUnparenthesizedInAssign, binding);
    }

    protected override parseBindingAtom() {
        if (this.state.type === tokenTypes._this)
            return this.parseIdentifier(/* liberal */ true);
        return super.parseBindingAtom();
    }

    protected override parseMaybeDecoratorArguments(expr: ExpressionNode): ExpressionNode {
        // handles `@f<<T>`
        if (this.match(tokenTypes.lt) || this.match(tokenTypes.bitShiftL)) {
            const typeArguments = this.tsParseTypeArgumentsInExpression();

            if (this.match(tokenTypes.parenL)) {
                const call = super.parseMaybeDecoratorArguments(expr);
                (call as ICallOrNewExpression).typeParameters = typeArguments;
                return call;
            }

            this.unexpected(undefined, tokenTypes.parenL);
        }
        return super.parseMaybeDecoratorArguments(expr);
    }

    protected override checkCommaAfterRest(close: (typeof CharCodes)[keyof typeof CharCodes]): boolean {
        if (this.state.isAmbientContext && this.match(tokenTypes.comma) && this.lookaheadCharCode() === close) {
            this.next();
            return false;
        }
        return super.checkCommaAfterRest(close);
    }

    protected override parseMaybeAssign(refExpressionErrors?: ExpressionErrors, afterLeftParse?: Function): ExpressionNode {
        // Note: When the JSX plugin is on, type assertions (`<T> x`) aren't valid syntax.

        if (!this.match(tokenTypes.lt))
            return super.parseMaybeAssign(refExpressionErrors, afterLeftParse);

        // Either way, we're looking at a '<': tt.jsxTagStart or relational.

        // If the state was cloned in the JSX parsing branch above but there
        // have been any error in the tryParse call, this.state is set to state
        // so we still need to clone it.
        let state: State | undefined = undefined;
        if (!state || state === this.state)
            state = this.state.clone();

        let typeParameters: TsTypeParameterDeclaration | undefined = undefined;
        const arrow = this.tryParse<ExpressionNode>(abort => {
            // This is similar to TypeScript's `tryParseParenthesizedArrowFunctionExpression`.
            typeParameters = this.tsParseTypeParameters(this.tsParseConstModifier);
            const expr = super.parseMaybeAssign(refExpressionErrors, afterLeftParse);

            if (expr.type !== "ArrowFunctionExpression" || (expr as IParenthesized).parenthesized)
                abort();

            // Correct TypeScript code should have at least 1 type parameter, but don't crash on bad code.
            if (typeParameters?.params?.length !== 0) {
                this.resetStartLocationFromNode(expr, typeParameters);
            }
            (expr as IHasTsTypeParameterDeclaration).typeParameters = typeParameters;
            return expr;
        }, state);

        /*:: invariant(arrow.node != null) */
        if (!arrow.error && !arrow.aborted) {
            // This error is reported outside of the this.tryParse call so that
            // in case of <T>(x) => 2, we don't consider <T>(x) as a type assertion
            // because of this error.
            if (typeParameters)
                this.reportReservedArrowTypeParam(typeParameters);
            return arrow.node;
        }

        // This will start with a type assertion (via parseMaybeUnary).
        // But don't directly call `this.tsParseTypeAssertion` because we want to handle any binary after it.
        const typeCast = this.tryParse(() => super.parseMaybeAssign(refExpressionErrors, afterLeftParse), state);
        /*:: invariant(!typeCast.aborted) */
        /*:: invariant(typeCast.node != null) */
        if (!typeCast.error)
            return typeCast.node!;

        if (arrow.node) {
            /*:: invariant(arrow.failState) */
            this.state = arrow.failState;
            if (typeParameters)
                this.reportReservedArrowTypeParam(typeParameters);
            return arrow.node;
        }

        if (typeCast?.node) {
            /*:: invariant(typeCast.failState) */
            this.state = typeCast.failState;
            return typeCast.node;
        }

        throw arrow.error || typeCast?.error;
    }

    protected override parseArrow(node: IArrowFunctionExpression) {
        if (this.match(tokenTypes.colon)) {
            // This is different from how the TS parser does it.
            // TS uses lookahead. The Babel Parser parses it as a parenthesized expression and converts.
            const result = this.tryParse<TsTypeAnnotation>(abort => {
                const returnType = this.tsParseTypeOrTypePredicateAnnotation(tokenTypes.colon);
                if (this.canInsertSemicolon() || !this.match(tokenTypes.arrow))
                    abort();
                return returnType;
            });

            if (result.aborted)
                return;

            if (!result.thrown) {
                if (result.error)
                    this.state = result.failState;
                node.returnType = result.node;
            }
        }
        return super.parseArrow(node);
    }

    protected override parseAssignableListItemTypes(param: IPattern, flags: ParseBindingListFlags): IPattern {
        if (!(flags & ParseBindingListFlags.IS_FUNCTION_PARAMS))
            return param;

        if (this.eat(tokenTypes.question)) {
            (param as IHasOptional).optional = true;
        }
        const type = this.tsTryParseTypeAnnotation();
        if (type)
            param.typeAnnotation = type;
        this.resetEndLocation(param);

        return param;
    }

    protected override isAssignable(node?: ExpressionNode, isBinding?: boolean): boolean {
        switch (node?.type) {
            case "TSTypeCastExpression":
                return this.isAssignable(node.expression, isBinding);
            case "TSParameterProperty":
                return true;
            default:
                return super.isAssignable(node, isBinding);
        }
    }

    protected override toAssignable(node: Nullable<ExpressionNode>, isLHS?: boolean): void {
        switch (node?.type) {
            case "ParenthesizedExpression":
                this.toAssignableParenthesizedExpression(node, isLHS);
                break;
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSNonNullExpression":
            case "TSTypeAssertion":
                if (isLHS)
                    this.expressionScope.recordArrowParameterBindingError(Errors.UnexpectedTypeCastInParameter, { at: node });
                else
                    this.raise(Errors.UnexpectedTypeCastInParameter, { at: node });
                this.toAssignable(node.expression, isLHS);
                break;
            case "AssignmentExpression":
            default:
                if (node?.type === "AssignmentExpression")
                    if (!isLHS && node.left.type === "TSTypeCastExpression")
                        node.left = this.typeCastToParameter(node.left);
                super.toAssignable(node, isLHS);
        }
    }

    protected override checkToRestConversion(node: Nullable<ExpressionNode>, allowPattern: boolean): void {
        switch (node?.type) {
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSTypeAssertion":
            case "TSNonNullExpression":
                this.checkToRestConversion(node.expression, false);
                break;
            default:
                super.checkToRestConversion(node, allowPattern);
        }
    }

    protected override shouldParseExportDeclaration(): boolean {
        if (this.tsIsDeclarationStart())
            return true;
        return super.shouldParseExportDeclaration();
    }

    protected override parseConditional(expr: ExpressionNode, startLoc: IPosition, refExpressionErrors?: Nullable<ExpressionErrors>) {

        // only do the expensive clone if there is a question mark
        // and if we come from inside parens
        if (!this.state.maybeInArrowParameters || !this.match(tokenTypes.question))
            return super.parseConditional(expr, startLoc, refExpressionErrors);

        const result = this.tryParse(() => super.parseConditional(expr, startLoc));

        if (!result.node) {
            if (result.error)
                super.setOptionalParametersError(refExpressionErrors!, result.error);
            return expr;
        }
        if (result.error)
            this.state = result.failState;
        return result.node;
    }

    protected override parseParenItem(node: ExpressionNode, startLoc: IPosition): ExpressionNode {
        node = super.parseParenItem(node, startLoc);
        if (this.eat(tokenTypes.question)) {
            (node as IHasOptional).optional = true;
            this.resetEndLocation(node);
        }

        if (this.match(tokenTypes.colon)) {
            const typeCastNode = this.startNodeAt<TsTypeCastExpression>(startLoc);
            typeCastNode.expression = node;
            typeCastNode.typeAnnotation = this.tsParseTypeAnnotation();
            return this.finishNode(typeCastNode, "TSTypeCastExpression");
        }

        return node;
    }

    protected override parseExportDeclaration(node: IExportNamedDeclaration): Declaration | undefined {
        if (!this.state.isAmbientContext && this.isContextual(tokenTypes._declare))
            return this.tsInAmbientContext(() => this.parseExportDeclaration(node));

        const startLoc = this.state.startLocation;
        const isDeclare = this.eatContextual(tokenTypes._declare);

        if (isDeclare && (this.isContextual(tokenTypes._declare) || !this.shouldParseExportDeclaration()))
            throw this.raise(Errors.ExpectedAmbientAfterExportDeclare, { at: this.state.startLocation });

        const isIdentifier = Tokens.isIdentifier(this.state.type);
        const declaration = (isIdentifier && this.tsTryParseExportDeclaration()) || super.parseExportDeclaration(node);

        if (!declaration)
            return undefined;
        if (declaration.type === "TSInterfaceDeclaration" || declaration.type === "TSTypeAliasDeclaration" || isDeclare)
            node.exportKind = "type";

        if (isDeclare) {
            // Reset location to include `declare` in range
            this.resetStartLocation(declaration, startLoc);
            (declaration as IHasDeclare).declare = true;
        }

        return declaration;
    }

    protected override parseClassId(node: IClass, isStatement: boolean, optionalId?: boolean | undefined, bindingType?: number): void {
        if ((!isStatement || optionalId) && this.isContextual(tokenTypes._implements))
            return;

        super.parseClassId(node, isStatement, optionalId, (node as IClassDeclaration).declare ? BIND_TS_AMBIENT : BIND_CLASS);
        const typeParameters = this.tsTryParseTypeParameters(this.tsParseInOutConstModifiers);
        if (typeParameters)
            node.typeParameters = typeParameters;
    }

    protected override parseClassProperty(node: IClassProperty): IClassProperty {
        this.parseClassPropertyAnnotation(node);

        if (this.state.isAmbientContext && !(node.readonly && !node.typeAnnotation) && this.match(tokenTypes.eq))
            this.raise(Errors.DeclareClassFieldHasInitializer, { at: this.state.startLocation });

        if (node.abstract && this.match(tokenTypes.eq)) {
            const { key } = node;
            this.raise(Errors.AbstractPropertyHasInitializer, {
                at: this.state.startLocation,
                propertyName: key.type === "Identifier" && !node.computed
                    ? (key as Identifier).name
                    : `[${this.input.slice(key.location.start.index, key.location.end.index)}]`,
            });
        }

        return super.parseClassProperty(node);
    }

    protected override parseClassPrivateProperty(node: IClassPrivateProperty): IClassPrivateProperty {
        if ((node as unknown as { abstract: boolean }).abstract)
            this.raise(Errors.PrivateElementHasAbstract, { at: node });
        const _accessibility = (node as unknown as { accessibility: TsAccessibility }).accessibility;
        if (_accessibility)
            this.raise(Errors.PrivateElementHasAccessibility, { at: node, modifier: _accessibility });

        this.parseClassPropertyAnnotation(node);
        return super.parseClassPrivateProperty(node);
    }

    protected override parseClassAccessorProperty(node: IClassAccessorProperty): IClassAccessorProperty {
        this.parseClassPropertyAnnotation(node);
        if (node.optional)
            this.raise(Errors.AccessorCannotBeOptional, { at: node });
        return super.parseClassAccessorProperty(node);
    }

    protected override pushClassMethod(classBody: IClassBody, method: IClassMethod, isGenerator: boolean, isAsync: boolean,
        isConstructor: boolean, allowsDirectSuper: boolean): void {
        const typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
        if (typeParameters && isConstructor)
            this.raise(Errors.ConstructorHasTypeParameters, { at: typeParameters });

        const { declare = false, kind } = method as IHasDeclare & IClassMethod;
        if (declare && (kind === "get" || kind === "set"))
            this.raise(Errors.DeclareAccessor, { at: method, kind });
        if (typeParameters)
            method.typeParameters = typeParameters;
        super.pushClassMethod(classBody, method, isGenerator, isAsync, isConstructor, allowsDirectSuper);
    }

    protected override pushClassPrivateMethod(classBody: IClassBody, method: IClassPrivateMethod, isGenerator: boolean, isAsync: boolean): void {
        const typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
        if (typeParameters)
            method.typeParameters = typeParameters;
        super.pushClassPrivateMethod(classBody, method, isGenerator, isAsync);
    }

    protected override declareClassPrivateMethodInScope(node: IClassPrivateMethod | IEstreeMethodDefinition | TSDeclareMethod, kind: number): void {
        if (node.type === "TSDeclareMethod")
            return;
        // This happens when using the "estree" plugin.
        if (node.type === "MethodDefinition" && !(node.value as IHasBody<typeof node>).body)
            return;

        super.declareClassPrivateMethodInScope(node, kind);
    }

    protected override parseClassSuper(node: IClass): void {
        super.parseClassSuper(node);
        // handle `extends f<<T>
        if (node.superClass && (this.match(tokenTypes.lt) || this.match(tokenTypes.bitShiftL)))
            node.superTypeParameters = this.tsParseTypeArgumentsInExpression();
        if (this.eatContextual(tokenTypes._implements)) {
            node.implements = this.tsParseHeritageClause("implements");
        }
    }

    protected override parseObjPropValue(
        prop: IObjectProperty | IObjectMethod, startLoc: IPosition | undefined, isGenerator: boolean,
        isAsync: boolean, isPattern: boolean, isAccessor: boolean, refExpressionErrors?: ExpressionErrors) {

        const typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
        if (typeParameters)
            (prop as IObjectMethod).typeParameters = typeParameters;

        return super.parseObjPropValue(prop, startLoc, isGenerator, isAsync, isPattern, isAccessor, refExpressionErrors);
    }

    protected override parseFunctionParams(node: AnyFunction, isConstructor?: boolean | undefined): void {
        const typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
        if (typeParameters)
            node.typeParameters = typeParameters;
        super.parseFunctionParams(node, isConstructor);
    }

    protected override parseVarId(decl: IVariableDeclarator, kind: VariableKind): void {
        super.parseVarId(decl, kind);
        if (decl.id.type === "Identifier" && !this.hasPrecedingLineBreak() && this.eat(tokenTypes.bang))
            decl.definite = true;

        const type = this.tsTryParseTypeAnnotation();
        if (type) {
            decl.id.typeAnnotation = type;
            this.resetEndLocation(decl.id); // set end position to end of type
        }
    }

    protected override parseAsyncArrowFromCallExpression(node: IArrowFunctionExpression, call: ICallOrNewExpression): IArrowFunctionExpression {
        if (this.match(tokenTypes.colon))
            node.returnType = this.tsParseTypeAnnotation();
        return super.parseAsyncArrowFromCallExpression(node, call);
    }

    protected override registerFunctionStatementId(node: AnyFunction): void {
        // Function ids are validated after parsing their body.
        // For bodiless function, we need to do it here.
        if (!node.body && node.id)
            this.checkIdentifier(node.id, BIND_TS_AMBIENT);
        else
            super.registerFunctionStatementId(node);
    }

    protected override toReferencedList(exprList?: ReadonlyArray<Nullable<ExpressionNode>>, isParenthesizedExpr?: boolean) {

        this.tsCheckForInvalidTypeCasts(exprList);
        return exprList;
    }

    protected override parseArrayLike(close: number, canBePattern: boolean, isTuple: boolean, refExpressionErrors?: ExpressionErrors) {

        const node = super.parseArrayLike(close, canBePattern, isTuple, refExpressionErrors);

        if (node.type === "ArrayExpression")
            this.tsCheckForInvalidTypeCasts(node.elements);
        return node;
    }

    protected override parseNewCallee(node: ICallOrNewExpression): void {
        super.parseNewCallee(node);
        const { callee } = node;
        if (callee.type === "TSInstantiationExpression" && !(callee as IParenthesized)?.parenthesized) {
            node.typeParameters = callee.typeParameters;
            node.callee = callee.expression;
        }
    }

    protected override parseVarStatement(node: IVariableDeclaration, kind: VariableKind, allowMissingInitializer?: boolean): IVariableDeclaration {
        const { isAmbientContext } = this.state;
        const declaration = super.parseVarStatement(node, kind, allowMissingInitializer || isAmbientContext);

        if (!isAmbientContext)
            return declaration;

        for (const { id, init } of declaration.declarations) {
            // Empty initializer is the easy case that we want.
            if (!init)
                continue;

            // var and let aren't ever allowed initializers.
            if (kind !== "const" || !!id.typeAnnotation)
                this.raise(Errors.InitializerNotAllowedInAmbientContext, { at: init });
            else if (!ParserUtil.isValidAmbientConstInitializer(init, this.hasFeature("estree")))
                this.raise(Errors.ConstInitiailizerMustBeStringOrNumericLiteralOrLiteralEnumReference, { at: init });
        }
        return declaration;
    }

    protected override parseStatementContent(flags: ParseStatementFlag, decorators?: IDecorator[] | undefined): ExpressionNode {
        if (this.match(tokenTypes._const) && this.isLookaheadContextual("enum")) {
            const node = this.startNode<TsEnumDeclaration>();
            this.expect(tokenTypes._const); // eat 'const'
            return this.tsParseEnumDeclaration(node, { const: true });
        }

        if (this.isContextual(tokenTypes._enum))
            return this.tsParseEnumDeclaration(this.startNode<TsEnumDeclaration>());

        if (this.isContextual(tokenTypes._interface)) {
            const result = this.tsParseInterfaceDeclaration(this.startNode());
            if (result)
                return result;
        }

        return super.parseStatementContent(flags, decorators);
    }

    protected override parseClassMember(classBody: IClassBody, member: IClassMember | IStaticBlock | TsIndexSignature, state: IParseClassMemberState): void {
        const modifiers = ["declare", "private", "public", "protected", "override", "abstract", "readonly", "static"] as const;
        this.tsParseModifiers(
            {
                allowedModifiers: modifiers,
                disallowedModifiers: ["in", "out"],
                stopOnStartOfClassStaticBlock: true,
                errorTemplate: Errors.InvalidModifierOnTypeParameterPositions,
            },
            member as ModifierBase);

        const callParseClassMemberWithIsStatic = () => {
            if (this.tsIsStartOfStaticBlocks()) {
                this.next(); // eat "static"
                this.next(); // eat "{"
                if (this.tsHasSomeModifiers(member, modifiers))
                    this.raise(Errors.StaticBlockCannotHaveModifier, { at: this.state.currentPosition() });
                super.parseClassStaticBlock(classBody, member as IStaticBlock);
            } else {
                this.parseClassMemberWithIsStatic(classBody, (member as IClassMember | TsIndexSignature), state, !!(member as any).static);
            }
        };
        if ((member as IHasDeclare).declare) {
            this.tsInAmbientContext(callParseClassMemberWithIsStatic);
        } else {
            callParseClassMemberWithIsStatic();
        }
    }

    protected override parseClassMemberWithIsStatic(classBody: IClassBody, member: IClassMember | TsIndexSignature,
        state: IParseClassMemberState, isStatic: boolean) {

        const idx = this.tsTryParseIndexSignature(member as TsIndexSignature);
        if (idx) {
            classBody.children.push(idx);

            if ((member as any).abstract)
                this.raise(Errors.IndexSignatureHasAbstract, { at: member });
            if ((member as any).accessibility)
                this.raise(Errors.IndexSignatureHasAccessibility, { at: member, modifier: (member as any).accessibility });
            if ((member as any).declare)
                this.raise(Errors.IndexSignatureHasDeclare, { at: member });
            if ((member as any).override)
                this.raise(Errors.IndexSignatureHasOverride, { at: member });

            return;
        }

        if (!this.state.inAbstractClass && (member as any).abstract)
            this.raise(Errors.NonAbstractClassHasAbstractMethod, { at: member });

        if ((member as any).override && !state.hadSuperClass)
            this.raise(Errors.OverrideNotInSubClass, { at: member });
        super.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
    }

    protected override parsePostMemberNameModifiers(methodOrProp: IClassProperty | IClassMethod): void {
        const optional = this.eat(tokenTypes.question);
        if (optional) methodOrProp.optional = true;

        if ((methodOrProp as any).readonly && this.match(tokenTypes.parenL)) {
            this.raise(Errors.ClassMethodHasReadonly, { at: methodOrProp });
        }

        if ((methodOrProp as any).declare && this.match(tokenTypes.parenL)) {
            this.raise(Errors.ClassMethodHasDeclare, { at: methodOrProp });
        }
    }

    protected override applyImportPhase(node: IImportDeclaration | IExportNamedDeclaration, isExport: boolean, phase?: string, loc?: IPosition): void {
        super.applyImportPhase(node, isExport, phase, loc);
        if (isExport)
            (node as IExportNamedDeclaration).exportKind = phase === "type" ? "type" : "value";
        else
            (node as IImportDeclaration).importKind = phase === "type" || phase === "typeof" ? phase : "value";
    }

    protected override isPotentialImportPhase(isExport: boolean): boolean {
        if (super.isPotentialImportPhase(isExport))
            return true;
        if (this.isContextual(tokenTypes._type)) {
            const ch = this.lookaheadCharCode();
            return isExport ? ch === CharCodes.leftCurlyBrace || ch === CharCodes.asterisk : ch !== CharCodes.equalsTo;
        }
        return !isExport && this.isContextual(tokenTypes._typeof);
    }

    protected parseAccessModifier(): TsAccessibility | undefined {
        return this.tsParseModifier(["public", "protected", "private"]);
    }

    protected tsHasSomeModifiers(member: any, modifiers: readonly TsModifier[]): boolean {
        return modifiers.some(modifier => {
            if (this.tsIsAccessModifier(modifier))
                return member.accessibility === modifier;
            return !!member[modifier];
        });
    }

    protected parseClassPropertyAnnotation(node: IClassProperty | IClassPrivateProperty | IClassAccessorProperty): void {
        if (!node.optional) {
            if (this.eat(tokenTypes.bang))
                node.definite = true;
            else if (this.eat(tokenTypes.question))
                node.optional = true;
        }

        const type = this.tsTryParseTypeAnnotation();
        if (type)
            node.typeAnnotation = type;
    }

    protected reportReservedArrowTypeParam(node: any) {
        if (node.params.length === 1 && !node.params[0].constraint && !node.extra?.trailingComma)
            this.raise(Errors.ReservedArrowTypeParam, { at: node });
    }

    protected toAssignableParenthesizedExpression(node: IParenthesizedExpression, isLHS?: boolean): void {
        const expression = node.expression;
        switch (expression?.type) {
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSNonNullExpression":
            case "TSTypeAssertion":
            case "ParenthesizedExpression":
                this.toAssignable(expression, isLHS);
                break;
            default:
                super.toAssignable(node, isLHS);
        }
    }

    protected tsTryParseExportDeclaration() {
        return this.tsParseDeclaration(this.startNode(), this.state.value as string, true);
    }

    protected typeCastToParameter(node: TsTypeCastExpression) {
        (node.expression as IHasTypeAnnotation<any>).typeAnnotation = (node as IHasTypeAnnotation<any>).typeAnnotation;
        this.resetEndLocation(node.expression!, (node as IHasTypeAnnotation<any>).typeAnnotation.location.end);
        return node.expression!;
    }

    protected parseTypeOnlyImportExportSpecifier(node: any, isImport: boolean, isInTypeOnlyImportExport: boolean): void {
        const leftOfAsKey = isImport ? "imported" : "local";
        const rightOfAsKey = isImport ? "local" : "exported";

        let leftOfAs = node[leftOfAsKey];
        let rightOfAs;

        let hasTypeSpecifier = false;
        let canParseAsKeyword = true;

        const loc = leftOfAs.loc.start;

        // https://github.com/microsoft/TypeScript/blob/fc4f9d83d5939047aa6bb2a43965c6e9bbfbc35b/src/compiler/parser.ts#L7411-L7456
        // import { type } from "mod";          - hasTypeSpecifier: false, leftOfAs: type
        // import { type as } from "mod";       - hasTypeSpecifier: true,  leftOfAs: as
        // import { type as as } from "mod";    - hasTypeSpecifier: false, leftOfAs: type, rightOfAs: as
        // import { type as as as } from "mod"; - hasTypeSpecifier: true,  leftOfAs: as,   rightOfAs: as
        if (this.isContextual(tokenTypes._as)) {
            // { type as ...? }
            const firstAs = this.parseIdentifier();
            if (this.isContextual(tokenTypes._as)) {
                // { type as as ...? }
                const secondAs = this.parseIdentifier();
                if (Tokens.isKeywordOrIdentifier(this.state.type)) {
                    // { type as as something }
                    hasTypeSpecifier = true;
                    leftOfAs = firstAs;
                    rightOfAs = isImport ? this.parseIdentifier() : this.parseModuleExportName();
                    canParseAsKeyword = false;
                } else {
                    // { type as as }
                    rightOfAs = secondAs;
                    canParseAsKeyword = false;
                }
            } else if (Tokens.isKeywordOrIdentifier(this.state.type)) {
                // { type as something }
                canParseAsKeyword = false;
                rightOfAs = isImport ? this.parseIdentifier() : this.parseModuleExportName();
            } else {
                // { type as }
                hasTypeSpecifier = true;
                leftOfAs = firstAs;
            }
        } else if (Tokens.isKeywordOrIdentifier(this.state.type)) {
            // { type something ...? }
            hasTypeSpecifier = true;
            if (isImport) {
                leftOfAs = this.parseIdentifier(true);
                if (!this.isContextual(tokenTypes._as))
                    this.checkReservedWord(leftOfAs.name, leftOfAs.loc.start, true, true);
            } else {
                leftOfAs = this.parseModuleExportName();
            }
        }
        if (hasTypeSpecifier && isInTypeOnlyImportExport) {
            this.raise(isImport ? Errors.TypeModifierIsUsedInTypeImports : Errors.TypeModifierIsUsedInTypeExports, { at: loc });
        }

        node[leftOfAsKey] = leftOfAs;
        node[rightOfAsKey] = rightOfAs;

        const kindKey = isImport ? "importKind" : "exportKind";
        node[kindKey] = hasTypeSpecifier ? "type" : "value";

        if (canParseAsKeyword && this.eatContextual(tokenTypes._as))
            node[rightOfAsKey] = isImport ? this.parseIdentifier() : this.parseModuleExportName();
        if (!node[rightOfAsKey]) {
            node[rightOfAsKey] = ParserUtil.cloneIdentifier(node[leftOfAsKey]);
        }
        if (isImport)
            this.checkIdentifier(node[rightOfAsKey], hasTypeSpecifier ? BIND_TS_TYPE_IMPORT : BIND_FLAGS_TS_IMPORT);
    }

    protected tsParseImportEqualsDeclaration(node: TsImportEqualsDeclaration, maybeDefaultIdentifier?: Identifier, isExport?: boolean) {
        node.isExport = isExport || false;
        node.id = maybeDefaultIdentifier || this.parseIdentifier();
        this.checkIdentifier(node.id, BIND_FLAGS_TS_IMPORT);
        this.expect(tokenTypes.eq);
        const moduleReference = this.tsParseModuleReference();
        if (node.importKind === "type" && moduleReference.type !== "TSExternalModuleReference")
            this.raise(Errors.ImportAliasHasImportType, { at: moduleReference });

        node.moduleReference = moduleReference;
        this.semicolon();
        return this.finishNode(node, "TSImportEqualsDeclaration");
    }

    protected tsParseModuleReference() {
        return this.tsIsExternalModuleReference()
            ? this.tsParseExternalModuleReference()
            : this.tsParseEntityName(/* allowReservedWords */ false);
    }

    protected tsParseExternalModuleReference() {
        const node = this.startNode<TsExternalModuleReference>();
        this.expectContextual(tokenTypes._require);
        this.expect(tokenTypes.parenL);
        if (!this.match(tokenTypes.string)) {
            this.unexpected();
        }
        // For compatibility to estree we cannot call parseLiteral directly here
        node.expression = super.parseExprAtom() as IStringLiteral;
        this.expect(tokenTypes.parenR);
        this.sawUnambiguousESM = true;
        return this.finishNode(node, "TSExternalModuleReference");
    }

    protected tsParseTypeArgumentsInExpression() {
        if (this.reScan_lt() !== tokenTypes.lt)
            return;
        return this.tsParseTypeArguments();
    }

    protected tsTryParseGenericAsyncArrowFunction(startLoc: IPosition) {
        if (!this.match(tokenTypes.lt))
            return;

        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        this.state.maybeInArrowParameters = true;

        const res = this.tsTryParseAndCatch(() => {
            const node = this.startNodeAt<IArrowFunctionExpression>(startLoc);
            node.typeParameters = this.tsParseTypeParameters(
                this.tsParseConstModifier,
            );
            // Don't use overloaded parseFunctionParams which would look for "<" again.
            super.parseFunctionParams(node);
            node.returnType = this.tsTryParseTypeOrTypePredicateAnnotation();
            this.expect(tokenTypes.arrow);
            return node;
        });

        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;

        if (!res)
            return;

        return super.parseArrowExpression(res, null, true);
    }

    protected tsTryParseTypeOrTypePredicateAnnotation() {
        if (this.match(tokenTypes.colon))
            return this.tsParseTypeOrTypePredicateAnnotation(tokenTypes.colon);
        return undefined;
    }

    protected tsParseTypeOrTypePredicateAnnotation(returnToken: number) {
        return this.tsInType(() => {
            const t = this.startNode<TsTypeAnnotation>();
            this.expect(returnToken);
            const node = this.startNode<TsTypePredicate>();
            const asserts = !!this.tsTryParse(() => this.tsParseTypePredicateAsserts());

            if (asserts && this.match(tokenTypes._this)) {
                // When asserts is false, thisKeyword is handled by tsParseNonArrayType
                // : asserts this is type
                let thisTypePredicate = this.tsParseThisTypeOrThisTypePredicate();
                // if it turns out to be a `TSThisType`, wrap it with `TSTypePredicate`
                // : asserts this
                if (thisTypePredicate.type === "TSThisType") {
                    node.parameterName = thisTypePredicate;
                    node.asserts = true;
                    node.typeAnnotation = undefined;
                    thisTypePredicate = this.finishNode(node, "TSTypePredicate");
                } else {
                    this.resetStartLocationFromNode(thisTypePredicate, node);
                    thisTypePredicate.asserts = true;
                }
                t.typeAnnotation = thisTypePredicate;
                return this.finishNode(t, "TSTypeAnnotation");
            }

            const typePredicateVariable = this.tsIsIdentifier() && this.tsTryParse(() => this.tsParseTypePredicatePrefix());

            if (!typePredicateVariable) {
                if (!asserts) // : type
                    return this.tsParseTypeAnnotation(/* eatColon */ false, t);

                // : asserts foo
                node.parameterName = this.parseIdentifier();
                node.asserts = asserts;
                node.typeAnnotation = undefined;
                t.typeAnnotation = this.finishNode(node, "TSTypePredicate");
                return this.finishNode(t, "TSTypeAnnotation");
            }

            // : asserts foo is type
            const type = this.tsParseTypeAnnotation(/* eatColon */ false);
            node.parameterName = typePredicateVariable;
            node.typeAnnotation = type;
            node.asserts = asserts;
            t.typeAnnotation = this.finishNode(node, "TSTypePredicate");
            return this.finishNode(t, "TSTypeAnnotation");
        });
    }

    protected tsParseTypePredicatePrefix() {
        const id = this.parseIdentifier();
        if (this.isContextual(tokenTypes._is) && !this.hasPrecedingLineBreak()) {
            this.next();
            return id;
        }

        return undefined;
    }

    protected tsParseTypePredicateAsserts(): boolean {
        if (this.state.type !== tokenTypes._asserts)
            return false;
        const containsEsc = this.state.containsEsc;
        this.next();
        if (!this.tsIsIdentifier() && !this.match(tokenTypes._this))
            return false;

        if (containsEsc)
            this.raise(Errors.InvalidEscapedReservedWord, { at: this.state.lastTokenStartLocation, reservedWord: "asserts" });

        return true;
    }

    protected tsNextTokenCanFollowModifier() {
        this.next();
        return this.tsTokenCanFollowModifier();
    }

    protected tsParseThisTypeOrThisTypePredicate() {
        const thisKeyword = this.tsParseThisTypeNode();
        if (this.isContextual(tokenTypes._is) && !this.hasPrecedingLineBreak())
            return this.tsParseThisTypePredicate(thisKeyword);
        else
            return thisKeyword;
    }

    protected tsParseThisTypePredicate(lhs: TsThisType) {
        this.next();
        const node = this.startNodeAtNode<TsTypePredicate>(lhs);
        node.parameterName = lhs;
        node.typeAnnotation = this.tsParseTypeAnnotation(/* eatColon */ false);
        node.asserts = false;
        return this.finishNode(node, "TSTypePredicate");
    }

    protected tsParseTypeAnnotation(eatColon = true, t: TsTypeAnnotation = this.startNode<TsTypeAnnotation>()) {
        this.tsInType(() => {
            if (eatColon) this.expect(tokenTypes.colon);
            t.typeAnnotation = this.tsParseType();
        });
        return this.finishNode(t, "TSTypeAnnotation");
    }

    protected tsParseType() {
        this.assert(this.state.inType);
        const type = this.tsParseNonConditionalType();

        if (this.state.inDisallowConditionalTypesContext || this.hasPrecedingLineBreak() || !this.eat(tokenTypes._extends))
            return type;
        const node = this.startNodeAtNode<TsConditionalType>(type);
        node.checkType = type;

        node.extendsType = this.tsInDisallowConditionalTypesContext(() => this.tsParseNonConditionalType());

        this.expect(tokenTypes.question);
        node.trueType = this.tsInAllowConditionalTypesContext(() => this.tsParseType());

        this.expect(tokenTypes.colon);
        node.falseType = this.tsInAllowConditionalTypesContext(() => this.tsParseType());

        return this.finishNode(node, "TSConditionalType");
    }

    protected tsParseNonConditionalType() {
        if (this.tsIsStartOfFunctionType())
            return this.tsParseFunctionOrConstructorType("TSFunctionType");

        if (this.match(tokenTypes._new))  // As in `new () => Date`
            return this.tsParseFunctionOrConstructorType("TSConstructorType");
        else if (this.isAbstractConstructorSignature()) // As in `abstract new () => Date`
            return this.tsParseFunctionOrConstructorType("TSConstructorType",/* abstract */ true);

        return this.tsParseUnionTypeOrHigher();
    }

    protected tsParseFunctionOrConstructorType(type: "TSFunctionType" | "TSConstructorType", abstract?: boolean) {
        const node = this.startNode<TsFunctionType | TsConstructorType>();
        node.type = type;
        if (node.type === "TSConstructorType") {
            node.abstract = !!abstract;
            if (abstract)
                this.next();
            this.next(); // eat `new`
        }
        this.tsInAllowConditionalTypesContext(() => this.tsFillSignature(tokenTypes.arrow, node));
        return this.finishNode(node, type);
    }

    protected tsParseUnionTypeOrHigher() {
        return this.tsParseUnionOrIntersectionType("TSUnionType", () => this.tsParseIntersectionTypeOrHigher(), tokenTypes.bitwiseOR);
    }

    protected tsParseUnionOrIntersectionType(
        kind: "TSUnionType" | "TSIntersectionType", parseConstituentType: () => TsType, operator: number): TsType {
        const node = this.startNode<TsUnionType | TsIntersectionType>();
        const hasLeadingOperator = this.eat(operator);
        const types = [];
        do {
            types.push(parseConstituentType());
        } while (this.eat(operator));
        if (types.length === 1 && !hasLeadingOperator)
            return types[0];

        node.types = types;
        return this.finishNode(node, kind);
    }

    protected tsParseIntersectionTypeOrHigher(): TsType {
        return this.tsParseUnionOrIntersectionType("TSIntersectionType", () => this.tsParseTypeOperatorOrHigher(), tokenTypes.bitwiseAND);
    }

    protected tsParseTypeOperatorOrHigher() {
        const isTypeOperator = Tokens.isTSTypeOperator(this.state.type) && !this.state.containsEsc;
        return isTypeOperator
            ? this.tsParseTypeOperator()
            : this.isContextual(tokenTypes._infer)
                ? this.tsParseInferType()
                : this.tsInAllowConditionalTypesContext(() => this.tsParseArrayTypeOrHigher(),
                );
    }

    protected tsParseArrayTypeOrHigher() {
        let type = this.tsParseNonArrayType();
        while (!this.hasPrecedingLineBreak() && this.eat(tokenTypes.bracketL)) {
            if (this.match(tokenTypes.bracketR)) {
                const node = this.startNodeAtNode<TsArrayType>(type);
                node.elementType = type;
                this.expect(tokenTypes.bracketR);
                type = this.finishNode(node, "TSArrayType");
            } else {
                const node = this.startNodeAtNode<TsIndexedAccessType>(type);
                node.objectType = type;
                node.indexType = this.tsParseType();
                this.expect(tokenTypes.bracketR);
                type = this.finishNode(node, "TSIndexedAccessType");
            }
        }
        return type;
    }

    protected tsParseNonArrayType() {
        switch (this.state.type) {
            case tokenTypes.string:
            case tokenTypes.num:
            case tokenTypes.bigint:
            case tokenTypes._true:
            case tokenTypes._false:
                return this.tsParseLiteralTypeNode();
            case tokenTypes.plusMin:
                if (this.state.value === "-") {
                    const node = this.startNode<TsLiteralType>();
                    const nextToken = this.lookahead();
                    if (nextToken.type !== tokenTypes.num && nextToken.type !== tokenTypes.bigint)
                        this.unexpected();
                    node.literal = this.parseMaybeUnary() as ILiteralExpression;
                    return this.finishNode(node, "TSLiteralType");
                }
                break;
            case tokenTypes._this:
                return this.tsParseThisTypeOrThisTypePredicate();
            case tokenTypes._typeof:
                return this.tsParseTypeQuery();
            case tokenTypes._import:
                return this.tsParseImportType();
            case tokenTypes.braceL:
                return this.tsLookAhead(() => this.tsIsStartOfMappedType()) ? this.tsParseMappedType() : this.tsParseTypeLiteral();
            case tokenTypes.bracketL:
                return this.tsParseTupleType();
            case tokenTypes.parenL:
                if (!this.options.createParenthesizedExpressions) {
                    const startLoc = this.state.startLocation;
                    this.next();
                    const type = this.tsParseType();
                    this.expect(tokenTypes.parenR);
                    (type as IParenthesized).parenthesized = true;
                    (type as IParenthesized).parentStart = startLoc.index;
                    return type;
                }

                return this.tsParseParenthesizedType();
            case tokenTypes.templateNonTail:
            case tokenTypes.templateTail:
                return this.tsParseTemplateLiteralType();
            default: {
                const { type } = this.state;
                if (Tokens.isIdentifier(type) || type === tokenTypes._void || type === tokenTypes._null) {
                    const nodeType = type === tokenTypes._void
                        ? "TSVoidKeyword" : type === tokenTypes._null ? "TSNullKeyword" : this.keywordTypeFromName(this.state.value as string);
                    if (nodeType !== undefined && this.lookaheadCharCode() !== CharCodes.dot) {
                        const node = this.startNode<TsKeywordType>();
                        this.next();
                        return this.finishNode(node, nodeType);
                    }
                    return this.tsParseTypeReference();
                }
            }
        }
        this.unexpected();
    }

    protected tsParseTypeAssertion() {
        const node = this.startNode<TsTypeAssertion>();
        node.typeAnnotation = this.tsInType(() => {
            this.next(); // "<"
            return this.match(tokenTypes._const)
                ? this.tsParseTypeReference()
                : this.tsParseType();
        });
        this.expect(tokenTypes.gt);
        node.expression = this.parseMaybeUnary();
        return this.finishNode(node, "TSTypeAssertion");
    }

    protected tsParseExpressionStatement(node: TsModuleDeclaration, expr: Identifier, decorators?: IDecorator[]) {
        switch (expr.name) {
            case "declare": {
                const declaration = this.tsTryParseDeclare(node);
                if (declaration)
                    declaration.declare = true;
                return declaration;
            }
            case "global":
                // `global { }` (with no `declare`) may appear inside an ambient module declaration.
                // Would like to use tsParseAmbientExternalModuleDeclaration here, but already ran past "global".
                if (this.match(tokenTypes.braceL)) {
                    this.scope.enter(SCOPE_TS_MODULE);
                    this.prodParam.enter(PARAM);
                    const mod = node;
                    mod.global = true;
                    mod.id = expr;
                    mod.body = this.tsParseModuleBlock();
                    this.scope.exit();
                    this.prodParam.exit();
                    return this.finishNode(mod, "TSModuleDeclaration");
                }
                return undefined;
            default:
                return this.tsParseDeclaration(node, expr.name,/* next */ false, decorators);
        }
    }

    protected tsParseModuleBlock() {
        const node = this.startNode<TsModuleBlock>();
        this.scope.enter(SCOPE_OTHER);

        this.expect(tokenTypes.braceL);
        // Inside of a module block is considered "top-level", meaning it can have imports and exports.
        super.parseBlockOrModuleBlockBody(node.children, true, tokenTypes.braceR);
        this.scope.exit();
        return this.finishNode(node, "TSModuleBlock");
    }

    protected tsTryParseDeclare(node: ExpressionNode) {
        if (this.isLineTerminator())
            return;
        let startType = this.state.type;
        let kind: "let" | null;

        if (this.isContextual(tokenTypes._let)) {
            startType = tokenTypes._var;
            kind = "let";
        }

        return this.tsInAmbientContext(() => {
            switch (startType) {
                case tokenTypes._function:
                    node = node as IFunctionDeclaration
                    node.declare = true;
                    return super.parseFunctionStatement(node, false, false);
                case tokenTypes._class:
                    node = node as IClassDeclaration;
                    // While this is also set by tsParseExpressionStatement, we need to set it
                    // before parsing the class declaration to know how to register it in the scope.
                    node.declare = true;
                    return this.parseClass(node, true, false);
                case tokenTypes._enum:
                    return this.tsParseEnumDeclaration(node as TsEnumDeclaration, { declare: true });
                case tokenTypes._global:
                    return this.tsParseAmbientExternalModuleDeclaration(node as TsModuleDeclaration);
                case tokenTypes._const:
                case tokenTypes._var:
                    if (!this.match(tokenTypes._const) || !this.isLookaheadContextual("enum")) {
                        node = node as IVariableDeclaration;
                        node.declare = true;
                        return this.parseVarStatement(node, kind || this.state.value as VariableKind, true);
                    }
                    // `const enum = 0;` not allowed because "enum" is a strict mode reserved word.
                    this.expect(tokenTypes._const);
                    return this.tsParseEnumDeclaration(node as TsEnumDeclaration, { const: true, declare: true });
                case tokenTypes._interface:
                default:
                    if (startType === tokenTypes._interface) {
                        const result = this.tsParseInterfaceDeclaration(node as TsInterfaceDeclaration, { declare: true });
                        if (result)
                            return result;
                    }

                    if (Tokens.isIdentifier(startType))
                        return this.tsParseDeclaration(node, this.state.value as string, true, undefined);
                    return undefined;
            }
        });
    }

    protected tsParseEnumDeclaration(node: TsEnumDeclaration, properties: { const?: true; declare?: true; } = {}) {
        if (properties.const)
            node.const = true;
        if (properties.declare)
            node.declare = true;
        this.expectContextual(tokenTypes._enum);
        node.id = this.parseIdentifier();
        this.checkIdentifier(node.id, node.const ? BIND_TS_CONST_ENUM : BIND_TS_ENUM);
        this.expect(tokenTypes.braceL);
        node.children = this.tsParseDelimitedList("EnumMembers", () => this.tsParseEnumMember());
        this.expect(tokenTypes.braceR);
        return this.finishNode(node, "TSEnumDeclaration");
    }

    protected tsParseEnumMember() {
        const node = this.startNode<TsEnumMember>();
        // Computed property names are grammar errors in an enum, so accept just string literal or identifier.
        node.id = this.match(tokenTypes.string) ? super.parseStringLiteral(this.state.value as string) : this.parseIdentifier(true);
        if (this.eat(tokenTypes.eq))
            node.initializer = super.parseMaybeAssignAllowIn();
        return this.finishNode(node, "TSEnumMember");
    }

    protected tsParseInOutConstModifiers<N extends ModifierBase>(modified: N) {
        this.tsParseModifiers({
            allowedModifiers: ["in", "out", "const"],
            disallowedModifiers: ["public", "private", "protected", "readonly", "declare", "abstract", "override"],
            errorTemplate: Errors.InvalidModifierOnTypeParameter,
        }, modified);
    }

    protected tsParseInterfaceDeclaration(node: TsInterfaceDeclaration, properties: { declare?: true; } = {}) {
        if (this.hasFollowingLineBreak())
            return undefined;
        this.expectContextual(tokenTypes._interface);
        if (properties.declare)
            node.declare = true;
        if (Tokens.isIdentifier(this.state.type)) {
            node.id = this.parseIdentifier();
            this.checkIdentifier(node.id, BIND_TS_INTERFACE);
        } else {
            node.id = null;
            this.raise(Errors.MissingInterfaceName, { at: this.state.startLocation });
        }

        node.typeParameters = this.tsTryParseTypeParameters(this.tsParseInOutConstModifiers);
        if (this.eat(tokenTypes._extends))
            node.extends = this.tsParseHeritageClause("extends");
        const body = this.startNode<TsInterfaceBody>();
        body.children = this.tsInType(() => this.tsParseObjectTypeMembers());
        node.body = this.finishNode(body, "TSInterfaceBody");
        return this.finishNode(node, "TSInterfaceDeclaration");
    }

    protected tsParseDeclaration(node: ExpressionNode, value: string, next: boolean, decorators?: IDecorator[]) {
        // no declaration apart from enum can be followed by a line break.
        switch (value) {
            case "abstract":
                if (this.tsCheckLineTerminator(next) && (this.match(tokenTypes._class) || Tokens.isIdentifier(this.state.type)))
                    return this.tsParseAbstractDeclaration(node, decorators);
                break;
            case "module":
                if (this.tsCheckLineTerminator(next)) {
                    if (this.match(tokenTypes.string))
                        return this.tsParseAmbientExternalModuleDeclaration(node as TsModuleDeclaration);
                    else if (Tokens.isIdentifier(this.state.type))
                        return this.tsParseModuleOrNamespaceDeclaration(node as TsModuleDeclaration);
                }
                break;
            case "namespace":
                if (this.tsCheckLineTerminator(next) && Tokens.isIdentifier(this.state.type))
                    return this.tsParseModuleOrNamespaceDeclaration(node as TsModuleDeclaration);
                break;
            case "type":
                if (this.tsCheckLineTerminator(next) && Tokens.isIdentifier(this.state.type))
                    return this.tsParseTypeAliasDeclaration(node as TsTypeAliasDeclaration);
                break;
        }

        return undefined;
    }

    protected tsParseAmbientExternalModuleDeclaration(node: TsModuleDeclaration) {
        if (this.isContextual(tokenTypes._global)) {
            node.global = true;
            node.id = this.parseIdentifier();
        } else if (this.match(tokenTypes.string)) {
            node.id = super.parseStringLiteral(this.state.value as string);
        } else {
            this.unexpected();
        }
        if (this.match(tokenTypes.braceL)) {
            this.scope.enter(SCOPE_TS_MODULE);
            this.prodParam.enter(PARAM);
            node.body = this.tsParseModuleBlock();
            this.prodParam.exit();
            this.scope.exit();
        } else {
            this.semicolon();
        }

        return this.finishNode(node, "TSModuleDeclaration");
    }

    protected tsParseAbstractDeclaration(node: ExpressionNode, decorators?: IDecorator[]) {
        if (this.match(tokenTypes._class)) {
            node = node as IClassDeclaration;
            node.abstract = true;
            return this.maybeTakeDecorators(decorators, this.parseClass(node, true, false));
        } else if (this.isContextual(tokenTypes._interface)) {
            // for invalid abstract interface

            // To avoid
            //   abstract interface
            //   Foo {}
            if (!this.hasFollowingLineBreak()) {
                (node as any).abstract = true;
                this.raise(Errors.NonClassMethodPropertyHasAbstractModifer, { at: node });
                return this.tsParseInterfaceDeclaration(node as TsInterfaceDeclaration);
            }
        } else {
            this.unexpected(undefined, tokenTypes._class);
        }
        return undefined;
    }

    protected tsParseModuleOrNamespaceDeclaration(node: TsModuleDeclaration, nested: boolean = false) {
        node.id = this.parseIdentifier();

        if (!nested)
            this.checkIdentifier(node.id, BIND_TS_NAMESPACE);

        if (this.eat(tokenTypes.dot)) {
            const inner = this.startNode<TsModuleDeclaration>();
            this.tsParseModuleOrNamespaceDeclaration(inner, true);
            node.body = inner as TsNamespaceDeclaration;
        } else {
            this.scope.enter(SCOPE_TS_MODULE);
            this.prodParam.enter(PARAM);
            node.body = this.tsParseModuleBlock();
            this.prodParam.exit();
            this.scope.exit();
        }
        return this.finishNode(node, "TSModuleDeclaration");
    }

    protected tsParseTypeAliasDeclaration(node: TsTypeAliasDeclaration) {
        node.id = this.parseIdentifier();
        this.checkIdentifier(node.id, BIND_TS_TYPE);

        node.typeAnnotation = this.tsInType(() => {
            node.typeParameters = this.tsTryParseTypeParameters(this.tsParseInOutModifiers);

            this.expect(tokenTypes.eq);

            if (this.isContextual(tokenTypes._intrinsic) && this.lookahead().type !== tokenTypes.dot) {
                const node = this.startNode<TsKeywordType>();
                this.next();
                return this.finishNode(node, "TSIntrinsicKeyword");
            }

            return this.tsParseType();
        });

        this.semicolon();
        return this.finishNode(node, "TSTypeAliasDeclaration");
    }

    protected tsParseTupleType() {
        const node = this.startNode<TsTupleType>();
        node.elementTypes = this.tsParseBracketedList("TupleElementTypes", () => this.tsParseTupleElementType(), true, false);

        // Validate the elementTypes to ensure that no mandatory elements
        // follow optional elements
        let seenOptionalElement = false;
        let labeledElements: boolean | null = null;
        node.elementTypes.forEach(elementNode => {
            const { type } = elementNode;

            if (seenOptionalElement && type !== "TSRestType" &&
                type !== "TSOptionalType" && !(type === "TSNamedTupleMember" && elementNode.optional)) {
                this.raise(Errors.OptionalTypeBeforeRequired, { at: elementNode });
            }

            seenOptionalElement ||= (type === "TSNamedTupleMember" && elementNode.optional) || type === "TSOptionalType";

            // When checking labels, check the argument of the spread operator
            let checkType = type;
            if (type === "TSRestType") {
                elementNode = elementNode.typeAnnotation;
                checkType = elementNode.type;
            }

            const isLabeled = checkType === "TSNamedTupleMember";
            labeledElements ??= isLabeled;
            if (labeledElements !== isLabeled)
                this.raise(Errors.MixedLabeledAndUnlabeledElements, { at: elementNode });
        });

        return this.finishNode(node, "TSTupleType");
    }

    protected tsParseHeritageClause(token: "extends" | "implements") {
        const originalStartLoc = this.state.startLocation;

        const delimitedList = this.tsParseDelimitedList(
            "HeritageClauseElement",
            () => {
                const node = this.startNode<TsExpressionWithTypeArguments>();
                node.expression = this.tsParseEntityName();
                if (this.match(tokenTypes.lt))
                    node.typeParameters = this.tsParseTypeArguments();
                return this.finishNode(node, "TSExpressionWithTypeArguments");
            },
        );

        if (!delimitedList.length)
            this.raise(Errors.EmptyHeritageClauseType, { at: originalStartLoc, token });

        return delimitedList;
    }

    protected tsParseTupleElementType() {

        const { startLocation } = this.state;

        const rest = this.eat(tokenTypes.ellipsis);

        let labeled: boolean;
        let label: Identifier | undefined = undefined;
        let optional: boolean;
        let type: TsType | TsNamedTupleMember;

        const isWord = Tokens.isKeywordOrIdentifier(this.state.type);
        const chAfterWord = isWord ? this.lookaheadCharCode() : null;
        if (chAfterWord === CharCodes.colon) {
            labeled = true;
            optional = false;
            label = this.parseIdentifier(true);
            this.expect(tokenTypes.colon);
            type = this.tsParseType();
        } else if (chAfterWord === CharCodes.questionMark) {
            optional = true;
            const startLoc = this.state.startLocation;
            const wordName = this.state.value as string;
            const typeOrLabel = this.tsParseNonArrayType();

            if (this.lookaheadCharCode() === CharCodes.colon) {
                labeled = true;
                label = this.createIdentifier(this.startNodeAt<Identifier>(startLoc), wordName);
                this.expect(tokenTypes.question);
                this.expect(tokenTypes.colon);
                type = this.tsParseType();
            } else {
                labeled = false;
                type = typeOrLabel;
                this.expect(tokenTypes.question);
            }
        } else {
            type = this.tsParseType();
            optional = this.eat(tokenTypes.question);
            // In this case (labeled === true) could be only in invalid label.
            // E.g. [x.y:type]
            // An error is raised while processing node.
            labeled = this.eat(tokenTypes.colon);
        }

        if (labeled) {
            let labeledNode: TsNamedTupleMember;
            if (label) {
                labeledNode = this.startNodeAtNode<TsNamedTupleMember>(label);
                labeledNode.optional = optional;
                labeledNode.label = label;
                labeledNode.elementType = type;

                if (this.eat(tokenTypes.question)) {
                    labeledNode.optional = true;
                    this.raise(Errors.TupleOptionalAfterType, { at: this.state.lastTokenStartLocation });
                }
            } else {
                labeledNode = this.startNodeAtNode<TsNamedTupleMember>(type);
                labeledNode.optional = optional;
                this.raise(Errors.InvalidTupleMemberLabel, { at: type });
                // nodes representing the invalid source.
                labeledNode.label = type as any as Identifier;
                labeledNode.elementType = this.tsParseType();
            }
            type = this.finishNode(labeledNode, "TSNamedTupleMember");
        } else if (optional) {
            const optionalTypeNode = this.startNodeAtNode<TsOptionalType>(type);
            optionalTypeNode.typeAnnotation = type;
            type = this.finishNode(optionalTypeNode, "TSOptionalType");
        }

        if (rest) {
            const restNode = this.startNodeAt<TsRestType>(startLocation);
            restNode.typeAnnotation = type;
            type = this.finishNode(restNode, "TSRestType");
        }

        return type;
    }

    protected tsParseMappedType() {
        const node = this.startNode<TsMappedType>();
        this.expect(tokenTypes.braceL);
        if (this.match(tokenTypes.plusMin)) {
            node.readonly = this.state.value as TsMappedType["optional"];;
            this.next();
            this.expectContextual(tokenTypes._readonly);
        } else if (this.eatContextual(tokenTypes._readonly)) {
            node.readonly = true;
        }

        this.expect(tokenTypes.bracketL);
        node.typeParameter = this.tsParseMappedTypeParameter();
        node.nameType = this.eatContextual(tokenTypes._as) ? this.tsParseType() : undefined;

        this.expect(tokenTypes.bracketR);

        if (this.match(tokenTypes.plusMin)) {
            node.optional = this.state.value as TsMappedType["optional"];
            this.next();
            this.expect(tokenTypes.question);
        } else if (this.eat(tokenTypes.question)) {
            node.optional = true;
        }

        node.typeAnnotation = this.tsTryParseType();
        this.semicolon();
        this.expect(tokenTypes.braceR);

        return this.finishNode(node, "TSMappedType");
    }

    protected tsParseMappedTypeParameter() {
        const node = this.startNode<TsTypeParameter>();
        node.name = this.tsParseTypeParameterName();
        node.constraint = this.tsExpectThenParseType(tokenTypes._in);
        return this.finishNode(node, "TSTypeParameter");
    }

    protected tsExpectThenParseType(token: number) {
        return this.tsInType(() => {
            this.expect(token);
            return this.tsParseType();
        });
    }

    protected tsTryParseType() {
        return this.tsEatThenParseType(tokenTypes.colon);
    }

    protected tsParseTypeLiteral() {
        const node = this.startNode<TsTypeLiteral>();
        node.members = this.tsParseObjectTypeMembers();
        return this.finishNode(node, "TSTypeLiteral");
    }

    protected tsParseObjectTypeMembers() {
        this.expect(tokenTypes.braceL);
        const members = this.tsParseList("TypeMembers", () => this.tsParseTypeMember());
        this.expect(tokenTypes.braceR);
        return members;
    }

    protected tsParseList<T extends ExpressionNode>(kind: ParsingContext, parseElement: () => T): T[] {
        const result: T[] = [];
        // Skipping "parseListElement" from the TS source since that's just for error handling.
        while (!this.tsIsListTerminator(kind))
            result.push(parseElement());
        return result;
    }

    protected tsParseTypeMember(): TsTypeElement {
        const node: any = this.startNode(); // TODO: try to avoid any
        if (this.matchOne(tokenTypes.parenL, tokenTypes.lt))
            return this.tsParseSignatureMember("TSCallSignatureDeclaration", node);

        if (this.match(tokenTypes._new)) {
            const id = this.startNode<Identifier>();
            this.next();
            if (this.matchOne(tokenTypes.parenL, tokenTypes.lt)) {
                return this.tsParseSignatureMember("TSConstructSignatureDeclaration", node);
            } else {
                node.key = this.createIdentifier(id, "new");
                return this.tsParsePropertyOrMethodSignature(node, false);
            }
        }

        this.tsParseModifiers(
            {
                allowedModifiers: ["readonly"],
                disallowedModifiers: ["declare", "abstract", "private", "protected", "public", "static", "override"],
            },
            node,
        );

        const idx = this.tsTryParseIndexSignature(node);
        if (idx)
            return idx;
        super.parsePropertyName(node);
        if (!node.computed && node.key.type === "Identifier"
            && (node.key.name === "get" || node.key.name === "set") && this.tsTokenCanFollowModifier()) {
            node.kind = node.key.name;
            super.parsePropertyName(node);
        }
        return this.tsParsePropertyOrMethodSignature(node, !!node.readonly);
    }

    protected tsTryParseIndexSignature(node: TsIndexSignature) {
        if (!(this.match(tokenTypes.bracketL) && this.tsLookAhead(() => this.tsIsUnambiguouslyIndexSignature()))) {
            return;
        }

        this.expect(tokenTypes.bracketL);
        const id = this.parseIdentifier();
        id.typeAnnotation = this.tsParseTypeAnnotation();
        this.resetEndLocation(id); // set end position to end of type

        this.expect(tokenTypes.bracketR);
        node.params = [id];

        const type = this.tsTryParseTypeAnnotation();
        if (type) node.typeAnnotation = type;
        this.tsParseTypeMemberSemicolon();
        return this.finishNode(node, "TSIndexSignature");
    }

    protected tsTokenCanFollowModifier() {
        return (
            (this.match(tokenTypes.bracketL) ||
                this.match(tokenTypes.braceL) ||
                this.match(tokenTypes.star) ||
                this.match(tokenTypes.ellipsis) ||
                this.match(tokenTypes.privateName) ||
                this.isLiteralPropertyName()) &&
            !this.hasPrecedingLineBreak()
        );
    }

    protected tsParsePropertyOrMethodSignature(node: TsPropertySignature | TsMethodSignature, readonly: boolean) {
        if (this.eat(tokenTypes.question)) node.optional = true;
        //const nodeAny: any = node;

        if (this.match(tokenTypes.parenL) || this.match(tokenTypes.lt)) {
            if (readonly)
                this.raise(Errors.ReadonlyForMethodSignature, { at: node });
            const method = node as TsMethodSignature;
            if (method.kind && this.match(tokenTypes.lt))
                this.raise(Errors.AccesorCannotHaveTypeParameters, { at: this.state.currentPosition() });
            this.tsFillSignature(tokenTypes.colon, method);
            this.tsParseTypeMemberSemicolon();
            if (method.kind === "get") {
                if (method.params.length > 0) {
                    this.raise(Errors.BadGetterArity, { at: this.state.currentPosition() });
                    if (this.isThisParam(method.params[0]))
                        this.raise(Errors.AccesorCannotDeclareThisParameter, { at: this.state.currentPosition() });
                }
            } else if (method.kind === "set") {
                if (method.params.length !== 1) {
                    this.raise(Errors.BadSetterArity, { at: this.state.currentPosition() });
                } else {
                    const firstParameter = method.params[0];
                    if (this.isThisParam(firstParameter))
                        this.raise(Errors.AccesorCannotDeclareThisParameter, { at: this.state.currentPosition() });
                    if (firstParameter?.type === "Identifier" && firstParameter.optional)
                        this.raise(Errors.SetAccesorCannotHaveOptionalParameter, { at: this.state.currentPosition() });
                    if (firstParameter?.type === "RestElement")
                        this.raise(Errors.SetAccesorCannotHaveRestParameter, { at: this.state.currentPosition() });
                }
                if (method.returnType)
                    this.raise(Errors.SetAccesorCannotHaveReturnType, { at: method.returnType });
            } else {
                method.kind = "method";
            }
            return this.finishNode(method, "TSMethodSignature");
        } else {
            const property = node as TsPropertySignature;
            if (readonly)
                property.readonly = true;
            const type = this.tsTryParseTypeAnnotation();
            if (type)
                property.typeAnnotation = type;
            this.tsParseTypeMemberSemicolon();
            return this.finishNode(property, "TSPropertySignature");
        }
    }

    protected tsTryParseTypeAnnotation() {
        if (this.match(tokenTypes.colon))
            return this.tsParseTypeAnnotation();
        return undefined;
    }

    protected tsParseSignatureMember<T extends TsCallSignatureDeclaration | TsConstructSignatureDeclaration>(kind: T["type"], node: T) {
        this.tsFillSignature(tokenTypes.colon, node);
        this.tsParseTypeMemberSemicolon();
        return this.finishNode(node, kind);
    }

    protected tsParseTypeQuery() {
        const node = this.startNode<TsTypeQuery>();
        this.expect(tokenTypes._typeof);
        if (this.match(tokenTypes._import))
            node.exprName = this.tsParseImportType();
        else
            node.exprName = this.tsParseEntityName();

        if (!this.hasPrecedingLineBreak() && this.match(tokenTypes.lt))
            node.typeParameters = this.tsParseTypeArguments();
        return this.finishNode(node, "TSTypeQuery");
    }

    protected tsParseImportType() {
        const node = this.startNode<TsImportType>();
        this.expect(tokenTypes._import);
        this.expect(tokenTypes.parenL);
        if (!this.match(tokenTypes.string))
            this.raise(Errors.UnsupportedImportTypeArgument, { at: this.state.startLocation });

        // For compatibility to estree we cannot call parseLiteral directly here
        node.argument = super.parseExprAtom() as IStringLiteral;
        this.expect(tokenTypes.parenR);

        // In this instance, the entity name will actually itself be a
        // qualifier, so allow it to be a reserved word as well.
        if (this.eat(tokenTypes.dot))
            node.qualifier = this.tsParseEntityName();
        if (this.match(tokenTypes.lt)) {
            node.typeParameters = this.tsParseTypeArguments();
        }
        return this.finishNode(node, "TSImportType");
    }

    protected tsParseLiteralTypeNode() {
        const node = this.startNode<TsLiteralType>();
        switch (this.state.type) {
            case tokenTypes.num:
            case tokenTypes.bigint:
            case tokenTypes.string:
            case tokenTypes._true:
            case tokenTypes._false:
                // For compatibility to estree we cannot call parseLiteral directly here
                node.literal = super.parseExprAtom() as ILiteralExpression;
                break;
            default:
                this.unexpected();
        }
        return this.finishNode(node, "TSLiteralType");
    }

    protected tsParseTemplateLiteralType() {
        const node = this.startNode<TsLiteralType>();
        node.literal = super.parseTemplate(false);
        return this.finishNode(node, "TSLiteralType");
    }

    protected tsParseParenthesizedType() {
        const node = this.startNode<TsParenthesizedType>();
        this.expect(tokenTypes.parenL);
        node.typeAnnotation = this.tsParseType();
        this.expect(tokenTypes.parenR);
        return this.finishNode(node, "TSParenthesizedType");
    }

    protected tsParseTypeReference() {
        const node = this.startNode<TsTypeReference>();
        node.typeName = this.tsParseEntityName();
        if (!this.hasPrecedingLineBreak() && this.match(tokenTypes.lt))
            node.typeParameters = this.tsParseTypeArguments();
        return this.finishNode(node, "TSTypeReference");
    }

    protected tsParseEntityName(allowReservedWords: boolean = true) {
        let entity: TsEntityName = this.parseIdentifier(allowReservedWords);
        while (this.eat(tokenTypes.dot)) {
            const node: ITsQualifiedName = this.startNodeAtNode<ITsQualifiedName>(entity);
            node.left = entity;
            node.right = this.parseIdentifier(allowReservedWords);
            entity = this.finishNode(node, "TSQualifiedName");
        }
        return entity;
    }

    protected tsParseTypeArguments() {
        const node = this.startNode<TsTypeParameterInstantiation>();
        node.params = this.tsInType(() => // Temporarily remove a JSX parsing context, which makes us scan different tokens.
            this.tsInNoContext(() => {
                this.expect(tokenTypes.lt);
                return this.tsParseDelimitedList("TypeParametersOrArguments", this.tsParseType.bind(this));
            }),
        );
        if (!node.params?.length) {
            this.raise(Errors.EmptyTypeArguments, { at: node });
        } else if (!this.state.inType && this.currentContext() === tokenContextTypes.brace) {
            // rescan `>` when we are no longer in type context and JSX parsing context
            // since it was tokenized when `inType` is `true`.
            this.reScan_lt_gt();
        }
        this.expect(tokenTypes.gt);
        return this.finishNode(node, "TSTypeParameterInstantiation");
    }

    protected tsParseDelimitedList<T extends ExpressionNode>(
        kind: ParsingContext, parseElement: () => T, refTrailingCommaPos?: { value: number; }): T[] {
        return this.nonNull(this.tsParseDelimitedListWorker(kind, parseElement,/* expectSuccess */ true, refTrailingCommaPos));
    }

    protected tsParseDelimitedListWorker<T extends ExpressionNode>(
        kind: ParsingContext, parseElement: () => T | undefined, expectSuccess: boolean,
        refTrailingCommaPos?: { value: number; }): T[] | undefined {
        const result: T[] = [];
        let trailingCommaPos = -1;

        for (; ;) {
            if (this.tsIsListTerminator(kind))
                break;
            trailingCommaPos = -1;
            const element = parseElement();
            if (element == null)
                return undefined;
            result.push(element);

            if (this.eat(tokenTypes.comma)) {
                trailingCommaPos = this.state.lastTokenStart;
                continue;
            }

            if (this.tsIsListTerminator(kind))
                break;

            if (expectSuccess) // This will fail with an error about a missing comma
                this.expect(tokenTypes.comma);
            return undefined;
        }

        if (refTrailingCommaPos)
            refTrailingCommaPos.value = trailingCommaPos;
        return result;
    }

    protected tsParseInferType() {
        const node = this.startNode<TsInferType>();
        this.expectContextual(tokenTypes._infer);
        const typeParameter = this.startNode<TsTypeParameter>();
        typeParameter.name = this.tsParseTypeParameterName();
        typeParameter.constraint = this.tsTryParse(() => this.tsParseConstraintForInferType());
        node.typeParameter = this.finishNode(typeParameter, "TSTypeParameter");
        return this.finishNode(node, "TSInferType");
    }

    protected tsParseConstraintForInferType() {
        if (this.eat(tokenTypes._extends)) {
            const constraint = this.tsInDisallowConditionalTypesContext(() => this.tsParseType());
            if (this.state.inDisallowConditionalTypesContext || !this.match(tokenTypes.question))
                return constraint;
        }
        return undefined;
    }


    protected tsParseTypeParameterName(): Identifier {
        return this.parseIdentifier();
    }

    protected tsParseTypeOperator() {
        const node = this.startNode<TsTypeOperator>();
        const operator = this.state.value as TsOperator;
        this.next(); // eat operator
        node.operator = operator;
        node.typeAnnotation = this.tsParseTypeOperatorOrHigher();

        if (operator === "readonly")
            this.tsCheckTypeAnnotationForReadOnly(node);

        return this.finishNode(node, "TSTypeOperator");
    }

    protected tsParseThisTypeNode() {
        const node = this.startNode<TsThisType>();
        this.next();
        return this.finishNode(node, "TSThisType");
    }

    protected tsInType<T>(cb: () => T): T {
        const oldInType = this.state.inType;
        this.state.inType = true;
        try {
            return cb();
        } finally {
            this.state.inType = oldInType;
        }
    }

    protected tsInAmbientContext<T>(cb: () => T): T {
        const oldIsAmbientContext = this.state.isAmbientContext;
        this.state.isAmbientContext = true;
        try {
            return cb();
        } finally {
            this.state.isAmbientContext = oldIsAmbientContext;
        }
    }

    protected tsTryParseAndCatch<T extends ExpressionNode | undefined>(f: () => T): T | undefined {
        const result = this.tryParse(abort => f() || abort());

        if (result.aborted || !result.node)
            return;
        if (result.error)
            this.state = result.failState;
        return result.node as T | undefined;
    }

    protected tsFillSignature(returnToken: number, signature: TsSignatureDeclaration): void {
        // Arrow fns *must* have return token (`=>`). Normal functions can omit it.
        const returnTokenRequired = returnToken === tokenTypes.arrow;
        signature.typeParameters = this.tsTryParseTypeParameters(this.tsParseConstModifier);
        this.expect(tokenTypes.parenL);
        signature.params = this.tsParseBindingListForSignature();
        if (returnTokenRequired || this.match(returnToken))
            signature.returnType = this.tsParseTypeOrTypePredicateAnnotation(returnToken);
    }

    protected tsParseConstModifier<N extends ModifierBase>(modified: N) {
        this.tsParseModifiers({
            allowedModifiers: ["const"],
            // for better error recovery
            disallowedModifiers: ["in", "out"],
            errorTemplate: Errors.InvalidModifierOnTypeParameterPositions,
        }, modified);
    }

    protected tsParseInOutModifiers<N extends ModifierBase>(modified: N) {
        this.tsParseModifiers.bind(this, {
            allowedModifiers: ["in", "out"],
            disallowedModifiers: ["const", "public", "private", "protected", "readonly", "declare", "abstract", "override"],
            errorTemplate: Errors.InvalidModifierOnTypeParameter,
        }, modified);
    }

    protected tsTryParseTypeParameters(parseModifiers: (node: TsTypeParameter) => void) {
        if (this.match(tokenTypes.lt))
            return this.tsParseTypeParameters(parseModifiers);
        return undefined;
    }

    protected tsParseTypeParameters(parseModifiers: (node: TsTypeParameter) => void) {
        const node = this.startNode<TsTypeParameterDeclaration>();

        if (this.match(tokenTypes.lt) || this.match(tokenTypes.jsxTagStart))
            this.next();
        else
            this.unexpected();

        const refTrailingCommaPos = { value: -1 };

        node.params = this.tsParseBracketedList("TypeParametersOrArguments",
            this.tsParseTypeParameter.bind(this, parseModifiers), false, true, refTrailingCommaPos);
        if (node.params?.length === 0)
            this.raise(Errors.EmptyTypeParameters, { at: node });

        if (refTrailingCommaPos.value !== -1)
            (node as IHasTrailingComma).trailingComma = refTrailingCommaPos.value;

        return this.finishNode(node, "TSTypeParameterDeclaration");
    }

    protected tsParseTypeParameter(parseModifiers: (node: TsTypeParameter) => void) {
        const node = this.startNode<TsTypeParameter>();
        parseModifiers.bind(this)(node);
        node.name = this.tsParseTypeParameterName();
        node.constraint = this.tsEatThenParseType(tokenTypes._extends);
        node.default = this.tsEatThenParseType(tokenTypes.eq);
        return this.finishNode(node, "TSTypeParameter");
    }

    protected tsParseBracketedList<T extends ExpressionNode>(
        kind: ParsingContext, parseElement: () => T,
        bracket: boolean, skipFirstToken: boolean,
        refTrailingCommaPos?: { value: number; }): T[] {
        if (!skipFirstToken) {
            if (bracket)
                this.expect(tokenTypes.bracketL);
            else
                this.expect(tokenTypes.lt);
        }

        const result = this.tsParseDelimitedList(kind, parseElement, refTrailingCommaPos);

        if (bracket)
            this.expect(tokenTypes.bracketR);
        else
            this.expect(tokenTypes.gt);

        return result;
    }

    protected tsParseBindingListForSignature() {
        const list = super.parseBindingList(tokenTypes.parenR, CharCodes.rightParenthesis, ParseBindingListFlags.IS_FUNCTION_PARAMS);
        for (const pattern of list) {
            if (pattern == undefined)
                continue;
            const { type } = pattern;
            if (type === "AssignmentPattern" || type === "TSParameterProperty")
                this.raise(Errors.UnsupportedSignatureParameterKind, { at: pattern, type });
        }
        return list;
    }

    protected tsParseTypeMemberSemicolon(): void {
        if (!this.eat(tokenTypes.comma) && !this.isLineTerminator())
            this.expect(tokenTypes.semi);
    }

    protected tsIsStartOfMappedType(): boolean {
        this.next();
        if (this.eat(tokenTypes.plusMin))
            return this.isContextual(tokenTypes._readonly);
        if (this.isContextual(tokenTypes._readonly))
            this.next();
        if (!this.match(tokenTypes.bracketL))
            return false;
        this.next();
        if (!this.tsIsIdentifier())
            return false;
        this.next();
        return this.match(tokenTypes._in);
    }

    protected tsIsListTerminator(kind: ParsingContext): boolean {
        switch (kind) {
            case "EnumMembers":
            case "TypeMembers":
                return this.match(tokenTypes.braceR);
            case "HeritageClauseElement":
                return this.match(tokenTypes.braceL);
            case "TupleElementTypes":
                return this.match(tokenTypes.bracketR);
            case "TypeParametersOrArguments":
                return this.match(tokenTypes.gt);
        }
    }

    protected tsIsStartOfFunctionType() {
        if (this.match(tokenTypes.lt))
            return true;
        return (this.match(tokenTypes.parenL) && this.tsLookAhead(() => this.tsIsUnambiguouslyStartOfFunctionType()));
    }

    protected tsIsUnambiguouslyIndexSignature() {
        this.next(); // Skip '{'
        if (Tokens.isIdentifier(this.state.type)) {
            this.next();
            return this.match(tokenTypes.colon);
        }
        return false;
    }

    protected tsIsUnambiguouslyStartOfFunctionType(): boolean {
        this.next();
        if (this.matchOne(tokenTypes.parenR, tokenTypes.ellipsis)) // ( )  ( ...
            return true;
        if (this.tsSkipParameterStart()) { // ( xxx : ( xxx , ( xxx ?  ( xxx =
            if (this.matchOne(tokenTypes.colon, tokenTypes.comma, tokenTypes.question, tokenTypes.eq))
                return true;
            if (this.match(tokenTypes.parenR)) {
                this.next();
                if (this.match(tokenTypes.arrow))  // ( xxx ) =>
                    return true;
            }
        }
        return false;
    }

    protected tsEatThenParseType(token: number) {
        if (this.match(token))
            return this.tsNextThenParseType();
        return undefined;
    }

    protected tsNextThenParseType() {
        return this.tsInType(() => {
            this.next();
            return this.tsParseType();
        });
    }

    protected tsSkipParameterStart(): boolean {
        if (Tokens.isIdentifier(this.state.type) || this.match(tokenTypes._this)) {
            this.next();
            return true;
        }

        if (this.match(tokenTypes.braceL)) {
            // Return true if we can parse an object pattern without errors
            const { errors } = this.state;
            const previousErrorCount = errors.length;
            try {
                this.parseObjectLike(tokenTypes.braceR, true);
                return errors.length === previousErrorCount;
            } catch {
                return false;
            }
        }

        if (this.match(tokenTypes.bracketL)) {
            this.next();
            // Return true if we can parse an array pattern without errors
            const { errors } = this.state;
            const previousErrorCount = errors.length;
            try {
                super.parseBindingList(tokenTypes.bracketR, CharCodes.rightSquareBracket, ParseBindingListFlags.ALLOW_EMPTY);
                return errors.length === previousErrorCount;
            } catch {
                return false;
            }
        }
        return false;
    }

    protected tsLookAhead<T>(f: () => T): T {
        const state = this.state.clone();
        const res = f();
        this.state = state;
        return res;
    }

    protected tsCheckTypeAnnotationForReadOnly(node: TsTypeOperator) {
        switch (node.typeAnnotation?.type) {
            case "TSTupleType":
            case "TSArrayType":
                return;
            default:
                this.raise(Errors.UnexpectedReadonly, { at: node });
        }
    }

    protected tsInNoContext<T>(cb: () => T): T {
        const oldContext = this.state.context;
        this.state.context = [oldContext[0]];
        try {
            return cb();
        } finally {
            this.state.context = oldContext;
        }
    }

    protected tsIsIdentifier(): boolean {
        return Tokens.isIdentifier(this.state.type);
    }

    protected tsInDisallowConditionalTypesContext<T>(cb: () => T): T {
        const oldInDisallowConditionalTypesContext = this.state.inDisallowConditionalTypesContext;
        this.state.inDisallowConditionalTypesContext = true;
        try {
            return cb();
        } finally {
            this.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
        }
    }

    protected tsInAllowConditionalTypesContext<T>(cb: () => T): T {
        const oldInDisallowConditionalTypesContext = this.state.inDisallowConditionalTypesContext;
        this.state.inDisallowConditionalTypesContext = false;
        try {
            return cb();
        } finally {
            this.state.inDisallowConditionalTypesContext = oldInDisallowConditionalTypesContext;
        }
    }

    protected tsDisallowOptionalPattern(node: AnyTsFunction) {
        for (const param of node.params) {
            if (param?.type !== "Identifier" && (param as any).optional && !this.state.isAmbientContext)
                this.raise(Errors.PatternIsOptional, { at: param });
        }
    }

    protected tsIsDeclarationStart(): boolean {
        return Tokens.isTSDeclarationStart(this.state.type);
    }

    protected tsParseModifiers<N extends ModifierBase>(
        {
            allowedModifiers,
            disallowedModifiers,
            stopOnStartOfClassStaticBlock,
            errorTemplate = Errors.InvalidModifierOnTypeMember
        }: {
            allowedModifiers: readonly TsModifier[];
            disallowedModifiers?: TsModifier[];
            stopOnStartOfClassStaticBlock?: boolean;
            errorTemplate?: typeof Errors.InvalidModifierOnTypeMember;
        },
        modified: N,
    ): void {
        const enforceOrder = (loc: IPosition, modifier: TsModifier, before: TsModifier, after: TsModifier) => {
            if (modifier === before && modified[after])
                this.raise(Errors.InvalidModifiersOrder, { at: loc, orderedModifiers: [before, after] });
        };
        const incompatible = (loc: IPosition, modifier: TsModifier, mod1: TsModifier, mod2: TsModifier) => {
            if ((modified[mod1] && modifier === mod2) || (modified[mod2] && modifier === mod1))
                this.raise(Errors.IncompatibleModifiers, { at: loc, modifiers: [mod1, mod2] });
        };

        for (; ;) {
            const { startLocation } = this.state;
            const modifier = this.tsParseModifier(allowedModifiers.concat(disallowedModifiers ?? []), stopOnStartOfClassStaticBlock);
            if (!modifier)
                break;

            if (this.tsIsAccessModifier(modifier)) {
                if (modified.accessibility) {
                    this.raise(Errors.DuplicateAccessibilityModifier, { at: startLocation, modifier });
                } else {
                    enforceOrder(startLocation, modifier, modifier, "override");
                    enforceOrder(startLocation, modifier, modifier, "static");
                    enforceOrder(startLocation, modifier, modifier, "readonly");

                    modified.accessibility = modifier;
                }
            } else if (this.tsIsVarianceAnnotations(modifier)) {
                if (modified[modifier])
                    this.raise(Errors.DuplicateModifier, { at: startLocation, modifier });
                modified[modifier] = true;

                enforceOrder(startLocation, modifier, "in", "out");
            } else {
                if (Object.hasOwnProperty.call(modified, modifier)) {
                    this.raise(Errors.DuplicateModifier, { at: startLocation, modifier });
                } else {
                    enforceOrder(startLocation, modifier, "static", "readonly");
                    enforceOrder(startLocation, modifier, "static", "override");
                    enforceOrder(startLocation, modifier, "override", "readonly");
                    enforceOrder(startLocation, modifier, "abstract", "override");

                    incompatible(startLocation, modifier, "declare", "override");
                    incompatible(startLocation, modifier, "static", "abstract");
                }
                modified[modifier] = true;
            }

            if (disallowedModifiers?.includes(modifier))
                this.raise(errorTemplate, { at: startLocation, modifier });
        }
    }

    protected tsParseModifier<T extends TsModifier>(allowedModifiers: T[], stopOnStartOfClassStaticBlock?: boolean): T | undefined {
        if (!this.tsIsIdentifier() && this.state.type !== tokenTypes._in && this.state.type !== tokenTypes._const)
            return undefined;

        const modifier = this.state.value as T;
        if (allowedModifiers.indexOf(modifier) !== -1) {
            if (stopOnStartOfClassStaticBlock && this.tsIsStartOfStaticBlocks())
                return undefined;
            if (this.tsTryParse(() => this.tsNextTokenCanFollowModifier()))
                return modifier;
        }
        return undefined;
    }

    protected tsTryParse<T>(f: () => T | undefined | false): T | undefined {
        const state = this.state.clone();
        const result = f();
        if (result !== undefined && result !== false)
            return result;
        this.state = state;
        return undefined;
    }

    protected isAbstractConstructorSignature(): boolean {
        return (this.isContextual(tokenTypes._abstract) && this.lookahead().type === tokenTypes._new);
    }

    protected tsIsStartOfStaticBlocks() {
        return (
            this.isContextual(tokenTypes._static) &&
            this.lookaheadCharCode() === CharCodes.leftCurlyBrace
        );
    }

    protected tsIsAccessModifier(modifier: string): modifier is TsAccessibility {
        return (modifier === "private" || modifier === "public" || modifier === "protected");
    }

    protected tsIsVarianceAnnotations(modifier: string,): modifier is VarianceAnnotations {
        return modifier === "in" || modifier === "out";
    }

    protected reScan_lt_gt() {
        const { type } = this.state;
        if (type === tokenTypes.lt) {
            this.state.position -= 1;
            this.readToken_lt();
        } else if (type === tokenTypes.gt) {
            this.state.position -= 1;
            this.readToken_gt();
        }
    }

    protected reScan_lt() {
        const { type } = this.state;
        if (type === tokenTypes.bitShiftL) {
            this.state.position -= 2;
            this.finishOp(tokenTypes.lt, 1);
            return tokenTypes.lt;
        }
        return type;
    }

    protected tsCheckLineTerminator(next: boolean) {
        if (next) {
            if (this.hasFollowingLineBreak())
                return false;
            this.next();
            return true;
        }
        return !this.isLineTerminator();
    }

    protected tsCheckForInvalidTypeCasts(items?: ReadonlyArray<Nullable<ExpressionNode>>) {
        items?.forEach(node => {
            if (node?.type === "TSTypeCastExpression")
                this.raise(Errors.UnexpectedTypeAnnotation, { at: node.typeAnnotation });
        });
    }

    protected tsIsExternalModuleReference(): boolean {
        return (this.isContextual(tokenTypes._require) && this.lookaheadCharCode() === CharCodes.leftParenthesis);
    }

    protected isAbstractClass(): boolean {
        return (this.isContextual(tokenTypes._abstract) && this.lookahead().type === tokenTypes._class);
    }

    private keywordTypeFromName(value: string): TsKeywordTypeType | undefined {
        switch (value) {
            case "any":
                return "TSAnyKeyword";
            case "boolean":
                return "TSBooleanKeyword";
            case "bigint":
                return "TSBigIntKeyword";
            case "never":
                return "TSNeverKeyword";
            case "number":
                return "TSNumberKeyword";
            case "object":
                return "TSObjectKeyword";
            case "string":
                return "TSStringKeyword";
            case "symbol":
                return "TSSymbolKeyword";
            case "undefined":
                return "TSUndefinedKeyword";
            case "unknown":
                return "TSUnknownKeyword";
            default:
                return undefined;
        }
    }

    private assert(x: boolean): void {
        if (!x)
            throw new Error("Assert fail");
    }

    private nonNull<T>(x?: T | null): T {
        if (x == null)
            throw new Error(`Unexpected ${x} value.`);
        return x;
    }
}