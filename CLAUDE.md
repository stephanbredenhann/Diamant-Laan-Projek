# Diamantlaan-teerprojek

## Writing style (Afrikaans UI copy)

**Minimal em dashes.** Do not use `—` in user-facing copy. Split the sentence in two,
or use a comma or colon instead.

```
Bad:  Stuur gerus ’n e-pos — ons help graag.
Good: Stuur gerus ’n e-pos. Ons help graag.
```

Applies to anything a visitor reads: templates, step and FAQ copy, button labels,
error messages. Existing copy that already contains em dashes is not a bug to hunt
down, but replace them when you are editing that text anyway.

The audience skews 50-60, so keep sentences short and headings big and bold.

## Angular gotcha

`@` is control-flow syntax in Angular 17+ templates. Write email addresses as
`inligting&#64;orania.co.za`, never a bare `@`, or the build fails.
