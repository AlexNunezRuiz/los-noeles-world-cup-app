// Esqueleto de carga para las rutas de (app). Hace que la navegación se sienta
// instantánea en vez de bloqueada mientras carga la siguiente pantalla.
export default function Loading() {
  return (
    <div className="space-y-3 pb-6" aria-hidden="true">
      <div className="h-9 w-44 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-16 animate-pulse rounded-xl border border-border bg-surface" />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}
