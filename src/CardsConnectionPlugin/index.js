import Plugin from "@ckeditor/ckeditor5-core/src/plugin";

import CardsConnectionEditing from "./cardsconnediting";
import CardsConnectionUI from "./ui";

export default class CardsConnectionPlugin extends Plugin {
	static get pluginName() {
		return "CardsConnectionPlugin";
	}

	static get requires() {
		return [CardsConnectionEditing, CardsConnectionUI];
	}
}
