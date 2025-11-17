import { mountSettingsModal } from '../../src/svelte/mountSettingsModal.ts';

export function openSettingsModal(): void {
  mountSettingsModal();
}

export function mountSettings(container: HTMLElement | null): void {
  const isSettingsRoute = (location.hash || '').toLowerCase() === '#settings';
  if (isSettingsRoute) {
    mountSettingsModal();
  }
  if (container) container.innerHTML = '';
}
