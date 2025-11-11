import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 bg-white/70 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="text-2xl font-bold bg-linear-to-r from-blue-700 via-blue-400 to-blue-600 bg-clip-text text-transparent">
         <Link href={"/"}>Mathly</Link>
        </div>
        <nav className="flex">
          <ul className="flex items-center space-x-8 text-sm font-semibold text-gray-600">
            <li>
              <Link href="/lessons" className="hover:text-blue-600 transition-colors">
                Lessons
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}