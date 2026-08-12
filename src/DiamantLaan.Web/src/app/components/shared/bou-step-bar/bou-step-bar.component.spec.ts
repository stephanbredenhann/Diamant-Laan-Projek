import { BouStepBarComponent } from './bou-step-bar.component';

/**
 * The step rail is a navigation control, so the only logic worth pinning down is
 * which steps it will let someone jump to.
 */
describe('BouStepBarComponent.kanSpring', () => {
  const bar = (active: 1 | 2 | 3, nextEnabled = false) => {
    const c = new BouStepBarComponent();
    c.active = active;
    c.nextEnabled = nextEnabled;
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
});
