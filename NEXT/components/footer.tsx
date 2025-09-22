import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold text-primary">
              OrthoAssist
            </Link>
            <p className="mt-4 text-muted-foreground max-w-md">
              Modular orthopedic AI assistant with multi-agent workflow for precise, faster diagnosis.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Product</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/product/agents" className="text-muted-foreground hover:text-primary">
                  Agents
                </Link>
              </li>
              <li>
                <Link href="/product/workflow" className="text-muted-foreground hover:text-primary">
                  Workflow
                </Link>
              </li>
              <li>
                <Link href="/product/features" className="text-muted-foreground hover:text-primary">
                  Features
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/docs" className="text-muted-foreground hover:text-primary">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary">
                  Contact
                </Link>
              </li>
              <li>
                <a href="mailto:support@orthoassist.ai" className="text-muted-foreground hover:text-primary">
                  support@orthoassist.ai
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">© 2024 OrthoAssist. All rights reserved.</p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link href="/privacy" className="text-muted-foreground hover:text-primary text-sm">
                Privacy
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary text-sm">
                Terms
              </Link>
              <a href="https://github.com/orthoassist" className="text-muted-foreground hover:text-primary text-sm">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
