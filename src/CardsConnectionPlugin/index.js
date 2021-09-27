import Plugin from "@ckeditor/ckeditor5-core/src/plugin";

import CardsConnectionEditing from "./cardsconnediting";
import CardsConnectionUI from "./ui";

// PLugin mestre, para "colar" o plugin da UI com o de manipulação de dados
export default class CardsConnectionPlugin extends Plugin {
	static get pluginName() {
		return "CardsConnectionPlugin";
	}

	static get requires() {
		return [CardsConnectionEditing, CardsConnectionUI];
	}
}
