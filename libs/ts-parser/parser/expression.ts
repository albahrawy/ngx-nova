/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Errors, ExpressionErrors } from "../errors/errors";
import { Position } from "../helper/position";
import { ParserUtil } from "../helper/util";
import { ExpressionScopeHandler } from "../scopes/handler-expresson-scope";
import { PARAM, PARAM_AWAIT, PARAM_IN, PARAM_RETURN, functionFlags } from "../scopes/handler-production-parameter";
import { Scope, ScopeHandlerBase, ScopeType } from "../scopes/handler-scope";
import {
    BIND_CATCH_PARAM,
    BIND_CLASS, BIND_FUNCTION, BIND_LEXICAL, BIND_NONE, BIND_OUTSIDE, BIND_VAR, BindingTypes, CLASS_ELEMENT_INSTANCE_GETTER,
    CLASS_ELEMENT_INSTANCE_SETTER, CLASS_ELEMENT_OTHER, CLASS_ELEMENT_STATIC_GETTER, CLASS_ELEMENT_STATIC_SETTER, SCOPE_ARROW, SCOPE_CLASS,
    SCOPE_DIRECT_SUPER, SCOPE_FUNCTION, SCOPE_OTHER, SCOPE_SIMPLE_CATCH, SCOPE_STATIC_BLOCK, SCOPE_SUPER
} from "../scopes/scopeflags";
import { CharCodes } from "../tokens/charcodes";
import { Tokens, tokenTypes } from "../tokens/tokens";
import { AllowedLValTypes, CallBackVoid, IPosition, LValAncestor, ProgramSourceType } from "../types/basic";
import { ParseBindingListFlags, ParseFunctionFlag, ParseStatementFlag, RegExPattern } from "../types/constants";
import { Nullable } from "../types/internal.types";
import {
    AnyExport,
    AnyFunction,
    AnyImport,
    AnyImportSpecifier, AnyNode,
    AnyTsFunction,
    Declaration,
    ExpressionNode,
    IAnyStatement,
    IArgumentPlaceholder,
    IArrayLikeExpression,
    IArrayPattern,
    IArrowFunctionExpression,
    IAssignmentExpression,
    IAssignmentPattern,
    IAwaitExpression,
    IBinaryExpression,
    IBindExpression,
    IBlockStatement,
    IBlockStatementLike,
    IBodilessFunctionOrMethodBase,
    IBreakStatement,
    ICallOrNewExpression,
    ICatchClause,
    IClass,
    IClassAccessorProperty,
    IClassBody,
    IClassDeclaration,
    IClassExpression,
    IClassMember,
    IClassMethod,
    IClassPrivateMethod,
    IClassPrivateProperty,
    IClassProperty,
    IConditionalExpression,
    IContinueStatement, IDebuggerStatement,
    IDecorator,
    IDoExpression,
    IDoWhileStatement,
    IEmptyStatement,
    IEstreeMethodDefinition,
    IExportAllDeclaration,
    IExportDefaultDeclaration,
    IExportDefaultSpecifier,
    IExportNamedDeclaration,
    IExportNamespaceSpecifier,
    IExportSpecifier,
    IExpressionStatement,
    IForInStatement,
    IForLike,
    IForOfStatement,
    IForStatement,
    IFunctionDeclaration,
    IFunctionExpression,
    IHasDecorators,
    IHasTrailingComma,
    IIfStatement,
    IImportDeclaration,
    IImportDefaultSpecifier,
    IImportNamespaceSpecifier,
    IImportSpecifier,
    ILabeledStatement,
    ILogicalExpression,
    IMemberExpression,
    IMetaProperty,
    IModuleExpression,
    IObjectExpression,
    IObjectLikeExpression,
    IObjectMember,
    IObjectMethod,
    IObjectPattern,
    IObjectProperty,
    IParenthesizedExpression,
    IPattern,
    IPrivateName,
    IProgram,
    IRecordExpression,
    IRestElement,
    IReturnStatement,
    ISequenceExpression,
    ISpreadElement,
    IStaticBlock,
    ISuper,
    ISwitchCase,
    ISwitchStatement,
    ITaggedTemplateExpression,
    ITemplateElement,
    ITemplateLiteral,
    IThisExpression,
    IThrowStatement,
    ITryStatement,
    IUnaryExpression,
    IUpdateExpression,
    IVariableDeclaration,
    IVariableDeclarator,
    IWhileStatement, IWithStatement,
    IYieldExpression,
    Identifier,
    Import,
    ImportAttribute,
    InterpreterDirective,
    NormalFunction,
    TSDeclareMethod,
    TSParameterProperty, TsIndexSignature,
    TsNamedTypeElementBase,
    UnType
} from "../types/nodes";
import {
    AssignmentOperator,
    BinaryOperator,
    IBigIntLiteral, IBooleanLiteral, IDecimalLiteral, IDirective, IDirectiveLiteral, IHasKey, IHasKind, ILiteralExpression, INullLiteral,
    INumericLiteral, IParenthesized, IRegExpLiteral, IStringLiteral, LogicalOperator, NodeBase, UnaryOperator, UpdateOperator, VariableKind
} from "../types/nodes.common";
import { IParseClassMemberState, IParseSubscriptState } from "../types/parser.interface";
import { ParserBase } from "./parser.base";

export abstract class ParserExpression<SH extends ScopeHandlerBase<S>, S extends Scope = ScopeType<SH>> extends ParserBase<SH, S> {

    protected override parseProgram(program: IProgram, end?: number, sourceType?: ProgramSourceType): IProgram {
        end ??= tokenTypes.eof;
        program.sourceType = sourceType ?? this.options.sourceType ?? 'module';
        const interpreter = this.parseInterpreterDirective();
        if (interpreter)
            program.interpreter = interpreter;
        this.parseBlockBody(program, true, end, true);
        if (this.inModule && !this.options.allowUndeclaredExports && this.scope.undefinedExports.size > 0)
            for (const [localName, at] of Array.from(this.scope.undefinedExports))
                this.raise(Errors.ModuleExportUndefined, { at, localName });

        if (end === tokenTypes.eof)
            program = this.finishNode(program, "Program");
        else
            program = this.finishNodeAt(program, "Program", Position.fromColumnOffset(this.state.startLocation, -1));

        program.comments = this.state.comments;
        program.errors = this.state.errors;

        return program;
    }

    //#region block body

    protected parseBlockBody(node: IBlockStatementLike, topLevel: boolean, end: number,
        allowDirectives?: boolean, callBack?: CallBackVoid<boolean>): void {
        const directives: Nullable<IDirective[]> = allowDirectives ? (node.directives = []) : undefined;
        this.parseBlockOrModuleBlockBody((node.children = []), topLevel, end, directives, callBack);
    }

    protected parseBlockOrModuleBlockBody(children: Array<Nullable<AnyNode>>, topLevel: boolean, end: number,
        directives?: Array<IDirective>, callBack?: CallBackVoid<boolean>): void {

        const oldStrict = this.state.strict;
        let hasStrictModeDirective = false;
        let parsedNonDirective = false;

        while (!this.match(end)) {
            const stmt = topLevel ? this.parseModuleItem() : this.parseStatementListItem();

            if (directives && !parsedNonDirective) {
                const validDirective = this.isValidDirective(stmt);
                if (validDirective) {
                    const directive = this.starmentToDirective(validDirective);
                    directives.push(directive);

                    if (!hasStrictModeDirective && directive.value.value === "use strict") {
                        hasStrictModeDirective = true;
                        this.setStrict(true);
                    }
                    continue;
                }
                parsedNonDirective = true;
                // clear strict errors since the strict mode will not change within the block
                this.state.strictErrors.clear();
            }
            children.push(stmt);
        }

        callBack?.(hasStrictModeDirective);

        if (!oldStrict)
            this.setStrict(false);

        this.next();
    }

    protected parseModuleItem() {
        return this.parseStatementLike(ParseStatementFlag.AllowAll);
    }

    protected parseBlock(allowDirectives: boolean = false, createNewLexicalScope: boolean = true, callBack?: CallBackVoid<boolean>) {
        const node = this.startNode<IBlockStatement>();
        if (allowDirectives)
            this.state.strictErrors.clear();

        this.expect(tokenTypes.braceL);
        if (createNewLexicalScope)
            this.scope.enter(SCOPE_OTHER);

        this.parseBlockBody(node, false, tokenTypes.braceR, allowDirectives, callBack);
        if (createNewLexicalScope)
            this.scope.exit();

        return this.finishNode(node, "BlockStatement");
    }

    //#endregion

    //#region statement

    protected parseStatementListItem() {
        return this.parseStatementLike(
            ParseStatementFlag.AllowAnyDeclaration |
            (!this.options.annexB || this.state.strict ? 0 : ParseStatementFlag.AllowLabeledFunction)
        );
    }

    protected parseStatementLike(flags: ParseStatementFlag) {
        let decorators: IDecorator[] | undefined = undefined;
        if (this.match(tokenTypes.at))
            decorators = this.parseDecorators(true);
        return this.parseStatementContent(flags, decorators);
    }

    protected parseStatement() {
        return this.parseStatementLike(ParseStatementFlag.StatementOnly);
    }

    //#endregion

    //#region expression

    protected parseExpression(disallowIn?: boolean, refExpressionErrors?: ExpressionErrors) {
        if (disallowIn)
            return this.disallowInAnd(() => this.parseExpressionBase(refExpressionErrors));

        return this.allowInAnd(() => this.parseExpressionBase(refExpressionErrors));
    }

    protected parseExpressionBase(refExpressionErrors?: ExpressionErrors) {
        const startLoc = this.state.startLocation;
        const expr = this.parseMaybeAssign(refExpressionErrors);
        if (this.match(tokenTypes.comma)) {
            const node = this.startNodeAt<ISequenceExpression>(startLoc);
            node.children = [expr];
            while (this.eat(tokenTypes.comma)) {
                node.children.push(this.parseMaybeAssign(refExpressionErrors));
            }
            this.toReferencedList(node.children);
            return this.finishNode(node, "SequenceExpression");
        }
        return expr;
    }

    protected parseAwait(startLoc: IPosition): IAwaitExpression {
        const node = this.startNodeAt<IAwaitExpression>(startLoc);
        this.expressionScope.recordParameterInitializerError(Errors.AwaitExpressionFormalParameter, { at: node });

        if (this.eat(tokenTypes.star))
            this.raise(Errors.ObsoleteAwaitStar, { at: node });

        if (!this.scope.inFunction && !this.options.allowAwaitOutsideFunction) {
            if (this.isAmbiguousAwait())
                this.ambiguousScriptDifferentAst = true;
            else
                this.sawUnambiguousESM = true;
        }

        if (!this.state.soloAwait)
            node.argument = this.parseMaybeUnary(undefined, true);

        return this.finishNode(node, "AwaitExpression");
    }

    protected parseYield(): IYieldExpression {
        const node = this.startNode<IYieldExpression>();
        this.expressionScope.recordParameterInitializerError(Errors.YieldInParameter, { at: node });
        this.next();
        let delegating = false;
        let argument: IYieldExpression["argument"] = undefined;
        if (!this.hasPrecedingLineBreak()) {
            delegating = this.eat(tokenTypes.star);
            switch (this.state.type) {
                case tokenTypes.semi:
                case tokenTypes.eof:
                case tokenTypes.braceR:
                case tokenTypes.parenR:
                case tokenTypes.bracketR:
                case tokenTypes.braceBarR:
                case tokenTypes.colon:
                //@ts-expect-error fall through
                case tokenTypes.comma:
                    // The above is the complete set of tokens that can
                    // follow an AssignmentExpression, and none of them
                    // can start an AssignmentExpression
                    if (!delegating)
                        break;
                /* fallthrough */
                default:
                    argument = this.parseMaybeAssign();
            }
        }
        node.delegate = delegating;
        node.argument = argument;
        return this.finishNode(node, "YieldExpression");
    }

    protected parseMaybeConditional(refExpressionErrors: ExpressionErrors) {
        const startLoc = this.state.startLocation;
        const potentialArrowAt = this.state.potentialArrowAt;
        const expr = this.parseExprOps(refExpressionErrors);
        if (this.shouldExitDescending(expr, potentialArrowAt))
            return expr;

        return this.parseConditional(expr, startLoc, refExpressionErrors);
    }

    protected parseExprOps(refExpressionErrors: ExpressionErrors) {
        const startLoc = this.state.startLocation;
        const potentialArrowAt = this.state.potentialArrowAt;
        const expr = this.parseMaybeUnaryOrPrivate(refExpressionErrors);

        if (this.shouldExitDescending(expr, potentialArrowAt))
            return expr;

        return this.parseExprOp(expr, startLoc, -1);
    }

    protected parseExprOp(left: ExpressionNode | IPrivateName, leftStartLoc: IPosition, minPrec: number): ExpressionNode | IPrivateName {
        if (this.isPrivateName(left)) {
            // https://tc39.es/ecma262/#prod-RelationalExpression
            // RelationalExpression [In, Yield, Await]
            //   [+In] PrivateIdentifier in ShiftExpression[?Yield, ?Await]
            const value = this.getPrivateNameSV(left);
            if (minPrec >= Tokens.operatorPrecedence(tokenTypes._in) || !this.prodParam.hasIn || !this.match(tokenTypes._in))
                this.raise(Errors.PrivateInExpectedIn, { at: left, identifierName: value });

            this.classScope.usePrivateName(value, left.location.start);
        }

        const op = this.state.type;
        if (Tokens.isOperator(op) && (this.prodParam.hasIn || !this.match(tokenTypes._in))) {
            let prec = Tokens.operatorPrecedence(op);
            if (prec > minPrec) {
                if (op === tokenTypes.pipeline)
                    this.unexpected();
                let node = this.startNodeAt<ILogicalExpression | IBinaryExpression>(leftStartLoc);
                node.left = left;
                node.operator = (this.state.value as BinaryOperator | LogicalOperator);

                const logical = op === tokenTypes.logicalOR || op === tokenTypes.logicalAND;
                const coalesce = op === tokenTypes.nullishCoalescing;

                if (coalesce)
                    // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
                    // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
                    prec = Tokens.operatorPrecedence(tokenTypes.logicalAND);

                this.next();
                node.right = this.parseExprOpBaseRightExpr(op, prec);
                node = this.finishNode(node, logical || coalesce ? "LogicalExpression" : "BinaryExpression");
                /* this check is for all ?? operators
                 * a ?? b && c for this example
                 * when op is coalesce and nextOp is logical (&&), throw at the pos of nextOp that it can not be mixed.
                 * Symmetrically it also throws when op is logical and nextOp is coalesce
                 */
                const nextOp = this.state.type;
                if ((coalesce && (nextOp === tokenTypes.logicalOR || nextOp === tokenTypes.logicalAND)) ||
                    (logical && nextOp === tokenTypes.nullishCoalescing))
                    throw this.raise(Errors.MixingCoalesceWithLogical, { at: this.state.startLocation });

                return this.parseExprOp(node, leftStartLoc, minPrec);
            }
        }
        return left;
    }

    protected parseExprOpBaseRightExpr(op: number, prec: number) {
        const startLoc = this.state.startLocation;
        return this.parseExprOp(this.parseMaybeUnaryOrPrivate(), startLoc, op == tokenTypes.exponent ? prec - 1 : prec);
    }

    protected parseConditional(expr: ExpressionNode, startLoc: IPosition, refExpressionErrors?: Nullable<ExpressionErrors>) {
        if (this.eat(tokenTypes.question)) {
            const node = this.startNodeAt<IConditionalExpression>(startLoc);
            node.test = expr;
            node.consequent = this.parseMaybeAssignAllowIn();
            this.expect(tokenTypes.colon);
            node.alternate = this.parseMaybeAssign();
            return this.finishNode(node, "ConditionalExpression");
        }
        return expr;
    }

    protected parseMaybeUnaryOrPrivate(refExpressionErrors?: ExpressionErrors) {
        return this.match(tokenTypes.privateName)
            ? this.parsePrivateName()
            : this.parseMaybeUnary(refExpressionErrors);
    }

    protected parsePrivateName(): IPrivateName {
        const node = this.startNode<IPrivateName>();
        const id = this.startNodeAt<Identifier>(Position.fromColumnOffset(this.state.startLocation, 1));
        const name = this.state.value as string;
        this.next(); // eat #name;
        node.id = this.createIdentifier(id, name);
        return this.finishNode(node, "PrivateName");
    }

    protected parseMaybeUnary(refExpressionErrors?: ExpressionErrors, sawUnary?: boolean) {
        const startLoc = this.state.startLocation;
        const isAwait = this.isContextual(tokenTypes._await);
        if (isAwait && this.isAwaitAllowed()) {
            this.next();
            const expr = this.parseAwait(startLoc);
            if (!sawUnary)
                this.checkExponentialAfterUnary(expr);
            return expr;
        }
        const update = this.match(tokenTypes.incDec);
        const node = this.startNode<IUnaryExpression | IUpdateExpression>();
        if (Tokens.isPrefix(this.state.type)) {
            node.operator = this.state.value as UnaryOperator | UpdateOperator;
            node.prefix = true;

            if (this.match(tokenTypes._throw))
                this.expectFeature("throwExpressions");

            const isDelete = this.match(tokenTypes._delete);
            this.next();

            node.argument = this.parseMaybeUnary(undefined, true);
            this.checkExpressionErrors(refExpressionErrors, true);

            if (this.state.strict && isDelete) {
                const arg = node.argument;

                if (arg?.type === "Identifier")
                    this.raise(Errors.StrictDelete, { at: node });
                else if (this.hasPropertyAsPrivateName(arg))
                    this.raise(Errors.DeletePrivateField, { at: node });
            }

            if (!update) {
                if (!sawUnary)
                    this.checkExponentialAfterUnary(node as UnType<IUnaryExpression>);
                return this.finishNode(node, "UnaryExpression");
            }
        }

        const expr = this.parseUpdate(node, update, refExpressionErrors);

        if (isAwait) {
            const { type } = this.state;
            const startsExpr = this.hasFeature("v8intrinsic")
                ? Tokens.canStartExpression(type)
                : Tokens.canStartExpression(type) && !this.match(tokenTypes.modulo);
            if (startsExpr && !this.isAmbiguousAwait()) {
                this.raiseOverwrite(Errors.AwaitNotInAsyncContext, { at: startLoc });
                return this.parseAwait(startLoc);
            }
        }
        return expr;
    }

    protected parseAsyncArrowFromCallExpression(node: IArrowFunctionExpression, call: ICallOrNewExpression) {
        this.resetPreviousNodeTrailingComments(call);
        this.expect(tokenTypes.arrow);
        this.parseArrowExpression(node, call.arguments, true, (call as IHasTrailingComma).trailingCommaLocation);
        // mark inner comments of `async()` as inner comments of `async () =>`
        if (call.innerComments)
            this.setNodeComments(node, call.innerComments, 'inner');
        // mark trailing comments of `async` to be inner comments
        if (call.callee.trailingComments)
            this.setNodeComments(node, call.callee.trailingComments, 'inner');
        return node;
    }

