export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-center">
        <h1>
          {/* Dumbbell from public/icon.svg, cropped to the symbol */}
          <svg
            viewBox="135 165 242 182"
            className="h-5 w-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth={30}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M196 256H316M196 180V332M316 180V332M150 200V312M362 200V312" />
          </svg>
          <span className="sr-only">Fitness Tracker</span>
        </h1>
      </div>
    </header>
  )
}
