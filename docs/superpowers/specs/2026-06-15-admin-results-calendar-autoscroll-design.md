# Admin Results and Calendar Autoscroll Design

## Goal

Make match entry and match review open at the useful point in time by default:

- `/admin` opens the admin results page.
- `/admin/resultados` shows all matches in calendar order, not separated as the primary workflow by stage tabs.
- `/admin/resultados`, `/resultados`, and `/calendario` automatically scroll to the current useful day when they load.
- `/resultados` keeps the next 5 matches visible with the current user's predictions.

## Current Context

The admin results page currently fetches all matches ordered by `match_number`, then renders them inside stage tabs. This makes result entry awkward during the tournament because the admin has to know which stage contains the next match.

The public calendar already groups matches by Spain day through `groupByMatchDay()` and has a manual "Hoy" button. The public results page already loads the current user's match predictions and renders an upcoming strip that includes predictions.

## Approach

Use one shared time-selection model for the three screens:

1. Prefer the Spain calendar day for today when that day exists in the rendered match list.
2. If today has no rendered matches, use the most recent finished match day.
3. If there is no finished match yet, use the next scheduled match day.
4. If no dated matches exist, do not scroll.

Admin results becomes a single chronological agenda of editable match rows. The row UI keeps the existing score inputs, penalty winner selector, save/update action, final badge, delete action, notifications, and score recalculation behavior. Stage labels remain visible on each row so the admin can still see whether a match is group stage or knockout.

`/resultados` keeps the existing "Tu jornada", tabs, group standings, and upcoming strip. The "Partidos" section gains a chronological anchor around the latest played match, and the upcoming strip continues to show the next 5 unplayed matches with the user's prediction when it exists.

`/calendario` keeps its current filters and manual "Hoy" button, but also runs the same automatic scroll after matches load or filters change.

## Data Flow

- Fetch matches with `match_date` included anywhere automatic scrolling or chronological ordering is needed.
- Build display rows from the same client-side data already used by each page.
- Add pure helpers under `src/lib` for selecting the target day and for ordering matches chronologically. These helpers are covered with tests before UI changes.
- Render day containers with stable `data-day` attributes and scroll to the selected day after loading.

## Edge Cases

- Filters can hide today's matches. In that case, scroll to the fallback day inside the filtered list.
- If the World Cup has not started, scroll to the first upcoming day.
- If the tournament is between match days, scroll to the last finished day rather than the beginning of the page.
- If all matches are finished, scroll to the final played day.
- Matches without `match_date` remain visible only where the page already supports them, but they are not scroll targets.

## Testing

Add unit tests for:

- Choosing today when it exists.
- Falling back to latest finished day when today has no matches.
- Falling forward to next scheduled day before the first match.
- Choosing the final played day after the tournament.
- Sorting dated matches by kickoff time, then match number.

Run the relevant unit tests and `npm run lint` after implementation.
