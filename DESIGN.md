# Design: Huddle

**One idea:** the page is calm until people arrive. Each person has a colour that shows on their cursor, their marks and
the light around them.

Source of truth: `src/app/globals.css` (tokens), `src/lib/people.ts` (person colours), `src/lib/voice.ts` (display type).
Chosen after reviewing about 105 live websites and the owner's own three sites. The owner rejected, in order:
formula-derived directions, Science Gothic, fully rounded letters, a pure black-and-white palette, and an
indigo-and-lilac one.

## Themes: "Orchard"

Neither theme uses pure black or pure white for the page. Both come from one set of `light-dark()` tokens.

| Token | Light (pale pistachio) | Dark (moss) |
| --- | --- | --- |
| `--ground` | `#ecf0e1` | `#0e1810` |
| `--sheet` (lifted surfaces) | `#fdfef7` | `#162519` |
| `--ink` | `#14241a` | `#eef3e2` |
| `--brand` | `#1c6b41` forest | `#ffb066` apricot |

Feature chapters: forest, apricot, lime and tomato. Text and button pairs were checked for WCAG contrast.
Depth comes from green-tinted shadows, a soft-light grain, a dotted "shared canvas" and slow ambient light.

Person colours: tangerine, cobalt, emerald, berry, pink, sunflower, sky, lime. A user keeps the same one everywhere.
No indigo, violet or purple anywhere: that family reads as machine-generated.

## Type

- Display: **Google Sans Flex** with roundness `ROND 50` (owner's choice), width and weight as the moving parts.
- Reading and interface: **Schibsted Grotesk**. Code: **JetBrains Mono**.

## Shape

The cursor's name tag: one small corner (top left) and the rest round (`.tag`, `.btn`, `.sheet`). Buttons flip which
corner is sharp on hover.

## Motion

| Where | What it does |
| --- | --- |
| Hero | Letters keep their natural shapes. One under a person grows a little and takes their colour while neighbours move aside; the line keeps its width. Each person casts light. |
| Hero edges | Pieces of a shared page in the side margins at different depths, following the pointer |
| "Three people. One page." | Three demo people type their parts at once. Letters hold their places, so nothing reflows. |
| Chapters | Each feature belongs to a person whose gradient takes over; each has its own working demo |
| "Press /" and "Locked properly." | A key that presses down; combination-lock dials that click into place |
| Finale | Six people carry six letters in to spell the name |
| App | Spring transitions for presence faces, panels, menus, lists and navigation; the theme spreads from its button |

Rules: the writing surface stays calm; motion in the app answers an action or shows a person arriving.
All motion respects reduced-motion settings.

## Performance rules

Built for a 2560×1600, 240 Hz screen (about 4 ms a frame).

- Per-frame animation changes only `transform` and `opacity`; never font axes, widths or colours.
- Physics is timed by the clock, so speed is the same at any refresh rate.
- No full-screen blend layers, no background blur, no large moving gradients except the light that follows people.
- Animations stop when off screen.
- The headline never stretches letters to fill a wide screen: its size follows the tighter of width and height. Demo people on marketing pages are labelled as demos.

## Review status

The mechanical design check (`impeccable detect`) reports no findings, and the main screens were inspected in
headless Chrome in both themes and at phone width. An independent design review was not run.
