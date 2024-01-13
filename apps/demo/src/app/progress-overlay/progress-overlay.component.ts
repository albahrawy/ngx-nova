import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ThemePalette } from '@angular/material/core';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';
import { NovaOverlayProgress, ProgressMode, ProgressPosition } from '@ngx-nova/cdk/shared';

@Component({
  selector: 'app-test-progress-overlay',
  standalone: true,
  imports: [MatButtonModule, NovaOverlayProgress, NovaMatButtonStyle],
  templateUrl: './progress-overlay.component.html',
  styleUrls: ['./progress-overlay.component.scss']
})
export class TestProgressOverlayComponent {
  progressValue = 40;
  mode: ProgressMode = 'indeterminate';
  position: ProgressPosition = 'start';
  isLoading = false;
  showLoading: 'spinner' | 'bar' = 'spinner';
  color: ThemePalette = 'primary';

  changeValue() {
    this.progressValue += 10;
  }

  changeColor() {
    this.color = this.color == 'primary' ? 'warn' : 'primary';

  }

  changeMode() {
    this.mode = this.mode == 'determinate' ? 'indeterminate' : 'determinate';
  }
  reset() {
    this.progressValue = 0;
  }
  changeDisplayMode() {
    this.showLoading = this.showLoading == 'spinner' ? 'bar' : 'spinner';
  }

  toggleShow() {
    this.isLoading = !this.isLoading;

  }
}
