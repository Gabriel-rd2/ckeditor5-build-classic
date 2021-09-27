import ListView from "@ckeditor/ckeditor5-ui/src/list/listview";
import ListItemView from "@ckeditor/ckeditor5-ui/src/list/listitemview";
import ButtonView from "@ckeditor/ckeditor5-ui/src/button/buttonview";

import "./theme.css";

/**
 * View de UI do CkEditor que contém uma lista de cards para as conexões
 *
 * @export
 * @class CardsConnectionView
 * @extends {ListView}
 */
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

/**
 * View de UI do CkEditor que contém um item da lista de cards.
 *
 * @export
 * @class CardsConnectionItemView
 * @extends {ListItemView}
 */
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

/**
 * View de Botão do CkEditor
 *
 * @export
 * @class Button
 * @extends {ButtonView}
 */
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
