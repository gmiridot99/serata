export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display text-2xl font-bold text-text tracking-wide">serata</span>
        </div>
        {children}
      </div>
    </div>
  )
}
