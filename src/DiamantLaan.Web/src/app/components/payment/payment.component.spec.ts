import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PaymentComponent } from './payment.component';
import { AuthService } from '../../services/auth.service';
import { PurchaseService } from '../../services/purchase.service';
import { AuthResponse } from '../../models/user';

describe('PaymentComponent', () => {
  let fixture: ComponentFixture<PaymentComponent>;
  let component: PaymentComponent;
  let router: Router;
  let currentUser = signal<AuthResponse | null>(null);
  let authService: { currentUser: typeof currentUser; login: jasmine.Spy };

  const user: AuthResponse = {
    token: 'jwt',
    email: 'jan@test.com',
    firstName: 'Jan',
    lastName: 'Boer'
  };

  async function setup(loggedIn = false) {
    TestBed.resetTestingModule();
    currentUser = signal(loggedIn ? user : null);
    authService = {
      currentUser,
      login: jasmine.createSpy('login').and.callFake(() => {
        currentUser.set(user);
        return of(user);
      })
    };

    await TestBed.configureTestingModule({
      imports: [PaymentComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: PurchaseService, useValue: { pendingSquareIds: [10, 11] } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  }

  afterEach(() => fixture?.destroy());

  it('puts selected blocks in the other-payment mailto', async () => {
    await setup();
    const decoded = decodeURIComponent(component.otherPayMailto);
    expect(component.otherPayMailto.startsWith('mailto:ontvangs@orania.co.za')).toBeTrue();
    expect(decoded).toContain('10, 11');
  });

  it('shows guest email and login for visitors', async () => {
    await setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('E-pos');
    expect(text).toContain('Ek het reeds ’n rekening');
  });

  it('hides guest email and login when already signed in', async () => {
    await setup(true);
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Ek het reeds ’n rekening');
    expect(fixture.nativeElement.querySelector('#guest-email')).toBeNull();
  });

  it('opens the meld-aan dialog, then stays on checkout without guest fields', async () => {
    await setup();
    component.openLogin();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();

    component.loginEmail = 'jan@test.com';
    component.loginPassword = 'Wagwoord1!';
    component.submitLogin();
    fixture.detectChanges();

    expect(authService.login).toHaveBeenCalledWith('jan@test.com', 'Wagwoord1!');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('#guest-email')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Ek het reeds ’n rekening');
  });

  it('keeps the dialog open when login fails', async () => {
    await setup();
    authService.login.and.returnValue(throwError(() => ({ error: { message: 'Verkeerde wagwoord.' } })));
    component.openLogin();
    component.submitLogin();
    fixture.detectChanges();

    expect(component.showLogin).toBeTrue();
    expect(component.loginError).toBe('Verkeerde wagwoord.');
    expect(fixture.nativeElement.querySelector('#guest-email')).not.toBeNull();
  });
});
