import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="hero">
      <div class="hero-map">
        <svg viewBox="0 0 400 280" class="road-svg">
          <!-- Segment 1: straight vertical 130m -->
          <rect x="185" y="20" width="30" height="80" rx="4" fill="var(--color-primary)" opacity="0.8"/>
          <!-- Curve 1: left turn 100m -->
          <path d="M185 100 Q185 140 140 145" stroke="var(--color-primary)" stroke-width="30" fill="none" stroke-linecap="round" opacity="0.8"/>
          <!-- Segment 3: straight horizontal 170m -->
          <rect x="30" y="133" width="105" height="24" rx="4" fill="var(--color-primary)" opacity="0.8"/>
          <!-- Curve 2: right turn -->
          <path d="M135 133 Q180 133 185 170" stroke="var(--color-primary)" stroke-width="28" fill="none" stroke-linecap="round" opacity="0.8"/>
          <!-- Segment 5: straight vertical 290m -->
          <rect x="172" y="40" width="24" height="110" rx="4" fill="var(--color-primary)" opacity="0.8"/>
        </svg>
      </div>
    </div>
    <div class="container hero-text">
      <h1>Help ons teer Diamant Laan!</h1>
      <p class="subtitle">Koop 'n vierkante meter vir R500 — en volg jou stukkie pad se vordering.</p>
      <a routerLink="/kaart" class="btn btn-primary">Sien Kaart & Koop &raquo;</a>
      <div class="stats">
        <div class="stat">
          <strong>{{ progress }}%</strong>
          <span>voltooi</span>
        </div>
        <div class="stat">
          <strong>R{{ totalRaised | number:'1.0-0' }}</strong>
          <span>ingesamel</span>
        </div>
        <div class="stat">
          <strong>R500</strong>
          <span>per m&sup2;</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero {
      background: var(--color-primary-light);
    }
    .hero-map {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem 1rem 0;
    }
    .road-svg {
      width: 100%;
      height: auto;
    }
    .hero-text {
      text-align: center;
      padding: 2rem 1rem 3rem;
    }
    .hero-text h1 {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      color: var(--color-text-muted);
      margin-bottom: 1.5rem;
      font-size: 0.9375rem;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 2rem;
    }
    .stat {
      text-align: center;
    }
    .stat strong {
      display: block;
      font-size: 1.25rem;
      color: var(--color-primary);
    }
    .stat span {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    @media (max-width: 480px) {
      .hero-text h1 { font-size: 1.25rem; }
      .stats { gap: 1rem; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private admin = inject(AdminService);
  progress = 0;
  totalRaised = 0;

  ngOnInit() {
    this.admin.getStats().subscribe(stats => {
      this.progress = stats.progress;
      this.totalRaised = stats.totalRaised;
    });
  }
}
