import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import TextWatcher from "@ckeditor/ckeditor5-typing/src/textwatcher";
import Collection from "@ckeditor/ckeditor5-utils/src/collection";
import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";

import CardConnectionCommand from "./cardsconncommand";
import CardConnectionView, { CardsConnectionItemView } from "./ui/view";

const VERTICAL_SPACING = 3;

export default class CardsConnectionPlugin extends Plugin {
	static get pluginName() {
		return "CardsConnectionPlugin";
	}

	static get requires() {
		return [ContextualBalloon];
	}

	init() {
		// Define novos componentes para o modelo interno do CkEditor
		this._defineSchema();
		// Define políticas para as conversões entre as views de dados, edição e o modelo
		this._defineConverters();

		// Adiciona o commando que substitui o padrão [[*]] por um link para um card de título "*"
		this.editor.commands.add(
			"cardconnection",
			new CardConnectionCommand(this.editor)
		);
		// Adiciona um TextWatcher para encontrar o padrão [[*]] no texto e disparar o comando adicionado acima
		this._setupTextWatcherForTitle();

		this._balloon = editor.plugins.get(ContextualBalloon);
		this._cardConnectionView = this._createCardConnectionView();
		// this._showUI();

		console.log("CardsConnectionPlugin in custom build was initialized");
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

	_setupTextWatcherForTitle() {
		const editor = this.editor;

		const watcher = new TextWatcher(editor.model, (text) =>
			/(\[\[)([^*]+)(\]\])/.test(text)
		);

		watcher.on("matched", () =>
			editor.execute("cardconnection", { editor })
		);
	}

	_createCardConnectionView() {
		console.log("Creating CardConnectionView...");

		const locale = this.editor.locale;

		const cardConnectionView = new CardConnectionView(locale);

		this._items = new Collection();

		cardConnectionView.items.bindTo(this._items).using((data) => {
			console.log(data);
			// const { item, marker } = data;
			// const listItemView = new CardsConnectionItemView(locale);
			// const view = this._renderItem(item, marker);
			// view.delegate("execute").to(listItemView);
			// listItemView.children.add(view);
			// listItemView.item = item;
			// listItemView.marker = marker;
			// listItemView.on("execute", () => {
			// 	mentionsView.fire("execute", {
			// 		item,
			// 		marker,
			// 	});
			// });
			// return listItemView;
		});

		// mentionsView.on("execute", (evt, data) => {
		// 	const editor = this.editor;
		// 	const model = editor.model;

		// 	const item = data.item;
		// 	const marker = data.marker;

		// 	const mentionMarker = editor.model.markers.get("mention");

		// 	// Create a range on matched text.
		// 	const end = model.createPositionAt(model.document.selection.focus);
		// 	const start = model.createPositionAt(mentionMarker.getStart());
		// 	const range = model.createRange(start, end);

		// 	this._hideUIAndRemoveMarker();

		// 	editor.execute("mention", {
		// 		mention: item,
		// 		text: item.text,
		// 		marker,
		// 		range,
		// 	});

		// 	editor.editing.view.focus();
		// });

		return cardConnectionView;
	}

	_showUI() {
		this._balloon.add({
			view: this._cardConnectionView,
			position: this._getBalloonPanelPositionData(
				this._mentionsView.position
			),
			withArrow: false,
			singleViewMode: true,
		});

		this._mentionsView.position = this._balloon.view.position;
		// this._mentionsView.selectFirst();
	}

	_getBalloonPanelPositionData(preferredPosition) {
		const editor = this.editor;
		const editing = editor.editing;
		const domConverter = editing.view.domConverter;
		const mapper = editing.mapper;

		return {
			target: () => {
				let modelRange =
					editor.model.document.selection.getFirstRange();

				const viewRange = mapper.toViewRange(modelRange);
				const rangeRects = Rect.getDomRangeRects(
					domConverter.viewRangeToDom(viewRange)
				);

				return rangeRects.pop();
			},
			limiter: () => {
				const view = this.editor.editing.view;
				const viewDocument = view.document;
				const editableElement = viewDocument.selection.editableElement;

				if (editableElement) {
					return view.domConverter.mapViewToDom(editableElement.root);
				}

				return null;
			},
			positions: getBalloonPanelPositions(preferredPosition),
		};
	}

	getBalloonPanelPositions(preferredPosition) {
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
		if (positions.hasOwnProperty(preferredPosition)) {
			return [positions[preferredPosition]];
		}

		// By default return all position callbacks.
		return [
			positions.caret_se,
			positions.caret_sw,
			positions.caret_ne,
			positions.caret_nw,
		];
	}

	destroy() {
		super.destroy();
		this._cardConnectionView.destroy();
	}
}
