export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-background">
      <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
      <p className="text-muted-foreground mb-6">The page you requested could not be found.</p>
    </div>
  );
}
