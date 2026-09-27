// ABOUTME: Defines the settings operations shared by browser and desktop hosts.
// ABOUTME: Limits application persistence to the keys read and written by the IDE.

export interface ApplicationSettings {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}
