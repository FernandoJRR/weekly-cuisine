import { useState, useEffect } from "react"
import { createCliRenderer } from "@opentui/core"
import { createRoot, useKeyboard } from "@opentui/react"
import { color } from "./tokens"
import { Sidebar } from "./components/Sidebar"
import { StatusBar } from "./components/StatusBar"
import { RecipesScreen } from "./screens/RecipesScreen"
import { IngredientsScreen } from "./screens/IngredientsScreen"
import { NutrientsScreen } from "./screens/NutrientsScreen"
import { SearchScreen } from "./screens/SearchScreen"
import { PlanScreen } from "./screens/PlanScreen"
import { HelpOverlay } from "./components/HelpOverlay"
import { useRecipes } from "./hooks/useRecipes"
import { useIngredients } from "./hooks/useIngredients"
import { usePlans } from "./hooks/usePlans"
import { useNutrients } from "./hooks/useNutrients"
import { useStatusMessage } from "./hooks/useStatusMessage"
import type { Screen } from "@wc/types"

const SCREENS: Screen[] = ["recipes", "ingredients", "nutrients", "search", "plan"]

function App({ onQuit }: { onQuit: () => void }) {
  const recipesHook = useRecipes()
  const ingredientsHook = useIngredients()
  const nutrientsHook = useNutrients()
  const planHook = usePlans()
  const status = useStatusMessage()
  const [screen, setScreen] = useState<Screen>("recipes")
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => { if (recipesHook.error) status.flash(recipesHook.error) }, [recipesHook.error])
  useEffect(() => { if (planHook.error) status.flash(planHook.error) }, [planHook.error])
  useEffect(() => { if (ingredientsHook.error) status.flash(ingredientsHook.error) }, [ingredientsHook.error])
  useEffect(() => { if (nutrientsHook.error) status.flash(nutrientsHook.error) }, [nutrientsHook.error])

  useKeyboard((key) => {
    if (showHelp) {
      if (key.name === "escape" || key.name === "?") setShowHelp(false)
      return
    }
    if (recipesHook.modal.open) return
    if (recipesHook.cookMode.open) return
    if (recipesHook.confirmOpen) return
    if (ingredientsHook.modalOpen) return
    if (ingredientsHook.confirmOpen) return
    if (nutrientsHook.modalOpen) return
    if (nutrientsHook.confirmOpen) return
    if (planHook.modalOpen) return
    if (planHook.confirmOpen) return
    if (key.name === "?") { setShowHelp(true); return }
    if (key.name === "q") onQuit()
    if (key.name === "tab" && !key.shift) {
      const idx = SCREENS.indexOf(screen)
      setScreen(SCREENS[(idx + 1) % SCREENS.length]!)
    }
  })

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor={color.bg.base}>
      <box flexDirection="row" flexGrow={1}>
        <Sidebar current={screen} onNavigate={setScreen} />

        {screen === "recipes" && (
          <RecipesScreen
            active
            recipes={recipesHook.recipes}
            ingredients={ingredientsHook.ingredients}
            modal={recipesHook.modal}
            cookMode={recipesHook.cookMode}
            onAdd={recipesHook.add}
            onUpdate={recipesHook.update}
            onRemove={recipesHook.remove}
            onOpenAdd={recipesHook.openAdd}
            onOpenEdit={recipesHook.openEdit}
            onCloseModal={recipesHook.closeModal}
            confirmOpen={recipesHook.confirmOpen}
            onOpenConfirm={recipesHook.openConfirm}
            onCloseConfirm={recipesHook.closeConfirm}
            onOpenCook={recipesHook.openCook}
            onCloseCook={recipesHook.closeCook}
            onNextStep={recipesHook.nextStep}
            onPrevStep={recipesHook.prevStep}
            onFlash={status.flash}
          />
        )}

        {screen === "ingredients" && (
          <IngredientsScreen
            active
            ingredients={ingredientsHook.ingredients}
            nutrients={nutrientsHook.nutrients}
            onAdd={ingredientsHook.add}
            onUpdate={ingredientsHook.update}
            onRemove={ingredientsHook.remove}
            onFlash={status.flash}
            modalOpen={ingredientsHook.modalOpen}
            confirmOpen={ingredientsHook.confirmOpen}
            onOpenModal={ingredientsHook.openModal}
            onCloseModal={ingredientsHook.closeModal}
            onOpenConfirm={ingredientsHook.openConfirm}
            onCloseConfirm={ingredientsHook.closeConfirm}
          />
        )}

        {screen === "nutrients" && (
          <NutrientsScreen
            active
            nutrients={nutrientsHook.nutrients}
            modalOpen={nutrientsHook.modalOpen}
            confirmOpen={nutrientsHook.confirmOpen}
            onAdd={nutrientsHook.add}
            onUpdate={nutrientsHook.update}
            onRemove={nutrientsHook.remove}
            onOpenModal={nutrientsHook.openModal}
            onCloseModal={nutrientsHook.closeModal}
            onOpenConfirm={nutrientsHook.openConfirm}
            onCloseConfirm={nutrientsHook.closeConfirm}
            onFlash={status.flash}
          />
        )}

        {screen === "search" && (
          <SearchScreen
            active
            recipes={recipesHook.recipes}
            ingredients={ingredientsHook.ingredients}
          />
        )}

        {screen === "plan" && (
          <PlanScreen
            active
            plans={planHook.plans}
            recipes={recipesHook.recipes}
            nutrients={nutrientsHook.nutrients}
            modalOpen={planHook.modalOpen}
            confirmOpen={planHook.confirmOpen}
            editingId={planHook.editingId}
            onAdd={planHook.add}
            onEdit={planHook.update}
            onRemove={planHook.remove}
            onGrocery={planHook.grocery}
            onSolve={planHook.solve}
            onOpenAdd={planHook.openAdd}
            onOpenEdit={planHook.openEdit}
            onCloseModal={planHook.closeModal}
            onOpenConfirm={planHook.openConfirm}
            onCloseConfirm={planHook.closeConfirm}
            onFlash={status.flash}
          />
        )}
      </box>
      <StatusBar message={status.message} current={screen} screens={SCREENS} />
      {showHelp && <HelpOverlay />}
    </box>
  )
}

const renderer = await createCliRenderer()
createRoot(renderer).render(<App onQuit={() => renderer.destroy()} />)
