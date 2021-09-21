import View from "@ckeditor/ckeditor5-ui/src/view";
import ListView from "@ckeditor/ckeditor5-ui/src/list/listview";
import ListItemView from "@ckeditor/ckeditor5-ui/src/list/listitemview";

export default class CardsConnectionView extends ListView {
	constructor(locale) {
		super(locale);
	}
}

export class CardsConnectionItemView extends ListItemView {}

export class DomWrapperView extends View {
	constructor(locale, domElement) {
		super(locale);

		// Disable template rendering on this view.
		this.template = false;

		this.domElement = domElement;

		this.listenTo(this.domElement, "click", () => {
			console.log(this.domElement.innerHTML);
		});
	}

	render() {
		super.render();
		this.element = this.domElement;
	}
}
