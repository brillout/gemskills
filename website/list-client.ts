/** The skills list's filters, for each of its pages (Top, Hot, New): re-render the list whenever they change, and keep them in the URL. */

import {
  facetsHtml,
  parse,
  query,
  resultsHtml,
  toggleTag,
  type Sort,
  type State,
  type View,
} from "./list.ts";

const app = document.getElementById("app") as HTMLElement;
const q = document.getElementById("q") as HTMLInputElement;
const view = (document.querySelector<HTMLElement>(".skills-view")?.dataset.view ?? "top") as View;
let state = parse(location.search, view);
let stackExpanded = false;

function go(patch: Partial<State>) {
  state = { ...state, ...patch };
  history.replaceState(null, "", query(state) || location.pathname);
  render();
}
const toggled = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Re-rendering replaces the buttons; put focus back on the one that was used. */
function focusSelector(): string | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el.id === "q" || !app.contains(el)) return null;
  for (const attr of ["data-tag", "data-registry", "data-action", "data-remove"]) {
    const v = el.getAttribute(attr);
    if (v !== null)
      return `#${el.closest("#facets") ? "facets" : "results"} [${attr}="${CSS.escape(v)}"]`;
  }
  return el.id ? `#${CSS.escape(el.id)}` : null;
}

function render() {
  const focus = focusSelector();
  if (q.value !== state.q) q.value = state.q;
  (document.getElementById("facets") as HTMLElement).innerHTML = facetsHtml(state, stackExpanded);
  (document.getElementById("results") as HTMLElement).innerHTML = resultsHtml(state);
  if (focus) (document.querySelector(focus) as HTMLElement | null)?.focus({ preventScroll: true });
}

q.addEventListener("input", () => go({ q: q.value }));

app.addEventListener("click", (event) => {
  const el = (event.target as Element).closest<HTMLElement>(
    "[data-tag],[data-registry],[data-action],[data-remove]",
  );
  if (!el || el.tagName === "A") return;
  const d = el.dataset;
  if (d.tag) go({ tags: toggleTag(state.tags, d.tag) });
  else if (d.registry) go({ registries: toggled(state.registries, d.registry) });
  else if (d.remove) {
    const v = d.value ?? "";
    if (d.remove === "q") go({ q: "" });
    else if (d.remove === "tag") go({ tags: state.tags.filter((t) => t !== v) });
    else if (d.remove === "registry") go({ registries: state.registries.filter((r) => r !== v) });
    else if (d.remove === "repo") go({ repo: null });
  } else if (d.action === "clear")
    go({ q: "", tags: [], registries: [], repo: null, hide: false, all: false });
  else if (d.action === "stack") {
    stackExpanded = !stackExpanded;
    render();
  } else if (d.action === "filters") document.getElementById("filters")?.classList.toggle("shown");
});

app.addEventListener("change", (event) => {
  const el = event.target as HTMLInputElement | HTMLSelectElement;
  if (el.id === "sort") go({ sort: el.value as Sort });
  else if (el.id === "one") go({ one: (el as HTMLInputElement).checked });
  else if (el.id === "hide") go({ hide: (el as HTMLInputElement).checked });
  else if (el.id === "all") go({ all: (el as HTMLInputElement).checked });
});

// The page was pre-rendered unfiltered.
if (location.search) render();
