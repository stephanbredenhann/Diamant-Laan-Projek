import { Component, Input } from '@angular/core';

/**
 * The small stroke-icon set used across the marketing pages.
 *
 * Everything is drawn on the same 24×24 grid with `currentColor` and a 1.75 stroke,
 * so an icon takes its colour and size from whatever it sits in and stays visually
 * consistent with the inline SVGs already used in the navbar and the wizard.
 */
export type IconName =
  | 'ruler'
  | 'map-pin'
  | 'shield'
  | 'award'
  | 'user'
  | 'road'
  | 'dirt-road'
  | 'wallet'
  | 'calendar'
  | 'camera'
  | 'check-circle'
  | 'help-circle'
  | 'hammer'
  | 'eye'
  | 'eye-off';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name) {
        @case ('ruler') {
          <rect x="2" y="8" width="20" height="8" rx="1" />
          <path d="M7 8v3M12 8v4M17 8v3" />
        }
        @case ('map-pin') {
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        }
        @case ('shield') {
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 11 11 13 15 9" />
        }
        @case ('award') {
          <circle cx="12" cy="9" r="6" />
          <polyline points="8.2 13.4 7 22 12 19.5 17 22 15.8 13.4" />
        }
        @case ('user') {
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        }
        @case ('road') {
          <path d="M4 22 8 2M20 22 16 2M12 6v3M12 13v3M12 20v1" />
        }
        @case ('dirt-road') {
          <path d="M4 22 6.5 11 8 2M20 22 17.5 11 16 2" />
          <circle cx="11" cy="8" r="1.25" />
          <circle cx="13.5" cy="13" r="1.4" />
          <circle cx="10.5" cy="18" r="1.2" />
        }
        @case ('wallet') {
          <path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h13" />
          <path d="M3 4v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4" />
          <circle cx="17" cy="14" r="1.25" />
        }
        @case ('calendar') {
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        }
        @case ('camera') {
          <path d="M3 8h3l2-3h8l2 3h3v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
          <circle cx="12" cy="13" r="3.5" />
        }
        @case ('check-circle') {
          <circle cx="12" cy="12" r="9" />
          <polyline points="8.5 12 11 14.5 15.5 9.5" />
        }
        @case ('hammer') {
          <path d="M14.5 3.5 21 10l-2.5 2.5L12 6z" />
          <path d="M12.5 8.5 4 17l3 3 8.5-8.5" />
        }
        @case ('help-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.4v.4" />
          <path d="M12 17.2h.01" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('eye-off') {
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: inherit;
    }
  `],
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  /** Rendered pixel size. The icon is square. */
  @Input() size = 28;
}
