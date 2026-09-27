# Substack Clipper

Save Substack posts to your Obsidian vault as Markdown, along with their images, podcasts, videos, and comments.

## Features

- Saves any public Substack post as a note with frontmatter you can search and query
- Optionally downloads images, attachments, video, audio, podcast episodes, and transcripts, embedded so they play inside Obsidian
- Optionally saves threaded comments as their own note, embedded at the end of the post
- Keeps a history of saved posts in the sidebar, where you can update comments in bulk
- Converts Substack footnotes to Markdown footnotes
- Save from a browser, bookmarklet, or iOS Shortcut with an `obsidian://` link
- Works on desktop and mobile

## Installation

### From Obsidian

1. Open **Settings > Community plugins > Browse**.
2. Search for "Substack Clipper", then install and enable it.

Or [install it from community.obsidian.md](https://community.obsidian.md/plugins/substack-clipper).

### Manually

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/gapmiss/substack-clipper/releases/latest).
2. Put them in a new folder at `<your vault>/.obsidian/plugins/substack-clipper/`.
3. In **Settings > Community plugins**, reload the installed plugins list and enable Substack Clipper.

## Quick start

1. Open the command palette (`Ctrl/Cmd + P`) and run **Save substack post**.
2. Paste a post URL, like `https://alice.substack.com/p/my-article`.
3. Press `Enter`.

The note lands in `Substacks/alice/my-article.md`. Media and comments are off by default. Turn them on in the plugin settings.

To browse what you've saved, run **View save history**.

For everything else, including settings, the `obsidian://` link format, and troubleshooting, see the **[user guide](USER-GUIDE.md)**.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
