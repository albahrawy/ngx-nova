import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NOVA_CDK_FLEX_DIRECTIVES } from '@ngx-nova/cdk/flex-layout';
import { enumerableRange } from '@ngx-nova/js-extensions';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';

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
    imports: [NOVA_CDK_FLEX_DIRECTIVES, CommonModule, NovaMatButtonStyle, MatButtonModule]
})
export class FlexLayoutExample {

    shufflePlace(item: FlexExampleItem) {
        item.order = Math.floor(Math.random() * (10 - 0) + 0);
    }
    flexGap: string | null = '5px';
    flexGapMd: string | null = '2px';
    config: FlexExampleItem[] = enumerableRange(0, 10).map(v => {
        return {
            mdBase: 50,
            regualrBase: 33.33,
            xsBase: 100,
            order: v,
            index: v + 1
        }
    });

    removeGaps() {
        this.flexGap = null;
        this.flexGapMd = null;
    }

    addGaps() {
        this.flexGap = '5px';
        this.flexGapMd = '2px';
    }
}