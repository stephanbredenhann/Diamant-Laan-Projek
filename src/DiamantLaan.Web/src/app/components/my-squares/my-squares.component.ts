import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { SquareStatus } from '../../models/square';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { ImageLightboxComponent } from '../shared/image-lightbox/image-lightbox.component';
import { ShareButtonComponent } from '../shared/share-button/share-button.component';
import { IconComponent } from '../shared/icon/icon.component';
import { getSquareCentroid } from '../shared/road-map/coordinate-config';
import { randBedrag } from '../../utils/afrikaans.util';
import { TPipe } from '../../i18n/t.pipe';
import { isEngels } from '../../i18n/lang.service';

const SHARE_GENERIC_KEY = 'diamantlaan.deelGeneries';

@Component({
  selector: 'app-my-squares',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, ImageLightboxComponent, ShareButtonComponent, IconComponent, TPipe],
  template: `
    <div class="container">
      <div class="page-header">
        <p class="eyebrow">{{ 'Stap 4 uit 4 · Erkenning' | t }}</p>
        <h1 class="display page-title">{{ 'My blokke' | t }}</h1>
        @if (squares.length > 0) {
          <p class="summary">{{ squares.length }}m² {{ 'geborg,' | t }} <strong>{{ randBedrag(totalSpent) }}</strong> {{ 'totaal' | t }}</p>
          <div class="header-actions">
            <a routerLink="/my-blokke/sertifikaat" class="btn btn-primary btn-xl cert-link">
              <app-icon name="award" [size]="22" />
              {{ 'Sien my sertifikate' | t }}
            </a>
            <app-share-button
              label="Deel my bydrae"
              [url]="shareUrl"
              [text]="shareText"
              [deferShare]="true"
              [showRevoke]="!!publicShareUrl"
              (shareRequested)="onShareRequested()"
              (revokeRequested)="onRevokePublicLink()"
            />
          </div>
        }
      </div>
      @if (squares.length === 0) {
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <h2>{{ 'Jy het nog geen vierkante meter gekoop nie' | t }}</h2>
          <p>{{ 'Kies ’n hoeveelheid en ons ken die blokkies aan jou toe. Dit neem net ’n minuut.' | t }}</p>
          <a routerLink="/bou" class="btn btn-primary btn-xl">{{ 'Bou jou eerste m²' | t }}</a>
        </div>
      } @else {
        <div class="grid">
          @for (sq of squares; track sq.id) {
            <div
              class="sq-card"
              [class.has-images]="sq.imageCount && sq.imageCount > 0"
              (click)="openImages(sq)"
            >
              <div class="sq-info">
                <span class="sq-id">{{ 'Blok' | t }} #{{ sq.id }}</span>
                <div class="sq-badges">
                  @if (sq.imageCount && sq.imageCount > 0) {
                    <span class="image-indicator" [title]="'Vorderingsfoto beskikbaar' | t">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </span>
                  }
                  <app-status-badge [status]="sq.status"></app-status-badge>
                </div>
              </div>
              <div class="sq-progress">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getProgressPercent(sq.status)"></div>
                </div>
              </div>
              @if (getCoords(sq.id); as coords) {
                <p class="sq-coords">
                  {{ 'Koördinate:' | t }} {{ coords.lat | number:'1.6-6' }}°, {{ coords.lng | number:'1.6-6' }}°
                </p>
              }
            </div>
          }
        </div>
      }
    </div>

    <app-image-lightbox
      [open]="lightboxOpen"
      [squareId]="lightboxSquareId"
      (closed)="closeLightbox()"
    />

    <!-- Only for an account whose blocks carry different names: it holds several certificates,
         so "share my contribution" has to ask which one before it can mean anything. -->
    @if (pickerOpen) {
      <div class="prompt-backdrop" (click)="pickerOpen = false">
        <div class="prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="share-pick-title" (click)="$event.stopPropagation()">
          <h3 id="share-pick-title">{{ 'Wat wil jy deel?' | t }}</h3>
          <p>{{ 'Jy het ’n sertifikaat per blok. Kies watter een jy wil stuur.' | t }}</p>
          <div class="pick-list">
            <button type="button" class="pick-btn" (click)="shareChosen(null)">
              <span class="pick-naam">{{ 'Almal saam' | t }}</span>
              <span class="pick-onder">{{ 'Een blad:' | t }} {{ opsommingNaam }}</span>
            </button>
            @for (blok of certBlocks; track blok.squareId) {
              <button type="button" class="pick-btn" (click)="shareChosen(blok.squareId)">
                <span class="pick-naam">{{ 'Blok' | t }} #{{ blok.squareId }}</span>
                <span class="pick-onder">{{ blok.name }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    }

    @if (consentOpen) {
      <div class="prompt-backdrop" (click)="closeConsent()">
        <div class="prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="share-consent-title" (click)="$event.stopPropagation()">
          <h3 id="share-consent-title">{{ 'Deel jou bydrae in die openbaar?' | t }}</h3>
          <p>{{ 'As jy instem, kry jy ’n skakel wat jou sertifikaat wys: die naam daarop, jou bloknommers en hoeveel m² jy geborg het. Enigeen met die skakel kan dit sien. Jou e-pos en telefoonnommer bly privaat.' | t }}</p>
          @if (consentError) {
            <p class="consent-error">{{ consentError | t }}</p>
          }
          <div class="prompt-actions">
            <button type="button" class="btn btn-primary" [disabled]="consentBusy" (click)="confirmPublicShare()">{{ 'Ja, skep my skakel' | t }}</button>
            <button type="button" class="btn btn-outline" [disabled]="consentBusy" (click)="shareGeneric()">{{ 'Nee, deel net die projek' | t }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .container { padding: 3rem 1.5rem 5rem; max-width: 1120px; }
    .page-header { margin-bottom: 2.5rem; }
    .page-header .eyebrow { font-size: var(--fs-sm); }
    .page-title {
      font-size: clamp(2.5rem, 6vw, 4.5rem);
      margin: 0.5rem 0 0.75rem;
      color: var(--ink);
    }
    .summary {
      font-size: var(--fs-lg);
      line-height: 1.65;
      color: var(--text-muted);
      max-width: 40rem;
    }
    .summary strong { color: var(--action-strong); }
    .header-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
      align-items: stretch;
    }
    .header-actions .cert-link,
    .header-actions app-share-button {
      min-height: var(--tap-large);
    }
    .header-actions app-share-button {
      display: flex;
    }
    .header-actions ::ng-deep .share-wrap,
    .header-actions ::ng-deep .share-btn {
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: var(--tap-large);
    }
    .empty-state {
      text-align: center;
      padding: 4.5rem 2rem;
      background: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: var(--radius);
      color: var(--text-muted);
    }
    .empty-state svg { stroke: var(--color-sand); margin-bottom: 1.25rem; }
    .empty-state h2 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      color: var(--ink);
      margin-bottom: 0.75rem;
    }
    .empty-state p {
      font-size: var(--fs-lg);
      line-height: 1.65;
      max-width: 28rem;
      margin: 0 auto 1.75rem;
    }
    .empty-state .btn-xl { max-width: 22rem; margin: 0 auto; }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    @media (min-width: 800px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }
    .sq-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1.75rem 2rem;
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .sq-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }
    .sq-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .sq-badges {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .image-indicator {
      display: flex;
      color: var(--color-terracotta);
    }
    .sq-card.has-images {
      cursor: pointer;
    }
    .sq-card.has-images:hover {
      border-color: var(--color-terracotta);
    }
    .sq-id {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--fs-2xl);
      line-height: 1;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    :host ::ng-deep .status-badge {
      font-size: var(--fs-base);
      padding: 0.5rem 1.1rem;
    }
    .sq-progress { margin-top: 0.25rem; }
    .progress-bar {
      height: 0.85rem;
      background: var(--color-sand-light);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      min-width: 0.25rem;
      background: var(--color-olive);
      border-radius: 2px;
      transition: width 0.4s ease;
    }
    .sq-coords {
      font-size: var(--fs-base);
      line-height: 1.5;
      color: var(--text-muted);
      margin-top: 0.85rem;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 640px) {
      .header-actions { grid-template-columns: 1fr; max-width: none; }
    }
    .prompt-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(61, 43, 31, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 1000;
    }
    .prompt-dialog {
      width: min(100%, 36rem);
      background: var(--color-surface);
      border-radius: var(--radius);
      padding: 2.25rem;
      box-shadow: var(--shadow);
    }
    .prompt-dialog h3 {
      font-family: var(--font-heading);
      font-size: var(--fs-2xl);
      margin: 0 0 1rem;
    }
    .prompt-dialog p {
      color: var(--text-muted);
      font-size: var(--fs-lg);
      line-height: 1.65;
      margin-bottom: 0.75rem;
    }
    .consent-error { color: #b33; }
    .pick-list {
      display: grid;
      gap: 0.75rem;
      margin-top: 1.5rem;
      max-height: 55vh;
      overflow-y: auto;
    }
    .pick-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
      width: 100%;
      min-height: var(--tap-large);
      padding: 0.9rem 1.1rem;
      text-align: left;
      background: var(--color-surface);
      border: 3px solid var(--border-strong);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .pick-btn:hover { border-color: var(--action); }
    .pick-naam {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: 800;
      color: var(--ink);
    }
    .pick-onder {
      font-size: var(--fs-base);
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
    .prompt-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1.5rem;
    }
  `]
})
export class MySquaresComponent implements OnInit {
  @ViewChild(ShareButtonComponent) shareBtn?: ShareButtonComponent;
  private purchase = inject(PurchaseService);
  squares: { id: number; status: SquareStatus; imageCount?: number }[] = [];
  totalSpent = 0;
  lightboxOpen = false;
  lightboxSquareId: number | null = null;
  siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  publicShareUrl: string | null = null;
  consentOpen = false;
  consentBusy = false;
  consentError = '';
  pickerOpen = false;
  /** Populated only when this account keeps a separate certificate per block. */
  certBlocks: { squareId: number; name: string }[] = [];
  opsommingNaam = '';
  readonly randBedrag = randBedrag;

