import { CharCodes } from "../tokens/charcodes";
import { Nullable } from "../types/internal.types";
type errorFunc = (pos: number, lineStart: number, curLine: number) => void;
type HexCharErrorHandlers = IntErrorHandlers & { invalidEscapeSequence: errorFunc };
type EscapedCharErrorHandlers = HexCharErrorHandlers & CodePointErrorHandlers & { strictNumericEscape: errorFunc; };

const forbiddenNumericSeparatorSiblings = {
    decBinOct: new Set<number>([
        CharCodes.dot,
        CharCodes.uppercaseB,
        CharCodes.uppercaseE,
        CharCodes.uppercaseO,
        CharCodes.underscore, // multiple separators are not allowed
        CharCodes.lowercaseB,
        CharCodes.lowercaseE,
        CharCodes.lowercaseO,
    ]),
    hex: new Set<number>([
        CharCodes.dot,
        CharCodes.uppercaseX,
        CharCodes.underscore, // multiple separators are not allowed
        CharCodes.lowercaseX,
    ]),
};

const isAllowedNumericSeparatorSibling = {
    // 0 - 1
    bin: (ch: number) => ch === CharCodes.digit0 || ch === CharCodes.digit1,

    // 0 - 7
    oct: (ch: number) => ch >= CharCodes.digit0 && ch <= CharCodes.digit7,

    // 0 - 9
    dec: (ch: number) => ch >= CharCodes.digit0 && ch <= CharCodes.digit9,

    // 0 - 9, A - F, a - f,
    hex: (ch: number) =>
        (ch >= CharCodes.digit0 && ch <= CharCodes.digit9) ||
        (ch >= CharCodes.uppercaseA && ch <= CharCodes.uppercaseF) ||
        (ch >= CharCodes.lowercaseA && ch <= CharCodes.lowercaseF),
};

export type IntErrorHandlers = {
    numericSeparatorInEscapeSequence: errorFunc;
    unexpectedNumericSeparator: errorFunc;
    invalidDigit(pos: number, lineStart: number, curLine: number, radix: number): boolean;
};

export type CodePointErrorHandlers = HexCharErrorHandlers & { invalidCodePoint: errorFunc };

export type StringContentsErrorHandlers = EscapedCharErrorHandlers & {
    unterminated(initialPos: number, initialLineStart: number, initialCurLine: number): void;
};

export class StringParser {
    static readInt(input: string, pos: number, lineStart: number, curLine: number, radix: number, len: Nullable<number>,
        forceLen: boolean, allowNumSeparator: boolean | "bail", errors: IntErrorHandlers, bailOnError: boolean)
        : { n: Nullable<number>, pos: number } {

        const start = pos;
        const forbiddenSiblings = radix === 16 ? forbiddenNumericSeparatorSiblings.hex : forbiddenNumericSeparatorSiblings.decBinOct;
        const isAllowedSibling = radix === 16 ? isAllowedNumericSeparatorSibling.hex : radix === 10
            ? isAllowedNumericSeparatorSibling.dec
            : radix === 8 ? isAllowedNumericSeparatorSibling.oct : isAllowedNumericSeparatorSibling.bin;

        let invalid = false;
        let total = 0;

        for (let i = 0, e = len == null ? Infinity : len; i < e; ++i) {
            const code = input.charCodeAt(pos);
            let val;

            if (code === CharCodes.underscore && allowNumSeparator !== "bail") {
                const prev = input.charCodeAt(pos - 1);
                const next = input.charCodeAt(pos + 1);

                if (!allowNumSeparator) {
                    if (bailOnError)
                        return { n: null, pos };
                    errors.numericSeparatorInEscapeSequence(pos, lineStart, curLine);
                } else if (Number.isNaN(next) || !isAllowedSibling(next) || forbiddenSiblings.has(prev) || forbiddenSiblings.has(next)) {
                    if (bailOnError)
                        return { n: null, pos };
                    errors.unexpectedNumericSeparator(pos, lineStart, curLine);
                }
                // Ignore this _ character
                ++pos;
                continue;
            }

            if (code >= CharCodes.lowercaseA)
                val = code - CharCodes.lowercaseA + CharCodes.lineFeed;
            else if (code >= CharCodes.uppercaseA)
                val = code - CharCodes.uppercaseA + CharCodes.lineFeed;
            else if (CharCodes.isDigit(code))
                val = code - CharCodes.digit0; // 0-9
            else
                val = Infinity;

            if (val >= radix) {
                // If we found a digit which is too big, errors.invalidDigit can return true to avoid
                // breaking the loop (this is used for error recovery).
                if (val <= 9 && bailOnError) {
                    return { n: null, pos };
                } else if (val <= 9 && errors.invalidDigit(pos, lineStart, curLine, radix)) {
                    val = 0;
                } else if (forceLen) {
                    val = 0;
                    invalid = true;
                } else {
                    break;
                }
            }
            ++pos;
            total = total * radix + val;
        }
        if (pos === start || (len != null && pos - start !== len) || invalid)
            return { n: null, pos };

        return { n: total, pos };
    }

