/* eslint-disable @typescript-eslint/no-unused-vars */
import { Errors, ExpressionErrors, ParserError } from "../errors/errors";
import { errorHandlers } from "../errors/ts-parser.error.handler";
import { Position } from "../helper/position";
import { State } from "../helper/state";
import { StringParser } from "../helper/string-parser";
import { ParserUtil } from "../helper/util";
import { ClassScopeHandler } from "../scopes/handler-class-scope";
import { ExpressionScopeHandler } from "../scopes/handler-expresson-scope";
import { PARAM, PARAM_AWAIT, ProductionParameterHandler } from "../scopes/handler-production-parameter";
import { Scope, ScopeHandlerBase, ScopeType } from "../scopes/handler-scope";
import { BIND_FLAGS_NO_LET_IN_LEXICAL, BIND_NONE, BindingTypes, SCOPE_PROGRAM } from "../scopes/scopeflags";
import { CharCodes } from "../tokens/charcodes";
import { ReservedWordsHelper } from "../tokens/reserved.words";
import { Tokens, tokenTypes } from "../tokens/tokens";
import {
    ErrorDetails, IOptions, IPosition, ISourceLocation, ITokenContext, ParserFeature, ProgramSourceType,
    RaiseProperties, TryParse
} from "../types/basic";
import { RegExPattern, TopLevelNodes, VALID_REGEX_FLAGS, ValidRegexFlags } from "../types/constants";
import { Nullable } from "../types/internal.types";
import { AnyNode, ExpressionNode, ICommentWhitespace, IProgram, Identifier, } from "../types/nodes";
import { ICommentNode, IHasArgument, IHasChildren, NodeBase } from "../types/nodes.common";

export abstract class ParserBase<SH extends ScopeHandlerBase<S>, S extends Scope = ScopeType<SH>> {
    //#region properties & constructor

    readonly options: IOptions;
    inModule: boolean;
    state!: State;
    length!: number;
    isLookahead: boolean = false;
    protected input!: string;

    protected sawUnambiguousESM: boolean = false;
    protected ambiguousScriptDifferentAst: boolean = false;
    protected exportedIdentifiers?: Set<string>;
    protected classScope!: ClassScopeHandler;
    protected prodParam!: ProductionParameterHandler;
    protected expressionScope!: ExpressionScopeHandler;
    protected scope!: SH;

    constructor(options?: IOptions) {

        this.options = ParserUtil.verifyOptions(options);
        this.inModule = this.options.sourceType == 'module';
    }

    //#endregion

    //#region parse

    parse(input?: string): IProgram {
        this.input = this.removeLeadingEmptyPlaces(input);
        this.length = this.input.length;
        this.state = new State();
        this.isLookahead = false;
        this.state.strict = this.options.strictMode ?? this.inModule;
        if (this.options.parseAsAmbientContext)
            this.state.isAmbientContext = true;
        this.initializeScopes();
        this.enterInitialScopes();
        const program = this.startNode<IProgram>();
        this.nextToken();
        this.parseProgram(program);
        return program;
    }

    protected abstract parseProgram(program: IProgram, end?: number, sourceType?: ProgramSourceType): void;

    //#endregion

    //#region error

    raise<T>(errorDetails: ErrorDetails, raiseProperties: RaiseProperties<T>): ParserError<T> | never {
        const { at, ...details } = raiseProperties;
        const location = at == undefined ? {} as IPosition : 'location' in at ? at.location.start : at;
        const error = this.buildError(errorDetails, location, details as T);
        if (!this.options.continueOnerror)
            throw error;
        else if (!this.isLookahead)
            this.state.errors.push(error);
        return error;
    }

    protected buildError<T>(errorDetails: ErrorDetails, location: IPosition, details: T): ParserError<T> {
        const { code, message } = errorDetails;
        const msg = typeof message == 'string' ? message : message(details);
        return new ParserError<T>(msg, location, code, details);
    }

    protected raiseOverwrite<T>(errorDetails: ErrorDetails, raiseProperties: RaiseProperties<T>): ParserError<T> | never {
        const { at, ...details } = raiseProperties;
        const location = at == undefined ? {} as IPosition : 'location' in at ? at.location.start : at;
        const pos = location.index;
        const errors = this.state.errors;

        for (let i = errors.length - 1; i >= 0; i--) {
            const error = errors[i];
            if (error.location?.index === pos)
                return (errors[i] = this.buildError(errorDetails, location, details as T));
            if ((error.location?.index || -1) < pos)
                break;
        }

        return this.raise(errorDetails, raiseProperties);
    }

    protected unexpected(loc?: IPosition, type?: number): never {
        throw this.raise(Errors.UnexpectedToken, {
            expected: type ? Tokens.label(type) : null, at: loc != null ? loc : this.state.startLocation
        });
    }

    //TODO: review signature
    protected tryParse<T extends NodeBase | ReadonlyArray<NodeBase>>(fn: (abort: (node?: T) => never) => T, oldState?: State):
        | TryParse<T, undefined, false, false, undefined>
        | TryParse<T | undefined, ParserError<unknown>, boolean, false, State>
        | TryParse<T | undefined, undefined, false, true, State> {
        const abortSignal: { node: T | undefined; } = { node: undefined };
        oldState ??= this.state.clone();
        try {
            const node = fn((node = undefined) => {
                abortSignal.node = node;
                throw abortSignal;
            });
            if (this.state.errors.length > oldState.errors.length) {
                const failState = this.state;
                this.state = oldState;
                // tokensLength should be preserved during error recovery mode
                // since the parser does not halt and will instead parse the
                // remaining tokens
                this.state.tokensLength = failState.tokensLength;
                return {
                    node,
                    error: failState.errors[oldState.errors.length],
                    thrown: false,
                    aborted: false,
                    failState,
                };
            }

            return { node, error: undefined, thrown: false, aborted: false, failState: undefined };
        } catch (error) {
            const failState = this.state;
            this.state = oldState;
            if (error instanceof SyntaxError)
                return { node: undefined, error, thrown: true, aborted: false, failState };

            if (error === abortSignal)
                return { node: abortSignal.node, error: undefined, thrown: false, aborted: true, failState };

            throw error;
        }
    }

    protected checkExpressionErrors(refExpressionErrors: Nullable<ExpressionErrors>, andThrow: boolean): boolean | never {

        if (!refExpressionErrors)
            return false;

        const { shorthandAssignLoc, doubleProtoLoc, privateKeyLoc, optionalParametersLoc } = refExpressionErrors;
        const hasErrors = !!shorthandAssignLoc || !!doubleProtoLoc || !!optionalParametersLoc || !!privateKeyLoc;

        if (!andThrow)
            return hasErrors;

        if (shorthandAssignLoc)
            this.raise(Errors.InvalidCoverInitializedName, { at: shorthandAssignLoc });

        if (doubleProtoLoc)
            this.raise(Errors.DuplicateProto, { at: doubleProtoLoc });

        if (privateKeyLoc)
            this.raise(Errors.UnexpectedPrivateField, { at: privateKeyLoc });

        if (optionalParametersLoc)
            this.unexpected(optionalParametersLoc);

        return hasErrors;
    }

    protected assertModuleNodeAllowed(node: NodeBase): void {
        if (!this.options.allowImportExportEverywhere && !this.inModule)
            this.raise(Errors.ImportOutsideModule, { at: node });
    }

    protected setOptionalParametersError(refExpressionErrors: ExpressionErrors, resultError?: ParserError<unknown>) {
        refExpressionErrors.optionalParametersLoc = resultError?.location ?? this.state.startLocation;
    }

