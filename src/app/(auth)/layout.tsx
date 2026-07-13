// Minimal centered shell for unauthenticated flows (login, and later register /
// password reset). Its own layout, outside the marketing (site) chrome. Provides
// the single <main> landmark for these routes.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
