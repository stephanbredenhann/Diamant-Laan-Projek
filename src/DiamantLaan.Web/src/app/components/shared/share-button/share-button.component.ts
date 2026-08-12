import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="share-wrap">
      <button type="button" class="btn btn-outline btn-xl share-btn" (click)="onShareClick()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        {{ label }}
      </button>
      @if (menuOpen()) {
        <div class="share-menu">
          <a [href]="whatsappUrl" target="_blank" rel="noopener noreferrer" (click)="menuOpen.set(false)">WhatsApp</a>
          <a [href]="facebookUrl" target="_blank" rel="noopener noreferrer" (click)="onFacebookClick()">Facebook</a>
          <button type="button" (click)="copyLink()">{{ copied() ? 'Gekopieer!' : 'Kopieer skakel' }}</button>
          @if (showRevoke) {
            <button type="button" class="revoke" (click)="onRevoke()">Verwyder my openbare skakel</button>
          }
        </div>
      }
      @if (facebookCopied()) {
        <p class="share-hint">Teks gekopieer. Plak dit in jou Facebook-plasing.</p>
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
    .share-menu {
      position: absolute;
      top: calc(100% + 0.375rem);
      left: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow);
      min-width: 240px;
      z-index: 100;
      overflow: hidden;
    }
    .share-menu a,
    .share-menu button {
      display: flex;
      align-items: center;
      width: 100%;
      min-height: var(--tap-min);
      padding: 0.625rem 1rem;
      text-align: left;
      font-size: var(--fs-lg);
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
    .share-menu button.revoke {
      color: var(--text-muted);
      font-size: var(--fs-base);
    }
    .share-hint {
      margin: 0.5rem 0 0;
      font-size: var(--fs-base);
      color: var(--text-muted);
    }
  `]
})
export class ShareButtonComponent {
  private host = inject(ElementRef<HTMLElement>);

  @Input() label = 'Deel';
  @Input() url = typeof window !== 'undefined' ? window.location.origin : '';
  @Input() text = 'Dra by aan Diamant Laan!';
  /** Parent handles the first tap (consent). Call performShare() afterwards. */
  @Input() deferShare = false;
  @Input() showRevoke = false;
  @Output() shareRequested = new EventEmitter<void>();
  @Output() revokeRequested = new EventEmitter<void>();

  menuOpen = signal(false);
  copied = signal(false);
  facebookCopied = signal(false);

  get whatsappUrl(): string {
    return `https://wa.me/?text=${encodeURIComponent(this.text + ' ' + this.url)}`;
  }

  get facebookUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url)}`;
  }

  get sharePayload(): string {
    return `${this.text} ${this.url}`;
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
    if (this.deferShare) {
      this.shareRequested.emit();
      return;
    }
    void this.performShare();
  }

  async performShare(url?: string) {
    const shareUrl = url ?? this.url;
    if (url) this.url = url;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Diamant Laan', text: this.text, url: shareUrl });
        this.menuOpen.set(false);
        return;
      } catch {
        // User cancelled or share failed — fall through to menu
      }
    }
    this.menuOpen.update(v => !v);
  }

  onRevoke() {
    this.menuOpen.set(false);
    this.revokeRequested.emit();
  }

  onFacebookClick() {
    void this.copyShareText(this.text).then(ok => {
      if (!ok) return;
      this.facebookCopied.set(true);
      setTimeout(() => this.facebookCopied.set(false), 4000);
    });
    this.menuOpen.set(false);
  }

  async copyLink() {
    const ok = await this.copyShareText(this.sharePayload);
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
    this.menuOpen.set(false);
  }

  private async copyShareText(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }
}
