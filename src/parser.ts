import { requestUrl } from 'obsidian';
import type { SubstackPost } from './types';

interface PreloadsJson {
	post: Record<string, unknown>;
}

export function parseUrl(url: string): { username: string; slug: string; domain: string } {
	const parsed = new URL(url);
	const slug = parsed.pathname.split('/p/')[1]?.replace(/\/$/, '') ?? '';
	const username = parsed.hostname.endsWith('.substack.com')
		? parsed.hostname.split('.')[0]
		: parsed.hostname;
	const domain = `${parsed.protocol}//${parsed.hostname}`;
	return { username, slug, domain };
}

export async function fetchHtml(url: string): Promise<string> {
	const response = await requestUrl({ url });
	return response.text;
}

export function extractPreloads(html: string): PreloadsJson {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const scripts = doc.querySelectorAll('script');

	let jsonString = '';
	for (const script of Array.from(scripts)) {
		const text = script.textContent ?? '';
		if (text.startsWith('window._preloads')) {
			jsonString = text.substring(38);
			jsonString = jsonString.slice(0, -2);
			jsonString = jsonString.replace(/\\"/g, '"');
			jsonString = jsonString.replace(/\\\\"/g, '\\"');
			break;
		}
	}

	if (!jsonString) {
		throw new Error('Could not find window._preloads in page.');
	}

	return JSON.parse(jsonString) as PreloadsJson;
}

export function parsePost(html: string, json: PreloadsJson): SubstackPost & { contentHtml: string } {
	const post = json.post;

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const content = doc.querySelector('div.markup');

	let signedCaptions = '';
	const podcastUpload = post['podcastUpload'] as Record<string, unknown> | null | undefined;
	if (podcastUpload) {
		const transcription = podcastUpload['transcription'] as Record<string, unknown> | null | undefined;
		if (transcription) {
			const captions = transcription['signed_captions'] as Array<{ url: string }> | undefined;
			if (captions?.[0]) {
				signedCaptions = captions[0].url;
			}
		}
	}

	return {
		title: (post['title'] as string) ?? '',
		subtitle: (post['subtitle'] as string) ?? '',
		type: (post['type'] as string) ?? '',
		audience: (post['audience'] as string) ?? '',
		url: (post['canonical_url'] as string) ?? '',
		slug: (post['slug'] as string) ?? '',
		coverImage: (post['cover_image'] as string) ?? '',
		date: (post['post_date'] as string) ?? '',
		id: (post['id'] as number) ?? 0,
		wordcount: (post['wordcount'] as number) ?? 0,
		commentCount: (post['comment_count'] as number) ?? 0,
		podcastUrl: (post['podcast_url'] as string) ?? null,
		videoUploadId: (post['video_upload_id'] as string) ?? null,
		transcript: signedCaptions,
		contentHtml: content ? content.innerHTML : '',
	};
}

export function extractImages(contentHtml: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(contentHtml, 'text/html');
	const imgs: string[] = [];
	for (const img of Array.from(doc.querySelectorAll('img'))) {
		const src = img.getAttribute('src') ?? '';
		if (src && !src.includes('attachment_icon.svg')) {
			imgs.push(src);
		}
	}
	return imgs;
}

export function extractVideos(contentHtml: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(contentHtml, 'text/html');
	const videos: string[] = [];
	for (const div of Array.from(doc.querySelectorAll('div[id^="media-"]'))) {
		const id = div.getAttribute('id') ?? '';
		if (id.length === 42) {
			const videoId = id.replace('media-', '');
			videos.push(`https://substack.com/api/v1/video/upload/${videoId}/src`);
		}
	}
	return videos;
}

export function extractAudios(contentHtml: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(contentHtml, 'text/html');
	const audios: string[] = [];
	for (const audio of Array.from(doc.querySelectorAll('audio'))) {
		const src = audio.getAttribute('src') ?? '';
		if (src) {
			audios.push(`https://substack.com${src}`);
		}
	}
	return [...new Set(audios)];
}

export function extractAttachments(contentHtml: string): string[] {
	const parser = new DOMParser();
	const doc = parser.parseFromString(contentHtml, 'text/html');
	const attachments: string[] = [];
	for (const a of Array.from(doc.querySelectorAll('a.file-embed-button.wide'))) {
		const href = a.getAttribute('href') ?? '';
		if (href) attachments.push(href);
	}
	for (const a of Array.from(doc.querySelectorAll('a[href$=".pdf"]'))) {
		const href = a.getAttribute('href') ?? '';
		if (href) attachments.push(href);
	}
	return [...new Set(attachments)];
}
