import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../services/auth.service';
import { PurchaseService } from '../../services/purchase.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['register']);
    authService.register.and.returnValue(of({
      token: 'jwt',
      email: 'jan@test.com',
      firstName: 'Jan',
      lastName: 'Boer'
    }));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: PurchaseService, useValue: { guestPurchase: null, pendingSquareIds: [] } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function fillValidForm() {
    component.firstName = 'Jan';
    component.lastName = 'Boer';
    component.email = 'jan@test.com';
    component.password = 'Wagwoord1!';
    component.confirmPassword = 'Wagwoord1!';
    component.phoneNumber = '821234567';
    component.phoneCountryCode = '+27';
  }

  it('leaves the submit button clickable so validation can explain itself', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBeFalse();
  });

  it('reports mismatched passwords instead of doing nothing', () => {
    fillValidForm();
    component.confirmPassword = 'Anders1!';

    component.submit();
    fixture.detectChanges();

    expect(component.confirmPasswordError).toBe('Wagwoorde stem nie ooreen nie.');
    expect(authService.register).not.toHaveBeenCalled();
    const messages = Array.from(fixture.nativeElement.querySelectorAll('.field-error'))
      .map(e => (e as HTMLElement).textContent?.trim());
    expect(messages).toContain('Wagwoorde stem nie ooreen nie.');
  });

  it('reports an empty confirmation field, the usual autofill gap', () => {
    fillValidForm();
    component.confirmPassword = '';

    component.submit();

    expect(component.confirmPasswordError).toBe('Bevestig asseblief jou wagwoord.');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('reports every bad field at once rather than stopping at the first', () => {
    component.firstName = 'Jan 3';
    component.lastName = '';
    component.email = 'nie-n-epos';
    component.password = 'kort';
    component.confirmPassword = 'anders';
    component.phoneNumber = '12';

    component.submit();

    expect(component.firstNameError).toBeTruthy();
    expect(component.lastNameError).toBeTruthy();
    expect(component.emailError).toBeTruthy();
    expect(component.passwordError).toBeTruthy();
    expect(component.confirmPasswordError).toBeTruthy();
    expect(component.phoneError).toBeTruthy();
    expect(component.error).toBe('Kontroleer asseblief die velde wat hierbo gemerk is.');
  });

  it('names the unmet password rule', () => {
    fillValidForm();
    component.password = 'wagwoord1';
    component.confirmPassword = 'wagwoord1';

    component.submit();

    expect(component.passwordError).toBe("Wagwoord moet 'n spesiale karakter bevat.");
  });

  it('clears the mismatch message once the two fields agree again', () => {
    fillValidForm();
    component.confirmPassword = 'Anders1!';
    component.checkConfirmPassword();
    expect(component.confirmPasswordError).toBeTruthy();

    component.confirmPassword = 'Wagwoord1!';
    component.checkConfirmPassword();
    expect(component.confirmPasswordError).toBe('');
  });

  it('submits when everything is valid', () => {
    fillValidForm();

    component.submit();

    expect(authService.register).toHaveBeenCalled();
  });
});
