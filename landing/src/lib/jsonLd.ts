/**
 * JSON-LD for a `<script type="application/ld+json">` written with `set:html`: `JSON.stringify`
 * alone would let a `</script>` inside a value (a listing title from the catalogue snapshot) end
 * the script element early and run what follows. `<` becomes `<`, which JSON parsers read as
 * the same character and HTML parsers never see as a tag; `>` and `&` likewise.
 */
export const toJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
