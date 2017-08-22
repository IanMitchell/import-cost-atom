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

    this.marker.onDidChange((event) => {
      if (!event.isValid) {
        this.destroy();
      } else {
        this.updatePosition(
          editor.getLineHeightInPixels(),
          this.marker.getStartBufferPosition().column);
      }
    });

    const lineHeight = editor.getLineHeightInPixels();
    const lineLength = editor.getBuffer().lineLengthForRow(row);
    this.updatePosition(lineHeight, lineLength);

    editor.decorateMarker(this.marker, {
      type: 'block',
      item: this.element,
      position: 'after',
    });
  }

  updatePosition(height, length) {
    const inlineStyle = `margin: -${height}px 0 0 ${length + 2}ch`;
    this.element.firstChild.setAttribute('style', inlineStyle);
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
