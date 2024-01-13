import { ParserError } from "../errors/errors";
import { State } from "../helper/state";
import { ErrorDetails, IOptions, RaiseProperties } from "./basic";

export interface IParser {
    inModule: boolean;
    state: State;
    readonly options: IOptions;
    raise<T>(errorDetails: ErrorDetails, raiseProperties: RaiseProperties<T>): ParserError<T>;
}

export interface IParseSubscriptState {
    optionalChainMember: boolean;
    maybeAsyncArrow: boolean;
    stop: boolean;
}

export interface IParseClassMemberState {
    hadConstructor: boolean;
    hadSuperClass: boolean;
}