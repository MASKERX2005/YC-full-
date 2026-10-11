-- TYPE YOUR SQL QUERY BELOW

-- PART 1: Create a SQL query that maps out the daily average users before and after the feature change
-- The Kanban board feature was released on 2018-06-02.

-- 1a. Daily active users per day (the time series used to draw the line graph).
--     "Active" = at least one login that day.
SELECT
  date(login_timestamp, 'unixepoch') AS login_date,
  COUNT(DISTINCT user_id)            AS active_users,
  CASE
    WHEN date(login_timestamp, 'unixepoch') < '2018-06-02' THEN 'before'
    ELSE 'after'
  END AS period
FROM login_history
GROUP BY login_date
ORDER BY login_date;

-- 1b. Average daily active users, before vs. after the release
--     (the two summary numbers the graph's "before/after" reference lines are based on).
WITH daily_active_users AS (
  SELECT
    date(login_timestamp, 'unixepoch') AS login_date,
    COUNT(DISTINCT user_id)            AS active_users
  FROM login_history
  GROUP BY login_date
)
SELECT
  CASE WHEN login_date < '2018-06-02' THEN 'before' ELSE 'after' END AS period,
  COUNT(*)                   AS days_in_period,
  AVG(active_users)          AS avg_daily_active_users
FROM daily_active_users
GROUP BY period;


-- PART 2: Create a SQL query that indicates the number of status changes by card

SELECT
  cardID,
  COUNT(*) AS status_change_count
FROM card_change_history
GROUP BY cardID
ORDER BY status_change_count DESC;
