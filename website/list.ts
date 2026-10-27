/**
 * The skills list: its filters, which live in the URL query so every filtered list can be shared
 * as a link, and its HTML. The page is pre-rendered unfiltered; its client script re-renders it.
 */

import { compact, date, esc, href, plural } from "./format.ts";
import {
  CAUTION,
  DOWNLOADS,
  FACET_ORDER,
  REGISTRIES,
  bundleHref,
  bundleOf,
  data,
  facetById,
  facetOf,
  firstSeenOf,
  allTimeOf,
  includedBy,
  glanceHtml,
  installsOf,
  isBundle,
  ownEntry,
  parentsOf,
  registriesOf,
  repoById,
  repoKey,
  skillById,
  skillHref,
  skillsOf,
  starsOf,
  tagChip,
  tagInfo,
  tagLabel,
  tagOf,
  tagsOf,
  weekOf,
} from "./skills.ts";
import { skipped, type Bundle, type Registry, type Skill } from "./types.ts";

/** A row of the skills list: a skill, or a bundle with its skills inside. */
type Entry = Skill | Bundle;

/** Tags the list's rows leave to the skill's page: ones that hold for most skills, and categories, which the filters already show. */
const quiet = (tag: string) => tag === "by:community" || facetOf(tag) === "category";

// ------------------------------------------------------------------- state

/** The list's three pages, which differ only in how they sort: Top by downloads, Hot by downloads in the latest week, New by publishing date. */
export type View = "top" | "hot" | "new";
export const VIEWS: Record<View, { path: string; label: string; sort: Prop }> = {
  top: { path: "", label: "Top", sort: "downloads" },
  hot: { path: "hot/", label: "Hot", sort: "week" },
  new: { path: "new/", label: "New", sort: "published" },
};

/** The numbers every row shows, which the list sorts by and the sliders filter on. */
export type Prop = "published" | "stars" | "downloads" | "week";
type Value = number | string;
interface PropInfo {
  label: string;
  /** The entry's value, or null when unknown. Dates are YYYY-MM-DD. */
  of: (e: Entry) => Value | null;
  /** Where the value comes from, for its tooltip. */
  title: (e: Entry) => string;
  /** The slider's stops, lowest first. The last one is above every value, so the full range includes them all. */
  stops: Value[];
  date?: boolean;
}

