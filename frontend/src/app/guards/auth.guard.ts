import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { WalletService } from '@app/services';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private walletService: WalletService) {}

  canActivate(): Observable<boolean> {
    return this.walletService.connected$.pipe(
      tap((connected) => {
        if (!connected) {
          this.router.navigate(['login'], { skipLocationChange: true });
        }
      })
    );
  }
}