    //#endregion

    //#region input character

    protected charCode(next: number = 0) {
        return this.input.charCodeAt(this.state.position + next);
    }

    protected charCodeAt(position: number) {
        return this.input.charCodeAt(position);
    }

    protected codePointAtPos(pos: number): number {
        let cp = this.charCodeAt(pos);
        if ((cp & 0xfc00) === 0xd800 && ++pos < this.input.length) {
            const trail = this.charCodeAt(pos);
            if ((trail & 0xfc00) === 0xdc00)
                cp = 0x10000 + ((cp & 0x3ff) << 10) + (trail & 0x3ff);
        }
        return cp;
    }

    //#endregion

    //#region start & finish node

    protected createNode<T extends NodeBase>(start: number, location: IPosition): T {
        const { line, column } = location;
        return { type: '', location: { start: { line, column, index: start } } } as T;
    }

    protected startNode<T extends NodeBase>(): T {
        return this.createNode(this.state.start, this.state.startLocation);
    }

    protected startNodeAt<T extends NodeBase>(localtion: IPosition): T {
        return this.createNode(localtion.index, localtion);
    }

    protected startNodeAtNode<T extends NodeBase>(base: NodeBase): T {
        return this.startNodeAt(base.location.start);
    }

    protected finishNode<T extends AnyNode>(node: T, type: T["type"]): T {
        return this.finishNodeAt(node, type, this.state.lastTokenEndLocation);
    }

    protected finishNodeAt<T extends AnyNode>(node: T, type: T["type"], endLocation?: IPosition): T {
        node.type = type;
        node.location.end = this.ensureLocation(endLocation);
        this.processComment(node);
        if (!TopLevelNodes.has(type))
            node.content = this.input.slice(node.location.start.index, node.location.end.index);
        return node;
    }

    protected startsAwaitUsing(): boolean {
        let next = this.nextTokenInLineStart();
        if (this.isUnparsedContextual(next, "using")) {
            next = this.nextTokenInLineStartSince(next + 5);
            const nextCh = this.codePointAtPos(next);
            if (this.chStartsBindingIdentifier(nextCh, next)) {
                this.expectFeature("explicitResourceManagement");
                return true;
            }
        }
        return false;
    }

    protected startsUsingForOf(): boolean {
        const { type, containsEsc } = this.lookahead();
        if (type === tokenTypes._of && !containsEsc) {
            // `using of` must start a for-lhs-of statement
            return false;
        } else if (Tokens.isIdentifier(type) && !this.hasFollowingLineBreak()) {
            this.expectFeature("explicitResourceManagement");
            return true;
        }
        return false;
    }

    //#endregion

    //#region node location

    protected resetStartLocation(node: NodeBase, startLocation: IPosition): void {
        node.location.start = startLocation;
    }

    protected resetEndLocation(node: NodeBase, endLocation?: IPosition): void {
        node.location.end = this.ensureLocation(endLocation ?? this.state.lastTokenEndLocation);
    }

    protected resetStartLocationFromNode(node: NodeBase, locationNode: NodeBase): void {
        this.resetStartLocation(node, locationNode.location.start);
    }

    protected ensureLocation(location: Nullable<IPosition>): IPosition {
        return location ?? { index: -1 };
    }

    //#endregion

    //#region comments

    protected addComment(comment: ICommentNode): void {
        this.state.comments.push(comment);
    }

    protected processComment(node: AnyNode): void {
        const { commentStack } = this.state;
        let { length: i } = commentStack;
        if (i === 0)
            return;

        const lastCommentWS = commentStack[--i];

        if (this.matchIndex(lastCommentWS.start, node, 'end')) {
            lastCommentWS.leadingNode = node;
            i--;
        }

        const nodeStart = node.location.start.index;
        for (; i >= 0; i--) {
            const commentWS = commentStack[i];
            const commentEnd = commentWS.end;
            if (commentEnd > nodeStart) {
                commentWS.containingNode = node;
                this.finalizeComment(commentWS);
                commentStack.splice(i, 1);
            } else {
                if (commentEnd === nodeStart)
                    commentWS.trailingNode = node;
                break;
            }
        }
    }

    protected finalizeComment(commentWS: ICommentWhitespace) {
        const { comments } = commentWS;
        if (commentWS.leadingNode != null || commentWS.trailingNode != null) {
            if (commentWS.leadingNode != null)
                this.setNodeComments(commentWS.leadingNode, comments, 'trailing');
            if (commentWS.trailingNode != null)
                this.setNodeComments(commentWS.trailingNode, comments, 'leading');
        } else {
            const { containingNode: node, start: commentStart } = commentWS;
            if (this.charCodeAt(commentStart - 1) === CharCodes.comma) {
                const elements = (node as IHasChildren<NodeBase>).children;
                let lastElement = null;
                let i = elements.length;
                while (lastElement == null && i > 0)
                    lastElement = elements[--i];

                if (!lastElement || lastElement.location.start.index > commentWS.start)
                    this.setNodeComments(node, commentWS.comments, 'inner');
                else
                    this.setNodeComments(lastElement, commentWS.comments, 'trailing');
            }
            else
                this.setNodeComments(node, comments, 'inner');
        }
    }

    protected finalizeRemainingComments() {
        const { commentStack } = this.state;
        for (let i = commentStack.length - 1; i >= 0; i--)
            this.finalizeComment(commentStack[i]);
        this.state.commentStack = [];
    }

    protected resetPreviousNodeTrailingComments(node: NodeBase) {
        const { commentStack } = this.state;
        const commentWS = commentStack?.slice(-1)[0];
        if (!!commentWS && commentWS.leadingNode === node)
            commentWS.leadingNode = undefined;
    }

    protected resetPreviousIdentifierLeadingComments(node: NodeBase) {
        const { commentStack } = this.state;
        const { length } = commentStack;
        if (length === 0)
            return;
        if (commentStack[length - 1].trailingNode === node)
            commentStack[length - 1].trailingNode = undefined;
        else if (length >= 2 && commentStack[length - 2].trailingNode === node)
            commentStack[length - 2].trailingNode = undefined;
    }

    protected takeSurroundingComments(node: AnyNode, start: number, end: number) {
        const { commentStack } = this.state;
        const { length } = commentStack;
        if (length === 0)
            return;
        let i = length - 1;

        for (; i >= 0; i--) {
            const commentWS = commentStack[i];
            const commentEnd = commentWS.end;
            const commentStart = commentWS.start;

            if (commentStart === end)
                commentWS.leadingNode = node;
            else if (commentEnd === start)
                commentWS.trailingNode = node;
            else if (commentEnd < start)
                break;
        }
    }

    protected setNodeComments(node: NodeBase | undefined, comments: Array<ICommentNode>, commentType: 'trailing' | 'leading' | 'inner') {
        if (node === undefined)
            return;
        const key = commentType + 'Comments' as 'trailingComments' | 'leadingComments' | 'innerComments';
        if (node[key] !== undefined)
            node[key]?.unshift(...comments);
        else
            node[key] = comments;
    }

    //#endregion

    //#region Dependencies

    protected collectDependencies(node: ExpressionNode): void {
        node = (node?.type === 'MemberExpression') ? node.object : node;
        if (node?.type === 'Identifier' && !ReservedWordsHelper.isReservedDependency(node.name))
            this.state.dependencies.push(node.name);
    }

    //#endregion

    //#region check features

    protected expectFeature(featureName: ParserFeature, loc?: IPosition): void | never {
        if (!this.hasFeature(featureName))
            throw this.raise(Errors.MissingFeature, { at: loc != undefined ? loc : this.state.startLocation, missingFeature: [featureName] });
    }

