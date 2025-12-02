const html = require('choo/html');
const { copyToClipboard } = require('../utils');
const qr = require('./qr');

// Store dialog state keyed by URL
const dialogState = new Map();

module.exports = function(name, url) {
  const dialog = function(state, emit, close) {
    // Initialize state for this URL if not exists
    if (!dialogState.has(url)) {
      dialogState.set(url, {
        shortenedUrl: '',
        isLoading: false,
        error: null
      });
    }

    const stateData = dialogState.get(url);

    return html`
      <send-copy-dialog
        class="flex flex-col items-center text-center p-4 max-w-sm m-auto"
      >
        <h1 class="text-3xl font-bold my-4">
          ${state.translate('notifyUploadEncryptDone')}
        </h1>
        <p
          class="font-normal leading-normal text-grey-80 word-break-all dark:text-grey-40"
        >
          ${state.translate('copyLinkDescription')} <br />
          ${name}
        </p>
        <div class="flex flex-row items-center justify-center w-full">
          <input
            type="text"
            id="share-url"
            class="block w-full my-4 border-default rounded-lg leading-loose h-12 px-2 py-1 dark:bg-grey-80"
            value="${url}"
            readonly="true"
          />
          <button
            id="qr-btn"
            class="w-16 m-1 p-1"
            onclick="${toggleQR}"
            title="QR code"
          >
            ${qr(url)}
          </button>
        </div>
        <button
          class="btn rounded-lg w-full flex-shrink-0 focus:outline"
          onclick="${e => copy(e, url, state, close)}"
          title="${state.translate('copyLinkButton')}"
        >
          ${state.translate('copyLinkButton')}
        </button>

        <hr class="w-full border-t my-4 dark:border-grey-70" />

        <div class="w-full">
          <p class="text-xs text-grey-60 dark:text-grey-50 mb-2 text-left">
            <strong>Zkrácená URL:</strong> Lepší pro sdílení a psaní, ale
            <strong class="text-orange-600 dark:text-orange-400"
              >horší pro soukromí</strong
            >
          </p>
          <div class="flex flex-row items-center justify-center w-full mb-2">
            <input
              type="text"
              id="shortened-url"
              class="block w-full border-default rounded-lg leading-loose h-12 px-2 py-1 dark:bg-grey-80"
              value="${stateData.shortenedUrl || ''}"
              placeholder="${stateData.isLoading
                ? 'Generuji...'
                : 'Klikněte na "Získat zkrácenou URL" pro vygenerování'}"
              readonly="true"
            />
            <button
              id="generate-shortened-btn"
              class="w-32 m-1 p-2 btn rounded-lg focus:outline ${stateData.isLoading
                ? 'opacity-50 cursor-not-allowed'
                : ''}"
              onclick="${e => generateShortened(e, url)}"
              disabled="${stateData.isLoading || !!stateData.shortenedUrl}"
              title="Získat zkrácenou URL"
            >
              ${stateData.isLoading ? 'Načítám...' : 'Získat zkrácenou URL'}
            </button>
          </div>
          ${stateData.error
            ? html`
                <p
                  class="text-sm text-red-600 dark:text-red-400 mb-2"
                  data-error-msg="true"
                >
                  ${stateData.error}
                </p>
              `
            : ''}
          ${stateData.shortenedUrl
            ? html`
                <button
                  class="btn rounded-lg w-full flex-shrink-0 focus:outline"
                  onclick="${e => copyShortened(e, url)}"
                  title="Kopírovat zkrácenou URL"
                  data-copy-shortened="true"
                >
                  Kopírovat zkrácenou URL
                </button>
              `
            : ''}
        </div>

        <button
          class="link-primary my-4 font-medium cursor-pointer focus:outline"
          onclick="${close}"
          title="${state.translate('okButton')}"
        >
          ${state.translate('okButton')}
        </button>
      </send-copy-dialog>
    `;
  };

  function toggleQR(event) {
    event.stopPropagation();
    const shareUrl = document.getElementById('share-url');
    const qrBtn = document.getElementById('qr-btn');
    if (shareUrl && qrBtn) {
      if (shareUrl.classList.contains('hidden')) {
        shareUrl.classList.replace('hidden', 'block');
        qrBtn.classList.replace('w-48', 'w-16');
      } else {
        shareUrl.classList.replace('block', 'hidden');
        qrBtn.classList.replace('w-16', 'w-48');
      }
    }
  }

  function copy(event, url, state, close) {
    event.stopPropagation();
    copyToClipboard(url);
    event.target.textContent = state.translate('copiedUrl');
    setTimeout(close, 1000);
  }

  async function generateShortened(event, url) {
    event.stopPropagation();
    const stateData = dialogState.get(url);
    if (stateData.isLoading || stateData.shortenedUrl) return;

    stateData.isLoading = true;
    stateData.error = null;

    const btn = document.getElementById('generate-shortened-btn');
    const input = document.getElementById('shortened-url');
    const errorMsg = document.querySelector('[data-error-msg]');

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Načítám...';
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (input) {
      input.value = '';
      input.placeholder = 'Generuji...';
    }
    if (errorMsg) {
      errorMsg.remove();
    }

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.shortenedUrl) {
        stateData.shortenedUrl = data.shortenedUrl;
      } else {
        throw new Error('Neplatná odpověď ze služby pro zkracování URL');
      }

      stateData.isLoading = false;
      stateData.error = null;

      // Update DOM directly
      if (input) {
        input.value = stateData.shortenedUrl;
        input.placeholder = '';
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Získat zkrácenou URL';
      }

      // Add copy button
      const container = input ? input.closest('.w-full') : null;
      if (container && !container.querySelector('[data-copy-shortened]')) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn rounded-lg w-full flex-shrink-0 focus:outline';
        copyBtn.textContent = 'Kopírovat zkrácenou URL';
        copyBtn.setAttribute('data-copy-shortened', 'true');
        copyBtn.onclick = e => copyShortened(e, url);
        container.appendChild(copyBtn);
      }
    } catch (err) {
      console.error('Error shortening URL:', err);
      stateData.error =
        'Nepodařilo se vygenerovat zkrácenou URL. Zkuste to prosím znovu.';
      stateData.isLoading = false;

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Získat zkrácenou URL';
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      if (input) {
        input.placeholder =
          'Klikněte na "Získat zkrácenou URL" pro vygenerování';
      }

      // Show error message
      const container = input ? input.closest('.w-full') : null;
      if (container && !container.querySelector('[data-error-msg]')) {
        const errorEl = document.createElement('p');
        errorEl.className = 'text-sm text-red-600 dark:text-red-400 mb-2';
        errorEl.textContent = stateData.error;
        errorEl.setAttribute('data-error-msg', 'true');
        if (input && input.parentElement) {
          input.parentElement.after(errorEl);
        }
      }
    }
  }

  function copyShortened(event, url) {
    if (event) {
      event.stopPropagation();
    }
    const stateData = dialogState.get(url);
    if (!stateData || !stateData.shortenedUrl) return;

    copyToClipboard(stateData.shortenedUrl);
    const target = event
      ? event.target
      : document.querySelector('[data-copy-shortened]');
    if (target) {
      target.textContent = 'Zkopírováno!';
      setTimeout(() => {
        if (target) {
          target.textContent = 'Kopírovat zkrácenou URL';
        }
      }, 1000);
    }
  }

  dialog.type = 'copy';
  return dialog;
};
