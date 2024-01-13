import { Component, Directive, Input, ViewChild } from '@angular/core';
import { TableMenuItem } from './types';
import { MatButtonModule } from '@angular/material/button';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { NovaTranslatePipe } from '@ngx-nova/cdk/localization';

@Component({
    selector: 'nova-table-menu-container',
    standalone: true,
    imports: [MatButtonModule, MatMenuModule, MatIconModule, NovaTranslatePipe],
    host: {
        'class': 'nova-table-menu-container'
    },
    template: `
        <mat-menu #headerMenu="matMenu">
            <ng-template matMenuContent>
                @for (item of headerMenuItems; track $index)
                    {
                        <button mat-menu-item (click)="headerMenuClicked.emit(item.key,)">
                            <mat-icon>{{item.icon}}</mat-icon>
                            <span>{{item.text|novaTranslate}}</span>
                        </button>
                    } 
            </ng-template>
        </mat-menu>
        <mat-menu #rowContextMenu="matMenu">
            @for (item of rowContextMenuitems; track $index)
                {
                    <button mat-menu-item>
                        <mat-icon>{{item.icon}}</mat-icon>
                        <span>{{item.text|novaTranslate}}</span>
                    </button>
                } 
        </mat-menu>
    `
})
class TableMenuContainer {
    @Input() headerMenuItems: TableMenuItem[] = [];
    @Input() rowContextMenuitems: TableMenuItem[] = [];
    @ViewChild('headerMenu', { static: true }) headerMenu!: MatMenu;
    @ViewChild('rowContextMenu', { static: true }) rowContextMenu!: MatMenu;
}



@Directive({
    selector: 'cdk-table[headerMenu], mat-table[headerMenu], cdk-table[rowContextMenu], mat-table[rowContextMenu]',
    standalone: true,
})
export class CdkTableHeaderMenuDirective {

    @Input() headerMenu: TableMenuItem[] = [];
    @Input() rowContextMenu: TableMenuItem[] = [];
}