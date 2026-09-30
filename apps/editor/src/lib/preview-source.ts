// ABOUTME: Tracks preview jobs and the source owning the accepted Canvas render.
// ABOUTME: Allows successful saves to adopt formatting without accepting stale runs.

export interface PreviewSourceAdoption {
	readonly accepted: boolean;
	readonly invalidatedRun: number | undefined;
	readonly previewRequired: boolean;
}

export class PreviewSource {
	private nextRun = 0;
	private pendingRun: { id: number; source: string } | undefined;
	private acceptedSource: string | undefined;
	private latestSource: string | undefined;

	begin(source: string): number {
		const id = ++this.nextRun;
		this.pendingRun = { id, source };
		this.acceptedSource = undefined;
		this.latestSource = source;
		return id;
	}

	isPending(id: number, source: string): boolean {
		return this.pendingRun?.id === id && this.pendingRun.source === source;
	}

	accept(id: number, source: string): boolean {
		if (!this.isPending(id, source)) {
			return false;
		}
		this.pendingRun = undefined;
		this.acceptedSource = source;
		return true;
	}

	fail(id: number): void {
		if (this.pendingRun?.id === id) this.pendingRun = undefined;
	}

	adoptSavedSource(
		sourceBeforeSave: string,
		sourceAdopted: string,
	): PreviewSourceAdoption {
		if (sourceBeforeSave === sourceAdopted) {
			return {
				accepted: this.acceptedSource === sourceAdopted,
				invalidatedRun: undefined,
				previewRequired: false,
			};
		}
		const invalidatedRun =
			this.pendingRun?.source === sourceBeforeSave
				? this.pendingRun.id
				: undefined;
		if (invalidatedRun !== undefined) {
			this.pendingRun = undefined;
			this.nextRun += 1;
		}
		if (this.acceptedSource === sourceBeforeSave) {
			this.acceptedSource = sourceAdopted;
			this.latestSource = sourceAdopted;
			return { accepted: true, invalidatedRun, previewRequired: false };
		}
		const previewRequired = this.latestSource === sourceBeforeSave;
		if (previewRequired) this.latestSource = sourceAdopted;
		return { accepted: false, invalidatedRun, previewRequired };
	}

	isAccepted(source: string): boolean {
		return this.acceptedSource === source;
	}
}
