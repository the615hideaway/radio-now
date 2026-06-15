const FileUploadField = {
  render(options = {}) {
    const id = String(options.id || '').trim();
    const label = options.label || 'File';
    const accept = options.accept || '';
    const hint = options.hint || 'Choose your file, upload it to Google Drive (Anyone with the link can view), then paste the share link below.';
    const required = !!options.required;
    const placeholder = options.placeholder || 'https://drive.google.com/...';

    return `
      <div class="form-field file-upload-field" data-file-upload="${Utils.escapeHtml(id)}">
        <label for="${Utils.escapeHtml(id)}-link">${Utils.escapeHtml(label)}</label>
        <div class="file-upload-dropzone" id="${Utils.escapeHtml(id)}-dropzone">
          <input
            type="file"
            class="file-upload-input"
            id="${Utils.escapeHtml(id)}-file"
            accept="${Utils.escapeHtml(accept)}"
            hidden
          >
          <button type="button" class="btn btn-secondary file-upload-btn" data-file-trigger="${Utils.escapeHtml(id)}-file">
            <i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>
            Add file
          </button>
          <p class="file-upload-status" id="${Utils.escapeHtml(id)}-status" aria-live="polite">No file selected</p>
          <p class="file-upload-hint">${Utils.escapeHtml(hint)}</p>
        </div>
        <label class="file-upload-link-label" for="${Utils.escapeHtml(id)}-link">Google Drive link</label>
        <input
          type="url"
          class="file-upload-link"
          id="${Utils.escapeHtml(id)}-link"
          placeholder="${Utils.escapeHtml(placeholder)}"
          autocomplete="off"
          ${required ? 'required' : ''}
        >
      </div>`;
  },

  bind(root = document) {
    root.querySelectorAll('[data-file-upload]').forEach((field) => {
      if (field.dataset.bound === 'true') return;
      field.dataset.bound = 'true';

      const fileInput = field.querySelector('.file-upload-input');
      const trigger = field.querySelector('[data-file-trigger]');
      const status = field.querySelector('.file-upload-status');
      const linkInput = field.querySelector('.file-upload-link');

      trigger?.addEventListener('click', () => fileInput?.click());

      fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) {
          if (status) {
            status.textContent = 'No file selected';
            status.classList.remove('has-file');
          }
          return;
        }

        if (status) {
          status.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${Utils.escapeHtml(file.name)} — now paste your Drive link below`;
          status.classList.add('has-file');
        }
        linkInput?.focus();
      });
    });
  },

  value(id) {
    return String(document.getElementById(`${id}-link`)?.value || '').trim();
  },

  reset(id) {
    const fileInput = document.getElementById(`${id}-file`);
    const linkInput = document.getElementById(`${id}-link`);
    const status = document.getElementById(`${id}-status`);

    if (fileInput) fileInput.value = '';
    if (linkInput) linkInput.value = '';
    if (status) {
      status.textContent = 'No file selected';
      status.classList.remove('has-file');
    }
  },

  resetAll(ids = []) {
    ids.forEach((id) => this.reset(id));
  },
};