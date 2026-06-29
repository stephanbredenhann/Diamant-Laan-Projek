import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-wrap">
      <button type="button" class="btn btn-outline btn-sm share-btn" (click)="onShareClick()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        {{ label }}
      </button>
      @if (menuOpen()) {
        <div class="share-menu">
          <a [href]="whatsappUrl" target="_blank" rel="noopener noreferrer" (click)="menuOpen.set(false)">WhatsApp</a>
          <a [href]="facebookUrl" target="_blank" rel="noopener noreferrer" (click)="menuOpen.set(false)">Facebook</a>
          <button type="button" (click)="copyLink()">{{ copied() ? 'Gekopieer!' : 'Kopieer skakel' }}</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .share-wrap {
      position: relative;
      display: inline-block;
    }
    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    .share-menu {
      position: absolute;
      top: calc(100% + 0.375rem);
      left: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow);
      min-width: 160px;
      z-index: 100;
      overflow: hidden;
    }
    .share-menu a,
    .share-menu button {
      display: block;
      width: 100%;
      padding: 0.625rem 1rem;
      text-align: left;
      font-size: 0.8125rem;
      color: var(--color-text);
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      text-decoration: none;
    }
    .share-menu a:last-child,
    .share-menu button:last-child {
      border-bottom: none;
    }
    .share-menu a:hover,
    .share-menu button:hover {
      background: var(--color-cream);
    }
  `]
})
export class ShareButtonComponent {
  @Input() label = 'Deel';
  @Input() url = typeof window !== 'undefined' ? window.location.origin : '';
  @Input() text = 'Dra by aan Diamant Laan!';

  menuOpen = signal(false);
  copied = signal(false);

  get whatsappUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(this.text + ' ' + this.url)}`;
  }

  get facebookUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url)}`;
  }

  async onShareClick() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Diamant Laan', text: this.text, url: this.url });
        return;
      } catch {
        // User cancelled or share failed — fall through to menu
      }
    }
    this.menuOpen.update(v => !v);
  }

  async copyLink() {
    const full = `${this.text} ${this.url}`;
    try {
      await navigator.clipboard.writeText(full);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // ignore
    }
    this.menuOpen.set(false);
  }
}
