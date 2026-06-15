# Contributing

Thanks for your interest in contributing to Substack Clipper.

## Development setup

```bash
git clone https://github.com/gapmiss/substack-clipper.git
cd substack-clipper
npm install
```

### Build commands

| Command | Description |
|---------|-------------|
| `npm run build` | Typecheck + production build |
| `npm run dev` | Watch mode (rebuilds on file change) |
| `npm run lint` | Run ESLint |

### Testing in Obsidian

1. Run `npm run dev` for watch mode.
2. Symlink or copy `main.js`, `manifest.json`, and `styles.css` to your test vault at `.obsidian/plugins/substack-clipper/`.
3. Enable the plugin in Obsidian settings.
4. Use `Ctrl/Cmd + P` > "Clip substack post" to test.

## Code standards

- **TypeScript strict mode** with `noImplicitAny` and `strictNullChecks`.
- **ESLint must pass with zero errors and zero warnings** before submitting a PR. Run `npm run lint` to check.
- The project uses [`eslint-plugin-obsidianmd`](https://github.com/phibr0/eslint-plugin-obsidianmd) and [`typescript-eslint/recommendedTypeChecked`](https://typescript-eslint.io/getting-started/typed-linting/).
- Use `requestUrl()` for all network requests, never `fetch()`.
- Use `normalizePath()` for all vault paths.
- No regex lookbehind (iOS compatibility).
- All UI text must use sentence case ("Clip substack post", not "Clip Substack Post").
- No `console.log` — use `console.warn`, `console.error`, or `console.debug` only.
- Use `Array.from()` when iterating `NodeListOf<>` collections.

## Pull requests

1. Fork the repo and create a feature branch from `main`.
2. Make your changes.
3. Ensure `npm run build` and `npm run lint` both pass cleanly.
4. Test the change in Obsidian with at least one public Substack post.
5. Open a PR with a clear description of what changed and why.

## Reporting issues

Open an issue on GitHub with:

- The Substack URL that caused the problem (if applicable).
- What you expected to happen.
- What actually happened (error messages, screenshots, etc.).
- Your Obsidian version and OS.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
