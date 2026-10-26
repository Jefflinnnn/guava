// Written by hand. Applied to every workspace database; don't edit after it
// ships.
//
// Earlier syncs skipped refunds, and /transactions/sync only returns changes
// after the saved cursor, so those refunds would never arrive. Clearing the
// cursor makes the next sync start over from the beginning of the bank's
// history. Expenses already imported are matched by plaidTransactionId and
// only get their date, amount and account refreshed (user edits are kept);
// imported expenses the user deleted come back.
const sql = `
UPDATE "PlaidItem" SET "cursor" = NULL;
`;

export default sql;
