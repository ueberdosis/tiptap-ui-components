import { createRoot } from "react-dom/client"
import { SimpleEditor } from "@/components/templates/simple/simple-editor"

const App = () => <SimpleEditor />

createRoot(document.getElementById("app")!).render(<App />)
