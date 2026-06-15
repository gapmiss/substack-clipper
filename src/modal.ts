import { App, Modal, Notice, Setting } from 'obsidian';

export class ClipModal extends Modal {
	private url = '';
	private onSubmit: (url: string) => void;

	constructor(app: App, onSubmit: (url: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('substack-clipper-modal');
		contentEl.createEl('h2', { text: 'Clip substack post' });

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
			.addButton(btn => btn
				.setButtonText('Clip')
				.setCta()
				.onClick(() => { this.submit(); }));
	}

	private submit(): void {
		if (!this.url || !this.url.includes('/p/')) {
			new Notice('Invalid URL — must contain /p/ path segment.');
			return;
		}
		this.close();
		this.onSubmit(this.url);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
