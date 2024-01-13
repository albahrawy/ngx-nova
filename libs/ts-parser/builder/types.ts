import { TsAccessibility } from "../types/basic";


export type RunTimeClass<R, CtorArgs extends unknown[]> = new (...args: CtorArgs) => R;
export type IDictionary<T> = { [key: string]: T };
export type IBiDictionary<T> = IDictionary<IDictionary<T>>;
// eslint-disable-next-line @typescript-eslint/ban-types
export type ValueType = number | bigint | boolean | string | Function | object | RegExp | null;
export type IDecoratorInfo = { name: string; args?: Array<unknown> };
export type ICtorArg = { name: string, typeReference?: string, index: number };
export type IFuncArgs = { name: string; signature?: string, accessibility?: TsAccessibility, typeReference?: string };
export interface ClassBuilderResult<R, CtorArgs extends unknown[]> {
    class: RunTimeClass<R, CtorArgs>;
    decorators: IDictionary<IDecoratorInfo[]>
    dependencies: string[];
}