    protected hasFeature(featureName: ParserFeature): boolean {
        const { features } = this.options;
        if (features) {
            const { [featureName]: key } = features;
            return key === true;
        }
        return false;
    }

    //#endregion

    //#region position

    protected matchIndex<T extends NodeBase>(pos: Nullable<number>, location: T | ISourceLocation, key: 'start' | 'end') {
        return pos === this.getPosition(location, key);
    }

    protected getPosition<T extends NodeBase>(location: T | ISourceLocation, key: 'start' | 'end') {
        const _location = ('location' in location) ? location.location : location;
        return _location[key].index;
    }
    //#endregion

    //#region clean input

    protected removeLeadingEmptyPlaces(input?: string): string {
        if (!input)
            return '';
        let currentPos = 0;
        loop: while (currentPos < input.length) {
            const ch = input.charCodeAt(currentPos);
            switch (ch) {
                case CharCodes.space:
                case CharCodes.nonBreakingSpace:
                case CharCodes.tab:
                    ++currentPos;
                    break;
                // @ts-expect-error fall through
                case CharCodes.carriageReturn:
                    if (input.charCodeAt(currentPos + 1) === CharCodes.lineFeed)
                        ++currentPos;
                // fall through
                case CharCodes.lineFeed:
                case CharCodes.lineSeparator:
                case CharCodes.paragraphSeparator:
                    ++currentPos;
                    break;
                default:
                    break loop;
            }
        }
        return input.slice(currentPos);
    }

    //#endregion

    //#region scope

    protected abstract createScope(inModule: boolean): SH;

    protected initializeScopes(inModule: boolean = this.inModule): void {
        this.state.labels = [];
        this.exportedIdentifiers = new Set();
        this.inModule = inModule;
        this.scope = this.createScope(inModule);
        this.prodParam = new ProductionParameterHandler();
        this.classScope = new ClassScopeHandler(this);
        this.expressionScope = new ExpressionScopeHandler(this);
    }

    protected initializeScopesAndRevert(inModule: boolean = this.inModule): () => void {
        const oldValues = {
            labels: this.state.labels,
            exportedIdentifiers: this.exportedIdentifiers,
            inModule: this.inModule,
            scope: this.scope,
            prodParam: this.prodParam,
            classScope: this.classScope,
            expressionScope: this.expressionScope
        };

        this.initializeScopes(inModule);

        return () => {
            // Revert state
            this.state.labels = oldValues.labels;
            this.exportedIdentifiers = oldValues.exportedIdentifiers;
            // Revert scopes
            this.inModule = oldValues.inModule;
            this.scope = oldValues.scope;
            this.prodParam = oldValues.prodParam;
            this.classScope = oldValues.classScope;
            this.expressionScope = oldValues.expressionScope;
        };
    }

    protected enterInitialScopes() {
        let paramFlags = PARAM;
        if (this.inModule)
            paramFlags |= PARAM_AWAIT;
        this.scope.enter(SCOPE_PROGRAM);
        this.prodParam.enter(paramFlags);
    }

    protected lookahead(): State {
        const old = this.state;
        this.state = this.createLookaheadState(old);

        this.isLookahead = true;
        this.nextToken();
        this.isLookahead = false;

        const curr = this.state;
        this.state = old;
        return curr;
    }

    protected createLookaheadState(state: State): State {
        return {
            position: state.position,
            value: null,
            type: state.type,
            start: state.start,
            strict: state.strict,
            end: state.end,
            inType: state.inType,
            startLocation: state.startLocation,
            lastTokenEndLocation: state.lastTokenEndLocation,
            currentLine: state.currentLine,
            lineStart: state.lineStart,
            currentPosition: state.currentPosition,
        } as State;
    }

    //#endregion

    //#region traverse

    protected next(): void {
        this.checkKeywordEscapes();
        this.state.lastTokenStart = this.state.start;
        this.state.lastTokenEndLocation = this.state.endLocation;
        this.state.lastTokenStartLocation = this.state.startLocation;
        this.nextToken();
    }

    protected nextToken(): void {
        this.skipSpace();
        this.state.start = this.state.position;
        if (!this.isLookahead)
            this.state.startLocation = this.state.currentPosition();
        if (this.state.position >= this.length)
            return this.finishToken(tokenTypes.eof);

        this.readTokenFromCode(this.codePointAtPos(this.state.position));
    }

    protected nextTokenStart(): number {
        return this.nextTokenStartSince(this.state.position);
    }

    protected nextTokenStartSince(pos: number): number {
        RegExPattern.skipWhiteSpace.lastIndex = pos;
        return RegExPattern.skipWhiteSpace.test(this.input) ? RegExPattern.skipWhiteSpace.lastIndex : pos;
    }

    protected nextTokenInLineStartSince(pos: number): number {
        RegExPattern.skipWhiteSpaceInLine.lastIndex = pos;
        return RegExPattern.skipWhiteSpaceInLine.test(this.input) ? RegExPattern.skipWhiteSpaceInLine.lastIndex : pos;
    }

    protected nextTokenInLineStart(): number {
        return this.nextTokenInLineStartSince(this.state.position);
    }

    protected lookaheadCharCode(): number {
        return this.charCodeAt(this.nextTokenStart());
    }

    protected declareNameFromIdentifier(identifier: Identifier, binding: BindingTypes) {
        this.scope.declareName(identifier.name, binding, identifier.location.start);
    }

    protected eat(type: number): boolean {
        if (this.match(type)) {
            this.next();
            return true;
        } else {
            return false;
        }
    }

    protected eatContextual(token: number): boolean {
        if (this.isContextual(token)) {
            this.next();
            return true;
        }
        return false;
    }

    protected eatExportStar(node: NodeBase): boolean {
        return this.eat(tokenTypes.star);
    }

    protected finishToken(type: number, val?: unknown): void {
        this.state.end = this.state.position;
        this.state.endLocation = this.state.currentPosition();
        this.state.type = type;
        this.state.value = val;
    }

    protected finishOp(type: number, size: number): void {
        const str = this.input.slice(this.state.position, this.state.position + size);
        this.state.position += size;
        this.finishToken(type, str);
    }

    protected replaceToken(type: number): void {
        this.state.type = type;
        this.updateContext();
    }

    protected replaceType<T extends AnyNode>(node: NodeBase, type: T["type"]): T {
        node.type = type;
        return node as T;
    }

    protected deleteKey<T extends AnyNode>(node: T, key: keyof T) {
        delete node[key];
    }

    protected whileNotFirst(condition: () => boolean, notFirst: () => true | void, all: () => true | void) {
        let first = true;
        while (condition()) {
            if (first)
                first = false;
            else
                if (notFirst())
                    break;
            if (all())
                break;
        }
    }

    //#endregion

    //#region skip

