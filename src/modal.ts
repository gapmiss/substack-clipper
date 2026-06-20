import { App, Modal, Notice, Setting } from 'obsidian';

export class ClipModal extends Modal {
	private url = '';
	private openAfterClip: boolean;
	private onSubmit: (url: string, openAfterClip: boolean) => void;

	constructor(app: App, openAfterClip: boolean, onSubmit: (url: string, openAfterClip: boolean) => void) {
		super(app);
		this.openAfterClip = openAfterClip;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('substack-clipper-modal');
		contentEl.createEl('h2', { text: 'Save substack post' });

		new Setting(contentEl)
			.setName('Post URL')
			.setDesc('Full URL to a substack post (must contain /p/).')
			.addText(text => {
				text.setPlaceholder('Enter substack post URL');
				text.onChange(value => { this.url = value.trim(); });
				text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						this.submit();
					}
				});
				text.inputEl.setCssStyles({ width: '100%' });
			});

		new Setting(contentEl)
			.setName('Open after saving')
			.addToggle(toggle => toggle
				.setValue(this.openAfterClip)
				.onChange(value => { this.openAfterClip = value; }));

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => { this.submit(); }));
	}

	private submit(): void {
		if (!this.url || !this.url.includes('/p/')) {
			new Notice('Invalid URL — must contain /p/ path segment.');
			return;
		}
		this.close();
		this.onSubmit(this.url, this.openAfterClip);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
