/* eslint-disable @typescript-eslint/ban-types */
import { IOptions } from "../types/basic";
import { Nullable } from "../types/internal.types";
import { AnyFunction, ExpressionNode, IClass } from "../types/nodes";
import { TypeScriptParser } from "../typescript/parser";
import { ClassBuilderResult, IBiDictionary, ICtorArg, IDecoratorInfo, IDictionary, IFuncArgs, RunTimeClass, ValueType } from "./types";

//TODO: build super class/

export function buildClass<R, CtorArgs extends unknown[]>(classNode?: IClass): ClassBuilderResult<R, CtorArgs> {
    if (!classNode)
        throw new Error("Invalid classNode parameter");
    const methods: IDictionary<Function> = {};
    const staticMethods: IDictionary<Function> = {};
    const properties: IBiDictionary<Function | boolean> = {};
    const decorators: IDictionary<IDecoratorInfo[]> = {};
    const ctorParams: Array<ICtorArg> = [];
    const fields: IDictionary<unknown> = {};
    classNode.body.children.forEach(n => {
        if (n?.type !== 'ClassMethod' && n?.type !== "ClassProperty")
            return;
        const name = n?.key.type === 'Identifier' ? n.key.name : null;
        if (!name)
            return;
        let maybeHasDecorator = false;
        if (n.type === 'ClassMethod') {
            const fn = _generateFunction(n, n.kind == 'constructor', ctorParams);
            switch (n.kind) {
                case 'get':
                case 'set':
                    properties[name] = properties[name] || {};
                    properties[name][n.kind] = fn;
                    properties[name]['enumerable'] = false;
                    properties[name]['configurable'] = false;
                    maybeHasDecorator = true;
                    break;
                case 'constructor':
                    methods["__onConstructor"] = fn;
                    break;
                case 'method':
                    if (n.static)
                        staticMethods[name] = fn;
                    else
                        methods[name] = fn;
                    maybeHasDecorator = true;
                    break;
            }

        } else if (n?.type === 'ClassProperty') {
            maybeHasDecorator = true;
            n.decorators
            fields[name] = _getNodeValue(n.value);
        }
        if (maybeHasDecorator && !!name && Array.isArray(n.decorators)) {
            const decoratorArray = decorators[name] ??= [];
            n.decorators.forEach(d => {
                if (d.expression?.type === 'Identifier')
                    decoratorArray.push({ name: d.expression.name });
                else if (d.expression?.type === 'CallExpression' && d.expression.callee?.type === 'Identifier') {
                    const name = d.expression.callee.name;
                    const args = d.expression.arguments?.map(v => _getNodeValue(v));
                    decoratorArray.push({ name, args });
                }
            });
        }
    });

    const DynamicClass = class DynamicClass {
        constructor(...args: CtorArgs) { this.__onConstructor(...args); }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        __onConstructor(...args: CtorArgs): void { }
    };

    const prototype = DynamicClass.prototype;
    Object.entries(properties).forEach(([k, f]) => Object.defineProperty(prototype, k, f));
    Object.assign(prototype, methods);
    Object.assign(prototype, fields);
    Object.assign(DynamicClass, staticMethods);

    return { class: DynamicClass as unknown as RunTimeClass<R, CtorArgs>, decorators, dependencies: classNode.body.dependencies };
}

export function buildClassFromString<R, CtorArgs extends unknown[]>(code: string, options?: IOptions): ClassBuilderResult<R, CtorArgs> {
    const parser = new TypeScriptParser(options);
    const program = parser.parse(code);
    const cls = program.children.find(c => c.type === 'ClassDeclaration' || c.type === 'ClassExpression') as IClass;
    return buildClass<R, CtorArgs>(cls);
}

function _generateFunction(n: AnyFunction, isConstructor?: boolean, ctorParams?: Array<ICtorArg>): Function {
    const args: string[] = [];
    const instanceParams: string[] = [];
    n.params.forEach((p, index) => {
        const arg = _createParm(p);
        if (arg) {
            args.push(arg.signature ?? arg.name);
            if (isConstructor) {
                if (arg.accessibility)
                    instanceParams.push(`this.${arg.name}=${arg.name};`);
                if (ctorParams && arg.typeReference)
                    ctorParams.push({ name: arg.name, typeReference: arg.typeReference, index });
            }
        }
    });
    args.push(instanceParams.join('\n') + (n.body.content || ''));
    return new Function(...args);
}

function _createParm(node: Nullable<ExpressionNode>, parentNode: Nullable<ExpressionNode> = null): IFuncArgs | null {
    let paramNode: Nullable<ExpressionNode> = null;
    let assignFn: ((a: IFuncArgs) => void) | null = null;
    switch (node?.type) {
        case "Identifier":
            paramNode = node;
            break;
        case "ObjectPattern":
        case "ArrayPattern":
            break;
        case "RestElement":
            paramNode = node.argument;
            assignFn = (a) => a.signature = `...${a.name}`;
            break;
        case "AssignmentPattern":
            paramNode = node.left;
            assignFn = (a) => a.signature = `${a.name}=${node.right.content}`;
            break;
        case "TSParameterProperty":
            return _createParm(node.parameter, node);
    }

    if (paramNode) {
        if (paramNode?.type == "Identifier" && paramNode.name) {
            const param = { name: paramNode.name } as IFuncArgs;
            assignFn?.(param);
            if (parentNode?.type === 'TSParameterProperty')
                param.accessibility = parentNode.accessibility;
            if (paramNode.typeAnnotation?.type === "TSTypeAnnotation"
                && paramNode.typeAnnotation.typeAnnotation?.type === "TSTypeReference"
                && paramNode.typeAnnotation.typeAnnotation.typeName.type === 'Identifier')
                param.typeReference = paramNode.typeAnnotation.typeAnnotation.typeName.name;
            return param;
        }
    }

    return null;
}

function _getNodeValue(node: Nullable<ExpressionNode>): ValueType | undefined {
    switch (node?.type) {
        case 'NullLiteral':
        case 'BigIntLiteral':
        case 'StringLiteral':
        case 'NumericLiteral':
        case 'DecimalLiteral':
        case 'BooleanLiteral':
            return node.value;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
            return _generateFunction(node);
        case 'RegExpLiteral':
            return new RegExp(node.pattern, node.flags.join());
        case 'NewExpression':
        case 'CallExpression':
        case 'BinaryExpression':
        case 'ObjectExpression':
            return (new Function(`return ${node.content}`))();
    }
    return;
}

