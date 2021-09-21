import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";
import ListView from "@ckeditor/ckeditor5-ui/src/list/listview";
import ListItemView from "@ckeditor/ckeditor5-ui/src/list/listitemview";
import Rect from "@ckeditor/ckeditor5-utils/src/dom/rect";

// import '../../theme/mentionui.css';

export default class CardsConnectionView extends ListView {
	constructor(locale) {
		super(locale);

		// this.extendTemplate({
		// 	attributes: {
		// 		class: ["ck-mentions"],

		// 		tabindex: "-1",
		// 	},
		// });
	}

	// selectFirst() {
	// 	this.select(0);
	// }

	// selectNext() {
	// 	const item = this.selected;
	// 	const index = this.items.getIndex(item);

	// 	this.select(index + 1);
	// }

	// selectPrevious() {
	// 	const item = this.selected;
	// 	const index = this.items.getIndex(item);

	// 	this.select(index - 1);
	// }

	// select(index) {
	// 	let indexToGet = 0;

	// 	if (index > 0 && index < this.items.length) {
	// 		indexToGet = index;
	// 	} else if (index < 0) {
	// 		indexToGet = this.items.length - 1;
	// 	}

	// 	const item = this.items.get(indexToGet);

	// 	// Return early if item is already selected.
	// 	if (this.selected === item) {
	// 		return;
	// 	}

	// 	// Remove highlight of previously selected item.
	// 	if (this.selected) {
	// 		this.selected.removeHighlight();
	// 	}

	// 	item.highlight();
	// 	this.selected = item;

	// 	// Scroll the mentions view to the selected element.
	// 	if (!this._isItemVisibleInScrolledArea(item)) {
	// 		this.element.scrollTop = item.element.offsetTop;
	// 	}
	// }

	// executeSelected() {
	// 	this.selected.fire("execute");
	// }

	// _isItemVisibleInScrolledArea(item) {
	// 	return new Rect(this.element).contains(new Rect(item.element));
	// }
}

export class CardsConnectionItemView extends ListItemView {
	// highlight() {
	// 	const child = this.children.first;
	// 	child.isOn = true;
	// }
	// removeHighlight() {
	// 	const child = this.children.first;
	// 	child.isOn = false;
	// }
}
