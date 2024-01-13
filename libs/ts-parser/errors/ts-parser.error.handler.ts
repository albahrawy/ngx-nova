import { Position } from "../helper/position";
import { CodePointErrorHandlers, IntErrorHandlers, StringContentsErrorHandlers } from "../helper/string-parser";
import { ErrorDetails, IPosition } from "../types/basic";
import { IParser } from "../types/parser.interface";
import { Errors } from "./errors";

export const errorHandlers = {
    errorBuilder: (parser: IParser, error: ErrorDetails) =>
        (pos: number, lineStart: number, curLine: number) =>
            parser.raise(error, { at: Position.from(pos, lineStart, curLine) }),

    recordStrictModeErrors: (parser: IParser, errorDetails: ErrorDetails, { at }: { at: IPosition }) => {
        const index = at.index;
        if (parser.state.strict && !parser.state.strictErrors.has(index))
            parser.raise(errorDetails, { at });
        else
            parser.state.strictErrors.set(index, [errorDetails, at]);
    },

    readInt: (parser: IParser) => ({
        invalidDigit: (pos, lineStart, curLine, radix) => {
            if (!parser.options.continueOnerror)
                return false;
            parser.raise(Errors.InvalidDigit, { at: Position.from(pos, lineStart, curLine), radix });
            return true;
        },
        numericSeparatorInEscapeSequence: errorHandlers.errorBuilder(parser, Errors.NumericSeparatorInEscapeSequence),
        unexpectedNumericSeparator: errorHandlers.errorBuilder(parser, Errors.UnexpectedNumericSeparator)
    }) as IntErrorHandlers,

    readCodePoint: (parser: IParser) => ({
        ...errorHandlers.readInt(parser),
        invalidEscapeSequence: errorHandlers.errorBuilder(parser, Errors.InvalidEscapeSequence),
        invalidCodePoint: errorHandlers.errorBuilder(parser, Errors.InvalidCodePoint)
    }) as CodePointErrorHandlers,

    readStringContent: (parser: IParser) => ({
        ...errorHandlers.readCodePoint(parser),
        strictNumericEscape: (pos, lineStart, curLine) =>
            errorHandlers.recordStrictModeErrors(parser, Errors.StrictNumericEscape, { at: Position.from(pos, lineStart, curLine) }),
        unterminated: (pos, lineStart, curLine) => {
            throw parser.raise(Errors.UnterminatedString, { at: Position.from(pos - 1, lineStart, curLine) });
        },
    }) as StringContentsErrorHandlers,

    readStringTemplate: (parser: IParser) => ({
        ...errorHandlers.readCodePoint(parser),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        strictNumericEscape: (pos, lineStart, curLine) => errorHandlers.errorBuilder(parser, Errors.StrictNumericEscape),
        unterminated: (pos, lineStart, curLine) => {
            throw parser.raise(Errors.UnterminatedTemplate, { at: Position.from(pos, lineStart, curLine) });
        },
    }) as StringContentsErrorHandlers

};