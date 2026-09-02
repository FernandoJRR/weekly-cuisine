/*
 * The design system's three mono faces, self-hosted through Fontsource.
 *
 * Import the latin subset at one specific weight per file: a bare
 * `import "@fontsource/roboto-mono"` would pull cyrillic, greek, italics and
 * every weight the family ships. These eight faces are the only cuts the token
 * layer references (--font-display / --font-body / --font-mono x 400/500/700).
 *
 * Space Mono has no 500 weight - the family only ships 400 and 700 - so body
 * text must never ask for --weight-medium.
 */

import "@fontsource/azeret-mono/latin-400.css" // display
import "@fontsource/azeret-mono/latin-500.css"
import "@fontsource/azeret-mono/latin-700.css"
import "@fontsource/space-mono/latin-400.css" // body - 400/700 only
import "@fontsource/space-mono/latin-700.css"
import "@fontsource/roboto-mono/latin-400.css" // mono
import "@fontsource/roboto-mono/latin-500.css"
import "@fontsource/roboto-mono/latin-700.css"
