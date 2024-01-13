import { MatDateFormats } from '@angular/material/core';

export const MAT_NOVA_DATE_FORMATS: MatDateFormats = {
    parse: {
        dateInput: 'dd/MM/yyyy',
    },
    display: {
        dateInput: 'dd/MM/yyyy',
        monthYearLabel: 'MMMM yyyy',
        dateA11yLabel: 'MMM',
        monthYearA11yLabel: 'MMMM yyyy',
        monthLabel: 'MMMM'
    },
};