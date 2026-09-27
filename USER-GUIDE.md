# Substack Clipper user guide

Substack Clipper saves Substack posts into your vault as Markdown notes. You can keep just the text, or pull down every image, video, podcast, and comment so the post survives even if it disappears from Substack.

## Contents

- [Saving a post](#saving-a-post)
- [What gets saved](#what-gets-saved)
- [Media](#media)
- [Comments](#comments)
- [Save history](#save-history)
- [Saving from outside Obsidian](#saving-from-outside-obsidian)
- [Settings](#settings)
- [Good to know](#good-to-know)
- [Troubleshooting](#troubleshooting)

## Saving a post

1. Open the command palette (`Ctrl/Cmd + P`) and run **Substack Clipper: Save substack post**.
2. Paste the post's URL.
3. Turn on **Open after saving** if you want the note to open when it's ready. The plugin remembers your choice.
4. Press `Enter` or click **Save**.

A notice shows progress while the plugin works. When it's finished you'll see "Saved:" followed by the post title.

The URL needs to point at a single post, which means it has `/p/` in it:

```
https://alice.substack.com/p/my-article
https://www.example.com/p/my-article      (custom domains work too)
```

Links to a publication's home page, an author profile, or a Substack Notes post won't work. If you're in the Substack app, open the post in a browser and copy the link from there.

## What gets saved

Say you save `https://alice.substack.com/p/my-article` with the default settings. You get one note:

```
Substacks/
  alice/
    my-article.md
```

Turn on media and comments and you get more:

```
Substacks/
  alice/
    my-article.md             the post
    my-article-comments.md    the comments
    my-article/               everything the post links to
      photo.jpg
      chart.png
      episode.mp3
      report.pdf
```

The author folder is named after the Substack subdomain (`alice`). For custom domains it's the full hostname, like `www.example.com`.

### The note

Each note starts with frontmatter, so you can search, sort, and query your saved posts with Bases, Dataview, or plain search:

```yaml
---
title: "My article"
subtitle: "A short tagline"
type: "newsletter"
audience: "everyone"
link: "https://alice.substack.com/p/my-article"
id: 123456789
comment-count: 42
date: "2026-03-14T12:00:00.000Z"
---
```

Most posts also have a `cover-image`. If media downloads are on, it links to the local copy (`"[[photo.jpg]]"`), otherwise to Substack. That means a Bases card view can show each post's cover.

When the post has them, you'll also see `videos`, `audios`, `attachments`, `podcast-audio`, `podcast-video`, and `transcript`. These always hold the original Substack URLs, even when the files were downloaded.

Below the frontmatter comes the post itself. Podcast posts get a player (or a link) at the top, followed by the transcript. If you saved comments, a **Discussion** heading at the bottom embeds the comments note.

Along the way the plugin cleans things up:

- Substack footnotes become regular Markdown footnotes (`[^1]`).
- Embedded content like YouTube videos and tweets stays as HTML iframes, so it still plays in reading view.
- Leftover Substack clutter, such as attachment icons and "Read more" preview cards, is tidied or removed.

## Media

Media downloads are **off** by default. With them off, images and files in your note point at Substack's servers. They load fine while you're online, but you'll lose them if the post or publication is deleted.

Turn on **Download media** to save a local copy of:

- Images, including the cover image
- PDFs and other attachments
- Videos and audio embedded in the post
- Podcast audio and video
- Podcast transcripts (`.vtt` files)

Downloaded files go in a folder named after the post and are embedded with wikilinks like `![[photo.jpg]]`, so they play right inside Obsidian. The cover image goes in the `cover-image` frontmatter field, not the note body.

Podcast episodes and videos can be big. To skip them, set **Max file size (MB)**. Anything larger than that keeps its Substack link instead of being downloaded. Some servers don't report file size up front, and those files download no matter what the limit is.

If a single file fails to download, the plugin keeps going and leaves the original link in place.

## Comments

Turn on **Download comments** to save the discussion. Comments go in a separate note (`my-article-comments.md`) and are embedded at the bottom of the post, so they appear in reading view but don't clutter the post itself.

Replies nest as blockquotes, one level deeper for each reply. Each comment shows the commenter's avatar, a link to their Substack profile, and a timestamp that links back to the comment on Substack. Deleted and moderated comments show as "Comment removed".

Use **Comment sort order** to choose between most recent, oldest, or best comments first.

If a post has no comments, no comments note is made. If fetching comments fails, you'll see a notice, but the post is still saved.

Commenter avatars aren't downloaded. They load from Substack when you're online.

## Save history

Every post you save goes into your history. Run **Substack Clipper: View save history** to open it in the right sidebar.

Each entry shows the title, the author, the date you saved it, and a badge with the comment count. The three buttons on each entry:

- **Open saved note** opens the note in your vault.
- **Open URL** opens the original post in your browser.
- **Remove from history** deletes the entry (after asking first).

Type in the filter box at the top to narrow the list by title or author.

### Updating comments

Discussions keep going after you save a post. To catch up, tick the checkboxes next to one or more entries (or use the checkbox at the top to select everything shown) and click **Re-download comments**. For each post, the plugin:

- fetches the latest comments and replaces the comments note
- updates `comment-count` in the post's frontmatter

This works even when the **Download comments** setting is off. But if the post was first saved without comments, its note won't have a Discussion section. You'll get a comments note you can open or embed yourself.

### Removing entries

**Remove selected** clears the selected entries from your history. Your notes and media stay put. It only changes the list.

To keep the history short automatically, set **Max history length** in settings. To trim it once, use **Truncate history**: enter how many recent entries to keep and click **Truncate**.

## Saving from outside Obsidian

You can save a post from a browser, a script, a bookmarklet, or an iOS Shortcut by opening a link like this:

```
obsidian://substack-clipper?vault=MyVault&url=https://alice.substack.com/p/my-article
```

| Parameter | Required | What it does |
|-----------|----------|--------------|
| `url` | Yes | The post URL. Must contain `/p/`. |
| `vault` | No | Which vault to save to. Leave it out and Obsidian picks one for you. |
| `open` | No | `true` or `false`. Overrides your "Open after saving" choice for this save only. |

Encode spaces in the vault name as `%20`. If the post URL has its own query string (anything after a `?`), encode the whole URL so Obsidian doesn't mix up its parameters.

This bookmarklet saves whatever Substack post you're looking at. Replace `MyVault` with your vault's name:

```
javascript:location.href='obsidian://substack-clipper?vault=MyVault&url='+encodeURIComponent(location.href.split('?')[0])
```

## Settings

### Storage

| Setting | Default | What it does |
|---------|---------|--------------|
| Save directory | `Substacks` | The folder where posts are saved. Each author gets a subfolder inside it. |

### Downloads

| Setting | Default | What it does |
|---------|---------|--------------|
| Download media | Off | Save images, attachments, video, audio, podcasts, and transcripts into the vault. When off, notes link to Substack instead. |
| Max file size (MB) | `0` | Skip any file bigger than this and keep its link. `0` means no limit. Only shown when Download media is on. |
| Download comments | Off | Save the comments as a separate note, embedded at the bottom of the post. |
| Comment sort order | Most recent first | Also: Oldest first, Best first. Used for new saves and for re-downloads. |

### History

| Setting | Default | What it does |
|---------|---------|--------------|
| Max history length | `0` | The most entries to keep. The oldest drop off the next time you save a post. `0` means unlimited. |
| Truncate history | | Keep only the newest N entries, right now. |

### Advanced

| Setting | Default | What it does |
|---------|---------|--------------|
| Save raw JSON | Off | Save the post's metadata and converted Markdown as `my-article.json` in the media folder. With comments on, also saves the raw comments as `my-article-comments.json`. Useful for scripts and debugging. |
| Save raw HTML | Off | Save the post body's original HTML as `my-article.html` in the media folder. |

**Open after saving** isn't in the settings tab. It's the toggle in the save dialog, and the plugin remembers what you last picked.

## Good to know

**Saving a post again replaces the note.** Saving the same URL twice overwrites the note and its comments note. Any edits you made to them will be lost, so keep your own notes about a post in a separate file. Media files that already exist aren't downloaded again.

**Paid posts save the free preview only.** The plugin doesn't use your Substack login, so it sees what a logged-out reader sees.

**Moving the save folder breaks history links.** The history sidebar looks for notes in the current save directory. If you change the setting or move the folders, **Open saved note** and **Re-download comments** won't find posts saved in the old location.

**It works on mobile.** Big podcast and video downloads can be slow on a phone connection. Setting a max file size helps.

## Troubleshooting

**"Invalid URL" when saving.** The URL doesn't have `/p/` in it. Make sure you copied a link to a single post, not the publication or a profile.

**"Invalid link" from an `obsidian://` link.** The `url` parameter is missing or doesn't contain `/p/`. Check the link you built, and make sure the post URL is encoded.

**"Could not find window._preloads in page."** The page didn't look like a Substack post. Either the URL isn't a Substack post, or Substack changed its page layout. If it's a real post, please [open an issue](https://github.com/gapmiss/substack-clipper/issues) with the URL.

**"Could not find article content."** The plugin found the post but no body text. The note is still saved with its frontmatter. This can happen with some paid posts and unusual post types.

**Images don't show up offline.** Media downloads are off, so images still point at Substack. Turn on **Download media** and save the post again.

**A video or podcast is a link instead of a player.** It was bigger than your max file size, or the download failed. Save the post again to retry.

**"Failed to fetch comments".** Substack didn't return the comments, often because of a network hiccup or rate limiting. The post itself was saved. Try **Re-download comments** from the history sidebar later.

Still stuck? [Open an issue](https://github.com/gapmiss/substack-clipper/issues) with the post URL, what you expected, what happened, and your Obsidian version and device.
