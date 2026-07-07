import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-layout">
      <div class="container">
        <div class="page-header">
          <h2>Admin Paneel</h2>
        </div>
        <nav class="admin-tabs" aria-label="Admin navigasie">
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Kaart</a>
          <a routerLink="/admin/fotos" routerLinkActive="active">Foto's</a>
          <a routerLink="/admin/stats" routerLinkActive="active">Statistieke</a>
          <a routerLink="/admin/gebruikers" routerLinkActive="active">Gebruikers</a>
          <a routerLink="/admin/transaksies" routerLinkActive="active">Transaksies</a>
          <a routerLink="/admin/telefoon-aankoop" routerLinkActive="active">Telefoniese Aankoop</a>
          <a routerLink="/admin/instellings" routerLinkActive="active">Instellings</a>
        </nav>
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .admin-layout { padding: 2rem 0 4rem; }
    .page-header { margin-bottom: 0.75rem; }
    .page-header h2 {
      font-family: var(--font-heading);
      font-size: 1.5rem;
      color: var(--color-text);
    }
    .admin-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.75rem;
    }
    .admin-tabs a {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      color: var(--color-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-family: var(--font-heading);
      transition: background 0.2s, color 0.2s;
    }
    .admin-tabs a:hover {
      color: var(--color-text);
      background: rgba(198, 123, 92, 0.08);
    }
    .admin-tabs a.active {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-weight: 600;
    }
  `]
})
export class AdminLayoutComponent {}
