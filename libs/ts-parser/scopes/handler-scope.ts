import { Errors } from "../errors/errors";
import { IPosition } from "../types/basic";
import { Identifier } from "../types/nodes";
import { IParser } from "../types/parser.interface";
import {
    BIND_KIND_VALUE, BIND_SCOPE_FUNCTION, BIND_SCOPE_LEXICAL,
    BIND_SCOPE_VAR, BindingTypes, SCOPE_ARROW, SCOPE_CLASS, SCOPE_DIRECT_SUPER, SCOPE_FUNCTION,
    SCOPE_PROGRAM, SCOPE_SIMPLE_CATCH, SCOPE_STATIC_BLOCK, SCOPE_SUPER, SCOPE_VAR, ScopeFlags
} from "./scopeflags";

export class Scope {
    // A set of var-declared names in the current lexical scope
    var: Set<string> = new Set();
    // A set of lexically-declared names in the current lexical scope
    lexical: Set<string> = new Set();
    // A set of lexically-declared FunctionDeclaration names in the current lexical scope
    functions: Set<string> = new Set();

    constructor(public flags: ScopeFlags) { }
}

export abstract class ScopeHandlerBase<TScope extends Scope> {
    scopeStack: Array<TScope> = [];
    undefinedExports: Map<string, IPosition> = new Map();

    constructor(public parser: IParser, public inModule: boolean) { }

    get inTopLevel() {
        return (this.currentScope().flags & SCOPE_PROGRAM) > 0;
    }
    get inFunction() {
        return (this.currentVarScopeFlags() & SCOPE_FUNCTION) > 0;
    }
    get allowSuper() {
        return (this.currentThisScopeFlags() & SCOPE_SUPER) > 0;
    }
    get allowDirectSuper() {
        return (this.currentThisScopeFlags() & SCOPE_DIRECT_SUPER) > 0;
    }
    get inClass() {
        return (this.currentThisScopeFlags() & SCOPE_CLASS) > 0;
    }
    get inClassAndNotInNonArrowFunction() {
        const flags = this.currentThisScopeFlags();
        return (flags & SCOPE_CLASS) > 0 && (flags & SCOPE_FUNCTION) === 0;
    }
    get inStaticBlock() {
        for (let i = this.scopeStack.length - 1; ; i--) {
            const { flags } = this.scopeStack[i];
            if (flags & SCOPE_STATIC_BLOCK)
                return true;
            if (flags & (SCOPE_VAR | SCOPE_CLASS))
                // function body, module body, class property initializers
                return false;
        }
    }
    get inNonArrowFunction() {
        return (this.currentThisScopeFlags() & SCOPE_FUNCTION) > 0;
    }
    get treatFunctionsAsVar() {
        return this.treatFunctionsAsVarInScope(this.currentScope());
    }

    abstract createScope(flags: ScopeFlags): TScope;

    enter(flags: ScopeFlags) {
        this.scopeStack.push(this.createScope(flags));
    }

    exit(): ScopeFlags {
        const scope = this.scopeStack.pop();
        return scope!.flags;
    }

    // The spec says:
    // > At the top level of a function, or script, function declarations are
    // > treated like var declarations rather than like lexical declarations.
    treatFunctionsAsVarInScope(scope: TScope): boolean {
        return !!(scope.flags & (SCOPE_FUNCTION | SCOPE_STATIC_BLOCK) || (!this.parser.inModule && scope.flags & SCOPE_PROGRAM));
    }

    declareName(name: string, bindingType: BindingTypes, loc: IPosition) {
        let scope = this.currentScope();
        if (bindingType & BIND_SCOPE_LEXICAL || bindingType & BIND_SCOPE_FUNCTION) {
            this.checkRedeclarationInScope(scope, name, bindingType, loc);

            if (bindingType & BIND_SCOPE_FUNCTION)
                scope.functions.add(name);
            else
                scope.lexical.add(name);

            if (bindingType & BIND_SCOPE_LEXICAL)
                this.maybeExportDefined(scope, name);
        } else if (bindingType & BIND_SCOPE_VAR) {
            for (let i = this.scopeStack.length - 1; i >= 0; --i) {
                scope = this.scopeStack[i];
                this.checkRedeclarationInScope(scope, name, bindingType, loc);
                scope.var.add(name);
                this.maybeExportDefined(scope, name);

                if (scope.flags & SCOPE_VAR)
                    break;
            }
        }
        if (this.parser.inModule && scope.flags & SCOPE_PROGRAM)
            this.undefinedExports.delete(name);
    }

    maybeExportDefined(scope: TScope, name: string) {
        if (this.parser.inModule && scope.flags & SCOPE_PROGRAM)
            this.undefinedExports.delete(name);
    }

    checkRedeclarationInScope(scope: TScope, name: string, bindingType: BindingTypes, loc: IPosition) {
        if (this.isRedeclaredInScope(scope, name, bindingType))
            this.parser.raise(Errors.VarRedeclaration, { at: loc, identifierName: name });
    }

    isRedeclaredInScope(scope: TScope, name: string, bindingType: BindingTypes): boolean {
        if (!(bindingType & BIND_KIND_VALUE))
            return false;

        if (bindingType & BIND_SCOPE_LEXICAL)
            return (scope.lexical.has(name) || scope.functions.has(name) || scope.var.has(name));

        if (bindingType & BIND_SCOPE_FUNCTION)
            return (scope.lexical.has(name) || (!this.treatFunctionsAsVarInScope(scope) && scope.var.has(name)));

        return (
            (scope.lexical.has(name) &&
                // Annex B.3.4
                // https://tc39.es/ecma262/#sec-variablestatements-in-catch-blocks
                !(scope.flags & SCOPE_SIMPLE_CATCH && scope.lexical.values().next().value === name))
            ||
            (!this.treatFunctionsAsVarInScope(scope) && scope.functions.has(name))
        );
    }

    checkLocalExport(id: Identifier) {
        const { name } = id;
        const topLevelScope = this.scopeStack[0];
        if (!topLevelScope.lexical.has(name) && !topLevelScope.var.has(name) && !topLevelScope.functions.has(name))
            this.undefinedExports.set(name, id.location.start);
    }

    currentScope(): TScope {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    currentVarScopeFlags(): ScopeFlags {
        return this.currentScopeFlags(flags => !!(flags & (SCOPE_VAR)));
    }

    currentThisScopeFlags(): ScopeFlags {
        return this.currentScopeFlags(flags => !!(flags & (SCOPE_VAR | SCOPE_CLASS)) && !(flags & SCOPE_ARROW));
    }

    private currentScopeFlags(predict: (flags: ScopeFlags) => boolean): ScopeFlags {
        for (let i = this.scopeStack.length - 1; ; i--) {
            const { flags } = this.scopeStack[i];
            if (predict(flags))
                return flags;
        }
    }
}

export class ScopeHandler extends ScopeHandlerBase<Scope> {
    override createScope(flags: number): Scope {
        return new Scope(flags);
    }
}

export type ScopeType<SH> = SH extends ScopeHandlerBase<infer S> ? S : never;

