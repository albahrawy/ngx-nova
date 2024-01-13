export type PasswordRevealMode = 'click' | 'hover';
export type PasswordRevealButtonMode = 'always' | 'value' | 'none' | '' | undefined;
export type DateRangeRequired = "start" | "end" | "both" | '' | undefined
export interface IDateRange<D> {
    start?: D | string | null,
    end?: D | string | null;
}