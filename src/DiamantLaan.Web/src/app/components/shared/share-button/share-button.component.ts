import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

const FALLBACK_TOAST =
  'Jou toestel ondersteun nie direkte deel nie. Die skakel is gekopieer en kan in enige sosiale media-platform geplak word.';

@Component({
  selector: 'app-share-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-wrap">
      <button
        type="button"
        class="btn btn-outline btn-xl share-btn"
        [attr.aria-expanded]="menuOpen()"
        aria-haspopup="menu"
        (click)="onShareClick()"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        {{ label }}
      </button>
      @if (menuOpen()) {
        <div class="share-menu" role="menu">
          <button type="button" role="menuitem" (click)="shareToDevice()">Deel my bydrae</button>
          <button type="button" role="menuitem" (click)="copyLink()">{{ copied() ? 'Gekopieer!' : 'Kopieer skakel' }}</button>
          @if (showRevoke) {
            <button type="button" class="revoke" role="menuitem" (click)="onRevoke()">Verwyder my openbare skakel</button>
          }
        </div>
      }
      @if (toast()) {
        <div class="share-toast" role="status">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
    }
    .share-wrap {
      position: relative;
      display: flex;
      flex: 1;
      width: 100%;
    }
    .share-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      flex: 1;
    }
    .share-menu,
    .share-toast {
      position: absolute;
      top: calc(100% + 0.375rem);
      left: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow);
      z-index: 100;
    }
    .share-menu {
      min-width: 300px;
      overflow: hidden;
    }
    .share-toast {
      right: 0;
      padding: 1rem 1.25rem;
      font-size: var(--fs-lg);
      font-weight: 600;
      line-height: 1.45;
      color: var(--color-text);
    }
    .share-menu button {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      min-height: var(--tap-large);
      padding: 0.75rem 1.25rem;
      text-align: left;
      font-family: inherit;
      font-size: var(--fs-xl);
      font-weight: 600;
      line-height: 1.2;
      color: var(--color-text);
      background: none;
      border: none;
      border-radius: 0;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
    }
    .share-menu button:last-child {
      border-bottom: none;
    }
    .share-menu button:hover {
      background: var(--color-cream);
    }
    .share-menu button.revoke {
      color: var(--text-muted);
    }
  `]
})
export class ShareButtonComponent {
  private host = inject(ElementRef<HTMLElement>);

  @Input() label = 'Deel';
  @Input() url = typeof window !== 'undefined' ? window.location.origin : '';
  @Input() text = 'Dra by aan Diamant Laan!';
  /** Parent handles the first tap (consent). Call performShare() afterwards to open the menu. */
  @Input() deferShare = false;
  @Input() showRevoke = false;
  @Output() shareRequested = new EventEmitter<void>();
  @Output() revokeRequested = new EventEmitter<void>();

  menuOpen = signal(false);
  copied = signal(false);
  toast = signal('');

  get sharePayload(): string {
    return `${this.text}\n${this.url}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.menuOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
  }

  onShareClick() {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }
    if (this.deferShare) {
      this.shareRequested.emit();
      return;
    }
    this.menuOpen.set(true);
  }

  async shareToDevice() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Diamant Laan', text: this.text, url: this.url });
        this.menuOpen.set(false);
      } catch {
        // User cancelled or share failed. Leave the menu open.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(this.sharePayload);
    } catch {
      return;
    }
    this.menuOpen.set(false);
    this.toast.set(FALLBACK_TOAST);
    setTimeout(() => this.toast.set(''), 8000);
  }

  performShare(url?: string) {
    if (url) this.url = url;
    this.toast.set('');
    this.menuOpen.set(true);
  }

  onRevoke() {
    this.menuOpen.set(false);
    this.revokeRequested.emit();
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.sharePayload);
    } catch {
      return;
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
