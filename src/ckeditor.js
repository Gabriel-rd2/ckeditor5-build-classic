/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

// The editor creator to use.
import InlineEditorBase from "@ckeditor/ckeditor5-editor-inline/src/inlineeditor";
import BalloonEditorBase from "@ckeditor/ckeditor5-editor-balloon/src/ballooneditor";

import CKEditorInspector from "@ckeditor/ckeditor5-inspector";

import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials";
import UploadAdapter from "@ckeditor/ckeditor5-adapter-ckfinder/src/uploadadapter";
import Autoformat from "@ckeditor/ckeditor5-autoformat/src/autoformat";
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold";
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic";
import BlockQuote from "@ckeditor/ckeditor5-block-quote/src/blockquote";
import CKFinder from "@ckeditor/ckeditor5-ckfinder/src/ckfinder";
import EasyImage from "@ckeditor/ckeditor5-easy-image/src/easyimage";
import Heading from "@ckeditor/ckeditor5-heading/src/heading";
import Image from "@ckeditor/ckeditor5-image/src/image";
import ImageCaption from "@ckeditor/ckeditor5-image/src/imagecaption";
import ImageStyle from "@ckeditor/ckeditor5-image/src/imagestyle";
import ImageToolbar from "@ckeditor/ckeditor5-image/src/imagetoolbar";
import ImageUpload from "@ckeditor/ckeditor5-image/src/imageupload";
import Indent from "@ckeditor/ckeditor5-indent/src/indent";
import Link from "@ckeditor/ckeditor5-link/src/link";
import AutoLink from "@ckeditor/ckeditor5-link/src/autolink";
import List from "@ckeditor/ckeditor5-list/src/list";
import MediaEmbed from "@ckeditor/ckeditor5-media-embed/src/mediaembed";
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph";
import PasteFromOffice from "@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice";
import Table from "@ckeditor/ckeditor5-table/src/table";
import TableToolbar from "@ckeditor/ckeditor5-table/src/tabletoolbar";
import TextTransformation from "@ckeditor/ckeditor5-typing/src/texttransformation";
import Font from "@ckeditor/ckeditor5-font/src/font";
import Alignment from "@ckeditor/ckeditor5-alignment/src/alignment";
import HorizontalLine from "@ckeditor/ckeditor5-horizontal-line/src/horizontalline";
import Mention from "@ckeditor/ckeditor5-mention/src/mention";
import BlockToolbar from "@ckeditor/ckeditor5-ui/src/toolbar/block/blocktoolbar";
import HeadingButtonsUI from "@ckeditor/ckeditor5-heading/src/headingbuttonsui";
import ParagraphButtonUI from "@ckeditor/ckeditor5-paragraph/src/paragraphbuttonui";
import CardsConnectionPlugin from "./CardsConnectionPlugin";

class InlineEditor extends InlineEditorBase {}
class BalloonEditor extends BalloonEditorBase {}

const plugins = [
	Essentials,
	UploadAdapter,
	Autoformat,
	Bold,
	Italic,
	BlockQuote,
	CKFinder,
	EasyImage,
	Heading,
	Image,
	ImageCaption,
	ImageStyle,
	ImageToolbar,
	ImageUpload,
	Indent,
	Link,
	List,
	MediaEmbed,
	Paragraph,
	PasteFromOffice,
	Table,
	TableToolbar,
	TextTransformation,
	Alignment,
	Font,
	HorizontalLine,
	AutoLink,
	Mention,
	CardsConnectionPlugin,
];

