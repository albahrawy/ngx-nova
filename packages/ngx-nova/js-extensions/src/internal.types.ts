export type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
export type SpreadTwo<L, R> = Id<{ [K in keyof L | keyof R]: K extends keyof L & keyof R ? L[K] & R[K]
    : K extends keyof L ? L[K] : K extends keyof R ? R[K] : never; }>;
export type Spread<A extends [...any]> = A extends [infer L, ...infer R] ? SpreadTwo<L, Spread<R>> : unknown;
export type SpreadBi<F, S> = Spread<[F, S]>;