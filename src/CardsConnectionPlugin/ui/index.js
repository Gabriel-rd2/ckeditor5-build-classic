import Plugin from "@ckeditor/ckeditor5-core/src/plugin";

import CardsConnectionView from "./view";

export default class CardsConnectionUI extends Plugin {
  static get pluginName() {
    return "CardsConnectionUI";
  }

  init() {
    // const editor = this.editor;
    // const locale = editor.locale;

    // const view = new CardsConnectionView(locale);

    // editor.ui.view.body.add(view);

    console.log("CardsConnectionUI was initialized");
  }
}
