import { Pipe, PipeTransform, inject } from '@angular/core';
import { LangService } from './lang.service';

/**
 * Usage: {{ 'Vordering' | t }}
 *
 * ponytail: impure so a language switch re-renders every use. A pure pipe would
 * cache on its (unchanged) input and keep showing the old language. It is a
 * single object lookup per binding; if profiling ever flags it, hoist the hot
 * pages onto a computed() instead.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TPipe implements PipeTransform {
  private lang = inject(LangService);

  transform<T extends string | null | undefined>(af: T): T {
    // Error signals are `string | null`; passing one straight through keeps the
    // caller's `@if` on it working instead of forcing a cast at every use.
    return (af ? this.lang.t(af) : af) as T;
  }
}
