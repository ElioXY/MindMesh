# MindMesh

An Obsidian-style note-taking web app. Everything runs in the browser and notes are stored in IndexedDB, so there is no backend.

**Stack:** Vite, React 19, TypeScript, Zustand, Dexie, CodeMirror 6, React Flow, react-markdown, lucide-react.

## Run and deploy

```bash
npm install
npm run dev        # local development
npm run build      # production build into dist/
```

Render: create a **Static Site**, build command `npm install && npm run build`, publish directory `dist`.

## Features

- Live-preview Markdown editor with `[[wikilinks]]`, `#tags`, task checkboxes and `/` commands
- Backlinks, outgoing links and tags per note
- Folders (nested, drag and drop), pinned notes, tabs, search, command palette
- Global graph and a local graph panel
- Dark and light themes, animations, undo for deleted notes
- Import and export (JSON backup, `.md` files)

Shortcuts: `Ctrl/⌘ K` palette, `Alt N` new note, `Ctrl/⌘ E` live/source mode, `Ctrl/⌘ click` opens a link in the editor.

---

# Change log

Line numbers refer to the files **as delivered in this version**. If you edit a file they will shift.

The work happened in three rounds:

1. **Round 1:** the mind-map demo was replaced by a note-taking app.
2. **Round 2:** a visual redesign, animations and performance work.
3. **Round 3:** the live-preview editor, folders with pins, and the local graph.

## Files removed or replaced from the original tutorial

| File | What happened |
| --- | --- |
| `src/App.css` | Deleted. All styling now lives in `src/index.css`. |
| `src/assets/` | Deleted (unused Vite template assets). |
| Tailwind (`@import "tailwindcss"` in `index.css`) | Dropped. The app uses plain CSS with variables. |
| Tutorial `App.tsx` (mind-map canvas, properties inspector) | Replaced entirely by the notes app. The React Flow canvas now powers only the global graph. |
| `localStorage` persistence of nodes and edges | Replaced by IndexedDB (Dexie) for notes and folders. |

## `package.json`

| Lines | Change | Round |
| --- | --- | --- |
| 13-18 | Added `@codemirror/autocomplete`, `commands`, `lang-markdown`, `language`, `state`, `view` | 3 |
| 19-21 | `@xyflow/react`, `dexie`, `lucide-react` kept from the tutorial | 1 |
| 24-25 | Added `react-markdown`, `remark-gfm` (preview rendering) | 1 |
| 26 | `zustand` kept from the tutorial | 1 |

## `index.html`

| Lines | Change | Round |
| --- | --- | --- |
| 7 | Page title set to `MindMesh` | 1 |

## `src/types.ts` (11 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 1-9 | `Note` type: `id`, `title`, `content`, `createdAt`, `updatedAt` | 1 |
| 7-8 | Added optional `folder` and `pinned` fields | 3 |
| 11 | `ViewMode` is now `'live' \| 'source' \| 'split' \| 'preview' \| 'graph'` (originally `'edit' \| 'split' \| 'preview' \| 'graph'`) | 1, 3 |

## `src/db.ts` (10 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 1-7 | Dexie database with a typed `notes` table | 1 |
| 6 | Typed `folders` table | 3 |
| 9 | Schema v1: `notes: 'id, title, updatedAt'` | 1 |
| 10 | Schema v2 adds `folders: 'path'`. Existing vaults upgrade automatically. | 3 |

## `src/store.ts` (395 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 7-20 | `persist()`: debounced (350 ms) per-note save to IndexedDB, with a `saving` flag | 1, 2 |
| 22-30 | Theme type, `Toast` type, `applyTheme()` (sets `data-theme`, saves to localStorage) | 2 |
| 33-97 | `WELCOME` starter notes (rewritten in round 3 to describe live preview, folders, pins and the local graph) | 1, 3 |
| 101-139 | `State` type. Added `folders`, `localGraphOpen`, `localDepth`, `theme`, `saving`, `toasts` and the new actions. | 1-3 |
| 141-155 | Initial state: default view `'live'`, sidebar closed on small screens, theme from localStorage or system setting, local graph defaults to open on wide screens | 2, 3 |
| 157-164 | `toggleTheme()` with a short crossfade class | 2 |
| 166-175 | `toast()` and `dismissToast()` (auto-dismiss, exit animation) | 2 |
| 177-181 | `restoreNote()` used by Undo | 2 |
| 183-196 | `load()`: loads notes and folders, creates the welcome notes on first run | 1, 3 |
| 198-216 | `createNote()`: unique titles, optional `folder` argument | 1, 3 |
| 218-228 | `updateContent()` | 1 |
| 230-248 | `renameNote()`: rewrites `[[links]]` in every other note | 1 |
| 250-261 | `deleteNote()`: shows an Undo toast instead of a confirm dialog | 2 |
| 263-284 | `openNote()`, `openByTitle()` (creates missing notes), `closeTab()` | 1 |
| 286-288 | `setView`, `toggleSidebar`, `setPalette` | 1 |
| 289-290 | `setLocalGraph`, `setLocalDepth` (saved in localStorage) | 3 |
| 292-302 | `togglePin()` | 3 |
| 304-313 | `moveNote()` (drag and drop target) | 3 |
| 315-320 | `createFolder()` | 3 |
| 322-339 | `renameFolder()`: moves notes and subfolders, rewrites paths | 3 |
| 341-363 | `deleteFolder()`: moves its notes to the parent folder, then toasts | 3 |
| 365-385 | `importNotes()`: accepts folders and pins, de-duplicates titles | 1, 3 |
| 387-393 | `dailyNote()` | 1 |
| 395 | Applies the saved theme on startup | 2 |

