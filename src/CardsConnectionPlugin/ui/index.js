import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import TextWatcher from "@ckeditor/ckeditor5-typing/src/textwatcher";
import Collection from "@ckeditor/ckeditor5-utils/src/collection";
import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";
import ButtonView from "@ckeditor/ckeditor5-ui/src/button/buttonview";
import Rect from "@ckeditor/ckeditor5-utils/src/dom/rect";

import CardConnectionView, {
	CardsConnectionItemView,
	DomWrapperView,
} from "./view";

const VERTICAL_SPACING = 3;

export default class CardsConnectionUI extends Plugin {
	static get pluginName() {
		return "CardsConnectionUI";
	}

	static get requires() {
		return [ContextualBalloon];
	}

	constructor(editor) {
		super(editor);

		this._cardConnectionView = this._createCardConnectionView();
	}

	init() {
		console.log("CardsConnectionUI.init()...");
		const editor = this.editor;

		this._balloon = editor.plugins.get(ContextualBalloon);

		// Adiciona um TextWatcher para encontrar o padrão [[*]] no texto e disparar o comando adicionado acima
		this._setupTextWatcherForReplacingTitle();

		// const filterCardsCallback = (
		this._setupTextWatcherForMarkingModel();

		this.on("getFilteredCards:response", (evt, data) =>
			this._handleGetFilteredCardsResponse(data)
		);

		console.log("CardsConnectionUI.init() ended.");
	}

	destroy() {
		super.destroy();
		this._cardConnectionView.destroy();
	}

	get _isUIVisible() {
		return this._balloon.visibleView === this._cardConnectionView;
	}

	_createCardConnectionView() {
		console.log("CardsConnectionPlugin._createCardConnectionView()...");
		const editor = this.editor;
		const locale = this.editor.locale;

		const cardConnectionView = new CardConnectionView(locale);

		this._items = new Collection();

		cardConnectionView.items.bindTo(this._items).using((card) => {
			console.log(card);

			const listItemView = new CardsConnectionItemView(locale);
			const view = this._renderItem(card);

			listItemView.children.add(view);
			listItemView.item = card;

			return listItemView;
		});

		console.log("CardsConnectionPlugin._createCardConnectionView() ended.");

		return cardConnectionView;
	}

	_getFilteredCards(cardTitle) {
		console.log("_getFilteredCards()...");
		this._lastTitleSearched = cardTitle;
		const cardList = this.editor.config.get("cardconnections.cardList");
		const filterCards = getFilterCardsCallback(cardList);

		console.log("cardTitle: ", cardTitle);
		const filteredCards = filterCards(cardTitle);

		this.fire("getFilteredCards:response", {
			filteredCards,
			cardTitle,
		});

		console.log("_getFilteredCards() ended.");
		return;
	}

	_setupTextWatcherForReplacingTitle() {
		const editor = this.editor;

		const watcher = new TextWatcher(editor.model, (text) =>
			/(\[\[)([^*]+)(\]\])/.test(text)
		);

		watcher.on("matched", () =>
			editor.execute("cardconnection", { editor })
		);
	}

	_setupTextWatcherForMarkingModel() {
		console.log(
			"CardsConnectionPlugin._setupTextWatcherForMarkingModel()..."
		);
		const editor = this.editor;

		const watcher = new TextWatcher(editor.model, createTestCallback());

		watcher.on("matched", (evt, data) => {
			const selection = editor.model.document.selection;
			const focus = selection.focus;

			const cardTitle = getCardTitleText(data.text);
			const matchedTextLength = "[[".length + cardTitle.length;

			console.log("data.text: ", data.text);
			console.log("cardTitle: ", cardTitle);
			// Create a marker range.
			const start = focus.getShiftedBy(-matchedTextLength);
			const end = focus.getShiftedBy(-cardTitle.length);
			const markerRange = editor.model.createRange(start, end);

			if (isStillCompleting(editor)) {
				const cardConnectionMarker =
					editor.model.markers.get("cardconnection");
				editor.model.change((writer) => {
					writer.updateMarker(cardConnectionMarker, {
						range: markerRange,
					});
				});
			} else {
				editor.model.change((writer) => {
					writer.addMarker("cardconnection", {
						range: markerRange,
						usingOperation: false,
						affectsData: false,
					});
				});
			}

			this._getFilteredCards(cardTitle);
		});

		watcher.on("unmatched", () => {
			console.log("marking model watcher unmatched!");
			this._hideUIAndRemoveMarker();
		});

		// const cardConnectionCommand = editor.commands.get("cardconnection");
		// watcher.bind("isEnabled").to(cardConnectionCommand);

		console.log(
			"CardsConnectionPlugin._setupTextWatcherForMarkingModel() ended."
		);
	}

