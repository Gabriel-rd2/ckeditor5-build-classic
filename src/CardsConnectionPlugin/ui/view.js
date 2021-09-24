import ListView from "@ckeditor/ckeditor5-ui/src/list/listview";
import ListItemView from "@ckeditor/ckeditor5-ui/src/list/listitemview";
import ButtonView from "@ckeditor/ckeditor5-ui/src/button/buttonview";

import "./theme.css";
export default class CardsConnectionView extends ListView {
	constructor(locale) {
		super(locale);

		this.extendTemplate({
			attributes: {
				class: ["ck-cardconnection-list"],
				tabindex: "-1",
			},
		});
	}
}

export class CardsConnectionItemView extends ListItemView {
	constructor(locale) {
		super(locale);

		this.extendTemplate({
			attributes: {
				class: ["ck-cardconnection-list-item"],
			},
		});
	}
}

export class Button extends ButtonView {
	constructor(locale) {
		super(locale);

		this.extendTemplate({
			attributes: {
				class: ["ck-cardconnection-button"],
			},
		});
	}
}