/** 0, 10, 20, 50, 100… up past the largest value. */
function countStops(of: (s: Skill) => number | null): number[] {
  const max = Math.max(0, ...data.skills.map(of).filter((n) => n !== null));
  const stops = [0];
  for (let p = 10; stops[stops.length - 1] <= max; p *= 10) stops.push(p, 2 * p, 5 * p);
  return stops.slice(0, stops.findIndex((n) => n > max) + 1);
}
/** The first of each month, from the earliest date's month to the month after the latest's. */
function monthStops(of: (s: Skill) => string | null): string[] {
  const dates = data.skills
    .map(of)
    .filter((d) => d !== null)
    .sort();
  if (!dates.length) return ["", "~"];
  const stops: string[] = [];
  let [y, m] = dates[0].split("-").map(Number);
  for (;;) {
    stops.push(`${y}-${String(m).padStart(2, "0")}-01`);
    if (stops[stops.length - 1] > dates[dates.length - 1]) return stops;
    [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
  }
}

const sources = (e: Entry) =>
  DOWNLOADS.filter((r) => (isBundle(e) ? skillsOf(e) : [e]).some((x) => x[r]))
    .map((r) => REGISTRIES[r])
    .join(" and ");
// A bundle's numbers are its most popular skill's.
const most = (e: Entry) => (isBundle(e) ? "The most of any of its skills: " : "");
export const PROPS: Record<Prop, PropInfo> = {
  published: {
    label: "Published",
    of: firstSeenOf,
    title: (e) =>
      isBundle(e) ? "When skills.sh first saw one of its skills" : "When skills.sh first saw it",
    stops: monthStops(firstSeenOf),
    date: true,
  },
  stars: {
    label: "Stars",
    of: starsOf,
    title: (e) => `GitHub stars of ${repoKey(e)}, ${date(data.asOf.stars)}`,
    stops: countStops(starsOf),
  },
  downloads: {
    label: "Downloads",
    of: allTimeOf,
    title: (e) =>
      installsOf(e) !== null
        ? `${most(e)}All-time installs on skills.sh, ${date(data.asOf.installs)}`
        : `${most(e)}Downloads on ${sources(e)}, ${date(data.asOf.downloads)}`,
    stops: countStops(allTimeOf),
  },
  week: {
    label: "Downloads / week",
    of: weekOf,
    title: (e) => `${most(e)}Installs on skills.sh in the week to ${date(data.asOf.installs)}`,
    stops: countStops(weekOf),
  },
};
const PROP_IDS = Object.keys(PROPS) as Prop[];
const lastStop = (p: Prop) => PROPS[p].stops.length - 1;

/** A slider's range, as indexes into its stops: `lo` included, `hi` excluded. */
export type Range = [lo: number, hi: number];
export const fullRange = (p: Prop): Range => [0, lastStop(p)];
const fullRanges = () =>
  Object.fromEntries(PROP_IDS.map((p) => [p, fullRange(p)])) as Record<Prop, Range>;
export const isNarrowed = (p: Prop, [lo, hi]: Range) => lo > 0 || hi < lastStop(p);

const monthYear = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
/** A slider's range in words, such as "≥ 1K" or "Mar 2026 – May 2026". */
export function rangeLabel(p: Prop, [lo, hi]: Range): string {
  const { stops, date } = PROPS[p];
  if (date) {
    const month = (i: number) => monthYear.format(new Date(`${stops[i]}T00:00:00Z`));
    // `hi` is excluded, so the range ends with the month before it.
    const from = lo > 0 ? month(lo) : null;
    const to = hi < lastStop(p) ? month(hi - 1) : null;
    return from && to
      ? from === to
        ? from
        : `${from} – ${to}`
      : from
        ? `Since ${from}`
        : to
          ? `Until ${to}`
          : "Any";
  }
  const from = lo > 0 ? compact(stops[lo] as number) : null;
  const to = hi < lastStop(p) ? compact(stops[hi] as number) : null;
  return from && to ? `${from} – ${to}` : from ? `≥ ${from}` : to ? `< ${to}` : "Any";
}

export type Sort = Prop;
export interface State {
  view: View;
  q: string;
  tags: string[];
  registries: string[];
  repo: string | null;
  sort: Sort;
  ranges: Record<Prop, Range>;
  /** One entry per repo: the most popular one stands for the rest. */
  one: boolean;
  /** Hide republished copies. */
  hide: boolean;
  /** Show the skipped skills too, which the list leaves out unless asked for. */
  all: boolean;
}

export function parse(search: string, view: View = "top"): State {
  const p = new URLSearchParams(search);
  const sort = p.get("sort") as Sort | null;
  const ranges = fullRanges();
  for (const prop of PROP_IDS) {
    // Such as stars=1000..50000, or published=2026-03-01.. with no upper bound.
    const [lo, hi] = (p.get(prop) ?? "").split("..");
    const stops = PROPS[prop].stops.map(String);
    if (lo && stops.includes(lo)) ranges[prop][0] = stops.indexOf(lo);
    if (hi && stops.includes(hi) && stops.indexOf(hi) > ranges[prop][0])
      ranges[prop][1] = stops.indexOf(hi);
  }
  return {
    view,
    q: p.get("q") ?? "",
    tags: p.getAll("tag"),
    registries: p.getAll("registry"),
    repo: p.get("repo"),
    sort: sort && sort in PROPS ? sort : VIEWS[view].sort,
    ranges,
    one: p.get("one") === "1",
    hide: p.get("hide") === "1",
    all: p.get("all") === "1",
  };
}
/** The query string for a state, empty for the unfiltered list. */
export function query(s: State): string {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  for (const t of s.tags) p.append("tag", t);
  for (const r of s.registries) p.append("registry", r);
  if (s.repo) p.set("repo", s.repo);
  if (s.sort !== VIEWS[s.view].sort) p.set("sort", s.sort);
  for (const prop of PROP_IDS) {
    const [lo, hi] = s.ranges[prop];
    if (isNarrowed(prop, [lo, hi]))
      p.set(
        prop,
        `${lo > 0 ? PROPS[prop].stops[lo] : ""}..${hi < lastStop(prop) ? PROPS[prop].stops[hi] : ""}`,
      );
  }
  if (s.one) p.set("one", "1");
  if (s.hide) p.set("hide", "1");
  if (s.all) p.set("all", "1");
  const q = p.toString();
  return q ? `?${q}` : "";
}
export const fresh = (view: View): State => parse("", view);
/**
 * Select or unselect a tag. Selecting one unselects its parents and the tags it includes, since
 * either would only repeat or widen it: picking Design under Software engineering narrows the list
 * to design, and picking Software engineering again widens it back.
 */
export function toggleTag(tags: string[], tag: string): string[] {
  if (tags.includes(tag)) return tags.filter((t) => t !== tag);
  const related = [...parentsOf(tag), ...includedBy(tag)];
  return [...tags.filter((t) => !related.includes(t)), tag];
}

/** A link to the skills list filtered to the given state changes, on Top unless `patch` names another view. */
export const skillsLink = (patch: Partial<State>) => {
  const st = { ...fresh(patch.view ?? "top"), ...patch };
  return href(VIEWS[st.view].path) + query(st);
};

// ------------------------------------------------------------------- filtering

const searchText = new Map(
  data.skills.map((s) => [
    s.id,
    [
      s.name,
      s.description,
      ...(s.tldr?.glance.map((g) => g.text) ?? []),
      s.tldr?.text,
      repoKey(s),
      ...registriesOf(s).map((r) => REGISTRIES[r]),
      s.note,
      ...tagsOf(s),
      ...tagsOf(s).map(tagLabel),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  ]),
);
const bundleText = new Map(
  data.bundles.map((b) => [
    b.id,
    [b.name, b.description, ...(b.tldr?.glance.map((g) => g.text) ?? []), b.tldr?.text]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  ]),
);
const matches = (text: string, q: string) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));

