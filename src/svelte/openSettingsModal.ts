import { mount, unmount } from 'svelte';
import SettingsModal from './SettingsModal.svelte';

export function openSettingsModal() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  let closed = false;
  const instance = mount(SettingsModal, {
    target: host,
    props: {
      onClose: () => close()
    }
  });

  function close() {
    if (closed) return;
    closed = true;
    void unmount(instance);
    host.remove();
  }

  return close;
}

export function openSettingsRouteIfNeeded(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const normalized = (hash || '').toLowerCase();
  if (normalized === '#settings') {
    openSettingsModal();
    return true;
  }
  return false;
}