	_handleGetFilteredCardsResponse(data) {
		console.log(
			"CardsConnectionPlugin._handleGetFilteredCardsResponse()..."
		);
		const { filteredCards, cardTitle } = data;

		console.log("filteredCards: ", filteredCards);
		console.log("cardTitle: ", cardTitle);
		if (!isStillCompleting(this.editor)) return;

		this._items.clear();

		for (const card of filteredCards) {
			this._items.add({ id: card.id.toString(), title: card.title });
		}

		const cardConnectionMarker =
			this.editor.model.markers.get("cardconnection");

		if (this._items.length > 0) {
			this._showOrUpdateUI(cardConnectionMarker);
		} else {
			this._hideUIAndRemoveMarker();
		}

		console.log(
			"CardsConnectionPlugin._handleGetFilteredCardsResponse() ended."
		);
	}

	_showOrUpdateUI(marker) {
		console.log("CardsConnectionPlugin._showOrUpdateUI()...");

		if (this._isUIVisible) {
			// Update balloon position as the mention list view may change its size.
			this._balloon.updatePosition(
				this._getBalloonPanelPositionData(
					marker,
					this._cardConnectionView.position
				)
			);
		} else {
			this._balloon.add({
				view: this._cardConnectionView,
				position: this._getBalloonPanelPositionData(
					marker,
					this._cardConnectionView.position
				),
				withArrow: false,
				singleViewMode: true,
			});

			this._cardConnectionView.position = this._balloon.view.position;
			// this._mentionsView.selectFirst();
			console.log("CardsConnectionPlugin._showOrUpdateUI() ended.");
		}
	}

	_hideUIAndRemoveMarker() {
		if (this._balloon.hasView(this._cardConnectionView)) {
			this._balloon.remove(this._cardConnectionView);
		}

		if (isStillCompleting(this.editor)) {
			this.editor.model.change((writer) =>
				writer.removeMarker("cardconnection")
			);
		}

		this._cardConnectionView.position = undefined;
	}

	_renderItem(item) {
		const editor = this.editor;
		const selection = editor.model.document.selection;

		const buttonView = new ButtonView(editor.locale);
		buttonView.label = item.title;
		buttonView.withText = true;
		buttonView.isEnabled = true;

		buttonView.on("execute", (eventInfo) => {
			const { label } = eventInfo.source;
			editor.model.change((writer) => {
				const text = writer.createText(`${label}]]`);
				editor.model.insertContent(text, selection.focus);
				// this._hideUIAndRemoveMarker();
				writer.setSelection(writer.createPositionAfter(text));
			});
		});

		return buttonView;
	}

