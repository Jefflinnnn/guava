// Written by hand. Applied to every workspace database; don't edit after it
// ships.
//
// Earlier syncs skipped card payments, transfers and income. Like
// 0006_resync_refunds, clearing the cursor makes the next sync start over so
// they're imported (as not spending). User edits on existing imports are kept.
const sql = `
UPDATE "PlaidItem" SET "cursor" = NULL;
`;

export default sql;
