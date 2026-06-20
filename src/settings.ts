import { App, Notice, PluginSettingTab } from 'obsidian';
import type { Setting, SettingDefinitionItem } from 'obsidian';
import type SubstackClipperPlugin from './main';

export class SettingsTab extends PluginSettingTab {
	plugin: SubstackClipperPlugin;

	constructor(app: App, plugin: SubstackClipperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Storage',
				items: [
					{
						name: 'Save directory',
						desc: 'Vault-relative folder path for clipped posts.',
						control: {
							type: 'folder',
							key: 'saveDirectory',
							placeholder: 'Substacks',
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Downloads',
				items: [
					{
						name: 'Download media',
						desc: 'Download all media files (images, attachments, videos, audio) to the vault. When off, original Substack URLs are kept.',
						control: {
							type: 'toggle',
							key: 'downloadMedia',
						},
					},
					{
						name: 'Max file size (MB)',
						desc: 'Skip media files larger than this size and keep the original URL. 0 means no limit.',
						control: {
							type: 'text',
							key: 'maxFileSize',
							placeholder: '0',
						},
						visible: () => this.plugin.settings.downloadMedia,
					},
					{
						name: 'Download comments',
						desc: 'Fetch and save threaded comments as a separate note.',
						control: {
							type: 'toggle',
							key: 'downloadComments',
						},
					},
					{
						name: 'Comment sort order',
						control: {
							type: 'dropdown',
							key: 'commentSort',
							defaultValue: 'most_recent_first',
							options: {
								most_recent_first: 'Most recent first',
								oldest_first: 'Oldest first',
								best_first: 'Best first',
							},
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'History',
				items: [
					{
						name: 'Max history length',
						desc: 'Maximum number of entries to keep. 0 means unlimited.',
						control: {
							type: 'number',
							key: 'maxHistoryLength',
						},
					},
					{
						name: 'Truncate history',
						desc: 'Keep only the newest entries and discard the rest.',
						render: (setting: Setting) => {
							let truncateValue = 10;
							setting
								.addText(text => {
									text.setPlaceholder('10');
									text.inputEl.type = 'number';
									text.inputEl.addClass('substack-clipper-truncate-input');
									text.onChange(v => { truncateValue = parseInt(v) || 10; });
								})
								.addButton(btn => {
									btn.setButtonText('Truncate').setDestructive();
									btn.onClick(() => {
										const history = this.plugin.settings.history;
										if (truncateValue >= history.length) {
											new Notice(`History already has ${String(history.length)} entries.`);
											return;
										}
										this.plugin.settings.history = history.slice(-truncateValue);
										void this.plugin.saveSettings();
										new Notice(`History truncated to ${String(truncateValue)} entries.`);
									});
								});
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Advanced',
				items: [
					{
						name: 'Save raw JSON',
						desc: 'Save the raw Substack API JSON alongside the clipped post.',
						control: {
							type: 'toggle',
							key: 'saveRawJson',
						},
					},
					{
						name: 'Save raw HTML',
						desc: 'Save the raw article HTML alongside the clipped post.',
						control: {
							type: 'toggle',
							key: 'saveRawHtml',
						},
					},
				],
			},
		];
	}
}
