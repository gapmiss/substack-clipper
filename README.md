# Substack Clipper

Archive Substack posts as Obsidian-flavored Markdown with images, media, and threaded comments.

## Features

- Saves any public Substack post as a Markdown note with YAML frontmatter
- Downloads images, videos, audio, podcast episodes, transcripts, and PDF attachments
- Fetches and renders threaded comments as a separate embeddable note
- Media files use `![[wikilink]]` embeds for native Obsidian playback
- Converts Substack footnotes to standard `[^N]` Markdown footnotes
- Strips CDN URL prefixes for clean image references
- Handles paywalled posts gracefully (saves the available preview)
- Works on desktop and mobile

## Installation

[Install from community.obsidian.md](https://community.obsidian.md/plugins/substack-clipper)

From Obsidian's settings or preferences:

1. Community Plugins > Browse
2. Search for "Substack Clipper"

Manually:

1. download the latest [release](https://github.com/gapmiss/substack-clipper/releases/latest) archive
2. uncompress the downloaded archive
3. move the `substack-clipper` folder to `/path/to/vault/.obsidian/plugins/` 
4.  Settings > Community plugins > reload **Installed plugins**
5.  enable plugin

or:

1.  download `main.js`, `manifest.json` & `styles.css` from the latest [release](https://github.com/gapmiss/substack-clipper/releases/latest)
2.  create a new folder `/path/to/vault/.obsidian/plugins/substack-clipper`
3.  move all 3 files to `/path/to/vault/.obsidian/plugins/substack-clipper`
4.  Settings > Community plugins > reload **Installed plugins**
5.  enable plugin

## Usage

1. Open the command palette (`Ctrl/Cmd + P`).
2. Run **Clip substack post**.
3. Paste a Substack post URL (must contain `/p/` in the path).
4. The plugin fetches the post, downloads media, and creates the note.

### Output structure

```
Substacks/
  alice/
    my-article.md
    my-article-comments.md
    my-article/
      image.jpg
      video.mp4
      podcast.mp3
      attachment.pdf
```

The main note includes frontmatter with title, subtitle, type, audience, date, comment count, and links to all media. Comments are embedded via `![[slug-comments]]`.

### URI protocol

You can save a post directly via an `obsidian://` URI without opening the command palette:

```
obsidian://substack-clipper?vault=MyVault&url=https://alice.substack.com/p/my-article
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vault` | no | Target vault name (Obsidian prompts if omitted and multiple vaults exist) |
| `url` | yes | Full Substack post URL (must contain `/p/`) |
| `open` | no | `true` or `false` — override the "open after saving" setting |

Spaces in vault names should be percent-encoded (`%20`). This works from browsers, scripts, iOS Shortcuts, bookmarklets, and anywhere else that can open a URL.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Save directory | `Substacks` | Vault-relative folder for saved posts |
| Download media | Off | Download videos, audio, podcasts, and transcripts (images and attachments always download) |
| maxFileSize | `0` | Skip media files larger than this (MB). 0 = no limit. Only visible when downloadMedia is enabled. |
| Download comments | Off | Fetch and save threaded comments |
| Comment sort order | Most recent first | Sort order for comments (most recent, oldest, or best) |
| Save raw JSON | Off | Save the raw Substack API JSON |
| Save raw HTML | Off | Save the raw article HTML |

## Building from source

```bash
git clone https://github.com/gapmiss/substack-clipper.git
cd substack-clipper
npm install
npm run build
```

## License

[MIT](LICENSE)
