import { Component, EventEmitter, Input, Output, booleanAttribute, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TPipe } from '../../../i18n/t.pipe';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [IconComponent, TPipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInputComponent),
      multi: true,
    },
  ],
  host: {
    '[attr.id]': 'null',
  },
  template: `
    <div class="wrap">
      <input
        [id]="id"
        [type]="visible ? 'text' : 'password'"
        [value]="value"
        [disabled]="disabled"
        [attr.autocomplete]="autocomplete || null"
        [attr.placeholder]="placeholder || null"
        [attr.minlength]="minlength"
        [attr.required]="required ? '' : null"
        [class.invalid]="invalid"
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
        (input)="onInput($event)"
        (blur)="onTouched(); inputBlur.emit()"
      >
      <button
        type="button"
        class="reveal"
        [attr.aria-label]="visible ? ('Versteek wagwoord' | t) : ('Wys wagwoord' | t)"
        [attr.aria-pressed]="visible"
        [attr.aria-controls]="id || null"
        [disabled]="disabled"
        (mousedown)="$event.preventDefault()"
        (click)="visible = !visible"
      >
        <app-icon [name]="visible ? 'eye-off' : 'eye'" [size]="22" />
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wrap { position: relative; }
    .wrap input { padding-right: 3.25rem; }
    .wrap input.invalid { border-color: #DC2626; }
    .wrap input.invalid:focus { outline-color: #DC2626; }
    .reveal {
      position: absolute;
      top: 0;
      right: 0;
      width: var(--tap-min);
      min-width: var(--tap-min);
      min-height: var(--tap-min);
      height: 100%;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .reveal:hover:not(:disabled) { color: var(--color-text); }
    .reveal:focus-visible {
      outline: 2px solid var(--action);
      outline-offset: -4px;
    }
    .reveal:disabled { cursor: not-allowed; }
  `],
})
export class PasswordInputComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() autocomplete = '';
  @Input() placeholder = '';
  @Input() minlength: string | number | null = null;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Output() inputBlur = new EventEmitter<void>();

  value = '';
  visible = false;
  onTouched: () => void = () => {};
  private onChange: (value: string) => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }
}
