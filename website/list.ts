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
  desc,
  downloadsOf,
  facetById,
  facetOf,
  firstSeenOf,
  gainOf,
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
  weeklyOf,
} from "./skills.ts";
import { skipped, type Bundle, type Registry, type Skill } from "./types.ts";

/** A row of the skills list: a skill, or a bundle with its skills inside. */
type Entry = Skill | Bundle;

/** Tags the list's rows leave to the skill's page: ones that hold for most skills, and categories, which the filters already show. */
const quiet = (tag: string) => tag === "by:community" || facetOf(tag) === "category";

// ------------------------------------------------------------------- state

/** The list's three pages: Top ranks by popularity, Hot by recent growth, New by when skills.sh first saw a skill. */
export type View = "top" | "hot" | "new";
export const VIEWS: Record<View, { path: string; label: string }> = {
  top: { path: "", label: "Top" },
  hot: { path: "hot/", label: "Hot" },
  new: { path: "new/", label: "New" },
};
export type Sort = "installs" | "downloads" | "stars" | "name" | "hot" | "newest";
export interface State {
  view: View;
  q: string;
  tags: string[];
  registries: string[];
  repo: string | null;
  /** Only Top lets you pick a sort; Hot and New have their own. */
  sort: Sort;
  /** One entry per repo: the most popular one stands for the rest. */
  one: boolean;
  /** Hide republished copies. */
  hide: boolean;
  /** Show the skipped skills too, which the list leaves out unless asked for. */
  all: boolean;
}
/** The sorts Top offers. */
export const SORTS: Partial<Record<Sort, string>> = {
  installs: "Installs",
  downloads: "Downloads",
  stars: "Repo stars",
  name: "Name",
};