    protected skipSpace(): void {
        const spaceStart = this.state.position;
        const comments = [];
        loop: while (this.state.position < this.length) {
            const ch = this.charCode();
            switch (ch) {
                case CharCodes.space:
                case CharCodes.nonBreakingSpace:
                case CharCodes.tab:
                    ++this.state.position;
                    break;
                // @ts-expect-error fall through
                case CharCodes.carriageReturn:
                    if (this.charCode(1) === CharCodes.lineFeed)
                        ++this.state.position;
                // fall through
                case CharCodes.lineFeed:
                case CharCodes.lineSeparator:
                case CharCodes.paragraphSeparator:
                    ++this.state.position;
                    ++this.state.currentLine;
                    this.state.lineStart = this.state.position;
                    break;

                case CharCodes.slash:
                    switch (this.charCode(1)) {
                        case CharCodes.asterisk: {
                            const comment = this.skipBlockComment("*/");
                            if (comment !== undefined) {
                                this.addComment(comment);
                                comments.push(comment);
                            }
                            break;
                        }

                        case CharCodes.slash: {
                            const comment = this.skipLineComment(2);
                            if (comment !== undefined) {
                                this.addComment(comment);
                                comments.push(comment);
                            }
                            break;
                        }

                        default:
                            break loop;
                    }
                    break;

                default:
                    if (CharCodes.isWhitespace(ch)) {
                        ++this.state.position;
                    } else if (ch === CharCodes.dash && !this.inModule && this.options.annexB) {
                        if (this.charCode(1) === CharCodes.dash &&
                            this.charCode(2) === CharCodes.greaterThan &&
                            (spaceStart === 0 || this.state.lineStart > spaceStart)
                        ) {
                            // A `-->` line comment
                            const comment = this.skipLineComment(3);
                            if (comment !== undefined) {
                                this.addComment(comment);
                                comments.push(comment);
                            }
                        } else {
                            break loop;
                        }
                    } else if (ch === CharCodes.lessThan && !this.inModule && this.options.annexB) {
                        if (
                            this.charCode(1) === CharCodes.exclamationMark &&
                            this.charCode(2) === CharCodes.dash &&
                            this.charCode(3) === CharCodes.dash
                        ) {
                            // `<!--`, an XML-style comment that should be interpreted as a line comment
                            const comment = this.skipLineComment(4);
                            if (comment !== undefined) {
                                this.addComment(comment);
                                comments.push(comment);
                            }
                        } else {
                            break loop;
                        }
                    } else {
                        break loop;
                    }
            }
        }

        if (comments.length > 0)
            this.state.commentStack.push({ start: spaceStart, end: this.state.position, comments });
    }

    protected skipBlockComment(commentEnd: "*/" | "*-/"): ICommentNode | undefined {
        const startLoc = this.state.currentPosition();
        const start = this.state.position;
        const end = this.input.indexOf(commentEnd, start + 2);
        if (end === -1)
            throw this.raise(Errors.UnterminatedComment, { at: startLoc });

        this.state.position = end + commentEnd.length;
        RegExPattern.lineBreakG.lastIndex = start + 2;
        while (RegExPattern.lineBreakG.test(this.input) && RegExPattern.lineBreakG.lastIndex <= end) {
            ++this.state.currentLine;
            this.state.lineStart = RegExPattern.lineBreakG.lastIndex;
        }

        if (this.isLookahead)
            return;

        return {
            type: "CommentBlock",
            value: this.input.slice(start + 2, end),
            location: { start: startLoc, end: this.state.currentPosition() }
        };
    }

    protected skipLineComment(startSkip: number): ICommentNode | undefined {
        const start = this.state.position;
        const startLoc = this.state.currentPosition();
        let ch = this.charCodeAt((this.state.position += startSkip));
        if (this.state.position < this.length) {
            while (!CharCodes.isNewLine(ch) && ++this.state.position < this.length)
                ch = this.charCode();
        }

        if (this.isLookahead)
            return;

        const end = this.state.position;
        const value = this.input.slice(start + startSkip, end);

        return {
            type: "CommentLine",
            value,
            location: { start: startLoc, end: this.state.currentPosition() }
        };
    }

    //#endregion

    //#region checking

    protected match(type: number): boolean {
        return this.state.type === type;
    }

    protected matchOne(...types: number[]): boolean {
        return types.some(t => this.match(t));
    }

    protected expect(type: number, loc?: IPosition): void {
        this.eat(type) || this.unexpected(loc, type);
    }

    protected expectContextual(token: number, errorDetails?: ErrorDetails): void {
        if (!this.eatContextual(token)) {
            if (errorDetails)
                throw this.raise(errorDetails, { at: this.state.startLocation });
            this.unexpected(undefined, token);
        }
    }

    protected isContextual(token: number): boolean {
        return this.state.type === token && !this.state.containsEsc;
    }

    protected isUnparsedContextual(nameStart: number, name: string): boolean {
        const nameEnd = nameStart + name.length;
        if (this.input.slice(nameStart, nameEnd) === name) {
            const nextCh = this.input.charCodeAt(nameEnd);
            return !(CharCodes.isIdentifierChar(nextCh) || (nextCh & 0xfc00) === 0xd800);
        }
        return false;
    }

    protected isLookaheadContextual(name: string): boolean {
        const next = this.nextTokenStart();
        return this.isUnparsedContextual(next, name);
    }

    protected isClassMethod(): boolean {
        return this.match(tokenTypes.parenL);
    }

    protected isClassProperty(): boolean {
        return this.match(tokenTypes.eq) || this.match(tokenTypes.semi) || this.match(tokenTypes.braceR);
    }

    protected isObjectProperty(node: NodeBase): boolean {
        return node.type === "ObjectProperty";
    }

    protected hasPropertyAsPrivateName(node: Nullable<AnyNode>): boolean {
        return ((node?.type === "MemberExpression" || node?.type === "OptionalMemberExpression") && this.isPrivateName(node?.property));
    }

    protected isLiteralPropertyName(): boolean {
        return Tokens.isLiteralPropertyName(this.state.type);
    }

    protected isPrivateName(node?: NodeBase): boolean {
        return node?.type === "PrivateName";
    }

    protected isObjectMethod(node: NodeBase): boolean {
        return node.type === "ObjectMethod";
    }

    protected isSimpleParameter(node?: NodeBase | null) {
        return node?.type === "Identifier";
    }

    protected isSimpleParamList(params: ReadonlyArray<Nullable<NodeBase>>): boolean {
        return !params.some(p => this.isSimpleParameter(p));
    }

    protected isAwaitAllowed(): boolean {
        return this.prodParam.hasAwait || (!!this.options.allowAwaitOutsideFunction && !this.scope.inFunction);
    }

    protected isAmbiguousAwait(): boolean {
        if (this.hasPrecedingLineBreak())
            return true;
        const { type } = this.state;
        return (
            // All the following expressions are ambiguous:
            //   await + 0, await - 0, await ( 0 ), await [ 0 ], await / 0 /u, await ``, await of []
            type === tokenTypes.plusMin ||
            type === tokenTypes.parenL ||
            type === tokenTypes.bracketL ||
            Tokens.isTemplate(type) ||
            (type === tokenTypes._of && !this.state.containsEsc) ||
            // Sometimes the tokenizer generates tt.slash for regexps, and this is
            // handler by parseExprAtom
            type === tokenTypes.regexp ||
            type === tokenTypes.slash
        );
    }

    protected isPotentialImportPhase(isExport: boolean): boolean {
        return !isExport && this.isContextual(tokenTypes._module);
    }

    protected semicolon(allowAsi: boolean = true): void {
        if (allowAsi ? this.isLineTerminator() : this.eat(tokenTypes.semi))
            return;
        this.raise(Errors.MissingSemicolon, { at: this.state.lastTokenEndLocation });
    }

    protected checkCommaAfterRest(close: (typeof CharCodes)[keyof typeof CharCodes]): boolean {
        if (!this.match(tokenTypes.comma))
            return false;
        this.raise(this.lookaheadCharCode() === close ? Errors.RestTrailingComma : Errors.ElementAfterRest, { at: this.state.startLocation });
        return true;
    }