/** Within a facet a skill needs any selected value; across facets it needs all of them. `skip` leaves one facet out, for its counts. */
function passes(s: Skill, st: State, skip: string | null = null): boolean {
  // Filtering on a skip tag, such as flag:tool-docs, asks for the skills it skips.
  if (
    skipped(data, s) &&
    !st.all &&
    !data.skip.some(({ tag }) => s.tags.includes(tag) && st.tags.includes(tag))
  )
    return false;
  if (st.hide && s.tags.includes("flag:republished")) return false;
  if (st.repo && repoKey(s) !== st.repo) return false;
  for (const p of PROP_IDS) {
    const [lo, hi] = st.ranges[p];
    if (!isNarrowed(p, [lo, hi])) continue;
    const v = PROPS[p].of(s);
    if (v === null || v < PROPS[p].stops[lo] || v >= PROPS[p].stops[hi]) return false;
  }
  if (
    skip !== "registry" &&
    st.registries.length &&
    !registriesOf(s).some((r) => st.registries.includes(r))
  )
    return false;
  const selected = new Map<string, string[]>();
  for (const t of st.tags) selected.set(facetOf(t), [...(selected.get(facetOf(t)) ?? []), t]);
  for (const [facet, tags] of selected)
    if (facet !== skip && !tags.some((t) => tagsOf(s).includes(t))) return false;
  return !st.q || matches(searchText.get(s.id) ?? "", st.q);
}

/** A bundle shows when one of its skills does, or when the search matches the bundle itself and one of its skills matches the other filters. */
function bundlePasses(b: Bundle, st: State): boolean {
  const skills = skillsOf(b);
  return (
    skills.some((s) => passes(s, st)) ||
    (Boolean(st.q) &&
      matches(bundleText.get(b.id) ?? "", st.q) &&
      skills.some((s) => passes(s, { ...st, q: "" })))
  );
}

const isFiltered = (st: State) =>
  Boolean(st.q || st.tags.length || st.registries.length || st.repo || st.hide) ||
  PROP_IDS.some((p) => isNarrowed(p, st.ranges[p]));

