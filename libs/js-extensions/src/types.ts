/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @license
 * Copyright albahrawy All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at the root.
 */
import { Spread } from "./internal/types";

export type Constructor<T = any> = new (...args: any[]) => T;
export type IFunc<I, O> = (arg: I) => O;
export type IDictionary<T> = Record<string, T>;
export type IGenericDictionary = Record<string, any>;
export type IStringDictionary = Record<string, string>;
export type IGenericArray = Array<any>;
export type Nullable<V> = V | null | undefined;
export type MergedObject<T extends [...any]> = Spread<T>;
export type ValueMap = {
    boolean: boolean;
    date: Date | undefined;
    dateTime: Date | undefined;
    int: number;
    number: number;
    string: string;
};

export type ValueType = keyof ValueMap | '';

export interface INumberFormatOptions extends Intl.NumberFormatOptions {
    padChar?: string,
    padLength?: number,
}