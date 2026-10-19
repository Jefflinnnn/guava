// Expenses without a category. Not a stored category: it has no budget and
// can't be renamed or deleted, and its expenses always need review.

/** How uncategorized expenses are labeled wherever a category would show. */
export const UNCATEGORIZED = { name: "Uncategorized", color: "var(--faint)" };

/** Stands in for "no category" in the category filter (`Filters.cats`). */
export const UNCATEGORIZED_KEY = "uncategorized";
