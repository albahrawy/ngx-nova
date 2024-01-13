export const // Initial Parameter flags
    PARAM = 0b0000,
    // track [Yield] production parameter
    PARAM_YIELD = 0b0001,
    // track [Await] production parameter
    PARAM_AWAIT = 0b0010,
    // track [Return] production parameter
    PARAM_RETURN = 0b0100,
    PARAM_IN = 0b1000; // track [In] production parameter

export class ProductionParameterHandler {
    stacks: Array<number> = [];

    enter(flags: number) {
        this.stacks.push(flags);
    }

    exit() {
        this.stacks.pop();
    }

    currentFlags(): number {
        return this.stacks[this.stacks.length - 1];
    }

    get hasAwait(): boolean {
        return (this.currentFlags() & PARAM_AWAIT) > 0;
    }

    get hasYield(): boolean {
        return (this.currentFlags() & PARAM_YIELD) > 0;
    }

    get hasReturn(): boolean {
        return (this.currentFlags() & PARAM_RETURN) > 0;
    }

    get hasIn(): boolean {
        return (this.currentFlags() & PARAM_IN) > 0;
    }
}

export function functionFlags(isAsync: boolean, isGenerator: boolean): number {
    return (isAsync ? PARAM_AWAIT : 0) | (isGenerator ? PARAM_YIELD : 0);
}