const config = {
	toolbar: {
		items: [
			"heading",
			"|",
			"bold",
			"italic",
			"link",
			"bulletedList",
			"numberedList",
			"|",
			"fontSize",
			"fontFamily",
			"fontColor",
			"fontBackgroundColor",
			"|",
			"alignment",
			"horizontalLine",
			"indent",
			"outdent",
			"|",
			"imageUpload",
			"blockQuote",
			"insertTable",
			"mediaEmbed",
			"undo",
			"redo",
		],
	},
	image: {
		toolbar: [
			"imageStyle:full",
			"imageStyle:side",
			"|",
			"imageTextAlternative",
		],
	},
	table: {
		contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
	},
	fontColor: {
		colors: [
			{
				color: "hsl(0, 0%, 0%)",
				label: "Black",
			},
			{
				color: "hsl(0, 0%, 30%)",
				label: "Dim grey",
			},
			{
				color: "hsl(0, 0%, 60%)",
				label: "Grey",
			},
			{
				color: "hsl(0, 0%, 90%)",
				label: "Light grey",
			},
			{
				color: "hsl(0, 0%, 100%)",
				label: "White",
				hasBorder: true,
			},
			{
				color: "hsl(0, 100%, 68%)",
				label: "Red",
			},
			{
				color: "hsl(22, 100%, 51%)",
				label: "Orange",
			},
			{
				color: "hsl(41, 98%, 68%)",
				label: "Yellow",
			},
			{
				color: "hsl(133, 90%, 76%)",
				label: "Light green",
			},
			{
				color: "hsl(139, 74%, 51%)",
				label: "Green",
			},
			{
				color: "hsl(163, 61%, 57%)",
				label: "Aquamarine",
			},
			{
				color: "hsl(180, 75%, 60%)",
				label: "Turquoise",
			},
			{
				color: "hsl(210, 86%, 83%)",
				label: "Light blue",
			},
			{
				color: "hsl(210, 76%, 56%)",
				label: "Blue",
			},
			{
				color: "hsl(252, 100%, 69%)",
				label: "Purple",
			},
		],
	},
	fontBackgroundColor: {
		colors: [
			{
				color: "hsl(0, 0%, 0%)",
				label: "Black",
			},
			{
				color: "hsl(0, 0%, 30%)",
				label: "Dim grey",
			},
			{
				color: "hsl(0, 0%, 60%)",
				label: "Grey",
			},
			{
				color: "hsl(0, 0%, 90%)",
				label: "Light grey",
			},
			{
				color: "hsl(0, 0%, 100%)",
				label: "White",
				hasBorder: true,
			},
			{
				color: "hsl(0, 100%, 68%)",
				label: "Red",
			},
			{
				color: "hsl(22, 100%, 51%)",
				label: "Orange",
			},
			{
				color: "hsl(41, 98%, 68%)",
				label: "Yellow",
			},
			{
				color: "hsl(133, 90%, 76%)",
				label: "Light green",
			},
			{
				color: "hsl(139, 74%, 51%)",
				label: "Green",
			},
			{
				color: "hsl(163, 61%, 57%)",
				label: "Aquamarine",
			},
			{
				color: "hsl(180, 75%, 60%)",
				label: "Turquoise",
			},
			{
				color: "hsl(210, 86%, 83%)",
				label: "Light blue",
			},
			{
				color: "hsl(210, 76%, 56%)",
				label: "Blue",
			},
			{
				color: "hsl(252, 100%, 69%)",
				label: "Purple",
			},
		],
	},
	language: "pt-br",
};

// Plugins to include in the build.
InlineEditor.builtinPlugins = plugins;
BalloonEditor.builtinPlugins = [
	...plugins,
	BlockToolbar,
	HeadingButtonsUI,
	ParagraphButtonUI,
];

// Editor configuration.
InlineEditor.defaultConfig = config;
BalloonEditor.defaultConfig = {
	...config,
	toolbar: [
		"heading",
		"|",
		"bold",
		"italic",
		"link",
		"alignment",
		"|",
		"fontColor",
		"fontBackgroundColor",
		"|",
		"undo",
		"redo",
	],
	blockToolbar: {
		items: [
			"paragraph",
			"heading1",
			"heading2",
			"heading3",
			"|",
			"bulletedList",
			"numberedList",
			"|",
			"imageUpload",
			"blockQuote",
			"insertTable",
			"mediaEmbed",
			"|",
			"undo",
			"redo",
		],
	},
};

CKEditorInspector.attach("inline-editor", InlineEditor);
CKEditorInspector.attach("baloon-editor", BalloonEditor);

export default { InlineEditor, BalloonEditor };
