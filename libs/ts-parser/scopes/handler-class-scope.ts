import { Errors } from "../errors/errors";
import { IPosition } from "../types/basic";
import { IParser } from "../types/parser.interface";
import { CLASS_ELEMENT_FLAG_STATIC, CLASS_ELEMENT_KIND_ACCESSOR, ClassElementTypes } from "./scopeflags";

export class ClassScope {
    // A list of private named declared in the current class
    privateNames: Set<string> = new Set();

    // A list of private getters of setters without their counterpart
    loneAccessors: Map<string, ClassElementTypes> = new Map();

    // A list of private names used before being defined, mapping to
    // their position.
    undefinedPrivateNames: Map<string, IPosition> = new Map();
}

export class ClassScopeHandler {
    parser: IParser;
    stack: Array<ClassScope> = [];
    undefinedPrivateNames: Map<string, IPosition> = new Map();

    constructor(parser: IParser) { this.parser = parser; }

    current(): ClassScope { return this.stack[this.stack.length - 1]; }

    enter() { this.stack.push(new ClassScope()); }

    exit() {
        const oldClassScope = this.stack.pop();

        // Migrate the usage of not yet defined private names to the outer
        // class scope, or raise an error if we reached the top-level scope.

        const current = this.current();

        // Array.from is needed because this is compiled to an array-like for loop
        for (const [name, location] of Array.from(oldClassScope?.undefinedPrivateNames || [])) {
            if (current) {
                if (!current.undefinedPrivateNames.has(name))
                    current.undefinedPrivateNames.set(name, location);
            } else {
                this.parser.raise(Errors.InvalidPrivateFieldResolution, { at: location, identifierName: name });
            }
        }
    }

    declarePrivateName(name: string | undefined, elementType: ClassElementTypes, loc: IPosition) {
        if (!name)
            return;
        const { privateNames, loneAccessors, undefinedPrivateNames } = this.current();
        let redefined = privateNames.has(name);

        if (elementType & CLASS_ELEMENT_KIND_ACCESSOR) {
            const accessor = redefined && loneAccessors.get(name);
            if (accessor) {
                const oldStatic = accessor & CLASS_ELEMENT_FLAG_STATIC;
                const newStatic = elementType & CLASS_ELEMENT_FLAG_STATIC;
                const oldKind = accessor & CLASS_ELEMENT_KIND_ACCESSOR;
                const newKind = elementType & CLASS_ELEMENT_KIND_ACCESSOR;

                // The private name can be duplicated only if it is used by
                // two accessors with different kind (get and set), and if
                // they have the same placement (static or not).
                redefined = oldKind === newKind || oldStatic !== newStatic;

                if (!redefined)
                    loneAccessors.delete(name);
            } else if (!redefined) {
                loneAccessors.set(name, elementType);
            }
        }

        if (redefined)
            this.parser.raise(Errors.PrivateNameRedeclaration, { at: loc, identifierName: name });

        privateNames.add(name);
        undefinedPrivateNames.delete(name);
    }

    usePrivateName(name: string | undefined, loc: IPosition) {
        if (!name)
            return;
        let classScope;
        for (classScope of this.stack) {
            if (classScope.privateNames.has(name))
                return;
        }

        if (classScope)
            classScope.undefinedPrivateNames.set(name, loc);
        else // top-level
            this.parser.raise(Errors.InvalidPrivateFieldResolution, { at: loc, identifierName: name });
    }
}