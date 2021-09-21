import Plugin from "@ckeditor/ckeditor5-core/src/plugin";

import CardConnectionCommand from "./cardsconncommand";

export default class CardsConnectionPlugin extends Plugin {
	static get pluginName() {
		return "CardsConnectionPlugin";
	}

	init() {
		// Define novos componentes para o modelo interno do CkEditor
		this._defineSchema();

		// Define políticas para as conversões entre as views de dados, edição e o modelo
		this._defineConverters();

		// Adiciona o novo commando para substituir o padrão [[*]] por um link para um card de título "*"
		this.editor.commands.add(
			"cardconnection",
			new CardConnectionCommand(this.editor)
		);

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
}
