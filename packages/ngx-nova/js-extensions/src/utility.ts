import { arrays } from "./array";
import { dates } from "./date";
import { GUID } from "./guid";
import { is as _is } from "./is";
import { json as _json } from "./json";
import { numbers } from "./number";
import { objects } from "./objects";
import { strings } from "./strings";
import { to as _to } from "./to";

export namespace utility {
    export const array = arrays;
    export const date = dates;
    export const is = _is;
    export const json = _json;
    export const number = numbers;
    export const object = objects
    export const string = strings;
    export const to = _to;
    export const guid = GUID;
}