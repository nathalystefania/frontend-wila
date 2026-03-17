import { Routes } from '@angular/router';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
    { 
        path: '',
        component: OnboardingComponent
    },
    {
        path: 'dashboard',
        component: DashboardComponent
    }
];