    protected parseArrowExpression(node: IArrowFunctionExpression, params: Nullable<ExpressionNode>[] | null, isAsync: boolean, trailingCommaLoc?: IPosition) {

        this.scope.enter(SCOPE_FUNCTION | SCOPE_ARROW);
        let flags = functionFlags(isAsync, false);
        // ConciseBody[In] :
        //   [lookahead ≠ {] ExpressionBody[?In, ~Await]
        //   { FunctionBody[~Yield, ~Await] }
        if (!this.match(tokenTypes.braceL) && this.prodParam.hasIn)
            flags |= PARAM_IN;

        this.prodParam.enter(flags);
        this.initFunction(node, isAsync);
        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;

        if (params) {
            this.state.maybeInArrowParameters = true;
            this.setArrowFunctionParameters(node, params, trailingCommaLoc);
        }
        this.state.maybeInArrowParameters = false;
        this.parseFunctionBody(node, true);

        this.prodParam.exit();
        this.scope.exit();
        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;

        return this.finishNode(node, "ArrowFunctionExpression");
    }

    protected setArrowFunctionParameters(node: IArrowFunctionExpression, params: Nullable<ExpressionNode>[], trailingCommaLoc?: IPosition): void {
        this.toAssignableList(params, trailingCommaLoc, false);
        node.params = params as Array<IPattern | TSParameterProperty>;
    }

    protected parseUpdate(node: IUnaryExpression | IUpdateExpression, update: boolean, refExpressionErrors?: ExpressionErrors) {
        if (update) {
            const updateExpressionNode = node as IUpdateExpression;
            this.checkLVal(updateExpressionNode.argument, { in: this.finishNode(updateExpressionNode, "UpdateExpression") });
            return node;
        }

        const startLoc = this.state.startLocation;
        let expr = this.parseExprSubscripts(refExpressionErrors);
        if (this.checkExpressionErrors(refExpressionErrors, false))
            return expr;
        while (Tokens.isPostfix(this.state.type) && !this.canInsertSemicolon()) {
            const node = this.startNodeAt<IUpdateExpression>(startLoc);
            node.operator = this.state.value as UpdateOperator;
            node.prefix = false;
            node.argument = expr;
            this.next();
            this.checkLVal(expr, { in: (expr = this.finishNode(node, "UpdateExpression")) });
        }
        return expr;
    }


    //#endregion

    //#region methods & functions

    protected pushClassMethod(
        classBody: IClassBody, method: IClassMethod, isGenerator: boolean,
        isAsync: boolean, isConstructor: boolean, allowsDirectSuper: boolean
    ): void {
        classBody.children.push(this.parseMethod(method, isGenerator, isAsync, isConstructor, allowsDirectSuper, "ClassMethod", true));
    }

    protected pushClassPrivateMethod(classBody: IClassBody, method: IClassPrivateMethod, isGenerator: boolean, isAsync: boolean): void {
        const node = this.parseMethod(method, isGenerator, isAsync, false, false, "ClassPrivateMethod", true);
        classBody.children.push(node);

        const kind = node.kind === "get"
            ? node.static
                ? CLASS_ELEMENT_STATIC_GETTER
                : CLASS_ELEMENT_INSTANCE_GETTER
            : node.kind === "set"
                ? node.static
                    ? CLASS_ELEMENT_STATIC_SETTER
                    : CLASS_ELEMENT_INSTANCE_SETTER
                : CLASS_ELEMENT_OTHER;
        this.declareClassPrivateMethodInScope(node, kind);
    }

