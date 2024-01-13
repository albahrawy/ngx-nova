import { ParserError } from "../errors/errors";
import { tokenContextTypes, tokenTypes } from "../tokens/tokens";
import { ErrorDetails, IPosition, IStateLabel, ITokenContext } from "../types/basic";
import { ICommentWhitespace } from "../types/nodes";
import { ICommentNode } from "../types/nodes.common";
export class State {

    strict: boolean = true;
    position: number = 0;
    start: number = 0;
    end: number = 0;
    currentLine: number = 1;
    lineStart: number = -0;
    startLocation: IPosition = { line: 1, column: 0, index: 0 };
    endLocation: IPosition = { line: 1, column: 0, index: 0 };
    lastTokenStartLocation?: IPosition;
    lastTokenEndLocation?: IPosition;
    lastTokenStart: number = 0;
    firstInvalidTemplateEscapePos?: IPosition;
    canStartJSXElement: boolean = true;
    type: number = tokenTypes.eof;
    inType: boolean = false;
    value: unknown = null;
    containsEsc: boolean = false;
    errors: ParserError<unknown>[] = [];
    comments: Array<ICommentNode> = [];
    commentStack: Array<ICommentWhitespace> = [];
    strictErrors: Map<number, [ErrorDetails, IPosition]> = new Map();
    tokensLength: number = 0;
    labels: Array<IStateLabel> = [];
    potentialArrowAt: number = -1;
    soloAwait: boolean = false;
    maybeInArrowParameters: boolean = false;
    inFSharpPipelineDirectBody: boolean = false;
    isAmbientContext: boolean = false;
    inDisallowConditionalTypesContext: boolean = false;
    context: Array<ITokenContext> = [tokenContextTypes.brace];
    inAbstractClass: boolean = false;
    dependencies: string[] = [];

    currentPosition(): IPosition {
        return { line: this.currentLine, column: this.position - this.lineStart, index: this.position };
    }

    clone(skipArrays?: boolean): State {
        const state = new State();
        const keys = Object.keys(this) as (keyof State)[];
        for (let i = 0, length = keys.length; i < length; i++) {
            const key = keys[i];
            let val = this[key];

            if (!skipArrays && Array.isArray(val))
                val = val.slice();
            (state as Record<keyof State, unknown>)[key] = val;
        }
        return state;
    }
}