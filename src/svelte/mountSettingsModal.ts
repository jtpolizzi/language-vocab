import { mount, unmount } from 'svelte';
import SettingsModal from './SettingsModal.svelte';

export function mountSettingsModal() {
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
