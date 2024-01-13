export type ListTogglePosition = 'after' | 'before' | 'none' | '' | undefined;
export type ListIconType = 'icon' | 'avatar' | 'none' | '' | undefined;
export type ListCategorizedMode = 'none' | 'sticky' | 'split' | undefined;
export type ListFilterPredicate<T> = (data: T, filter: string) => boolean;