import { Button, Checkbox } from "@base-ui/react";

export function SettingsPanel({
	canvasFrame,
	formatOnSave,
	onCanvasFrameChange,
	onFormatOnSaveChange,
	onResetLayout,
}: {
	canvasFrame: boolean;
	formatOnSave: boolean;
	onCanvasFrameChange: (checked: boolean) => void;
	onFormatOnSaveChange: (checked: boolean) => void;
	onResetLayout: () => void;
}) {
	return (
		<section aria-label="Settings" className="workspace-panel padded-panel">
			<h2>Workspace</h2>
			<label className="settings-option">
				<Checkbox.Root
					checked={formatOnSave}
					className="settings-checkbox"
					onCheckedChange={onFormatOnSaveChange}
				>
					<Checkbox.Indicator className="settings-checkbox-indicator" />
				</Checkbox.Root>
				Format on save
			</label>
			<label className="settings-option">
				<Checkbox.Root
					checked={canvasFrame}
					className="settings-checkbox"
					onCheckedChange={onCanvasFrameChange}
				>
					<Checkbox.Indicator className="settings-checkbox-indicator" />
				</Checkbox.Root>
				Canvas frame
			</label>
			<Button
				className="application-button"
				type="button"
				onClick={onResetLayout}
			>
				Reset Layout
			</Button>
		</section>
	);
}