## `src/lib/text.ts` (90 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 3 | `WIKILINK` regex. The title may not contain `[` (fixes a bug where a `[[` inside inline code swallowed the line). | 1, 3 |
| 4 | `TAG` regex | 1 |
| 6 | `norm()` | 1 |
| 8-9 | `CODE` regex and `stripCode()` so links and tags inside code are ignored | 3 |
| 11-21 | `extractLinks()` and `extractTags()` (now skip code) | 1, 3 |
| 24-37 | `wikiToMarkdown()`: converts `[[x]]` for the preview, leaving code untouched | 1, 3 |
| 39-43 | `renameLinks()` | 1 |
| 45-52 | `uniqueTitle()` | 1 |
| 54-59 | `snippet()` for search results | 1 |
| 61-68 | `download()` | 1 |
| 70-76 | `timeAgo()` | 1 |
| 78-90 | `linksOf()` and `tagsOf()`: per-note `WeakMap` caches (performance) | 2 |

## `src/lib/folders.ts` (new, 38 lines, round 3)

| Lines | Change |
| --- | --- |
| 3 | `FolderNode` type |
| 5-6 | `cleanPath()`: strips illegal characters, normalizes `a/b` |
| 8-11 | `parentOf`, `baseName`, `inFolder`, `replacePrefix` |
| 14-23 | `allFolderPaths()`: explicit folders plus folders implied by notes, with ancestors |
| 25-38 | `buildTree()` |

## `src/lib/layout.ts` (new, 42 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 1-2 | `P` type and options (`pin`, `dist`, `repel`) | 3 |
| 5-42 | Force-directed layout with no extra dependency. It was first written inside `Graph.tsx` in round 1 and moved here in round 3, gaining the pinned centre node and tunable distances for the local graph. | 1, 3 |

## `src/lib/livePreview.ts` (new, 169 lines, round 3)

| Lines | Change |
| --- | --- |
| 7 | `refreshEffect`: forces a redraw when note titles change |
| 9-11 | Wikilink and tag regexes, `hide` decoration |
| 13-28 | `Check` widget: clickable task checkbox |
| 30-32 | `Rule` widget: horizontal rule |
| 34-153 | `build()`: walks the Markdown syntax tree and decorates headings (63-67), strong/emphasis/strikethrough/inline code (68-81), fenced code (82-87), quotes (88-93), links (94-102), dividers (103-105), list marks (106), tasks (107-112), tables (113-116). Syntax is hidden unless the cursor is on that element. |
| 121-153 | Wikilinks (clickable, orange if the note is missing) and `#tags`, ignoring code |
| 155-169 | `livePreview()`: the plugin plus atomic ranges so the cursor skips hidden syntax |

## `src/lib/completions.ts` (new, 61 lines, round 3)

| Lines | Change |
| --- | --- |
| 6-24 | `wikiSource()`: `[[` autocomplete listing notes, plus a "Create “…”" option for new notes |
| 26-42 | Slash command snippets: `/h1 /h2 /h3 /todo /bullet /number /quote /code /table /divider /date /link` |
| 44-61 | `slashSource()` |

## `src/components/Editor.tsx` (83 lines)

| Lines | Change | Round |
| --- | --- | --- |
| whole file | Round 1: textarea editor with `[[` popup, list continuation and Tab indent. Round 3: replaced by CodeMirror 6 | 1, 3 |
| 1-9 | CodeMirror imports | 3 |
| 17 | `Compartment` that turns live preview on and off | 3 |
| 21-62 | Builds the editor: history, markdown language, placeholder, autocompletion (33-37), `Ctrl/⌘ click` on links (40-49), save-on-change listener (51-55) | 3 |
| 64-70 | Live/source switch without losing cursor or undo history | 3 |
| 72-78 | Syncs external content changes (renamed links, undo delete) into the editor | 3 |
| 80 | Redraws link styling when titles change | 3 |
| 82 | Wrapper class `cm-live` or `cm-source` | 3 |

