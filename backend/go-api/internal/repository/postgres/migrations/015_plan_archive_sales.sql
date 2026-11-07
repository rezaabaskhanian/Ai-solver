-- +migrate Up
-- «اشتراک‌ها» tab: archive a plan instead of deleting it, and a sales report.
--   subscription_plans.archived  hidden from the app's plan picker, but a
--                                purchase of it is still verified (an old
--                                app version or a pending payment can
--                                still send its product_id)
--   purchases.price_toman        the plan's price when it was bought, so
--                                revenue doesn't change when a price is
--                                edited later (0 = lifetime unlock or
--                                bought before this migration)
ALTER TABLE subscription_plans ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE purchases ADD COLUMN price_toman INT NOT NULL DEFAULT 0;

-- Best guess for purchases made before this migration: today's price.
UPDATE purchases pu
   SET price_toman = p.price_toman
  FROM subscription_plans p
 WHERE p.product_id = pu.product_id AND pu.price_toman = 0;

-- +migrate Down
ALTER TABLE purchases DROP COLUMN IF EXISTS price_toman;
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS archived;
