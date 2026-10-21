# Mermaid in RemNote

Render [Mermaid](https://mermaid.js.org/) diagrams directly from RemNote code blocks.

## How to use it

1. **Paste a code block** containing Mermaid source, or create one with `/code`.
2. Open the code block's **language dropdown** (bottom-right of the block) and choose **Mermaid**.
3. The diagram renders underneath the block, and the source collapses out of the way.

Click into the Rem to bring the source code back; click away and the diagram takes over again.

**Shortcuts:**

- `/Mermaid: Turn Focused Code Block into Diagram` — tags the focused code block as Mermaid.
- `/Mermaid: Insert Diagram` (or the original `/Mermaid`) — creates a new diagram.
- `/Mermaid: Insert … Diagram` — starters for flowchart, sequence, class, ER, state, gantt, pie and mindmap.

## Theme

Pick a theme once in **Settings → Plugins → Mermaid** and every diagram uses it automatically.

| Setting | What it does |
| --- | --- |
| **Diagram theme** | **Match RemNote** (default) follows your active RemNote theme, including third-party themes. Or choose any Mermaid built-in: Default, Base, Dark, Forest, Neutral, Neo, Neo Dark, Redux. |
| **Diagram appearance** | Under *Match RemNote*, whether diagrams follow RemNote's light/dark mode. |
| **Theme variable overrides** | Optional and empty by default. A JSON object of [Mermaid theme variables](https://mermaid.js.org/config/theming.html) for advanced tweaking. Leave it empty to use the selected theme as-is. |

Because *Match RemNote* derives its colors from RemNote's design tokens (`--rn-clr-*`),
switching RemNote themes — or installing a theme plugin — restyles your diagrams with no extra setup.

## Other settings

| Setting | Default | What it does |
| --- | --- | --- |
| Hide the source code block | on | Collapses the Mermaid code block while the diagram is visible. |
| Detect unlabeled Mermaid blocks | on | Also renders untagged code blocks whose first line is a Mermaid declaration (e.g. `flowchart TD`). |
| Diagram scale | 1 | Multiplies the rendered size. |
| Maximum diagram height | 0 (off) | Collapses tall diagrams behind a "Show full diagram" button. |
| Mermaid security level | Strict | Keep on *Strict* unless you need HTML labels. |

## Migrating from version 0.7

Older versions used a Mermaid **powerup**. Those diagrams still render, and you can convert one
to the newer code-block form with `/Mermaid: Convert Legacy Diagram to Code Block`.

## Development

```bash
npm install
npm run dev      # serves the plugin at http://localhost:8080
```

Then in RemNote open **Plugins and Themes → Build → Develop from localhost** and enter
`http://localhost:8080`.

```bash
npm run check-types   # TypeScript
npm test              # unit tests for detection and theming
npm run build         # produces PluginZip.zip
```

> **Note:** if your global npm cache isn't writable, install with a local cache:
> `npm install --cache ./.npm-cache`.
