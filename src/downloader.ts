import { App, normalizePath, requestUrl } from 'obsidian';
import type { ParsedArticle, DownloadResult } from './types';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36';

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	if (!app.vault.getFolderByPath(normalized)) {
		await app.vault.createFolder(normalized);
	}
}

async function exceedsMaxSize(url: string, maxSizeMB: number): Promise<boolean> {
	if (maxSizeMB <= 0) return false;
	try {
		const response = await requestUrl({
			url,
			method: 'HEAD',
			headers: { 'User-Agent': USER_AGENT },
		});
		const contentLength = response.headers['content-length'] ?? response.headers['Content-Length'];
		if (contentLength) {
			return parseInt(contentLength, 10) > maxSizeMB * 1024 * 1024;
		}
	} catch {
		// HEAD failed or unsupported — proceed with download
	}
	return false;
}

async function downloadToVault(
	app: App,
	url: string,
	vaultPath: string,
	maxSizeMB: number,
): Promise<boolean> {
	const normalized = normalizePath(vaultPath);
	if (app.vault.getAbstractFileByPath(normalized)) {
		return true;
	}

	if (await exceedsMaxSize(url, maxSizeMB)) {
		return false;
	}

	const folderPath = normalized.substring(0, normalized.lastIndexOf('/'));
	await ensureFolder(app, folderPath);

	const response = await requestUrl({
		url,
		headers: { 'User-Agent': USER_AGENT },
	});

	await app.vault.createBinary(normalized, response.arrayBuffer);
	return true;
}

function stripS3Prefix(url: string): string {
	return url
		.replace(/https%3A%2F%2F[a-z0-9-]+\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F/g, '')
		.replace(/https:\/\/[a-z0-9-]+\.s3\.amazonaws\.com\/public\/images\//g, '');
}

export function imageFilename(url: string): string {
	const path = new URL(url).pathname;
	let basename = path.split('/').pop() ?? 'image.jpg';
	basename = stripS3Prefix(decodeURIComponent(basename));
	if (!basename.includes('.')) {
		basename += '.jpg';
	}
	return basename;
}

function videoFilename(url: string): string {
	const parts = url.split('/');
	return `${parts[7]}.mp4`;
}

function audioFilename(url: string): string {
	const parts = url.split('/');
	return `${parts[7]}.mp3`;
}

function podcastAudioFilename(podcastUrl: string): string {
	if (podcastUrl.includes('post_id')) {
		const parts = podcastUrl.split('/');
		const id = parts[5].split('.')[0];
		return `${id}.mp3`;
	}
	const parts = podcastUrl.split('/');
	return `${parts[7]}.mp3`;
}

function podcastVideoFilename(videoUploadId: string): string {
	return `${videoUploadId.replace(/"/g, '')}.mp4`;
}

function transcriptFilename(article: ParsedArticle): string {
	if (article.videoUploadId) {
		const base = article.transcript.split('?')[0];
		const basename = base.split('/').pop() ?? 'transcript.vtt';
		return `${article.videoUploadId}.${basename}`;
	}
	if (article.podcastUrl) {
		const parts = article.podcastUrl.split('/');
		return `${parts[7]}.en.vtt`;
	}
	return 'transcript.vtt';
}

function attachmentFilename(url: string): string {
	const parsed = new URL(url);
	return parsed.pathname.split('/').pop() ?? 'attachment';
}

export async function downloadAllMedia(
	app: App,
	article: ParsedArticle,
	saveDir: string,
	downloadMedia: boolean,
	maxFileSize: number,
): Promise<DownloadResult> {
	const downloaded = new Set<string>();
	const skipped = new Set<string>();

	if (!downloadMedia) {
		for (const url of article.images) skipped.add(url);
		if (article.coverImage) skipped.add(article.coverImage);
		for (const url of article.attachments) skipped.add(url);
		for (const url of article.videos) skipped.add(url);
		for (const url of article.audios) skipped.add(url);
		if (article.podcastUrl) skipped.add(article.podcastUrl);
		if (article.videoUploadId) {
			skipped.add(`https://api.substack.com/api/v1/video/upload/${article.videoUploadId}/src`);
		}
		if (article.transcript) skipped.add(article.transcript);
		return { downloaded, skipped };
	}

	const tasks: Promise<{ url: string; ok: boolean }>[] = [];

	function track(url: string, vaultPath: string): void {
		tasks.push(
			downloadToVault(app, url, vaultPath, maxFileSize)
				.then(ok => ({ url, ok }))
				.catch(() => ({ url, ok: false })),
		);
	}

	for (const url of article.images) {
		if (url.includes('/img/missing-image.png')) continue;
		track(url, `${saveDir}/${imageFilename(url)}`);
	}

	if (article.coverImage) {
		track(article.coverImage, `${saveDir}/${imageFilename(article.coverImage)}`);
	}

	for (const url of article.attachments) {
		track(url, `${saveDir}/${attachmentFilename(url)}`);
	}

	for (const url of article.videos) {
		track(url, `${saveDir}/${videoFilename(url)}`);
	}

	for (const url of article.audios) {
		track(url, `${saveDir}/${audioFilename(url)}`);
	}

	if (article.podcastUrl) {
		track(article.podcastUrl, `${saveDir}/${podcastAudioFilename(article.podcastUrl)}`);
	}

	if (article.videoUploadId) {
		const videoUrl = `https://api.substack.com/api/v1/video/upload/${article.videoUploadId}/src`;
		track(videoUrl, `${saveDir}/${podcastVideoFilename(article.videoUploadId)}`);
	}

	if (article.transcript) {
		track(article.transcript, `${saveDir}/${transcriptFilename(article)}`);
	}

	const results = await Promise.allSettled(tasks);
	for (const result of results) {
		if (result.status === 'fulfilled') {
			if (result.value.ok) {
				downloaded.add(result.value.url);
			} else {
				skipped.add(result.value.url);
			}
		}
	}

	return { downloaded, skipped };
}
