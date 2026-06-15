import TurndownService from 'turndown';
import { imageFilename } from './downloader';

function isSubstackImageUrl(url: string): boolean {
	return url.includes('substackcdn.com/image') ||
		url.includes('.s3.amazonaws.com/public/images');
}

const VIDEO_PLACEHOLDER_RE = /VIDEOEMBED([a-f0-9-]{36})ENDVIDEO/g;

function replaceVideoDivs(html: string, downloadedUrls: Set<string>): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');

	for (const div of Array.from(doc.querySelectorAll('div[id^="media-"]'))) {
		const id = div.getAttribute('id') ?? '';
		if (id.length !== 42) continue;
		const videoId = id.replace('media-', '');
		const videoUrl = `https://substack.com/api/v1/video/upload/${videoId}/src`;
		const p = doc.createElement('p');
		if (downloadedUrls.has(videoUrl)) {
			p.textContent = `VIDEOEMBED${videoId}ENDVIDEO`;
		} else {
			const a = doc.createElement('a');
			a.href = videoUrl;
			a.textContent = 'Video';
			p.appendChild(a);
		}
		div.replaceWith(p);
	}

	return doc.body.innerHTML;
}

function restoreVideoWikilinks(md: string): string {
	return md.replace(VIDEO_PLACEHOLDER_RE, '![[' + '$1.mp4]]');
}

export function createConverter(downloadedUrls: Set<string>): TurndownService {
	const turndown = new TurndownService({
		headingStyle: 'atx',
		hr: '---',
		bulletListMarker: '-',
		codeBlockStyle: 'fenced',
	});

	// Linked Substack images: <a href="cdn"><img src="cdn"></a>
	turndown.addRule('substackLinkedImage', {
		filter: (node) => {
			if (node.nodeName !== 'A') return false;
			if (!node.querySelector('img')) return false;
			const href = node.getAttribute('href') ?? '';
			return isSubstackImageUrl(href);
		},
		replacement: (_content, node) => {
			const img = node.querySelector('img');
			const src = img?.getAttribute('src') ?? node.getAttribute('href') ?? '';
			if (downloadedUrls.has(src)) {
				return `\n\n![[${imageFilename(src)}]]\n\n`;
			}
			const alt = img?.getAttribute('alt') ?? '';
			return `\n\n![${alt}](${src})\n\n`;
		},
	});

	// Standalone Substack images: <img src="cdn">
	turndown.addRule('substackImage', {
		filter: (node) => {
			if (node.nodeName !== 'IMG') return false;
			if (node.parentElement?.nodeName === 'A') return false;
			const src = node.getAttribute('src') ?? '';
			return isSubstackImageUrl(src);
		},
		replacement: (_content, node) => {
			const src = node.getAttribute('src') ?? '';
			if (downloadedUrls.has(src)) {
				return `\n\n![[${imageFilename(src)}]]\n\n`;
			}
			const alt = node.getAttribute('alt') ?? '';
			return `\n\n![${alt}](${src})\n\n`;
		},
	});

	turndown.addRule('iframe', {
		filter: 'iframe',
		replacement: (_content, node) => {
			return '\n\n' + node.outerHTML + '\n\n';
		},
	});

	turndown.addRule('audio', {
		filter: 'audio',
		replacement: (_content, node) => {
			return node.outerHTML;
		},
	});

	return turndown;
}

export function htmlToMarkdown(html: string, downloadedUrls: Set<string>): string {
	const preprocessed = replaceVideoDivs(html, downloadedUrls);
	const converter = createConverter(downloadedUrls);
	const md = converter.turndown(preprocessed);
	return restoreVideoWikilinks(md);
}