    protected checkIdentifier(at: Identifier, bindingType: BindingTypes, strictModeChanged: boolean = false) {
        if (this.state.strict && (strictModeChanged
            ? ReservedWordsHelper.isStrictBindReservedWord(at.name, this.inModule)
            : ReservedWordsHelper.isStrictBindOnlyReservedWord(at.name))
        ) {
            if (bindingType === BIND_NONE)
                this.raise(Errors.StrictEvalArguments, { at, referenceName: at.name });
            else
                this.raise(Errors.StrictEvalArgumentsBinding, { at, bindingName: at.name });
        }

        if (bindingType & BIND_FLAGS_NO_LET_IN_LEXICAL && at.name === "let")
            this.raise(Errors.LetInLexicalBinding, { at });

        if (!(bindingType & BIND_NONE))
            this.declareNameFromIdentifier(at, bindingType);
    }

    protected checkDestructuringPrivate(refExpressionErrors?: ExpressionErrors): void {
        if (refExpressionErrors?.privateKeyLoc)
            this.expectFeature("destructuringPrivate", refExpressionErrors.privateKeyLoc);
    }

    protected checkKeywordEscapes(): void {
        const { type } = this.state;
        if (Tokens.isKeyword(type) && this.state.containsEsc)
            this.raise(Errors.InvalidEscapedReservedWord, { at: this.state.startLocation, reservedWord: Tokens.label(type) });
    }

    protected checkReservedWord(word: string, startLoc: IPosition, checkKeywords: boolean, isBinding: boolean): void {
        // Every JavaScript reserved word is 10 characters or less.
        if (word.length > 10)
            return;
        // Most identifiers are not reservedWord-like, they don't need special
        // treatments afterward, which very likely ends up throwing errors
        if (!ReservedWordsHelper.isKeyword(word)) {
            return;
        }

        if (checkKeywords && ReservedWordsHelper.isKeyword(word)) {
            this.raise(Errors.UnexpectedKeyword, { at: startLoc, keyword: word });
            return;
        }

        const reservedTest = !this.state.strict
            ? ReservedWordsHelper.isReservedWord
            : isBinding ? ReservedWordsHelper.isStrictBindReservedWord : ReservedWordsHelper.isStrictReservedWord;

        if (reservedTest(word, this.inModule)) {
            this.raise(Errors.UnexpectedReservedWord, { at: startLoc, reservedWord: word });
            return;
        } else if (word === "yield") {
            if (this.prodParam.hasYield) {
                this.raise(Errors.YieldBindingIdentifier, { at: startLoc });
                return;
            }
        } else if (word === "await") {
            if (this.prodParam.hasAwait) {
                this.raise(Errors.AwaitBindingIdentifier, { at: startLoc });
                return;
            }

            if (this.scope.inStaticBlock) {
                this.raise(Errors.AwaitBindingIdentifierInStaticBlock, { at: startLoc });
                return;
            }

            this.expressionScope.recordAsyncArrowParametersError({ at: startLoc });
        } else if (word === "arguments") {
            if (this.scope.inClassAndNotInNonArrowFunction) {
                this.raise(Errors.ArgumentsInClass, { at: startLoc });
                return;
            }
        }
    }

    protected checkExponentialAfterUnary(node: IHasArgument<NodeBase>) {
        if (this.match(tokenTypes.exponent))
            this.raise(Errors.UnexpectedTokenUnaryExponentiation, { at: node.argument });
    }

    protected checkToRestConversion(node: Nullable<ExpressionNode>, allowPattern: boolean): void {
        switch (node?.type) {
            case "ParenthesizedExpression":
                return this.checkToRestConversion(node.expression, allowPattern);
            case "Identifier":
            case "MemberExpression":
                return;
            case "ArrayExpression":
            case "ObjectExpression":
                if (allowPattern)
                    return;
        }
        this.raise(Errors.InvalidRestAssignmentPattern, { at: node });
    }

    protected shouldParseExportDeclaration(): boolean {
        const { type } = this.state;
        if (type === tokenTypes.at) {
            if (this.options.decorators)
                return true;
        }

        return (
            type === tokenTypes._var ||
            type === tokenTypes._const ||
            type === tokenTypes._function ||
            type === tokenTypes._class ||
            this.isLet() ||
            this.isAsyncFunction()
        );
    }

    protected isLet(): boolean {
        if (!this.isContextual(tokenTypes._let))
            return false;
        return this.hasFollowingBindingAtom();
    }

    protected isAsyncFunction(): boolean {
        if (!this.isContextual(tokenTypes._async))
            return false;
        const next = this.nextTokenInLineStart();
        return this.isUnparsedContextual(next, "function");
    }

    protected chStartsBindingIdentifier(ch: number, pos: number) {
        if (CharCodes.isIdentifierStart(ch)) {
            RegExPattern.keywordRelationalOperator.lastIndex = pos;
            if (RegExPattern.keywordRelationalOperator.test(this.input)) {
                // We have seen `in` or `instanceof` so far, now check if the identifier
                // ends here
                const endCh = this.codePointAtPos(RegExPattern.keywordRelationalOperator.lastIndex);
                if (!CharCodes.isIdentifierChar(endCh) && endCh !== CharCodes.backslash)
                    return false;
            }
            return true;
        } else if (ch === CharCodes.backslash)
            return true;
        else
            return false;
    }

    protected chStartsBindingPattern(ch: number) {
        return (ch === CharCodes.leftSquareBracket || ch === CharCodes.leftCurlyBrace);
    }

    protected canHaveLeadingDecorator(): boolean {
        return this.match(tokenTypes._class);
    }

    protected shouldExitDescending(expr: AnyNode, potentialArrowAt: number): boolean {
        return (expr.type === "ArrowFunctionExpression" && this.matchIndex(potentialArrowAt, expr, 'start'));
    }

    protected shouldParseAsyncArrow(): boolean {
        return this.match(tokenTypes.arrow) && !this.canInsertSemicolon();
    }

    protected shouldParseArrow(_params: Array<ExpressionNode>): boolean {
        return !this.canInsertSemicolon();
    }

    protected hasInLineFollowingBindingIdentifier(): boolean {
        const next = this.nextTokenInLineStart();
        const nextCh = this.codePointAtPos(next);
        return this.chStartsBindingIdentifier(nextCh, next);
    }

    protected isThisParam(param: Nullable<ExpressionNode | Identifier>): boolean {
        return param?.type === "Identifier" && param.name === "this";
    }

    //#endregion

    //#region line end

    protected isLineTerminator(): boolean {
        return this.eat(tokenTypes.semi) || this.canInsertSemicolon();
    }

    protected canInsertSemicolon(): boolean {
        return (this.match(tokenTypes.eof) || this.match(tokenTypes.braceR) || this.hasPrecedingLineBreak());
    }

    protected hasPrecedingLineBreak(): boolean {
        return RegExPattern.lineBreak.test(this.input.slice(this.state.lastTokenEndLocation?.index, this.state.start));
    }

    protected hasFollowingBindingAtom(): boolean {
        const next = this.nextTokenStart();
        const nextCh = this.codePointAtPos(next);
        return (this.chStartsBindingPattern(nextCh) || this.chStartsBindingIdentifier(nextCh, next));
    }

    protected hasFollowingLineBreak(): boolean {
        RegExPattern.skipWhiteSpaceToLineBreak.lastIndex = this.state.end;
        return RegExPattern.skipWhiteSpaceToLineBreak.test(this.input);
    }

    //#endregion

    //#region context

    protected updateContext(_prevType?: number): void { }

    protected currentContext(): ITokenContext {
        return this.state.context[this.state.context.length - 1];
    }

