export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Porra del Mundial 2026</h1>
          <p className="text-muted-foreground mt-2">USA - México - Canadá</p>
        </div>
        {children}
      </div>
    </div>
  );
}
