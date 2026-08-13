import { BouStepBarComponent } from './bou-step-bar.component';

/**
 * The step rail is a navigation control, so the only logic worth pinning down is
 * which steps it will let someone jump to.
 */
describe('BouStepBarComponent.kanSpring', () => {
  const bar = (active: 1 | 2 | 3 | 4, nextEnabled = false, gesluit = false) => {
    const c = new BouStepBarComponent();
    c.active = active;
    c.nextEnabled = nextEnabled;
    c.gesluit = gesluit;
    return c;
  };

  it('allows completed steps', () => {
    const c = bar(3);
    expect(c.kanSpring(1)).toBe(true);
    expect(c.kanSpring(2)).toBe(true);
  });

  it('never links the current step', () => {
    expect(bar(2).kanSpring(2)).toBe(false);
    expect(bar(2, true).kanSpring(2)).toBe(false);
  });

  it('blocks the next step until the current one is valid', () => {
    expect(bar(1).kanSpring(2)).toBe(false);
    expect(bar(1, true).kanSpring(2)).toBe(true);
  });

  it('never skips more than one step ahead', () => {
    expect(bar(1, true).kanSpring(3)).toBe(false);
  });

  it('links nothing at all once the rail is locked', () => {
    const c = bar(4, true, true);
    for (const step of [1, 2, 3, 4]) expect(c.kanSpring(step)).toBe(false);
  });

  it('never links the certificate step, which has no route', () => {
    expect(bar(3, true).kanSpring(4)).toBe(false);
  });
});
