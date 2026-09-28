import { person, visible, type Degree, type Job } from './data/resume';
import { t, ui } from './i18n';
import { icon } from './icons';

/** HTML fragments shared by the classic resume and the game's resume panel. */

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const draftBadge = (): string => `<span class="draft-badge">${t(ui.draft)}</span>`;

export const years = (start: number, end?: number): string => `${start} – ${end ?? t(ui.present)}`;

/** Renders a job; `roleIndexes` restricts it to some of its roles (e.g. one Meta team). */
export function jobHtml(job: Job, roleIndexes?: number[]): string {
  const roles = job.roles
    .filter((_, i) => !roleIndexes || roleIndexes.includes(i))
    .map((role) => {
      const bullets = visible(role.bullets)
        .map((b) => `<li${b.draft ? ' class="is-draft"' : ''}>${esc(t(b.text))}${b.draft ? draftBadge() : ''}</li>`)
        .join('');
      const team = role.team ? `<span class="role-team">${esc(t(role.team))}</span>` : '';
      const when = role.start ? `<span class="role-when">${years(role.start, role.end)}</span>` : '';
      return `
        <div class="role">
          <h4 class="role-title">${esc(t(role.title))}${team}${when}</h4>
          <ul class="bullets">${bullets}</ul>
        </div>`;
    })
    .join('');
  const tags = job.tags.map((tag) => `<li>${esc(tag)}</li>`).join('');
  return `
    <li class="job">
      <div class="job-when">${years(job.start, job.end)}</div>
      <div class="job-body">
        <h3 class="job-company">${esc(job.company)}</h3>
        ${roles}
        <ul class="tags" aria-label="${t(ui.skills)}">${tags}</ul>
      </div>
    </li>`;
}

export const degreeHtml = (d: Degree): string => `
  <li>
    <div class="mini-when">${d.start} – ${d.end}</div>
    <div>
      <h3 class="mini-title">${esc(t(d.school))}</h3>
      <p class="mini-sub">${esc(t(d.degree))}</p>
      <p class="mini-detail">${esc(t(d.detail))}</p>
    </div>
  </li>`;

export function linksHtml(): string {
  const { linkedin, github, scholar } = person.links;
  const items: [string, string, 'linkedin' | 'github' | 'scholar'][] = [
    ['LinkedIn', linkedin, 'linkedin'],
    ['GitHub', github, 'github'],
    ['Google Scholar', scholar, 'scholar'],
  ];
  return items
    .filter(([, url]) => url)
    .map(
      ([label, url, ic]) =>
        `<a class="link-chip" href="${esc(url)}" data-print="${esc(url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}" target="_blank" rel="noopener">${icon(ic, 16)}<span>${label}</span></a>`,
    )
    .join('');
}
