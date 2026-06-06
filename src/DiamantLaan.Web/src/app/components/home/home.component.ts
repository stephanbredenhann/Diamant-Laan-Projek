import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoadService } from '../../services/road.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-text">
          <h1>Dra by: Ons teer<br>Diamant Laan</h1>
          <p class="hero-sub">Koop 'n vierkante meter vir <strong>R500</strong> en volg jou stukkie pad se vordering; stap vir stap.</p>
          <div class="hero-actions">
            <a routerLink="/kaart" class="btn btn-primary btn-lg">
              Sien Kaart & Koop
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            @if (!auth.currentUser()) {
              <a routerLink="/registreer" class="btn btn-outline">Registreer Gratis</a>
            }
          </div>
        </div>
        <div class="hero-image">
          <img src="diamant_laan_foto.jpg" alt="Diamant Laan pad" class="hero-photo">
        </div>
      </div>
    </section>

    <div class="container">
      <div class="stats-card">
        <div class="stat">
          <div class="stat-value">{{ progress }}<small>%</small></div>
          <div class="stat-label">Voltooi</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <div class="stat-value">R{{ totalRaised | number:'1.0-0' }}</div>
          <div class="stat-label">Ingesamel</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <div class="stat-value">R500</div>
          <div class="stat-label">Per m²</div>
        </div>
      </div>
    </div>

    <section class="how-it-works">
      <div class="container">
        <h2>Hoe Werk Dit?</h2>
        <div class="steps">
          <div class="step">
            <div class="step-icon">1</div>
            <h3>Kies jou blokke</h3>
            <p>Gebruik die interaktiewe kaart om enige beskikbare vierkante meter te kies wat jy wil borg.</p>
          </div>
          <div class="step">
            <div class="step-icon">2</div>
            <h3>Maak 'n bydrae</h3>
            <p>Elke vierkante meter kos R500. Elke bietjie bring ons nader aan 'n geteerde pad.</p>
          </div>
          <div class="step">
            <div class="step-icon">3</div>
            <h3>Volg die vordering</h3>
            <p>Kyk hoe jou blok van grond tot teer verander. Sien die impak wat jy maak.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="container">
        <div class="cta-card">
          <h2>Wees deel van die verandering</h2>
          <p>Diamant Laan is meer as net 'n pad — dis die hart van ons gemeenskap. Saam maak ons dit moontlik.</p>
          <a routerLink="/kaart" class="btn btn-primary btn-lg">
            Begin Kies
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero {
      background: var(--color-brown);
      padding: 3rem 0 4rem;
      color: #F5F0E1;
    }
    .hero-grid {
      display: flex;
      align-items: center;
      gap: 3rem;
    }
    .hero-text { flex: 1; }
    .hero-text h1 {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 700;
      color: #F5F0E1;
      line-height: 1.15;
      margin-bottom: 1rem;
      letter-spacing: -0.5px;
    }
    .hero-sub {
      font-family: var(--font-body);
      font-size: 1.125rem;
      color: #D4C4A8;
      line-height: 1.6;
      margin-bottom: 1.75rem;
      max-width: 460px;
    }
    .hero-sub strong { color: #F5F0E1; }
    .hero-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .btn-lg {
      padding: 0.875rem 2rem;
      font-size: 1rem;
      border-radius: var(--radius-sm);
    }
    .hero-image { flex: 1; max-width: 480px; }
    .hero-photo {
      width: 100%;
      height: 260px;
      object-fit: cover;
      border-radius: var(--radius);
      border: 2px solid rgba(212,196,168,0.25);
      display: block;
    }
    .stats-card {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 1.5rem 2rem;
      margin-top: -2.5rem;
      position: relative;
      z-index: 10;
    }
    .stat { text-align: center; flex: 1; padding: 0 1.5rem; }
    .stat-value {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.2;
    }
    .stat-value small {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-muted);
    }
    .stat-label {
      font-family: var(--font-heading);
      font-size: 0.6875rem;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 0.25rem;
    }
    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--color-border);
      flex-shrink: 0;
    }
    .how-it-works {
      padding: 5rem 0;
    }
    .how-it-works h2 {
      text-align: center;
      font-size: 1.75rem;
      margin-bottom: 2.5rem;
      color: var(--color-text);
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    .step {
      text-align: center;
      padding: 2rem 1.5rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .step:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow);
    }
    .step-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--color-olive);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
    }
    .step h3 {
      font-size: 1.0625rem;
      margin-bottom: 0.5rem;
      color: var(--color-text);
    }
    .step p {
      font-size: 0.875rem;
      color: var(--color-muted);
      line-height: 1.6;
    }
    .cta-section {
      padding: 3rem 0 5rem;
    }
    .cta-card {
      background: var(--color-brown);
      border-radius: var(--radius);
      padding: 3rem 2rem;
      text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .cta-card h2 {
      color: #F5F0E1;
      font-size: 1.75rem;
      margin-bottom: 0.75rem;
    }
    .cta-card p {
      color: #D4C4A8;
      font-size: 1rem;
      max-width: 500px;
      margin: 0 auto 1.75rem;
      line-height: 1.6;
    }
    @media (max-width: 768px) {
      .hero-grid { flex-direction: column; gap: 2rem; }
      .hero-text h1 { font-size: 1.875rem; }
      .hero-text { text-align: center; }
      .hero-sub { margin: 0 auto 1.5rem; }
      .hero-actions { justify-content: center; }
      .hero-image { max-width: 100%; }
      .steps { grid-template-columns: 1fr; }
      .stats-card { flex-direction: column; gap: 1rem; padding: 1.25rem 1rem; }
      .stat-divider { width: 100%; height: 1px; }
    }
    @media (max-width: 480px) {
      .hero-text h1 { font-size: 1.5rem; }
      .how-it-works h2, .cta-card h2 { font-size: 1.375rem; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private road = inject(RoadService);
  auth = inject(AuthService);
  progress = 0;
  totalRaised = 0;

  ngOnInit() {
    this.road.getStats().subscribe(stats => {
      this.progress = stats.progress;
      this.totalRaised = stats.totalRaised;
    });
  }
}
