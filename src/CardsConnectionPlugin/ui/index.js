import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import TextWatcher from "@ckeditor/ckeditor5-typing/src/textwatcher";
import Collection from "@ckeditor/ckeditor5-utils/src/collection";
import ContextualBalloon from "@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon";
import Rect from "@ckeditor/ckeditor5-utils/src/dom/rect";
import clickOutsideHandler from "@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler";

import CardConnectionView, { CardsConnectionItemView, Button } from "./view";

const VERTICAL_SPACING = 3;

/**
 * Plugin que controla a UI que mostra a lista de cards para serem criadas as conexões
 *
 * @export
 * @class CardsConnectionUI
 * @extends {Plugin}
 */
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

		// Define o campo cardconnections nas configurações do editor
		config.define("cardconnections", {
			cardList: undefined,
			getFilteredCards: undefined,
		});
		// Copia o campo cardconnections para uma variável interna do plugin, isso evita erros ao copiar funções da configuração
		this._cardconnectionsConfig = this.editor.config.get("cardconnections");

		// Define uma variável com o balão que conterá a view com a lista de cards
		this._balloon = editor.plugins.get(ContextualBalloon);

		// Registra uma função para tratar cliques fora do balaão da UI
		// A callback registrada fecha o balão e remove o marcador adicionado ao texto
		clickOutsideHandler({
			emitter: this._cardConnectionView,
			activator: () => this._isUIVisible,
			contextElements: [this._balloon.view.element],
			callback: () => this._hideUIAndRemoveMarkers(),
		});

		// Adição de sentinelas para executar ações quando os padrões "[[*" e "[[*]]" forem encontrados no texto
		this._setupTextWatcherForMarkingModel();
		this._setupTextWatcherForReplacingTitle();

		// Testa se a configuração possui uma lista de cards ou uma função para se conseguir uma, em caso negativo um erro é disparado
		if (
			this._cardconnectionsConfig.cardList === undefined &&
			this._cardconnectionsConfig.getFilteredCards === undefined
		) {
			throw new CKEditorError(
				"cardsconnectionconfig-no-card-list-source",
				null,
				{ config }
			);
		}

		// Define uma função asíncrona para a requisição da lista de cards
		this._getCardList = async (cardTitle) => {
			console.log("CardsConnectionUI._getCardList()...");

			// Se o título estiver vazio a resposta da função é uma lista vazia
			if (cardTitle === "") {
				this.fire("CardsConnectionUI.getCardList:response", {
					cardList: [],
				});
				return;
			}

			// Se a configuração não possuir uma lista fixa, a função passada na configuração é chamada e aguardada
			if (this._cardconnectionsConfig.cardList === undefined) {
				try {
					const response =
						await this._cardconnectionsConfig.getFilteredCards(
							cardTitle
						);

					// Em caso de sucesso a resposta da requisição é passada nos dados do evento de resposta da função
					this.fire("CardsConnectionUI.getCardList:response", {
						cardList: response,
					});
				} catch (error) {
					// Em caso de erro é disparado um evento de erro
					this.fire("CardsConnectionUI.getCardList:error", { error });
				}
			} else {
				// Caso a configuração possuir uma lista fixa ela é enviada no evento de resposta
				this.fire("CardsConnectionUI.getCardList:response", {
					cardList: this._cardconnectionsConfig.cardList,
				});
			}

			console.log("CardsConnectionUI._getCardList() ended.");
			return;
		};

		// Registra-se callbacks para os eventos de resposta e erro da função que retorna a lista de cards
		// Em caso de sucesso a lista de cards retornada é tratada
		this.on("CardsConnectionUI.getCardList:response", (evt, data) =>
			this._handleGetCardListResponse(data)
		);

		// No caso de erro o balão da UI é fechado
		this.on("CardsConnectionUI.getCardList:error", () =>
			this._hideUIAndRemoveMarker()
		);

		console.log("CardsConnectionUI.init() ended.");
	}

	destroy() {
		super.destroy();
		// Necessário pois a view de UI não é destruída automaticamente
		this._cardConnectionView.destroy();
	}

	/**
	 * Retorna se a UI está visivel no momento
	 *
	 * @readonly
	 * @memberof CardsConnectionUI
	 */
	get _isUIVisible() {
		return this._balloon.visibleView === this._cardConnectionView;
	}

	/**
	 * Instancia a view de UI do ckeditor que conterá a lista de cards.
	 *
	 * @return {CardConnectionView} Uma instância da view de conexões dos cards.
	 * @memberof CardsConnectionUI
	 */
	_createCardConnectionView() {
		console.log("CardsConnectionPlugin._createCardConnectionView()...");
		const editor = this.editor;
		const locale = editor.locale;

		const cardConnectionView = new CardConnectionView(locale);

		this._items = new Collection();

		// Ao ligar a lista de itens da view com uma lista de itens interna sempre que a lista interna for atualizada isso desencadeará uma atualização na lista da view
		cardConnectionView.items.bindTo(this._items).using((card) => {
			// Instancia botão que dispara o CardConnectionCommand ao ser clicado
			const listItemView = new CardsConnectionItemView(locale);
			const view = this._renderItem(card);

			// Adiciona botão ao item da lista de cards
			listItemView.children.add(view);
			listItemView.item = card;

			return listItemView;
		});

		console.log("CardsConnectionPlugin._createCardConnectionView() ended.");

		return cardConnectionView;
	}

	/**
	 * Adiciona um sentinela que busca pelo padrão "[[*" no texto para abrir o balão da UI e disparar uma requisição para o backend com o título parcial digitado.
	 *
	 * @memberof CardsConnectionUI
	 */
	_setupTextWatcherForMarkingModel() {
		console.log(
			"CardsConnectionPlugin._setupTextWatcherForMarkingModel()..."
		);
		const editor = this.editor;

		const titleRegExp = createCardTitleRegExp();
		const watcher = new TextWatcher(editor.model, (text) =>
			titleRegExp.test(text)
		);

		// Registra callback para quando o padrão for encontrado no texto
		watcher.on("matched", (evt, data) => {
			const selection = editor.model.document.selection;
			const focus = selection.focus;

			const cardTitle = getCardTitleText(data.text);
			const matchedTextLength = "[[".length + cardTitle.length;

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
				// Se o usuário ainda estiver escrevendo o título os marcadores são atualizados
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
				// Caso contrário, marcadores novos são criados
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

			this._getCardList(cardTitle);
		});

		// Registra callback para ser disparada quando o padrão for deletado do texto
		watcher.on("unmatched", () => {
			this._hideUIAndRemoveMarkers();
		});

		console.log(
			"CardsConnectionPlugin._setupTextWatcherForMarkingModel() ended."
		);
	}

	/**
	 * Adiciona um sentinela que busca pelo padrão "[[*]]"" no texto do editor e dispara o CardConnectionCommand.
	 *
	 * @memberof CardsConnectionUI
	 */
	_setupTextWatcherForReplacingTitle() {
		const editor = this.editor;

		const watcher = new TextWatcher(editor.model, (text) =>
			/(\[\[)([^*]+)(\]\])/.test(text)
		);

		// Quando o sentinela encontrar o padrão no texto, o comando é executado
		watcher.on("matched", () =>
			editor.execute("cardconnection", { editor })
		);
	}

	/**
	 * Adiciona os itens da lista de cards passado como resposta com o evento CardsConnectionUI.getCardList:response à lista em de cards interna da view.
	 *
	 * @param {Array} data: Lista de cards.
	 * @memberof CardsConnectionUI
	 */
	_handleGetCardListResponse(data) {
		console.log("CardsConnectionPlugin._handleGetCardListResponse()...");
		const editor = this.editor;
		const config = editor.config;

		const { cardList } = data;

		// A resposta é tratada apenas se o usuário ainda estiver escrevendo o título do card
		if (isStillCompleting(editor)) {
			config.set("cardconnections.cardList", cardList);

			this._items.clear();

			for (const card of cardList) {
				this._items.add({ id: card.id.toString(), title: card.title });
			}

			const cardConnectionMarker = editor.model.markers.get(
				"cardconnection:marker"
			);

			// Se a lista de cards não estiver vazia a UI e mostrada, se não ela é escondida
			if (this._items.length > 0) {
				this._showOrUpdateUI(cardConnectionMarker);
			} else {
				this._hideUIAndRemoveMarkers();
			}
		}

		console.log(
			"CardsConnectionPlugin._handleGetCardListResponse() ended."
		);
	}

	/**
	 * Torna a lista de cards visível.
	 *
	 * @param {*} marker: Instância de um marcador usada para posicionar o balão da UI.
	 * @memberof CardsConnectionUI
	 */
	_showOrUpdateUI(marker) {
		console.log("CardsConnectionPlugin._showOrUpdateUI()...");

		if (this._isUIVisible) {
			// Se a view estiver visícel já, o balão é atualizado.
			this._balloon.updatePosition(
				this._getBalloonPanelPositionData(
					marker,
					this._cardConnectionView.position
				)
			);
		} else {
			// Senão a view é adicionada ao balão.
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

	/**
	 * Remove a view de conexões do balão ds UI e deleta os marcadores existentes no texto.
	 *
	 * @memberof CardsConnectionUI
	 */
	_hideUIAndRemoveMarkers() {
		if (this._balloon.hasView(this._cardConnectionView)) {
			this._balloon.remove(this._cardConnectionView);
		}

		// Testa se o usuário estava escrevendo o título ainda para não ocorrer erro de marcadores inexistentes
		if (isStillCompleting(this.editor)) {
			this.editor.model.change((writer) => {
				writer.removeMarker("cardconnection:marker");
				writer.removeMarker("cardconnection:text");
			});
		}

		this._cardConnectionView.position = undefined;
	}

	/**
	 * Cria uma view de Botão com o título do card
	 *
	 * @param {*} card: Objeto com infformações do card.
	 * @return {Button} Uma instância de um Botão.
	 * @memberof CardsConnectionUI
	 */
	_renderItem(card) {
		const editor = this.editor;
		const selection = editor.model.document.selection;

		const buttonView = new Button(editor.locale);
		buttonView.label = card.title;
		buttonView.withText = true;
		buttonView.isEnabled = true;

		// Quando o botão é clicado o título parcial escrito é emovido do texto e o padrão de texto da conexão completo é adicionado, para que seja detectado pelo sentinela do padrão [[*]] e o CardConnectionCommand disparado.
		buttonView.on("execute", (eventInfo) => {
			const { label } = eventInfo.source;
			const matchedTextMarker = editor.model.markers.get(
				"cardconnection:text"
			);

			editor.model.change((writer) => {
				writer.remove(matchedTextMarker.getRange());
				const text = writer.createText(`[[${label}]]`);
				editor.model.insertContent(text, selection.focus);
				writer.setSelection(
					writer.createPositionAt(selection.focus, "end")
				);
			});

			// Retorna o foco para a view de edição, para que o usuário possa continuar escrevendo
			editor.editing.view.focus();
		});

		return buttonView;
	}

	// Função para renderização do balão da UI, retirada do código do plugin mention
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
}

// Função para renderização do balão da UI, retirada do código do plugin mention
function getBalloonPanelPositions(preferredPosition) {
	console.log("getBalloonPanelPositions()...");

	const positions = {
		caret_se: (targetRect) => {
			return {
				top: targetRect.bottom + VERTICAL_SPACING,
				left: targetRect.right,
				name: "caret_se",
			};
		},

		caret_ne: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right,
				name: "caret_ne",
			};
		},

		caret_sw: (targetRect, balloonRect) => {
			return {
				top: targetRect.bottom + VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_sw",
			};
		},

		caret_nw: (targetRect, balloonRect) => {
			return {
				top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
				left: targetRect.right - balloonRect.width,
				name: "caret_nw",
			};
		},
	};

	if (Object.prototype.hasOwnProperty.call(positions, preferredPosition)) {
		console.log("getBalloonPanelPositions() RETURNING PREFERRED POSITION");
		return [positions[preferredPosition]];
	}

	console.log("getBalloonPanelPositions() ended.");

	return [
		positions.caret_se,
		positions.caret_sw,
		positions.caret_ne,
		positions.caret_nw,
	];
}

