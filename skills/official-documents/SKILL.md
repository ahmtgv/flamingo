---
name: official-documents
description: "Use when creating official documents in the Flamingo corporate style — information letters, notices, memos, orders (приказ), statements (справка), agreements cover pages, and similar formal deliverables for the Flamingo education platform. Produces branded .docx (and a PDF rendering) with the Flamingo letterhead, palette and typography. Builds on the `docx` skill for generation mechanics."
---

# Flamingo — Official Documents

Produce formal Flamingo documents (Russian-language, A4) with a consistent corporate identity: the flamingo wordmark letterhead, warm palette accents, IBM Plex Sans typography, and a standard structure (meta block, title, body, sections, tables, signature, footer).

**This skill defines the STYLE.** For generation mechanics (docx-js API, validation, PDF conversion, tables, lists), follow the `docx` skill. Always generate with docx-js, then validate, then convert to PDF.

## Reference files (in this skill folder)
- `sample_official_document.docx` — editable reference/template (an information letter). Copy and adapt it.
- `sample_official_document.pdf` — how the finished document must look.

Open the sample first and match its layout, spacing and styling.

## Page setup (A4, GOST margins)
- Size: A4 — `width: 11906, height: 16838` (DXA).
- Margins (DXA): `left: 1701` (30 mm), `right: 850` (15 mm), `top: 1134` (20 mm), `bottom: 1134` (20 mm).
- Content width = **9355 DXA** (tables and column widths must sum to this).

## Fonts
- Body: **IBM Plex Sans** (Regular). Headings & letterhead: **IBM Plex Sans SemiBold** (use this family directly with `bold: false`, not synthetic bold).
- Numbers/codes read naturally in Plex Sans; no separate mono needed in print.
- **PDF rendering requires the fonts installed system-wide.** `@fontsource/ibm-plex-sans` ships split Latin/Cyrillic subsets — merge them into full TTFs (latin + cyrillic[-ext]) per weight with `fonttools merge`, name them `IBM Plex Sans` (400) and `IBM Plex Sans SemiBold` (600), drop into `~/.fonts`, run `fc-cache -f`. Without this, Cyrillic may render as tofu.

## Sizes (half-points in docx-js)
| Element | Font | Size | Notes |
|---|---|---|---|
| Title (H1) | SemiBold | 28 (14pt) | centered, coral bottom rule, color ink |
| Section (H2) | SemiBold | 23 (11.5pt) | color ink, space before |
| Body | Regular | 22 (11pt) | justified, line `320` (~1.33), space after `160` |
| Meta / addressee | Regular | 20–21 | right-aligned block, meta in secondary |
| Table header | SemiBold | 20 | tint background |
| Table cell | Regular | 20 | |
| Footer details | Regular | 15 (7.5pt) | secondary |

## Colors (Flamingo palette — hex)
- Text (ink): `2A2520` · Secondary: `6E6456` · Muted: `8B7F69`
- Coral rule / accent: `BE4622`
- Table borders: `E0D8CA` · Table header tint: `FBEDE6` (coral-50)
- Keep documents on white paper; brand color appears only in the letterhead rule, footer rule and table header — restrained and professional.

## Letterhead (header)
- Flamingo wordmark (ink letters + coral dot) top-left, ~208×51 px. Use the brand asset `flamingo-logo.svg` (render to PNG) from the brandbook.
- Coral bottom border on the header paragraph: `{ style: SINGLE, size: 8, color: "BE4622", space: 6 }`.

## Footer
- Coral **top** border on the first footer paragraph.
- Line 1 (small, secondary): organization details — e.g. `Образовательная платформа Flamingo · ООО «Фламинго» · ИНН … · г. Москва · flamingo.example · hello@flamingo.example`.
- Line 2 (right, muted): `Страница {CURRENT} из {TOTAL_PAGES}` using docx `PageNumber`.

## Document structure (order)
1. **Meta**, right-aligned: `№ … от … г.`
2. **Addressee**, right-aligned (recipient org + name).
3. **Title** (H1, centered, coral rule under).
4. **Greeting**: `Уважаемая/Уважаемый …!`
5. **Body**: justified paragraphs.
6. **Sections** (H2) with body, numbered/bulleted lists, tables.
7. **Closing**: `С уважением,`
8. **Signature block**: role (secondary) + spacing for signature + name (SemiBold).

## Typography & language rules
- Russian guillemets `« »` for quotes; en-dash `–` in numeric ranges (`1–2 рабочих дня`).
- Justify body text; keep generous line spacing for long reading (brand principle).
- Lists: use docx `LevelFormat` (DECIMAL / BULLET) — **never** insert unicode bullets manually.
- Tables: dual widths (table `columnWidths` + cell `width`) in DXA summing to 9355; `ShadingType.CLEAR`; cell margins `{top:80,bottom:80,left:140,right:140}`; never use tables as dividers.

## Don'ts
- No pure black text or pure white-on-color buttons-style accents — use ink and the palette above.
- No heavy use of coral; it is an accent, not a fill for large areas.
- No childish or decorative elements — these are formal documents.