    protected setStrict(strict: boolean): void {
        this.state.strict = strict;
        if (strict) {
            // Throw an error for any string decimal escape found before/immediately
            // after a "use strict" directive. Strict mode will be set at parse
            // time for any literals that occur after the next node of the strict
            // directive.
            this.state.strictErrors.forEach(([toParseError, at]) => this.raise(toParseError, { at }));
            this.state.strictErrors.clear();
        }
    }

    //#endregion

    //#region read


    protected readTokenFromCode(code: number): void {
        switch (code) {
            // The interpretation of a dot depends on whether it is followed
            // by a digit or another two dots.
            case CharCodes.dot:
                return this.readToken_dot();
            // Punctuation tokens.
            case CharCodes.leftParenthesis:
                ++this.state.position;
                return this.finishToken(tokenTypes.parenL);
            case CharCodes.rightParenthesis:
                ++this.state.position;
                return this.finishToken(tokenTypes.parenR);
            case CharCodes.semicolon:
                ++this.state.position;
                return this.finishToken(tokenTypes.semi);
            case CharCodes.comma:
                ++this.state.position;
                return this.finishToken(tokenTypes.comma);
            case CharCodes.leftSquareBracket:
                ++this.state.position;
                return this.finishToken(tokenTypes.bracketL);
            case CharCodes.rightSquareBracket:
                ++this.state.position;
                return this.finishToken(tokenTypes.bracketR);
            case CharCodes.leftCurlyBrace:
                ++this.state.position;
                return this.finishToken(tokenTypes.braceL);
            case CharCodes.rightCurlyBrace:
                ++this.state.position;
                return this.finishToken(tokenTypes.braceR);
            case CharCodes.colon:
                ++this.state.position;
                return this.finishToken(tokenTypes.colon);
            case CharCodes.questionMark:
                return this.readToken_question();
            case CharCodes.graveAccent:
                return this.readTemplateToken();
            // @ts-expect-error fall through
            case CharCodes.digit0: {
                const next = this.charCode(1);
                if (next === CharCodes.lowercaseX || next === CharCodes.uppercaseX)   // '0x', '0X' - hex number
                    return this.readRadixNumber(16);
                if (next === CharCodes.lowercaseO || next === CharCodes.uppercaseO)  // '0o', '0O' - octal number
                    return this.readRadixNumber(8);
                if (next === CharCodes.lowercaseB || next === CharCodes.uppercaseB)  // '0b', '0B' - binary number
                    return this.readRadixNumber(2);
            }
            // Anything else beginning with a digit is an integer, octal
            // number, or float. (fall through)
            case CharCodes.digit1:
            case CharCodes.digit2:
            case CharCodes.digit3:
            case CharCodes.digit4:
            case CharCodes.digit5:
            case CharCodes.digit6:
            case CharCodes.digit7:
            case CharCodes.digit8:
            case CharCodes.digit9:
                return this.readNumber(false);
            // Quotes produce strings.
            case CharCodes.quotationMark:
            case CharCodes.apostrophe:
                return this.readString(code);
            // Operators are parsed inline in tiny state machines. '=' (charCodes.equalsTo) is
            // often referred to. `finishOp` simply skips the amount of
            // characters it is given as second argument, and returns a token
            // of the type given by its first argument.
            case CharCodes.slash:
                return this.readToken_slash();
            case CharCodes.percentSign:
            case CharCodes.asterisk:
                return this.readToken_mult_modulo(code);
            case CharCodes.verticalBar:
            case CharCodes.ampersand:
                return this.readToken_pipe_amp(code);
            case CharCodes.caret:
                return this.readToken_caret();
            case CharCodes.plusSign:
            case CharCodes.dash:
                return this.readToken_plus_min(code);
            case CharCodes.lessThan:
                return this.readToken_lt();
            case CharCodes.greaterThan:
                return this.readToken_gt();
            case CharCodes.equalsTo:
            case CharCodes.exclamationMark:
                return this.readToken_eq_excl(code);
            case CharCodes.tilde:
                return this.finishOp(tokenTypes.tilde, 1);
            case CharCodes.atSign:
                return this.readToken_atSign();
            case CharCodes.numberSign:
                return this.readToken_numberSign();
            case CharCodes.backslash:
                return this.readWord();
            default:
                if (CharCodes.isIdentifierStart(code))
                    return this.readWord(code);
        }

        throw this.raise(Errors.InvalidOrUnexpectedToken,
            { at: this.state.currentPosition(), unexpected: String.fromCodePoint(code) });
    }

    protected readToken_dot(): void {
        const next = this.charCode(1);
        if (next >= CharCodes.digit0 && next <= CharCodes.digit9)
            return this.readNumber(true);

        if (next === CharCodes.dot && this.charCode(2) === CharCodes.dot) {
            this.state.position += 3;
            this.finishToken(tokenTypes.ellipsis);
        } else {
            ++this.state.position;
            this.finishToken(tokenTypes.dot);
        }
    }

    protected readNumber(startsWithDot: boolean): void {
        const start = this.state.position;
        const startLoc = this.state.currentPosition();
        let isFloat = false;
        let isBigInt = false;
        let isDecimal = false;
        let hasExponent = false;
        let isOctal = false;

        if (!startsWithDot && this.readInt(10) == null)
            this.raise(Errors.InvalidNumber, { at: this.state.currentPosition() });

        const hasLeadingZero = this.state.position - start >= 2 && this.charCodeAt(start) === CharCodes.digit0;

        if (hasLeadingZero) {
            const integer = this.input.slice(start, this.state.position);
            errorHandlers.recordStrictModeErrors(this, Errors.StrictOctalLiteral, { at: startLoc });
            if (!this.state.strict) {
                // disallow numeric separators in non octal decimals and legacy octal likes
                const underscorePos = integer.indexOf("_");
                if (underscorePos > 0) // Numeric literals can't have newlines, so this is safe to do.
                    this.raise(Errors.ZeroDigitNumericSeparator, { at: Position.fromColumnOffset(startLoc, underscorePos) });
            }
            isOctal = hasLeadingZero && !/[89]/.test(integer);
        }

        let next = this.charCode();
        if (next === CharCodes.dot && !isOctal) {
            ++this.state.position;
            this.readInt(10);
            isFloat = true;
            next = this.charCode();
        }

        if ((next === CharCodes.uppercaseE || next === CharCodes.lowercaseE) && !isOctal) {
            ++this.state.position;
            next = this.charCode();
            if (next === CharCodes.plusSign || next === CharCodes.dash)
                ++this.state.position;
            if (this.readInt(10) == null)
                this.raise(Errors.InvalidOrMissingExponent, { at: startLoc });
            isFloat = true;
            hasExponent = true;
            next = this.charCode();
        }

        if (next === CharCodes.lowercaseN) {
            // disallow floats, legacy octal syntax and non octal decimals
            // new style octal ("0o") is handled in this.readRadixNumber
            if (isFloat || hasLeadingZero)
                this.raise(Errors.InvalidBigIntLiteral, { at: startLoc });

            ++this.state.position;
            isBigInt = true;
        }

        if (next === CharCodes.lowercaseM) {
            this.expectFeature("decimal", this.state.currentPosition());
            if (hasExponent || hasLeadingZero)
                this.raise(Errors.InvalidDecimal, { at: startLoc });

            ++this.state.position;
            isDecimal = true;
        }

        if (CharCodes.isIdentifierStart(this.codePointAtPos(this.state.position)))
            throw this.raise(Errors.NumberIdentifier, { at: this.state.currentPosition() });

        // remove "_" for numeric literal separator, and trailing `m` or `n`
        const str = this.input.slice(start, this.state.position).replace(/[_mn]/g, "");

        if (isBigInt)
            return this.finishToken(tokenTypes.bigint, str);
        if (isDecimal)
            return this.finishToken(tokenTypes.decimal, str);

        const val = isOctal ? parseInt(str, 8) : parseFloat(str);
        this.finishToken(tokenTypes.num, val);
    }

