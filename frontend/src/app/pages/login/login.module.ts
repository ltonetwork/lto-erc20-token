import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { LoginComponent } from '@app/pages/login';

const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
];

@NgModule({
  declarations: [LoginComponent],
  imports: [RouterModule.forChild(routes), MatButtonModule],
  providers: [],
})
export class LoginModule {}
