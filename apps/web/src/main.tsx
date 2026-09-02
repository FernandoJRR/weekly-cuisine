import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { App } from "./App"
import { IngredientsScreen } from "./screens/IngredientsScreen"
import { NutrientsScreen } from "./screens/NutrientsScreen"
import { PlaceholderScreen } from "./screens/PlaceholderScreen"
import "./styles/fonts"
import "./styles/base.css"

const root = document.getElementById("root")
if (!root) throw new Error("missing #root")

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/recipes" replace />} />
          {/* Real through phase 2; the rest land in phases 3-4. */}
          <Route path="/nutrients" element={<NutrientsScreen />} />
          <Route path="/ingredients" element={<IngredientsScreen />} />
          <Route path="/recipes" element={<PlaceholderScreen title="recipes" phase="phase 3" />} />
          <Route path="/search" element={<PlaceholderScreen title="search" phase="phase 3" />} />
          <Route path="/plan" element={<PlaceholderScreen title="plans" phase="phase 4" />} />
          <Route path="*" element={<Navigate to="/recipes" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
