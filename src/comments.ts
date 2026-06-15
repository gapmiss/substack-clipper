import { requestUrl } from 'obsidian';
import type { SubstackClipperSettings } from './types';

interface Comment {
	id: number;
	user_id: number;
	name: string;
	handle: string;
	photo_url: string | null;
	body: string | null;
	date: string;
	status: string;
	children?: Comment[];
}

interface CommentsResponse {
	comments: Comment[];
}

export async function fetchComments(
	domain: string,
	postId: number,
	sort: SubstackClipperSettings['commentSort'],
): Promise<CommentsResponse> {
	const url = `${domain}/api/v1/post/${postId}/comments?token=&all_comments=true&sort=${sort}`;
	const response = await requestUrl({
		url,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
		},
	});
	return response.json as CommentsResponse;
}

function formatDate(isoDate: string): string {
	const d = new Date(isoDate);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const month = months[d.getMonth()];
	const day = String(d.getDate()).padStart(2, '0');
	const year = d.getFullYear();
	let hours = d.getHours();
	const ampm = hours >= 12 ? 'PM' : 'AM';
	hours = hours % 12 || 12;
	const minutes = String(d.getMinutes()).padStart(2, '0');
	return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}

const DEFAULT_AVATAR = '![](https://substackcdn.com/image/fetch/w_32,h_32,c_fill,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack.com%2Fimg%2Favatars%2Fdefault-light.png)';

function encodePhotoUrl(photoUrl: string): string {
	return encodeURIComponent(photoUrl);
}

function renderComment(
	comment: Comment,
	slug: string,
	domain: string,
	level: number,
): string {
	let md = '';
	const indent = '> '.repeat(level + 1);
	const commentUrl = `${domain}/p/${slug}/comment/${comment.id}`;

	if (level === 0) {
		md += '\n\n---\n\n';
	}

	const dateStr = formatDate(comment.date);

	if (comment.status === 'deleted' || comment.status === 'flagged' || comment.status === 'moderator_removed') {
		md += `${indent}${DEFAULT_AVATAR} Comment removed • [${dateStr}](${commentUrl})`;
		md += `\n${indent}`;
		md += `\n${indent} Comment removed\n${indent}`;
		md += `\n${indent}\n\n`;
	} else {
		const avatar = comment.photo_url
			? `![](https://substackcdn.com/image/fetch/w_32,h_32,c_fill,f_webp,q_auto:good,fl_progressive:steep/${encodePhotoUrl(comment.photo_url)})`
			: DEFAULT_AVATAR;

		md += `${indent}${avatar} [${comment.name}](https://substack.com/profile/${comment.user_id}-${comment.handle}) • [${dateStr}](${commentUrl})`;
		md += `\n${indent}`;
		if (comment.body) {
			md += `\n${indent} ${comment.body.replace(/\n/g, '\n' + indent)}`;
		}
		md += '\n\n';
	}

	if (comment.children) {
		for (const child of comment.children) {
			md += renderComment(child, slug, domain, level + 1);
		}
	}

	return md;
}

export function renderComments(
	data: CommentsResponse,
	slug: string,
	domain: string,
): string {
	let md = '';
	for (const comment of data.comments) {
		md += renderComment(comment, slug, domain, 0);
	}
	return md;
}
