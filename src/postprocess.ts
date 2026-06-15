export function postprocessMarkdown(md: string, domain: string, downloadedUrls: Set<string>): string {
	let out = md;

	// iframe spacing
	out = out.replace(/<iframe/g, '\n\n<iframe');
	out = out.replace(/<\/iframe>/g, '</iframe>\n\n');

	// fix missing line breaks after image/link closings
	out = out.replace(/(\.[a-z]{3,4}\))([a-zA-Z0-9!#""[*…<])/g, '$1\n\n$2');

	// fix headings glued to links
	out = out.replace(/(\))(#{1,6})/g, '$1\n\n$2');

	// footnotes
	const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	out = out.replace(
		new RegExp(`\\[(\\d)\\]\\(${escapedDomain}/p/([a-zA-Z0-9-]+)#footnote-\\d-\\d+\\)`, 'g'),
		'[^$1]',
	);
	out = out.replace(
		new RegExp(`\\[(\\d)\\]\\(${escapedDomain}/p/([a-zA-Z0-9-]+)#footnote-anchor-\\d-\\d+\\)`, 'g'),
		'[^$1]: ',
	);

	// truncated post previews
	out = out.replace(
		/\[(.*)\n(\n)?-+\]\([a-z0-9-:/.]+\)(.*)(\n\n)?\[Read full story\]\(([a-z0-9-]+)\)/g,
		'\n\n[$1]($5)\n\n',
	);
	out = out.replace(
		/\[!\[\]\(.*\)\n\n(.*)…Read more(.*)\]\((.*)\)/g,
		'\n\n[$1]($3)\n\n',
	);

	// image cleanup
	out = out.replace(/!\[None\]/g, '![]');
	out = out.replace(/ "None"\)/g, ')');
	out = out.replace(/\)\[!\[\]/g, ')\n\n[![]');

	// CDN/S3 prefix cleanup only when images were downloaded (wikilinks don't contain URLs)
	if (downloadedUrls.size > 0) {
		out = out.replace(/https:\/\/substackcdn\.com\/image\/fetch\/[^/]+\//g, '');

		out = out.replace(
			/\[!\[(.*)?\]\((https%3A%2F%2F[a-z0-9-]+\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F(.*)\.[a-z]{3,4})( ".*")?\)\]\((https%3A%2F%2F[a-z0-9-]+\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F(.*)\.[a-z]{3,4})\)/g,
			'![$1]($2)',
		);

		out = out.replace(
			/(https%3A%2F%2F[a-z0-9-]+\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F)/g,
			'',
		);
	}

	// embedded video divs → wikilinks or links
	out = out.replace(
		/<div [^>]*id="media-([^"]+)"[^>]*>.*<\/div>/g,
		(_match, videoId: string) => {
			const videoUrl = `https://api.substack.com/api/v1/video/upload/${videoId}/src`;
			if (downloadedUrls.has(videoUrl)) {
				return `![[${videoId}.mp4]]\n\n`;
			}
			return `[Video](${videoUrl})\n\n`;
		},
	);

	// embedded audio → wikilinks or links
	out = out.replace(
		/[0-9×:-]+<audio [^>]*src="\/api\/v1\/audio\/upload\/([^"]+)\/src"[^>]*>.*<\/audio>/g,
		(_match, audioId: string) => {
			const audioUrl = `https://api.substack.com/api/v1/audio/upload/${audioId}/src`;
			if (downloadedUrls.has(audioUrl)) {
				return `\n\n![[${audioId}.mp3]]\n\n`;
			}
			return `\n\n[Audio](${audioUrl})\n\n`;
		},
	);

	// remove preserved spacing notice
	out = out.replace(/Text within this block will maintain its original spacing when published/g, '');

	// remove attachment icon images
	out = out.replace(/!\[\]\(https%3A%2F%2Fsubstack\.com%2Fimg%2Fattachment_icon\.svg\) ?\n?/g, '');

	// PDF download links → wikilinks or keep original links
	out = out.replace(
		/\[Download\]\(https:\/\/([a-z0-9.]+)\/api\/v1\/file\/([a-z0-9-]+)\.pdf\)/g,
		(_match, host: string, fileId: string) => {
			const pdfUrl = `https://${host}/api/v1/file/${fileId}.pdf`;
			if (downloadedUrls.has(pdfUrl)) {
				return `[[${fileId}.pdf]]`;
			}
			return _match;
		},
	);

	return out;
}
