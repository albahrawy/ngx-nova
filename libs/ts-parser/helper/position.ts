import { IPosition } from "../types/basic";

export class Position {

    static fromArgs(index: number, line?: number, col?: number): IPosition {
        return { index: index, line: line || 0, column: col || 0 }
    }

    static from(pos: number, lineStart: number, curLine: number): IPosition {
        return Position.fromArgs(pos, curLine, pos - lineStart);
    }
    static fromColumnOffset(position: undefined, columnOffset: number): undefined;
    static fromColumnOffset(position: IPosition, columnOffset: number): IPosition;
    static fromColumnOffset(position: IPosition | undefined, columnOffset: number): IPosition | undefined;
    static fromColumnOffset(position: IPosition | undefined, columnOffset: number): IPosition | undefined {
        if (position) {
            const { line, column, index } = position;
            return Position.fromArgs(index + columnOffset, line, (column || 0) + columnOffset);
        }
        return undefined;
    }
}