  /**
   * What the share button actually sends. Held here rather than pushed into the button, so a
   * change-detection pass re-applying the binding cannot quietly undo the visitor's choice.
   * Null means the account's own summary link.
   */
  private gekoseUrl: string | null = null;
  private gekoseBlok: number | null = null;

  get shareText(): string {
    if (this.gekoseBlok !== null) {
      const naam = this.certBlocks.find(b => b.squareId === this.gekoseBlok)?.name;
      if (isEngels()) return `${naam || 'I'} sponsored 1 m² of the Oewerpad in Orania!`;
      return `${naam || 'Ek'} het 1 m² geborg vir die Oewerpad in Orania!`;
    }
    if (isEngels()) return `I sponsored ${this.squares.length} m² of the Oewerpad in Orania!`;
    return `Ek het ${this.squares.length} m² geborg vir die Oewerpad in Orania!`;
  }

  get shareUrl(): string {
    return this.gekoseUrl || this.publicShareUrl || this.siteUrl;
  }

  ngOnInit() {
    this.purchase.getMySquares().subscribe(s => this.squares = s.map(sq => ({
      id: sq.id,
      status: sq.status as SquareStatus,
      imageCount: sq.imageCount
    })));
    this.purchase.getMySummary().subscribe({
      next: summary => this.totalSpent = summary.totalSpent,
      error: () => this.totalSpent = this.squares.length * 500
    });
    // Pre-fetch so the share tap can call navigator.share synchronously.
    // iOS/Android drop the user gesture if we await an HTTP call first.
    this.purchase.getShareLink().subscribe({
      next: dto => this.publicShareUrl = this.publicUrlFromDto(dto),
      error: () => { /* no link yet — the consent flow creates one */ }
    });
    // Same reason: the picker has to be able to list the certificates the moment it opens.
    this.purchase.getCertificateNames().subscribe({
      next: names => {
        this.opsommingNaam = names.summaryName;
        this.certBlocks = names.sameForAll ? [] : names.blocks.map(b => ({ ...b }));
      },
      error: () => { /* one summary certificate, so there is nothing to choose between */ }
    });
  }