    protected declareClassPrivateMethodInScope(node: IClassPrivateMethod | IEstreeMethodDefinition | TSDeclareMethod, kind: number) {
        this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), kind, node.key.location.start);
    }

    protected parseMethod<T extends IObjectMethod | IClassMethod | IClassPrivateMethod>(node: T, isGenerator: boolean, isAsync: boolean,
        isConstructor: boolean, allowDirectSuper: boolean, type: T["type"], inClassScope: boolean = false): T {

        this.initFunction(node, isAsync);
        node.generator = isGenerator;
        this.scope.enter(SCOPE_FUNCTION | SCOPE_SUPER | (inClassScope ? SCOPE_CLASS : 0) | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));
        this.prodParam.enter(functionFlags(isAsync, node.generator));
        this.parseFunctionParams(node, isConstructor);
        const finishedNode = this.parseFunctionBodyAndFinish(node, type, true);
        this.prodParam.exit();
        this.scope.exit();

        return finishedNode;
    }

    protected parseFunctionOrFunctionSent() {
        const node = this.startNode<IFunctionExpression | IMetaProperty>();

        // We do not do parseIdentifier here because when parseFunctionOrFunctionSent
        // is called we already know that the current token is a "name" with the value "function"
        // This will improve perf a tiny little bit as we do not do validation but more importantly
        // here is that parseIdentifier will remove an item from the expression stack
        // if "function" or "class" is parsed as identifier (in objects e.g.), which should not happen here.
        this.next(); // eat `function`

        if (this.prodParam.hasYield && this.match(tokenTypes.dot)) {
            const meta = this.createIdentifier(this.startNodeAtNode<Identifier>(node), "function");
            this.next(); // eat `.`
            // https://github.com/tc39/proposal-function.sent#syntax-1
            if (this.match(tokenTypes._sent)) {
                this.expectFeature("functionSent");
            } else if (!this.hasFeature("functionSent")) {
                // The code wasn't `function.sent` but just `function.`, so a simple error is less confusing.
                this.unexpected();
            }
            return this.parseMetaProperty(node as IMetaProperty, meta, "sent");
        }
        return this.parseFunction(node as IFunctionExpression, ParseFunctionFlag.Expression);
    }

    protected parseFunction<T extends NormalFunction>(node: T, flags: ParseFunctionFlag = ParseFunctionFlag.Expression) {
        const hangingDeclaration = flags & ParseFunctionFlag.HangingDeclaration;
        const isDeclaration = !!(flags & ParseFunctionFlag.Declaration);
        const requireId = isDeclaration && !(flags & ParseFunctionFlag.NullableId);
        const isAsync = !!(flags & ParseFunctionFlag.Async);

        this.initFunction(node, isAsync);

        if (this.match(tokenTypes.star)) {
            if (hangingDeclaration)
                this.raise(Errors.GeneratorInSingleStatementContext, { at: this.state.startLocation });
            this.next(); // eat *
            node.generator = true;
        }

        if (isDeclaration)
            node.id = this.parseFunctionId(requireId);

        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        this.state.maybeInArrowParameters = false;
        this.scope.enter(SCOPE_FUNCTION);
        this.prodParam.enter(functionFlags(isAsync, node.generator));

        if (!isDeclaration)
            node.id = this.parseFunctionId();

        this.parseFunctionParams(node, /* isConstructor */ false);

        // For the smartPipelines plugin: Disable topic references from outer
        // contexts within the function body. They are permitted in function
        // default-parameter expressions, outside of the function body.
        // Parse the function body.
        this.parseFunctionBodyAndFinish(node, isDeclaration ? "FunctionDeclaration" : "FunctionExpression");

        this.prodParam.exit();
        this.scope.exit();

        if (isDeclaration && !hangingDeclaration) {
            // We need to register this _after_ parsing the function body
            // because of TypeScript body-less function declarations,
            // which shouldn't be added to the scope.
            this.registerFunctionStatementId(node);
        }

        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        return node;
    }

    protected initFunction(node: IBodilessFunctionOrMethodBase, isAsync: boolean): void {
        delete node.id;
        node.generator = false;
        node.async = isAsync;
    }

    protected registerFunctionStatementId(node: AnyFunction): void {
        if (!node.id)
            return;

        // If it is a regular function declaration in sloppy mode, then it is
        // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
        // mode depends on properties of the current scope (see
        // treatFunctionsAsVar).
        this.scope.declareName(node.id.name,
            !this.options.annexB || this.state.strict || node.generator || node.async
                ? this.scope.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION,
            node.id.location.start,
        );
    }

    protected parseFunctionBodyAndFinish<T extends AnyTsFunction>(node: T, type: T["type"], isMethod: boolean = false): T {
        this.parseFunctionBody(node, false, isMethod);
        return this.finishNode(node, type);
    }

    protected parseFunctionBody(node: AnyTsFunction, allowExpression?: boolean | null, isMethod: boolean = false): void {
        const isExpression = allowExpression && !this.match(tokenTypes.braceL);
        this.expressionScope.enter(ExpressionScopeHandler.newExpressionScope());

        if (isExpression) {
            node.body = this.parseMaybeAssign();
            this.checkParams(node, false, allowExpression, false);
        } else {
            const oldStrict = this.state.strict;
            // Start a new scope with regard to labels
            // flag (restore them to their old value afterwards).
            const oldLabels = this.state.labels;
            this.state.labels = [];

            // FunctionBody[Yield, Await]:
            //   StatementList[?Yield, ?Await, +Return] opt
            this.prodParam.enter(this.prodParam.currentFlags() | PARAM_RETURN);
            node.body = this.parseBlock(
                true,
                false,
                // Strict mode function checks after we parse the statements in the function body.
                (hasStrictModeDirective: boolean) => {
                    const nonSimple = !this.isSimpleParamList(node.params);

                    if (hasStrictModeDirective && nonSimple) {
                        // This logic is here to align the error location with the ESTree plugin.
                        const kind = (node as IHasKind<string>).kind;
                        const key = (node as IHasKey<Identifier>).key;
                        this.raise(Errors.IllegalLanguageModeDirective, {
                            at: (kind === "method" || kind === "constructor") && !!key ? key.location.end : node
                        });
                    }

                    const strictModeChanged = !oldStrict && this.state.strict;

                    // Add the params to varDeclaredNames to ensure that an error is thrown
                    // if a let/const declaration in the function clashes with one of the params.
                    this.checkParams(node, !this.state.strict && !allowExpression && !isMethod && !nonSimple, allowExpression, strictModeChanged);

                    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
                    if (this.state.strict && node.id)
                        this.checkIdentifier(node.id, BIND_OUTSIDE, strictModeChanged);
                },
            );
            this.prodParam.exit();
            this.state.labels = oldLabels;
        }
        this.expressionScope.exit();
    }

    protected parseFunctionId(requireId?: boolean): Identifier | undefined {
        return requireId || Tokens.isIdentifier(this.state.type) ? this.parseIdentifier() : undefined;
    }

    protected parseFunctionParams(node: AnyFunction, isConstructor?: boolean): void {
        this.expect(tokenTypes.parenL);
        this.expressionScope.enter(ExpressionScopeHandler.newParameterDeclarationScope());
        node.params = this.parseBindingList(
            tokenTypes.parenR,
            CharCodes.rightParenthesis,
            ParseBindingListFlags.IS_FUNCTION_PARAMS | (isConstructor ? ParseBindingListFlags.IS_CONSTRUCTOR_PARAMS : 0));

        this.expressionScope.exit();
    }

    protected parseFunctionStatement(node: IFunctionDeclaration, isAsync: boolean, isHangingDeclaration: boolean) {
        this.next(); // eat 'function'
        return this.parseFunction(
            node,
            ParseFunctionFlag.Declaration |
            (isHangingDeclaration ? ParseFunctionFlag.HangingDeclaration : 0) |
            (isAsync ? ParseFunctionFlag.Async : 0),
        );
    }

    protected parseAsyncFunctionExpression(node: IFunctionExpression) {
        return this.parseFunction(node, ParseFunctionFlag.Async);
    }

    protected parseAsyncArrowUnaryFunction(node: IArrowFunctionExpression) {
        // We don't need to push a new ParameterDeclarationScope here since we are sure
        // 1) it is an async arrow, 2) no biding pattern is allowed in params
        this.prodParam.enter(functionFlags(true, this.prodParam.hasYield));
        const params = [this.parseIdentifier()];
        this.prodParam.exit();
        if (this.hasPrecedingLineBreak())
            this.raise(Errors.LineTerminatorBeforeArrow, { at: this.state.currentPosition() });
        this.expect(tokenTypes.arrow);
        // let foo = async bar => {};
        return this.parseArrowExpression(node, params, true);
    }

    protected parseArrow(node: IArrowFunctionExpression) {
        return this.eat(tokenTypes.arrow) ? node : undefined;
    }

    protected parseObjectMethod(prop: IObjectMethod, isGenerator: boolean, isAsync: boolean, isPattern: boolean, isAccessor: boolean) {
        if (isAccessor) {
            // isAccessor implies isAsync: false, isPattern: false, isGenerator: false
            const finishedProp = this.parseMethod(prop, isGenerator, false, false, false, "ObjectMethod");
            this.checkGetterSetterParams(finishedProp);
            return finishedProp;
        }

        if (isAsync || isGenerator || this.match(tokenTypes.parenL)) {
            if (isPattern)
                this.unexpected();
            prop.kind = "method";
            prop.method = true;
            return this.parseMethod(prop, isGenerator, isAsync, false, false, "ObjectMethod");
        }
        return undefined;
    }

    protected parseStatementOrSloppyAnnexBFunctionDeclaration(allowLabeledFunction: boolean = false) {
        let flags: ParseStatementFlag = ParseStatementFlag.StatementOnly;
        if (this.options.annexB && !this.state.strict) {
            flags |= ParseStatementFlag.AllowFunctionDeclaration;
            if (allowLabeledFunction)
                flags |= ParseStatementFlag.AllowLabeledFunction;
        }
        return this.parseStatementLike(flags);
    }

    protected parseReturnStatement() {
        if (!this.prodParam.hasReturn && !this.options.allowReturnOutsideFunction)
            this.raise(Errors.IllegalReturn, { at: this.state.startLocation });

        const node = this.startNode<IReturnStatement>();
        this.next();

        // In `return` (and `break`/`continue`), the keywords with
        // optional arguments, we eagerly look for a semicolon or the
        // possibility to insert one.

        if (!this.isLineTerminator()) {
            node.argument = this.parseExpression();
            this.semicolon();
        }

        return this.finishNode(node, "ReturnStatement");
    }

    //#endregion

    //#region loop

    protected parseForStatement() {
        const node = this.startNode<IForLike>();
        this.next();
        this.state.labels.push({ kind: "loop" });
        let awaitAt: Nullable<IPosition> = undefined;

        if (this.isAwaitAllowed() && this.eatContextual(tokenTypes._await))
            awaitAt = this.state.lastTokenStartLocation;

        this.scope.enter(SCOPE_OTHER);
        this.expect(tokenTypes.parenL);

        if (this.match(tokenTypes.semi)) {
            if (awaitAt !== undefined)
                this.unexpected(awaitAt);
            return this.parseFor(node as IForStatement, undefined);
        }

        const startsWithLet = this.isContextual(tokenTypes._let);
        {
            const startsWithAwaitUsing = this.isContextual(tokenTypes._await) && this.startsAwaitUsing();
            const starsWithUsingDeclaration = startsWithAwaitUsing || (this.isContextual(tokenTypes._using) && this.startsUsingForOf());
            const isLetOrUsing = (startsWithLet && this.hasFollowingBindingAtom()) || starsWithUsingDeclaration;

            if (this.match(tokenTypes._var) || this.match(tokenTypes._const) || isLetOrUsing) {
                const initNode = this.startNode<IVariableDeclaration>();
                let kind: VariableKind;
                if (startsWithAwaitUsing) {
                    kind = "await using";
                    if (!this.isAwaitAllowed())
                        this.raise(Errors.AwaitUsingNotInAsyncContext, { at: this.state.startLocation });
                    this.next(); // eat 'await'
                } else {
                    kind = this.state.value as VariableKind;
                }
                this.next();
                this.parseVar(initNode, true, kind);
                const init = this.finishNode(initNode, "VariableDeclaration");

                const isForIn = this.match(tokenTypes._in);
                if (isForIn && starsWithUsingDeclaration)
                    this.raise(Errors.ForInUsing, { at: init });
                if ((isForIn || this.isContextual(tokenTypes._of)) && init.declarations.length === 1)
                    return this.parseForIn(node as (IForInStatement | IForOfStatement), init, awaitAt);
                if (awaitAt !== undefined)
                    this.unexpected(awaitAt);
                return this.parseFor(node as IForStatement, init);
            }
        }

        // Check whether the first token is possibly a contextual keyword, so that
        // we can forbid `for (async of` if this turns out to be a for-of loop.
        const startsWithAsync = this.isContextual(tokenTypes._async);

        const refExpressionErrors = new ExpressionErrors();
        const init = this.parseExpression(true, refExpressionErrors);
        const isForOf = this.isContextual(tokenTypes._of);
        if (isForOf) {
            // Check for leading tokens that are forbidden in for-of loops:
            if (startsWithLet)
                this.raise(Errors.ForOfLet, { at: init });
            // `for await (async of []);` is allowed.
            if (awaitAt === null && startsWithAsync && init.type === "Identifier") {
                // This catches the case where the `async` in `for (async of` was
                // parsed as an identifier. If it was parsed as the start of an async
                // arrow function (e.g. `for (async of => {} of []);`), the LVal check
                // further down will raise a more appropriate error.
                this.raise(Errors.ForOfAsync, { at: init });
            }
        }
        if (isForOf || this.match(tokenTypes._in)) {
            this.checkDestructuringPrivate(refExpressionErrors);
            this.toAssignable(init, /* isLHS */ true);
            const type = isForOf ? "ForOfStatement" : "ForInStatement";
            this.checkLVal(init, { in: { type } });
            return this.parseForIn(node as (IForInStatement | IForOfStatement), init as IVariableDeclaration, awaitAt);
        } else {
            this.checkExpressionErrors(refExpressionErrors, true);
        }
        if (awaitAt !== undefined)
            this.unexpected(awaitAt);
        return this.parseFor(node as IForStatement, init);
    }

    protected parseFor(node: IForStatement, init?: IVariableDeclaration | ExpressionNode) {
        node.init = init;
        this.semicolon(/* allowAsi */ false);
        node.test = this.match(tokenTypes.semi) ? undefined : this.parseExpression();
        this.semicolon(/* allowAsi */ false);
        node.update = this.match(tokenTypes.parenR) ? undefined : this.parseExpression();
        this.expect(tokenTypes.parenR);

        node.body = this.parseStatement();
        this.scope.exit();
        this.state.labels.pop();
        return this.finishNode(node, "ForStatement");
    }

    protected parseForIn(node: IForInStatement | IForOfStatement, init: IVariableDeclaration | IAssignmentPattern, awaitAt?: IPosition) {
        const isForIn = this.match(tokenTypes._in);
        this.next();

        if (isForIn)
            if (awaitAt !== undefined)
                this.unexpected(awaitAt);
            else
                node.await = awaitAt !== undefined;
        if (init.type === "VariableDeclaration" && init.declarations[0].init != null &&
            (!isForIn || !this.options.annexB || this.state.strict
                || init.kind !== "var" || init.declarations[0].id.type !== "Identifier")) {
            this.raise(Errors.ForInOfLoopInitializer, { at: init, type: isForIn ? "ForInStatement" : "ForOfStatement" });
        }

        if (init.type === "AssignmentPattern")
            this.raise(Errors.InvalidLhs, { at: init, ancestor: { type: "ForStatement" } });

        node.left = init;
        node.right = isForIn ? this.parseExpression() : this.parseMaybeAssignAllowIn();
        this.expect(tokenTypes.parenR);

        // Parse the loop body.
        node.body = this.parseStatement();
        this.scope.exit();
        this.state.labels.pop();
        return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
    }

    protected parseDoWhileStatement(): IDoWhileStatement {
        const node = this.startNode<IDoWhileStatement>();
        this.next();
        this.state.labels.push({ kind: "loop" });
        node.body = this.parseStatement();
        this.state.labels.pop();

        this.expect(tokenTypes._while);
        node.test = this.parseHeaderExpression();
        this.eat(tokenTypes.semi);
        return this.finishNode(node, "DoWhileStatement");
    }

    //#endregion

    //#region assign

    protected parseMaybeAssign(refExpressionErrors?: ExpressionErrors, afterLeftParse?: Function) {
        const startLoc = this.state.startLocation;
        if (this.isContextual(tokenTypes._yield)) {
            if (this.prodParam.hasYield) {
                let left = this.parseYield();
                if (afterLeftParse)
                    left = afterLeftParse.call(this, left, startLoc);
                return left;
            }
        }

        let ownExpressionErrors;
        if (refExpressionErrors) {
            ownExpressionErrors = false;
        } else {
            refExpressionErrors = new ExpressionErrors();
            ownExpressionErrors = true;
        }
        const { type } = this.state;

        if (type === tokenTypes.parenL || Tokens.isIdentifier(type))
            this.state.potentialArrowAt = this.state.start;

        let left = this.parseMaybeConditional(refExpressionErrors);
        if (afterLeftParse)
            left = afterLeftParse.call(this, left, startLoc);

        if (Tokens.isAssignment(this.state.type)) {
            const node = this.startNodeAt<IAssignmentExpression>(startLoc);
            const operator = this.state.value;
            node.operator = operator as AssignmentOperator;

            if (this.match(tokenTypes.eq)) {
                this.toAssignable(left, /* isLHS */ true);
                node.left = left;

                const startIndex = startLoc.index;
                if (refExpressionErrors.doubleProtoLoc != undefined && refExpressionErrors.doubleProtoLoc.index >= startIndex)
                    refExpressionErrors.doubleProtoLoc = undefined; // reset because double __proto__ is valid in assignment expression

                if (refExpressionErrors.shorthandAssignLoc != undefined && refExpressionErrors.shorthandAssignLoc.index >= startIndex)
                    refExpressionErrors.shorthandAssignLoc = undefined; // reset because shorthand default was used correctly

                if (refExpressionErrors.privateKeyLoc != undefined && refExpressionErrors.privateKeyLoc.index >= startIndex) {
                    this.checkDestructuringPrivate(refExpressionErrors);
                    refExpressionErrors.privateKeyLoc = undefined; // reset because `({ #x: x })` is an assignable pattern
                }
            } else {
                node.left = left;
            }

            this.next();
            node.right = this.parseMaybeAssign();
            this.checkLVal(left, { in: this.finishNode(node, "AssignmentExpression") });
            return node;
        } else if (ownExpressionErrors)
            this.checkExpressionErrors(refExpressionErrors, true);

        return left;
    }

    protected toAssignable(node: Nullable<ExpressionNode>, isLHS: boolean = false): void {
        if (!node)
            return;
        let parenthesized: Nullable<ExpressionNode> = undefined;
        if (node.type === "ParenthesizedExpression" || (node as IParenthesized).parenthesized) {
            parenthesized = this.unwrapParenthesizedExpression(node);
            if (isLHS) {
                // an LHS can be reinterpreted to a binding pattern but not vice versa.
                // therefore a parenthesized identifier is ambiguous until we are sure it is an assignment expression
                // i.e. `([(a) = []] = []) => {}`
                // see also `recordArrowParameterBindingError` signature in packages/babel-parser/src/util/expression-scope.js
                if (parenthesized?.type === "Identifier") {
                    this.expressionScope.recordArrowParameterBindingError(Errors.InvalidParenthesizedAssignment, { at: node });
                } else if (parenthesized?.type !== "MemberExpression") {
                    // A parenthesized member expression can be in LHS but not in pattern.
                    // If the LHS is later interpreted as a pattern, `checkLVal` will throw for member expression binding
                    // i.e. `([(a.b) = []] = []) => {}`
                    this.raise(Errors.InvalidParenthesizedAssignment, { at: node });
                }
            } else {
                this.raise(Errors.InvalidParenthesizedAssignment, { at: node });
            }
        }
        switch (node.type) {
            case "Identifier":
            case "ObjectPattern":
            case "ArrayPattern":
            case "AssignmentPattern":
            case "RestElement":
                break;
            case "ObjectExpression": {
                node = this.replaceType<IObjectPattern>(node, "ObjectPattern");
                const properties = node.properties || [];
                for (let i = 0, length = properties.length, last = length - 1; i < length; i++) {
                    const prop = properties[i];
                    const isLast = i === last;
                    this.toAssignableObjectExpressionProp(prop, isLast, isLHS);
                    if (isLast && prop?.type === "RestElement" && (node as IHasTrailingComma).trailingCommaLocation)
                        this.raise(Errors.RestTrailingComma, { at: (node as IHasTrailingComma).trailingCommaLocation });
                }
                break;
            }
            case "ObjectProperty": {
                const { key, value } = node;
                this.classScope.usePrivateName(this.getPrivateNameSV(key), key.location.start);
                this.toAssignable(value, isLHS);
                break;
            }
            case "SpreadElement": {
                throw new Error(
                    "Internal @babel/parser error (this is a bug, please report it)." +
                    " SpreadElement should be converted by .toAssignable's caller.",
                );
            }
            case "ArrayExpression":
                this.replaceType(node, "ArrayPattern");
                this.toAssignableList(node.elements, (node as IHasTrailingComma).trailingCommaLocation, isLHS);
                break;

            case "AssignmentExpression": {
                const { operator, left } = node as IAssignmentExpression;
                if (operator !== "=")
                    this.raise(Errors.MissingEqInAssignment, { at: left.location.end });

                this.replaceType(node, "AssignmentPattern");
                this.deleteKey(node, 'operator');
                this.toAssignable(left, isLHS);
                break;
            }
            case "ParenthesizedExpression":
                this.toAssignable(parenthesized, isLHS);
                break;

            default:
            // We don't know how to deal with this node. It will
            // be reported by a later call to checkLVal
        }
    }

    protected parseAssignableListItemTypes(param: IPattern, flags: ParseBindingListFlags) {
        return param;
    }

    protected parseAssignableListItem(flags: ParseBindingListFlags, decorators: IDecorator[]): IPattern | TSParameterProperty {
        const left = this.parseMaybeDefault();
        this.parseAssignableListItemTypes(left, flags);
        const elt = this.parseMaybeDefault(left.location.start, left);
        if (decorators.length)
            left.decorators = decorators;
        return elt;
    }

    protected parseMaybeAssignAllowIn(refExpressionErrors?: ExpressionErrors, afterLeftParse?: Function) {
        return this.allowInAnd(() => this.parseMaybeAssign(refExpressionErrors, afterLeftParse));
    }

    protected parseMaybeAssignDisallowIn(refExpressionErrors?: ExpressionErrors, afterLeftParse?: Function) {
        return this.disallowInAnd(() => this.parseMaybeAssign(refExpressionErrors, afterLeftParse));
    }

    protected toAssignableObjectExpressionProp(prop: Nullable<ExpressionNode>, isLast: boolean, isLHS: boolean) {
        if (prop?.type === "ObjectMethod") {
            const { kind, key } = prop;
            this.raise(kind === "get" || kind === "set" ? Errors.PatternHasAccessor : Errors.PatternHasMethod, { at: key });
        } else if (prop?.type === "SpreadElement") {
            prop = this.replaceType<IRestElement>(prop, "RestElement");
            const arg = prop.argument;
            this.checkToRestConversion(arg, /* allowPattern */ false);
            this.toAssignable(arg, isLHS);

            if (!isLast)
                this.raise(Errors.RestTrailingComma, { at: prop });
        } else {
            this.toAssignable(prop, isLHS);
        }
    }

    protected toAssignableList(exprList?: Array<Nullable<ExpressionNode>>, trailingCommaLoc?: IPosition, isLHS: boolean = false): void {
        if (!exprList)
            return;
        const end = exprList.length - 1;
        for (let i = 0; i <= end; i++) {
            const elt = exprList[i];
            if (!elt) continue;

            if (elt.type === "SpreadElement") {
                this.replaceType(elt, "RestElement");
                const arg = elt.argument;
                this.checkToRestConversion(arg, /* allowPattern */ true);
                this.toAssignable(arg, isLHS);
            } else {
                this.toAssignable(elt, isLHS);
            }

            if (elt.type === "RestElement") {
                if (i < end) {
                    this.raise(Errors.RestTrailingComma, { at: elt });
                } else if (trailingCommaLoc) {
                    this.raise(Errors.RestTrailingComma, { at: trailingCommaLoc });
                }
            }
        }
    }

    protected parseMaybeDefault(startLoc?: IPosition, left?: IPattern): IPattern {
        startLoc ??= this.state.startLocation;
        left = left ?? this.parseBindingAtom();
        if (!this.eat(tokenTypes.eq))
            return left;

        const node = this.startNodeAt<IAssignmentPattern>(startLoc);
        node.left = left;
        node.right = this.parseMaybeAssignAllowIn();
        return this.finishNode(node, "AssignmentPattern");
    }

    protected maybeAsyncOrAccessorProp(prop: IObjectProperty): boolean {
        return (!prop.computed && prop.key.type === "Identifier" &&
            (this.isLiteralPropertyName() || this.match(tokenTypes.bracketL) || this.match(tokenTypes.star))
        );
    }

    protected isAssignable(node?: ExpressionNode, isBinding?: boolean): boolean {
        switch (node?.type) {
            case "Identifier":
            case "ObjectPattern":
            case "ArrayPattern":
            case "AssignmentPattern":
            case "RestElement":
                return true;

            case "ObjectExpression": {
                const properties = node.properties || [];
                const last = properties.length - 1;
                return (properties).every(
                    (prop, i) => (prop && prop.type !== "ObjectMethod" && (i === last || prop.type !== "SpreadElement") && this.isAssignable(prop))
                );
            }

            case "ObjectProperty":
                return this.isAssignable(node.value);
            case "SpreadElement":
                return this.isAssignable(node.argument);
            case "ArrayExpression":
                return node.elements?.every(element => !element || this.isAssignable(element)) ?? false;
            case "AssignmentExpression":
                return node.operator === "=";
            case "ParenthesizedExpression":
                return this.isAssignable(node.expression);
            case "MemberExpression":
            case "OptionalMemberExpression":
                return !isBinding;
            default:
                return false;
        }
    }

    //#endregion

    //#region class

    protected parseClass<T extends IClass>(node: T, isStatement: boolean, optionalId?: boolean): T {
        this.next(); // 'class'
        // A class definition is always strict mode code.
        const oldStrict = this.state.strict;
        this.state.strict = true;

        this.parseClassId(node, isStatement, optionalId);
        this.parseClassSuper(node);
        // this.state.strict is restored in parseClassBody
        node.body = this.parseClassBody(!!node.superClass, oldStrict);
        node.body.dependencies = this.state.dependencies;
        this.state.dependencies = [];
        return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
    }

    protected parseClassId(node: IClass, isStatement: boolean, optionalId?: boolean, bindingType: BindingTypes = BIND_CLASS): void {
        if (Tokens.isIdentifier(this.state.type)) {
            node.id = this.parseIdentifier();
            if (isStatement)
                this.declareNameFromIdentifier(node.id, bindingType);
        } else {
            if (optionalId || !isStatement)
                node.id = undefined;
            else
                throw this.raise(Errors.MissingClassName, { at: this.state.startLocation });
        }
    }

    protected parseClassSuper(node: IClass): void {
        const superClass = this.eat(tokenTypes._extends) ? this.parseExprSubscripts() : undefined;
        if (superClass)
            node.superClass = superClass;
    }

    protected parseClassBody(hadSuperClass: boolean, oldStrict: boolean) {
        this.classScope.enter();
        const state: IParseClassMemberState = { hadConstructor: false, hadSuperClass };
        let decorators: IDecorator[] = [];
        const classBody = this.startNode<IClassBody>();
        classBody.children = [];
        this.expect(tokenTypes.braceL);
        while (!this.match(tokenTypes.braceR)) {
            if (this.eat(tokenTypes.semi)) {
                if (decorators.length > 0)
                    throw this.raise(Errors.DecoratorSemicolon, { at: this.state.lastTokenEndLocation });
                continue;
            }

            if (this.match(tokenTypes.at)) {
                decorators.push(this.parseDecorator());
                continue;
            }

            const member = this.startNode<IClassMember>();

            // steal the decorators if there are any
            if (decorators.length) {
                member.decorators = decorators;
                this.resetStartLocationFromNode(member, decorators[0]);
                decorators = [];
            }

            this.parseClassMember(classBody, member, state);

            if ((member as IClassMethod).kind === "constructor" && (member.decorators?.length || 0) > 0)
                this.raise(Errors.DecoratorConstructor, { at: member });
        }

        this.state.strict = oldStrict;
        this.next(); // eat `}`

        if (decorators.length)
            throw this.raise(Errors.TrailingDecorator, { at: this.state.startLocation });

        this.classScope.exit();
        return this.finishNode(classBody, "ClassBody");
    }

    protected parseClassMember(classBody: IClassBody, member: IClassMember | IStaticBlock, state: IParseClassMemberState): void {
        const isStatic = this.isContextual(tokenTypes._static);
        if (isStatic) {
            if (this.parseClassMemberFromModifier(classBody, member as IClassMember))
                // a class element named 'static'
                return;

            if (this.eat(tokenTypes.braceL)) {
                this.parseClassStaticBlock(classBody, member as IStaticBlock);
                return;
            }
        }
        this.parseClassMemberWithIsStatic(classBody, member as IClassMember, state, isStatic);
    }

    protected parseClassMemberFromModifier(classBody: IClassBody, member: IClassMember): boolean {
        const key = this.parseIdentifier(true); // eats the modifier

        if (this.isClassMethod()) {
            const method = member as IClassMethod;

            // a method named like the modifier
            method.kind = "method";
            method.computed = false;
            method.key = key;
            method.static = false;
            this.pushClassMethod(classBody, method, false, false, false, false);
            return true;
        } else if (this.isClassProperty()) {
            const prop = member as IClassProperty;
            prop.computed = false;
            prop.static = false;
            prop.key = key;
            classBody.children.push(this.parseClassProperty(prop));
            return true;
        }
        this.resetPreviousNodeTrailingComments(key);
        return false;
    }

    protected parseClassProperty(node: IClassProperty): IClassProperty {
        this.parseInitializer(node);
        this.semicolon();
        return this.finishNode(node, "ClassProperty");
    }

    protected parseClassElementName(member: IClassMember) {
        const { type, value } = this.state;
        if ((type === tokenTypes.name || type === tokenTypes.string) && member.static && value === "prototype")
            this.raise(Errors.StaticPrototype, { at: this.state.startLocation });

        if (type === tokenTypes.privateName) {
            if (value === "constructor")
                this.raise(Errors.ConstructorClassPrivateField, { at: this.state.startLocation });
            const key = this.parsePrivateName();
            member.key = key;
            return key;
        }

        return this.parsePropertyName(member);
    }

    protected parseClassStaticBlock(classBody: IClassBody, member: IStaticBlock & IHasDecorators) {
        // Start a new lexical scope
        this.scope.enter(SCOPE_CLASS | SCOPE_STATIC_BLOCK | SCOPE_SUPER);
        // Start a new scope with regard to loop labels
        const oldLabels = this.state.labels;
        this.state.labels = [];
        // ClassStaticBlockStatementList:
        //   StatementList[~Yield, ~Await, ~Return] opt
        this.prodParam.enter(PARAM);
        const children = (member.children = []);
        this.parseBlockOrModuleBlockBody(children, false, tokenTypes.braceR);
        this.prodParam.exit();
        this.scope.exit();
        this.state.labels = oldLabels;
        classBody.children.push(this.finishNode<IStaticBlock>(member, "StaticBlock"));
        if (member.decorators?.length)
            this.raise(Errors.DecoratorStaticBlock, { at: member });
    }

    protected parseClassMemberWithIsStatic(classBody: IClassBody, member: IClassMember | TsIndexSignature,
        state: IParseClassMemberState, isStatic: boolean) {
        member = member as IClassMember;
        const publicMethod = member as IClassMethod;
        const privateMethod = member as IClassPrivateMethod;
        const publicProp = member as IClassProperty;
        const privateProp = member as IClassPrivateProperty;
        const accessorProp = member as IClassAccessorProperty;

        const method: typeof publicMethod | typeof privateMethod = publicMethod;
        const publicMember: typeof publicMethod | typeof publicProp = publicMethod;

        member.static = isStatic;
        this.parsePropertyNamePrefixOperator(member);

        if (this.eat(tokenTypes.star)) {
            // a generator
            method.kind = "method";
            const isPrivateName = this.match(tokenTypes.privateName);
            this.parseClassElementName(method);

            if (isPrivateName) {
                // Private generator method
                this.pushClassPrivateMethod(classBody, privateMethod, true, false);
                return;
            }

            if (this.isNonstaticConstructor(publicMethod))
                this.raise(Errors.ConstructorIsGenerator, { at: publicMethod.id });

            this.pushClassMethod(classBody, publicMethod, true, false, false, false);
            return;
        }

        const isContextual = Tokens.isIdentifier(this.state.type) && !this.state.containsEsc;
        const isPrivate = this.match(tokenTypes.privateName);
        const key = this.parseClassElementName(member);
        const keyName = (key as Identifier).name;
        const maybeQuestionTokenStartLoc = this.state.startLocation;
        this.parsePostMemberNameModifiers(publicMember);
        if (this.isClassMethod()) {
            method.kind = "method";
            if (isPrivate)
                return this.pushClassPrivateMethod(classBody, privateMethod, false, false);
            // a normal method
            const isConstructor = this.isNonstaticConstructor(publicMethod);
            let allowsDirectSuper = false;
            if (isConstructor) {
                publicMethod.kind = "constructor";
                // TypeScript allows multiple overloaded constructor declarations.
                if (member.override)
                    this.raise(Errors.OverrideOnConstructor, { at: key });

                state.hadConstructor = true;
                allowsDirectSuper = state.hadSuperClass;
            }

            this.pushClassMethod(classBody, publicMethod, false, false, isConstructor, allowsDirectSuper);
        } else if (this.isClassProperty()) {
            if (isPrivate)
                this.pushClassPrivateProperty(classBody, privateProp);
            else
                this.pushClassProperty(classBody, publicProp);

        } else if (isContextual && keyName === "async" && !this.isLineTerminator()) {
            // an async method
            this.resetPreviousNodeTrailingComments(key);
            const isGenerator = this.eat(tokenTypes.star);

            if (publicMember.optional) {
                this.unexpected(maybeQuestionTokenStartLoc);
            }

            method.kind = "method";
            // The so-called parsed name would have been "async": get the real name.
            const isPrivate = this.match(tokenTypes.privateName);
            this.parseClassElementName(method);
            this.parsePostMemberNameModifiers(publicMember);

            if (isPrivate) {
                this.pushClassPrivateMethod(classBody, privateMethod, isGenerator, true);
            } else {
                if (this.isNonstaticConstructor(publicMethod))
                    this.raise(Errors.ConstructorIsAsync, { at: publicMethod.id });

                this.pushClassMethod(classBody, publicMethod, isGenerator, true, false, false);
            }
        } else if (
            isContextual && (keyName === "get" || keyName === "set") &&
            !(this.match(tokenTypes.star) && this.isLineTerminator())
        ) {
            // `get\n*` is an uninitialized property named 'get' followed by a generator.
            // a getter or setter
            this.resetPreviousNodeTrailingComments(key);
            method.kind = keyName;
            // The so-called parsed name would have been "get/set": get the real name.
            const isPrivate = this.match(tokenTypes.privateName);
            this.parseClassElementName(publicMethod);

            if (isPrivate) {
                // private getter/setter
                this.pushClassPrivateMethod(classBody, privateMethod, false, false);
            } else {
                if (this.isNonstaticConstructor(publicMethod))
                    this.raise(Errors.ConstructorIsAccessor, { at: publicMethod.id });

                this.pushClassMethod(classBody, publicMethod, false, false, false, false);
            }

            this.checkGetterSetterParams(publicMethod);
        } else if (isContextual && (key as Identifier).name === "accessor" && !this.isLineTerminator()) {
            this.expectFeature("decoratorAutoAccessors");
            this.resetPreviousNodeTrailingComments(key);

            // The so-called parsed name would have been "accessor": get the real name.
            const isPrivate = this.match(tokenTypes.privateName);
            this.parseClassElementName(publicProp);
            this.pushClassAccessorProperty(classBody, accessorProp, isPrivate);
        } else if (this.isLineTerminator()) {
            // an uninitialized class property (due to ASI, since we don't otherwise recognize the next token)
            if (isPrivate)
                this.pushClassPrivateProperty(classBody, privateProp);
            else
                this.pushClassProperty(classBody, publicProp);
        } else {
            this.unexpected();
        }
    }

    protected isNonstaticConstructor(method: IClassMethod | IClassProperty): boolean {
        return (!method.computed && !method.static && this.isConstructor(method.key));
    }

    protected isConstructor(key: ExpressionNode): boolean {
        return ((key.type === 'Identifier' && key.name === "constructor") ||
            (key.type === 'StringLiteral' && key.value === "constructor")
        );
    }

    protected pushClassProperty(classBody: IClassBody, prop: IClassProperty) {
        if (!prop.computed && this.isConstructor(prop.key)) {
            // Non-computed field, which is either an identifier named "constructor"
            // or a string literal named "constructor"
            this.raise(Errors.ConstructorClassField, { at: prop.key });
        }

        classBody.children.push(this.parseClassProperty(prop));
    }

    protected pushClassPrivateProperty(classBody: IClassBody, prop: IClassPrivateProperty) {
        const node = this.parseClassPrivateProperty(prop);
        classBody.children.push(node);
        this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), CLASS_ELEMENT_OTHER, node.key.location.start);
    }

    protected parseClassPrivateProperty(node: IClassPrivateProperty) {
        this.parseInitializer(node);
        this.semicolon();
        return this.finishNode(node, "ClassPrivateProperty");
    }

    protected checkGetterSetterParams(method: IObjectMethod | IClassMethod): void {
        const paramCount = this.getGetterSetterExpectedParamCount(method);
        const params = this.getObjectOrClassMethodParams(method);

        if (params.length !== paramCount)
            this.raise(method.kind === "get" ? Errors.BadGetterArity : Errors.BadSetterArity, { at: method });
        if (method.kind === "set" && params[params.length - 1]?.type === "RestElement")
            this.raise(Errors.BadSetterRestParameter, { at: method });
    }

    protected getGetterSetterExpectedParamCount(method: IObjectMethod | IClassMethod): number {
        return method.kind === "get" ? 0 : 1;
    }

    // This exists so we can override within the ESTree plugin
    protected getObjectOrClassMethodParams(method: IObjectMethod | IClassMethod) {
        return method.params;
    }

    protected pushClassAccessorProperty(classBody: IClassBody, prop: IClassAccessorProperty, isPrivate: boolean) {
        if (!isPrivate && !prop.computed) {
            // Not private, so not node is not a PrivateName and we can safely cast
            if (this.isConstructor(prop.key))
                // Non-computed field, which is either an identifier named "constructor"
                // or a string literal named "constructor"
                this.raise(Errors.ConstructorClassField, { at: prop.key });
        }

        const node = this.parseClassAccessorProperty(prop);
        classBody.children.push(node);

        if (isPrivate)
            this.classScope.declarePrivateName(this.getPrivateNameSV(node.key), CLASS_ELEMENT_OTHER, node.key.location.start);
    }

    protected parseClassAccessorProperty(node: IClassAccessorProperty) {
        this.parseInitializer(node);
        this.semicolon();
        return this.finishNode(node, "ClassAccessorProperty");
    }

    //#endregion

    //#region directives & decorators

    protected parseDecorators(allowExport?: boolean): IDecorator[] {
        const decorators = [];
        do {
            decorators.push(this.parseDecorator());
        } while (this.match(tokenTypes.at));

        if (this.match(tokenTypes._export)) {
            if (!allowExport)
                this.unexpected();

            if (!this.options.decorators)
                this.raise(Errors.DecoratorExportClass, { at: this.state.startLocation });
        } else if (!this.canHaveLeadingDecorator()) {
            throw this.raise(Errors.UnexpectedLeadingDecorator, { at: this.state.startLocation });
        }

        return decorators;
    }

    protected parseDecorator() {
        if (!this.options.decorators)
            this.unexpected();

        const node = this.startNode<IDecorator>();
        this.next();

        if (this.options.decorators === 'proposal') {
            const startLoc = this.state.startLocation;
            let expr: ExpressionNode;

            if (this.match(tokenTypes.parenL)) {
                const startLoc = this.state.startLocation;
                this.next(); // eat '('
                expr = this.parseExpression();
                this.expect(tokenTypes.parenR);
                expr = this.wrapParenthesis(startLoc, expr);
                node.expression = this.parseMaybeDecoratorArguments(expr);
            } else {
                expr = this.parseIdentifier(false);
                while (this.eat(tokenTypes.dot)) {
                    const node = this.startNodeAt<IMemberExpression>(startLoc);
                    node.object = expr;
                    if (this.match(tokenTypes.privateName)) {
                        this.classScope.usePrivateName(this.state.value as string, this.state.startLocation);
                        node.property = this.parsePrivateName();
                    } else {
                        node.property = this.parseIdentifier(true);
                    }
                    node.computed = false;
                    expr = this.finishNode(node, "MemberExpression");
                }

                node.expression = this.parseMaybeDecoratorArguments(expr);
            }
        } else {
            node.expression = this.parseExprSubscripts();
        }
        return this.finishNode(node, "Decorator");
    }

    protected parseMaybeDecoratorArguments(expr: ExpressionNode) {
        if (this.eat(tokenTypes.parenL)) {
            const node = this.startNodeAtNode<ICallOrNewExpression>(expr);
            node.callee = expr;
            node.arguments = this.parseCallExpressionArguments(tokenTypes.parenR, false);
            this.toReferencedList(node.arguments);
            return this.finishNode(node, "CallExpression");
        }

        return expr;
    }

    protected isValidDirective(stmt?: ExpressionNode) {
        if (stmt?.type === "ExpressionStatement" && stmt.expression?.type === "StringLiteral" &&
            !(stmt.expression as IParenthesized)?.parenthesized)
            return stmt;
        return undefined;

    }

    protected parseInterpreterDirective() {
        if (!this.match(tokenTypes.interpreterDirective))
            return undefined;
        const node = this.startNode<InterpreterDirective>();
        node.value = this.state.value as string;
        this.next();
        return this.finishNode(node, "InterpreterDirective");
    }

    protected starmentToDirective(stmt: IAnyStatement) {
        const directive = this.replaceType<IDirective>(stmt, "Directive");
        const directiveLiteral = directive.value = this.replaceType<IDirectiveLiteral>(stmt.expression!, "DirectiveLiteral");
        delete stmt.expression;
        const raw = this.input.slice(directiveLiteral.location.start.index, directiveLiteral.location.end.index);
        directiveLiteral.value = raw.slice(1, -1); // remove quotes
        directiveLiteral.rawValue = raw;
        return directive;
    }

    //#endregion

    //#region Subscripts

    protected parseExprSubscripts(refExpressionErrors?: ExpressionErrors) {
        const startLoc = this.state.startLocation;
        const potentialArrowAt = this.state.potentialArrowAt;
        const expr = this.parseExprAtom(refExpressionErrors);

        if (this.shouldExitDescending(expr, potentialArrowAt))
            return expr;

        return this.parseSubscripts(expr, startLoc);
    }

    protected parseSubscripts(base: ExpressionNode, startLoc: IPosition, noCalls?: boolean) {
        const state = {
            optionalChainMember: false,
            maybeAsyncArrow: this.atPossibleAsyncArrow(base),
            stop: false,
        };
        do {
            base = this.parseSubscript(base, startLoc, noCalls, state);

            // After parsing a subscript, this isn't "async" for sure.
            state.maybeAsyncArrow = false;
        } while (!state.stop);
        return base;
    }

    protected parseSubscript(base: ExpressionNode, startLoc: IPosition, noCalls: boolean | undefined, state: IParseSubscriptState): ExpressionNode {
        const { type } = this.state;
        if (!noCalls && type === tokenTypes.doubleColon)
            return this.parseBind(base, startLoc, noCalls, state);
        else if (Tokens.isTemplate(type))
            return this.parseTaggedTemplateExpression(base, startLoc, state);

        let optional = false;
        if (type === tokenTypes.questionDot) {
            if (noCalls) {
                this.raise(Errors.OptionalChainingNoNew, { at: this.state.startLocation });
                if (this.lookaheadCharCode() === CharCodes.leftParenthesis) {
                    // stop at `?.` when parsing `new a?.()`
                    state.stop = true;
                    return base;
                }
            }
            state.optionalChainMember = optional = true;
            this.next();
        }

        if (!noCalls && this.match(tokenTypes.parenL)) {
            return this.parseCoverCallAndAsyncArrowHead(base, startLoc, state, optional);
        } else {
            const computed = this.eat(tokenTypes.bracketL);
            if (computed || optional || this.eat(tokenTypes.dot)) {
                return this.parseMember(base, startLoc, state, computed, optional);
            } else {
                state.stop = true;
                return base;
            }
        }
    }

    protected parseBind(base: ExpressionNode, startLoc: IPosition, noCalls: boolean | undefined, state: IParseSubscriptState) {
        const node = this.startNodeAt<IBindExpression>(startLoc);
        node.object = base;
        this.next(); // eat '::'
        node.callee = this.parseNoCallExpr();
        state.stop = true;
        return this.parseSubscripts(this.finishNode(node, "BindExpression"), startLoc, noCalls);
    }

    protected parseNoCallExpr() {
        const startLoc = this.state.startLocation;
        return this.parseSubscripts(this.parseExprAtom(), startLoc, true);
    }

    protected parseTaggedTemplateExpression(base: ExpressionNode, startLoc: IPosition, state: IParseSubscriptState) {
        const node = this.startNodeAt<ITaggedTemplateExpression>(startLoc);
        node.tag = base;
        node.quasi = this.parseTemplate(true);
        if (state.optionalChainMember)
            this.raise(Errors.OptionalChainingNoTemplate, { at: startLoc });
        return this.finishNode(node, "TaggedTemplateExpression");
    }

    protected parseMember(base: ExpressionNode, startLoc: IPosition, state: IParseSubscriptState, computed: boolean, optional: boolean) {
        const node = this.startNodeAt<IMemberExpression>(startLoc);
        node.object = base;
        node.computed = computed;
        if (computed) {
            node.property = this.parseExpression();
            this.expect(tokenTypes.bracketR);
        } else if (this.match(tokenTypes.privateName)) {
            if (base.type === "Super")
                this.raise(Errors.SuperPrivateField, { at: startLoc });

            this.classScope.usePrivateName(this.state.value as string, this.state.startLocation);
            node.property = this.parsePrivateName();
        } else {
            node.property = this.parseIdentifier(true);
        }

        if (state.optionalChainMember) {
            node.optional = optional;
            return this.finishNode(node, "OptionalMemberExpression");
        } else {
            return this.finishNode(node, "MemberExpression");
        }
    }

    protected parseCoverCallAndAsyncArrowHead(base: ExpressionNode | Import, startLoc: IPosition, state: IParseSubscriptState, optional: boolean) {
        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        let refExpressionErrors: ExpressionErrors | undefined = undefined;
        this.state.maybeInArrowParameters = true;
        this.next(); // eat `(`

        const node = this.startNodeAt<ICallOrNewExpression>(startLoc);
        node.callee = base;
        const { maybeAsyncArrow, optionalChainMember } = state;

        if (maybeAsyncArrow) {
            this.expressionScope.enter(ExpressionScopeHandler.newAsyncArrowScope());
            refExpressionErrors = new ExpressionErrors();
        }

        if (optionalChainMember)
            node.optional = optional;

        if (optional)
            node.arguments = this.parseCallExpressionArguments(tokenTypes.parenR);
        else
            node.arguments = this.parseCallExpressionArguments(tokenTypes.parenR, base.type === "Import", base.type !== "Super",
                node, refExpressionErrors);

        let finishedNode: ICallOrNewExpression | IArrowFunctionExpression = this.finishCallExpression(node, optionalChainMember);
        if (maybeAsyncArrow && this.shouldParseAsyncArrow() && !optional) {
            /*:: invariant(refExpressionErrors != null) */
            state.stop = true;
            this.checkDestructuringPrivate(refExpressionErrors);
            this.expressionScope.validateAsPattern();
            this.expressionScope.exit();
            finishedNode = this.parseAsyncArrowFromCallExpression(this.startNodeAt<IArrowFunctionExpression>(startLoc), finishedNode);
        } else {
            if (maybeAsyncArrow) {
                this.checkExpressionErrors(refExpressionErrors, true);
                this.expressionScope.exit();
            }
            this.toReferencedArguments(finishedNode);
        }

        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        return finishedNode;
    }

    protected parseCallExpressionArguments(
        close: number, dynamicImport?: boolean, allowPlaceholder?: boolean, nodeForExtra?: (ExpressionNode & IHasTrailingComma),
        refExpressionErrors?: ExpressionErrors) {
        const elts: Nullable<ExpressionNode>[] = [];
        let first = true;
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = false;

        while (!this.eat(close)) {
            if (first) {
                first = false;
            } else {
                this.expect(tokenTypes.comma);
                if (this.match(close)) {
                    if (dynamicImport && !this.hasFeature("importAttributes") &&
                        !this.hasFeature("importAssertions") && !this.hasFeature("moduleAttributes"))
                        this.raise(Errors.ImportCallArgumentTrailingComma, { at: this.state.lastTokenStartLocation });

                    if (nodeForExtra)
                        this.addTrailingCommaExtraToNode(nodeForExtra);
                    this.next();
                    break;
                }
            }
            elts.push(this.parseExprListItem(false, refExpressionErrors, allowPlaceholder));
        }

        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        return elts;
    }

    // protected parseExprListItem(allowEmpty?: false, refExpressionErrors?: ExpressionErrors, allowPlaceholder?: boolean): IExpression;
    // protected parseExprListItem(allowEmpty?: boolean, refExpressionErrors?: ExpressionErrors, allowPlaceholder?: boolean): IExpression | undefined
    protected parseExprListItem(allowEmpty?: boolean, refExpressionErrors?: ExpressionErrors, allowPlaceholder?: boolean) {
        //  : IExpression | undefined {
        let elt;
        if (this.match(tokenTypes.comma)) {
            if (!allowEmpty)
                this.raise(Errors.UnexpectedToken, { at: this.state.currentPosition(), unexpected: "," });

        } else if (this.match(tokenTypes.ellipsis)) {
            const spreadNodeStartLoc = this.state.startLocation;
            elt = this.parseParenItem(this.parseSpread(refExpressionErrors), spreadNodeStartLoc);
        } else if (this.match(tokenTypes.question)) {
            this.expectFeature("partialApplication");
            if (!allowPlaceholder)
                this.raise(Errors.UnexpectedArgumentPlaceholder, { at: this.state.startLocation });
            const node = this.startNode<IArgumentPlaceholder>();
            this.next();
            elt = this.finishNode(node, "ArgumentPlaceholder");
        } else {
            elt = this.parseMaybeAssignAllowIn(refExpressionErrors, this.parseParenItem);
        }
        return elt;
    }

    protected parseExprList(
        close: number, allowEmpty?: boolean, refExpressionErrors?: ExpressionErrors,
        nodeForExtra?: IHasTrailingComma & ExpressionNode) {
        const elts: Array<Nullable<ExpressionNode>> = [];
        let first = true;
        while (!this.eat(close)) {
            if (first) {
                first = false;
            } else {
                this.expect(tokenTypes.comma);
                if (this.match(close)) {
                    if (nodeForExtra)
                        this.addTrailingCommaExtraToNode(nodeForExtra);
                    this.next();
                    break;
                }
            }
            elts.push(this.parseExprListItem(allowEmpty, refExpressionErrors));
        }
        return elts;
    }

    protected parseSpread(refExpressionErrors?: ExpressionErrors) {
        const node = this.startNode<ISpreadElement>();
        this.next();
        node.argument = this.parseMaybeAssignAllowIn(refExpressionErrors);
        return this.finishNode(node, "SpreadElement");
    }

    //#endregion

    //#region parse template

    protected parseTemplate(isTagged: boolean) {
        const node = this.startNode<ITemplateLiteral>();
        node.expressions = [];
        let curElt = this.parseTemplateElement(isTagged);
        node.quasis = [curElt];
        while (!curElt.tail) {
            node.expressions.push(this.parseTemplateSubstitution());
            this.readTemplateContinuation();
            node.quasis.push((curElt = this.parseTemplateElement(isTagged)));
        }
        return this.finishNode(node, "TemplateLiteral");
    }

    // This is overwritten by the TypeScript plugin to parse template types
    protected parseTemplateSubstitution() {
        return this.parseExpression();
    }

    protected parseTemplateElement(isTagged: boolean) {
        const { start, startLocation, end, value } = this.state;
        const elemStart = start + 1;
        const elem = this.startNodeAt<ITemplateElement>(Position.fromColumnOffset(startLocation, 1));
        if (value == null) {
            if (!isTagged) {
                this.raise(Errors.InvalidEscapeSequenceTemplate, {
                    // FIXME: Adding 1 is probably wrong.
                    at: Position.fromColumnOffset(this.state.firstInvalidTemplateEscapePos, 1),
                });
            }
        }

        const isTail = this.match(tokenTypes.templateTail);
        const endOffset = isTail ? -1 : -2;
        const elemEnd = end + endOffset;
        elem.value = {
            raw: this.input.slice(elemStart, elemEnd).replace(/\r\n?/g, "\n"),
            cooked: value == null ? null : (value as string).slice(1, endOffset),
        };
        elem.tail = isTail;
        this.next();
        const finishedNode = this.finishNode(elem, "TemplateElement");
        this.resetEndLocation(finishedNode, Position.fromColumnOffset(this.state.lastTokenEndLocation!, endOffset));
        return finishedNode;
    }

    //#endregion

    //#region parse content

    protected parseStatementContent(flags: ParseStatementFlag, decorators?: IDecorator[]): ExpressionNode {
        const starttype = this.state.type;
        const allowDeclaration = !!(flags & ParseStatementFlag.AllowDeclaration);
        const allowFunctionDeclaration = !!(flags & ParseStatementFlag.AllowFunctionDeclaration);
        const topLevel = flags & ParseStatementFlag.AllowImportExport;
        let node;
        switch (starttype) {
            case tokenTypes._break:
                return this.parseBreakContinueStatement(true);
            case tokenTypes._continue:
                return this.parseBreakContinueStatement(false);
            case tokenTypes._debugger:
                return this.parseDebuggerStatement();
            case tokenTypes._do:
                return this.parseDoWhileStatement();
            case tokenTypes._for:
                return this.parseForStatement();
            case tokenTypes._function:
                if (this.lookaheadCharCode() === CharCodes.dot) break;
                if (!allowFunctionDeclaration)
                    this.raise(
                        this.state.strict ? Errors.StrictFunction : this.options.annexB ? Errors.SloppyFunctionAnnexB : Errors.SloppyFunction,
                        { at: this.state.startLocation }
                    );
                return this.parseFunctionStatement(this.startNode<IFunctionDeclaration>(), false, !allowDeclaration && allowFunctionDeclaration);
            case tokenTypes._class:
                if (!allowDeclaration)
                    this.unexpected();
                return this.parseClass(this.maybeTakeDecorators(decorators, this.startNode<IClass>()), true);
            case tokenTypes._if:
                return this.parseIfStatement();
            case tokenTypes._return:
                return this.parseReturnStatement();
            case tokenTypes._switch:
                return this.parseSwitchStatement();
            case tokenTypes._throw:
                return this.parseThrowStatement();
            case tokenTypes._try:
                return this.parseTryStatement();
            case tokenTypes._await:
                node = this.parseAwaitStatement(allowDeclaration);
                if (node)
                    return node;
                break;
            case tokenTypes._using:
                node = this.parseUsingStatement(allowDeclaration);
                if (node)
                    return node;
                break;
            case tokenTypes._let:
            case tokenTypes._const:
            case tokenTypes._var:
                if (starttype === tokenTypes._let && this.checkLetStatement(allowDeclaration))
                    break;
                if (starttype === tokenTypes._const && !allowDeclaration)
                    this.raise(Errors.UnexpectedLexicalDeclaration, { at: this.state.startLocation });
                return this.parseVarStatement(this.startNode<IVariableDeclaration>(), this.state.value as VariableKind);
            case tokenTypes._while:
                return this.parseWhileStatement();
            case tokenTypes._with:
                return this.parseWithStatement();
            case tokenTypes.braceL:
                return this.parseBlock();
            case tokenTypes.semi:
                return this.parseEmptyStatement();
            case tokenTypes._import:
            case tokenTypes._export:
                node = this.parseImportExportStatement(starttype, topLevel, decorators);
                if (node)
                    return node;
                break;

            default: {
                if (this.isAsyncFunction()) {
                    if (!allowDeclaration)
                        this.raise(Errors.AsyncFunctionInSingleStatementContext, { at: this.state.startLocation });
                    node = this.startNode<IFunctionDeclaration>();
                    this.next(); // eat 'async'
                    return this.parseFunctionStatement(node, true, !allowDeclaration && allowFunctionDeclaration);
                }
            }
        }

        // If the statement does not start with a statement keyword or a
        // brace, it's an ExpressionStatement or LabeledStatement. We
        // simply start parsing an expression, and afterwards, if the
        // next token is a colon and the expression was a simple
        // Identifier node, we switch to interpreting it as a label.
        const maybeName = this.state.value as string;
        const expr = this.parseExpression();

        if (Tokens.isIdentifier(starttype) && expr.type === "Identifier" && this.eat(tokenTypes.colon))
            return this.parseLabeledStatement(maybeName, expr, flags);
        else
            return this.parseExpressionStatement(this.startNode<IExpressionStatement>(), expr, decorators);
    }

    protected parseBreakContinueStatement(isBreak: true,): IBreakStatement;
    protected parseBreakContinueStatement(isBreak: false): IContinueStatement;
    protected parseBreakContinueStatement(isBreak: boolean): IBreakStatement | IContinueStatement {
        const node = this.startNode<IBreakStatement | IContinueStatement>();
        this.next();

        if (this.isLineTerminator()) {
            node.label = undefined;
        } else {
            node.label = this.parseIdentifier();
            this.semicolon();
        }

        this.verifyBreakContinue(node, isBreak);
        return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
    }

    protected parseDebuggerStatement(): IDebuggerStatement {
        const node = this.startNode<IDebuggerStatement>();
        this.next();
        this.semicolon();
        return this.finishNode(node, "DebuggerStatement");
    }

    protected maybeTakeDecorators<T extends IClass>(maybeDecorators: Nullable<IDecorator[]>,
        classNode: T, exportNode?: IExportDefaultDeclaration | IExportNamedDeclaration): T {
        if (maybeDecorators) {
            if (classNode.decorators && classNode.decorators.length > 0) {
                classNode.decorators.unshift(...maybeDecorators);
            } else {
                classNode.decorators = maybeDecorators;
            }
            this.resetStartLocationFromNode(classNode, maybeDecorators[0]);
            if (exportNode)
                this.resetStartLocationFromNode(exportNode, classNode);
        }
        return classNode;
    }

    protected parseInitializer(node: IClassProperty | IClassPrivateProperty | IClassAccessorProperty): void {
        this.scope.enter(SCOPE_CLASS | SCOPE_SUPER);
        this.expressionScope.enter(ExpressionScopeHandler.newExpressionScope());
        this.prodParam.enter(PARAM);
        node.value = this.eat(tokenTypes.eq) ? this.parseMaybeAssignAllowIn() : undefined;
        this.expressionScope.exit();
        this.prodParam.exit();
        this.scope.exit();
    }

    protected parseHeaderExpression(): ExpressionNode {
        this.expect(tokenTypes.parenL);
        const val = this.parseExpression();
        this.expect(tokenTypes.parenR);
        return val;
    }

    protected parseVar(node: IVariableDeclaration, isFor: boolean, kind: VariableKind, allowMissingInitializer: boolean = false) {
        const declarations: IVariableDeclarator[] = (node.declarations = []);
        node.kind = kind;
        for (; ;) {
            const decl = this.startNode<IVariableDeclarator>();
            this.parseVarId(decl, kind);
            decl.init = !this.eat(tokenTypes.eq)
                ? undefined : isFor ? this.parseMaybeAssignDisallowIn() : this.parseMaybeAssignAllowIn();

            if (decl.init === null && !allowMissingInitializer) {
                if (decl.id.type !== "Identifier" && !(isFor && (this.match(tokenTypes._in) || this.isContextual(tokenTypes._of))))
                    this.raise(Errors.DeclarationMissingInitializer, { at: this.state.lastTokenEndLocation, kind: "destructuring" });
                else if (kind === "const" && !(this.match(tokenTypes._in) || this.isContextual(tokenTypes._of)))
                    this.raise(Errors.DeclarationMissingInitializer, { at: this.state.lastTokenEndLocation, kind: "const" });
            }
            declarations.push(this.finishNode(decl, "VariableDeclarator"));
            if (!this.eat(tokenTypes.comma))
                break;
        }
        return node;
    }

    protected parseVarId(decl: IVariableDeclarator, kind: VariableKind): void {
        const id = this.parseBindingAtom();
        this.checkLVal(id, { in: { type: "VariableDeclarator" }, binding: kind === "var" ? BIND_VAR : BIND_LEXICAL });
        decl.id = id;
    }

    protected parseIfStatement() {
        const node = this.startNode<IIfStatement>();
        this.next();
        node.test = this.parseHeaderExpression();
        node.consequent = this.parseStatementOrSloppyAnnexBFunctionDeclaration();
        node.alternate = this.eat(tokenTypes._else) ? this.parseStatementOrSloppyAnnexBFunctionDeclaration() : undefined;
        return this.finishNode(node, "IfStatement");
    }

    protected parseSwitchStatement() {
        const node = this.startNode<ISwitchStatement>();
        this.next();
        node.discriminant = this.parseHeaderExpression();
        const cases: ISwitchCase[] = (node.cases = []);
        this.expect(tokenTypes.braceL);
        this.state.labels.push({ kind: "switch" });
        this.scope.enter(SCOPE_OTHER);

        // Statements under must be grouped (by label) in SwitchCase
        // nodes. `cur` is used to keep the node that we are currently
        // adding statements to.

        let cur;
        for (let sawDefault; !this.match(tokenTypes.braceR);) {
            if (this.match(tokenTypes._case) || this.match(tokenTypes._default)) {
                const isCase = this.match(tokenTypes._case);
                if (cur)
                    this.finishNode(cur, "SwitchCase");
                cases.push((cur = this.startNode<ISwitchCase>()));
                cur.consequent = [];
                this.next();
                if (isCase) {
                    cur.test = this.parseExpression();
                } else {
                    if (sawDefault)
                        this.raise(Errors.MultipleDefaultsInSwitch, { at: this.state.lastTokenStartLocation });
                    sawDefault = true;
                    cur.test = undefined;
                }
                this.expect(tokenTypes.colon);
            } else {
                if (cur)
                    cur.consequent.push(this.parseStatementListItem());
                else
                    this.unexpected();
            }
        }
        this.scope.exit();
        if (cur)
            this.finishNode(cur, "SwitchCase");
        this.next(); // Closing brace
        this.state.labels.pop();
        return this.finishNode(node, "SwitchStatement");
    }

    protected parseTryStatement() {
        const node = this.startNode<ITryStatement>();
        this.next();
        node.block = this.parseBlock();

        if (this.match(tokenTypes._catch)) {
            const clause = this.startNode<ICatchClause>();
            this.next();
            if (this.match(tokenTypes.parenL)) {
                this.expect(tokenTypes.parenL);
                clause.param = this.parseCatchClauseParam();
                this.expect(tokenTypes.parenR);
            } else {
                this.scope.enter(SCOPE_OTHER);
            }

            // Parse the catch clause's body.
            clause.body = this.parseBlock(false, false);
            this.scope.exit();
            node.handler = this.finishNode(clause, "CatchClause");
        }

        node.finalizer = this.eat(tokenTypes._finally) ? this.parseBlock() : undefined;

        if (!node.handler && !node.finalizer)
            this.raise(Errors.NoCatchOrFinally, { at: node });

        return this.finishNode(node, "TryStatement");
    }

    protected parseCatchClauseParam(): IPattern {
        const param = this.parseBindingAtom();
        this.scope.enter(this.options.annexB && param.type === "Identifier" ? SCOPE_SIMPLE_CATCH : 0);
        this.checkLVal(param, { in: { type: "CatchClause" }, binding: BIND_CATCH_PARAM });
        return param;
    }

    protected parseThrowStatement() {
        const node = this.startNode<IThrowStatement>();
        this.next();
        if (this.hasPrecedingLineBreak())
            this.raise(Errors.NewlineAfterThrow, { at: this.state.lastTokenEndLocation });
        node.argument = this.parseExpression();
        this.semicolon();
        return this.finishNode(node, "ThrowStatement");
    }

    protected parseAwaitStatement(allowDeclaration: boolean) {
        // [+Await] await [no LineTerminator here] using [no LineTerminator here] BindingList[+Using]
        const node = this.startNode<IVariableDeclaration>();
        if (!this.state.containsEsc && this.startsAwaitUsing()) {
            if (!this.isAwaitAllowed())
                this.raise(Errors.AwaitUsingNotInAsyncContext, { at: node });
            else if (!allowDeclaration)
                this.raise(Errors.UnexpectedLexicalDeclaration, { at: node });
            this.next(); // eat 'await'
            return this.parseVarStatement(node, "await using");
        }
        return;
    }

    protected parseUsingStatement(allowDeclaration: boolean) {
        // using [no LineTerminator here] BindingList[+Using]
        const node = this.startNode<IVariableDeclaration>();
        if (this.state.containsEsc || !this.hasInLineFollowingBindingIdentifier())
            return;
        this.expectFeature("explicitResourceManagement");
        if (!this.scope.inModule && this.scope.inTopLevel)
            this.raise(Errors.UnexpectedUsingDeclaration, { at: this.state.startLocation });
        else if (!allowDeclaration)
            this.raise(Errors.UnexpectedLexicalDeclaration, { at: this.state.startLocation });

        return this.parseVarStatement(node, "using");
    }

    protected parseWhileStatement() {
        const node = this.startNode<IWhileStatement>();
        this.next();
        node.test = this.parseHeaderExpression();
        this.state.labels.push({ kind: "switch" });
        // Parse the loop body.
        node.body = this.parseStatement();
        this.state.labels.pop();
        return this.finishNode(node, "WhileStatement");
    }

    protected parseWithStatement() {
        const node = this.startNode<IWithStatement>();
        if (this.state.strict)
            this.raise(Errors.StrictWith, { at: this.state.startLocation });
        this.next();
        node.object = this.parseHeaderExpression();

        // Parse the statement body.
        node.body = this.parseStatement();
        return this.finishNode(node, "WithStatement");
    }

    protected parseImportExportStatement(starttype: number, topLevel: number, decorators?: IDecorator[]) {
        const node = this.startNode<IImportDeclaration | AnyExport>();
        if (starttype === tokenTypes._import) {
            const nextTokenCharCode = this.lookaheadCharCode();
            if (nextTokenCharCode === CharCodes.leftParenthesis || nextTokenCharCode === CharCodes.dot)
                return;
        }
        if (!this.options.allowImportExportEverywhere && !topLevel)
            this.raise(Errors.UnexpectedImportExport, { at: this.state.startLocation });

        this.next(); // eat `import`/`export`
        let result;
        if (starttype === tokenTypes._import) {
            result = this.parseImport(node as IImportDeclaration);
            if (result.type === "ImportDeclaration" && (!result.importKind || result.importKind === "value"))
                this.sawUnambiguousESM = true;
        } else {
            result = this.parseExport(node as AnyExport, decorators);

            if ((result.type === "ExportNamedDeclaration" && (!result.exportKind || result.exportKind === "value")) ||
                (result.type === "ExportAllDeclaration" && (!result.exportKind || result.exportKind === "value")) ||
                result.type === "ExportDefaultDeclaration"
            )
                this.sawUnambiguousESM = true;
        }

        this.assertModuleNodeAllowed(result);
        return result;
    }

    protected parseVarStatement(node: IVariableDeclaration, kind: VariableKind, allowMissingInitializer: boolean = false) {
        this.next();
        this.parseVar(node, false, kind, allowMissingInitializer);
        this.semicolon();
        return this.finishNode(node, "VariableDeclaration");
    }

    protected parseEmptyStatement() {
        const node = this.startNode<IEmptyStatement>();
        this.next();
        return this.finishNode(node, "EmptyStatement");
    }

    protected parseLabeledStatement(maybeName: string, expr: Identifier, flags: ParseStatementFlag) {
        const node = this.startNode<ILabeledStatement>();
        for (const label of this.state.labels) {
            if (label.name === maybeName)
                this.raise(Errors.LabelRedeclaration, { at: expr, labelName: maybeName });
        }

        const kind = Tokens.isLoop(this.state.type) ? "loop" : this.match(tokenTypes._switch) ? "switch" : undefined;
        for (let i = this.state.labels.length - 1; i >= 0; i--) {
            const label = this.state.labels[i];
            if (this.matchIndex(label.statementStart, node, 'start')) {
                label.statementStart = this.state.start;
                label.kind = kind;
            } else {
                break;
            }

        }

        this.state.labels.push({
            name: maybeName,
            kind: kind,
            statementStart: this.state.start,
        });
        node.body = flags & ParseStatementFlag.AllowLabeledFunction
            ? this.parseStatementOrSloppyAnnexBFunctionDeclaration(true)
            : this.parseStatement();

        this.state.labels.pop();
        node.label = expr;
        return this.finishNode(node, "LabeledStatement");
    }

    protected parseExpressionStatement(node: IExpressionStatement, expr: ExpressionNode, decorators?: IDecorator[]): ExpressionNode {
        node.expression = expr;
        this.semicolon();
        return this.finishNode(node, "ExpressionStatement");
    }

    //#endregion

    //#region import & export

    protected parseImport(node: AnyImport): AnyImport {
        if (this.match(tokenTypes.string))
            // import '...'
            return this.parseImportSourceAndAttributes(node as IImportDeclaration);

        return this.parseImportSpecifiersAndAfter(node as IImportDeclaration, this.parseMaybeImportPhase(node, /* isExport */ false));
    }

    protected parseImportSourceAndAttributes(node: IImportDeclaration) {
        node.specifiers ??= [];
        node.source = this.parseImportSource();
        this.maybeParseImportAttributes(node);
        this.checkImportReflection(node);
        this.checkJSONModuleImport(node);

        this.semicolon();
        return this.finishNode(node, "ImportDeclaration");
    }

    protected parseImportSource(): IStringLiteral {
        if (!this.match(tokenTypes.string))
            this.unexpected();
        return this.parseExprAtom() as IStringLiteral;
    }

    protected maybeParseImportAttributes(node: IImportDeclaration | IExportNamedDeclaration) {
        let attributes: ImportAttribute[];
        let useWith = false;

        // https://tc39.es/proposal-import-attributes/#prod-WithClause
        if (this.match(tokenTypes._with)) {
            if (this.hasPrecedingLineBreak() && this.lookaheadCharCode() === CharCodes.leftParenthesis) {
                // This will be parsed as a with statement, and we will throw a
                // better error about it not being supported in strict mode.
                return;
            }

            this.next(); // eat `with`
            this.expectFeature("importAttributes");
            attributes = this.parseImportAttributes();
            useWith = true;
        } else if (this.isContextual(tokenTypes._assert) && !this.hasPrecedingLineBreak()) {
            this.expectFeature("importAttributes");
            this.next(); // eat `assert`
            attributes = this.parseImportAttributes();
        } else if (this.hasFeature("importAttributes") || this.hasFeature("importAssertions")) {
            attributes = [];
        } else
            return;
        if (!useWith && this.hasFeature("importAssertions"))
            node.assertions = attributes;
        else
            node.attributes = attributes;
    }

    protected parseImportAttributes() {
        this.expect(tokenTypes.braceL);
        const attrs = [];
        const attrNames = new Set();
        do {
            if (this.match(tokenTypes.braceR))
                break;

            const node = this.startNode<ImportAttribute>();

            // parse AssertionKey : IdentifierName, StringLiteral
            const keyName = this.state.value;
            // check if we already have an entry for an attribute
            // if a duplicate entry is found, throw an error
            // for now this logic will come into play only when someone declares `type` twice
            if (attrNames.has(keyName))
                this.raise(Errors.ModuleAttributesWithDuplicateKeys, { at: this.state.startLocation, key: keyName });

            attrNames.add(keyName);
            if (this.match(tokenTypes.string))
                node.key = this.parseStringLiteral(keyName as string);
            else
                node.key = this.parseIdentifier(true);
            this.expect(tokenTypes.colon);

            if (!this.match(tokenTypes.string))
                throw this.raise(Errors.ModuleAttributeInvalidValue, { at: this.state.startLocation });

            node.value = this.parseStringLiteral(this.state.value as string);
            attrs.push(this.finishNode(node, "ImportAttribute"));
        } while (this.eat(tokenTypes.comma));

        this.expect(tokenTypes.braceR);

        return attrs;
    }

    protected checkImportReflection(node: IImportDeclaration) {
        if (node.module) {
            if (node.specifiers.length !== 1 || node.specifiers[0].type !== "ImportDefaultSpecifier")
                this.raise(Errors.ImportReflectionNotBinding, { at: node.specifiers[0].location.start });
            if (node.assertions && node.assertions.length > 0)
                this.raise(Errors.ImportReflectionHasAssertion, { at: node.specifiers[0].location.start });
        }
    }

    protected checkJSONModuleImport(node: IExportAllDeclaration | IExportNamedDeclaration | IImportDeclaration) {
        if (this.isJSONModuleImport(node) && node.type !== "ExportAllDeclaration") {
            const { specifiers } = node;
            if (specifiers != null) {
                let nonDefaultNamedSpecifier = undefined;
                for (const specifier of specifiers) {
                    let imported;
                    if (specifier.type === "ExportSpecifier") {
                        imported = specifier.local;
                    } else if (specifier.type === "ImportSpecifier") {
                        imported = specifier.key;
                    }
                    if (imported !== undefined && (imported.type === "Identifier" ? imported.name !== "default" : imported.value !== "default")) {
                        nonDefaultNamedSpecifier = specifier;
                        break;
                    }
                }
                if (nonDefaultNamedSpecifier !== undefined)
                    this.raise(Errors.ImportJSONBindingNotDefault, { at: nonDefaultNamedSpecifier.location.start });
            }
        }
    }

    protected isJSONModuleImport(node: IExportAllDeclaration | IExportNamedDeclaration | IImportDeclaration): boolean {
        if (node.assertions != null)
            return node.assertions.some(({ key, value }) =>
                (value.value === "json" && (key.type === "Identifier" ? key.name === "type" : key.value === "type"))
            );
        return false;
    }

    protected parseImportSpecifiersAndAfter(node: IImportDeclaration, maybeDefaultIdentifier?: Identifier): IImportDeclaration {
        node.specifiers = [];
        // check if we have a default import like
        // import React from "react";
        const hasDefault = this.maybeParseDefaultImportSpecifier(node, maybeDefaultIdentifier);
        /* we are checking if we do not have a default import, then it is obvious that we need named imports
         * import { get } from "axios";
         * but if we do have a default import
         * we need to check if we have a comma after that and
         * that is where this `|| this.eat` condition comes into play
         */
        const parseNext = !hasDefault || this.eat(tokenTypes.comma);
        // if we do have to parse the next set of specifiers, we first check for star imports
        // import React, * from "react";
        const hasStar = parseNext && this.maybeParseStarImportSpecifier(node);
        // now we check if we need to parse the next imports
        // but only if they are not importing * (everything)
        if (parseNext && !hasStar) this.parseNamedImportSpecifiers(node);
        this.expectContextual(tokenTypes._from);

        return this.parseImportSourceAndAttributes(node);
    }

    protected maybeParseDefaultImportSpecifier(node: IImportDeclaration, maybeDefaultIdentifier?: Identifier): boolean {
        // import defaultObj, { x, y as z } from '...'
        if (maybeDefaultIdentifier) {
            const specifier = this.startNodeAtNode<IImportDefaultSpecifier>(maybeDefaultIdentifier);
            specifier.local = maybeDefaultIdentifier;
            node.specifiers.push(this.finishImportSpecifier(specifier, "ImportDefaultSpecifier"));
            return true;
            // We allow keywords, and parseImportSpecifierLocal will report a recoverable error
        } else if (Tokens.isKeywordOrIdentifier(this.state.type)) {
            this.parseImportSpecifierLocal(node, this.startNode<IImportDefaultSpecifier>(), "ImportDefaultSpecifier");
            return true;
        }
        return false;
    }

    protected finishImportSpecifier<T extends AnyImportSpecifier>(specifier: T, type: T["type"], bindingType = BIND_LEXICAL) {
        this.checkLVal(specifier.local, { in: { type }, binding: bindingType });
        return this.finishNode(specifier, type);
    }

    protected parseImportSpecifierLocal<T extends | AnyImportSpecifier>(node: IImportDeclaration, specifier: T, type: T["type"]): void {
        specifier.local = this.parseIdentifier();
        node.specifiers.push(this.finishImportSpecifier(specifier, type));
    }

    protected maybeParseStarImportSpecifier(node: IImportDeclaration): boolean {
        if (this.match(tokenTypes.star)) {
            const specifier = this.startNode<IImportNamespaceSpecifier>();
            this.next();
            this.expectContextual(tokenTypes._as);
            this.parseImportSpecifierLocal(node, specifier, "ImportNamespaceSpecifier");
            return true;
        }
        return false;
    }

    protected parseNamedImportSpecifiers(node: IImportDeclaration) {
        let first = true;
        this.expect(tokenTypes.braceL);
        while (!this.eat(tokenTypes.braceR)) {
            if (first) {
                first = false;
            } else {
                // Detect an attempt to deep destructure
                if (this.eat(tokenTypes.colon))
                    throw this.raise(Errors.DestructureNamedImport, { at: this.state.startLocation });

                this.expect(tokenTypes.comma);
                if (this.eat(tokenTypes.braceR)) break;
            }

            const specifier = this.startNode<IImportSpecifier>();
            const importedIsString = this.match(tokenTypes.string);
            const isMaybeTypeOnly = this.isContextual(tokenTypes._type);
            specifier.key = this.parseModuleExportName();
            const importSpecifier = this.parseImportSpecifier(
                specifier,
                importedIsString,
                node.importKind === "type" || node.importKind === "typeof",
                isMaybeTypeOnly,
                undefined,
            );
            node.specifiers.push(importSpecifier);
        }
    }

    protected parseModuleExportName(): IStringLiteral | Identifier {
        if (this.match(tokenTypes.string)) {
            const result = this.parseStringLiteral(this.state.value as string);
            const surrogate = result.value.match(RegExPattern.loneSurrogate);
            if (surrogate)
                this.raise(Errors.ModuleExportNameHasLoneSurrogate, { at: result, surrogateCharCode: surrogate[0].charCodeAt(0) });
            return result;
        }
        return this.parseIdentifier(true);
    }

    protected parseImportSpecifier(
        specifier: IImportSpecifier, importedIsString: boolean,
        isInTypeOnlyImport: boolean, isMaybeTypeOnly: boolean, bindingType?: BindingTypes
    ) {
        if (this.eatContextual(tokenTypes._as)) {
            specifier.local = this.parseIdentifier();
        } else {
            const { key: imported } = specifier;
            if (importedIsString) {
                throw this.raise(Errors.ImportBindingIsString, { at: specifier, importName: (imported as IStringLiteral).value });
            }
            this.checkReservedWord((imported as Identifier).name, specifier.location.start, true, true);
            if (!specifier.local)
                specifier.local = ParserUtil.cloneIdentifier(imported as Identifier);
        }
        return this.finishImportSpecifier(specifier, "ImportSpecifier", bindingType);
    }

    protected parseMaybeImportPhase(node: IImportDeclaration | AnyExport, isExport: boolean) {
        if (!this.isPotentialImportPhase(isExport)) {
            this.applyImportPhase(node as IImportDeclaration, isExport);
            return undefined;
        }

        const phaseIdentifier = this.parseIdentifier(true);
        const { type } = this.state;
        const isImportPhase = Tokens.isKeywordOrIdentifier(type)
            ? // OK: import <phase> x from "foo";
            // OK: import <phase> from from "foo";
            // NO: import <phase> from "foo";
            // NO: import <phase> from 'foo';
            // With the module declarations proposals, we will need further disambiguation
            // for `import module from from;`.
            type !== tokenTypes._from || this.lookaheadCharCode() === CharCodes.lowercaseF
            : // OK: import <phase> { x } from "foo";
            // OK: import <phase> x from "foo";
            // OK: import <phase> * as T from "foo";
            // NO: import <phase> from "foo";
            // OK: import <phase> "foo";
            // The last one is invalid, we will continue parsing and throw
            // an error later
            type !== tokenTypes.comma;

        if (isImportPhase) {
            this.resetPreviousIdentifierLeadingComments(phaseIdentifier);
            this.applyImportPhase(node as IImportDeclaration, isExport, phaseIdentifier.name, phaseIdentifier.location.start);
            return undefined;
        } else {
            this.applyImportPhase(node as IImportDeclaration, isExport, undefined);
            // `<phase>` is a default binding, return it to the main import declaration parser
            return phaseIdentifier;
        }
    }

    protected applyImportPhase(node: IImportDeclaration | IExportNamedDeclaration, isExport: boolean, phase?: string, loc?: IPosition): void {
        if (isExport)
            return;
        if (phase === "module") {
            this.expectFeature("importReflection", loc);
            (node as IImportDeclaration).module = true;
        } else if (this.hasFeature("importReflection")) {
            (node as IImportDeclaration).module = false;
        }
    }

    protected parseExport(node: AnyExport, decorators?: IDecorator[]) {
        const namedDeclarationNode = node as IExportNamedDeclaration;
        const maybeDefaultIdentifier = this.parseMaybeImportPhase(node,/* isExport */ true);
        const hasDefault = this.maybeParseExportDefaultSpecifier(namedDeclarationNode, maybeDefaultIdentifier);
        const parseAfterDefault = !hasDefault || this.eat(tokenTypes.comma);
        const hasStar = parseAfterDefault && this.eatExportStar(node);
        const hasNamespace = hasStar && this.maybeParseExportNamespaceSpecifier(namedDeclarationNode);
        const parseAfterNamespace = parseAfterDefault && (!hasNamespace || this.eat(tokenTypes.comma));
        const isFromRequired = hasDefault || hasStar;

        if (hasStar && !hasNamespace) {
            if (hasDefault)
                this.unexpected();
            if (decorators)
                throw this.raise(Errors.UnsupportedDecoratorExport, { at: node });
            this.parseExportFrom(node, true);
            return this.finishNode(node, "ExportAllDeclaration");
        }

        const hasSpecifiers = this.maybeParseExportNamedSpecifiers(namedDeclarationNode);

        if (hasDefault && parseAfterDefault && !hasStar && !hasSpecifiers)
            this.unexpected(undefined, tokenTypes.braceL);

        if (hasNamespace && parseAfterNamespace)
            this.unexpected(undefined, tokenTypes._from);

        let hasDeclaration;
        if (isFromRequired || hasSpecifiers) {
            hasDeclaration = false;
            if (decorators)
                throw this.raise(Errors.UnsupportedDecoratorExport, { at: node });

            this.parseExportFrom(node, isFromRequired);
        } else {
            hasDeclaration = this.maybeParseExportDeclaration(namedDeclarationNode);
        }

        if (isFromRequired || hasSpecifiers || hasDeclaration) {
            this.checkExport(node, true, false, !!namedDeclarationNode.source);
            if (namedDeclarationNode.declaration?.type === "ClassDeclaration")
                this.maybeTakeDecorators(decorators, namedDeclarationNode.declaration, namedDeclarationNode);
            else if (decorators)
                throw this.raise(Errors.UnsupportedDecoratorExport, { at: node });

            return this.finishNode(node, "ExportNamedDeclaration");
        }

        if (this.eat(tokenTypes._default)) {
            // export default ...
            const decl = this.parseExportDefaultExpression();
            (node as IExportDefaultDeclaration).declaration = decl;

            if (decl.type === "ClassDeclaration")
                this.maybeTakeDecorators(decorators, decl, namedDeclarationNode);
            else if (decorators)
                throw this.raise(Errors.UnsupportedDecoratorExport, { at: node });

            this.checkExport(node, true, true);
            return this.finishNode(node, "ExportDefaultDeclaration");
        }

        this.unexpected(undefined, tokenTypes.braceL);
    }

    protected maybeParseExportDefaultSpecifier(node: IExportNamedDeclaration, maybeDefaultIdentifier?: Identifier) {
        if (maybeDefaultIdentifier || this.isExportDefaultSpecifier()) {
            // export defaultObj ...
            this.expectFeature("exportDefaultFrom", maybeDefaultIdentifier?.location.start);
            const id = maybeDefaultIdentifier || this.parseIdentifier(true);
            const specifier = this.startNodeAtNode<IExportDefaultSpecifier>(id);
            specifier.key = id;
            node.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")];
            return true;
        }
        return false;
    }

    protected maybeParseExportNamespaceSpecifier(node: IExportNamedDeclaration): boolean {
        if (this.isContextual(tokenTypes._as)) {
            if (!node.specifiers)
                node.specifiers = [];

            const specifier = this.startNodeAt<IExportNamespaceSpecifier>(this.state.lastTokenStartLocation!);
            this.next();

            specifier.key = this.parseModuleExportName();
            node.specifiers.push(this.finishNode(specifier, "ExportNamespaceSpecifier"));
            return true;
        }
        return false;
    }

    protected isExportDefaultSpecifier(): boolean {
        const { type } = this.state;
        if (Tokens.isIdentifier(type)) {
            if ((type === tokenTypes._async && !this.state.containsEsc) || type === tokenTypes._let)
                return false;
            if ((type === tokenTypes._type || type === tokenTypes._interface) && !this.state.containsEsc) {
                const { type: nextType } = this.lookahead();
                // If we see any variable name other than `from` after `type` keyword,
                // we consider it as flow/typescript type exports
                // note that this approach may fail on some pedantic cases
                // export type from = number
                if ((Tokens.isIdentifier(nextType) && nextType !== tokenTypes._from) || nextType === tokenTypes.braceL) {
                    return false;
                }
            }
        } else if (!this.match(tokenTypes._default)) {
            return false;
        }

        const next = this.nextTokenStart();
        const hasFrom = this.isUnparsedContextual(next, "from");
        if (this.input.charCodeAt(next) === CharCodes.comma || (Tokens.isIdentifier(this.state.type) && hasFrom))
            return true;
        // lookahead again when `export default from` is seen
        if (this.match(tokenTypes._default) && hasFrom) {
            const nextAfterFrom = this.input.charCodeAt(this.nextTokenStartSince(next + 4));
            return (nextAfterFrom === CharCodes.quotationMark || nextAfterFrom === CharCodes.apostrophe);
        }
        return false;
    }

    protected maybeParseExportNamedSpecifiers(node: IExportNamedDeclaration): boolean {
        if (this.match(tokenTypes.braceL)) {
            if (!node.specifiers)
                node.specifiers = [];
            const isTypeExport = node.exportKind === "type";
            node.specifiers.push(...this.parseExportSpecifiers(isTypeExport));

            node.source = undefined;
            node.declaration = undefined;
            if (this.hasFeature("importAssertions"))
                node.assertions = [];
            return true;
        }
        return false;
    }

    protected parseExportSpecifiers(isInTypeExport: boolean) {
        const nodes = [];
        let first = true;

        // export { x, y as z } [from '...']
        this.expect(tokenTypes.braceL);

        while (!this.eat(tokenTypes.braceR)) {
            if (first) {
                first = false;
            } else {
                this.expect(tokenTypes.comma);
                if (this.eat(tokenTypes.braceR))
                    break;
            }
            const isMaybeTypeOnly = this.isContextual(tokenTypes._type);
            const isString = this.match(tokenTypes.string);
            const node = this.startNode<IExportSpecifier>();
            node.local = this.parseModuleExportName();
            nodes.push(this.parseExportSpecifier(node, isString, isInTypeExport, isMaybeTypeOnly));
        }
        return nodes;
    }

    protected parseExportSpecifier(node: IExportSpecifier, isString: boolean, isInTypeExport: boolean, isMaybeTypeOnly: boolean) {
        if (this.eatContextual(tokenTypes._as))
            node.key = this.parseModuleExportName();
        else if (isString && node.local?.type === "StringLiteral")
            node.key = ParserUtil.cloneStringLiteral(node.local);
        else if (!node.key && node.local?.type === "Identifier")
            node.key = ParserUtil.cloneIdentifier(node.local);
        return this.finishNode(node, "ExportSpecifier");
    }

    protected checkExport(node: AnyExport, checkNames?: boolean, isDefault?: boolean, isFrom?: boolean): void {
        if (!checkNames)
            return;
        const declaration = (node as IExportDefaultDeclaration).declaration;
        const specifiers = (node as IExportNamedDeclaration).specifiers;
        // Check for duplicate exports
        if (isDefault) {
            // Default exports
            this.checkDuplicateExports(node, "default");
            if (this.hasFeature("exportDefaultFrom")) {
                if (declaration?.type === "Identifier" &&
                    declaration.name === "from" &&
                    declaration.location.end.index - declaration.location.start.index === 4 && // does not contain escape
                    !(declaration as IParenthesized).parenthesized)
                    this.raise(Errors.ExportDefaultFromAsIdentifier, { at: declaration });
            }
        } else if (specifiers?.length) {
            // Named exports
            for (const specifier of specifiers) {
                const { key: exported } = specifier;
                const exportName = exported.type === "Identifier" ? exported.name : exported.value;
                this.checkDuplicateExports(specifier, exportName);
                if (!isFrom && specifier.local) {
                    const { local } = specifier;
                    if (local.type !== "Identifier") {
                        this.raise(Errors.ExportBindingIsString, { at: specifier, localName: local.value, exportName });
                    } else {
                        // check for keywords used as local names
                        this.checkReservedWord(local.name, local.location.start, true, false);
                        // check if export is defined
                        this.scope.checkLocalExport(local);
                    }
                }
            }
        } else if (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration") { // Exported declarations
            const id = declaration.id;
            if (!id)
                throw new Error("Assertion failure");

            this.checkDuplicateExports(node, id.name);
        } else if (declaration?.type === "VariableDeclaration") {
            for (const sDeclaration of declaration.declarations)
                this.checkDeclaration(sDeclaration.id);
        }
    }

    protected checkDeclaration(node: Nullable<IPattern | IObjectProperty>): void {
        if (!node)
            return;
        if (node.type === "Identifier") {
            this.checkDuplicateExports(node, node.name);
        } else if (node.type === "ObjectPattern" && node.properties) {
            for (const prop of node.properties)
                this.checkDeclaration(prop);
        } else if (node.type === "ArrayPattern" && node.elements) {
            for (const elem of node.elements)
                this.checkDeclaration(elem as IPattern);
        } else if (node.type === "ObjectProperty") {
            this.checkDeclaration(node.value as IPattern);
        } else if (node.type === "RestElement") {
            this.checkDeclaration(node.argument);
        } else if (node.type === "AssignmentPattern") {
            this.checkDeclaration(node.left);
        }
    }

    protected checkDuplicateExports(node: NodeBase, exportName: string): void {
        if (this.exportedIdentifiers?.has(exportName)) {
            if (exportName === "default")
                this.raise(Errors.DuplicateDefaultExport, { at: node });
            else
                this.raise(Errors.DuplicateExport, { at: node, exportName });
        }
        this.exportedIdentifiers?.add(exportName);
    }

    protected maybeParseExportDeclaration(node: IExportNamedDeclaration): boolean {
        if (this.shouldParseExportDeclaration()) {
            node.specifiers = [];
            node.source = undefined;
            if (this.hasFeature("importAssertions"))
                node.assertions = [];
            node.declaration = this.parseExportDeclaration(node);
            return true;
        }
        return false;
    }

    protected parseExportDeclaration(node: IExportNamedDeclaration): Declaration | undefined {
        if (this.match(tokenTypes._class)) {
            const node = this.parseClass(this.startNode<IClassDeclaration>(), true, false);
            return node;
        }
        return this.parseStatementListItem() as Declaration;
    }

    protected maybeParseFunctionDeclaration(node: IFunctionDeclaration) {
        let flags = ParseFunctionFlag.Declaration | ParseFunctionFlag.NullableId;
        let isValid = false;
        if (this.match(tokenTypes._function)) {
            this.next();
            isValid = true;
        } else if (this.isAsyncFunction()) {
            this.next(); // eat 'async'
            this.next(); // eat 'function'
            isValid = true;
            flags |= ParseFunctionFlag.Async;
        }
        if (isValid)
            return this.parseFunction(node, flags);
        return;
    }
    protected parseExportDefaultExpression() {
        const expr = this.startNode();
        const funcDeclaration = this.maybeParseFunctionDeclaration(expr as IFunctionDeclaration);
        if (funcDeclaration)
            return funcDeclaration;

        if (this.match(tokenTypes._class))
            return this.parseClass(expr as IClassExpression, true, true);

        if (this.match(tokenTypes.at)) {
            if (this.options.decorators == 'proposal')
                this.raise(Errors.DecoratorBeforeExport, { at: this.state.startLocation });
            return this.parseClass(this.maybeTakeDecorators(this.parseDecorators(false), this.startNode<IClassDeclaration>()), true, true);
        }

        if (this.match(tokenTypes._const) || this.match(tokenTypes._var) || this.isLet())
            throw this.raise(Errors.UnsupportedDefaultExport, { at: this.state.startLocation });

        const res = this.parseMaybeAssignAllowIn();
        this.semicolon();
        return res;
    }

    protected parseExportFrom(node: AnyExport, expect?: boolean): void {
        if (this.eatContextual(tokenTypes._from)) {
            (node as IExportAllDeclaration).source = this.parseImportSource();
            this.checkExport(node);
            this.maybeParseImportAttributes(node as IExportNamedDeclaration);
            this.checkJSONModuleImport(node as IExportNamedDeclaration);
        } else if (expect) {
            this.unexpected();
        }
        this.semicolon();
    }

    //#endregion

    //#region parseAtom

    //@ts-expect-error lacks return
    protected parseExprAtom(refExpressionErrors?: ExpressionErrors): ExpressionNode {
        let decorators: IDecorator[] | undefined = undefined;
        let node;
        const { type } = this.state;
        switch (type) {
            case tokenTypes._super:
                return this.parseSuper();
            case tokenTypes._import:
                node = this.startNode<IMetaProperty | Import>();
                this.next();
                if (this.match(tokenTypes.dot))
                    return this.parseImportMetaProperty(node as IMetaProperty);
                if (!this.match(tokenTypes.parenL))
                    this.raise(Errors.UnsupportedImport, { at: this.state.lastTokenStartLocation });
                return this.finishNode(node, "Import");
            case tokenTypes._this:
                node = this.startNode<IThisExpression>();
                this.next();
                return this.finishNode(node, "ThisExpression");
            case tokenTypes._do:
                return this.parseDo(this.startNode(), false);
            case tokenTypes.slash:
            case tokenTypes.slashAssign:
                this.readRegexp();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return this.parseRegExpLiteral(this.state.value as any);
            case tokenTypes.num:
                return this.parseNumericLiteral(this.state.value as number);
            case tokenTypes.bigint:
                return this.parseBigIntLiteral(this.state.value as bigint);
            case tokenTypes.decimal:
                return this.parseDecimalLiteral(this.state.value as number);
            case tokenTypes.string:
                return this.parseStringLiteral(this.state.value as string);
            case tokenTypes._null:
                return this.parseNullLiteral();
            case tokenTypes._true:
                return this.parseBooleanLiteral(this.state.value as boolean);
            case tokenTypes._false:
                return this.parseBooleanLiteral(this.state.value as boolean);
            case tokenTypes.parenL:
                return this.parseParenAndDistinguishExpression(this.state.potentialArrowAt === this.state.start);
            case tokenTypes.bracketBarL:
            case tokenTypes.bracketHashL:
                return this.parseArrayLike(
                    this.state.type === tokenTypes.bracketBarL ? tokenTypes.bracketBarR : tokenTypes.bracketR, false, true);
            case tokenTypes.bracketL:
                return this.parseArrayLike(tokenTypes.bracketR, true, false, refExpressionErrors);
            case tokenTypes.braceBarL:
            case tokenTypes.braceHashL:
                return this.parseObjectLike(this.state.type === tokenTypes.braceBarL ? tokenTypes.braceBarR : tokenTypes.braceR, false, true);
            case tokenTypes.braceL:
                return this.parseObjectLike(tokenTypes.braceR, false, false, refExpressionErrors);
            case tokenTypes._function:
                return this.parseFunctionOrFunctionSent();
            case tokenTypes.at:
            case tokenTypes._class:
                if (type == tokenTypes.at)
                    decorators = this.parseDecorators();
                return this.parseClass(this.maybeTakeDecorators(decorators, this.startNode<IClass>()), false);
            case tokenTypes._new:
                return this.parseNewOrNewTarget();
            case tokenTypes.templateNonTail:
            case tokenTypes.templateTail:
                return this.parseTemplate(false);
            // BindExpression[Yield]
            case tokenTypes.doubleColon: {
                node = this.startNode<IBindExpression>();
                this.next();
                node.object = undefined;
                const callee = (node.callee = this.parseNoCallExpr());
                if (callee.type === "MemberExpression")
                    return this.finishNode(node, "BindExpression");
                else
                    throw this.raise(Errors.UnsupportedBind, { at: callee });
            }
            case tokenTypes.privateName:
                // Standalone private names are only allowed in "#x in obj"
                // expressions, and they are directly handled by callers of
                // parseExprOp. If we reach this, the input is always invalid.
                // We can throw a better error message and recover, rather than
                // just throwing "Unexpected token" (which is the default
                // behavior of this big switch statement).
                this.raise(Errors.PrivateInExpectedIn, { at: this.state.startLocation, identifierName: this.state.value });
                return this.parsePrivateName();
            case tokenTypes.moduloAssign:
            case tokenTypes.xorAssign:
            case tokenTypes.doubleCaret:
            case tokenTypes.doubleAt:
            case tokenTypes.bitwiseXOR:
            case tokenTypes.modulo:
            case tokenTypes.hash:
                this.unexpected();
                break;
            case tokenTypes.lt: {
                const lookaheadCh = this.input.codePointAt(this.nextTokenStart());
                // Element/Type Parameter <foo> // Fragment <>
                if (!(CharCodes.isIdentifierStart(lookaheadCh) || lookaheadCh === CharCodes.greaterThan))
                    this.unexpected();
                break;
            }
            default:
                if (Tokens.isIdentifier(type)) {
                    if (this.isContextual(tokenTypes._module) && this.lookaheadCharCode() === CharCodes.leftCurlyBrace)
                        return this.parseModuleExpression();
                    const canBeArrow = this.state.potentialArrowAt === this.state.start;
                    const containsEsc = this.state.containsEsc;
                    const id = this.parseIdentifier();
                    if (!containsEsc && id.name === "async" && !this.canInsertSemicolon()) {
                        const { type } = this.state;
                        if (type === tokenTypes._function) {
                            this.resetPreviousNodeTrailingComments(id);
                            this.next();
                            return this.parseAsyncFunctionExpression(this.startNodeAtNode(id));
                        } else if (Tokens.isIdentifier(type)) {
                            // If the next token begins with "=", commit to parsing an async
                            // arrow function. (Peeking ahead for "=" lets us avoid a more
                            // expensive full-token lookahead on this common path.)
                            if (this.lookaheadCharCode() === CharCodes.equalsTo) {
                                // although `id` is not used in async arrow unary function,
                                // we don't need to reset `async`'s trailing comments because
                                // it will be attached to the upcoming async arrow binding identifier
                                return this.parseAsyncArrowUnaryFunction(this.startNodeAtNode(id));
                            } else {
                                // Otherwise, treat "async" as an identifier and let calling code
                                // deal with the current tt.name token.
                                return id;
                            }
                        } else if (type === tokenTypes._do) {
                            this.resetPreviousNodeTrailingComments(id);
                            return this.parseDo(this.startNodeAtNode(id), true);
                        }
                    }

                    if (canBeArrow && this.match(tokenTypes.arrow) && !this.canInsertSemicolon()) {
                        this.next();
                        return this.parseArrowExpression(this.startNodeAtNode(id), [id], false);
                    }
                    return id;
                } else {
                    this.unexpected();
                }
        }
    }

    protected parseSuper() {
        const node = this.startNode<ISuper>();
        this.next(); // eat `super`
        if (this.match(tokenTypes.parenL) && !this.scope.allowDirectSuper && !this.options.allowSuperOutsideMethod)
            this.raise(Errors.SuperNotAllowed, { at: node });
        else if (!this.scope.allowSuper && !this.options.allowSuperOutsideMethod)
            this.raise(Errors.UnexpectedSuper, { at: node });
        if (!this.match(tokenTypes.parenL) && !this.match(tokenTypes.bracketL) && !this.match(tokenTypes.dot))
            this.raise(Errors.UnsupportedSuper, { at: node });

        return this.finishNode(node, "Super");
    }

    protected parseImportMetaProperty(node: IMetaProperty) {
        const id = this.createIdentifier(this.startNodeAtNode<Identifier>(node), "import");
        this.next(); // eat `.`

        if (this.isContextual(tokenTypes._meta)) {
            if (!this.inModule)
                this.raise(Errors.ImportMetaOutsideModule, { at: id });
            this.sawUnambiguousESM = true;
        }

        return this.parseMetaProperty(node, id, "meta");
    }

    protected parseMetaProperty(node: IMetaProperty, meta: Identifier, propertyName: string) {
        node.meta = meta;
        const containsEsc = this.state.containsEsc;
        node.property = this.parseIdentifier(true);

        if (node.property.name !== propertyName || containsEsc) {
            this.raise(Errors.UnsupportedMetaProperty, {
                at: node.property,
                target: meta.name,
                onlyValidPropertyName: propertyName,
            });
        }
        return this.finishNode(node, "MetaProperty");
    }

    protected parseDo(node: IDoExpression, isAsync: boolean) {
        this.expectFeature("doExpressions");
        if (isAsync)
            this.expectFeature("asyncDoExpressions");
        node.async = isAsync;
        this.next(); // eat `do`
        const oldLabels = this.state.labels;
        this.state.labels = [];
        if (isAsync) {
            // AsyncDoExpression :
            // async [no LineTerminator here] do Block[~Yield, +Await, ~Return]
            this.prodParam.enter(PARAM_AWAIT);
            node.body = this.parseBlock();
            this.prodParam.exit();
        } else {
            node.body = this.parseBlock();
        }
        this.state.labels = oldLabels;
        return this.finishNode(node, "DoExpression");
    }

    protected parseParenAndDistinguishExpression(canBeArrow: boolean) {
        const startLoc = this.state.startLocation;
        let val;
        this.next(); // eat `(`
        this.expressionScope.enter(ExpressionScopeHandler.newArrowHeadScope());

        const oldMaybeInArrowParameters = this.state.maybeInArrowParameters;
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.maybeInArrowParameters = true;
        this.state.inFSharpPipelineDirectBody = false;

        const innerStartLoc = this.state.startLocation;
        const exprList: ExpressionNode[] = [];
        const refExpressionErrors = new ExpressionErrors();
        let first = true;
        let spreadStartLoc;
        let optionalCommaStartLoc;

        while (!this.match(tokenTypes.parenR)) {
            if (first) {
                first = false;
            } else {
                this.expect(tokenTypes.comma, refExpressionErrors.optionalParametersLoc);
                if (this.match(tokenTypes.parenR)) {
                    optionalCommaStartLoc = this.state.startLocation;
                    break;
                }
            }

            if (this.match(tokenTypes.ellipsis)) {
                const spreadNodeStartLoc = this.state.startLocation;
                spreadStartLoc = this.state.startLocation;
                exprList.push(this.parseParenItem(this.parseRestBinding(), spreadNodeStartLoc));

                if (!this.checkCommaAfterRest(CharCodes.rightParenthesis))
                    break;
            } else {
                exprList.push(this.parseMaybeAssignAllowIn(refExpressionErrors, this.parseParenItem));
            }
        }

        const innerEndLoc = this.state.lastTokenEndLocation;
        this.expect(tokenTypes.parenR);

        this.state.maybeInArrowParameters = oldMaybeInArrowParameters;
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;

        let arrowNode;
        if (canBeArrow && this.shouldParseArrow(exprList) && (arrowNode = this.parseArrow(this.startNodeAt<IArrowFunctionExpression>(startLoc)))) {
            this.checkDestructuringPrivate(refExpressionErrors);
            this.expressionScope.validateAsPattern();
            this.expressionScope.exit();
            this.parseArrowExpression(arrowNode, exprList, false);
            return arrowNode;
        }
        this.expressionScope.exit();

        if (!exprList.length) {
            this.unexpected(this.state.lastTokenStartLocation);
        }
        if (optionalCommaStartLoc) this.unexpected(optionalCommaStartLoc);
        if (spreadStartLoc) this.unexpected(spreadStartLoc);
        this.checkExpressionErrors(refExpressionErrors, true);

        this.toReferencedListDeep(exprList, /* isParenthesizedExpr */ true);
        if (exprList.length > 1) {
            val = this.startNodeAt<ISequenceExpression>(innerStartLoc);
            val.children = exprList;
            // finish node at current location so it can pick up comments after `)`
            this.finishNode(val, "SequenceExpression");
            this.resetEndLocation(val, innerEndLoc);
        } else {
            val = exprList[0];
        }

        return this.wrapParenthesis(startLoc, val);
    }

    protected parseParenItem(node: ExpressionNode, startLoc: IPosition) {
        return node;
    }

    protected parseRestBinding(): IRestElement {
        const node = this.startNode<IRestElement>();
        this.next(); // eat `...`
        node.argument = this.parseBindingAtom();
        return this.finishNode(node, "RestElement");
    }

    protected parseBindingAtom() {
        switch (this.state.type) {
            case tokenTypes.bracketL: {
                const node = this.startNode<IArrayPattern>();
                this.next();
                node.elements = this.parseBindingList(tokenTypes.bracketR, CharCodes.rightSquareBracket, ParseBindingListFlags.ALLOW_EMPTY);
                return this.finishNode(node, "ArrayPattern");
            }
            case tokenTypes.braceL:
                return this.parseObjectLike(tokenTypes.braceR, true);
        }
        return this.parseIdentifier();
    }

    protected parseBindingList(close: number, closeCharCode: (typeof CharCodes)[keyof typeof CharCodes], flags: ParseBindingListFlags) {
        const allowEmpty = flags & ParseBindingListFlags.ALLOW_EMPTY;

        const elts: Array<Nullable<IPattern | TSParameterProperty>> = [];
        let first = true;
        while (!this.eat(close)) {
            if (first)
                first = false;
            else
                this.expect(tokenTypes.comma);

            if (allowEmpty && this.match(tokenTypes.comma)) {
                elts.push(undefined);
            } else if (this.eat(close)) {
                break;
            } else if (this.match(tokenTypes.ellipsis)) {
                elts.push(this.parseAssignableListItemTypes(this.parseRestBinding(), flags));
                if (!this.checkCommaAfterRest(closeCharCode)) {
                    this.expect(close);
                    break;
                }
            } else {
                const decorators = [];
                if (this.match(tokenTypes.at) && this.options.decorators === 'proposal')
                    this.raise(Errors.UnsupportedParameterDecorator, { at: this.state.startLocation });

                while (this.match(tokenTypes.at))
                    decorators.push(this.parseDecorator());
                elts.push(this.parseAssignableListItem(flags, decorators));
            }
        }
        return elts;
    }

    protected parseBindingRestProperty(prop: IRestElement): IRestElement {
        this.next(); // eat '...'
        // Don't use parseRestBinding() as we only allow Identifier here.
        prop.argument = this.parseIdentifier();
        this.checkCommaAfterRest(CharCodes.rightCurlyBrace);
        return this.finishNode(prop, "RestElement");
    }

    protected parseNewOrNewTarget() {
        const node = this.startNode<ICallOrNewExpression | IMetaProperty>();
        this.next();
        if (this.match(tokenTypes.dot)) {
            // https://tc39.es/ecma262/#prod-NewTarget
            const meta = this.createIdentifier(this.startNodeAtNode<Identifier>(node), "new");
            this.next();
            const metaProp = this.parseMetaProperty(node as IMetaProperty, meta, "target");

            if (!this.scope.inNonArrowFunction && !this.scope.inClass && !this.options.allowNewTargetOutsideFunction)
                this.raise(Errors.UnexpectedNewTarget, { at: metaProp });

            return metaProp;
        }

        return this.parseNew(node as ICallOrNewExpression);
    }

    protected parseNew(node: ICallOrNewExpression) {
        this.parseNewCallee(node);

        if (this.eat(tokenTypes.parenL)) {
            const args = this.parseExprList(tokenTypes.parenR);
            this.toReferencedList(args);
            // (parseExprList should be all non-null in this case)
            node.arguments = args as Array<ExpressionNode>;
        } else {
            node.arguments = [];
        }

        return this.finishNode(node, "NewExpression");
    }

    protected parseNewCallee(node: ICallOrNewExpression): void {
        node.callee = this.parseNoCallExpr();
        this.collectDependencies(node.callee);
        if (node.callee.type === "Import")
            this.raise(Errors.ImportCallNotNewExpression, { at: node.callee });
    }

    protected parseModuleExpression() {
        this.expectFeature("moduleBlocks");
        const node = this.startNode<IModuleExpression>();
        this.next(); // eat "module"
        if (!this.match(tokenTypes.braceL)) {
            this.unexpected(undefined, tokenTypes.braceL);
        }
        // start program node immediately after `{`
        const program = this.startNodeAt<IProgram>(this.state.endLocation);
        this.next(); // eat `{`

        const revertScopes = this.initializeScopesAndRevert(/** inModule */ true);
        this.enterInitialScopes();

        try {
            node.body = this.parseProgram(program, tokenTypes.braceR, "module");
        } finally {
            revertScopes();
        }
        return this.finishNode(node, "ModuleExpression");
    }

    //#endregion

    //#region parse object like

    protected parseObjectLike<T = IObjectPattern>(close: number, isPattern: true, isRecord?: boolean, refExpressionErrors?: ExpressionErrors): IObjectPattern;
    protected parseObjectLike<T = IObjectExpression>(close: number, isPattern: false, isRecord?: false, refExpressionErrors?: ExpressionErrors): IObjectExpression;
    protected parseObjectLike<T = IRecordExpression>(close: number, isPattern: false, isRecord?: true, refExpressionErrors?: ExpressionErrors): IRecordExpression;
    protected parseObjectLike<T extends IObjectLikeExpression>(close: number, isPattern: boolean, isRecord?: boolean, refExpressionErrors?: ExpressionErrors): T {
        if (isRecord)
            this.expectFeature("recordAndTuple");

        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = false;
        const propHash = Object.create(null);
        let first = true;
        const node = this.startNode<T>();
        node.properties = [];
        let type: IObjectLikeExpression["type"];
        if (isPattern)
            type = "ObjectPattern";
        else if (isRecord)
            type = "RecordExpression";
        else
            type = "ObjectExpression";
        this.next();

        while (!this.match(close)) {
            if (first) {
                first = false;
            } else {
                this.expect(tokenTypes.comma);
                if (this.match(close)) {
                    this.addTrailingCommaExtraToNode(node as IHasTrailingComma);
                    break;
                }
            }

            let prop: IObjectProperty | IObjectMethod | IRestElement | ISpreadElement;
            if (isPattern) {
                prop = this.parseBindingProperty();
            } else {
                prop = this.parsePropertyDefinition(refExpressionErrors);
                this.checkProto(prop, isRecord, propHash, refExpressionErrors);
            }

            if (isRecord && !this.isObjectProperty(prop) && prop.type !== "SpreadElement")
                this.raise(Errors.InvalidRecordProperty, { at: prop });
            //@ts-expect-error type of element
            node.properties.push(prop);
        }

        this.next();

        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;

        return this.finishNode(node, type);
    }

    protected parseArrayLike(close: number, canBePattern: boolean, isTuple: boolean, refExpressionErrors?: ExpressionErrors) {
        if (isTuple) {
            this.expectFeature("recordAndTuple");
        }
        const oldInFSharpPipelineDirectBody = this.state.inFSharpPipelineDirectBody;
        this.state.inFSharpPipelineDirectBody = false;
        const node = this.startNode<IArrayLikeExpression>();
        this.next();
        node.elements = this.parseExprList(close, !isTuple, refExpressionErrors, node);
        this.state.inFSharpPipelineDirectBody = oldInFSharpPipelineDirectBody;
        return this.finishNode(node, isTuple ? "TupleExpression" : "ArrayExpression");
    }

    protected finishCallExpression<T extends ICallOrNewExpression>(node: T, optional: boolean): T {
        if (node.callee.type === "Import") {
            if (node.arguments.length === 2) {
                if (!this.hasFeature("importAssertions"))
                    this.expectFeature("importAttributes");
            }
            if (node.arguments.length === 0 || node.arguments.length > 2) {
                this.raise(Errors.ImportCallArity, {
                    at: node,
                    maxArgumentCount: this.hasFeature("importAttributes") ||
                        this.hasFeature("importAssertions") || this.hasFeature("moduleAttributes") ? 2 : 1,
                });
            } else {
                for (const arg of node.arguments) {
                    if (arg?.type === "SpreadElement")
                        this.raise(Errors.ImportCallSpreadArgument, { at: arg });
                }
            }
        }
        this.collectDependencies(node.callee);
        return this.finishNode(node, optional ? "OptionalCallExpression" : "CallExpression");
    }

    protected parseBindingProperty() {
        const { type, startLocation } = this.state;
        let prop: IObjectMember;
        if (type === tokenTypes.ellipsis) {
            return this.parseBindingRestProperty(this.startNode<IRestElement>());
        } else {
            prop = this.startNode<IObjectMember>();
            if (type === tokenTypes.privateName) {
                this.expectFeature("destructuringPrivate", startLocation);
                this.classScope.usePrivateName(this.state.value as string, startLocation);
                (prop as IObjectMember).key = this.parsePrivateName();
            } else {
                this.parsePropertyName(prop);
            }
        }
        prop.method = false;
        return this.parseObjPropValue(
            prop as IObjectMember,
            startLocation,
            false /* isGenerator */,
            false /* isAsync */,
            true /* isPattern */,
            false /* isAccessor */,
        );
    }
    protected parsePropertyName(prop: IObjectMember | IClassMember | TsNamedTypeElementBase, refExpressionErrors?: ExpressionErrors) {
        if (this.eat(tokenTypes.bracketL)) {
            prop.computed = true;
            prop.key = this.parseMaybeAssignAllowIn();
            this.expect(tokenTypes.bracketR);
        } else {
            // We check if it's valid for it to be a private name when we push it.
            const { type, value } = this.state;
            let key;
            // most un-computed property names are identifiers
            if (Tokens.isKeywordOrIdentifier(type)) {
                key = this.parseIdentifier(true);
            } else {
                switch (type) {
                    case tokenTypes.num:
                        key = this.parseNumericLiteral(value as number);
                        break;
                    case tokenTypes.string:
                        key = this.parseStringLiteral(value as string);
                        break;
                    case tokenTypes.bigint:
                        key = this.parseBigIntLiteral(value as bigint);
                        break;
                    case tokenTypes.decimal:
                        key = this.parseDecimalLiteral(value as number);
                        break;
                    case tokenTypes.privateName: {
                        // the class private key has been handled in parseClassElementName
                        const privateKeyLoc = this.state.startLocation;
                        if (refExpressionErrors != null) {
                            if (refExpressionErrors.privateKeyLoc === null)
                                refExpressionErrors.privateKeyLoc = privateKeyLoc;
                        } else {
                            this.raise(Errors.UnexpectedPrivateField, { at: privateKeyLoc });
                        }
                        key = this.parsePrivateName();
                        break;
                    }
                    default:
                        this.unexpected();
                }
            }
            prop.key = key;
            if (type !== tokenTypes.privateName)
                // ClassPrivateProperty is never computed, so we don't assign in that case.
                prop.computed = false;
        }
        return prop.key;
    }

    protected parsePropertyDefinition(refExpressionErrors?: ExpressionErrors) {
        let decorators = [];
        if (this.match(tokenTypes.at)) {
            if (this.options.decorators === 'proposal')
                this.raise(Errors.UnsupportedPropertyDecorator, { at: this.state.startLocation });

            // we needn't check if decorators (stage 0) plugin is enabled since it's checked by
            // the call to this.parseDecorator
            while (this.match(tokenTypes.at))
                decorators.push(this.parseDecorator());
        }

        const prop = this.startNode<IObjectProperty>();
        let isAsync = false;
        let isAccessor = false;
        let startLoc;

        if (this.match(tokenTypes.ellipsis)) {
            if (decorators.length)
                this.unexpected();
            return this.parseSpread();
        }

        if (decorators.length) {
            prop.decorators = decorators;
            decorators = [];
        }
        prop.method = false;
        if (refExpressionErrors)
            startLoc = this.state.startLocation;

        let isGenerator = this.eat(tokenTypes.star);
        this.parsePropertyNamePrefixOperator(prop);
        const containsEsc = this.state.containsEsc;
        const key = this.parsePropertyName(prop, refExpressionErrors);

        if (!isGenerator && !containsEsc && this.maybeAsyncOrAccessorProp(prop)) {
            const keyName = (key as Identifier).name;
            // https://tc39.es/ecma262/#prod-AsyncMethod
            // https://tc39.es/ecma262/#prod-AsyncGeneratorMethod
            if (keyName === "async" && !this.hasPrecedingLineBreak()) {
                isAsync = true;
                this.resetPreviousNodeTrailingComments(key);
                isGenerator = this.eat(tokenTypes.star);
                this.parsePropertyName(prop);
            }
            // get PropertyName[?Yield, ?Await] () { FunctionBody[~Yield, ~Await] }
            // set PropertyName[?Yield, ?Await] ( PropertySetParameterList ) { FunctionBody[~Yield, ~Await] }
            if (keyName === "get" || keyName === "set") {
                isAccessor = true;
                this.resetPreviousNodeTrailingComments(key);
                prop.kind = keyName;
                if (this.match(tokenTypes.star)) {
                    isGenerator = true;
                    this.raise(Errors.AccessorIsGenerator, { at: this.state.currentPosition(), kind: keyName });
                    this.next();
                }
                this.parsePropertyName(prop);
            }
        }
        return this.parseObjPropValue(prop, startLoc, isGenerator, isAsync, false, isAccessor, refExpressionErrors);
    }

    protected parseObjPropValue(
        prop: IObjectProperty | IObjectMethod, startLoc: IPosition | undefined, isGenerator: boolean,
        isAsync: boolean, isPattern: boolean, isAccessor: boolean, refExpressionErrors?: ExpressionErrors) {

        const node =
            this.parseObjectMethod(prop as IObjectMethod, isGenerator, isAsync, isPattern, isAccessor) ||
            this.parseObjectProperty(prop as IObjectProperty, startLoc, isPattern, refExpressionErrors);

        if (!node)
            this.unexpected();
        return node;
    }

    protected parseObjectProperty(
        prop: IObjectProperty, startLoc: IPosition | undefined, isPattern: boolean, refExpressionErrors?: ExpressionErrors) {
        prop.shorthand = false;

        if (this.eat(tokenTypes.colon)) {
            prop.value = isPattern
                ? this.parseMaybeDefault(this.state.startLocation)
                : this.parseMaybeAssignAllowIn(refExpressionErrors);

            return this.finishNode(prop, "ObjectProperty");
        }

        if (!prop.computed && prop.key.type === "Identifier") {
            const _identifier = prop.key;
            // PropertyDefinition:
            //   IdentifierReference
            //   CoverInitializedName
            // Note: `{ eval } = {}` will be checked in `checkLVal` later.
            this.checkReservedWord(_identifier.name, _identifier.location.start, true, false);

            if (isPattern) {
                prop.value = this.parseMaybeDefault(startLoc, ParserUtil.cloneIdentifier(_identifier));
            } else if (this.match(tokenTypes.eq)) {
                const shorthandAssignLoc = this.state.startLocation;
                if (refExpressionErrors != null)
                    if (refExpressionErrors.shorthandAssignLoc === null)
                        refExpressionErrors.shorthandAssignLoc = shorthandAssignLoc;
                    else
                        this.raise(Errors.InvalidCoverInitializedName, { at: shorthandAssignLoc });

                prop.value = this.parseMaybeDefault(startLoc, ParserUtil.cloneIdentifier(_identifier));
            } else {
                prop.value = ParserUtil.cloneIdentifier(_identifier);
            }
            prop.shorthand = true;

            return this.finishNode(prop, "ObjectProperty");
        }
        return undefined;
    }


    //#endregion

    //#region Literal

    protected parseRegExpLiteral(value: { value: unknown; pattern: string; flags: IRegExpLiteral["flags"] }) {
        const node = this.parseLiteral<IRegExpLiteral>(value.value as string, "RegExpLiteral");
        node.pattern = value.pattern;
        node.flags = value.flags;
        return node;
    }

    protected parseStringLiteral(value: string) {
        return this.parseLiteral<IStringLiteral>(value, "StringLiteral");
    }

    protected parseNumericLiteral(value: number) {
        return this.parseLiteral<INumericLiteral>(value, "NumericLiteral");
    }

    protected parseBigIntLiteral(value: bigint) {
        return this.parseLiteral<IBigIntLiteral>(value, "BigIntLiteral");
    }

    protected parseDecimalLiteral(value: number) {
        return this.parseLiteral<IDecimalLiteral>(value, "DecimalLiteral");
    }

    protected parseNullLiteral() {
        return this.parseLiteral<INullLiteral>(null, "NullLiteral");
    }

    protected parseBooleanLiteral(value: boolean) {
        return this.parseLiteral<IBooleanLiteral>(value, "BooleanLiteral");
    }

    protected parseLiteral<T extends ILiteralExpression>(value: T["value"], type: T["type"]): T {
        const node = this.startNode<T>();
        return this.parseLiteralAtNode(value, type, node);
    }

    protected parseLiteralAtNode<T extends ILiteralExpression>(value: unknown, type: T["type"], node: T): T {
        if (value)
            node.rawValue = this.input.slice(node.location.start.index, this.state.end);
        node.value = value as T["type"];
        this.next();
        return this.finishNode<T>(node, type);
    }

    //#endregion

    //#region Identifier

    protected parseIdentifier(liberal?: boolean): Identifier {
        const node = this.startNode<Identifier>();
        const name = this.parseIdentifierName(liberal);
        return this.createIdentifier(node, name);
    }

    protected createIdentifier(node: Identifier, name: string): Identifier {
        node.name = name;
        return this.finishNode(node, "Identifier");
    }

    protected parseIdentifierName(liberal?: boolean): string {
        let name: string;
        const { startLocation, type } = this.state;
        if (Tokens.isKeywordOrIdentifier(type))
            name = this.state.value as string;
        else
            this.unexpected();

        const tokenIsKeyword = Tokens.keywordOrIdentifierIsKeyword(type);

        if (liberal) {
            // If the current token is not used as a keyword, set its type to "tt.name".
            // This will prevent this.next() from throwing about unexpected escapes.
            if (tokenIsKeyword)
                this.replaceToken(tokenTypes.name);
        } else {
            this.checkReservedWord(name, startLocation, tokenIsKeyword, false);
        }
        this.next();
        return name;
    }

    //#endregion

    //#region helepr

    protected verifyBreakContinue(node: IBreakStatement | IContinueStatement, isBreak: boolean) {
        let i;
        for (i = 0; i < this.state.labels.length; ++i) {
            const lab = this.state.labels[i];
            if ((node.label == null || lab.name === node.label.name) &&
                (lab.kind != null && (isBreak || lab.kind === "loop")) || (node.label && isBreak))
                break;
        }
        if (i === this.state.labels.length)
            this.raise(Errors.IllegalBreakContinue, { at: node, type: isBreak ? "BreakStatement" : "ContinueStatement" });
    }

    protected checkProto(prop: IObjectMember | ISpreadElement, isRecord: Nullable<boolean>,
        protoRef: { used: boolean; }, refExpressionErrors?: ExpressionErrors): void {
        if (prop.type === "SpreadElement" || prop.type === "ObjectMethod" || prop.computed || prop.shorthand)
            return;

        const key = prop.key;
        const name = key.type === "Identifier" ? key.name : (key as IStringLiteral).value;

        if (name === "__proto__") {
            if (isRecord) {
                this.raise(Errors.RecordNoProto, { at: key });
                return;
            }
            if (protoRef.used) {
                if (refExpressionErrors) {
                    // Store the first redefinition's position, otherwise ignore because
                    // we are parsing ambiguous pattern
                    if (refExpressionErrors.doubleProtoLoc === null)
                        refExpressionErrors.doubleProtoLoc = key.location.start;
                } else {
                    this.raise(Errors.DuplicateProto, { at: key });
                }
            }
            protoRef.used = true;
        }
    }

    protected checkLVal(expression: Nullable<ExpressionNode>,
        {
            in: ancestor,
            binding = BIND_NONE,
            checkClashes = false,
            strictModeChanged = false,
            hasParenthesizedAncestor = false,
        }: {
            in: LValAncestor;
            binding?: BindingTypes;
            checkClashes?: Set<string> | false;
            strictModeChanged?: boolean;
            hasParenthesizedAncestor?: boolean;
        },
    ): void {
        if (!expression)
            return;
        const type = expression.type;

        // If we find here an ObjectMethod, it's because this was originally
        // an ObjectExpression which has then been converted.
        // toAssignable already reported this error with a nicer message.
        if (this.isObjectMethod(expression))
            return;

        if (type === "MemberExpression") {
            if (binding !== BIND_NONE)
                this.raise(Errors.InvalidPropertyBindingPattern, { at: expression });
            return;
        }

        if (type === "Identifier") {
            this.checkIdentifier(expression as Identifier, binding, strictModeChanged);
            const { name } = expression as Identifier;

            if (checkClashes && name) {
                if (checkClashes.has(name))
                    this.raise(Errors.ParamDupe, { at: expression });
                else
                    checkClashes.add(name);
            }
            return;
        }

        const validity = this.isValidLVal(
            type,
            !(hasParenthesizedAncestor || (expression as IParenthesized).parenthesized) &&
            ancestor.type === "AssignmentExpression",
            binding);

        if (validity === true)
            return;
        if (validity === false) {
            const ParseErrorClass = binding === BIND_NONE ? Errors.InvalidLhs : Errors.InvalidLhsBinding;
            this.raise(ParseErrorClass, { at: expression, ancestor });
            return;
        }

        const [key, isParenthesizedExpression] = Array.isArray(validity) ? validity : [validity, type === "ParenthesizedExpression"];
        const nextAncestor = type === "ArrayPattern" || type === "ObjectPattern" || type === "ParenthesizedExpression"
            ? ({ type } as const)
            : ancestor;

        // @ts-expect-error key may not index expression.
        for (const child of [].concat(expression[key])) {
            if (child) {
                this.checkLVal(child, {
                    in: nextAncestor,
                    binding,
                    checkClashes,
                    strictModeChanged,
                    hasParenthesizedAncestor: isParenthesizedExpression as boolean,
                });
            }
        }
    }

    protected isValidLVal(type: string,
        isUnparenthesizedInAssign: boolean, binding: BindingTypes): string | boolean | (string | boolean)[] {
        return this.getOwn(
            {
                AssignmentPattern: "left",
                RestElement: "argument",
                ObjectProperty: "value",
                ParenthesizedExpression: "expression",
                ArrayPattern: "elements",
                ObjectPattern: "properties",
            },
            type as AllowedLValTypes,
        );
    }

    protected getOwn<T extends {}>(object: T, key: keyof T) {
        return Object.hasOwnProperty.call(object, key) && object[key];
    }

    protected disallowInAnd<T>(callback: () => T): T {
        return this.allowInCore(callback, flags => [PARAM_IN & flags, flags & ~PARAM_IN]);
    }

    protected allowInAnd<T>(callback: () => T): T {
        return this.allowInCore(callback, flags => [PARAM_IN & ~flags, flags | PARAM_IN]);
    }

    protected addTrailingCommaExtraToNode(node: IHasTrailingComma): void {
        node.trailingComma = this.state.lastTokenStart;
        node.trailingCommaLocation = this.state.lastTokenStartLocation;
    }

    protected atPossibleAsyncArrow(base: ExpressionNode): boolean {
        return (
            base.type === "Identifier" && base.name === "async" &&
            this.state.lastTokenEndLocation?.index === base.location.end.index &&
            !this.canInsertSemicolon() &&
            // check there are no escape sequences, such as \u{61}sync
            base.location.end.index - base.location.start.index === 5 &&
            base.location.start.index === this.state.potentialArrowAt
        );
    }

    protected getPrivateNameSV(node: ExpressionNode): string | undefined {
        return node.type === 'PrivateName' ? node.id.name : undefined;
    }

    protected toReferencedList(exprList?: ReadonlyArray<Nullable<ExpressionNode>>, isParenthesizedExpr?: boolean) {
        return exprList;
    }

    protected checkParams(node: AnyTsFunction, allowDuplicates: boolean,
        isArrowFunction?: boolean | null, strictModeChanged: boolean = true): void {
        const checkClashes = !allowDuplicates && new Set<string>();
        const formalParameters = { type: "FormalParameters" } as const;
        for (const param of node.params)
            this.checkLVal(param, { in: formalParameters, binding: BIND_VAR, checkClashes, strictModeChanged });
    }

    protected toReferencedArguments(node: ICallOrNewExpression, isParenthesizedExpr?: boolean) {
        this.toReferencedListDeep(node.arguments, isParenthesizedExpr);
    }

    protected toReferencedListDeep(exprList?: ReadonlyArray<Nullable<ExpressionNode>>, isParenthesizedExpr?: boolean): void {
        this.toReferencedList(exprList, isParenthesizedExpr);
        if (exprList)
            for (const expr of exprList) {
                if (expr?.type === "ArrayExpression")
                    this.toReferencedListDeep(expr.elements);
            }
    }

    protected wrapParenthesis<T extends ExpressionNode>(startLoc: IPosition, expression: T): T | IParenthesizedExpression {
        if (!this.options.createParenthesizedExpressions) {
            const expr = expression as IParenthesized;
            expr.parenthesized = true;
            expr.parentStart = startLoc.index;
            this.takeSurroundingComments(expression, startLoc.index, this.state.lastTokenEndLocation?.index ?? -1);
            return expression;
        }

        const parenExpression = this.startNodeAt<IParenthesizedExpression>(startLoc);
        parenExpression.expression = expression;
        return this.finishNode(parenExpression, "ParenthesizedExpression");
    }

    protected checkLetStatement(allowDeclaration: boolean) {
        if (this.state.containsEsc)
            return true;
        // `let [` is an explicit negative lookahead for
        // ExpressionStatement, so special-case it first.
        const next = this.nextTokenStart();
        const nextCh = this.codePointAtPos(next);
        if (nextCh !== CharCodes.leftSquareBracket) {
            if (!allowDeclaration && this.hasFollowingLineBreak())
                return true;
            if (!this.chStartsBindingIdentifier(nextCh, next) && nextCh !== CharCodes.leftCurlyBrace)
                return true;
        }
        return false;
    }

    protected parsePropertyNamePrefixOperator(prop: ExpressionNode): void { }

    protected parsePostMemberNameModifiers(methodOrProp: IClassMethod | IClassProperty): void { }

    private unwrapParenthesizedExpression(node?: ExpressionNode): Nullable<ExpressionNode> {
        return node?.type === "ParenthesizedExpression" ?
            this.unwrapParenthesizedExpression(node.expression) : node;
    };


    private allowInCore<T>(callback: () => T, processflags: (flag: number) => [action: number, enter: number]): T {
        const flags = this.prodParam.currentFlags();
        const [action, enter] = processflags(flags);
        const prodParamToSet = action;
        if (prodParamToSet) {
            this.prodParam.enter(enter);
            try {
                return callback();
            } finally {
                this.prodParam.exit();
            }
        }
        return callback();
    }

    //#endregion
}