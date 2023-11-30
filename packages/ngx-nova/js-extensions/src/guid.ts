import { is } from "./is";

export namespace GUID {

    /**
     * Generates a new GUID (Globally Unique Identifier).
     * @returns {string} - A new GUID string.
     */
    export function Create(): string {
        const s1 = new Date().valueOf().toString(16);
        const s2 = [...Array(32 - s1.length)].map(_ => (Math.floor(Math.random() * 15) + 1).toString(16)).join('');
        const parts = (s2 + s1).toUpperCase().match(/.{1,4}/g);
        parts![0] = parts!.shift() + parts![0];
        parts![5] += parts!.pop();
        parts![4] += parts!.pop()
        return parts!.join('-');
    }

    /**
     * Validates whether the provided string is a valid GUID.
     * @param {string} guid - The GUID string to be validated.
     * @returns {boolean} - True if the provided string is a valid GUID, false otherwise.
     */
    export function isValid(guid?: string): boolean {
        if (!guid)
            return false;
        const parts = guid.split('-');
        if (parts.length !== 5 ||
            parts[0]?.length !== 8 ||
            parts[1]?.length !== 4 ||
            parts[2]?.length !== 4 ||
            parts[3]?.length !== 4 ||
            parts[4]?.length !== 12)
            return false;
        return parts.every(p => is.numberHex(p));
    }
}