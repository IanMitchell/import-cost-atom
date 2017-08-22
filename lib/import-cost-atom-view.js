'use babel';

import { Point } from 'atom'; // eslint-disable-line
import filesize from 'filesize';

export default class ImportCostAtomView {
  constructor(line) {
    this.element = document.createElement('div');
    this.element.appendChild(document.createElement('span'));
    this.element.classList.add('import-cost-atom', 'loading');
    this.element.firstChild.textContent = 'Calculating...';

    const row = line - 1;

    const editor = atom.workspace.getActiveTextEditor();
    this.marker = editor.markBufferPosition([row, Infinity], {
      invalidate: 'touch',
    });

    const lineLength = editor.getBuffer().lineLengthForRow(row);
    const lineHeight = editor.getLineHeightInPixels();

    const inlineStyle = `margin: -${lineHeight}px 0 0 ${lineLength + 2}ch`;
    this.element.firstChild.setAttribute('style', inlineStyle);

    editor.decorateMarker(this.marker, {
      type: 'block',
      item: this.element,
      position: 'after',
    });
  }

  updateText(pkg) {
    if (pkg.size > 0) {
      this.element.firstChild.textContent = `${filesize(pkg.size)} (gzipped: ${filesize(pkg.gzip)})`;
    } else {
      this.element.firstChild.textContent = '';
    }

    this.element.classList.remove('loading');
  }

  destroy() {
    this.element.remove();
  }
}
