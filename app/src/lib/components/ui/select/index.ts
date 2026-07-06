import { Select as SelectPrimitive } from "bits-ui";

import Trigger from "./select-trigger.svelte";
import Content from "./select-content.svelte";
import Item from "./select-item.svelte";
import GroupHeading from "./select-label.svelte";
import ScrollDownButton from "./select-scroll-down-button.svelte";
import ScrollUpButton from "./select-scroll-up-button.svelte";

const Root = SelectPrimitive.Root;
const Group = SelectPrimitive.Group;

export {
  Root,
  Group,
  Trigger,
  Content,
  Item,
  GroupHeading,
  ScrollDownButton,
  ScrollUpButton,
  //
  Root as Select,
  Group as SelectGroup,
  Trigger as SelectTrigger,
  Content as SelectContent,
  Item as SelectItem,
  GroupHeading as SelectGroupHeading,
  ScrollDownButton as SelectScrollDownButton,
  ScrollUpButton as SelectScrollUpButton,
};