    static readHexChar(input: string, pos: number, lineStart: number, curLine: number,
        len: number, forceLen: boolean, throwOnInvalid: boolean, errors: HexCharErrorHandlers) {

        const initialPos = pos;
        let n;
        ({ n, pos } = StringParser.readInt(input, pos, lineStart, curLine, 16, len, forceLen, false, errors, !throwOnInvalid));
        if (n == null) {
            if (throwOnInvalid)
                errors.invalidEscapeSequence(initialPos, lineStart, curLine);
            else
                pos = initialPos - 1;
        }
        return { code: n, pos };
    }

    static readCodePoint(
        input: string, pos: number, lineStart: number, curLine: number, throwOnInvalid: boolean, errors: CodePointErrorHandlers) {

        const ch = input.charCodeAt(pos);
        let code;

        if (ch === CharCodes.leftCurlyBrace) {
            ++pos;
            ({ code, pos } = StringParser.readHexChar(input, pos, lineStart, curLine, input.indexOf("}", pos) - pos, true, throwOnInvalid, errors));
            ++pos;
            if (code != null && code > 0x10ffff) {
                if (throwOnInvalid)
                    errors.invalidCodePoint(pos, lineStart, curLine);
                else
                    return { code: null, pos };
            }
        } else {
            ({ code, pos } = StringParser.readHexChar(input, pos, lineStart, curLine, 4, false, throwOnInvalid, errors));
        }
        return { code, pos };
    }

    static readStringContents(type: "single" | "double" | "template", input: string,
        pos: number, lineStart: number, curLine: number, errors: StringContentsErrorHandlers) {

        const initialPos = pos;
        const initialLineStart = lineStart;
        const initialCurLine = curLine;
        let out = "";
        let firstInvalidLoc = null;
        let chunkStart = pos;
        const { length } = input;
        for (; ;) {
            if (pos >= length) {
                errors.unterminated(initialPos, initialLineStart, initialCurLine);
                out += input.slice(chunkStart, pos);
                break;
            }
            const ch = input.charCodeAt(pos);
            if (StringParser.isStringEnd(type, ch, input, pos)) {
                out += input.slice(chunkStart, pos);
                break;
            }
            if (ch === CharCodes.backslash) {
                out += input.slice(chunkStart, pos);
                const res = StringParser.readEscapedChar(input, pos, lineStart, curLine, type === "template", errors);
                if (res.ch === null && !firstInvalidLoc)
                    firstInvalidLoc = { pos, lineStart, curLine };
                else
                    out += res.ch;
                ({ pos, lineStart, curLine } = res);
                chunkStart = pos;
            } else if (ch === CharCodes.lineSeparator || ch === CharCodes.paragraphSeparator) {
                ++pos;
                ++curLine;
                lineStart = pos;
            } else if (ch === CharCodes.lineFeed || ch === CharCodes.carriageReturn) {
                if (type === "template") {
                    out += input.slice(chunkStart, pos) + "\n";
                    ++pos;
                    if (ch === CharCodes.carriageReturn && input.charCodeAt(pos) === CharCodes.lineFeed)
                        ++pos;
                    ++curLine;
                    chunkStart = lineStart = pos;
                } else {
                    errors.unterminated(initialPos, initialLineStart, initialCurLine);
                }
            } else {
                ++pos;
            }
        }
        return { pos, str: out, firstInvalidLoc, lineStart, curLine, containsInvalid: !!firstInvalidLoc };
    }

