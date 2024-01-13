import { Nullable } from "../types/internal.types";
import { IHasLocation } from "./basic";

export type AssignmentOperator = | "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "|=" | "^=" | "&=";
export type UnaryOperator = | "-" | "+" | "!" | "~" | "typeof" | "void" | "delete" | "throw";
export type UpdateOperator = "++" | "--";
export type BinaryOperator = | "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in" | "instanceof";
export type LogicalOperator = "||" | "&&";
export type TsOperator = "keyof" | "unique" | "readonly";
export type VariableKind = "var" | "let" | "const" | "using" | "await using";
export type AnyOperator = AssignmentOperator | UnaryOperator | UpdateOperator | BinaryOperator | LogicalOperator | TsOperator;
export type LiteralDirectiveType = 'RegExpLiteral' | 'NumericLiteral' | 'BigIntLiteral' | 'DecimalLiteral' | 'StringLiteral'
    | 'NullLiteral' | 'BooleanLiteral' | 'InterpreterDirective' | 'DirectiveLiteral';

export interface IElementBase extends IHasLocation {
    type: string;
}

export interface ICommentNode extends IElementBase {
    type: "CommentBlock" | "CommentLine";
    value: string;
}

export interface NodeBase extends IElementBase {
    type: string;
    content?: string;
    leadingComments?: Array<ICommentNode>;
    trailingComments?: Array<ICommentNode>;
    innerComments?: Array<ICommentNode>;
}

export type INodeBase<T extends string> = NodeBase & { type: T; }
export type IHasChildren<T extends NodeBase, N extends boolean = true> = { children: Array<N extends true ? Nullable<T> : T> }
export type IHasProperties<T extends NodeBase> = { properties: Array<Nullable<T>> }
export type IHasBody<T extends NodeBase, N extends boolean = false> = { body: N extends true ? Nullable<T> : T; }
export type IHasKey<T extends NodeBase, N extends boolean = false> = { key: N extends true ? Nullable<T> : T; }
export type IHasKind<T extends string, O extends boolean = false> = { kind: O extends true ? T | undefined : T };
export type IHasComputed = { computed: boolean; }
export type IHasExpression<T extends NodeBase, N extends boolean = true> = { expression: N extends true ? T | undefined : T; }
export type IHasArgument<T extends NodeBase, N extends boolean = true> = { argument: N extends true ? Nullable<T> : T; }
export type IHasParams<T extends NodeBase, N extends boolean = false> = { params: Array<N extends true ? Nullable<T> : T> };
export type IHasOperator<T extends AnyOperator> = { operator: T; }
export type ICompositeExpression<L extends NodeBase, R extends NodeBase> = { left: L; right: R; }
export type ICompositeOperatorNode<T extends string, L extends NodeBase, R extends NodeBase, O extends AnyOperator>
    = IHasOperator<O> & ICompositeNode<T, L, R>;
export type ICompositeNode<T extends string, L extends NodeBase, R extends NodeBase> = INodeBase<T> & ICompositeExpression<L, R>;
export type IHasTypeAnnotation<T extends NodeBase, N extends boolean = true> = { typeAnnotation: N extends true ? Nullable<T> : T; }
export type IParenthesized = { parenthesized?: boolean; parentStart?: number }
export type IHasDirectives = { directives?: Array<IDirective>; }
export type IHasDeclare = { declare?: true; }

export type ILiteralBase<TType extends LiteralDirectiveType, TValue> = INodeBase<TType> & { value: TValue; rawValue: string; }
export type IDirectiveLiteral = ILiteralBase<'DirectiveLiteral', string>;
export type IDirective = INodeBase<"Directive"> & { value: IDirectiveLiteral; }
export type ITypeAnnotation = INodeBase<"TypeAnnotation"> & IHasTypeAnnotation<NodeBase>;

export type IStringLiteral = ILiteralBase<'StringLiteral', string>;
export type INumericLiteral = ILiteralBase<'NumericLiteral', number>;
export type IDecimalLiteral = ILiteralBase<'DecimalLiteral', number>;
export type IBooleanLiteral = ILiteralBase<'BooleanLiteral', boolean>;
export type INullLiteral = ILiteralBase<'NullLiteral', null>;
export type IBigIntLiteral = ILiteralBase<'BigIntLiteral', bigint>;
export interface IRegExpLiteral extends ILiteralBase<"RegExpLiteral", string> {
    pattern: string;
    flags: ("g" | "i" | "m" | "u" | "s" | "y" | "v")[];
}

export type ILiteralExpression = IStringLiteral | INumericLiteral | IBooleanLiteral | IBigIntLiteral | INullLiteral
    | IDecimalLiteral | IRegExpLiteral;

export interface IEstreeLiteral extends INodeBase<"Literal"> { value: unknown; }

export interface ITypeParameter extends INodeBase<"TypeParameter"> {
    name: string;
    default?: ITypeAnnotation;
}


