'use babel';

// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions
import { CompositeDisposable } from 'atom';
import filesize from 'filesize';

export default class ImportCostAtomView {
  constructor(editor, line) {
    this.element = document.createElement('div');
    this.element.appendChild(document.createElement('span'));
    this.element.classList.add('import-cost-atom', 'loading', 'hidden');
    this.element.firstChild.textContent = 'Calculating...';

    const row = line - 1;

    this.marker = editor.markBufferPosition([row, Infinity], {
      invalidate: 'touch',
    });

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(this.marker.onDidChange((event) => {
      if (event.isValid) {
        this.updatePosition(editor);
      }
    }));

    this.updatePosition(editor);

    editor.decorateMarker(this.marker, {
      type: 'block',
      item: this.element,
      position: 'after',
    });
  }

  updatePosition(editor) {
    // Check to see if we can place it
    if (editor.getLineHeightInPixels()) {
      const height = editor.getLineHeightInPixels();
      const length = this.marker.getStartBufferPosition().column;
      const inlineStyle = `margin: -${height}px 0 0 ${length + 2}ch`;
      this.element.firstChild.setAttribute('style', inlineStyle);
      this.element.classList.remove('hidden');
    } else if (!this.element.classList.contains('hidden')) {
      this.element.classList.add('hidden');
    }
  }

  updateText(pkg) {
    if (pkg.size > 0) {
      this.element.firstChild.textContent = `${filesize(pkg.size)} (gzipped: ${filesize(pkg.gzip)})`;
      this.element.classList.remove('loading');
    } else {
      this.destroy();
    }
  }

  destroy() {
    this.subscriptions.dispose();
    this.element.remove();
    this.marker.destroy();
  }
}