	_getBalloonPanelPositionData(marker, preferredPosition) {
		console.log("CardsConnectionPlugin._getBalloonPanelPositionData()...");

		const editor = this.editor;
		const editing = editor.editing;
		const domConverter = editing.view.domConverter;
		const mapper = editing.mapper;

		return {
			target: () => {
				console.log("_getBalloonPanelPositionData().target()...");
				let modelRange = marker.getRange();

				// Target the UI to the model selection range - the marker has been removed so probably the UI will not be shown anyway.
				// The logic is used by ContextualBalloon to display another panel in the same place.
				if (modelRange.start.root.rootName == "$graveyard") {
					modelRange =
						editor.model.document.selection.getFirstRange();
				}

				// editor.model.change((writer) => {
				// 	const selection = editor.model.document.selection;
				// 	const cursorPosition = selection.getFirstPosition();
				// 	writer.createPositionAfter(cursorPosition.parent);
				// });

				const viewRange = mapper.toViewRange(modelRange);
				console.log("chegou");
				const rangeRects = Rect.getDomRangeRects(
					domConverter.viewRangeToDom(viewRange)
				);

				console.log("_getBalloonPanelPositionData().target() ended.");
				return rangeRects.pop();
			},
			limiter: () => {
				console.log("_getBalloonPanelPositionData().limiter()...");
				const view = this.editor.editing.view;
				const viewDocument = view.document;
				const editableElement = viewDocument.selection.editableElement;

				if (editableElement) {
					return view.domConverter.mapViewToDom(editableElement.root);
				}

				console.log("_getBalloonPanelPositionData().limiter() ended.");
				return null;
			},
			positions: getBalloonPanelPositions(preferredPosition),
		};
	}
}

function getBalloonPanelPositions(preferredPosition) {
	console.log("getBalloonPanelPositions()...");

	const positions = {
		// Positions the panel to the southeast of the caret rectangle.
		caret_se: (targetRect) => {
			return {
				top: targetRect.bottom + VERTICAL_SPACING,
				left: targetRect.right,
				name: "caret_se",
				// config: {
				// 	withArrow: false,
				// },
			};
		},

		// Positions the panel to the northeast of the caret rectangle.
		caret_ne: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right,
				name: "caret_ne",
				// config: {
				// 	withArrow: false,
				// },
			};
		},

		// Positions the panel to the southwest of the caret rectangle.
		caret_sw: (targetRect, balloonRect) => {
			return {
				top: targetRect.bottom + VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_sw",
				// config: {
				// 	withArrow: false,
				// },
			};
		},

		// Positions the panel to the northwest of the caret rect.
		caret_nw: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_nw",
				// config: {
				// 	withArrow: false,
				// },
			};
		},
	};

	// Returns only the last position if it was matched to prevent the panel from jumping after the first match.
	if (Object.prototype.hasOwnProperty.call(positions, preferredPosition)) {
		console.log("getBalloonPanelPositions() RETURNING PREFERRED POSITION");
		return [positions[preferredPosition]];
	}

	console.log("getBalloonPanelPositions() ended.");

	// By default return all position callbacks.
	return [
		positions.caret_se,
		positions.caret_sw,
		positions.caret_ne,
		positions.caret_nw,
	];
}

export function createCardTitleRegExp() {
	const openAfterCharacters = " \\(\\{\"'.,";
	// const beggining = "[^\[]*";

	const marker = "\\[\\[";

	const cardTitle = ".*";

	// O padrão consiste em 3 grupos:
	// - 0: começo - Início da linha, espaço ou caractere de pontuação como "(" or "\", a não ser "["",
	// - 1: marcador - "[[",
	// - 2: título - Caracteres quaisquer do título do card (um já é suficiente para mostrar a UI),
	//
	// A expressão faz o match até o cursor (end of string switch - $).
	//               (0:      começo               )(1: marcador)(2:   título    )$
	const pattern = `(?:^|[${openAfterCharacters}])(${marker})(${cardTitle})$`;

	return new RegExp(pattern);
}

function createTestCallback(marker, minimumCharacters) {
	const regExp = createCardTitleRegExp(marker, minimumCharacters);
	return (text) => regExp.test(text);
}

function getCardTitleText(text) {
	const regExp = createCardTitleRegExp();
	const match = text.match(regExp);
	return match[2];
}

function getFilterCardsCallback(cardList) {
	console.log("getFilterCardsCallback()...");
	return (filterText) => {
		const filteredCards = cardList.filter(
			({ title }) =>
				title.toLowerCase().includes(filterText.toLowerCase()) &&
				!!filterText
		);
		// Do not return more than 10 items.
		// .slice(0, 10);
		return filteredCards;
	};
}

function isStillCompleting(editor) {
	return editor.model.markers.has("cardconnection");
}
