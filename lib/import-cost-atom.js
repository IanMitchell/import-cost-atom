'use babel';

// eslint-disable-next-line import/no-extraneous-dependencies, import/extensions
import { CompositeDisposable } from 'atom';
import { importCost, cleanup, JAVASCRIPT, TYPESCRIPT } from 'import-cost';
import ImportCostAtomView from './import-cost-atom-view';

function getFileLanguage(path) {
  if (!path) {
    return undefined;
  } else if (path.endsWith('.js') || path.endsWith('.jsx')) {
    return JAVASCRIPT;
  } else if (path.endsWith('.ts')) {
    return TYPESCRIPT;
  }

  return undefined;
}

export default {
  editors: null,
  subscriptions: null,

  activate() {
    this.editors = new Map();
    this.subscriptions = new CompositeDisposable();

    this.calculateCost = this.calculateCost.bind(this);

    // Observe all TextEditors to calculate the costs
    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      // Save the subscriptions associated with the editor in a set
      const editorSubs = new Set();
      editorSubs.add(editor.onDidSave(() => this.calculateCost(editor)));
      editorSubs.add(editor.onDidDestroy(() => this.cleanupEditor(editor)));
      // Save to the map of editors
      this.editors.set(editor, { subscriptions: editorSubs });
      // Run the initial cost calculation on the new TextEditor
      this.calculateCost(editor);
    }));

    // Watch for active item changes to update screen position measurements
    // when the user switches to a TextEditor that was inactive
    this.subscriptions.add(atom.workspace.onDidStopChangingActivePaneItem(
      editor => this.updatePositions(editor)));
  },

  calculateCost(editor) {
    if (!atom.workspace.isTextEditor(editor)) {
      return;
    }

    const path = editor.getPath();
    const language = getFileLanguage(path);

    if (language === undefined) {
      return;
    }

    const editorData = this.editors.get(editor);

    const content = editor.getText();

    if (editorData.importCosts) {
      this.cleanupEditorImportCosts(editorData);
    }

    editorData.importCosts = importCost(path, content, language);

    // eslint-disable-next-line no-console
    editorData.importCosts.on('error', console.error);

    editorData.importCosts.on('start', (packages) => {
      editorData.packages = new Map();
      // List of imports has been determined, mark as calculating
      packages.forEach((pkg) => {
        editorData.packages.set(pkg.line, new ImportCostAtomView(editor, pkg.line));
      });
    });

    editorData.importCosts.on('calculated', (pkg) => {
      // A package's size has been calculated
      editorData.packages.get(pkg.line).updateText(pkg);
    });

    editorData.importCosts.on('done', (packages) => {
      // All packages that can be calculated are done, remove ones that couldn't
      // be calculated.
      editorData.packages.forEach((view, line) => {
        if (!packages.some(pkg => pkg.line === line)) {
          view.destroy();
          editorData.packages.delete(line);
        }
      });
    });
  },

  updatePositions(editor) {
    if (!atom.workspace.isTextEditor(editor)) {
      return;
    }

    if (this.editors.has(editor)) {
      this.editors.get(editor).packages.forEach(view => view.updatePosition(editor));
    }
  },

  cleanupEditorImportCosts(editorData) {
    // Remove the old importCost instance
    editorData.importCosts.removeAllListeners();
    // Cleanup any existing package displays
    editorData.packages.forEach(view => view.destroy());
    editorData.packages.clear();
  },

  cleanupEditor(editor) {
    if (this.editors.has(editor)) {
      // When the TextEditor is destroyed remove the associated subscriptions
      const editorData = this.editors.get(editor);
      this.cleanupEditorImportCosts(editorData);
      editorData.subscriptions.forEach(sub => sub.dispose());
      editorData.subscriptions.clear();
      this.editors.delete(editor);
    }
  },

  deactivate() {
    // Cleanup UI and TextEditor specific subscriptions
    this.editors.forEach((data, editor) => this.cleanupEditor(editor));
    this.editors.clear();

    // Cleanup subscriptions
    this.subscriptions.dispose();

    // Cleanup import-cost
    cleanup();
  },
};
