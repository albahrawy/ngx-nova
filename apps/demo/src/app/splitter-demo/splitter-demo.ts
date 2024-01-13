/* eslint-disable @typescript-eslint/no-explicit-any */
//import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
//import { NOVA_SPLITTER, NovaSplit, PrimeTemplate, SplitAreaDirective, Splitter } from '@ngx-nova/components';
import { NOVA_SPLITTER, NovaSplitPanelDirective, NovaSplitComponent, SplitOrientation, SplitterResizeEvent } from '@ngx-nova/components';
@Component({
    selector: 'test-init-cmp',
    template: 'Test Panel Cycle',
    standalone: true,
    encapsulation: ViewEncapsulation.None,
})
export class SplitterTESTINITDemo implements OnInit {
    ngOnInit(): void {
        console.log('init');
    }

}



@Component({
    selector: 'splitter-demo',
    templateUrl: './splitter-demo.html',
    styleUrl: './splitter-demo.scss',
    host: { 'class': 'host-component' },
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [NOVA_SPLITTER]
    //imports: [NOVA_SPLITTER, CommonModule, PrimeTemplate, Splitter, SplitAreaDirective, NovaSplit, SplitterTESTINITDemo]
    // imports: [CommonModule, PrimeTemplate, Splitter]
})
export class SplitterDemo {
    order = 0;

    @ViewChild('split') split!: NovaSplitComponent
    @ViewChild('area1') area1!: NovaSplitPanelDirective
    @ViewChild('area2') area2!: NovaSplitPanelDirective
    visible = true;
    direction: SplitOrientation = 'horizontal';
    sizes: any = {
        percentWithoutWildcards: {
            area1: 30,
            area2: 70,
        },
        percentWithWildcards: {
            area1: 'auto',
            area2: 20,
            area3: 20,
            area4: 10,
        },
        pixel: {
            area1: 120,
            area2: 'auto',
            area3: 160,
        },
    }

    constructor() {
        setTimeout(() => {
            console.log('>>> split > ', this.split)
            console.log('>>> area1 > ', this.area1)
            console.log('>>> area2 > ', this.area2)
        }, 1000)
    }

    dragEndPercentWithoutWildcards(args: SplitterResizeEvent) {
        const sizes = args.getPanelSizes();
        this.sizes.percentWithoutWildcards.area1 = sizes[0]
        this.sizes.percentWithoutWildcards.area2 = sizes[1]
    }

    dragEndPercentWithWildcards(args: SplitterResizeEvent) {
        const sizes = args.getPanelSizes();
        this.sizes.percentWithWildcards.area1 = sizes[0]
        this.sizes.percentWithWildcards.area2 = sizes[1]
        this.sizes.percentWithWildcards.area3 = sizes[2]
        this.sizes.percentWithWildcards.area4 = sizes[3]
    }

    toggleOrder() {
        this.order = this.order === 0 ? 2 : 0;
    }
}


