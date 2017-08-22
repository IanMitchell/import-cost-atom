'use babel';

import { importCost, cleanup, JAVASCRIPT, TYPESCRIPT } from 'import-cost';
import ImportCostAtomView from './import-cost-atom-view';

function getFileLanguage(path) {
  if (path.endsWith('.js') || path.endsWith('.jsx')) {
    return JAVASCRIPT;
  } else if (path.endsWith('.ts')) {
    return TYPESCRIPT;
  }

  return undefined;
}

export default {
  importCostLabels: null,
  importCostEmitters: null,

  activate() {
    this.importCostLabels = new Map();
    this.importCostEmitters = new Map();

    this.renderCost = this.renderCost.bind(this);
    this.calculateCost = this.calculateCost.bind(this);

    atom.workspace.onDidChangeActivePaneItem(() => this.calculateCost());
    atom.workspace.observeTextEditors((editor) => {
      editor.onDidSave(() => this.calculateCost());
    });

    this.calculateCost();
  },

  calculateCost() {
    const editor = atom.workspace.getActiveTextEditor();

    if (!editor) {
      return;
    }

    const path = editor.getPath();
    const language = getFileLanguage(path);

    if (language === undefined) {
      return;
    }

    const content = editor.getText();

    if (this.importCostEmitters.has(path)) {
      const emitter = this.importCostEmitters.get(path);
      emitter.removeAllListeners();
    }

    this.importCostEmitters.set(path, importCost(path, content, language));
    this.importCostEmitters.get(path).on('start', (packages) => {
      packages.forEach((pkg) => {
        this.renderCost(path, pkg);
      });
    });
    this.importCostEmitters.get(path).on('calculated', (pkg) => {
      this.importCostLabels.get(pkg.line).updateText(pkg);
    });

    this.importCostEmitters.get(path).on('error', console.error);
  },

  renderCost(path, pkg) {
    if (this.importCostLabels.has(pkg.line)) {
      this.importCostLabels.get(pkg.line).destroy();
    }

    this.importCostLabels.set(pkg.line, new ImportCostAtomView(pkg.line));
  },

  deactivate() {
    // Cleanup import-cost
    cleanup();

    // Cleanup UI
    [].concat([...this.importCostLabels.values()]).forEach(label => label.destroy());
    this.importCostLabels.clear();
    this.importCostEmitters.clear();
  },
};
