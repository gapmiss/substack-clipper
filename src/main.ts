import { normalizePath, Notice, Plugin, TFile } from 'obsidian';
import { type SubstackClipperSettings, DEFAULT_SETTINGS } from './types';
import type { ParsedArticle, DownloadResult, HistoryEntry } from './types';
import { SettingsTab } from './settings';
import { ClipModal } from './modal';
import { HistoryView, HISTORY_VIEW_TYPE } from './history-view';
import { fetchHtml, extractPreloads, parsePost, parseUrl, extractImages, extractVideos, extractAudios, extractAttachments } from './parser';
import { htmlToMarkdown } from './converter';
import { postprocessMarkdown } from './postprocess';
import { downloadAllMedia } from './downloader';
import { countAllComments, fetchComments, renderComments } from './comments';

export default class SubstackClipperPlugin extends Plugin {
	settings: SubstackClipperSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new SettingsTab(this.app, this));

		this.registerView(HISTORY_VIEW_TYPE, (leaf) => new HistoryView(leaf, this));

		this.addCommand({
			id: 'clip-post',
			name: 'Save substack post',
			callback: () => {
				new ClipModal(this.app, this.settings.openAfterClip, (url, openAfterClip) => {
					if (openAfterClip !== this.settings.openAfterClip) {
						this.settings.openAfterClip = openAfterClip;
						void this.saveSettings();
					}
					void this.clipPost(url, openAfterClip);
				}).open();
			},
		});

		this.addCommand({
			id: 'view-history',
			name: 'View save history',
			callback: () => {
				void this.activateHistoryView();
			},
		});
	}

	async activateHistoryView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(HISTORY_VIEW_TYPE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) return;
			await rightLeaf.setViewState({ type: HISTORY_VIEW_TYPE, active: true });
			leaf = rightLeaf;
		}
		await workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SubstackClipperSettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async clipPost(url: string, openAfterClip: boolean): Promise<void> {
		const notice = new Notice('Saving...', 0);
		notice.containerEl.addClass("is-loading");

		try {
			const { username, slug, domain } = parseUrl(url);
			const html = await fetchHtml(url);
			const preloads = extractPreloads(html);
			const post = parsePost(html, preloads);

			if (!post.contentHtml) {
				new Notice('Could not find article content.');
			}

			const images = extractImages(post.contentHtml);
			const videos = extractVideos(post.contentHtml);
			const audios = extractAudios(post.contentHtml);
			const attachments = extractAttachments(post.contentHtml);

			const article: ParsedArticle = {
				...post,
				html: post.contentHtml,
				markdown: '',
				images,
				videos,
				audios,
				attachments,
			};

			const saveDir = normalizePath(`${this.settings.saveDirectory}/${username}/${slug}`);

			notice.setMessage('Downloading media...');
			const downloadResult: DownloadResult = await downloadAllMedia(
				this.app, article, saveDir,
				this.settings.downloadMedia, this.settings.maxFileSize,
			);

			const markdown = htmlToMarkdown(post.contentHtml, downloadResult.downloaded);
			article.markdown = markdown;

			// Comments
			let discussionEmbed = '';
			if (this.settings.downloadComments) {
				notice.setMessage('Fetching comments...');
				try {
					const commentsData = await fetchComments(domain, article.id, this.settings.commentSort);

					if (commentsData.comments && commentsData.comments.length > 0) {
						if (this.settings.saveRawJson) {
							const commentsJsonPath = normalizePath(`${saveDir}/${slug}-comments.json`);
							await this.writeFile(commentsJsonPath, JSON.stringify(commentsData, null, 2));
						}

						article.commentCount = countAllComments(commentsData);
						const commentsMd = renderComments(commentsData, slug, domain);
						const commentsPath = normalizePath(`${this.settings.saveDirectory}/${username}/${slug}-comments.md`);
						await this.writeFile(commentsPath, commentsMd);
						discussionEmbed = `\n\n## Discussion\n\n![[${slug}-comments]]`;
					}
				} catch (e) {
					console.error('[substack-clipper] comments error:', e);
					new Notice(`Failed to fetch comments: ${e instanceof Error ? e.message : String(e)}`);
				}
			}

			let processedMd = postprocessMarkdown(markdown, downloadResult.downloaded);

			// Build podcast/video/transcript sections
			let podcastVideoPlayer = '';
			let podcastAudioPlayer = '';
			let transcriptLink = '';

			if (article.videoUploadId) {
				const cleanId = article.videoUploadId.replace(/"/g, '');
				const videoUrl = `https://api.substack.com/api/v1/video/upload/${cleanId}/src`;
				if (downloadResult.downloaded.has(videoUrl)) {
					podcastVideoPlayer = `## Podcast video\n\n![[${cleanId}.mp4]]\n\n`;
				} else {
					podcastVideoPlayer = `## Podcast video\n\n[Podcast video](${videoUrl})\n\n`;
				}
			}

			if (article.podcastUrl) {
				if (downloadResult.downloaded.has(article.podcastUrl)) {
					const parts = article.podcastUrl.split('/');
					if (article.podcastUrl.includes('post_id')) {
						const id = parts[5].split('.')[0];
						podcastAudioPlayer = `## Podcast audio\n\n![[${id}.mp3]]\n\n`;
					} else {
						podcastAudioPlayer = `## Podcast audio\n\n![[${parts[7]}.mp3]]\n\n`;
					}
				} else {
					podcastAudioPlayer = `## Podcast audio\n\n[Podcast audio](${article.podcastUrl})\n\n`;
				}
			}

			if (article.transcript) {
				if (downloadResult.downloaded.has(article.transcript)) {
					if (article.videoUploadId) {
						const base = article.transcript.split('?')[0];
						const basename = base.split('/').pop() ?? 'transcript.vtt';
						transcriptLink = `### Transcript\n\n[[${article.videoUploadId}.${basename}]]\n\n`;
					} else if (article.podcastUrl) {
						const parts = article.podcastUrl.split('/');
						transcriptLink = `### Transcript\n\n[[${parts[7]}.en.vtt]]\n\n`;
					}
				} else {
					transcriptLink = `### Transcript\n\n[Transcript](${article.transcript})\n\n`;
				}
			}

			// Build frontmatter
			const frontmatter = this.buildFrontmatter(article, url);

			const finalNote = [
				'---',
				frontmatter,
				'---\n',
				podcastVideoPlayer,
				podcastAudioPlayer,
				transcriptLink,
				processedMd,
				discussionEmbed,
			].filter(Boolean).join('\n');

			const notePath = normalizePath(`${this.settings.saveDirectory}/${username}/${slug}.md`);
			await this.writeFile(notePath, finalNote);

			// Optional raw files
			if (this.settings.saveRawJson) {
				const jsonPath = normalizePath(`${saveDir}/${slug}.json`);
				await this.writeFile(jsonPath, JSON.stringify({
					title: article.title,
					subtitle: article.subtitle,
					type: article.type,
					audience: article.audience,
					link: url,
					date: article.date,
					id: article.id,
					cover_image: article.coverImage,
					videos: article.videos,
					audios: article.audios,
					attachments: article.attachments,
					podcast: article.podcastUrl,
					video_upload_id: article.videoUploadId,
					transcript: article.transcript,
					comment_count: article.commentCount,
					md: processedMd,
				}, null, 2));
			}

			if (this.settings.saveRawHtml) {
				const htmlPath = normalizePath(`${saveDir}/${slug}.html`);
				await this.writeFile(htmlPath, article.html);
			}

			if (openAfterClip) {
				const file = this.app.vault.getAbstractFileByPath(notePath);
				if (file instanceof TFile) {
					await this.app.workspace.getLeaf(false).openFile(file);
				}
			}

			notice.hide();
			new Notice(`Saved: ${article.title}`);

			const entry: HistoryEntry = {
				url,
				title: article.title,
				username,
				slug,
				dateSaved: new Date().toISOString(),
				postId: article.id,
				domain,
				commentCount: article.commentCount,
			};
			this.settings.history.push(entry);
			if (this.settings.maxHistoryLength > 0) {
				this.settings.history = this.settings.history.slice(-this.settings.maxHistoryLength);
			}
			await this.saveSettings();

			for (const leaf of this.app.workspace.getLeavesOfType(HISTORY_VIEW_TYPE)) {
				if (leaf.view instanceof HistoryView) {
					leaf.view.refresh();
				}
			}

		} catch (e) {
			notice.hide();
			new Notice(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	private buildFrontmatter(article: ParsedArticle, url: string): string {
		const lines: string[] = [];

		lines.push(`title: ${JSON.stringify(article.title.trim())}`);

		if (article.subtitle) {
			lines.push(`subtitle: ${JSON.stringify(article.subtitle.trim())}`);
		}

		lines.push(`type: ${JSON.stringify(article.type)}`);
		lines.push(`audience: ${JSON.stringify(article.audience)}`);
		lines.push(`link: ${JSON.stringify(url)}`);
		lines.push(`id: ${article.id}`);
		lines.push(`comment-count: ${article.commentCount}`);

		if (article.videos.length) {
			lines.push('videos:');
			for (const v of article.videos) lines.push(`  - ${v}`);
		}

		if (article.audios.length) {
			lines.push('audios:');
			for (const a of article.audios) lines.push(`  - ${a}`);
		}

		if (article.attachments.length) {
			lines.push('attachments:');
			for (const a of article.attachments) lines.push(`  - ${a}`);
		}

		if (article.podcastUrl) {
			lines.push(`podcast-audio: ${JSON.stringify(article.podcastUrl)}`);
		}

		if (article.videoUploadId) {
			const cleanId = article.videoUploadId.replace(/"/g, '');
			lines.push(`podcast-video: "https://api.substack.com/api/v1/video/upload/${cleanId}/src"`);
		}

		if (article.transcript) {
			lines.push(`transcript: ${JSON.stringify(article.transcript)}`);
		}

		lines.push(`date: ${JSON.stringify(article.date)}`);

		return lines.join('\n');
	}

	private async ensureFolder(folderPath: string): Promise<void> {
		const normalized = normalizePath(folderPath);
		if (!this.app.vault.getFolderByPath(normalized)) {
			await this.app.vault.createFolder(normalized);
		}
	}

	async writeFile(path: string, content: string): Promise<void> {
		const normalized = normalizePath(path);
		const folder = normalized.substring(0, normalized.lastIndexOf('/'));
		await this.ensureFolder(folder);

		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (existing) {
			await this.app.vault.adapter.write(normalized, content);
		} else {
			await this.app.vault.create(normalized, content);
		}
	}
}
