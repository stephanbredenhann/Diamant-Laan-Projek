import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { SiteFooterComponent } from './components/shared/site-footer/site-footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SiteFooterComponent],
  template: `
    @if (!kaal()) {
      <app-navbar></app-navbar>
    }
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-site-footer></app-site-footer>
  `
})
export class AppComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  /**
   * A route marked `kaal` in app.routes.ts hides the navigation: the public share page is
   * somebody's certificate, not a page of this site's menu. Only top-level routes are checked,
   * which is all that has ever needed it.
   */
  kaal = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => !!this.route.firstChild?.snapshot.data['kaal'])
    ),
    { initialValue: false }
  );
}