    protected readInt(radix: number, len?: number, forceLen: boolean = false, allowNumSeparator: boolean | "bail" = true): Nullable<number> {
        const { n, pos } = StringParser.readInt(
            this.input,
            this.state.position,
            this.state.lineStart,
            this.state.currentLine,
            radix,
            len,
            forceLen,
            allowNumSeparator,
            errorHandlers.readInt(this), false
        );
        this.state.position = pos;
        return n;
    }

    protected readRadixNumber(radix: number): void {
        const startLoc = this.state.currentPosition();
        let isBigInt = false;
        this.state.position += 2; // 0x
        const val = this.readInt(radix);
        if (val == null) // Numeric literals can't have newlines, so this is safe to do.
            this.raise(Errors.InvalidDigit, { at: Position.fromColumnOffset(startLoc, 2), radix });

        const next = this.charCode();
        if (next === CharCodes.lowercaseN) {
            ++this.state.position;
            isBigInt = true;
        } else if (next === CharCodes.lowercaseM) {
            throw this.raise(Errors.InvalidDecimal, { at: startLoc });
        }

        if (CharCodes.isIdentifierStart(this.codePointAtPos(this.state.position)))
            throw this.raise(Errors.NumberIdentifier, { at: this.state.currentPosition() });

        if (isBigInt) {
            const str = this.input.slice(startLoc.index, this.state.position).replace(/[_n]/g, "");
            this.finishToken(tokenTypes.bigint, str);
            return;
        }

        this.finishToken(tokenTypes.num, val);
    }

    protected readString(quote: number): void {
        const { str, pos, curLine, lineStart } = StringParser.readStringContents(
            quote === CharCodes.quotationMark ? "double" : "single",
            this.input,
            this.state.position + 1, // skip the quote
            this.state.lineStart,
            this.state.currentLine,
            errorHandlers.readStringContent(this),
        );
        this.state.position = pos + 1; // skip the quote
        this.state.lineStart = lineStart;
        this.state.currentLine = curLine;
        this.finishToken(tokenTypes.string, str);
    }

    protected readRegexp(): void {
        const startLoc = this.state.startLocation;
        const start = this.state.start + 1;
        let escaped, inClass;
        let pos = this.state.position;
        for (; ; ++pos) {
            if (pos >= this.length)
                throw this.raise(Errors.UnterminatedRegExp, { at: Position.fromColumnOffset(startLoc, 1) });

            const ch = this.charCodeAt(pos);
            if (CharCodes.isNewLine(ch))
                throw this.raise(Errors.UnterminatedRegExp, { at: Position.fromColumnOffset(startLoc, 1) });

            if (escaped) {
                escaped = false;
            } else {
                if (ch === CharCodes.leftSquareBracket)
                    inClass = true;
                else if (ch === CharCodes.rightSquareBracket && inClass)
                    inClass = false;
                else if (ch === CharCodes.slash && !inClass)
                    break;

                escaped = ch === CharCodes.backslash;
            }
        }
        const content = this.input.slice(start, pos);
        ++pos;
        let mods = "";
        // (pos + 1) + 1 - start
        const nextPos = () => Position.fromColumnOffset(startLoc, pos + 2 - start);
        while (pos < this.length) {
            const cp = this.codePointAtPos(pos);
            // It doesn't matter if cp > 0xffff, the loop will either throw or break because we check on cp
            const char = String.fromCharCode(cp);

            if (VALID_REGEX_FLAGS.has(cp as ValidRegexFlags)) {
                if (cp === CharCodes.lowercaseV) {
                    if (mods.includes("u"))
                        this.raise(Errors.IncompatibleRegExpUVFlags, { at: nextPos() });
                } else if (cp === CharCodes.lowercaseU) {
                    if (mods.includes("v"))
                        this.raise(Errors.IncompatibleRegExpUVFlags, { at: nextPos() });
                }

                if (mods.includes(char))
                    this.raise(Errors.DuplicateRegExpFlags, { at: nextPos() });

            } else if (CharCodes.isIdentifierChar(cp) || cp === CharCodes.backslash) {
                this.raise(Errors.MalformedRegExpFlags, { at: nextPos() });
            } else {
                break;
            }
            ++pos;
            mods += char;
        }
        this.state.position = pos;
        this.finishToken(tokenTypes.regexp, { pattern: content, flags: mods });
    }

    protected readToken_question(): void {
        const next = this.charCode(1); // '?'
        const next2 = this.charCode(2);
        if (next === CharCodes.questionMark) {
            if (next2 === CharCodes.equalsTo) // '??='
                this.finishOp(tokenTypes.assign, 3);
            else // '??'
                this.finishOp(tokenTypes.nullishCoalescing, 2);
        } else if (next === CharCodes.dot && !(next2 >= CharCodes.digit0 && next2 <= CharCodes.digit9)) {
            // '.' not followed by a number
            this.state.position += 2;
            this.finishToken(tokenTypes.questionDot);
        } else {
            ++this.state.position;
            this.finishToken(tokenTypes.question);
        }
    }

    protected readTemplateToken(): void {
        const opening = this.input[this.state.position];
        const { str, firstInvalidLoc, pos, curLine, lineStart } =
            StringParser.readStringContents(
                "template",
                this.input,
                this.state.position + 1, // skip '`' or `}`
                this.state.lineStart,
                this.state.currentLine,
                errorHandlers.readStringTemplate(this),
            );
        this.state.position = pos + 1; // skip '`' or `$`
        this.state.lineStart = lineStart;
        this.state.currentLine = curLine;

        if (firstInvalidLoc) {
            this.state.firstInvalidTemplateEscapePos = Position.fromArgs(
                firstInvalidLoc.pos,
                firstInvalidLoc.curLine,
                firstInvalidLoc.pos - firstInvalidLoc.lineStart,
            );
        }

        if (this.input.codePointAt(pos) === CharCodes.graveAccent) {
            this.finishToken(
                tokenTypes.templateTail,
                firstInvalidLoc ? null : opening + str + "`",
            );
        } else {
            this.state.position++; // skip '{'
            this.finishToken(
                tokenTypes.templateNonTail,
                firstInvalidLoc ? null : opening + str + "${",
            );
        }
    }

    protected readToken_slash(): void {
        if (this.charCode(1) === CharCodes.equalsTo)
            this.finishOp(tokenTypes.slashAssign, 2);
        else
            this.finishOp(tokenTypes.slash, 1);
    }

    protected readToken_mult_modulo(code: number): void {
        let type = code === CharCodes.asterisk ? tokenTypes.star : tokenTypes.modulo; // '%' or '*'
        let width = 1;
        let next = this.charCode(1);

        if (code === CharCodes.asterisk && next === CharCodes.asterisk) { // Exponentiation operator '**'
            width++;
            next = this.charCode(2);
            type = tokenTypes.exponent;
        }

        if (next === CharCodes.equalsTo && !this.state.inType) { // '%=' or '*='
            width++;
            type = code === CharCodes.percentSign ? tokenTypes.moduloAssign : tokenTypes.assign;
        }

        this.finishOp(type, width);
    }

