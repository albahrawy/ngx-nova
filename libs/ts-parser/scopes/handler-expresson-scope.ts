import { Errors } from "../errors/errors";
import { ErrorDetails, IHasLocation, IPosition } from "../types/basic";
import { IParser } from "../types/parser.interface";

type ExpressionScopeType = 0 | 1 | 2 | 3;
const kExpression = 0,
    kMaybeArrowParameterDeclaration = 1,
    kMaybeAsyncArrowParameterDeclaration = 2,
    kParameterDeclaration = 3;


class ExpressionScope {
    type: ExpressionScopeType;

    constructor(type: ExpressionScopeType = kExpression) {
        this.type = type;
    }

    canBeArrowParameterDeclaration(): this is ArrowHeadParsingScope {
        return (this.type === kMaybeAsyncArrowParameterDeclaration || this.type === kMaybeArrowParameterDeclaration);
    }

    isCertainlyParameterDeclaration() {
        return this.type === kParameterDeclaration;
    }
}

class ArrowHeadParsingScope extends ExpressionScope {
    declarationErrors: Map<number, [ErrorDetails, IPosition]> = new Map();

    constructor(type: 1 | 2) { super(type); }

    recordDeclarationError(ParsingErrorClass: ErrorDetails, { at }: { at: IPosition; }) {
        const index = at.index;
        this.declarationErrors.set(index, [ParsingErrorClass, at]);
    }

    clearDeclarationError(index: number) { this.declarationErrors.delete(index); }
    iterateErrors(iterator: (a: [ErrorDetails, IPosition]) => void) { this.declarationErrors.forEach(iterator); }
}

export class ExpressionScopeHandler {
    parser: IParser;
    stack: Array<ExpressionScope> = [new ExpressionScope()];

    constructor(parser: IParser) { this.parser = parser; }
    enter(scope: ExpressionScope) { this.stack.push(scope); }
    exit() { this.stack.pop(); }

    /**
     * Record likely parameter initializer errors
     *
     * When current scope is a ParameterDeclaration, the error will be thrown immediately,
     * otherwise it will be recorded to any ancestry MaybeArrowParameterDeclaration and
     * MaybeAsyncArrowParameterDeclaration scope until an Expression scope is seen.
     */
    recordParameterInitializerError(
        toParseError: ErrorDetails, { at: node }: { at: IHasLocation; }): void {
        const origin = { at: node.location.start };
        const { stack } = this;
        let i = stack.length - 1;
        let scope: ExpressionScope = stack[i];
        while (!scope.isCertainlyParameterDeclaration()) {
            if (scope.canBeArrowParameterDeclaration())
                scope.recordDeclarationError(toParseError, origin);
            else
                /*:: invariant(scope.type == kExpression) */
                // Type-Expression is the boundary where initializer error can populate to
                return;
            scope = stack[--i];
        }
        this.parser.raise(toParseError, origin);
    }

    /**
     * Record errors that must be thrown if the current pattern ends up being an arrow
     * function parameter. This is used to record parenthesized identifiers, and to record
     * "a as T" and "<T> a" type assertions when parsing typescript.
     *
     * A parenthesized identifier (or type assertion) in LHS can be ambiguous because the assignment
     * can be transformed to an assignable later, but not vice versa:
     * For example, in `([(a) = []] = []) => {}`, we think `(a) = []` is an LHS in `[(a) = []]`,
     * an LHS within `[(a) = []] = []`. However the LHS chain is then transformed by toAssignable,
     * and we should throw assignment `(a)`, which is only valid in LHS. Hence we record the
     * location of parenthesized `(a)` to current scope if it is one of MaybeArrowParameterDeclaration
     * and MaybeAsyncArrowParameterDeclaration
     *
     * Unlike `recordParameterInitializerError`, we don't record to ancestry scope because we
     * validate arrow head parsing scope before exit, and then the LHS will be unambiguous:
     * For example, in `( x = ( [(a) = []] = [] ) ) => {}`, we should not record `(a)` in `( x = ... ) =>`
     * arrow scope because when we finish parsing `( [(a) = []] = [] )`, it is an unambiguous assignment
     * expression and can not be cast to pattern
     */
    recordArrowParameterBindingError(error: ErrorDetails, { at: node }: { at: IHasLocation; }): void {
        const { stack } = this;
        const scope: ExpressionScope = stack[stack.length - 1];
        const origin = { at: node.location.start };
        if (scope.isCertainlyParameterDeclaration())
            this.parser.raise(error, origin);
        else if (scope.canBeArrowParameterDeclaration())
            scope.recordDeclarationError(error, origin);
        else
            return;
    }

    /**
     * Record likely async arrow parameter errors
     *
     * Errors will be recorded to any ancestry MaybeAsyncArrowParameterDeclaration
     * scope until an Expression scope is seen.
     */
    recordAsyncArrowParametersError({ at }: { at: IPosition }): void {
        const { stack } = this;
        let i = stack.length - 1;
        let scope: ExpressionScope = stack[i];
        while (scope.canBeArrowParameterDeclaration()) {
            if (scope.type === kMaybeAsyncArrowParameterDeclaration)
                scope.recordDeclarationError(Errors.AwaitBindingIdentifier, { at });
            scope = stack[--i];
        }
    }

    validateAsPattern(): void {
        const { stack } = this;
        const currentScope = stack[stack.length - 1];
        if (!currentScope.canBeArrowParameterDeclaration()) return;
        currentScope.iterateErrors(([toParseError, loc]) => {
            this.parser.raise(toParseError, { at: loc });
            // iterate from parent scope
            let i = stack.length - 2;
            let scope = stack[i];
            while (scope.canBeArrowParameterDeclaration()) {
                scope.clearDeclarationError(loc.index);
                scope = stack[--i];
            }
        });
    }

    static newParameterDeclarationScope() {
        return new ExpressionScope(kParameterDeclaration);
    }

    static newArrowHeadScope() {
        return new ArrowHeadParsingScope(kMaybeArrowParameterDeclaration);
    }

    static newAsyncArrowScope() {
        return new ArrowHeadParsingScope(kMaybeAsyncArrowParameterDeclaration);
    }

    static newExpressionScope() {
        return new ExpressionScope();
    }
}