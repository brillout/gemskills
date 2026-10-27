import { fresh, listView } from "../../list.ts";

/** Top: the skills list, unfiltered; ../../list-client.ts applies the filters in the URL. */
export default () => listView(fresh("top"));
