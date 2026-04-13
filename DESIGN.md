# Design System Specification: The Scholarly Intelligence Framework

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**

This design system moves away from the aggressive, "tactical" aesthetic often found in intelligence tools. Instead, it adopts the persona of a high-end digital curator—an authoritative, scholarly environment where data is treated as literature. We break the "template" look by prioritizing **intentional asymmetry** and **tonal depth** over rigid grids and borders. 

The goal is to provide an interface that feels as permanent and reliable as a physical archive, using sophisticated layering to guide the analyst through complex datasets without visual fatigue. We replace loud UI elements with quiet confidence, using high-contrast typography scales and subtle background shifts to define the workspace.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep navy (`primary`) and slate grays (`secondary`), punctuated by a scholarly "Sage" (`tertiary`) for moments of insight.

### The Surface Hierarchy (Nesting Depth)
To achieve a premium feel, we never use flat layouts. Instead, we use "Tonal Layering":
*   **Base:** `surface` (#f8f9fb) is your canvas.
*   **Sectioning:** Use `surface_container_low` (#f2f4f6) for major layout blocks.
*   **Focus Areas:** Use `surface_container_lowest` (#ffffff) for the most critical interactive cards or data entry points to provide a "natural lift."

### The Rules of Engagement
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Divisions must be achieved through color shifts (e.g., an `eceef0` container against a `f8f9fb` background).
*   **The "Glass & Gradient" Rule:** Floating panels (modals, dropdowns) should utilize **Glassmorphism**. Apply `surface` at 80% opacity with a 12px backdrop blur. 
*   **Signature Textures:** For high-level summaries or hero headers, use a subtle linear gradient from `primary` (#041627) to `primary_container` (#1a2b3c). This adds "soul" and depth to the data-heavy environment.

---

## 3. Typography
We use a bi-font system to separate "The Interface" from "The Evidence."

*   **UI Elements (The Tool):** **Manrope** (Sans-Serif). Used for `display`, `headline`, and navigation. It is precise, modern, and technical.
*   **Content (The Intelligence):** **Newsreader** (Serif). Used for `title` and `body` styles. This creates a scholarly, editorial experience for long-form reports and data narratives.
*   **Metadata (The Detail):** **Inter** (Sans-Serif). Used for `label-md` and `label-sm`.

### Key Scales:
*   **Display-LG (Manrope, 3.5rem):** High-impact metrics or major section titles.
*   **Title-LG (Newsreader, 1.375rem):** Report headers; gives the feeling of a prestige newspaper.
*   **Body-MD (Newsreader, 0.875rem):** The standard for intelligence briefs; high legibility for sustained reading.

---

## 4. Elevation & Depth
This system eschews traditional shadows for **Ambient Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface_container_lowest` card sitting on a `surface_container_low` section provides a soft, natural lift without the "dirty" look of heavy drop shadows.
*   **Ambient Shadows:** For floating elements only (e.g., context menus), use: `box-shadow: 0 12px 32px rgba(25, 28, 30, 0.06);`. The shadow color must be a tint of `on_surface` to feel integrated with the light.
*   **The "Ghost Border":** If accessibility requires a stroke, use `outline_variant` (#c4c6cd) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#041627) with `on_primary` (#ffffff) text. Use `md` (0.375rem) roundedness.
*   **Secondary:** `secondary_container` (#cbe7f5) with `on_secondary_container` (#4e6874).
*   **Tertiary (Sage):** Use `tertiary_container` (#202d15) for "Success" or "Validated" actions.

### Cards & Intelligence Lists
*   **Constraint:** **Forbid divider lines.** 
*   **Execution:** Use vertical white space (1.5rem+) and background shifts to separate entries. A "Card" is simply a `surface_container_highest` block with a 2px vertical accent of `primary` on the left edge to denote focus.

### Input Fields
*   **Visual:** Minimalist. No full box. Use a `surface_container_low` background with a subtle `primary` underline (2px) that activates on focus.
*   **Typography:** Labels must use `label-md` (Inter) for a technical feel.

### Specialized: The Intelligence "Breadcrumb"
For complex nested analysis, use a horizontal list of `Chips` using the `secondary_fixed` (#cbe7f5) token to show the path of inquiry.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align high-level data to the left and metadata/supplementary info to a narrower right column.
*   **Use Serif for Data:** When an analyst is reading a transcript or a report, it *must* be in Newsreader to reduce eye strain and signal "Expert Content."
*   **White Space as a Tool:** Use the `xl` (0.75rem) spacing units to give complex charts room to breathe.

### Don’t:
*   **No Pure Black:** Never use #000. Use `on_surface` (#191c1e) for text to maintain the refined, scholarly tone.
*   **No Grid-Lock:** Avoid boxing every element. Let the content define the container.
*   **No Standard Blue:** If a "Link" is needed, use `tertiary` (#0c1804) with an underline rather than a standard "web blue."

---
*Director's Note: Remember, we are building a tool for thinkers. The UI should never scream; it should provide the quietest possible background for the most difficult possible decisions.*