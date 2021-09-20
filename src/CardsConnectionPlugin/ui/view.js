import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";
import View from "@ckeditor/ckeditor5-ui/src/view";

export default class CardsConnectionView extends View {
  constructor(locale) {
    super(locale);

    // An entry point to binding observables with DOM attributes,
    // events and text nodes.
    const bind = this.bindTemplate;

    // Views define their interface (state) using observable properties.
    this.set({
      isEnabled: false,
      placeholder: "",
    });

    this.setTemplate({
      tag: "input",
      attributes: {
        class: [
          "foo",
          // The value of view#isEnabled will control the presence
          // of the class.
          bind.if("isEnabled", "ck-enabled"),
        ],

        // The HTML "placeholder" attribute is also controlled by the observable.
        placeholder: bind.to("placeholder"),
        type: "text",
      },
      on: {
        // DOM keydown events will fire the view#input event.
        keydown: bind.to("input"),
      },
    });
  }

  setValue(newValue) {
    this.element.value = newValue;
  }
}
