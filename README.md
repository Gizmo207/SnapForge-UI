# My UI Library

A personal collection of reusable UI pieces - from design tokens to full page templates.
Grab what you need, drop it into any project.

## Structure

```text
templates/
|-- foundations/     -> Design tokens: colors, typography, spacing, shadows
|-- primitives/      -> Smallest building blocks: buttons, inputs, badges, avatars, icons
|-- components/      -> Composed from primitives: cards, modals, dropdowns, tabs, tooltips
|-- patterns/        -> Composed from components: navbars, headers, footers, hero sections, forms
|-- layouts/         -> Page-level shells: sidebar layout, dashboard, centered, split-screen
|-- pages/           -> Full page templates: landing, login, 404, settings, dashboard
`-- styles/          -> Shared CSS/Tailwind config, global resets, theme files
```

## How It Works

1. `foundations/` - The raw design decisions. Colors, font sizes, spacing scales.
2. `primitives/` - The atoms. A single button, input, badge, or avatar.
3. `components/` - Built from primitives. Cards, modals, dropdowns, etc.
4. `patterns/` - Recognizable sections. Navbars, hero blocks, forms, footers.
5. `layouts/` - Page shells. Sidebar + content, split-screen, centered layouts.
6. `pages/` - Complete templates ready to use.
7. `styles/` - Shared stylesheets, variables, and resets.

## Usage

Each folder has sub-folders by type (for example, `primitives/buttons/`).
Each component lives in its own folder with framework variants:

```text
primitives/buttons/
`-- button-primary/
    |-- react.tsx
    |-- html.html      (optional)
    `-- styles.css     (optional)
```

Just copy what you need into your project.