  onShareRequested() {
    if (this.publicShareUrl) {
      this.kiesSertifikaat();
      return;
    }
    this.purchase.getShareLink().subscribe({
      next: dto => {
        this.publicShareUrl = this.publicUrlFromDto(dto);
        this.clearDeclinedGenericShare();
        this.kiesSertifikaat();
      },
      error: () => {
        if (this.declinedGenericShare()) {
          this.gekoseBlok = null;
          this.gekoseUrl = this.siteUrl;
          void this.shareBtn?.performShare(this.siteUrl);
          return;
        }
        this.consentError = '';
        this.consentOpen = true;
      }
    });
  }

  confirmPublicShare() {
    this.consentBusy = true;
    this.consentError = '';
    this.purchase.createShareLink().subscribe({
      next: dto => {
        this.publicShareUrl = this.publicUrlFromDto(dto);
        this.clearDeclinedGenericShare();
        this.consentBusy = false;
        this.consentOpen = false;
        this.kiesSertifikaat();
      },
      error: () => {
        this.consentBusy = false;
        this.consentError = 'Die skakel kon nie geskep word nie. Probeer weer.';
      }
    });
  }

  /**
   * Consent is settled and a link exists. An account holding one certificate shares it straight
   * away; one holding a certificate per block is asked which of them to send.
   */
  private kiesSertifikaat() {
    if (this.certBlocks.length > 1) {
      this.pickerOpen = true;
      return;
    }
    this.shareChosen(null);
  }

