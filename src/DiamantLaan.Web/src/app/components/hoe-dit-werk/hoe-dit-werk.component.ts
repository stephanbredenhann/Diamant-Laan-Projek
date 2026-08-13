import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../shared/icon/icon.component';

@Component({
  selector: 'app-hoe-dit-werk',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="page-hero">
      <img src="diamant_laan_foto.jpg" alt="" class="page-hero-bg" aria-hidden="true" />
      <div class="page-hero-scrim" aria-hidden="true"></div>
      <div class="container page-hero-content">
        <p class="eyebrow page-hero-eyebrow">Hoe dit werk · Diamantlaan-teerprojek</p>
        <h1 class="display page-hero-title">Vier stappe. Geen kaartkennis nodig nie.</h1>
        <p class="page-hero-body">
          Kies hoeveel vierkante meter jy wil finansier, betaal, en kry jou sertifikaat.
          Jy hoef nie met die kaart te werk nie — ons ken die blokkies vir jou toe.
        </p>
      </div>
    </section>

    <section class="section chalk">
      <div class="container">
        <p class="eyebrow">Die stappe</p>
        <h2 class="display section-title">Van bedrag tot sertifikaat.</h2>
        <p class="lead">Die hele proses neem omtrent twee minute.</p>

        <div class="steps">
          @for (step of steps; track step.number; let last = $last) {
            <article class="surface-card step-card">
              <div class="step-icon">
                <app-icon [name]="step.icon" [size]="34" />
                <span class="step-badge" aria-hidden="true">{{ step.number }}</span>
              </div>
              <div class="step-body">
                <h3>{{ step.title }}</h3>
                <p>{{ step.body }}</p>
              </div>
              <span class="display step-ghost" aria-hidden="true">{{ step.number }}</span>
            </article>
            @if (!last) {
              <div class="step-connector" aria-hidden="true">↓</div>
            }
          }
        </div>
      </div>
    </section>

    <section class="section white">