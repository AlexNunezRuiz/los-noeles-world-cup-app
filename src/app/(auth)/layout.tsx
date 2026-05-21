export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-marcador font-bold uppercase text-4xl tracking-wide text-ink">
            Mundial <span className="text-red">&apos;26</span>
          </h1>
          <p className="text-ink-muted text-xs uppercase tracking-widest mt-2">
            USA · México · Canadá
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