  /** `null` shares the summary sheet; a block id shares that block's own certificate. */
  shareChosen(squareId: number | null) {
    this.pickerOpen = false;
    this.gekoseBlok = squareId;
    this.gekoseUrl = squareId === null ? null : `${this.publicShareUrl}?blok=${squareId}`;
    void this.shareBtn?.performShare(this.shareUrl);
  }

  shareGeneric() {
    this.rememberDeclinedGenericShare();
    this.consentOpen = false;
    this.gekoseBlok = null;
    this.gekoseUrl = this.siteUrl;
    void this.shareBtn?.performShare(this.siteUrl);
  }

  closeConsent() {
    if (this.consentBusy) return;
    this.consentOpen = false;
  }

  onRevokePublicLink() {
    this.purchase.deleteShareLink().subscribe({
      next: () => {
        this.publicShareUrl = null;
        this.gekoseUrl = null;
        this.gekoseBlok = null;
        this.clearDeclinedGenericShare();
      }
    });
  }

  private publicUrlFromDto(dto: { url: string; path?: string }): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (dto.path) return origin + dto.path;
    try {
      const parsed = new URL(dto.url);
      return origin + parsed.pathname;
    } catch {
      return dto.url;
    }
  }

  private declinedGenericShare(): boolean {
    try {
      return localStorage.getItem(SHARE_GENERIC_KEY) === '1';
    } catch {
      return false;
    }
  }

  private rememberDeclinedGenericShare() {
    try { localStorage.setItem(SHARE_GENERIC_KEY, '1'); } catch { /* ignore */ }
  }

  private clearDeclinedGenericShare() {
    try { localStorage.removeItem(SHARE_GENERIC_KEY); } catch { /* ignore */ }
  }

  openImages(sq: { id: number; imageCount?: number }) {
    if (!sq.imageCount || sq.imageCount <= 0) return;
    this.lightboxSquareId = sq.id;
    this.lightboxOpen = true;
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.lightboxSquareId = null;
  }

  getProgressPercent(status: SquareStatus): number {
    const map: Record<SquareStatus, number> = {
      [SquareStatus.NogNieBeginNie]: 0,
      [SquareStatus.Voorberei]: 33,
      [SquareStatus.BesigOmTeTeer]: 66,
      [SquareStatus.KlaarGeteer]: 100,
    };
    return map[status] ?? 0;
  }

  getCoords(id: number) {
    return getSquareCentroid(id);
  }
}