export function parse(search: string, view: View = "top"): State {
  const p = new URLSearchParams(search);
  const sort = p.get("sort") as Sort | null;
  return {
    view,
    q: p.get("q") ?? "",
    tags: p.getAll("tag"),
    registries: p.getAll("registry"),
    repo: p.get("repo"),
    sort:
      view === "hot"
        ? "hot"
        : view === "new"
          ? "newest"
          : sort && sort in SORTS
            ? sort
            : "installs",
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
  if (s.view === "top" && s.sort !== "installs") p.set("sort", s.sort);
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
  Boolean(st.q || st.tags.length || st.registries.length || st.repo || st.hide);

/** On a tie, such as a bundle and its most installed skill, the bundle goes first. */
const bundleFirst = (a: Entry, b: Entry) => Number(isBundle(b)) - Number(isBundle(a));
const ORDER: Record<Sort, (a: Entry, b: Entry) => number> = {
  installs: (a, b) =>
    desc(installsOf(a), installsOf(b)) ||
    desc(downloadsOf(a), downloadsOf(b)) ||
    bundleFirst(a, b) ||
    a.name.localeCompare(b.name),
  downloads: (a, b) => desc(downloadsOf(a), downloadsOf(b)) || ORDER.installs(a, b),
  stars: (a, b) => desc(starsOf(a), starsOf(b)) || ORDER.installs(a, b),
  hot: (a, b) => desc(gainOf(a), gainOf(b)) || ORDER.installs(a, b),
  name: (a, b) => a.name.localeCompare(b.name) || ORDER.installs(a, b),
  newest: (a, b) =>
    (firstSeenOf(b) ?? "").localeCompare(firstSeenOf(a) ?? "") || ORDER.installs(a, b),
};

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
  ].sort(ORDER[st.sort]);
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

function metric(s: Entry, st: State): string {
  // A bundle's numbers are its most popular skill's.
  const of = isBundle(s) ? "The most of any of its skills: " : "";
  if (st.sort === "hot") {
    const weekly = weeklyOf(s);
    const gain = gainOf(s);
    if (!weekly || gain === null)
      return `<span class="metric muted" title="No weekly installs on skills.sh">no trend</span>`;
    const [first, last] = [weekly[0], weekly[weekly.length - 1]];
    return `<span class="metric" title="${of}Installs in the latest week on skills.sh (${compact(last)}, week to ${date(data.asOf.installs)}) minus those 8 weeks earlier (${compact(first)})"><strong>${gain > 0 ? "+" : gain < 0 ? "−" : ""}${compact(Math.abs(gain))}</strong> /week</span>`;
  }
  if (st.sort === "stars") {
    const stars = starsOf(s);
    return stars === null
      ? `<span class="metric muted" title="No GitHub repo star count">no stars</span>`
      : `<span class="metric" title="GitHub stars of ${esc(repoKey(s))} on ${date(data.asOf.stars)}"><strong>${compact(stars)}</strong> stars</span>`;
  }
  const firstSeen = firstSeenOf(s);
  if (st.sort === "newest" && firstSeen)
    return `<span class="metric" title="First seen on skills.sh"><strong>${date(firstSeen)}</strong></span>`;
  const installs = installsOf(s);
  const installed = (n: number) =>
    `<span class="metric" title="${of}All-time installs on skills.sh, ${date(data.asOf.installs)}"><strong>${compact(n)}</strong> installs</span>`;
  if (installs !== null && st.sort !== "downloads") return installed(installs);
  const downloads = downloadsOf(s);
  if (downloads !== null)
    return `<span class="metric" title="${of}Downloads on ${esc(
      DOWNLOADS.filter((r) => (isBundle(s) ? skillsOf(s) : [s]).some((x) => x[r]))
        .map((r) => REGISTRIES[r])
        .join(" and "),
    )}, ${date(data.asOf.downloads)}"><strong>${compact(downloads)}</strong> downloads</span>`;
  if (installs !== null) return installed(installs);
  return `<span class="metric muted" title="Not in the skills.sh all-time top 600 on ${date(data.asOf.installs)}">new</span>`;
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
      <div class="skill-head">
        <h3><a class="skill-name" href="${skillHref(s.id)}">${esc(s.name)}</a></h3>
        <span class="skill-source">${esc(repoKey(s))}${
          bundle ? ` · part of <a href="${bundleHref(bundle.id)}">${esc(bundle.name)}</a>` : ""
        }</span>
        ${metric(s, st)}
      </div>
      ${s.tldr?.glance.length ? glanceHtml(s.tldr.glance, 2) : `<p class="skill-desc">${esc(s.description)}</p>`}
      <div class="tags">${tags.map((t) => tagChip(t, null, st.tags.includes(t))).join("")}</div>
      ${moreLink(s, more, st)}
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
      <div class="skill-head">
        <h3><a class="skill-name" href="${bundleHref(b.id)}">${esc(b.name)}</a></h3>
        <span class="kind">Bundle · ${plural(b.skills.length, "skill")}</span>
        <span class="skill-source">${esc(repoKey(b))}</span>
        ${metric(b, st)}
      </div>
      ${b.tldr?.glance.length ? glanceHtml(b.tldr.glance, 2) : `<p class="skill-desc">${esc(b.description)}</p>`}
      <p class="members">${members.join('<span aria-hidden="true"> · </span>')}</p>
      ${moreLink(b, more, st)}
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
      ${
        st.view === "top"
          ? `<label class="sort">Sort by <select id="sort">${(Object.keys(SORTS) as Sort[])
              .map(
                (s) =>
                  `<option value="${s}"${s === st.sort ? " selected" : ""}>${SORTS[s]}</option>`,
              )
              .join("")}</select></label>`
          : `<p class="sort muted">${
              st.view === "hot"
                ? "Most weekly installs gained over 8 weeks"
                : "Newest on skills.sh first"
            }</p>`
      }
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

export function listView(st: State): string {
  return `
    <div class="skills-view" data-view="${st.view}">
      <aside id="filters" aria-label="Filters">
        <div class="search">
          <label for="q" class="sr-only">Search skills</label>
          <input id="q" type="search" value="${esc(st.q)}" placeholder="Search names, descriptions, tags" autocomplete="off" spellcheck="false" />
        </div>
        <div id="facets">${facetsHtml(st, false)}</div>
      </aside>
      <section id="results" aria-label="Skills">${resultsHtml(st)}</section>
    </div>`;
}
