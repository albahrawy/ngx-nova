/** @internal */
export function _addMissingDateComponents(format: string) {
    return format.replace(/d/, 'X').replace(/d/g, '').replace(/X/, 'dd')
        .replace(/M/, 'X').replace(/M/g, '').replace(/X/, 'MM')
        .replace(/y/, 'X').replace(/y/g, '').replace(/X/, 'yyyy');
}