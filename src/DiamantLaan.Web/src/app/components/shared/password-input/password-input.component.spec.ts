import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { PasswordInputComponent } from './password-input.component';

@Component({
  standalone: true,
  imports: [FormsModule, PasswordInputComponent],
  template: `<app-password-input id="password" [(ngModel)]="password" name="password" />`,
})
class HostComponent {
  password = 'Geheim1!';
}

describe('PasswordInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function reveal(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button.reveal');
  }

  it('keeps the field masked until the reveal button is used', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(input().type).toBe('password');
    expect(reveal().getAttribute('aria-label')).toBe('Wys wagwoord');
    expect(input().value).toBe('Geheim1!');

    reveal().click();
    fixture.detectChanges();

    expect(input().type).toBe('text');
    expect(reveal().getAttribute('aria-label')).toBe('Versteek wagwoord');
    expect(input().value).toBe('Geheim1!');
  });
});
