/**
 * Nombre de marca "AlNegocio" con las letras A, l, c, i resaltadas en verde.
 * Estructura:  Al(verde) Nego(normal) ci(verde) o(normal)
 */
export function BrandName({ className, accent = "text-emerald-500" }: { className?: string; accent?: string }) {
  return (
    <span className={className}>
      <span className={accent}>Al</span>
      Nego
      <span className={accent}>ci</span>
      o
    </span>
  );
}
