import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { App } from "./App"
import { IngredientsScreen } from "./screens/IngredientsScreen"
import { NutrientsScreen } from "./screens/NutrientsScreen"
import { PlaceholderScreen } from "./screens/PlaceholderScreen"
import { RecipesScreen } from "./screens/RecipesScreen"
import { SearchScreen } from "./screens/SearchScreen"
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
          {/* Real through phase 3; plan lands in phase 4. */}
          <Route path="/nutrients" element={<NutrientsScreen />} />
          <Route path="/ingredients" element={<IngredientsScreen />} />
          <Route path="/recipes" element={<RecipesScreen />} />
          <Route path="/recipes/:id" element={<RecipesScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/plan" element={<PlaceholderScreen title="plans" phase="phase 4" />} />
          <Route path="*" element={<Navigate to="/recipes" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
