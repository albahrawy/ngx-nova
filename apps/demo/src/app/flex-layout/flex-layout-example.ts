import { Component } from '@angular/core';
import { NOVA_CDK_FLEX_DIRECTIVES } from '@ngx-nova/cdk/flex-layout';
import { enumerableRange } from '@ngx-nova/js-extensions';

type FlexExampleItem = {
    mdBase: number | string,
    regualrBase: number | string,
    xsBase: number | string,
    order: number
    index: number
}

@Component({
    selector: 'flex-layout-example',
    templateUrl: 'flex-layout-example.html',
    styleUrl: './flex-layout-example.scss',
    standalone: true,
    imports: [NOVA_CDK_FLEX_DIRECTIVES]
})
export class FlexLayoutExample {

    shufflePlace(item: FlexExampleItem) {
        item.order = Math.floor(Math.random() * (10 - 0) + 0);
    }

    config: FlexExampleItem[] = enumerableRange(0, 10).map(v => {
        return {
            mdBase: 50,
            regualrBase: 33.33,
            xsBase: 100,
            order: v,
            index: v + 1
        }
    });

}