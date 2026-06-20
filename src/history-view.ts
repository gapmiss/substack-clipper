import { ItemView, normalizePath, Notice, setIcon, TFile, type WorkspaceLeaf } from 'obsidian';
import type SubstackClipperPlugin from './main';
import type { HistoryEntry } from './types';
import { fetchComments, renderComments } from './comments';

export const HISTORY_VIEW_TYPE = 'substack-clipper-history';

export class HistoryView extends ItemView {
	private plugin: SubstackClipperPlugin;
	private filterText = '';
	private listEl: HTMLElement;
	private statusEl: HTMLElement;
	private selectedEntries: Set<number> = new Set();

	constructor(leaf: WorkspaceLeaf, plugin: SubstackClipperPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return HISTORY_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Save history';
	}

	getIcon(): string {
		return 'history';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass('substack-clipper-history-view');

		const searchInput = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'Filter by title or author...',
			cls: 'substack-clipper-history-search',
		});
		searchInput.setAttribute('aria-label', 'Filter history entries');
		searchInput.addEventListener('input', () => {
			this.filterText = searchInput.value.toLowerCase();
			this.renderList();
		});

		this.listEl = contentEl.createDiv({ cls: 'substack-clipper-history-list' });

		this.statusEl = contentEl.createDiv({ cls: 'substack-clipper-history-status' });
		this.statusEl.setAttribute('role', 'status');
		this.statusEl.setAttribute('aria-live', 'polite');

		const footer = contentEl.createDiv({ cls: 'substack-clipper-history-footer' });
		const btn = footer.createEl('button', {
			text: 'Re-download comments',
			cls: 'mod-cta',
		});
		btn.setAttribute('aria-label', 'Re-download comments for selected entries');
		btn.addEventListener('click', () => {
			void this.redownloadComments(btn);
		});

		this.renderList();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	refresh(): void {
		this.renderList();
	}

	private getFilteredEntries(): HistoryEntry[] {
		const reversed = [...this.plugin.settings.history].reverse();
		if (!this.filterText) return reversed;
		return reversed.filter(e =>
			e.title.toLowerCase().includes(this.filterText) ||
			e.username.toLowerCase().includes(this.filterText),
		);
	}

	private renderList(): void {
		this.listEl.empty();
		this.selectedEntries.clear();

		const entries = this.getFilteredEntries();

		if (entries.length === 0) {
			this.listEl.createDiv({
				text: this.plugin.settings.history.length === 0
					? 'No saved posts yet.'
					: 'No matching entries.',
				cls: 'substack-clipper-history-empty',
			});
			return;
		}

		const header = this.listEl.createDiv({ cls: 'substack-clipper-history-header' });
		const selectAllCb = header.createEl('input', { type: 'checkbox' });
		selectAllCb.setAttribute('aria-label', 'Select all entries');
		header.createEl('span', {
			text: `${String(entries.length)} ${entries.length === 1 ? 'entry' : 'entries'}`,
			cls: 'substack-clipper-history-count',
		});

		const rowCheckboxes: { checkbox: HTMLInputElement; idx: number }[] = [];

		for (const entry of entries) {
			const row = this.listEl.createDiv({ cls: 'substack-clipper-history-row' });

			const checkbox = row.createEl('input', { type: 'checkbox' });
			checkbox.setAttribute('aria-label', `Select ${entry.title}`);
			const idx = this.plugin.settings.history.indexOf(entry);
			rowCheckboxes.push({ checkbox, idx });

			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedEntries.add(idx);
				} else {
					this.selectedEntries.delete(idx);
				}
				const total = rowCheckboxes.length;
				const checked = rowCheckboxes.filter(r => r.checkbox.checked).length;
				selectAllCb.checked = checked === total;
				selectAllCb.indeterminate = checked > 0 && checked < total;
			});

			const info = row.createDiv({ cls: 'substack-clipper-history-info' });
			info.createEl('span', { text: entry.title, cls: 'substack-clipper-history-title' });

			const meta = info.createDiv({ cls: 'substack-clipper-history-meta' });
			const userLine = meta.createDiv({ cls: 'substack-clipper-history-userline' });
			userLine.createEl('span', { text: entry.username, cls: 'substack-clipper-history-username' });
			if (entry.commentCount > 0) {
				userLine.createEl('span', {
					text: String(entry.commentCount),
					cls: 'substack-clipper-history-badge',
				});
			}

			meta.createEl('span', {
				text: new Date(entry.dateSaved).toLocaleDateString(),
				cls: 'substack-clipper-history-date',
			});

			const actions = meta.createDiv({ cls: 'substack-clipper-history-actions' });

			const noteBtn = actions.createEl('button', { cls: 'clickable-icon' });
			noteBtn.setAttribute('aria-label', 'Open saved note');
			noteBtn.setAttribute('data-tooltip-position', 'top');
			setIcon(noteBtn, 'file-text');
			noteBtn.addEventListener('click', () => {
				const notePath = normalizePath(
					`${this.plugin.settings.saveDirectory}/${entry.username}/${entry.slug}.md`,
				);
				const file = this.app.vault.getAbstractFileByPath(notePath);
				if (file instanceof TFile) {
					void this.app.workspace.getLeaf(false).openFile(file);
				} else {
					new Notice('Note not found in vault.');
				}
			});

			const openBtn = actions.createEl('button', { cls: 'clickable-icon' });
			openBtn.setAttribute('aria-label', 'Open URL');
			openBtn.setAttribute('data-tooltip-position', 'top');
			setIcon(openBtn, 'external-link');
			openBtn.addEventListener('click', () => {
				window.open(entry.url);
			});

			const removeBtn = actions.createEl('button', { cls: 'clickable-icon' });
			removeBtn.setAttribute('aria-label', 'Remove from history');
			removeBtn.setAttribute('data-tooltip-position', 'top');
			setIcon(removeBtn, 'trash-2');
			removeBtn.addEventListener('click', () => {
				this.plugin.settings.history.splice(idx, 1);
				void this.plugin.saveSettings();
				this.renderList();
			});
		}

		selectAllCb.addEventListener('change', () => {
			const checked = selectAllCb.checked;
			for (const { checkbox, idx } of rowCheckboxes) {
				checkbox.checked = checked;
				if (checked) {
					this.selectedEntries.add(idx);
				} else {
					this.selectedEntries.delete(idx);
				}
			}
		});
	}

	private async redownloadComments(btn: HTMLButtonElement): Promise<void> {
		if (this.selectedEntries.size === 0) {
			new Notice('No entries selected.');
			return;
		}

		btn.disabled = true;
		this.statusEl.setText('Downloading...');

		const history = this.plugin.settings.history;
		const indices = [...this.selectedEntries];
		let succeeded = 0;
		let failed = 0;

		for (const idx of indices) {
			const entry = history[idx];
			try {
				const commentsData = await fetchComments(
					entry.domain,
					entry.postId,
					this.plugin.settings.commentSort,
				);
				if (commentsData.comments && commentsData.comments.length > 0) {
					const commentsMd = renderComments(commentsData, entry.slug, entry.domain);
					const commentsPath = normalizePath(
						`${this.plugin.settings.saveDirectory}/${entry.username}/${entry.slug}-comments.md`,
					);
					await this.plugin.writeFile(commentsPath, commentsMd);
					entry.commentCount = commentsData.comments.length;
				}
				entry.lastUpdated = new Date().toISOString();
				succeeded++;
			} catch (e) {
				console.error('[substack-clipper] re-download comments error:', e);
				failed++;
			}
		}

		await this.plugin.saveSettings();
		this.renderList();
		btn.disabled = false;

		if (failed === 0) {
			const msg = `Re-downloaded comments for ${String(succeeded)} posts`;
			this.statusEl.setText(msg);
			new Notice(msg);
		} else {
			const total = succeeded + failed;
			const msg = `Re-downloaded ${String(succeeded)} of ${String(total)} (${String(failed)} failed)`;
			this.statusEl.setText(msg);
			new Notice(msg);
		}
	}
}