/** On a tie, such as a bundle and its most installed skill, the bundle goes first. */
const bundleFirst = (a: Entry, b: Entry) => Number(isBundle(b)) - Number(isBundle(a));
/** Compare for a descending sort, unknown values last. */
const descending = (a: Value | null, b: Value | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? 1 : -1;
const order = (sort: Sort) => (a: Entry, b: Entry) =>
  descending(PROPS[sort].of(a), PROPS[sort].of(b)) ||
  descending(allTimeOf(a), allTimeOf(b)) ||
  bundleFirst(a, b) ||
  a.name.localeCompare(b.name);

/** The filtered, sorted list, plus how many entries each repo hides in one-per-repo mode. Skills that only work inside their bundle are listed in it. */
function results(st: State): {
  list: Entry[];
  hidden: Map<string, number>;
  total: number;
  bundles: number;
} {
  const matching = [
    ...data.bundles.filter((b) => bundlePasses(b, st)),
    ...data.skills.filter((s) => ownEntry(s) && passes(s, st)),
  ].sort(order(st.sort));
  const hidden = new Map<string, number>();
  const counted = { total: matching.length, bundles: matching.filter(isBundle).length };
  if (!st.one) return { list: matching, hidden, ...counted };
  const list = matching.filter((s) => {
    const key = repoKey(s);
    if (hidden.has(key)) {
      hidden.set(key, (hidden.get(key) ?? 0) + 1);
      return false;
    }
    hidden.set(key, 0);
    return true;
  });
  return { list, hidden, ...counted };
}

function counts(st: State, facet: string, valuesOf: (s: Skill) => string[]): Map<string, number> {
  const n = new Map<string, number>();
  for (const s of data.skills)
    if (passes(s, st, facet)) for (const v of valuesOf(s)) n.set(v, (n.get(v) ?? 0) + 1);
  return n;
}

// ------------------------------------------------------------------- pieces

function filterChip(
  attr: string,
  value: string,
  label: string,
  n: number,
  pressed: boolean,
  title?: string,
): string {
  return `<button type="button" class="chip" ${attr}="${esc(value)}" aria-pressed="${pressed}"${
    title ? ` title="${esc(title)}"` : ""
  }><span>${esc(label)}</span><span class="n">${n}</span></button>`;
}

/** The row's numbers, top right, with the one the list is sorted by highlighted. */
function propsHtml(e: Entry, st: State): string {
  const rows = PROP_IDS.map((p) => {
    const v = PROPS[p].of(e);
    const shown = v === null ? "—" : PROPS[p].date ? date(v as string) : compact(v as number);
    return `<div${p === st.sort ? ` class="on"` : ""}${v === null ? "" : ` title="${esc(PROPS[p].title(e))}"`}><dt>${PROPS[p].label}</dt><dd>${shown}</dd></div>`;
  });
  return `<dl class="props">${rows.join("")}</dl>`;
}

const moreLink = (e: Entry, more: number, st: State) =>
  more
    ? `<a class="more" href="${skillsLink({ view: st.view, repo: repoKey(e), sort: st.sort })}">+${more} more from ${esc(repoKey(e))}</a>`
    : "";

function skillRow(s: Skill, more: number, st: State): string {
  const tags = s.tags
    .filter((t) => !quiet(t))
    .sort((a, b) => FACET_ORDER.indexOf(facetOf(a)) - FACET_ORDER.indexOf(facetOf(b)));
  const caution = s.tags.some((t) => CAUTION.includes(t));
  const bundle = bundleOf.get(s.id)?.bundle;
  return `
    <li class="skill${caution ? " caution" : ""}">
      <div class="skill-body">
      <div class="skill-head">
        <h3><a class="skill-name" href="${skillHref(s.id)}">${esc(s.name)}</a></h3>
        <span class="skill-source">${esc(repoKey(s))}${
          bundle ? ` · part of <a href="${bundleHref(bundle.id)}">${esc(bundle.name)}</a>` : ""
        }</span>
      </div>
      ${s.tldr?.glance.length ? glanceHtml(s.tldr.glance, 2) : `<p class="skill-desc">${esc(s.description)}</p>`}
      <div class="tags">${tags.map((t) => tagChip(t, null, st.tags.includes(t))).join("")}</div>
      ${moreLink(s, more, st)}
      </div>
      ${propsHtml(s, st)}
    </li>`;
}

function bundleRow(b: Bundle, more: number, st: State): string {
  // When filtering, the skills that don't match are dimmed.
  const hits = isFiltered(st) ? skillsOf(b).filter((s) => passes(s, st)) : [];
  const members = b.skills.map(({ id }) => {
    const dim = hits.length && !hits.some((s) => s.id === id);
    return `<a href="${skillHref(id)}"${dim ? ` class="dim"` : ""}>${esc(skillById.get(id)?.name ?? id)}</a>`;
  });
  return `
    <li class="skill bundle">
      <div class="skill-body">
      <div class="skill-head">
        <h3><a class="skill-name" href="${bundleHref(b.id)}">${esc(b.name)}</a></h3>
        <span class="kind">Bundle · ${plural(b.skills.length, "skill")}</span>
        <span class="skill-source">${esc(repoKey(b))}</span>
      </div>
      ${b.tldr?.glance.length ? glanceHtml(b.tldr.glance, 2) : `<p class="skill-desc">${esc(b.description)}</p>`}
      <p class="members">${members.join('<span aria-hidden="true"> · </span>')}</p>
      ${moreLink(b, more, st)}
      </div>
      ${propsHtml(b, st)}
    </li>`;
}

function section(title: string, question: string | null, chips: string): string {
  return `<section class="facet"><h2${question ? ` title="${esc(question)}"` : ""}>${esc(title)}</h2><div class="chips">${chips || `<span class="muted">None</span>`}</div></section>`;
}

function tagSection(st: State, facetId: string): string {
  const facet = facetById.get(facetId);
  if (!facet) return "";
  const n = counts(st, facetId, (s) => tagsOf(s).filter((t) => facetOf(t) === facetId));
  const shown = (t: string) => Boolean(n.get(t) || st.tags.includes(t));
  const chip = (t: string) =>
    filterChip(
      "data-tag",
      t,
      tagLabel(t) ?? t.slice(facetId.length + 1),
      n.get(t) ?? 0,
      st.tags.includes(t),
      tagInfo.get(t),
    );
  // A parent's values sit indented under it; a value with two parents shows under both.
  const top = facet.values.map((v) => tagOf(facet, v.id)).filter((t) => !parentsOf(t).length);
  return section(
    facet.name,
    facet.question,
    top
      .map((t) => {
        const children = includedBy(t).filter(shown);
        return `${shown(t) ? chip(t) : ""}${children.length ? `<div class="chips sub">${children.map(chip).join("")}</div>` : ""}`;
      })
      .join(""),
  );
}

export function facetsHtml(st: State, stackExpanded: boolean): string {
  const sections: string[] = [];
  for (const f of ["category", "type", "effect", "needs", "by", "flag"])
    sections.push(tagSection(st, f));
  const regCounts = counts(st, "registry", registriesOf);
  sections.push(
    section(
      "Registry",
      "Where the skill is published.",
      (Object.keys(REGISTRIES) as Registry[])
        .filter((r) => regCounts.get(r) || st.registries.includes(r))
        .map((r) =>
          filterChip(
            "data-registry",
            r,
            REGISTRIES[r],
            regCounts.get(r) ?? 0,
            st.registries.includes(r),
          ),
        )
        .join(""),
    ),
  );
  sections.push(tagSection(st, "lang"));
  // Topics, by group.
  const topic = facetById.get("topic");
  const topicCounts = counts(st, "topic", (s) => s.tags.filter((t) => facetOf(t) === "topic"));
  const groups = (topic?.groups ?? [])
    .map((g) => {
      const chips = g.values
        .filter((v) => topicCounts.get(v) || st.tags.includes(v))
        .map((v) => filterChip("data-tag", v, v, topicCounts.get(v) ?? 0, st.tags.includes(v)))
        .join("");
      return chips ? `<h3 class="group">${esc(g.name)}</h3><div class="chips">${chips}</div>` : "";
    })
    .join("");
  sections.push(
    `<section class="facet"><h2 title="${esc(topic?.question ?? "")}">Topics</h2>${groups || `<p class="muted">None</p>`}</section>`,
  );
  // Stack, most used first.
  const stackCounts = counts(st, "stack", (s) => s.tags.filter((t) => t.startsWith("stack:")));
  const stack = [
    ...stackCounts.keys(),
    ...st.tags.filter((t) => t.startsWith("stack:") && !stackCounts.has(t)),
  ].sort((a, b) => (stackCounts.get(b) ?? 0) - (stackCounts.get(a) ?? 0) || a.localeCompare(b));
  const shown = stackExpanded ? stack : stack.slice(0, 16);
  sections.push(
    section(
      "Stack",
      facetById.get("stack")?.question ?? null,
      shown
        .map((t) =>
          filterChip("data-tag", t, t.slice(6), stackCounts.get(t) ?? 0, st.tags.includes(t)),
        )
        .join("") +
        (stack.length > 16
          ? `<button type="button" class="link-button" data-action="stack">${stackExpanded ? "Show fewer" : `Show all ${stack.length}`}</button>`
          : ""),
    ),
  );
  return sections.join("");
}

function activeFilters(st: State): string {
  const chips: string[] = [];
  const remove = (kind: string, value: string, label: string) =>
    `<button type="button" class="active-chip" data-remove="${kind}" data-value="${esc(value)}" aria-label="Remove filter ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`;
  if (st.q) chips.push(remove("q", st.q, `“${st.q}”`));
  for (const t of st.tags) chips.push(remove("tag", t, t));
  for (const r of st.registries) chips.push(remove("registry", r, REGISTRIES[r as Registry] ?? r));
  if (st.repo) chips.push(remove("repo", st.repo, `from ${st.repo}`));
  for (const p of PROP_IDS)
    if (isNarrowed(p, st.ranges[p]))
      chips.push(remove("range", p, `${PROPS[p].label}: ${rangeLabel(p, st.ranges[p])}`));
  return chips.length
    ? `<div class="active">${chips.join("")}<button type="button" class="link-button" data-action="clear">Clear all</button></div>`
    : "";
}

export function resultsHtml(st: State): string {
  const { list, hidden, total, bundles } = results(st);
  // Out of every entry once skipped skills show, else out of the listed ones.
  const all = results({
    ...fresh(st.view),
    all: st.all || list.some((e) => !isBundle(e) && skipped(data, e)),
  }).total;
  const repoNote = st.repo ? repoById.get(st.repo) : undefined;
  return `
    <div class="toolbar">
      <p id="count" role="status"><strong>${[
        total - bundles || !bundles ? plural(total - bundles, "skill") : "",
        bundles ? plural(bundles, "bundle") : "",
      ]
        .filter(Boolean)
        .join(", ")}</strong>${
        st.one && list.length !== total ? `, ${plural(list.length, "repo")}` : ""
      }${isFiltered(st) ? ` <span class="muted">of ${all}</span>` : ""}</p>
      <button type="button" class="filters-toggle" data-action="filters" aria-controls="filters">Filters</button>
      <label class="sort">Sort by <select id="sort">${PROP_IDS.map(
        (p) => `<option value="${p}"${p === st.sort ? " selected" : ""}>${PROPS[p].label}</option>`,
      ).join("")}</select></label>
      <label class="check"><input type="checkbox" id="one"${st.one ? " checked" : ""} /> One per repo</label>
      <label class="check"><input type="checkbox" id="hide"${st.hide ? " checked" : ""} /> Hide copies</label>
      <label class="check" title="Also show the skills tagged ${esc(data.skip.map((s) => s.tag).join(", "))}, and those gone from their source"><input type="checkbox" id="all"${st.all ? " checked" : ""} /> Show all</label>
    </div>
    ${activeFilters(st)}
    ${repoNote ? `<p class="repo-banner"><a href="${esc(repoNote.url)}">${esc(repoNote.id)}</a>${repoNote.description ? ` · ${esc(repoNote.description)}` : ""}</p>` : ""}
    ${
      list.length
        ? `<ol class="skill-list">${list
            .map((e) => {
              const more = hidden.get(repoKey(e)) ?? 0;
              return isBundle(e) ? bundleRow(e, more, st) : skillRow(e, more, st);
            })
            .join("")}</ol>`
        : `<p class="empty">No skill matches these filters.</p>`
    }`;
}

/** A two-handled slider per property. The client updates them in place while they're dragged. */
export function rangesHtml(st: State): string {
  return PROP_IDS.map((p) => {
    const [lo, hi] = st.ranges[p];
    const last = lastStop(p);
    const handle = (end: 0 | 1, value: number) =>
      `<input type="range" min="0" max="${last}" step="1" value="${value}" data-range="${p}" data-end="${end}" aria-label="${PROPS[p].label}, ${end ? "to" : "from"}" aria-valuetext="${rangeLabel(p, [lo, hi])}" />`;
    return `<section class="facet range"><h2>${PROPS[p].label} <output data-range-label="${p}">${rangeLabel(p, [lo, hi])}</output></h2><div class="slider" data-slider="${p}" style="--lo: ${lo / last}; --hi: ${hi / last}">${handle(0, lo)}${handle(1, hi)}</div></section>`;
  }).join("");
}

export function listView(st: State): string {
  return `
    <div class="skills-view" data-view="${st.view}">
      <aside id="filters" aria-label="Filters">
        <div class="search">
          <label for="q" class="sr-only">Search skills</label>
          <input id="q" type="search" value="${esc(st.q)}" placeholder="Search names, descriptions, tags" autocomplete="off" spellcheck="false" />
        </div>
        <div id="ranges">${rangesHtml(st)}</div>
        <div id="facets">${facetsHtml(st, false)}</div>
      </aside>
      <section id="results" aria-label="Skills">${resultsHtml(st)}</section>
    </div>`;
}