    protected readToken_pipe_amp(code: number): void {
        const next = this.charCode(1); // '||' '&&' '||=' '&&='
        if (next === code) {
            if (this.charCode(2) === CharCodes.equalsTo)
                this.finishOp(tokenTypes.assign, 3);
            else
                this.finishOp(code === CharCodes.verticalBar ? tokenTypes.logicalOR : tokenTypes.logicalAND, 2);
            return;
        }

        if (code === CharCodes.verticalBar) { // '|>'
            if (next === CharCodes.greaterThan) {
                this.finishOp(tokenTypes.pipeline, 2);
                return;
            }
            if (this.hasFeature("recordAndTuple")) { // '|}' '|]'
                if (next === CharCodes.rightCurlyBrace) {
                    this.state.position += 2;
                    return this.finishToken(tokenTypes.braceBarR);
                } else if (next === CharCodes.rightSquareBracket) {
                    this.state.position += 2;
                    return this.finishToken(tokenTypes.bracketBarR);
                }
            }
        }

        if (next === CharCodes.equalsTo)
            return this.finishOp(tokenTypes.assign, 2);

        this.finishOp(code === CharCodes.verticalBar ? tokenTypes.bitwiseOR : tokenTypes.bitwiseAND, 1);
    }

    protected readToken_caret(): void {
        const next = this.charCode(1);
        if (next === CharCodes.equalsTo && !this.state.inType)  // '^='
            this.finishOp(tokenTypes.xorAssign, 2);
        else // '^'
            this.finishOp(tokenTypes.bitwiseXOR, 1);
    }

    protected readToken_atSign(): void {
        this.finishOp(tokenTypes.at, 1);
    }

    protected readToken_plus_min(code: number): void {
        // '+-'
        const next = this.charCode(1);
        if (next === code)
            return this.finishOp(tokenTypes.incDec, 2);

        if (next === CharCodes.equalsTo)
            this.finishOp(tokenTypes.assign, 2);
        else
            this.finishOp(tokenTypes.plusMin, 1);
    }

    protected readToken_lt(): void { // '<'
        const next = this.charCode(1);
        if (next === CharCodes.lessThan) {
            if (this.charCode(2) === CharCodes.equalsTo)
                return this.finishOp(tokenTypes.assign, 3);

            return this.finishOp(tokenTypes.bitShiftL, 2);
        }

        if (next === CharCodes.equalsTo)// <=
            return this.finishOp(tokenTypes.relational, 2);

        this.finishOp(tokenTypes.lt, 1);
    }

    protected readToken_gt(): void { // '>'
        const next = this.charCode(1);
        if (next === CharCodes.greaterThan) {
            const size = this.charCode(2) === CharCodes.greaterThan ? 3 : 2;
            if (this.charCode(size) === CharCodes.equalsTo)
                return this.finishOp(tokenTypes.assign, size + 1);
            return this.finishOp(tokenTypes.bitShiftR, size);
        }

        if (next === CharCodes.equalsTo)  // >=
            return this.finishOp(tokenTypes.relational, 2);

        this.finishOp(tokenTypes.gt, 1);
    }

    protected readToken_eq_excl(code: number): void { // '=!'
        const next = this.charCode(1);
        if (next === CharCodes.equalsTo)
            return this.finishOp(tokenTypes.equality, this.charCode(2) === CharCodes.equalsTo ? 3 : 2);

        if (code === CharCodes.equalsTo && next === CharCodes.greaterThan) {
            this.state.position += 2;
            return this.finishToken(tokenTypes.arrow);
        }

        this.finishOp(code === CharCodes.equalsTo ? tokenTypes.eq : tokenTypes.bang, 1);
    }

    protected readToken_numberSign(): void {
        if (this.state.position === 0 && this.readToken_interpreter())
            return;

        const next = this.codePointAtPos(this.state.position + 1);
        if (next >= CharCodes.digit0 && next <= CharCodes.digit9)
            throw this.raise(Errors.UnexpectedDigitAfterHash, { at: this.state.currentPosition() });

        if (next === CharCodes.leftCurlyBrace) {
            // When we see `#{`, it is likely to be a hash record.
            // However we don't yell at `#[` since users may intend to use "computed private fields",
            // which is not allowed in the spec. Throwing expecting recordAndTuple is
            // misleading
            throw this.raise(
                next === CharCodes.leftCurlyBrace
                    ? Errors.RecordExpressionHashIncorrectStartSyntaxType
                    : Errors.TupleExpressionHashIncorrectStartSyntaxType,
                { at: this.state.currentPosition() },
            );
        } else if (CharCodes.isIdentifierStart(next)) {
            ++this.state.position;
            this.finishToken(tokenTypes.privateName, this.readWord1(next));
        } else if (next === CharCodes.backslash) {
            ++this.state.position;
            this.finishToken(tokenTypes.privateName, this.readWord1());
        } else {
            this.finishOp(tokenTypes.hash, 1);
        }
    }

    protected readWord(firstCode?: number): void {
        const word = this.readWord1(firstCode);
        const type = Tokens.keywordToken(word);
        if (type !== undefined)
            // We don't use word as state.value here because word is a dynamic string
            // while token label is a shared constant string
            this.finishToken(type, Tokens.label(type));
        else
            this.finishToken(tokenTypes.name, word);
    }

    protected readWord1(firstCode?: number): string {
        this.state.containsEsc = false;
        let word = "";
        const start = this.state.position;
        let chunkStart = this.state.position;
        if (firstCode !== undefined)
            this.state.position += firstCode <= 0xffff ? 1 : 2;

        while (this.state.position < this.length) {
            const ch = this.codePointAtPos(this.state.position);
            if (CharCodes.isIdentifierChar(ch)) {
                this.state.position += ch <= 0xffff ? 1 : 2;
            } else if (ch === CharCodes.backslash) {
                this.state.containsEsc = true;

                word += this.input.slice(chunkStart, this.state.position);
                const escStart = this.state.currentPosition();
                const identifierCheck = this.state.position === start ? CharCodes.isIdentifierStart : CharCodes.isIdentifierChar;
                if (this.charCodeAt(++this.state.position) !== CharCodes.lowercaseU) {
                    this.raise(Errors.MissingUnicodeEscape, { at: this.state.currentPosition() });
                    chunkStart = this.state.position - 1;
                    continue;
                }

                ++this.state.position;
                const esc = this.readCodePoint(true);
                if (esc != null) {
                    if (!identifierCheck(esc))
                        this.raise(Errors.EscapedCharNotAnIdentifier, { at: escStart });
                    word += String.fromCodePoint(esc);
                }
                chunkStart = this.state.position;
            } else {
                break;
            }
        }
        return word + this.input.slice(chunkStart, this.state.position);
    }

    protected readCodePoint(throwOnInvalid: boolean): number | null | undefined {
        const { code, pos } = StringParser.readCodePoint(
            this.input,
            this.state.position,
            this.state.lineStart,
            this.state.currentLine,
            throwOnInvalid,
            errorHandlers.readCodePoint(this),
        );
        this.state.position = pos;
        return code;
    }

    protected readToken_interpreter(): boolean {
        if (this.state.position !== 0 || this.length < 2)
            return false;

        let ch = this.charCode(1);
        if (ch !== CharCodes.exclamationMark)
            return false;

        const start = this.state.position;
        this.state.position += 1;

        while (!CharCodes.isNewLine(ch) && ++this.state.position < this.length)
            ch = this.charCode();

        const value = this.input.slice(start + 2, this.state.position);
        this.finishToken(tokenTypes.interpreterDirective, value);
        return true;
    }

    protected readTemplateContinuation(): void {
        if (!this.match(tokenTypes.braceR)) {
            this.unexpected(undefined, tokenTypes.braceR);
        }
        // rewind pos to `}`
        this.state.position--;
        this.readTemplateToken();
    }

    //#endregion
}