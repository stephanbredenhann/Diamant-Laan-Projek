import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RoadService } from '../../services/road.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="hero">
      <div class="hero-map">
        <!--
          Decorative road silhouette matching the real Diamant Laan layout.
          ViewBox proportions match the full road map (portrait shape).
          Road width shown at 20px for visual impact; actual road is 6m wide.

          Road path (top → bottom):
            Seg1 – 130m vertical  (top-right)
            Seg2+3 – 270m horizontal (left turn)
            Seg4 – kink / corner
            Seg5 – 290m vertical  (bottom-left)
        -->
        <svg viewBox="0 0 300 440" class="road-svg">
          <!-- Seg1: short vertical at top-right -->
          <rect x="264" y="10" width="20" height="110" rx="5" fill="var(--color-primary)" opacity="0.85"/>
          <!-- Corner join – rounds the elbow -->
          <rect x="244" y="110" width="40" height="20" rx="5" fill="var(--color-primary)" opacity="0.85"/>
          <!-- Horizontal section (Seg2 + Seg3) -->
          <rect x="16" y="110" width="228" height="20" rx="5" fill="var(--color-primary)" opacity="0.85"/>
          <!-- Kink / corner at bottom-left -->
          <rect x="16" y="130" width="20" height="10" rx="3" fill="var(--color-primary)" opacity="0.85"/>
          <!-- Seg5: long vertical at bottom-left -->
          <rect x="16" y="140" width="20" height="280" rx="5" fill="var(--color-primary)" opacity="0.85"/>
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
      max-width: 220px;
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
  private road = inject(RoadService);
  progress = 0;
  totalRaised = 0;

  ngOnInit() {
    this.road.getStats().subscribe(stats => {
      this.progress = stats.progress;
      this.totalRaised = stats.totalRaised;
    });
  }
}
