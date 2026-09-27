# Contributing

Thanks for helping out with Substack Clipper.

## Setup

```bash
git clone https://github.com/gapmiss/substack-clipper.git
cd substack-clipper
npm install
```

| Command | What it does |
|---------|--------------|
| `npm run build` | Typecheck, then build `main.js` |
| `npm run dev` | Rebuild on every change (no typecheck) |
| `npm run lint` | Run ESLint |

### Testing in Obsidian

1. Run `npm run dev`.
2. Symlink or copy `main.js`, `manifest.json`, and `styles.css` into a test vault at `.obsidian/plugins/substack-clipper/`.
3. Enable the plugin, then run **Save substack post** from the command palette.

Use a test vault, not your real one.

## Project layout

```
src/
  main.ts          Plugin entry, commands, URI handler, and the save pipeline
  settings.ts      Settings tab (declarative getSettingDefinitions API)
  types.ts         Interfaces and default settings
  modal.ts         URL input dialog
  history-view.ts  Save history sidebar
  parser.ts        Fetches the page and reads Substack's embedded post data
  converter.ts     HTML to Markdown (Turndown with custom rules)
  postprocess.ts   Regex cleanup of the converted Markdown
  downloader.ts    Media downloads
  comments.ts      Fetches and renders threaded comments
```

## Code standards

- `npm run build` and `npm run lint` must both pass with zero errors and zero warnings. The linter uses [`eslint-plugin-obsidianmd`](https://github.com/obsidianmd/eslint-plugin) and [`typescript-eslint` recommendedTypeChecked](https://typescript-eslint.io/getting-started/typed-linting/).
- Use `requestUrl()` for network requests, never `fetch()`.
- Run every vault path through `normalizePath()`.
- No regex lookbehind. It breaks on older iOS.
- Write UI text in sentence case: "Save substack post", not "Save Substack Post".
- No `console.log`. Use `console.warn`, `console.error`, or `console.debug`.
- Wrap `NodeListOf<>` in `Array.from()` before looping. The ES6 target doesn't support iterating DOM collections directly.

If you change what the plugin does, update [USER-GUIDE.md](USER-GUIDE.md) in the same PR.

## Pull requests

1. Fork the repo and branch off `main`.
2. Make your change.
3. Check that `npm run build` and `npm run lint` pass.
4. Try it in Obsidian with at least one public Substack post.
5. Open a PR that says what changed and why.

## Releases (maintainers)

```bash
npm run release          # patch: 0.1.13 -> 0.1.14
npm run release:minor    # 0.1.13 -> 0.2.0
npm run release:major    # 0.1.13 -> 1.0.0
```

The script bumps the version in `package.json`, `manifest.json`, and `versions.json`, builds, commits, tags, and pushes. The tag starts a GitHub Actions workflow that builds the plugin, attests the files, and publishes the release.

## Reporting issues

[Open an issue](https://github.com/gapmiss/substack-clipper/issues) and include:

- The Substack URL, if the problem is with a specific post
- What you expected
- What happened, with any error message or screenshot
- Your Obsidian version and device

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
