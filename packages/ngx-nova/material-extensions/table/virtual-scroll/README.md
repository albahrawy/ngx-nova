# @ngx-nova/material-extensions-table-virtual-scroll

This package includes a directive to add the virtual scroll feature to Mat-Table or even CDK-TABLE.

## Features:

- Adding a virtual scroll feature to Mat-Table.
- Supporting a custom virtual scroll strategy.
- Using the injected `CdkTableVirtualScrollDataHandler` to handle the datasource, allowing injection of different versions to handle various scenarios, such as remote data sources with paging.

## Installation

You can install this library using npm:

```bash
npm install @ngx-nova/material-extensions-table-virtual-scroll

```

## Usage

```scss

@import '@ngx-nova/material-extensions-table-virtual-scroll/styles/virtual-scroll.scss';

```

```typescript
import { 
  CdkTableVirtualScrollable, 
  CdkTableVirtualScrollDataHandler, 
  CdkTableFixedSizeVirtualScroll 
} from "@ngx-nova/material-extensions-table-virtual-scroll";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CdkTableVirtualScrollable, 
    CdkTableVirtualScrollDataHandler, 
    CdkTableFixedSizeVirtualScroll,
    MatTableModule
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {}

```

## app.component.html

Simply assign the datasource to the virtual-scroll directive instead of mat-table itself [virtual-scroll]="dataSource".

```html
<mat-table [virtual-scroll]="dataSource" [rowHeight]="40">
  <ng-container matColumnDef="name">
    <mat-header-cell *matHeaderCellDef> Name.</mat-header-cell>
    <mat-cell *matCellDef="let element"> {{element.name}} </mat-cell>
    <mat-footer-cell *matFooterCellDef>Footer</mat-footer-cell>
  </ng-container>

  <!-- Any other columns normally -->

  <mat-header-row *matHeaderRowDef="displayedColumns,sticky:true"></mat-header-row>
  <mat-footer-row *matFooterRowDef="displayedColumns,sticky:true"></mat-footer-row>

  <mat-row *matRowDef="let row; columns:displayedColumns"></mat-row>
</mat-table>

```
## notes:

- Adding the **virtual-scroll** directive will apply virtual-scroll behavior to cdk-table or mat-table.
- Assigning the datasource to **[virtual-scroll]** directive will apply the default **CdkTableVirtualScrollDataHandler**, which expects **CdkTableDataSourceInput** to be the same as cdk-table datasource.
- Creating a custom **CdkTableVirtualScrollDataHandler** is allowed. Just add it to the component's imports array or module, and it will be injected into the virtual-scroll directive. For example, to handle remote data chunks.
- The virtual-scroll needs a scroll strategy, similar to **CdkVirtualScrollViewport**. **[rowHeight]="40"** will apply **CdkTableFixedSizeVirtualScroll**. You can implement your custom Scroll Strategy and inject it.