/**
 * Cria expressão regular que captura o padrão padrão "[[" e o título após ele.
 * O padrão consiste em 3 grupos:
 * 		- 0: O começo - Início da linha, espaço ou caractere de pontuação como "(" or "\", a não ser "["".
 * 		- 1: O marcador - "[[".
 * 		- 2: O título - Caracteres quaisquer do título do card (um já é suficiente para mostrar a UI).
 *
 * @export
 * @return {RegExp} Uma instância de RegExp para o padrão.
 */
export function createCardTitleRegExp() {
	const openAfterCharacters = " \\(\\{\"'.,";

	const marker = "\\[\\[";

	const cardTitle = ".*";

	// A expressão faz o match até o cursor (end of string switch - $).
	//               (0:      começo               )(1: marcador)(2:   título    )$
	const pattern = `(?:^|[${openAfterCharacters}])(${marker})(${cardTitle})$`;

	return new RegExp(pattern);
}

/**
 * Cria a expressão regular para encontrar o título do card na conexão que está sendo criada e faz um match dela com o texto passado como parâmetro
 *
 * @param {string} text: Uma porção de texto do editor.
 * @return {string} O título do card encontrado após o padrão "[[".
 */
function getCardTitleText(text) {
	const regExp = createCardTitleRegExp();
	const match = text.match(regExp);
	return match[2];
}

/**
 * Testa se existem os marcadores de conexão de card no modelo do ckeditor.
 *
 * @param {*} editor: Instância do editor.
 * @return {boolean} True se os marcadores existem e False caso contrário.
 */
function isStillCompleting(editor) {
	return (
		editor.model.markers.has("cardconnection:marker") &&
		editor.model.markers.has("cardconnection:text")
	);
}
