import { IStringDictionary } from "@ngx-nova/js-extensions";

export interface TableMenuItem {
    text: string | IStringDictionary;
    icon?: string;
    key: string
}