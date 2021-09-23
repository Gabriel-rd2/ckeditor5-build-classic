import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import TextWatcher from "@ckeditor/ckeditor5-typing/src/textwatcher";
import Collection from "@ckeditor/ckeditor5-utils/src/collection";
import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";
import ButtonView from "@ckeditor/ckeditor5-ui/src/button/buttonview";
import Rect from "@ckeditor/ckeditor5-utils/src/dom/rect";

import CardConnectionCommand from "./cardsconncommand";
import CardConnectionView, {
	CardsConnectionItemView,
	DomWrapperView,
} from "./ui/view";

const VERTICAL_SPACING = 3;

export default class CardsConnectionPlugin extends Plugin {
	static get pluginName() {
		return "CardsConnectionPlugin";
	}

	static get requires() {
		return [ContextualBalloon];
	}

	init() {
		console.log("CardsConnectionPlugin.init()...");

		const editor = this.editor;

		// Define novos componentes para o modelo interno do CkEditor
		this._defineSchema();
		// Define políticas para as conversões entre as views de dados, edição e o modelo
		this._defineConverters();

		// Adiciona o commando que substitui o padrão [[*]] por um link para um card de título "*"
		editor.commands.add(
			"cardconnection",
			new CardConnectionCommand(editor)
		);
		// Adiciona um TextWatcher para encontrar o padrão [[*]] no texto e disparar o comando adicionado acima
		this._setupTextWatcherForReplacingTitle();

		// const filterCardsCallback = (
		this._setupTextWatcherForMarkingModel();

		this._balloon = editor.plugins.get(ContextualBalloon);
		this._cardConnectionView = this._createCardConnectionView();

		this.on("getFilteredCards:response", (evt, data) =>
			this._handleGetFilteredCardsResponse(data)
		);

		console.log("CardsConnectionPlugin.init() ended.");
	}

	get _isUIVisible() {
		return this._balloon.visibleView === this._cardConnectionView;
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		// Registra o componenete "cardconnection" no esquema do modelo interno do CkEditor
		schema.register("cardconnection", {
			allowWhere: "$text",
			allowChildren: "$text",
			isInline: true,
			isContent: true,
			isSelectable: true,
			isObject: true,
			isLimit: true,
			allowAttributesOf: "$text",
			allowAttributes: ["cardtitle", "cardid", "cardlink", "carddeleted"],
		});
	}

