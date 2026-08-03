// Single source of truth for the two-tone wordmark (mark + "by" signature)
// used in the header logo, admin login, admin sidebar, and printed packing
// slips. To rebrand the wordmark itself, edit these two constants — nothing
// else needs to change. (Body copy elsewhere — footer, contact info, page
// titles — pulls from the editable Settings.brand.name instead; see README.)
export const WORDMARK_PART1 = "HSN";
export const WORDMARK_PART2 = "BY AYAT";

export default function BrandWordmark() {
  return (
    <>
      {WORDMARK_PART1} <span>{WORDMARK_PART2}</span>
    </>
  );
}
