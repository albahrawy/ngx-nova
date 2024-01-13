import { Errors } from "../errors/errors";
import { Scope, ScopeHandlerBase } from "../scopes/handler-scope";
import {
    BIND_FLAGS_CLASS, BIND_FLAGS_TS_CONST_ENUM, BIND_FLAGS_TS_ENUM, BIND_FLAGS_TS_EXPORT_ONLY,
    BIND_FLAGS_TS_IMPORT, BIND_KIND_TYPE, BIND_KIND_VALUE, BIND_SCOPE_FUNCTION, BIND_SCOPE_LEXICAL,
    BindingTypes, SCOPE_SIMPLE_CATCH, SCOPE_TS_MODULE, ScopeFlags
} from "../scopes/scopeflags";
import { IPosition } from "../types/basic";
import { Identifier } from "../types/nodes";
import { IParser } from "../types/parser.interface";

class TypeScriptScope extends Scope {
    types: Set<string> = new Set();
    enums: Set<string> = new Set();
    constEnums: Set<string> = new Set();
    classes: Set<string> = new Set();
    exportOnlyBindings: Set<string> = new Set();
}

export class TypeScriptScopeHandler extends ScopeHandlerBase<TypeScriptScope> {
    importsStack: Set<string>[] = [];

    constructor(parser: IParser, inModule: boolean) {
        super(parser, inModule);
    }

    hasImport(name: string, allowShadow?: boolean) {
        const len = this.importsStack.length;
        if (this.importsStack[len - 1].has(name))
            return true;
        if (!allowShadow && len > 1) {
            for (let i = 0; i < len - 1; i++) {
                if (this.importsStack[i].has(name))
                    return true;
            }
        }
        return false;
    }

    override createScope(flags: ScopeFlags): TypeScriptScope {
        this.importsStack.push(new Set()); // Always keep the top-level scope for export checks.
        return new TypeScriptScope(flags);
    }

    override enter(flags: ScopeFlags) {
        if (flags == SCOPE_TS_MODULE)
            this.importsStack.push(new Set());
        this.scopeStack.push(this.createScope(flags));
    }

    override exit(): ScopeFlags {
        const scope = this.scopeStack.pop()!;
        if (scope.flags == SCOPE_TS_MODULE) {
            this.importsStack.pop();
        }
        return scope.flags;
    }

    override declareName(name: string, bindingType: BindingTypes, loc: IPosition) {
        if (bindingType & BIND_FLAGS_TS_IMPORT) {
            if (this.hasImport(name, true))
                this.parser.raise(Errors.VarRedeclaration, { at: loc, identifierName: name });
            this.importsStack[this.importsStack.length - 1].add(name);
            return;
        }

        const scope = this.currentScope();
        if (bindingType & BIND_FLAGS_TS_EXPORT_ONLY) {
            this.maybeExportDefined(scope, name);
            scope.exportOnlyBindings.add(name);
            return;
        }

        super.declareName(name, bindingType, loc);

        if (bindingType & BIND_KIND_TYPE) {
            if (!(bindingType & BIND_KIND_VALUE)) {
                // "Value" bindings have already been registered by the superclass.
                this.checkRedeclarationInScope(scope, name, bindingType, loc);
                this.maybeExportDefined(scope, name);
            }
            scope.types.add(name);
        }
        if (bindingType & BIND_FLAGS_TS_ENUM)
            scope.enums.add(name);
        if (bindingType & BIND_FLAGS_TS_CONST_ENUM)
            scope.constEnums.add(name);
        if (bindingType & BIND_FLAGS_CLASS)
            scope.classes.add(name);
    }

    override isRedeclaredInScope(scope: TypeScriptScope, name: string, bindingType: BindingTypes): boolean {
        if (scope.enums.has(name)) {
            if (bindingType & BIND_FLAGS_TS_ENUM) {
                const isConst = !!(bindingType & BIND_FLAGS_TS_CONST_ENUM);
                const wasConst = scope.constEnums.has(name);
                return isConst !== wasConst;
            }
            return true;
        }
        if (bindingType & BIND_FLAGS_CLASS && scope.classes.has(name)) {
            if (scope.lexical.has(name))
                return !!(bindingType & BIND_KIND_VALUE);
            else
                return false;
        }

        if (bindingType & BIND_KIND_TYPE && scope.types.has(name))
            return true;

        if (!(bindingType & BIND_KIND_VALUE))
            return false;

        if (bindingType & BIND_SCOPE_LEXICAL)
            return (scope.lexical.has(name) || scope.functions.has(name) || scope.var.has(name));

        if (bindingType & BIND_SCOPE_FUNCTION)
            return (scope.lexical.has(name) || (!this.treatFunctionsAsVarInScope(scope) && scope.var.has(name)));

        return ((scope.lexical.has(name) &&
            !(scope.flags & SCOPE_SIMPLE_CATCH && scope.lexical.values().next().value === name))
            || (!this.treatFunctionsAsVarInScope(scope) && scope.functions.has(name))
        );
    }

    override checkLocalExport(id: Identifier) {
        const { name } = id;
        if (this.hasImport(name))
            return;

        const len = this.scopeStack.length;
        for (let i = len - 1; i >= 0; i--) {
            const scope = this.scopeStack[i];
            if (scope.types.has(name) || scope.exportOnlyBindings.has(name))
                return;
        }

        const topLevelScope = this.scopeStack[0];
        if (!topLevelScope.lexical.has(name) && !topLevelScope.var.has(name) && !topLevelScope.functions.has(name))
            this.undefinedExports.set(name, id.location.start!);
    }
}