	_defineConverters() {
		const conversion = this.editor.conversion;
		const config = this.editor.config;

		// Registro de conversão, ela será chamada sempre que uma tag a for encontrada durante a exploração da view de dados
		conversion
			.for("upcast")
			.add((dispatcher) => dispatcher.on("element:a", upcastConverter));

		// Conversão das view de dados para o modelo do CkEditor
		function upcastConverter(event, data, conversionApi) {
			const viewAnchor = data.viewItem;

			// Somente as tags a com classe cardconnection nos interessam
			if (!viewAnchor.hasClass("cardconnection")) {
				return;
			}

			const cardid = parseInt(viewAnchor.getAttribute("cardid"));
			const card = config
				.get("cardconnections.cardList")
				.find(({ id }) => id === cardid);

			// Caso contrário se o card não for encontrado só significa que é um card que não existe ainda, mas temos que adicioná-lo ao modelo de qualquer maneira
			const cardtitle =
				card !== undefined
					? card.title
					: viewAnchor.getAttribute("cardtitle");
			const cardlink =
				card !== undefined
					? card.link
					: viewAnchor.getAttribute("href");

			let modelElement;

			// Caso o card não for encontrado e cardid !== -1, a conexão é para um card que foi removido, então adicionamos uma conexão com atributo "carddeleted" ao modelo
			if (card === undefined && cardid !== -1) {
				modelElement = conversionApi.writer.createElement(
					"cardconnection",
					{
						carddeleted: true,
					}
				);
			} else {
				modelElement = conversionApi.writer.createElement(
					"cardconnection",
					{
						cardtitle,
						cardid,
						cardlink,
					}
				);
			}

			// Tentamos adicionar o elemento ao modelo, na posição do cursor do modelo, no caso de erro retornamos
			if (!conversionApi.safeInsert(modelElement, data.modelCursor))
				return;

			// Marcamos que já tratamos o elemento a que estamos vendo atualmente e atualizamos o resultado da conversão
			conversionApi.consumable.consume(viewAnchor, { name: true });
			conversionApi.updateConversionResult(modelElement, data);
		}

		// Registro de conversões, elas serão chamadas sempre que uma conexão for inserida ao modelo
		conversion
			.for("editingDowncast")
			.add((dispatcher) =>
				dispatcher.on(
					"insert:cardconnection",
					downcastConverter("editing")
				)
			);

		conversion
			.for("dataDowncast")
			.add((dispatcher) =>
				dispatcher.on(
					"insert:cardconnection",
					downcastConverter("data")
				)
			);

		// Conversão do modelo para as view de edição
		function downcastConverter(pipeline) {
			return (event, data, conversionApi) => {
				const viewElement = createViewElement(
					data,
					conversionApi,
					pipeline
				);
				insertViewElement(data, conversionApi, viewElement);
			};
		}

		// Cria os elementos das views
		function createViewElement(data, conversionApi, pipeline) {
			const modelItem = data.item;

			const carddeleted = modelItem.getAttribute("carddeleted");
			const cardid = parseInt(modelItem.getAttribute("cardid"));
			const cardtitle = modelItem.getAttribute("cardtitle");
			const cardlink = modelItem.getAttribute("cardlink");

			const card = config
				.get("cardconnections.cardList")
				.find((card) => card.id === cardid);

			let viewElement;

			if (carddeleted === undefined) {
				viewElement = conversionApi.writer.createRawElement(
					"a",
					{
						class: "cardconnection",
						cardid,
						cardtitle: card !== undefined ? card.title : cardtitle,
						href: card !== undefined ? card.link : cardlink,
						target: "_blank",
						rel: "noopener",
					},
					function (domElement) {
						const innerText =
							card !== undefined
								? card.title
								: pipeline === "editing"
								? `🆕 ${cardtitle}`
								: cardtitle;

						domElement.innerHTML =
							pipeline === "editing"
								? `<span><img src="/logos/duuca_logo.svg" width="15px" style="margin:-2px 0px 0px" alt="Duuca" /> ${innerText}</span>`
								: innerText;

						return domElement;
					}
				);
			} else {
				viewElement = conversionApi.writer.createRawElement(
					"a",
					{
						class: "cardconnection",
						carddeleted: true,
						href: "javascript:void(0)",
					},
					function (domElement) {
						const innerText = config.get(
							"cardconnections.cardDeletedMessage"
						);

						domElement.innerHTML =
							pipeline === "editing"
								? `<span><img src="/logos/duuca_logo.svg" width="15px" style="margin:-2px 0px 0px" alt="Duuca" /> ${innerText}</span>`
								: innerText;

						return domElement;
					}
				);
			}

			return viewElement;
		}

		function insertViewElement(data, conversionApi, viewElement) {
			conversionApi.consumable.consume(data.item, "insert");

			conversionApi.mapper.bindElements(data.item, viewElement);

			conversionApi.writer.insert(
				conversionApi.mapper.toViewPosition(data.range.start),
				viewElement
			);

			conversionApi.writer.setSelection(viewElement, "after");
		}
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
				const text = writer.createText(`[[${label}]]`);
				editor.model.insertContent(text, selection.focus);
				this._hideUI();
				writer.setSelection(writer.createPositionAfter(text));
			});
		});

		return buttonView;
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

				const viewRange = mapper.toViewRange(modelRange);
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

	destroy() {
		super.destroy();
		this._cardConnectionView.destroy();
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
				config: {
					withArrow: false,
				},
			};
		},

		// Positions the panel to the northeast of the caret rectangle.
		caret_ne: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right,
				name: "caret_ne",
				config: {
					withArrow: false,
				},
			};
		},

		// Positions the panel to the southwest of the caret rectangle.
		caret_sw: (targetRect, balloonRect) => {
			return {
				top: targetRect.bottom + VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_sw",
				config: {
					withArrow: false,
				},
			};
		},

		// Positions the panel to the northwest of the caret rect.
		caret_nw: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_nw",
				config: {
					withArrow: false,
				},
			};
		},
	};

	// Returns only the last position if it was matched to prevent the panel from jumping after the first match.
	if (Object.prototype.hasOwnProperty.call(positions, preferredPosition)) {
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
function getFilterCardsCallback(cardList) {
	console.log("getFilterCardsCallback()...");
	return (filterText) => {
		const filteredCards = cardList.filter(({ title }) =>
			title.toLowerCase().includes(filterText.toLowerCase())
		);
		// Do not return more than 10 items.
		// .slice(0, 10);
		return filteredCards;
	};
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
	return editor.model.markers.has("cardconnection");
}
