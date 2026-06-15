import TurndownService from 'turndown';
import { imageFilename } from './downloader';

function isSubstackImageUrl(url: string): boolean {
	return url.includes('substackcdn.com/image') ||
		url.includes('.s3.amazonaws.com/public/images');
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

	turndown.addRule('videoEmbed', {
		filter: (node) => {
			return node.nodeName === 'DIV' &&
				node.getAttribute('data-component-name') === 'VideoEmbedPlayer';
		},
		replacement: (_content, node) => {
			return node.outerHTML;
		},
	});

	turndown.addRule('mediaDiv', {
		filter: (node) => {
			if (node.nodeName !== 'DIV') return false;
			const id = node.getAttribute('id') ?? '';
			return id.startsWith('media-') && id.length === 42;
		},
		replacement: (_content, node) => {
			return node.outerHTML;
		},
	});

	return turndown;
}

export function htmlToMarkdown(html: string, downloadedUrls: Set<string>): string {
	const converter = createConverter(downloadedUrls);
	return converter.turndown(html);
}
