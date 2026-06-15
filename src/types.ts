export interface SubstackPost {
	title: string;
	subtitle: string;
	type: string;
	audience: string;
	url: string;
	slug: string;
	coverImage: string;
	date: string;
	id: number;
	wordcount: number;
	commentCount: number;
	podcastUrl: string | null;
	videoUploadId: string | null;
	transcript: string;
}

export interface ParsedArticle extends SubstackPost {
	html: string;
	markdown: string;
	images: string[];
	videos: string[];
	audios: string[];
	attachments: string[];
}

export interface SubstackClipperSettings {
	saveDirectory: string;
	downloadMedia: boolean;
	maxFileSize: number;
	downloadComments: boolean;
	saveRawJson: boolean;
	saveRawHtml: boolean;
	commentSort: 'most_recent_first' | 'oldest_first' | 'best_first';
}

export const DEFAULT_SETTINGS: SubstackClipperSettings = {
	saveDirectory: 'Substacks',
	downloadMedia: false,
	maxFileSize: 0,
	downloadComments: false,
	saveRawJson: false,
	saveRawHtml: false,
	commentSort: 'most_recent_first',
};

export interface DownloadResult {
	downloaded: Set<string>;
	skipped: Set<string>;
}
