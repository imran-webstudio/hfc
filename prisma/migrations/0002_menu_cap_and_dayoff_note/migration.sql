-- Per-dish daily cap (null = unlimited) and a note on each office day-off row.
ALTER TABLE "MenuOption" ADD COLUMN "maxQuantity" INTEGER;

ALTER TABLE "DayOff" ADD COLUMN "note" TEXT;
