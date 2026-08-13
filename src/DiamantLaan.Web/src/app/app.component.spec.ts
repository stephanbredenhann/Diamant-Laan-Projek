import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/shared/navbar/navbar.component';

@Component({ standalone: true, template: '' })
class BladsyStub {}

describe('AppComponent', () => {
  const configure = (routes: Parameters<typeof provideRouter>[0]) =>
    TestBed.configureTestingModule({
      imports: [AppComponent, NavbarComponent],
      providers: [provideHttpClient(), provideRouter(routes)]
    }).compileComponents();

  beforeEach(async () => {
    await configure([]);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the navbar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });

  it('hides the navbar on a route marked kaal, and brings it back after', async () => {
    TestBed.resetTestingModule();
    await configure([
      { path: 'deel/:token', data: { kaal: true }, component: BladsyStub },
      { path: 'vrae', component: BladsyStub }
    ]);

    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    await router.navigateByUrl('/deel/abc');
    fixture.detectChanges();
    expect(compiled.querySelector('app-navbar')).toBeNull();

    await router.navigateByUrl('/vrae');
    fixture.detectChanges();
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });
});
