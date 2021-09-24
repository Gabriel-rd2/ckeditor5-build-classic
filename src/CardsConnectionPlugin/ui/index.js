import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import TextWatcher from "@ckeditor/ckeditor5-typing/src/textwatcher";
import Collection from "@ckeditor/ckeditor5-utils/src/collection";
import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";
import Rect from "@ckeditor/ckeditor5-utils/src/dom/rect";
import clickOutsideHandler from "@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler";

import CardConnectionView, { CardsConnectionItemView, Button } from "./view";

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
		const config = editor.config;

		config.define("cardconnections", {
			cardList: undefined,
			getFilteredCards: undefined,
		});

		this._balloon = editor.plugins.get(ContextualBalloon);

		// Close the dropdown upon clicking outside of the plugin UI.
		clickOutsideHandler({
			emitter: this._cardConnectionView,
			activator: () => this._isUIVisible,
			contextElements: [this._balloon.view.element],
			callback: () => this._hideUIAndRemoveMarkers(),
		});

		// Adiciona um TextWatcher para encontrar o padrão [[*]] no texto e disparar o comando adicionado acima
		this._setupTextWatcherForReplacingTitle();

		// const filterCardsCallback = (
		this._setupTextWatcherForMarkingModel();

		if (
			config.get("cardconnections.cardList") === undefined &&
			config.get("cardconnections.getFilteredCards") === undefined
		) {
			throw new CKEditorError(
				"cardsconnectionconfig-no-card-list-source",
				null,
				{
					config,
				}
			);
		}

		this._getCardList = (editor, cardTitle) => {
			console.log("CardsConnectionUI._getCardList()...");

			console.log(editor.config);

			let cardList = editor.config.get("cardconnections.cardList");
			if (cardList === undefined) {
				const getFilteredCards = editor.config.get(
					"cardconnections.getFilteredCards"
				);

				getFilteredCards(cardTitle)
					.then((response) => {
						this.fire("getCardList:response", {
							cardList: response,
						});
					})
					.catch((error) => {
						this.fire("requestFeed:error", { error });
					});
			}

			this.fire("getCardList:response", {
				cardList,
			});

			console.log("CardsConnectionUI._getCardList() ended.");
			return;
		};

		this.on("getCardList:response", (evt, data) =>
			this._handleGetCardListResponse(data)
		);
		this.on("getCardList:error", () => this._hideUIAndRemoveMarker());

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
		const locale = editor.locale;

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

			const start = focus.getShiftedBy(-matchedTextLength);
			const bracketsEnd = focus.getShiftedBy(-cardTitle.length);
			// Cria uma range para o marcador do padrão [[.
			const bracketsMarkerRange = editor.model.createRange(
				start,
				bracketsEnd
			);
			// Cria uma range para o padrão [[ e o pedaço do título escrito.
			const matchedTextMarkerRange = editor.model.createRange(
				start,
				focus
			);

			if (isStillCompleting(editor)) {
				const cardConnectionMarker = editor.model.markers.get(
					"cardconnection:marker"
				);
				const matchedTextMarker = editor.model.markers.get(
					"cardconnection:text"
				);
				editor.model.change((writer) => {
					writer.updateMarker(cardConnectionMarker, {
						range: bracketsMarkerRange,
					});
					writer.updateMarker(matchedTextMarker, {
						range: matchedTextMarkerRange,
					});
				});
			} else {
				editor.model.change((writer) => {
					writer.addMarker("cardconnection:marker", {
						range: bracketsMarkerRange,
						usingOperation: false,
						affectsData: false,
					});
					writer.addMarker("cardconnection:text", {
						range: matchedTextMarkerRange,
						usingOperation: false,
						affectsData: false,
					});
				});
			}

			this._getCardList(editor, cardTitle);
		});

		watcher.on("unmatched", () => {
			console.log("marking model watcher unmatched!");
			this._hideUIAndRemoveMarkers();
		});

		console.log(
			"CardsConnectionPlugin._setupTextWatcherForMarkingModel() ended."
		);
	}

	_handleGetCardListResponse(data) {
		console.log("CardsConnectionPlugin._handleGetCardListResponse()...");
		const editor = this.editor;
		const config = editor.config;

		const { cardList } = data;

		if (!isStillCompleting(editor)) return;

		config.set("cardconnections.cardList", cardList);

		this._items.clear();

		for (const card of filteredCards) {
			this._items.add({ id: card.id.toString(), title: card.title });
		}

		const cardConnectionMarker = editor.model.markers.get(
			"cardconnection:marker"
		);

		if (this._items.length > 0) {
			this._showOrUpdateUI(cardConnectionMarker);
		} else {
			this._hideUIAndRemoveMarkers();
		}

		console.log(
			"CardsConnectionPlugin._handleGetCardListResponse() ended."
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

	_hideUIAndRemoveMarkers() {
		if (this._balloon.hasView(this._cardConnectionView)) {
			this._balloon.remove(this._cardConnectionView);
		}

		if (isStillCompleting(this.editor)) {
			this.editor.model.change((writer) => {
				writer.removeMarker("cardconnection:marker");
				writer.removeMarker("cardconnection:text");
			});
		}

		this._cardConnectionView.position = undefined;
	}

	_renderItem(item) {
		const editor = this.editor;
		const selection = editor.model.document.selection;

		const buttonView = new Button(editor.locale);
		buttonView.label = item.title;
		buttonView.withText = true;
		buttonView.isEnabled = true;

		buttonView.on("execute", (eventInfo) => {
			const { label } = eventInfo.source;
			const matchedTextMarker = editor.model.markers.get(
				"cardconnection:text"
			);

			editor.model.change((writer) => {
				console.log("ButtonExcute");
				writer.remove(matchedTextMarker.getRange());
				const text = writer.createText(`[[${label}]]`);
				editor.model.insertContent(text, selection.focus);
				writer.setSelection(
					writer.createPositionAt(selection.focus, "end")
				);
			});

			editor.editing.view.focus();
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
			};
		},

		// Positions the panel to the northeast of the caret rectangle.
		caret_ne: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right,
				name: "caret_ne",
			};
		},

		// Positions the panel to the southwest of the caret rectangle.
		caret_sw: (targetRect, balloonRect) => {
			return {
				top: targetRect.bottom + VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_sw",
			};
		},

		// Positions the panel to the northwest of the caret rect.
		caret_nw: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_nw",
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

function isStillCompleting(editor) {
	return editor.model.markers.has("cardconnection:marker");
}