## `src/components/Preview.tsx` (41 lines, round 1)

| Lines | Change |
| --- | --- |
| 1-5 | `react-markdown` + `remark-gfm` imports, `memo` |
| 11 | Wikilinks converted before rendering |
| 19-33 | Custom `<a>`: wikilinks become buttons (orange if the note does not exist), other links open in a new tab |
| 41 | `memo` export (performance) |

## `src/components/Sidebar.tsx` (388 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 11-12 | Drag-and-drop MIME type and check | 3 |
| 14-35 | `Ctx` type shared by the folder tree | 3 |
| 37-71 | `NoteItem`: memoized, draggable, pin button, indented by depth | 2, 3 |
| 73-97 | `FolderInput`: inline input for creating and renaming folders | 3 |
| 99-153 | `FolderBlock`: collapsible folder, hover actions (new note, subfolder, rename, delete), drop target, animated expand | 3 |
| 157-163 | `useDeferredValue` on notes and search (keeps typing smooth) | 2 |
| 166, 171-177 | First-load stagger animation, expanded folders saved in localStorage | 2, 3 |
| 179-190 | Auto-expands the folder of the active note | 3 |
| 192-237 | Folder tree, per-folder note lists, counts, tags, pinned and flat search lists | 1, 3 |
| 239-272 | `ctx` handlers: drop, rename, create, new note in folder, delete folder | 3 |
| 274-294 | `onImport()`: reads `.md` and `.json` (notes and folders), reports with toasts | 1, 2, 3 |
| 300-309 | Top actions: New note (with `Alt N` hint), New folder button, daily note | 1, 3 |
| 311-315 | Search box | 1 |
| 317-322 | Notes/Tags tabs with a sliding pill | 1, 2 |
| 324-332 | Tag cloud | 1 |
| 334-342 | Flat list for search or tag filter | 1, 3 |
| 344-369 | Tree view: Pinned section, Vault label, root drop zone, folders, root notes | 3 |
| 371-386 | Footer: note count, JSON backup (now includes folders), import | 1, 3 |

## `src/components/LocalGraph.tsx` (new, 167 lines, round 3)

| Lines | Change |
| --- | --- |
| 11-36 | `useTweened()`: nodes glide between layouts (skipped if reduced motion is on) |
| 38 | Label truncation |
| 40-94 | Builds the neighbourhood: BFS over links and backlinks to the chosen depth, plus up to 10 dashed "missing note" nodes |
| 96 | Smoothed positions |
| 98-112 | Dynamic `viewBox`, highlighted neighbours on hover |
| 115-125 | Panel header, depth buttons 1/2/3, close button |
| 126-157 | SVG edges and nodes (click opens a note, click on a dashed node creates it) |
| 159-165 | Footer text |

## `src/components/Graph.tsx` (104 lines)

| Lines | Change | Round |
| --- | --- | --- |
| whole file | Round 1: global graph built from note links on React Flow with a force layout | 1 |
| 9 | Layout moved to `lib/layout.ts` | 3 |
| 13, 19-22 | Handles centred on each dot; edges meet at the dot centre | 2 |
| 18 | Staggered pop-in animation per node | 2 |
| 34, 95 | Follows the app theme (`colorMode`) | 2 |
| 54 | Uses the shared `layout()` | 3 |
| 62 | Straight edges using `var(--edge)` | 2 |
| 70 | Relayout only when structure changes, not on every keystroke | 1 |
| 97-99 | Background dots and minimap colours use CSS variables | 2 |
| loaded lazily from `App.tsx:14` | Code-split (~180 kB moved out of the first load) | 2 |

## `src/components/Palette.tsx` (75 lines)

| Lines | Change | Round |
| --- | --- | --- |
| whole file | Round 1: command palette (`Ctrl/⌘ K`) listing notes and commands | 1 |
| 19-20 | `Live preview` and `Source` view commands (replaced `Edit`) | 3 |
| 21 | Show/hide local graph | 3 |
| 25 | Switch theme command | 2 |
| 30 | Pin/Unpin current note | 3 |
| 32 | Delete without `confirm()`, relying on Undo | 2 |
| 43 | Dependencies updated so labels refresh | 3 |

## `src/components/Toasts.tsx` (new, 18 lines, round 2)

Toast stack with an optional action button (used for Undo), `aria-live="polite"`, and enter and exit animations.

