import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/i18n"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <TooltipProvider>
        <App />
        <Toaster richColors closeButton />
      </TooltipProvider>
    </I18nProvider>
  </StrictMode>,
)
