import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { ClearInputButton } from './clear.directive';
import { DateFormatDirective } from './date-format.directive';
import { DateMaskInput } from './date-mask.directive';
import { NovaDateRangeInput } from './date-range-input/date-range-input';
import { NovaDateInput } from './date.directive';
import { NovaMaskInput } from './mask.directive';
import { NumericInput } from './numeric.directive';
import { NovaPasswordReveal } from './password.directive';

export * from './base/input-button-base.component';
export * from './base/input-button-base.directive';
export * from './clear.directive';
export * from './date-format.directive';
export * from './date-mask.directive';
export * from './date.directive';
export * from './date-range-input/date-range-input';
export * from './numeric.directive';
export * from './password.directive';
export * from './mask.directive';
export * from './types';

export const NOVA_MATERIAL_INPUTS = [MatButtonModule, MatIconModule, MatDatepickerModule,
    NumericInput, ClearInputButton, NovaDateInput, NovaDateRangeInput,
    NovaMaskInput, NovaPasswordReveal, DateFormatDirective, DateMaskInput] as const;