    static isStringEnd(type: "single" | "double" | "template", ch: number, input: string, pos: number) {
        if (type === "template") {
            return (
                ch === CharCodes.graveAccent ||
                (ch === CharCodes.dollarSign && input.charCodeAt(pos + 1) === CharCodes.leftCurlyBrace)
            );
        }
        return (ch === (type === "double" ? CharCodes.quotationMark : CharCodes.apostrophe));
    }

    static readEscapedChar(input: string, pos: number, lineStart: number,
        curLine: number, inTemplate: boolean, errors: EscapedCharErrorHandlers) {

        const throwOnInvalid = !inTemplate;
        pos++; // skip '\'

        const res = (ch: string | null) => ({ pos, ch, lineStart, curLine });
        const ch = input.charCodeAt(pos++);
        switch (ch) {
            case CharCodes.lowercaseN:
                return res("\n");
            case CharCodes.lowercaseR:
                return res("\r");
            case CharCodes.lowercaseX: {
                let code;
                ({ code, pos } = StringParser.readHexChar(input, pos, lineStart, curLine, 2, false, throwOnInvalid, errors));
                return res(code == null ? null : String.fromCharCode(code));
            }
            case CharCodes.lowercaseU: {
                let code;
                ({ code, pos } = StringParser.readCodePoint(input, pos, lineStart, curLine, throwOnInvalid, errors));
                return res(code == null ? null : String.fromCodePoint(code));
            }
            case CharCodes.lowercaseT:
                return res("\t");
            case CharCodes.lowercaseB:
                return res("\b");
            case CharCodes.lowercaseV:
                return res("\u000b");
            case CharCodes.lowercaseF:
                return res("\f");
            // @ts-expect-error fall through
            case CharCodes.carriageReturn:
                if (input.charCodeAt(pos) === CharCodes.lineFeed)
                    ++pos;
            // fall through
            // @ts-expect-error fall through
            case CharCodes.lineFeed:
                lineStart = pos;
                ++curLine;
            // fall through
            case CharCodes.lineSeparator:
            case CharCodes.paragraphSeparator:
                return res("");
            case CharCodes.digit8:
            // @ts-expect-error fall through
            case CharCodes.digit9:
                if (inTemplate) {
                    return res(null);
                } else {
                    errors.strictNumericEscape(pos - 1, lineStart, curLine);
                }
            // fall through
            default:
                if (ch >= CharCodes.digit0 && ch <= CharCodes.digit7) {
                    const startPos = pos - 1;
                    const match = input.slice(startPos, pos + 2).match(/^[0-7]+/)!;

                    let octalStr = match[0];

                    let octal = parseInt(octalStr, 8);
                    if (octal > 255) {
                        octalStr = octalStr.slice(0, -1);
                        octal = parseInt(octalStr, 8);
                    }
                    pos += octalStr.length - 1;
                    const next = input.charCodeAt(pos);
                    if (octalStr !== "0" || next === CharCodes.digit8 || next === CharCodes.digit9) {
                        if (inTemplate)
                            return res(null);
                        else
                            errors.strictNumericEscape(startPos, lineStart, curLine);
                    }

                    return res(String.fromCharCode(octal));
                }

                return res(String.fromCharCode(ch));
        }
    }
}