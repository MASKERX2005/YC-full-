# Shiptivity — Kanban Feature Release Analysis

**Feature:** Kanban board (drag-and-drop swimlanes)
**Release date:** 2018-06-02

## 1. Daily active users, before vs. after

Query: see `answer.sql`, Part 1.

| Period | Days measured | Avg. daily active users |
|---|---|---|
| Before 2018-06-02 | 110 | **3.6** |
| After 2018-06-02 | 245 | **11.8** |

Graph: `dau_before_after.png`

Average daily active users went from **~3.6 to ~11.8** after the Kanban board shipped — roughly a **3.2x** increase. The jump happens exactly at the release date and holds for the following eight months, so this isn't a one-off spike; it's a sustained lift in how many people use the product every day.

## 2. Number of status changes by card

Query: see `answer.sql`, Part 2.

Graph: `status_changes_by_card_distribution.png` (and `status_changes_by_card_top20.png` for the individual top movers).

- 200 cards total, 486 status-change events.
- Average of **2.43 status changes per card**.
- Distribution: 38 cards had 1 change, 53 had 2, 100 had 3, and only 9 cards had 4–6.

A card created after the release typically goes `(none) → backlog → in-progress → complete`, which is exactly 3 changes — and that's the single largest bucket (100 of 200 cards). Cards with 4+ changes are the minority and represent cards that got moved backward or bounced between lanes more than once (e.g., pulled out of "complete" back into "in-progress").

## 3. Three actionable feature ideas

### Idea 1 — Filter and search the board
**Hypothesis:** As the number of cards on the board grows (already 200+ here), finding a specific card by scrolling a swimlane becomes slower, which could start eroding the daily-engagement gains the Kanban feature just produced.
**Expected impact:** Faster task-location reduces time-to-update per card, which should protect or further increase daily active usage and the number of updates made per session.
**What the feature is:** A search/filter bar above the board that filters cards by name across all three swimlanes in real time, with a "my cards" quick filter.

### Idea 2 — One-click "move back" / undo for status changes
**Hypothesis:** The 9 cards with 4–6 status changes show that some cards get moved out of a lane and then back (likely corrections or re-opened work). Doing that today requires a full drag-and-drop re-sort, which is slower and more error-prone than a single click.
**Expected impact:** Reducing the friction of correcting a wrong move should reduce the number of "extra" status-change events on those outlier cards and reduce mis-clicks reported by users, while keeping the audit trail in `card_change_history` intact.
**What the feature is:** A small "undo last move" action (toast or button) that appears for a few seconds right after a drag-and-drop, reverting the card to its previous status/priority with one click instead of a second drag.

### Idea 3 — Stale-card indicator / reminder
**Hypothesis:** Most cards (191/200) move through the board in a straightforward 1–3 step path, but we don't yet track how long a card sits in a lane before its next change — some cards likely stall in "in-progress" for a long time, which the current data can't surface to the user.
**Expected impact:** Surfacing stale cards should shorten average time-in-lane and increase the completion rate, which should show up as a further increase in daily active usage (more frequent return visits to clear flagged cards).
**What the feature is:** A visual badge on any card that hasn't had a status change in N days (e.g., 7), using the existing `card_change_history.timestamp` to compute staleness, with an optional daily digest notification of stale cards per user.
