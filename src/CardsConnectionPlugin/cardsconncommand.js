import Command from "@ckeditor/ckeditor5-core/src/command";

// Comando que insere conexão no texto do card
export default class CardConnectionCommand extends Command {
	execute({ editor }) {
		const selection = editor.model.document.selection;
		const cursorPosition = selection.getFirstPosition();

		editor.model.change((writer) => {
			// Faixa de conteúdo que se estende do início do corpo do card até a posição atual do cursor
			const rangeBefore = writer.createRange(
				writer.createPositionAt(cursorPosition.parent, 0),
				cursorPosition
			);

			// Lógica para selecionar a faixa de texto mais próxima do cursor
			let lastCurrentTextProxy = "";
			for (const value of rangeBefore) {
				if (value.item.is("textProxy")) {
					lastCurrentTextProxy = value.item;
				}
			}

			// Expressão regular que busca por "[[*]]"
			const regExp = /(\[\[)([^*]+)(\]\])/;
			let result = regExp.exec(lastCurrentTextProxy.data);

			// Caso existir um match completo para a expressão regular acima o tamanho do resultado retornado será quatro
			// O índice 0 terá o padrão [[Título]] e o índice 2 terá o título do card
			if (result !== undefined ? result.length === 4 : false) {
				let patternToRemove = result[0];
				let possibleNewTitle = result[2];

				// Procura o card na lista de cards da configuração, que é atualizada pelo plugin da UI
				const foundCard = editor.config
					.get("cardconnections.cardList")
					.find((card) => card.title === possibleNewTitle);

				// Remove o padrão [[Título]] inteiro da faixa de texto para inserir a conexão
				writer.remove(lastCurrentTextProxy);
				writer.insertText(
					lastCurrentTextProxy.data.replace(patternToRemove, ""),
					selection.focus
				);

				// Cria uma conexão com os dados corretos do card, ou uma conexão temporária para um card que deva ser criado
				let cardconnection;
				if (foundCard != undefined) {
					cardconnection = writer.createElement("cardconnection", {
						cardid: foundCard.id,
						cardtitle: foundCard.title,
						cardlink: foundCard.link,
					});
				} else {
					cardconnection = writer.createElement("cardconnection", {
						cardid: "-1",
						cardtitle: possibleNewTitle,
						cardlink: "",
					});
				}

				// Insere a conexão
				editor.model.insertContent(cardconnection, selection.focus);

				// Posiciona o cursor após a conexão inserida
				writer.setSelection(writer.createPositionAfter(cardconnection));
			}
		});
	}

	refresh() {
		// Mantém o comando sempre ativo
		this.isEnabled = true;
	}
}
