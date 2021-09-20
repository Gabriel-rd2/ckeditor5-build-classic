import Command from "@ckeditor/ckeditor5-core/src/command";

export default class CardConnectionCommand extends Command {
	execute({ editor }) {
		const selection = editor.model.document.selection;
		const cursorPosition = selection.getFirstPosition();

		editor.model.change((writer) => {
			const rangeBefore = writer.createRange(
				writer.createPositionAt(cursorPosition.parent, 0),
				cursorPosition
			);

			let lastCurrentTextProxy = "";
			for (const value of rangeBefore) {
				if (value.item.is("textProxy")) {
					lastCurrentTextProxy = value.item;
				}
			}

			const regExp = /(\[\[)([^*]+)(\]\])/;
			let result = regExp.exec(lastCurrentTextProxy.data);

			if (result !== undefined ? result.length === 4 : false) {
				let patternToRemove = result[0];
				let possibleNewTitle = result[2];

				const foundCard = editor.config
					.get("cardconnections.cardList")
					.find((card) => card.title === possibleNewTitle);

				writer.remove(lastCurrentTextProxy);
				writer.insertText(
					lastCurrentTextProxy.data.replace(patternToRemove, ""),
					selection.focus
				);

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

				editor.model.insertContent(cardconnection, selection.focus);
				writer.setSelection(writer.createPositionAfter(cardconnection));
			}
		});
	}

	refresh() {
		this.isEnabled = true;
	}
}
