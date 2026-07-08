import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COUNTRY_CODES, sanitizePhoneInput } from '../../../utils/validation.util';

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="phone-row">
      <div class="country-slot">
        <button
          #triggerBtn
          type="button"
          class="country-trigger"
          [attr.aria-expanded]="open"
          [attr.aria-controls]="listboxId"
          aria-haspopup="listbox"
          aria-label="Landkode"
          (click)="toggleOpen($event)"
        >
          <span class="country-code">{{ countryCode }}</span>
          <span class="caret" aria-hidden="true">▾</span>
        </button>
      </div>
      <input
        type="tel"
        class="phone-number"
        [ngModel]="phoneNumber"
        (ngModelChange)="onPhoneChange($event)"
        [name]="phoneName"
        placeholder="082 123 4567"
        inputmode="numeric"
        autocomplete="tel-national"
        (keydown)="onPhoneKeydown($event)"
        (paste)="onPhonePaste($event)"
      >
      @if (open) {
        <div class="country-panel">
          <input
            #searchInput
            type="text"
            class="country-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            [attr.aria-controls]="listboxId"
            [attr.aria-activedescendant]="activeOptionId"
            [(ngModel)]="search"
            [ngModelOptions]="{ standalone: true }"
            (ngModelChange)="onSearchChange()"
            placeholder="Soek land..."
            aria-label="Soek landkode"
            (click)="$event.stopPropagation()"
            (keydown)="onSearchKeydown($event)"
          >
          <ul class="country-list" [id]="listboxId" role="listbox" aria-label="Kies landkode">
            @for (c of filteredCountries(); track c.code + c.label; let i = $index) {
              <li>
                <button
                  type="button"
                  tabindex="-1"
                  class="country-option"
                  [id]="optionId(i)"
                  [class.selected]="c.code === countryCode"
                  [class.active]="i === activeIndex"
                  role="option"
                  [attr.aria-selected]="c.code === countryCode"
                  (click)="selectCountry(c.code, $event)"
                >
                  <span class="option-code">{{ c.code }}</span>
                  <span class="option-label">{{ c.country }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .phone-row {
      position: relative;
      display: flex;
      gap: 0.5rem;
    }
    .country-slot {
      flex: 2 1 0;
      min-width: 0;
      max-width: 20%;
    }
    .country-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
      width: 100%;
      padding: 0.75rem 0.5rem;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-family: var(--font-body);
      font-size: 0.9375rem;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .country-trigger:focus-visible {
      border-color: var(--ob-orange);
      box-shadow: 0 0 0 4px rgba(245, 130, 32, 0.12);
    }
    .country-code {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .caret {
      flex-shrink: 0;
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .phone-number {
      flex: 8 1 0;
      min-width: 0;
      width: auto;
    }
    .country-panel {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 0.25rem);
      z-index: 20;
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .country-search {
      width: 100%;
      border: none;
      border-bottom: 1px solid var(--color-border);
      border-radius: 0;
      box-shadow: none;
    }
    .country-search:focus {
      border-color: var(--color-border);
      box-shadow: none;
    }
    .country-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 14rem;
      overflow-y: auto;
    }
    .country-option {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 0.85rem;
      border: none;
      background: transparent;
      color: var(--color-text);
      font-family: var(--font-body);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
    }
    .country-option:hover,
    .country-option.active {
      background: #F5F0E1;
    }
    .country-option.selected {
      font-weight: 600;
    }
    .option-code {
      flex-shrink: 0;
      min-width: 3rem;
      font-weight: 600;
    }
    .option-label {
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class PhoneInputComponent {
  private host = inject(ElementRef<HTMLElement>);

  @ViewChild('triggerBtn') triggerBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  @Input() countryCode = '+27';
  @Output() countryCodeChange = new EventEmitter<string>();
  @Input() phoneNumber = '';
  @Output() phoneNumberChange = new EventEmitter<string>();
  @Input() phoneName = 'phoneNumber';

  open = false;
  search = '';
  activeIndex = -1;
  readonly countries = COUNTRY_CODES;
  readonly listboxId = `phone-country-list-${Math.random().toString(36).slice(2, 9)}`;

  get activeOptionId(): string | null {
    return this.activeIndex >= 0 ? this.optionId(this.activeIndex) : null;
  }

  optionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  filteredCountries() {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.countries;
    return this.countries.filter((c) =>
      c.country.toLowerCase().includes(term)
      || c.code.includes(term)
      || c.label.toLowerCase().includes(term)
    );
  }

  toggleOpen(event: Event) {
    event.stopPropagation();
    if (this.open) {
      this.closeDropdown(true);
    } else {
      this.openDropdown();
    }
  }

  selectCountry(code: string, event: Event) {
    event.stopPropagation();
    this.countryCode = code;
    this.countryCodeChange.emit(code);
    this.closeDropdown(true);
  }

  onPhoneChange(value: string) {
    const sanitized = sanitizePhoneInput(value);
    this.phoneNumber = sanitized;
    this.phoneNumberChange.emit(sanitized);
  }

  onPhoneKeydown(event: KeyboardEvent) {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onPhonePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    this.onPhoneChange(this.phoneNumber + sanitizePhoneInput(pasted));
  }

  onSearchChange() {
    const options = this.filteredCountries();
    this.activeIndex = options.length ? 0 : -1;
    this.scrollActiveIntoView();
  }

  onSearchKeydown(event: KeyboardEvent) {
    const options = this.filteredCountries();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!options.length) return;
        this.activeIndex = this.activeIndex < options.length - 1 ? this.activeIndex + 1 : 0;
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!options.length) return;
        this.activeIndex = this.activeIndex > 0 ? this.activeIndex - 1 : options.length - 1;
        this.scrollActiveIntoView();
        break;
      case 'Home':
        event.preventDefault();
        if (!options.length) return;
        this.activeIndex = 0;
        this.scrollActiveIntoView();
        break;
      case 'End':
        event.preventDefault();
        if (!options.length) return;
        this.activeIndex = options.length - 1;
        this.scrollActiveIntoView();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < options.length) {
          this.selectCountry(options[this.activeIndex].code, event);
        }
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.closeDropdown(true);
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeDropdown(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (!this.open) return;
    this.closeDropdown(true);
  }

  private openDropdown() {
    this.search = '';
    this.open = true;
    this.syncActiveToSelection();
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
      this.scrollActiveIntoView();
    });
  }

  private closeDropdown(restoreFocus: boolean) {
    if (!this.open) return;
    this.open = false;
    this.search = '';
    this.activeIndex = -1;
    if (restoreFocus) {
      setTimeout(() => this.triggerBtn?.nativeElement.focus());
    }
  }

  private syncActiveToSelection() {
    const options = this.filteredCountries();
    const idx = options.findIndex((c) => c.code === this.countryCode);
    this.activeIndex = idx >= 0 ? idx : (options.length ? 0 : -1);
  }

  private scrollActiveIntoView() {
    if (this.activeIndex < 0) return;
    const el = this.host.nativeElement.querySelector(`#${this.optionId(this.activeIndex)}`);
    el?.scrollIntoView({ block: 'nearest' });
  }
}
