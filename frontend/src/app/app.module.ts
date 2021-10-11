import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';

import { AuthGuard } from '@app/guards';
import { AppComponent } from '@app/app.component';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('@app/pages/login/login.module').then((m) => m.LoginModule),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('@app/pages/home/home.module').then((m) => m.HomeModule),
  },
];

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, RouterModule.forRoot(routes)],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
