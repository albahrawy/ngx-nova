import { Component } from '@angular/core';
import { TableButtonsComponent } from './table-buttons/table-buttons';
import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NOVA_TABLE_VIRTUAL_SCROLL } from '@ngx-nova/table-extensions/virtual-scroll';



@Component({
  selector: 'cdk-table-virtual-scroll',
  templateUrl: './cdk-table.component.html',
  styleUrls: ['./cdk-table.component.scss'],
  standalone: true,
  imports: [CommonModule, NOVA_TABLE_VIRTUAL_SCROLL, TableButtonsComponent, CdkTableModule]
})
export class TestCdkTableComponent {
}