## `src/App.tsx` (214 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 1-12 | Imports, including the new icons (`Code`, `Pin`, `PinOff`, `Share2`, theme icons) | 1-3 |
| 14-16 | `Graph`, `Editor` and `Preview` loaded lazily with `React.lazy` (first load drops from ~1 MB to ~364 kB) | 2, 3 |
| 18-24 | `VIEWS`: Live, Source, Split, Preview, Graph | 3 |
| 35 | Reads `localGraphOpen` | 3 |
| 39 | Loads the vault on start | 1 |
| 41-52 | Keyboard shortcuts: `Ctrl/⌘ K`, `Ctrl/⌘ E` (live ↔ source), `Alt N` | 1, 3 |
| 55 | `useDeferredValue` for the preview pane | 2 |
| 57-72 | Backlinks, outgoing links and tags (cached lookups) | 1, 2 |
| 74 | Index for the sliding view-switch highlight | 2 |
| 77-80 | Loading screen | 2 |
| 84-112 | Top bar: sidebar toggle, brand, tabs, animated view switch (99-106), theme toggle (107-109), palette button (110) | 1, 2 |
| 114-117 | Sidebar always mounted so it can slide closed, plus a mobile backdrop | 2 |
| 119-124 | Graph view in `Suspense` | 2 |
| 125-198 | Note layout: `note-shell` > `note-col` (125-126) and `LocalGraph` (198) | 3 |
| 128-151 | Note header: folder breadcrumb (130), title, pin (143-145), local-graph toggle (146), export, delete | 1, 3 |
| 152-156 | Editor (154) and preview (155) panes (`Live`/`Source` use CodeMirror, `Split`/`Preview` show the preview) | 3 |
| 160-187 | Collapsible backlinks / links out / tags panel | 2 |
| 188-196 | Status bar: panel toggle (189), word count, animated saved indicator | 2 |
| 200-208 | Empty state | 2 |
| 210-211 | `Palette` and `Toasts` | 1, 2 |

## `src/index.css` (361 lines)

| Lines | Change | Round |
| --- | --- | --- |
| 1-2 | Google Fonts: DM Sans (UI), Newsreader (reading), JetBrains Mono (source) | 2 |
| 3-31 | Design tokens for dark (4-11) and light (12-19) themes, shared easing and fonts (20-27), crossfade on theme switch (28-30) | 2 |
| 32-43 | Base styles, focus ring, selection colour, thin scrollbars | 2 |
| 44-53 | Keyframes: `fade`, `pane-in`, `pop`, `tab-in`, `item-in`, `breathe`, `spin-in`, `toast-in`, `toast-out`, `palette-in` | 2 |
| 55-61 | Loading and empty states | 2 |
| 62-77 | App shell, top bar, buttons | 1, 2 |
| 78-87 | Tabs | 2 |
| 88-95 | Sliding segmented view switch | 2 |
| 96-129 | Sidebar, search, tabs pill, note list, chips | 2 |
| 130-155 | Note view, title, panes, preview | 2 |
| 156-177 | Markdown reading styles (serif, wikilinks) | 2 |
| 178-198 | Collapsible meta panel, status bar, saved indicator | 2 |
| 199-211 | Global graph styles | 2 |
| 212-224 | Command palette and toasts | 2 |
| 225-241 | Responsive rules (≤ 800 px: sliding sidebar, icon-only view switch) | 2 |
| 242-246 | `prefers-reduced-motion` support | 2 |
| 247-290 | CodeMirror live preview: headings, bold, italic, code, links, quotes, code blocks, tables, task checkboxes, tags, wikilinks, autocomplete popup | 3 |
| 291-297 | Note shell, breadcrumb, active icon buttons | 3 |
| 298-333 | Sidebar tree: note rows, pin button, folders, drop highlights, inline inputs | 3 |
| 334-358 | Local graph panel | 3 |
| 359-360 | Responsive rules for the local graph | 3 |

Leftover rules from the round 1 textarea editor (`.editor` at lines 143-144 and `.suggest*` at lines 150-154) are no longer used by any component and can be deleted safely.

---

# Bugs fixed along the way

| Bug | Where | Fix |
| --- | --- | --- |
| A `[[` inside inline code made the link parser swallow a whole line and created bogus "missing" notes | `src/lib/text.ts:3`, `src/lib/livePreview.ts:9` | The title cannot contain `[` |
| Links and tags inside code blocks counted as real links and tags | `src/lib/text.ts:8-21` | Code is stripped before extraction |
| `[[x]]` shown inside code in the preview was turned into a link | `src/lib/text.ts:24-37` | Conversion skips code |
| `[[Note]]` was also styled as a Markdown shortcut link in the editor | `src/lib/livePreview.ts` (`wikiInner` helper at line 44, used at lines 95 and 100) | Wikilink styling takes priority |
| Graph edges looped around nodes | `src/components/Graph.tsx:13, 19-22, 62` | Straight edges and centred handles |
| React Flow styles overrode theme colours | `src/index.css` (`.graph-wrap .graph .react-flow` rule) | Higher specificity |
| "Create new note" suggestion outranked real matches in autocomplete | `src/lib/completions.ts:19-22` | Different label and lower boost |
