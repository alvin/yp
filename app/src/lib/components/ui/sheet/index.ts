// The side drawer: the dialog's primitive and its header, title, description
// and footer, so a form reads the same in a drawer as in a dialog.
import { Dialog as SheetPrimitive } from 'bits-ui';

import Content from './sheet-content.svelte';
import Title from '../dialog/dialog-title.svelte';
import Footer from '../dialog/dialog-footer.svelte';
import Header from '../dialog/dialog-header.svelte';
import Description from '../dialog/dialog-description.svelte';

const Root = SheetPrimitive.Root;

export {
	Root,
	Content,
	Title,
	Footer,
	Header,
	Description,
	//
	Root as Sheet,
	Content as SheetContent,
	Title as SheetTitle,
	Footer as SheetFooter,
	Header as SheetHeader,
	Description as SheetDescription
};
